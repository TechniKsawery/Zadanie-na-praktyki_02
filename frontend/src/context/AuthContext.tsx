// ==============================================================================
// AUTHENTICATION CONTEXT (Zarządzanie Sesją)
// ==============================================================================
// Ten kontekst przechowuje dane zalogowanego użytkownika, obsługuje logowanie,
// rejestrację, weryfikację tokena przy odświeżeniu oraz wylogowanie.

import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('wmedia_token'));
  const [loading, setLoading] = useState<boolean>(true);

  // Funkcja sprawdzająca poprawność tokena i pobierająca świeży profil użytkownika
  const verifySession = async (authToken: string) => {
    try {
      const response = await api.get('/auth/me', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('Sesja wygasła lub jest niepoprawna:', error);
      // W przypadku błędu czyścimy sesję
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      verifySession(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Odświeżenie danych użytkownika w dowolnym momencie
  const refreshUser = async () => {
    if (token) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data.user);
      } catch (error) {
        console.error('Błąd odświeżania użytkownika:', error);
      }
    }
  };

  // Obsługa logowania
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      
      localStorage.setItem('wmedia_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Błąd logowania. Spróbuj ponownie.');
    }
  };

  // Obsługa rejestracji
  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await api.post('/auth/register', { email, password, name });
      const { token: receivedToken, user: receivedUser } = response.data;

      localStorage.setItem('wmedia_token', receivedToken);
      setToken(receivedToken);
      setUser(receivedUser);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Błąd rejestracji. Spróbuj ponownie.');
    }
  };

  // Wylogowanie
  const logout = () => {
    localStorage.removeItem('wmedia_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom Hook do łatwego korzystania z AuthContextu w dowolnym komponencie
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth musi być używane wewnątrz AuthProvider.');
  }
  return context;
};
