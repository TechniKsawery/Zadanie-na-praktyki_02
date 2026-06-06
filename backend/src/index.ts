// ==============================================================================
// MAIN BACKEND SERVER ENTRY POINT (Główny plik serwera)
// ==============================================================================
// Ten plik spina wszystkie moduły: konfigurację Express, routing API, serwer HTTP,
// WebSocket (Socket.IO), static files dla uploadów oraz background worker.

import dotenv from 'dotenv';
import path from 'path';

// Ładujemy zmienne środowiskowe z pliku .env na samym początku
dotenv.config({ path: path.join(__dirname, '../../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import authRoutes from './routes/auth.routes';
import articleRoutes from './routes/article.routes';
import adminRoutes from './routes/admin.routes';
import { initializeSockets } from './sockets/socket';
import { startPublishingWorker } from './jobs/worker';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------------------
// MIDDLEWARE GLOBALNE
// ------------------------------------------------------------------------------

// Konfiguracja CORS (Cross-Origin Resource Sharing) pod adres frontendu
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true // Pozwala na przesyłanie ciasteczek i nagłówków auth
}));

// Włączenie parsowania JSON w ciele zapytań (POST/PUT/PATCH)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serwowanie plików statycznych z folderu uploads (frontend może wyświetlać wgrane obrazki)
// Ścieżka fizyczna: backend/uploads -> dostępna przez http://localhost:5000/uploads/nazwa_pliku.jpg
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ------------------------------------------------------------------------------
// DEFINICJA TRAS (API ROUTING)
// ------------------------------------------------------------------------------

app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);

// Testowy endpoint sprawdzający działanie serwera (Health Check)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Serwer redakcji działa poprawnie.',
    timestamp: new Date()
  });
});

// ------------------------------------------------------------------------------
// GLOBALNA OBSŁUGA BŁĘDÓW (ERROR HANDLING MIDDLEWARE)
// ------------------------------------------------------------------------------
// Bezpieczne łapanie wyjątków. Zapobiega wyciekom wrażliwych danych (np. stack trace SQL) do klienta.

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Error Handler]', err);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Wystąpił nieoczekiwany błąd serwera. Spróbuj ponownie później.'
  });
});

// ------------------------------------------------------------------------------
// INICJALIZACJA USŁUG I START SERWERA
// ------------------------------------------------------------------------------

// 1. Inicjalizacja serwera Socket.IO (WebSockets) dla komunikacji realtime
initializeSockets(server);

// 2. Start Workera publikującego zaplanowane teksty co 30 sekund
startPublishingWorker(30000);

// 3. Uruchomienie nasłuchiwania serwera HTTP
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Serwer redakcji wystartował na porcie: ${PORT}`);
  console.log(`📡 WebSocket akceptuje połączenia z: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  console.log(`📂 Wgrane pliki dostępne pod adresem: http://localhost:${PORT}/uploads/`);
  console.log(`=======================================================`);
});
