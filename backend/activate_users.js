const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.usuario.updateMany({
    data: {
      estado: 'ACTIVO'
    }
  });
  console.log('Todos los usuarios han sido marcados como ACTIVO');
}

main().catch(console.error).finally(() => prisma.$disconnect());
