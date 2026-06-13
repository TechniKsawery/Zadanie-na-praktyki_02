-- ==============================================================================
-- WMEDIA EDITORIAL SYSTEM - COMPLETE DATABASE DUMP (SQL SETUP)
-- ==============================================================================
-- Ten plik zawiera kompletny schemat DDL bazy danych, włączenie mechanizmów
-- Row Level Security (RLS) oraz dane początkowe (seed) do odtworzenia projektu.
--
-- Domyślne hasło dla wszystkich użytkowników testowych to: password123
-- ==============================================================================

-- Czyszczenie istniejących tabel (jeśli istnieją)
DROP TABLE IF EXISTS "ActivityLog" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Upload" CASCADE;
DROP TABLE IF EXISTS "ArticleHistory" CASCADE;
DROP TABLE IF EXISTS "ArticleComment" CASCADE;
DROP TABLE IF EXISTS "Article" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ==============================================================================
-- 1. SCHEMAT TABEL (DDL)
-- ==============================================================================

-- Tabela użytkowników
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'AUTHOR',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabela artykułów
CREATE TABLE "Article" (
    "id" SERIAL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "lead" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IDEA',
    "authorId" INTEGER NOT NULL,
    "reviewerId" INTEGER,
    "scheduledAt" TIMESTAMP WITH TIME ZONE,
    "publishedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Article_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Tabela komentarzy
CREATE TABLE "ArticleComment" (
    "id" SERIAL PRIMARY KEY,
    "articleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela historii statusów artykułów
CREATE TABLE "ArticleHistory" (
    "id" SERIAL PRIMARY KEY,
    "articleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    CONSTRAINT "ArticleHistory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ArticleHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela powiadomień
CREATE TABLE "Notification" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela wgranych plików / ilustracji prasowych
CREATE TABLE "Upload" (
    "id" SERIAL PRIMARY KEY,
    "articleId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "filepath" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabela logów systemowych
CREATE TABLE "ActivityLog" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS "Article_authorId_idx" ON "Article"("authorId");
CREATE INDEX IF NOT EXISTS "Article_reviewerId_idx" ON "Article"("reviewerId");
CREATE INDEX IF NOT EXISTS "ArticleComment_articleId_idx" ON "ArticleComment"("articleId");
CREATE INDEX IF NOT EXISTS "ArticleHistory_articleId_idx" ON "ArticleHistory"("articleId");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Upload_articleId_idx" ON "Upload"("articleId");

-- ==============================================================================
-- 2. ROW LEVEL SECURITY (RLS) - BEZPIECZEŃSTWO SUPABASE
-- ==============================================================================
-- Włączenie RLS na wszystkich tabelach w celu ochrony przed bezpośrednim
-- dostępem przez anonimowe klucze klienta. Node.js (Prisma) łączy się jako admin,
-- dzięki czemu RLS nie blokuje zapytań z serwera.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Article" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArticleComment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArticleHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Upload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. DANE POCZĄTKOWE (SEED DATA)
-- ==============================================================================

-- 3.1. Użytkownicy testowi (Hasło: password123)
INSERT INTO "User" ("id", "email", "passwordHash", "name", "role") VALUES
(1, 'admin@wmedia.pl', 'a1b2c3d4e5f67890a1b2c3d4e5f67890:6c024003fab6862fec0134368ffa25e4c98806dc1c31208de7b3a0798283488139b56a64298f2b522d9192f0ebd0661bd9133a6ac6e06307ae4e1c5154c0d453', 'Tomasz Admin', 'ADMIN'),
(2, 'editor@wmedia.pl', 'a1b2c3d4e5f67890a1b2c3d4e5f67890:6c024003fab6862fec0134368ffa25e4c98806dc1c31208de7b3a0798283488139b56a64298f2b522d9192f0ebd0661bd9133a6ac6e06307ae4e1c5154c0d453', 'Karol Redaktor', 'EDITOR'),
(3, 'reviewer@wmedia.pl', 'a1b2c3d4e5f67890a1b2c3d4e5f67890:6c024003fab6862fec0134368ffa25e4c98806dc1c31208de7b3a0798283488139b56a64298f2b522d9192f0ebd0661bd9133a6ac6e06307ae4e1c5154c0d453', 'Marta Recenzent', 'REVIEWER'),
(4, 'author@wmedia.pl', 'a1b2c3d4e5f67890a1b2c3d4e5f67890:6c024003fab6862fec0134368ffa25e4c98806dc1c31208de7b3a0798283488139b56a64298f2b522d9192f0ebd0661bd9133a6ac6e06307ae4e1c5154c0d453', 'Janusz Autor', 'AUTHOR');

-- Ustawienie sekwencji klucza głównego dla tabeli User
SELECT setval('public."User_id_seq"', 4, true);

-- 3.2. Artykuły (Różne statusy)
INSERT INTO "Article" ("id", "title", "lead", "content", "status", "authorId", "reviewerId", "scheduledAt", "publishedAt") VALUES
(1, 'Nowe trendy w projektowaniu interfejsów w 2026 roku', 'Sztuczna inteligencja, mikrointerakcje i powrót do skeumorfizmu. Przeczytaj jak zmieni się UX.', '# Trendy UX 2026\n\nProjektowanie interfejsów staje się bardziej zindywidualizowane...\n\n- Indywidualne schematy kolorów\n- Generatywne komponenty UI\n- Minimalizm w nowym wydaniu', 'IDEA', 4, NULL, NULL, NULL),
(2, 'Monorepo w 2026: Porównanie npm, pnpm i Turborepo', 'Zarządzanie wieloma pakietami w jednym repozytorium stało się standardem branżowym. Które narzędzie wybrać?', '# Monorepo w 2026\n\nW tym artykule przyjrzymy się zaletom i wadom poszczególnych menedżerów pakietów...', 'DRAFT', 4, NULL, NULL, NULL),
(3, 'Node.js 24: Co nowego dla programistów?', 'Wersja 24 Node.js przynosi duże zmiany w natywnym wsparciu TypeScript oraz optymalizacjach wydajnościowych.', '# Node.js 24\n\nPrzyjrzymy się najciekawszym zmianom w najnowszej wersji Node.js...\n\nNatywne kompilowanie plików TS bezpośrednio w V8 to milowy krok.', 'REVIEW', 4, 3, NULL, NULL),
(4, 'Jak wdrożyć bezpieczne uwierzytelnianie JWT?', 'Bezpieczeństwo sesji użytkownika to podstawa. Zobacz jak poprawnie skonfigurować JWT na backendzie.', '# Bezpieczne JWT\n\nStandard JWT jest bardzo popularny, ale łatwo o błędy implementacyjne...\n\nZawsze używaj bezpiecznych algorytmów podpisu (np. RS256 lub silnego HS256) oraz przesyłaj tokeny w ciasteczkach HttpOnly.', 'APPROVED', 4, 3, NULL, NULL),
(5, 'Szybkie wprowadzenie do Docker Compose', 'Docker Compose pozwala na definiowanie i uruchamianie wielokontenerowych aplikacji Docker. Oto jak zacząć.', '# Wprowadzenie do Docker Compose\n\nDocker Compose ułatwia lokalną pracę deweloperską...\n\nWystarczy jeden plik `docker-compose.yml` i komenda `docker-compose up`.', 'SCHEDULED', 4, 3, CURRENT_TIMESTAMP + INTERVAL '1 hour', NULL),
(6, 'Wstęp do TypeScript 5.x', 'Podstawowe pojęcia, silne typowanie i dlaczego warto porzucić czysty JavaScript.', '# Wstęp do TypeScript\n\nTypeScript to nadzbiór JavaScriptu dodający statyczne typowanie. Zapewnia on wyłapywanie błędów na etapie kompilacji, a nie uruchamiania.', 'PUBLISHED', 4, 3, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Ustawienie sekwencji klucza głównego dla tabeli Article
SELECT setval('public."Article_id_seq"', 6, true);

-- 3.3. Komentarze redakcyjne
INSERT INTO "ArticleComment" ("id", "articleId", "userId", "content") VALUES
(1, 3, 3, 'Dobry tekst, ale popraw sekcję o natywnym uruchamianiu TS. Dodaj informację o flagach eksperymentalnych.'),
(2, 3, 4, 'Dzięki! Zaktualizowałem treść i dodałem wyjaśnienie flagi --experimental-strip-types.');

SELECT setval('public."ArticleComment_id_seq"', 2, true);

-- 3.4. Historia zmian statusów (Audit log)
INSERT INTO "ArticleHistory" ("id", "articleId", "userId", "oldStatus", "newStatus", "comment") VALUES
(1, 3, 4, 'DRAFT', 'REVIEW', 'Skończyłem pisać, przesyłam do pierwszej recenzji.'),
(2, 4, 3, 'REVIEW', 'APPROVED', 'Tekst merytorycznie poprawny, poprawiłem literówki. Akceptuję do publikacji.');

SELECT setval('public."ArticleHistory_id_seq"', 2, true);

-- 3.5. Powiadomienia użytkowników
INSERT INTO "Notification" ("id", "userId", "title", "message", "isRead") VALUES
(1, 4, 'Zgłoszenie do recenzji', 'Twój artykuł "Node.js 24: Co nowego dla programistów?" otrzymał komentarz od recenzenta.', false),
(2, 4, 'Artykuł zatwierdzony', 'Twój artykuł "Jak wdrożyć bezpieczne uwierzytelnianie JWT?" został pomyślnie zaakceptowany!', false);

SELECT setval('public."Notification_id_seq"', 2, true);

-- 3.6. Logi aktywności systemowej
INSERT INTO "ActivityLog" ("id", "userId", "action", "details") VALUES
(1, 1, 'SYSTEM_SEED', 'Pomyślnie zainicjalizowano bazę danych (skrypt seed).');

SELECT setval('public."ActivityLog_id_seq"', 1, true);
