/**
 * @file backend/src/config/database.ts
 * @description Singleton de PrismaClient. Es la ÚNICA instancia permitida en todo el proyecto.
 * CONSTITUTION §10.1: "Nunca generar código con queries SQL crudas. Siempre usar el cliente Prisma."
 */

import { PrismaClient } from '@prisma/client';

/** Instancia global de Prisma. Importar desde aquí en todos los repositorios. */
const prisma = new PrismaClient({
  log:
    process.env['NODE_ENV'] === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

export default prisma;
