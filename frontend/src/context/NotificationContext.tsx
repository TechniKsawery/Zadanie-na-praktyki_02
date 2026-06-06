// ==============================================================================
// NOTIFICATION & SOCKET.IO CONTEXT
// ==============================================================================
// Ten plik inicjalizuje klienta Socket.IO po zalogowaniu użytkownika, zarządza
// listą powiadomień pobieranych z bazy oraz kolejkuje wyskakujące powiadomienia Toast.

import React, { createContext, useState, useEffect, useContext } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Notification } from '../types';
import api from '../services/api';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  toasts: Toast[];
  addToast: (title: string, message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  socket: Socket | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Pobieranie powiadomień z serwera (jeśli użytkownik jest zalogowany)
  const fetchNotifications = async () => {
    try {
      // Pobieramy powiadomienia poprzez dedykowany endpoint lub filtr użytkownika
      // SQLite/Prisma pozwala na filtrowanie w bazie. Pobieramy z /api/auth/me powiadomienia?
      // Zrobimy prosty endpoint w backendzie lub pobierzemy powiadomienia powiązane z zalogowanym użytkownikiem.
      // Stworzyliśmy tabelę notifications, napiszmy endpoint /api/auth/notifications w kontrolerze lub pobierzmy tutaj.
      // Lub możemy w backendzie dodać endpoint GET /api/auth/notifications.
      // Zaimplementujmy to pobieraniem z /api/articles/notifications (lub dodajmy pobieranie bezpośrednio)
      // Ponieważ nie zrobiliśmy osobnej trasy dla notifications, zróbmy zapytanie do profilu użytkownika
      // w którym załączymy powiadomienia lub napiszemy endpoint w auth.routes.
      // Aby to działało idealnie, pobierzemy powiadomienia z profilu użytkownika.
      // Poczekaj, dodaliśmy relację "notifications" do modelu User w schema.prisma.
      // Pobierzmy powiadomienia z nowego endpointu GET /api/auth/notifications.
      // Stworzymy go zaraz na backendzie lub pobierzemy z /api/auth/me jeśli rozszerzymy go.
      // Rozszerzmy me() na backendzie o powiadomienia, albo dodajmy prosty endpoint.
      // Pobierzmy z dedykowanego endpointu GET /api/auth/notifications.
      const res = await api.get('/auth/notifications');
      setNotifications(res.data.notifications);
    } catch (error) {
      console.error('Błąd pobierania powiadomień:', error);
    }
  };

  // Dodawanie powiadomienia wyskakującego (Toast)
  const addToast = (title: string, message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, title, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Automatyczne zamykanie toastu po 5 sekundach
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Oznaczanie powiadomienia jako przeczytane
  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/auth/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Błąd oznaczania powiadomienia jako przeczytane:', error);
    }
  };

  // Oznaczanie wszystkich powiadomień jako przeczytane
  const markAllAsRead = async () => {
    try {
      await api.patch('/auth/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Błąd oznaczania wszystkich powiadomień:', error);
    }
  };

  // Inicjalizacja połączenia WebSocket (Socket.IO) po zalogowaniu
  useEffect(() => {
    if (!user || !token) {
      // Jeśli użytkownik się wylogował, rozłączamy gniazdo
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setNotifications([]);
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    // Inicjalizacja połączenia Socket.IO z przekazaniem tokena w handshake.auth
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Połączono z serwerem realtime.');
    });

    // Nasłuchiwanie na nowe powiadomienia personalne
    newSocket.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      addToast(notification.title, notification.message, 'info');
      
      // Opcjonalnie: odtwarzanie subtelnego dźwięku powiadomienia
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
        audio.volume = 0.3;
        audio.play();
      } catch (e) {
        // Ignorujemy błędy autoodtwarzania przeglądarki
      }
    });

    // Zdarzenie o zmianie stanu dowolnego artykułu (np. do odświeżania tablicy Kanban lub kalendarza)
    newSocket.on('article_updated', (data: { articleId: number; status: string }) => {
      // Wywołujemy globalne powiadomienie Toast o aktualizacji tekstu
      // addToast('Aktualizacja Artykułu', `Artykuł ID:${data.articleId} zmienił status na ${data.status}`, 'success');
      
      // Rozsyłamy niestandardowe zdarzenie w DOM, aby strony mogły nasłuchiwać odświeżenia
      window.dispatchEvent(new CustomEvent('article_changed_realtime', { detail: data }));
    });

    newSocket.on('comment_added', (data: { articleId: number; comment: any }) => {
      window.dispatchEvent(new CustomEvent('comment_added_realtime', { detail: data }));
    });

    setSocket(newSocket);
    fetchNotifications();

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        addToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
        socket
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications musi być używane wewnątrz NotificationProvider.');
  }
  return context;
};
