// ==============================================================================
// AUTHENTICATION & AUTHORIZATION MIDDLEWARES
// ==============================================================================
// Te middleware'y sprawdzają autentyczność użytkownika (JWT) oraz kontrolują
// dostęp do określonych endpointów na podstawie przypisanych ról.

import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { Role } from '../types';
import { UserPayload } from '../types';

// Pobieranie sekretu JWT ze środowiska
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey12345!@#';

/**
 * Middleware uwierzytelniający: sprawdza obecność i poprawność tokenu JWT w nagłówku.
 * Jeśli token jest prawidłowy, zapisuje dane użytkownika w `req.user` i wywołuje next().
 * W przeciwnym razie zwraca błąd 401 (Unauthorized).
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ 
      success: false, 
      message: 'Brak tokenu autoryzacji. Zaloguj się.' 
    });
  }

  // Oczekujemy formatu: "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Nieprawidłowy format tokenu autoryzacyjnego.' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded; // Zapisujemy zdekodowanego użytkownika do Requestu Express
    return next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Sesja wygasła lub token jest nieaktywny. Zaloguj się ponownie.' 
    });
  }
};

/**
 * Middleware autoryzacyjny: sprawdza, czy rola zalogowanego użytkownika jest
 * na liście ról uprawnionych do danej akcji.
 * Zwraca błąd 403 (Forbidden) w przypadku braku uprawnień.
 */
export const requireRoles = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Brak uwierzytelnienia.' 
      });
    }

    const hasRole = allowedRoles.includes(req.user.role);
    
    if (!hasRole) {
      return res.status(403).json({ 
        success: false, 
        message: `Brak uprawnień. Ta akcja wymaga roli: ${allowedRoles.join(' lub ')}.` 
      });
    }

    return next();
  };
};
