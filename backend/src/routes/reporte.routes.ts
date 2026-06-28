/**
 * @file backend/src/routes/reporte.routes.ts
 * @description Rutas de Reportes.
 */

import { Router } from 'express';
import { getInventario, getSanitario, getAnimalesEnRetiro } from '../controllers/reporte.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

export const reporteRouter = Router();

reporteRouter.use(authMiddleware);

// Reporte de Inventario (ADMIN, VETERINARIO)
reporteRouter.get('/inventario', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']), getInventario);

// Reporte Sanitario (ADMIN, VETERINARIO)
reporteRouter.get('/sanitario', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']), getSanitario);

// Reporte de Animales en Retiro (Todos los roles, vital para el campo)
reporteRouter.get('/animales-en-retiro', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getAnimalesEnRetiro);
