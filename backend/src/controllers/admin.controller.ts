// ==============================================================================
// ADMIN CONTROLLER
// ==============================================================================
// Ten kontroler obsługuje zapytania dotyczące panelu administracyjnego, takie jak
// generowanie zaawansowanych statystyk systemu, zmiana ról użytkowników oraz
// pobieranie logów audytowych (Activity Logs).

import { Request, Response } from 'express';
import prisma from '../repositories/prisma';
import { Role } from '../types';

/**
 * Generuje statystyki i raporty redakcyjne.
 * Zwraca zestawienia przydatne do wyświetlenia na Dashboardzie w formie wykresów.
 */
export async function getStats(_req: Request, res: Response) {
  try {
    // 1. Ogólna liczba użytkowników z podziałem na role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        _all: true
      }
    });

    // 2. Ogólna liczba artykułów z podziałem na statusy
    const articlesByStatus = await prisma.article.groupBy({
      by: ['status'],
      _count: {
        _all: true
      }
    });

    // 3. Statystyki liczbowe
    const userCount = await prisma.user.count();
    const articleCount = await prisma.article.count();
    const commentCount = await prisma.articleComment.count();
    const uploadCount = await prisma.upload.count();

    // 4. Ranking najaktywniejszych autorów (liczba napisanych tekstów)
    const topAuthors = await prisma.user.findMany({
      where: {
        role: Role.AUTHOR
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: { authoredArticles: true }
        }
      },
      orderBy: {
        authoredArticles: {
          _count: 'desc'
        }
      },
      take: 5
    });

    // 5. Ostatnie 30 logów aktywności w systemie
    const recentLogs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 30
    });

    return res.status(200).json({
      success: true,
      stats: {
        counters: {
          users: userCount,
          articles: articleCount,
          comments: commentCount,
          uploads: uploadCount
        },
        usersByRole,
        articlesByStatus,
        topAuthors,
        recentLogs
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas generowania statystyk systemowych.',
      error: error.message
    });
  }
}

/**
 * Pobiera listę wszystkich użytkowników w systemie (do zarządzania rolami).
 */
export async function getUsers(_req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            authoredArticles: true,
            reviewedArticles: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      users
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Nie udało się pobrać listy użytkowników.',
      error: error.message
    });
  }
}

/**
 * Zmienia rolę wybranemu użytkownikowi (wymaga uprawnień ADMIN).
 */
export async function updateUserRole(req: Request, res: Response) {
  try {
    const targetUserId = parseInt(req.params.id);
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Podano niepoprawną rolę użytkownika.'
      });
    }

    // Sprawdzamy czy użytkownik nie próbuje zmienić roli samemu sobie (opcjonalna blokada)
    if (req.user!.id === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Nie możesz zmienić własnej roli w tym panelu.'
      });
    }

    // Aktualizujemy rolę w bazie danych
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    // Zapisujemy audit log
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'USER_ROLE_CHANGE',
        details: `Zmieniono rolę użytkownika ${updatedUser.email} (ID:${updatedUser.id}) na ${role}`
      }
    });

    return res.status(200).json({
      success: true,
      message: `Rola użytkownika została pomyślnie zmieniona na ${role}.`,
      user: updatedUser
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Nie udało się zaktualizować roli użytkownika.',
      error: error.message
    });
  }
}
