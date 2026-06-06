// ==============================================================================
// AUTHENTICATION ROUTES
// ==============================================================================
// Definicje tras (endpointów) HTTP dla modułu autoryzacji.

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validation.middleware';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

// Rejestracja nowego konta
router.post('/register', validateBody(registerSchema), authController.register);

// Logowanie użytkownika
router.post('/login', validateBody(loginSchema), authController.login);

// Pobieranie profilu aktualnie zalogowanego użytkownika (wymaga tokena JWT)
router.get('/me', authenticateJWT, authController.me);

// Trasy powiadomień użytkownika
router.get('/notifications', authenticateJWT, authController.getNotifications);
router.patch('/notifications/:id/read', authenticateJWT, authController.markNotificationRead);
router.patch('/notifications/read-all', authenticateJWT, authController.markAllNotificationsRead);

export default router;
