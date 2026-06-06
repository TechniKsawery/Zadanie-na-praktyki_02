// ==============================================================================
// VALIDATION MIDDLEWARE
// ==============================================================================
// Ten middleware automatycznie waliduje treść zapytania (req.body) przy użyciu
// biblioteki Zod. Zwraca błędy walidacji w zunifikowanym formacie JSON.

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Middleware walidujący req.body na podstawie schematu Zod.
 * Zwraca status 400 z tablicą błędów, jeśli dane są niepoprawne.
 */
export const validateBody = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Walidacja asynchroniczna
      await schema.parseAsync(req.body);
      return next();
    } catch (error: any) {
      // Jeśli Zod rzuci błąd walidacji, mapujemy go na przejrzysty format
      if (error.errors) {
        return res.status(400).json({
          success: false,
          message: 'Błąd walidacji danych wejściowych.',
          errors: error.errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowe dane wejściowe.',
        details: error.message
      });
    }
  };
};
