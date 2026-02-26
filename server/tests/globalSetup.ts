import prisma from '../src/config/database';

// Отключаем Prisma после ВСЕХ тестов
export async function teardown() {
  await prisma.$disconnect();
}
