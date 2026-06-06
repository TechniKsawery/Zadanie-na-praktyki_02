// ==============================================================================
// PRISMA SEED SCRIPT - SYSTEM AUTOMATYZACJI REDAKCJI
// ==============================================================================
// Ten skrypt resetuje bazę danych i zasila ją początkowymi użytkownikami o różnych
// rolach oraz zestawem przykładowych artykułów, komentarzy i logów.
// Hasło dla wszystkich kont to: "password123"

import { PrismaClient } from '@prisma/client';
import { Role, ArticleStatus } from '../src/types/index';
import { hashPassword } from '../src/services/crypto.service';

const prisma = new PrismaClient();

async function main() {
  console.log('Rozpoczynanie zasiedlania bazy danych (Seeding)...');
  
  // Czyszczenie starych danych z zachowaniem kolejności kluczy obcych
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.upload.deleteMany({});
  await prisma.articleHistory.deleteMany({});
  await prisma.articleComment.deleteMany({});
  await prisma.article.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Stare dane wyczyszczone.');

  // Haszowanie wspólnego hasła testowego za pomocą nowej metody PBKDF2
  const passwordHash = hashPassword('password123');

  // 1. Tworzenie użytkowników dla każdej roli
  const admin = await prisma.user.create({
    data: {
      email: 'admin@wmedia.pl',
      passwordHash,
      name: 'Tomasz Admin',
      role: Role.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      email: 'editor@wmedia.pl',
      passwordHash,
      name: 'Karol Redaktor',
      role: Role.EDITOR,
    },
  });

  const reviewer = await prisma.user.create({
    data: {
      email: 'reviewer@wmedia.pl',
      passwordHash,
      name: 'Marta Recenzent',
      role: Role.REVIEWER,
    },
  });

  const author = await prisma.user.create({
    data: {
      email: 'author@wmedia.pl',
      passwordHash,
      name: 'Janusz Autor',
      role: Role.AUTHOR,
    },
  });

  console.log('Utworzono użytkowników testowych:');
  console.log(`- Admin: ${admin.email}`);
  console.log(`- Editor: ${editor.email}`);
  console.log(`- Reviewer: ${reviewer.email}`);
  console.log(`- Author: ${author.email}`);

  // 2. Tworzenie przykładowych artykułów w różnych statusach
  
  // Artykuł jako Pomysł (IDEA)
  await prisma.article.create({
    data: {
      title: 'Nowe trendy w projektowaniu interfejsów w 2026 roku',
      lead: 'Sztuczna inteligencja, mikrointerakcje i powrót do skeumorfizmu. Przeczytaj jak zmieni się UX.',
      content: `# Trendy UX 2026\n\nProjektowanie interfejsów staje się bardziej zindywidualizowane...\n\n- Indywidualne schematy kolorów\n- Generatywne komponenty UI\n- Minimalizm w nowym wydaniu`,
      status: ArticleStatus.IDEA,
      authorId: author.id,
    },
  });

  // Artykuł jako Szkic (DRAFT)
  await prisma.article.create({
    data: {
      title: 'Monorepo w 2026: Porównanie npm, pnpm i Turborepo',
      lead: 'Zarządzanie wieloma pakietami w jednym repozytorium stało się standardem branżowym. Które narzędzie wybrać?',
      content: `# Monorepo w 2026\n\nW tym artykule przyjrzymy się zaletom i wadom poszczególnych menedżerów pakietów...`,
      status: ArticleStatus.DRAFT,
      authorId: author.id,
    },
  });

  // Artykuł w recenzji (REVIEW)
  const articleReview = await prisma.article.create({
    data: {
      title: 'Node.js 24: Co nowego dla programistów?',
      lead: 'Wersja 24 Node.js przynosi duże zmiany w natywnym wsparciu TypeScript oraz optymalizacjach wydajnościowych.',
      content: `# Node.js 24\n\nPrzyjrzymy się najciekawszym zmianom w najnowszej wersji Node.js...\n\nNatywne kompilowanie plików TS bezpośrednio w V8 to milowy krok.`,
      status: ArticleStatus.REVIEW,
      authorId: author.id,
      reviewerId: reviewer.id,
    },
  });

  // Artykuł zaakceptowany (APPROVED)
  const articleApproved = await prisma.article.create({
    data: {
      title: 'Jak wdrożyć bezpieczne uwierzytelnianie JWT?',
      lead: 'Bezpieczeństwo sesji użytkownika to podstawa. Zobacz jak poprawnie skonfigurować JWT na backendzie.',
      content: `# Bezpieczne JWT\n\nStandard JWT jest bardzo popularny, ale łatwo o błędy implementacyjne...\n\nZawsze używaj bezpiecznych algorytmów podpisu (np. RS256 lub silnego HS256) oraz przesyłaj tokeny w ciasteczkach HttpOnly.`,
      status: ArticleStatus.APPROVED,
      authorId: author.id,
      reviewerId: reviewer.id,
    },
  });

  // Artykuł zaplanowany do publikacji (SCHEDULED)
  // Planujemy go na 1 minutę w przyszłość w celu ułatwienia testów workera w tle!
  const futureDate = new Date();
  futureDate.setMinutes(futureDate.getMinutes() + 1); // 1 minuta od teraz
  
  await prisma.article.create({
    data: {
      title: 'Szybkie wprowadzenie do Docker Compose',
      lead: 'Docker Compose pozwala na definiowanie i uruchamianie wielokontenerowych aplikacji Docker. Oto jak zacząć.',
      content: `# Wprowadzenie do Docker Compose\n\nDocker Compose ułatwia lokalną pracę deweloperską...\n\nWystarczy jeden plik \`docker-compose.yml\` i komenda \`docker-compose up\`.`,
      status: ArticleStatus.SCHEDULED,
      authorId: author.id,
      reviewerId: reviewer.id,
      scheduledAt: futureDate,
    },
  });

  // Artykuł opublikowany (PUBLISHED)
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - 24); // 24 godziny temu
  
  await prisma.article.create({
    data: {
      title: 'Wstęp do TypeScript 5.x',
      lead: 'Podstawowe pojęcia, silne typowanie i dlaczego warto porzucić czysty JavaScript.',
      content: `# Wstęp do TypeScript\n\nTypeScript to nadzbiór JavaScriptu dodający statyczne typowanie. Zapewnia on wyłapywanie błędów na etapie kompilacji, a nie uruchamiania.`,
      status: ArticleStatus.PUBLISHED,
      authorId: author.id,
      reviewerId: reviewer.id,
      publishedAt: pastDate,
    },
  });

  console.log('Utworzono przykładowe artykuły.');

  // 3. Tworzenie komentarzy
  await prisma.articleComment.create({
    data: {
      articleId: articleReview.id,
      userId: reviewer.id,
      content: 'Dobry tekst, ale popraw sekcję o natywnym uruchamianiu TS. Dodaj informację o flagach eksperymentalnych.',
    },
  });

  await prisma.articleComment.create({
    data: {
      articleId: articleReview.id,
      userId: author.id,
      content: 'Dzięki! Zaktualizowałem treść i dodałem wyjaśnienie flagi --experimental-strip-types.',
    },
  });

  console.log('Utworzono komentarze.');

  // 4. Tworzenie wpisów historii zmian
  await prisma.articleHistory.create({
    data: {
      articleId: articleReview.id,
      userId: author.id,
      oldStatus: ArticleStatus.DRAFT,
      newStatus: ArticleStatus.REVIEW,
      comment: 'Skończyłem pisać, przesyłam do pierwszej recenzji.',
    },
  });

  await prisma.articleHistory.create({
    data: {
      articleId: articleApproved.id,
      userId: reviewer.id,
      oldStatus: ArticleStatus.REVIEW,
      newStatus: ArticleStatus.APPROVED,
      comment: 'Tekst merytorycznie poprawny, poprawiłem literówki. Akceptuję do publikacji.',
    },
  });

  // 5. Tworzenie powiadomień
  await prisma.notification.create({
    data: {
      userId: author.id,
      title: 'Zgłoszenie do recenzji',
      message: `Twój artykuł "${articleReview.title}" otrzymał komentarz od recenzenta.`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: author.id,
      title: 'Artykuł zatwierdzony',
      message: `Twój artykuł "${articleApproved.title}" został pomyślnie zaakceptowany!`,
    },
  });

  // 6. Tworzenie logów aktywności
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_SEED',
      details: 'Pomyślnie zainicjalizowano bazę danych (skrypt seed).',
    },
  });

  console.log('Seeding bazy danych zakończony sukcesem!');
}

main()
  .catch((e) => {
    console.error('Błąd podczas seedingu bazy danych:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
