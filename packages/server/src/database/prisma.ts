import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Conectar ao iniciar
prisma.$connect()
  .then(() => console.log('✅ Prisma conectado ao PostgreSQL'))
  .catch((err) => console.error('❌ Erro ao conectar Prisma:', err));

// Desconectar ao fechar
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});