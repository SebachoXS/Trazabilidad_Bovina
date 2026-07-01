/**
 * @file backend/src/routes/movimiento.routes.ts
 * @description Rutas de Movimientos.
 */

import { Router } from 'express';
import { createMovimiento, createMovimientoBatch, getMovimientos, getMovimientoById } from '../controllers/movimiento.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

export const movimientoRouter = Router();

movimientoRouter.use(authMiddleware);

// GET /movimientos - Leer movimientos (ADMIN, VETERINARIO, OPERARIO, ESTUDIANTE, PROPIETARIO)
movimientoRouter.get('/', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE', 'PROPIETARIO']), getMovimientos);

// POST /movimientos/batch - Crear movimiento masivo (ADMIN, VETERINARIO, PROPIETARIO)
movimientoRouter.post('/batch', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'PROPIETARIO']), createMovimientoBatch);

// GET /movimientos/:id
movimientoRouter.get('/:id', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE', 'PROPIETARIO']), getMovimientoById);

// POST /movimientos - Crear movimiento (ADMIN, VETERINARIO, PROPIETARIO)
// Solo ADMIN y VET deberían autorizar movimientos sanitarios/externos.
movimientoRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'PROPIETARIO']), createMovimiento);
