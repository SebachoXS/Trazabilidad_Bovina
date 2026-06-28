/**
 * @file backend/src/routes/animal.routes.ts
 * @description Rutas de Animales.
 */

import { Router } from 'express';
import {
  createAnimal,
  getAnimalById,
  getAnimalByCodigoVisual,
  getAnimales,
  updateAnimal,
  deleteAnimal,
  getHojaDeVida,
  getHojaDeVidaByCodigo,
  aprobarAltaAnimal,
  rechazarAltaAnimal
} from '../controllers/animal.controller';
import { registrarDestete } from '../controllers/pesaje.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const animalRouter = Router();

// Todas las rutas requieren autenticación
animalRouter.use(authMiddleware);

// GET /animales - Listar con filtros (Todos excepto ESTUDIANTE pueden ver full, ESTUDIANTE ve, pero RBAC general lo permite)
animalRouter.get('/', getAnimales);

// POST /animales - Crear (ADMIN, VETERINARIO, OPERARIO)
animalRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO']), createAnimal);

// Hoja de Vida
animalRouter.get('/:id/hoja-de-vida', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getHojaDeVida);
animalRouter.get('/codigo/:codigoVisual/hoja-de-vida', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getHojaDeVidaByCodigo);

// Leer un animal por ID
animalRouter.get('/:id', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getAnimalById);

// Aprobaciones (Solo ADMIN)
animalRouter.patch('/:id/aprobar-alta', rbacMiddleware(['SUPER_ADMIN']), aprobarAltaAnimal);
animalRouter.patch('/:id/rechazar-alta', rbacMiddleware(['SUPER_ADMIN']), rechazarAltaAnimal);

// GET /animales/codigo/:codigoVisual
animalRouter.get('/codigo/:codigoVisual', getAnimalByCodigoVisual);


// POST /animales/:animalId/pesajes/destete
animalRouter.post('/:animalId/pesajes/destete', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO']), registrarDestete);


// PATCH /animales/:id - Actualizar (ADMIN, VETERINARIO)
animalRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']), updateAnimal);

// DELETE /animales/:id - Eliminar (Soft delete) (ADMIN)
animalRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN']), deleteAnimal);

export default animalRouter;
