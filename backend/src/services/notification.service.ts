// ==============================================================================
// NOTIFICATION SERVICE
// ==============================================================================
// Usługa pomocnicza ułatwiająca tworzenie powiadomień w bazie danych oraz
// natychmiastowe wysyłanie ich do połączonych klientów za pomocą Socket.IO.

import prisma from '../repositories/prisma';
import { sendNotificationToUser } from '../sockets/socket';

/**
 * Tworzy powiadomienie dla użytkownika w bazie danych i przesyła je w czasie rzeczywistym.
 * 
 * @param userId ID adresata powiadomienia
 * @param title Tytuł powiadomienia (np. "Artykuł odrzucony")
 * @param message Szczegóły powiadomienia
 */
export async function createNotification(userId: number, title: string, message: string) {
  try {
    // 1. Zapisujemy powiadomienie do bazy danych PostgreSQL
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        isRead: false
      }
    });

    // 2. Wysyłamy powiadomienie w czasie rzeczywistym przez Socket.IO
    // Klient nasłuchuje na zdarzenie 'notification' i aktualizuje swój stan UI
    sendNotificationToUser(userId, 'notification', notification);

    return notification;
  } catch (error) {
    console.error(`[Notification Service] Błąd podczas tworzenia powiadomienia dla user:${userId}:`, error);
    // Błąd powiadomień nie powinien crashować głównego przepływu biznesowego
    return null;
  }
}
