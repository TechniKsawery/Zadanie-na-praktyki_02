// ==============================================================================
// ARTICLE SERVICE (Serwis Artykułów i Obiegu Dokumentów)
// ==============================================================================
// Ta klasa implementuje całą logikę biznesową dla artykułów, komentarzy oraz
// przede wszystkim MASZYNĘ STANÓW REDAKCYJNYCH (statusy).
// Zawiera restrykcyjne checki uprawnień (RBAC) w zależności od roli użytkownika.

import prisma from '../repositories/prisma';
import { ArticleStatus, Role } from '../types';
import { createNotification } from './notification.service';
import { broadcastNotification } from '../sockets/socket';

/**
 * Pobiera listę artykułów z opcjonalnymi filtrami (wyszukiwanie po tytule,
 * autorze, statusie oraz filtrowanie po dacie publikacji).
 */
export async function getArticles(filters: {
  title?: string;
  authorId?: number;
  status?: ArticleStatus;
  dateFrom?: string;
  dateTo?: string;
}) {
  const whereClause: any = {};

  // Wyszukiwanie frazy w tytule (case-insensitive)
  if (filters.title) {
    whereClause.title = {
      contains: filters.title,
      mode: 'insensitive'
    };
  }

  // Filtrowanie po autorze
  if (filters.authorId) {
    whereClause.authorId = filters.authorId;
  }

  // Filtrowanie po statusie
  if (filters.status) {
    whereClause.status = filters.status;
  }

  // Filtrowanie po dacie publikacji (od - do)
  if (filters.dateFrom || filters.dateTo) {
    whereClause.publishedAt = {};
    if (filters.dateFrom) {
      whereClause.publishedAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      whereClause.publishedAt.lte = new Date(filters.dateTo);
    }
  }

  // Pobranie z bazy wraz z relacjami autora i recenzenta (wybiórcze pola dla bezpieczeństwa)
  return prisma.article.findMany({
    where: whereClause,
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true }
      },
      reviewer: {
        select: { id: true, name: true, email: true, role: true }
      },
      uploads: true,
      _count: {
        select: { comments: true }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
}

/**
 * Pobiera szczegóły pojedynczego artykułu wraz z historią zmian,
 * komentarzami (w kolejności chronologicznej) i załączonymi plikami.
 */
export async function getArticleById(id: number) {
  return prisma.article.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, email: true, role: true }
      },
      reviewer: {
        select: { id: true, name: true, email: true, role: true }
      },
      comments: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      },
      history: {
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true }
          }
        },
        orderBy: { changedAt: 'asc' }
      },
      uploads: true
    }
  });
}

/**
 * Tworzy nowy artykuł w statusie IDEA (domyślnie).
 */
export async function createArticle(authorId: number, title: string, lead: string, content: string, category: string = 'SPORT') {
  const article = await prisma.article.create({
    data: {
      title,
      lead,
      content,
      category,
      status: ArticleStatus.IDEA,
      authorId
    }
  });

  // Dodajemy pierwszy wpis do historii zmian statusu
  await prisma.articleHistory.create({
    data: {
      articleId: article.id,
      userId: authorId,
      oldStatus: null,
      newStatus: ArticleStatus.IDEA,
      comment: 'Utworzenie pomysłu artykułu.'
    }
  });

  // Zapisujemy log systemowy
  await prisma.activityLog.create({
    data: {
      userId: authorId,
      action: 'ARTICLE_CREATE',
      details: `Utworzono artykuł (pomysł) ID:${article.id} o tytule "${title}"`
    }
  });

  // Powiadamiamy editorów o nowym pomyśle w systemie
  broadcastNotification('article_updated', { articleId: article.id, status: article.status });

  return article;
}

/**
 * Edytuje treść artykułu. 
 * Zawiera walidację uprawnień: tylko autor artykułu, editor lub admin mogą go modyfikować.
 */
export async function updateArticle(
  userId: number,
  role: Role,
  articleId: number,
  data: { 
    title?: string; 
    lead?: string; 
    content?: string; 
    reviewerId?: number | null;
    category?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaImage?: string | null;
  }
) {
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article) {
    throw new Error('Artykuł nie istnieje.');
  }

  // BEZPIECZEŃSTWO: Autor może edytować wyłącznie SWOJE teksty.
  // Edytor i Admin mogą edytować wszystko. Recenzent nie może edytować treści artykułów.
  if (role === Role.AUTHOR && article.authorId !== userId) {
    throw new Error('Brak uprawnień. Nie możesz edytować cudzych artykułów.');
  }
  
  if (role === Role.REVIEWER) {
    throw new Error('Brak uprawnień. Recenzenci nie mogą edytować bezpośrednio treści artykułu.');
  }

  // Stwórz wersję historyczną przed zapisem nowych danych, jeśli zmienia się treść/tytuł/lead
  const hasContentChanges = 
    (data.title !== undefined && data.title !== article.title) ||
    (data.lead !== undefined && data.lead !== article.lead) ||
    (data.content !== undefined && data.content !== article.content);

  if (hasContentChanges) {
    const lastVersion = await prisma.articleVersion.findFirst({
      where: { articleId },
      orderBy: { versionNumber: 'desc' }
    });
    const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

    await prisma.articleVersion.create({
      data: {
        articleId,
        userId,
        title: article.title,
        lead: article.lead,
        content: article.content,
        versionNumber: nextVersionNumber
      }
    });
  }

  const updatedArticle = await prisma.article.update({
    where: { id: articleId },
    data: {
      ...data,
      // Jeśli edytor przypisuje recenzenta, zapisujemy to
      ...(data.reviewerId !== undefined ? { reviewerId: data.reviewerId } : {})
    }
  });

  // Dodajemy wpis do historii o edycji (bez zmiany statusu)
  await prisma.articleHistory.create({
    data: {
      articleId: updatedArticle.id,
      userId,
      oldStatus: article.status,
      newStatus: article.status,
      comment: 'Zaktualizowano treść lub parametry artykułu.'
    }
  });

  // Powiadomienie realtime
  broadcastNotification('article_updated', { articleId: updatedArticle.id, status: updatedArticle.status });

  return updatedArticle;
}

/**
 * Obsługuje maszynę stanów workflow redakcyjnego. Sprawdza czy dany krok
 * jest logicznie poprawny oraz czy użytkownik ma rolę upoważnioną do wykonania zmiany.
 */
export async function updateArticleStatus(
  userId: number,
  role: Role,
  articleId: number,
  newStatus: ArticleStatus,
  comment?: string,
  scheduledAt?: Date | null
) {
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article) {
    throw new Error('Artykuł nie istnieje.');
  }

  const oldStatus = article.status;

  if (oldStatus === newStatus) {
    return article; // Brak zmian
  }

  // ==============================================================================
  // REGULAMIN MASZYNY STANÓW I UPRAWNIEŃ (BUSINESS LOGIC & SECURITY)
  // ==============================================================================
  
  // Jeśli użytkownik jest Adminem, pomijamy poniższe restrykcje (Admin może wszystko)
  if (role !== Role.ADMIN) {
    
    // 1. Zabezpieczenia dla roli AUTORA
    if (role === Role.AUTHOR) {
      // Autor może zmieniać statusy wyłącznie SWOICH tekstów
      if (article.authorId !== userId) {
        throw new Error('Brak uprawnień. Autor może zarządzać tylko własnymi artykułami.');
      }

      // Dozwolone akcje dla Autora:
      // - IDEA -> DRAFT (Rozpoczęcie pisania)
      // - DRAFT -> REVIEW (Wysłanie do korekty)
      // - REJECTED -> DRAFT (Poprawianie odrzuconego artykułu)
      const allowedAuthorTransitions = [
        oldStatus === ArticleStatus.IDEA && newStatus === ArticleStatus.DRAFT,
        oldStatus === ArticleStatus.DRAFT && newStatus === ArticleStatus.REVIEW,
        oldStatus === ArticleStatus.REJECTED && newStatus === ArticleStatus.DRAFT
      ];

      if (!allowedAuthorTransitions.some(Boolean)) {
        throw new Error(`Brak uprawnień. Jako Autor nie możesz zmienić statusu z ${oldStatus} na ${newStatus}.`);
      }
    }

    // 2. Zabezpieczenia dla roli RECENZENTA (REVIEWER)
    else if (role === Role.REVIEWER) {
      // Recenzent musi być przypisany do artykułu, chyba że to wolna recenzja (w celach uproszczenia pozwalamy recenzentom sprawdzać dowolne)
      if (article.reviewerId && article.reviewerId !== userId) {
        throw new Error('Brak uprawnień. Ten artykuł jest przypisany do innego recenzenta.');
      }

      // Dozwolone akcje dla Recenzenta (tylko artykuły w statusie REVIEW):
      // - REVIEW -> APPROVED (Akceptacja artykułu)
      // - REVIEW -> REJECTED (Całkowite odrzucenie)
      // - REVIEW -> DRAFT (Odesłanie do poprawy)
      if (oldStatus !== ArticleStatus.REVIEW) {
        throw new Error(`Brak uprawnień. Recenzent może oceniać wyłącznie artykuły w statusie REVIEW (obecny: ${oldStatus}).`);
      }

      const allowedReviewerTransitions = [
        newStatus === ArticleStatus.APPROVED,
        newStatus === ArticleStatus.REJECTED,
        newStatus === ArticleStatus.DRAFT
      ];

      if (!allowedReviewerTransitions.some(Boolean)) {
        throw new Error(`Brak uprawnień. Niedozwolony status docelowy recenzji: ${newStatus}.`);
      }
    }

    // 3. Zabezpieczenia dla roli EDYTORA (EDITOR)
    else if (role === Role.EDITOR) {
      // Edytor zarządza publikacją i planowaniem.
      // Dozwolone akcje dla Edytora:
      // - APPROVED -> SCHEDULED (Zaplanowanie publikacji - wymaga daty scheduledAt)
      // - APPROVED -> PUBLISHED (Natychmiastowa publikacja)
      // - SCHEDULED -> PUBLISHED (Ręczne opublikowanie zaplanowanego)
      // - SCHEDULED -> DRAFT/REVIEW (Wycofanie z publikacji)
      
      if (newStatus === ArticleStatus.SCHEDULED && !scheduledAt) {
        throw new Error('Podanie daty i godziny planowanej publikacji jest wymagane przy statusie SCHEDULED.');
      }

      const allowedEditorTransitions = [
        oldStatus === ArticleStatus.APPROVED && newStatus === ArticleStatus.SCHEDULED,
        oldStatus === ArticleStatus.APPROVED && newStatus === ArticleStatus.PUBLISHED,
        oldStatus === ArticleStatus.SCHEDULED && newStatus === ArticleStatus.PUBLISHED,
        oldStatus === ArticleStatus.SCHEDULED && (newStatus === ArticleStatus.DRAFT || newStatus === ArticleStatus.REVIEW)
      ];

      if (!allowedEditorTransitions.some(Boolean)) {
        throw new Error(`Brak uprawnień. Jako Edytor nie możesz zmienić statusu z ${oldStatus} na ${newStatus}.`);
      }
    }
  }

  // Przy planowaniu publikacji (SCHEDULED), wymagana jest data w przyszłości
  if (newStatus === ArticleStatus.SCHEDULED && scheduledAt) {
    if (new Date(scheduledAt) <= new Date()) {
      throw new Error('Planowana data publikacji musi być w przyszłości.');
    }
  }

  // ==============================================================================
  // AKTUALIZACJA W BAZIE I HISTORII
  // ==============================================================================
  
  const updateData: any = {
    status: newStatus
  };

  // Ustawianie dat w zależności od statusu
  if (newStatus === ArticleStatus.SCHEDULED) {
    updateData.scheduledAt = scheduledAt;
  } else if (newStatus === ArticleStatus.PUBLISHED) {
    updateData.publishedAt = new Date();
    updateData.scheduledAt = null; // Czyścimy planowanie po opublikowaniu
  } else {
    // Jeśli cofamy status z planowanego, czyścimy datę
    updateData.scheduledAt = null;
  }

  // Aktualizacja w bazie
  const updatedArticle = await prisma.article.update({
    where: { id: articleId },
    data: updateData
  });

  // Tworzenie wpisu w tabeli ArticleHistory
  await prisma.articleHistory.create({
    data: {
      articleId,
      userId,
      oldStatus,
      newStatus,
      comment: comment || `Zmieniono status z ${oldStatus} na ${newStatus}.`
    }
  });

  // Zapis logu systemowego
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'ARTICLE_STATUS_CHANGE',
      details: `Zmieniono status artykułu ID:${articleId} z ${oldStatus} na ${newStatus}. Komentarz: "${comment || 'Brak'}"`
    }
  });

  // ==============================================================================
  // POWIADOMIENIA REALTIME I E-MAIL
  // ==============================================================================
  
  // 1. Powiadamiamy autora o zmianie statusu jego tekstu
  if (updatedArticle.authorId !== userId) {
    let title = 'Zmiana statusu artykułu';
    let msg = `Status Twojego artykułu "${updatedArticle.title}" został zmieniony z ${oldStatus} na ${newStatus}.`;

    if (newStatus === ArticleStatus.APPROVED) {
      title = 'Artykuł Zaakceptowany 💚';
      msg = `Gratulacje! Twój artykuł "${updatedArticle.title}" został zaakceptowany przez recenzenta.`;
    } else if (newStatus === ArticleStatus.REJECTED) {
      title = 'Artykuł Odrzucony ❌';
      msg = `Twój artykuł "${updatedArticle.title}" został odrzucony. Komentarz: ${comment || 'Brak szczegółów.'}`;
    } else if (newStatus === ArticleStatus.DRAFT && oldStatus === ArticleStatus.REVIEW) {
      title = 'Artykuł zwrócony do poprawki ✍️';
      msg = `Twój artykuł "${updatedArticle.title}" wymaga poprawek. Uwagi: ${comment || 'Brak uwag.'}`;
    } else if (newStatus === ArticleStatus.PUBLISHED) {
      title = 'Artykuł Opublikowany! 🎉';
      msg = `Twój artykuł "${updatedArticle.title}" został oficjalnie opublikowany w portalu!`;
    }

    await createNotification(updatedArticle.authorId, title, msg);
  }

  // 2. Jeśli artykuł trafia do recenzji, powiadamiamy przypisanego recenzenta (lub wszystkich recenzentów)
  if (newStatus === ArticleStatus.REVIEW) {
    if (updatedArticle.reviewerId) {
      await createNotification(
        updatedArticle.reviewerId,
        'Nowy artykuł do recenzji 🔍',
        `Zostałeś przypisany jako recenzent do artykułu: "${updatedArticle.title}".`
      );
    } else {
      // Powiadomienie dla wszystkich recenzentów (Socket emit)
      // W bazie powiadomienie dostaje recenzent dopiero po przypisaniu, ale na sockecie możemy zaemitować do całej roli
      // W tym celu możemy pobrać wszystkich recenzentów i zapisać im w bazie notifications
      const reviewers = await prisma.user.findMany({
        where: { role: Role.REVIEWER }
      });
      for (const rev of reviewers) {
        await createNotification(
          rev.id,
          'Nowy artykuł czeka na recenzję 🔍',
          `Artykuł "${updatedArticle.title}" został przesłany do korekty i czeka na przypisanie.`
        );
      }
    }
  }

  // Powiadamiamy wszystkich połączonych klientów, że zmienił się stan artykułu (np. aby odświeżyć tablicę Kanban)
  broadcastNotification('article_updated', { articleId: updatedArticle.id, status: updatedArticle.status });

  return updatedArticle;
}

/**
 * Dodaje komentarz pod artykułem.
 */
export async function addComment(userId: number, articleId: number, content: string) {
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article) {
    throw new Error('Artykuł nie istnieje.');
  }

  const comment = await prisma.articleComment.create({
    data: {
      articleId,
      userId,
      content
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      }
    }
  });

  // Powiadamiamy autora artykułu (jeśli to nie on dodał komentarz)
  if (article.authorId !== userId) {
    await createNotification(
      article.authorId,
      'Nowy komentarz 💬',
      `Użytkownik ${comment.user.name} dodał komentarz pod Twoim artykułem "${article.title}".`
    );
  }

  // Powiadamiamy recenzenta (jeśli to nie on dodał komentarz)
  if (article.reviewerId && article.reviewerId !== userId) {
    await createNotification(
      article.reviewerId,
      'Nowy komentarz w dyskusji 💬',
      `Użytkownik ${comment.user.name} dodał komentarz w artykule "${article.title}".`
    );
  }

  // Powiadomienie realtime do osób w pokoju danego artykułu (lub po prostu broadcast o aktualizacji szczegółów)
  broadcastNotification('comment_added', { articleId, comment });

  return comment;
}

/**
 * Pobiera listę wersji edycyjnych tekstu artykułu.
 */
export async function getArticleVersions(articleId: number) {
  return prisma.articleVersion.findMany({
    where: { articleId },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true }
      }
    },
    orderBy: { versionNumber: 'desc' }
  });
}

/**
 * Przywraca treść artykułu z wybranej wersji historycznej.
 */
export async function rollbackArticleVersion(
  userId: number,
  role: Role,
  articleId: number,
  versionId: number
) {
  const article = await prisma.article.findUnique({
    where: { id: articleId }
  });

  if (!article) {
    throw new Error('Artykuł nie istnieje.');
  }

  // Sprawdzanie uprawnień
  if (role === Role.AUTHOR && article.authorId !== userId) {
    throw new Error('Brak uprawnień. Autor może przywracać tylko własne artykuły.');
  }
  if (role === Role.REVIEWER) {
    throw new Error('Brak uprawnień. Recenzenci nie mogą edytować treści.');
  }

  const targetVersion = await prisma.articleVersion.findFirst({
    where: { id: versionId, articleId }
  });

  if (!targetVersion) {
    throw new Error('Wybrana wersja nie istnieje lub nie należy do tego artykułu.');
  }

  // Stwórz wersję historyczną przed nadpisaniem (aby dało się cofnąć sam rollback)
  const lastVersion = await prisma.articleVersion.findFirst({
    where: { articleId },
    orderBy: { versionNumber: 'desc' }
  });
  const nextVersionNumber = lastVersion ? lastVersion.versionNumber + 1 : 1;

  await prisma.articleVersion.create({
    data: {
      articleId,
      userId,
      title: article.title,
      lead: article.lead,
      content: article.content,
      versionNumber: nextVersionNumber
    }
  });

  // Przywróć treść
  const updatedArticle = await prisma.article.update({
    where: { id: articleId },
    data: {
      title: targetVersion.title,
      lead: targetVersion.lead,
      content: targetVersion.content
    }
  });

  // Dodaj wpis do historii workflowu
  await prisma.articleHistory.create({
    data: {
      articleId,
      userId,
      oldStatus: article.status,
      newStatus: article.status,
      comment: `Przywrócono treść z wersji historycznej nr ${targetVersion.versionNumber}.`
    }
  });

  // Log systemowy
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'ARTICLE_ROLLBACK',
      details: `Przywrócono artykuł ID:${articleId} do wersji nr ${targetVersion.versionNumber}`
    }
  });

  // Powiadomienie realtime
  broadcastNotification('article_updated', { articleId, status: article.status });

  return updatedArticle;
}
