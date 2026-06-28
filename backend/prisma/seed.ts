import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de datos (esto borrará datos anteriores)...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  // Limpiar BD (el orden importa por las llaves foráneas)
  await prisma.auditLog.deleteMany();
  await prisma.eventoSanitario.deleteMany();
  await prisma.eventoReproductivo.deleteMany();
  await prisma.pesaje.deleteMany();
  await prisma.movimiento.deleteMany();
  await prisma.historialEtapa.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.sesionUsuario.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.secuenciaPredio.deleteMany();
  await prisma.predio.deleteMany();
  await prisma.propietario.deleteMany();

  console.log('Creando Propietarios...');
  const prop1 = await prisma.propietario.create({
    data: { nombre: 'Hacienda Martinez', documento: 'HM-001', email: 'martinez@example.com' }
  });
  const prop2 = await prisma.propietario.create({
    data: { nombre: 'Grupo suquilanda', documento: 'GS-002', email: 'suquilanda@example.com' }
  });

  console.log('Creando Predios...');
  const prediosMartinez = await Promise.all([
    prisma.predio.create({ data: { nombre: 'Predio Norte', codigo: 'M-NOR', municipio: 'Cuenca', departamento: 'Azuay', area: 50, propietarioId: prop1.id } }),
    prisma.predio.create({ data: { nombre: 'Predio Sur', codigo: 'M-SUR', municipio: 'Cuenca', departamento: 'Azuay', area: 40, propietarioId: prop1.id } }),
  ]);
  
  const prediosSuquilanda = await Promise.all([
    prisma.predio.create({ data: { nombre: 'Finca Principal', codigo: 'S-PRI', municipio: 'Loja', departamento: 'Loja', area: 100, propietarioId: prop2.id } }),
  ]);

  console.log('Creando Usuarios (SUPER_ADMIN, PROPIETARIO, VETERINARIOS, OPERARIOS)...');
  
  // SUPER_ADMIN
  await prisma.usuario.create({
    data: { nombre: 'Administrador Global', email: 'admin@trazabilidad.com', passwordHash, rol: 'SUPER_ADMIN', activo: true }
  });

  // PROPIETARIOS
  await prisma.usuario.create({
    data: { nombre: 'Dueño Martinez', email: 'martinez@example.com', passwordHash, rol: 'PROPIETARIO', activo: true, propietarioId: prop1.id }
  });
  await prisma.usuario.create({
    data: { nombre: 'Dueño Suquilanda', email: 'suquilanda@example.com', passwordHash, rol: 'PROPIETARIO', activo: true, propietarioId: prop2.id }
  });

  // OPERARIOS Y VETERINARIOS
  const vetLlauca = await prisma.usuario.create({
    data: { 
      nombre: 'Edwin Llauca', 
      email: 'edwin.llauca@example.com', 
      passwordHash, 
      rol: 'VETERINARIO', 
      activo: true, 
      prediosAsignados: { connect: [{ id: prediosMartinez[0].id }, { id: prediosSuquilanda[0].id }] } 
    }
  });

  await prisma.usuario.create({
    data: { 
      nombre: 'Operario Martinez', 
      email: 'op.martinez@example.com', 
      passwordHash, 
      rol: 'OPERARIO', 
      activo: true,
      prediosAsignados: { connect: [{ id: prediosMartinez[0].id }, { id: prediosMartinez[1].id }] }
    }
  });

  // CLIENTE (ESTUDIANTE/LECTOR)
  await prisma.usuario.create({
    data: { 
      nombre: 'Estudiante Invitado', 
      email: 'estudiante@example.com', 
      passwordHash, 
      rol: 'CLIENTE', 
      activo: true,
      prediosAsignados: { connect: [{ id: prediosMartinez[0].id }] }
    }
  });

  console.log('Creando Animales...');
  let animalCounter = 1;

  const createAnimals = async (predioId: number, count: number) => {
    const etapas = ['CRIA', 'RECRIA', 'PRODUCCION', 'ENGORDE'];
    
    for (let i = 0; i < count; i++) {
      const codigoVisual = animalCounter.toString().padStart(10, '0');
      
      await prisma.animal.create({
         data: {
           codigoVisual,
           cusa: `CUSA-${predioId}-${codigoVisual}`,
           nombre: `Bovino ${animalCounter}`,
           raza: 'CHAROLAIS',
           sexo: 'HEMBRA',
           fechaNacimiento: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 365 * 3), // Hasta 3 años atrás
           pesoNacimiento: 35 + Math.random() * 10,
           estado: 'ACTIVO',
           etapaActual: etapas[i % etapas.length],
           predioId
         }
      });
      animalCounter++;
    }
  };

  await createAnimals(prediosMartinez[0].id, 10);
  await createAnimals(prediosSuquilanda[0].id, 5);

  console.log('Seed completado exitosamente.');
  console.log('Todos los usuarios comparten la contraseña: password123');
}

main()
  .catch(e => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
