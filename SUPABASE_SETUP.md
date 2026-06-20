# ☁️ Instrukcja podłączenia chmury Supabase (PostgreSQL)

Ten dokument służy jako "kopia zapasowa" wiedzy technicznej na wypadek, gdybyś chciał przełączyć projekt z lokalnej bazy SQLite z powrotem na produkcyjną bazę danych w chmurze **Supabase**.

> [!WARNING]
> Ze względów bezpieczeństwa (ochrona przed botami skanującymi repozytoria) **nie umieszczaj w tym pliku ani w kodzie źródłowym swoich rzeczywistych haseł i kluczy**. Poniżej znajdziesz instrukcję krok po kroku, skąd je pobrać i jak je skonfigurować w 3 minuty.

---

## Krok 1: Pobranie danych połączenia z Supabase

1. Zaloguj się na swoje konto [Supabase](https://supabase.com/).
2. Wejdź do swojego projektu (np. `zqjmuujvnppnryuiasct` lub powiązany z Wmedia).
3. W lewym dolnym rogu kliknij ikonę zębatki (**Project Settings**), a następnie wybierz zakładkę **Database**.
4. Przewiń w dół do sekcji **Connection string** i wybierz zakładkę **URI**:
   - Skopiuj link zaczynający się od `postgresql://...` i wklej go do pliku `.env` jako `DATABASE_URL` oraz `DIRECT_URL`.
   - *Uwaga:* Pamiętaj, aby w linku zastąpić placeholder `[YOUR-PASSWORD]` rzeczywistym hasłem do bazy.

### 🔑 Co jeśli nie pamiętasz hasła do bazy danych?
Jeśli nie pamiętasz hasła, które ustawiłeś podczas tworzenia projektu w Supabase:
1. W zakładce **Project Settings -> Database** znajdź przycisk **Reset database password** (na samej górze sekcji hasła).
2. Wpisz nowe hasło i zatwierdź.
3. Twoje stare dane zostaną zabezpieczone nowym hasłem. Zaktualizuj skopiowane linki połączenia o to nowe hasło.

---

## Krok 2: Pobranie kluczy API i JWT Secret

W zakładce **Project Settings -> API**:
1. **JWT Secret:** Znajdziesz go w sekcji *JWT Settings*. Skopiuj wartość pola *JWT Secret* i wklej do pliku `.env` pod `JWT_SECRET`.
2. **Klucze anonimowe:** W sekcji *API Keys* skopiuj klucz oznaczony jako `anon public` i wklej do `.env` jako `SUPABASE_ANON_KEY`.
3. **Klucze serwisowe (Service Role):** Skopiuj klucz oznaczony jako `service_role` i wklej do `.env` jako `SUPABASE_SERVICE_ROLE`.

---

## Krok 3: Konfiguracja lokalnego pliku `.env`

Twój docelowy plik `.env` (w katalogu głównym oraz w `backend/`) przy podłączeniu Supabase powinien wyglądać następująco:

```env
PORT=5000
DATABASE_URL="postgresql://postgres.[ID_PROJEKTU]:[TWOJE_HASLO]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.[ID_PROJEKTU]:[TWOJE_HASLO]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
JWT_SECRET="[TWÓJ_JWT_SECRET_Z_SUPABASE]"

# Konfiguracja Supabase (opcjonalne/metadane)
SUPABASE_URL="https://[ID_PROJEKTU].supabase.co"
SUPABASE_ANON_KEY="[TWÓJ_ANON_KEY]"
SUPABASE_SERVICE_ROLE="[TWÓJ_SERVICE_ROLE_KEY]"

# Adresy lokalne
CLIENT_URL="http://localhost:5173"
VITE_API_URL="http://localhost:5000"
UPLOAD_STORAGE_TYPE="local"
```

---

## Krok 4: Przełączenie Prisma na PostgreSQL

1. Otwórz plik [schema.prisma](file:///c:/Users/KsaweryBloch/Wmedia-Zadanie-na-praktyki_02/backend/prisma/schema.prisma).
2. Zastąp konfigurację `datasource db` poniższą:
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
3. Zbuduj klienta Prisma i wgraj tabele do nowej bazy Supabase poleceniem:
   ```bash
   npx prisma db push --schema=backend/prisma/schema.prisma
   ```
4. Zasil bazę danymi testowymi (seeding):
   ```bash
   npm run prisma:seed --workspace=backend
   ```
