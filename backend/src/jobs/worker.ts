// ==============================================================================
// BACKGROUND WORKER (Automatyczny Publikator Artykułów)
// ==============================================================================
// Ten worker działa w osobnym wątku lub jako pętla czasowa w tle serwera Node.js.
// Jego zadaniem jest automatyczna publikacja artykułów zaplanowanych (SCHEDULED).
// Co określony czas sprawdza bazę, dokonuje aktualizacji i wysyła powiadomienia.

import prisma from '../repositories/prisma';
import { ArticleStatus } from '../types';
import { createNotification } from '../services/notification.service';
import { broadcastNotification } from '../sockets/socket';

let intervalId: NodeJS.Timeout | null = null;

/**
 * Sprawdza bazę danych pod kątem artykułów o statusie SCHEDULED,
 * których termin publikacji minął, i publikuje je.
 */
export async function checkAndPublishArticles() {
  const now = new Date();
  
  try {
    // 1. Pobieramy wszystkie artykuły zaplanowane (SCHEDULED), których scheduledAt <= now
    const articlesToPublish = await prisma.article.findMany({
      where: {
        status: ArticleStatus.SCHEDULED,
        scheduledAt: {
          lte: now
        }
      }
    });

    if (articlesToPublish.length === 0) {
      return; // Brak artykułów do opublikowania w tej rundzie
    }

    console.log(`[Worker] Znaleziono ${articlesToPublish.length} artykułów do automatycznej publikacji.`);

    for (const article of articlesToPublish) {
      // Wykonujemy operację aktualizacji w transakcji, aby zachować spójność danych
      await prisma.$transaction(async (tx) => {
        // A. Aktualizacja statusu artykułu na PUBLISHED
        await tx.article.update({
          where: { id: article.id },
          data: {
            status: ArticleStatus.PUBLISHED,
            publishedAt: now,
            scheduledAt: null // Czyszczenie daty planowania
          }
        });

        // B. Dodanie wpisu do historii zmian statusu (jako modyfikacja przez system)
        await tx.articleHistory.create({
          data: {
            articleId: article.id,
            userId: article.authorId, // Podczepiamy pod autora lub system, używamy autora jako odbiorcy
            oldStatus: ArticleStatus.SCHEDULED,
            newStatus: ArticleStatus.PUBLISHED,
            comment: 'Automatyczna publikacja przez systemowy harmonogram zadań.'
          }
        });

        // C. Zapis w logach aktywności admina
        await tx.activityLog.create({
          data: {
            userId: null, // Akcja automatyczna systemu
            action: 'SYSTEM_ARTICLE_PUBLISH',
            details: `Automatycznie opublikowano artykuł ID:${article.id} o tytule "${article.title}"`
          }
        });
      });

      // D. Stworzenie powiadomienia w bazie danych dla autora artykułu
      await createNotification(
        article.authorId,
        'Artykuł został opublikowany! 🎉',
        `Twój zaplanowany artykuł "${article.title}" został automatycznie opublikowany.`
      );

      // E. Wysłanie powiadomienia realtime na Socket.IO (broadcast informuje o potrzebie przeładowania widoków)
      broadcastNotification('article_updated', { articleId: article.id, status: ArticleStatus.PUBLISHED });
      
      console.log(`[Worker] Pomyślnie opublikowano artykuł ID:${article.id}`);
    }
  } catch (error) {
    console.error('[Worker] Błąd podczas sprawdzania/publikacji artykułów:', error);
  }
}

/**
 * Uruchamia pętlę workera w tle.
 * 
 * @param intervalMs Czas w milisekundach pomiędzy sprawdzeniami (domyślnie 30 sekund)
 */
export function startPublishingWorker(intervalMs: number = 30000) {
  if (intervalId) {
    console.warn('[Worker] Worker już działa.');
    return;
  }

  console.log(`[Worker] Inicjalizacja workera publikacji (sprawdzanie co ${intervalMs / 1000}s)...`);
  
  // Wywołujemy od razu na starcie
  checkAndPublishArticles();

  // Ustawiamy cykliczne wykonywanie w tle
  intervalId = setInterval(async () => {
    await checkAndPublishArticles();
  }, intervalMs);
}

/**
 * Zatrzymuje pętlę workera w tle (np. przy zamykaniu serwera).
 */
export function stopPublishingWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Worker] Worker publikacji został zatrzymany.');
  }
}
