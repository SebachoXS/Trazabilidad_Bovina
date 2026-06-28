/**
 * @file backend/src/routes/reproduccion.routes.ts
 * @description Rutas de Reproducción.
 */

import { Router } from 'express';
import { createEventoReproductivo, registrarParto, getEventosByAnimal } from '../controllers/reproduccion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

export const reproduccionRouter = Router();

reproduccionRouter.use(authMiddleware);

// GET /reproduccion/:animalId - Leer eventos (ADMIN, VETERINARIO, OPERARIO, ESTUDIANTE)
reproduccionRouter.get('/:animalId', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getEventosByAnimal);

// POST /reproduccion/:animalId/parto - Registrar Parto Atómico (ADMIN, VETERINARIO)
reproduccionRouter.post('/:animalId/parto', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']), registrarParto);

// POST /reproduccion/:animalId - Registrar otro evento reproductivo (ADMIN, VETERINARIO)
reproduccionRouter.post('/:animalId', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']), createEventoReproductivo);
