/**
 * @file backend/src/routes/pesaje.routes.ts
 * @description Rutas de Pesajes.
 */

import { Router } from 'express';
import { createPesaje, getPesajes, deletePesaje } from '../controllers/pesaje.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

export const pesajeRouter = Router();

pesajeRouter.use(authMiddleware);

// GET /pesajes - Leer pesajes (ADMIN, VETERINARIO, OPERARIO, ESTUDIANTE)
pesajeRouter.get('/', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getPesajes);

// POST /pesajes - Crear pesajes (ADMIN, VETERINARIO, OPERARIO)
pesajeRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO']), createPesaje);

// DELETE /pesajes/:id - Eliminar pesaje (ADMIN)
pesajeRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN']), deletePesaje);
