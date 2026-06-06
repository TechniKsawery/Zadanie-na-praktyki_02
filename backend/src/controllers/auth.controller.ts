// ==============================================================================
// AUTHENTICATION CONTROLLER
// ==============================================================================
// Ten kontroler obsługuje zapytania HTTP dotyczące uwierzytelniania, rejestracji
// oraz pobierania danych profilowych zalogowanego użytkownika.

import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import prisma from '../repositories/prisma';

/**
 * Rejestruje nowego użytkownika.
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    
    const result = await authService.register(email, password, name);
    
    return res.status(201).json({
      success: true,
      message: 'Konto zostało pomyślnie utworzone.',
      ...result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Wystąpił błąd podczas rejestracji.'
    });
  }
}

/**
 * Loguje użytkownika i zwraca token JWT.
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password);
    
    return res.status(200).json({
      success: true,
      message: 'Zalogowano pomyślnie.',
      ...result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Błędny login lub hasło.'
    });
  }
}

/**
 * Pobiera profil zalogowanego użytkownika na podstawie tokenu JWT.
 * Przydatne do odświeżania stanu aplikacji na frontendzie.
 */
export async function me(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Nieuwierzytelniony.'
      });
    }

    // Pobieramy świeże dane z bazy, aby mieć aktualną rolę
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie istnieje w systemie.'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Wystąpił wewnętrzny błąd serwera.',
      error: error.message
    });
  }
}

/**
 * Pobiera powiadomienia dla zalogowanego użytkownika.
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      notifications
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania powiadomień.',
      error: error.message
    });
  }
}

/**
 * Oznacza konkretne powiadomienie jako przeczytane.
 */
export async function markNotificationRead(req: Request, res: Response) {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Sprawdzamy czy powiadomienie należy do użytkownika
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Powiadomienie nie istnieje lub nie należy do Ciebie.'
      });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return res.status(200).json({
      success: true,
      notification: updated
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Nie udało się oznaczyć powiadomienia jako przeczytane.',
      error: error.message
    });
  }
}

/**
 * Oznacza wszystkie powiadomienia użytkownika jako przeczytane.
 */
export async function markAllNotificationsRead(req: Request, res: Response) {
  try {
    const userId = req.user!.id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    return res.status(200).json({
      success: true,
      message: 'Oznaczono wszystkie powiadomienia jako przeczytane.'
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Nie udało się zaktualizować statusu powiadomień.',
      error: error.message
    });
  }
}
