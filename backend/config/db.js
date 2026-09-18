const { PrismaClient } = require('@prisma/client');

// Prisma keeps its own connection pool. Tune it with ?connection_limit=N in DATABASE_URL.
const prisma = new PrismaClient();

module.exports = prisma;
