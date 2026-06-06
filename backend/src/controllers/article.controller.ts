// ==============================================================================
// ARTICLE CONTROLLER (Kontroler Obsługi Artykułów)
// ==============================================================================
// Obsługuje żądania HTTP dotyczące tworzenia, edycji i statusów artykułów,
// dodawania komentarzy, pobierania historii oraz przesyłania załączników.

import { Request, Response } from 'express';
import * as articleService from '../services/article.service';
import prisma from '../repositories/prisma';
import { ArticleStatus } from '../types';

/**
 * Pobiera listę wszystkich artykułów z uwzględnieniem filtrów.
 */
export async function getArticles(req: Request, res: Response) {
  try {
    const { title, authorId, status, dateFrom, dateTo } = req.query;
    
    const articles = await articleService.getArticles({
      title: title as string,
      authorId: authorId ? parseInt(authorId as string) : undefined,
      status: status as ArticleStatus,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string
    });
    
    return res.status(200).json({
      success: true,
      articles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Nie udało się pobrać artykułów.',
      error: error.message
    });
  }
}

/**
 * Pobiera szczegóły pojedynczego artykułu.
 */
export async function getArticleById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    
    const article = await articleService.getArticleById(id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Artykuł o podanym ID nie został znaleziony.'
      });
    }
    
    return res.status(200).json({
      success: true,
      article
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania szczegółów artykułu.',
      error: error.message
    });
  }
}

/**
 * Tworzy nowy artykuł (pomysł).
 */
export async function createArticle(req: Request, res: Response) {
  try {
    const { title, lead, content } = req.body;
    const authorId = req.user!.id; // Zapisany przez middleware JWT
    
    const article = await articleService.createArticle(authorId, title, lead, content);
    
    return res.status(201).json({
      success: true,
      message: 'Artykuł (pomysł) został utworzony pomyślnie.',
      article
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Nie udało się utworzyć artykułu.',
      error: error.message
    });
  }
}

/**
 * Aktualizuje treść artykułu.
 */
export async function updateArticle(req: Request, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.user!.id;
    const role = req.user!.role;
    const { title, lead, content, reviewerId } = req.body;
    
    const updated = await articleService.updateArticle(userId, role, articleId, {
      title,
      lead,
      content,
      reviewerId
    });
    
    return res.status(200).json({
      success: true,
      message: 'Artykuł został pomyślnie zaktualizowany.',
      article: updated
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Błąd podczas edycji artykułu.',
      error: error.message
    });
  }
}

/**
 * Zmienia status artykułu w procesie workflow (np. wysłanie do recenzji, akceptacja, odrzucenie, planowanie).
 */
export async function updateStatus(req: Request, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, comment, scheduledAt } = req.body;
    
    const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    
    const updated = await articleService.updateArticleStatus(
      userId,
      role,
      articleId,
      status,
      comment,
      parsedScheduledAt
    );
    
    return res.status(200).json({
      success: true,
      message: `Status artykułu został zmieniony na ${status}.`,
      article: updated
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Nie udało się zmienić statusu artykułu.',
      error: error.message
    });
  }
}

/**
 * Dodaje komentarz pod artykułem.
 */
export async function addComment(req: Request, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { content } = req.body;
    
    const comment = await articleService.addComment(userId, articleId, content);
    
    return res.status(201).json({
      success: true,
      message: 'Komentarz został dodany.',
      comment
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: 'Błąd podczas dodawania komentarza.',
      error: error.message
    });
  }
}

/**
 * Pobiera historię zmian statusu dla danego artykułu.
 */
export async function getHistory(req: Request, res: Response) {
  try {
    const articleId = parseInt(req.params.id);
    
    const history = await prisma.articleHistory.findMany({
      where: { articleId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { changedAt: 'desc' }
    });
    
    return res.status(200).json({
      success: true,
      history
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania historii zmian statusów.',
      error: error.message
    });
  }
}

/**
 * Pobiera zaplanowane i opublikowane artykuły do wyświetlenia w kalendarzu.
 */
export async function getCalendar(_req: Request, res: Response) {
  try {
    // Kalendarz pokazuje artykuły zaplanowane (SCHEDULED) lub już opublikowane (PUBLISHED)
    const articles = await prisma.article.findMany({
      where: {
        status: {
          in: [ArticleStatus.SCHEDULED, ArticleStatus.PUBLISHED]
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true,
        publishedAt: true,
        author: {
          select: { name: true }
        }
      },
      orderBy: { scheduledAt: 'asc' }
    });
    
    return res.status(200).json({
      success: true,
      articles
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Błąd podczas pobierania kalendarza publikacji.',
      error: error.message
    });
  }
}

/**
 * Obsługuje wgrywanie plików powiązanych z artykułem.
 */
export async function uploadFile(req: Request, res: Response) {
  try {
    const articleId = parseInt(req.body.articleId);
    
    if (!articleId) {
      return res.status(400).json({
        success: false,
        message: 'Brak ID artykułu w żądaniu.'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nie przesłano żadnego pliku.'
      });
    }

    // Zapisujemy metadane pliku w bazie danych PostgreSQL
    const upload = await prisma.upload.create({
      data: {
        articleId,
        filename: req.file.originalname,
        filepath: `/uploads/${req.file.filename}`, // Lokalna ścieżka dostępu przez Static Files
        mimetype: req.file.mimetype,
        size: req.file.size
      }
    });

    // Zapisujemy log w logach aktywności
    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'ARTICLE_UPLOAD',
        details: `Wgrano załącznik "${req.file.originalname}" do artykułu ID:${articleId}`
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Plik został pomyślnie załadowany.',
      upload
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas wgrywania pliku.',
      error: error.message
    });
  }
}
