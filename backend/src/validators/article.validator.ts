// ==============================================================================
// ARTICLE INPUT VALIDATORS
// ==============================================================================
// Definicja schematów walidacyjnych Zod dla zarządzania artykułami, komentarzami,
// oraz zmianami statusów (w tym planowaniem publikacji).

import { z } from 'zod';
import { ArticleStatus } from '../types';

// Schemat dla tworzenia nowego artykułu (domyślnie status IDEA)
export const createArticleSchema = z.object({
  title: z.string()
    .min(3, 'Tytuł musi mieć co najmniej 3 znaki.')
    .max(150, 'Tytuł nie może przekraczać 150 znaków.'),
  lead: z.string()
    .min(5, 'Lead (wstęp) musi mieć co najmniej 5 znaków.')
    .max(500, 'Lead nie może przekraczać 500 znaków.'),
  content: z.string()
    .min(10, 'Treść artykułu musi mieć co najmniej 10 znaków.'),
  category: z.string()
    .optional()
});

// Schemat dla edycji artykułu
export const updateArticleSchema = z.object({
  title: z.string()
    .min(3, 'Tytuł musi mieć co najmniej 3 znaki.')
    .max(150, 'Tytuł nie może przekraczać 150 znaków.')
    .optional(),
  lead: z.string()
    .min(5, 'Lead (wstęp) musi mieć co najmniej 5 znaków.')
    .max(500, 'Lead nie może przekraczać 500 znaków.')
    .optional(),
  content: z.string()
    .min(10, 'Treść artykułu musi mieć co najmniej 10 znaków.')
    .optional(),
  reviewerId: z.number()
    .nullable()
    .optional(), // Pozwala na przypisanie recenzenta przez edytora
  category: z.string()
    .optional(),
  metaTitle: z.string()
    .nullable()
    .optional(),
  metaDescription: z.string()
    .nullable()
    .optional(),
  metaImage: z.string()
    .nullable()
    .optional()
});

// Schemat dla zmiany statusu artykułu i opcjonalnego planowania publikacji
export const updateStatusSchema = z.object({
  status: z.nativeEnum(ArticleStatus, {
    errorMap: () => ({ message: 'Niepoprawny status artykułu.' })
  }),
  comment: z.string()
    .max(500, 'Komentarz do zmiany statusu nie może przekraczać 500 znaków.')
    .optional(),
  scheduledAt: z.string()
    .datetime({ message: 'Nieprawidłowy format daty i godziny planowanej publikacji.' })
    .nullable()
    .optional() // Używane gdy status zmienia się na SCHEDULED
});

// Schemat dla dodawania komentarzy
export const addCommentSchema = z.object({
  content: z.string()
    .min(2, 'Treść komentarza musi mieć co najmniej 2 znaki.')
    .max(1000, 'Komentarz nie może przekraczać 1000 znaków.')
});
