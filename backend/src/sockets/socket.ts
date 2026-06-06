// ==============================================================================
// REALTIME SOCKET.IO HANDLER
// ==============================================================================
// Ten plik odpowiada za konfigurację serwera Socket.IO, zabezpieczenie go tokenem JWT,
// oraz zarządzanie połączeniami aktywnych użytkowników w pokojach (rooms).
// Pozwala na wysyłanie komunikatów bezpośrednio do danego użytkownika lub danej roli.

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { UserPayload } from '../types';

let io: Server | null = null;

// Mapa przechowująca powiązanie UserId -> Tablica SocketId (obsługuje wiele kart/urządzeń)
const userSockets = new Map<number, string[]>();

const JWT_SECRET = process.env.JWT_SECRET || 'zmien_mnie_na_produkcji_bardzo_dlugi_i_bezpieczny_klucz_jwt_12345';

/**
 * Inicjalizuje serwer Socket.IO i zabezpiecza go middleware JWT.
 * 
 * @param server Instancja serwera HTTP Node.js
 */
export function initializeSockets(server: HttpServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  // Middleware autoryzacji Socket.IO: połączenie nastąpi tylko z poprawnym tokenem JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Autoryzacja WebSocket nieudana: brak tokenu.'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
      socket.data.user = decoded; // Zapisujemy zdekodowane dane użytkownika w gnieździe
      next();
    } catch (err) {
      next(new Error('Autoryzacja WebSocket nieudana: niepoprawny token.'));
    }
  });

  // Obsługa połączeń klientów
  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as UserPayload;
    
    if (user) {
      console.log(`[Socket.IO] Połączono: Użytkownik ${user.email} (ID: ${user.id}, Rola: ${user.role})`);
      
      // Rejestracja gniazda w mapie użytkowników
      const sockets = userSockets.get(user.id) || [];
      sockets.push(socket.id);
      userSockets.set(user.id, sockets);
      
      // Dołączenie użytkownika do jego prywatnego pokoju (np. do powiadomień personalnych)
      socket.join(`user:${user.id}`);
      
      // Dołączenie użytkownika do pokoju opartego o rolę (np. powiadomienia dla autorów lub recenzentów)
      socket.join(`role:${user.role}`);
    }

    // Obsługa rozłączenia
    socket.on('disconnect', () => {
      if (user) {
        console.log(`[Socket.IO] Rozłączono: Użytkownik ${user.email} (ID: ${user.id})`);
        
        const sockets = userSockets.get(user.id) || [];
        const filtered = sockets.filter(id => id !== socket.id);
        
        if (filtered.length > 0) {
          userSockets.set(user.id, filtered);
        } else {
          userSockets.delete(user.id);
        }
      }
    });
  });
}

/**
 * Wysyła powiadomienie realtime do konkretnego użytkownika.
 * 
 * @param userId ID użytkownika w bazie danych
 * @param event Nazwa zdarzenia Socket.IO
 * @param data Dane przekazywane w zdarzeniu
 */
export function sendNotificationToUser(userId: number, event: string, data: any) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Wysyła powiadomienie realtime do wszystkich użytkowników o danej roli.
 * 
 * @param role Rola użytkowników (np. 'EDITOR', 'REVIEWER')
 * @param event Nazwa zdarzenia Socket.IO
 * @param data Dane przekazywane w zdarzeniu
 */
export function sendNotificationToRole(role: string, event: string, data: any) {
  if (io) {
    io.to(`role:${role}`).emit(event, data);
  }
}

/**
 * Wysyła powiadomienie realtime do wszystkich połączonych użytkowników.
 * 
 * @param event Nazwa zdarzenia Socket.IO
 * @param data Dane przekazywane w zdarzeniu
 */
export function broadcastNotification(event: string, data: any) {
  if (io) {
    io.emit(event, data);
  }
}
