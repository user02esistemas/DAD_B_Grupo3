const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const buses = await prisma.bus.findMany();
  for (const b of buses) {
    if (b.imagenes) {
      console.log(`ID: ${b.id}, Placa: ${b.placa}, Imagenes: ${b.imagenes}`);
    }
  }
}
main().catch(console.error).finally(async () => { await prisma.$disconnect(); });
