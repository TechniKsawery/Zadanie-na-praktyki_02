// ==============================================================================
// AUTHENTICATION SERVICE
// ==============================================================================
// Ta usługa realizuje logikę rejestracji i logowania użytkowników. Odpowiada za
// wyszukiwanie użytkowników, porównywanie haseł, generowanie tokenów JWT
// oraz zapisywanie logów aktywności (Activity Logs) w celach audytowych.

import prisma from '../repositories/prisma';
import { hashPassword, comparePassword } from './crypto.service';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'zmien_mnie_na_produkcji_bardzo_dlugi_i_bezpieczny_klucz_jwt_12345';

/**
 * Rejestruje nowego użytkownika w bazie danych z domyślną rolą AUTHOR.
 * Generuje i zwraca token JWT oraz dane profilowe.
 * 
 * @param email Unikalny adres e-mail
 * @param password Hasło w czystym tekście
 * @param name Nazwa wyświetlana użytkownika
 */
export async function register(email: string, password: string, name: string) {
  // Sprawdzamy czy e-mail nie jest już zajęty
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('Użytkownik o podanym adresie email już istnieje.');
  }

  // Hashowanie hasła za pomocą wbudowanego modułu crypto
  const passwordHash = hashPassword(password);
  
  // Zapis do bazy danych PostgreSQL
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: 'AUTHOR' // Każdy nowo zarejestrowany otrzymuje rolę Autora
    }
  });

  // Tworzymy log aktywności w systemie
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'USER_REGISTER',
      details: `Zarejestrowano nowe konto użytkownika: ${email}`
    }
  });

  // Wygenerowanie tokena autoryzacyjnego JWT ważnego przez 24 godziny
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  };
}

/**
 * Loguje użytkownika na podstawie adresu e-mail i hasła.
 * Weryfikuje hasło, zapisuje zdarzenie w logach i zwraca token JWT.
 * 
 * @param email Adres e-mail konta
 * @param password Hasło konta
 */
export async function login(email: string, password: string) {
  // Wyszukujemy użytkownika po e-mailu
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Błędny adres email lub hasło.');
  }

  // Weryfikacja hasła
  const isPasswordValid = comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new Error('Błędny adres email lub hasło.');
  }

  // Tworzymy log logowania w systemie
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOGIN',
      details: `Użytkownik zalogował się do panelu redakcji.`
    }
  });

  // Generujemy token JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt
    }
  };
}
