/**
 * @file backend/src/routes/health.routes.ts
 * @description Rutas del Módulo Sanitario con middlewares de seguridad por verbo HTTP.
 * CONSTITUTION §10.1 Mandato 6: "Todo endpoint nuevo es privado por defecto."
 * authMiddleware se aplica en TODOS los métodos, sin excepción.
 *
 * Estructura de rutas (SPEC.md §4.1):
 *   GET    /animales/:animalId/eventos         → Todos los autenticados
 *   POST   /animales/:animalId/eventos         → ADMIN, VETERINARIO
 *   GET    /animales/:animalId/eventos/:id     → Todos los autenticados
 *   PATCH  /animales/:animalId/eventos/:id     → ADMIN, VETERINARIO
 *   DELETE /animales/:animalId/eventos/:id     → ADMIN
 *   GET    /eventos-sanitarios                 → ADMIN, VETERINARIO
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';
import {
  createEvento,
  getEventosByAnimal,
  getEventoById,
  updateEvento,
  deleteEvento,
  getAllEventos,
  createBatchEvento,
} from '../controllers/health.controller';

const healthRouter = Router();

// ─────────────────────────────────────────────
// RUTAS ANIDADAS BAJO /animales/:animalId/eventos
// ─────────────────────────────────────────────

/** GET /animales/:animalId/eventos — Todos los roles autenticados. */
healthRouter.get('/animales/:animalId/eventos', authMiddleware, getEventosByAnimal);

/** POST /animales/:animalId/eventos — ADMIN, VETERINARIO. Implementa RN-002. */
healthRouter.post(
  '/animales/:animalId/eventos',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'PROPIETARIO']),
  createEvento
);

/** GET /animales/:animalId/eventos/:id — Todos los roles. Anti-IDOR incluido. */
healthRouter.get('/animales/:animalId/eventos/:id', authMiddleware, getEventoById);

/** PATCH /animales/:animalId/eventos/:id — ADMIN, VETERINARIO. */
healthRouter.patch(
  '/animales/:animalId/eventos/:id',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']),
  updateEvento
);

/** DELETE /animales/:animalId/eventos/:id — Solo ADMIN. */
healthRouter.delete(
  '/animales/:animalId/eventos/:id',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN']),
  deleteEvento
);

// ─────────────────────────────────────────────
// RUTA GLOBAL DE BÚSQUEDA
// ─────────────────────────────────────────────

/** GET /eventos-sanitarios — ADMIN, VETERINARIO. */
healthRouter.get(
  '/eventos-sanitarios',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']),
  getAllEventos
);

/** POST /eventos/lote — ADMIN, VETERINARIO. */
healthRouter.post(
  '/eventos/lote',
  authMiddleware,
  rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'PROPIETARIO']),
  createBatchEvento
);

export default healthRouter;
