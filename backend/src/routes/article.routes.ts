// ==============================================================================
// ARTICLE ROUTES
// ==============================================================================
// Definicje tras dla artykułów, komentarzy, historii, kalendarza oraz uploadu.
// Konfiguruje moduł 'multer' do bezpiecznego zapisywania załączników na dysku.

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import * as articleController from '../controllers/article.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { createArticleSchema, updateArticleSchema, updateStatusSchema, addCommentSchema } from '../validators/article.validator';
import { Role } from '../types';

const router = Router();

// ------------------------------------------------------------------------------
// KONFIGURACJA WGrywania PLIKÓW (MULTER)
// ------------------------------------------------------------------------------

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Pliki będą zapisywane w folderze backend/uploads
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Jeśli katalog nie istnieje, tworzymy go rekurencyjnie
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Bezpieczna nazwa pliku: unikalny znacznik czasu + losowa liczba + oryginalne rozszerzenie
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limit rozmiaru pliku: 5MB
  },
  fileFilter: (_req, file, cb) => {
    // Pozwalamy wyłącznie na wgrywanie określonych typów plików (obrazy, pdf)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Niedozwolony typ pliku. Możesz wgrywać tylko obrazy (JPEG, PNG, GIF) oraz pliki PDF.'));
    }
  }
});

// ------------------------------------------------------------------------------
// DEFINICJE ENDPOINTÓW (Wszystkie wymagają zalogowania - authenticateJWT)
// ------------------------------------------------------------------------------

// Zabezpieczamy wszystkie trasy w tym pliku tokenem JWT
router.use(authenticateJWT);

// Pobieranie listy artykułów (filtrowanie i wyszukiwanie)
router.get('/', articleController.getArticles);

// Pobieranie zaplanowanych i opublikowanych artykułów (do kalendarza)
router.get('/calendar', articleController.getCalendar);

// Tworzenie nowego artykułu - tylko dla roli AUTHOR oraz ADMIN
router.post('/', requireRoles([Role.AUTHOR, Role.ADMIN]), validateBody(createArticleSchema), articleController.createArticle);

// Wgrywanie załącznika do artykułu
router.post('/upload', upload.single('file'), articleController.uploadFile);

// Szczegóły konkretnego artykułu
router.get('/:id', articleController.getArticleById);

// Edycja artykułu (autor lub redaktor/admin)
router.patch('/:id', validateBody(updateArticleSchema), articleController.updateArticle);

// Zmiana statusu artykułu w procesie workflow (weryfikacja ról wewnątrz kontrolera/serwisu)
router.patch('/:id/status', validateBody(updateStatusSchema), articleController.updateStatus);

// Dodawanie komentarza
router.post('/:id/comments', validateBody(addCommentSchema), articleController.addComment);

// Pobieranie historii zmian statusów artykułu
router.get('/:id/history', articleController.getHistory);

export default router;
