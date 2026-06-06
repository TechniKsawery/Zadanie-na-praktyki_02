// ==============================================================================
// CRYPTO SERVICE (Natywne Hashowanie Haseł)
// ==============================================================================
// Ten plik zawiera funkcje do bezpiecznego hashowania i weryfikacji haseł
// przy użyciu wbudowanego w Node.js modułu 'crypto' i standardu PBKDF2 (SHA512).
// Rozwiązanie to jest bezpieczne, wydajne i eliminuje konieczność instalacji
// zewnętrznych modułów natywnych (jak bcrypt), które wymagają kompilacji C++.

import * as crypto from 'crypto';

/**
 * Hashuje hasło tekstowe za pomocą PBKDF2.
 * Zwraca ciąg znaków w formacie "sól:hash" (w systemie szesnastkowym).
 * 
 * @param password Hasło w czystym tekście
 */
export function hashPassword(password: string): string {
  // Generowanie losowej, unikalnej soli o długości 16 bajtów
  const salt = crypto.randomBytes(16).toString('hex');
  
  // Hashowanie hasła za pomocą PBKDF2 (10 000 iteracji, klucz 64 bajty, algorytm SHA512)
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  
  // Zwracamy sól i hash połączone dwukropkiem, aby móc je zapisać w jednym polu w bazie
  return `${salt}:${hash}`;
}

/**
 * Porównuje podane hasło w czystym tekście z hashem zapisanym w bazie.
 * Zwraca true, jeśli hasła są zgodne, w przeciwnym razie false.
 * 
 * @param password Hasło wpisane przez użytkownika
 * @param storedValue Wartość z bazy w formacie "sól:hash"
 */
export function comparePassword(password: string, storedValue: string): boolean {
  try {
    const parts = storedValue.split(':');
    if (parts.length !== 2) {
      return false;
    }
    
    const [salt, originalHash] = parts;
    
    // Hashujemy podane hasło przy użyciu tej samej soli i parametrów
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    // Sprawdzamy czy wygenerowany hash zgadza się z oryginalnym
    return hash === originalHash;
  } catch (error) {
    // W przypadku błędu (np. niepoprawnego formatu w bazie) zwracamy false
    return false;
  }
}
