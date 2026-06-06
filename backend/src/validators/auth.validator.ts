// ==============================================================================
// AUTHENTICATION INPUT VALIDATORS
// ==============================================================================
// Definicja schematów walidacyjnych Zod dla rejestracji i logowania użytkowników.
// Zapewniają one, że dane przesyłane przez klientów mają prawidłowy format.

import { z } from 'zod';

// Schemat walidacji rejestracji
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Adres e-mail jest wymagany.')
    .email('Wprowadzono niepoprawny adres e-mail.'),
  password: z.string()
    .min(6, 'Hasło musi mieć co najmniej 6 znaków.'),
  name: z.string()
    .min(2, 'Imię lub nazwa użytkownika musi mieć co najmniej 2 znaki.')
    .max(50, 'Nazwa użytkownika nie może przekraczać 50 znaków.')
});

// Schemat walidacji logowania
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Adres e-mail jest wymagany.')
    .email('Wprowadzono niepoprawny adres e-mail.'),
  password: z.string()
    .min(1, 'Hasło jest wymagane.')
});
