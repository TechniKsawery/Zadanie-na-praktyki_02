// ==============================================================================
// PRISMA CLIENT SINGLETON
// ==============================================================================
// Ten plik zapewnia jedną, globalną instancję Prisma Client dla całego backendu,
// co zapobiega otwieraniu zbyt wielu połączeń do bazy danych PostgreSQL.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  // Można tu włączyć logowanie zapytań SQL w trybie developerskim do debugowania:
  // log: ['query', 'info', 'warn', 'error']
});

export default prisma;
