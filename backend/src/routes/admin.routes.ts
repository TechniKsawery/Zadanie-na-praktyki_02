// ==============================================================================
// ADMIN PANEL ROUTES
// ==============================================================================
// Definicje tras dostępnych wyłącznie dla ról z uprawnieniami administratora (ADMIN).

import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { authenticateJWT, requireRoles } from '../middlewares/auth.middleware';
import { Role } from '../types';

const router = Router();

// Blokada przed dostępem nieautoryzowanym
router.use(authenticateJWT);

// Pobieranie statystyk systemowych, logów i aktywności (dostępne dla wszystkich zalogowanych redaktorów/autorów)
router.get('/stats', adminController.getStats);

// Zabezpieczenie pozostałych tras wyłącznie dla roli ADMIN
router.use(requireRoles([Role.ADMIN]));

// Pobieranie listy użytkowników (do zarządzania)
router.get('/users', adminController.getUsers);

// Zmiana roli wybranego użytkownika
router.put('/users/:id/role', adminController.updateUserRole);

export default router;
