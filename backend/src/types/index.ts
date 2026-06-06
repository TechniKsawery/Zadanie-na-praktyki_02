// ==============================================================================
// BACKEND TYPES & INTERFACES
// ==============================================================================
// Ten plik definiuje typy danych używane globalnie w aplikacji backendowej,
// w tym rozszerza domyślny interfejs Request biblioteki Express oraz
// definiuje enumy roli i statusów (wymagane ze względu na brak natywnego wsparcia
// dla enumów w bazie SQLite w Prisma).

// Definicja ról użytkowników
export enum Role {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  AUTHOR = 'AUTHOR',
  REVIEWER = 'REVIEWER'
}

// Definicja statusów artykułów
export enum ArticleStatus {
  IDEA = 'IDEA',
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED'
}

// Struktura danych użytkownika zaszyta w tokenie JWT
export interface UserPayload {
  id: number;
  email: string;
  role: Role;
  name: string;
}

// Rozszerzenie globalnego interfejsu Express Request o pole 'user'.
// Dzięki temu w kontrolerach i middleware możemy bezpiecznie pisać `req.user.id`
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}
