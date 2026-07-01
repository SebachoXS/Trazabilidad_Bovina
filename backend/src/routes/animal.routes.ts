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
  rechazarAltaAnimal,
  darDeBajaAnimal,
  retornarAnimal
} from '../controllers/animal.controller';
import { registrarDestete } from '../controllers/pesaje.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

const animalRouter = Router();

// Todas las rutas requieren autenticación
animalRouter.use(authMiddleware);

// GET /animales - Listar con filtros (Todos excepto ESTUDIANTE pueden ver full, ESTUDIANTE ve, pero RBAC general lo permite)
animalRouter.get('/', getAnimales);

// POST /animales - Crear (ADMIN, PROPIETARIO, VETERINARIO, OPERARIO)
animalRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO']), createAnimal);

// Hoja de Vida
animalRouter.get('/:id/hoja-de-vida', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getHojaDeVida);
animalRouter.get('/codigo/:codigoVisual/hoja-de-vida', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getHojaDeVidaByCodigo);

// Leer un animal por ID
animalRouter.get('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getAnimalById);

// Aprobaciones (ADMIN, PROPIETARIO)
animalRouter.patch('/:id/aprobar-alta', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), aprobarAltaAnimal);
animalRouter.patch('/:id/rechazar-alta', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), rechazarAltaAnimal);

// GET /animales/codigo/:codigoVisual
animalRouter.get('/codigo/:codigoVisual', getAnimalByCodigoVisual);


// POST /animales/:animalId/pesajes/destete
animalRouter.post('/:animalId/pesajes/destete', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO']), registrarDestete);


// PATCH /animales/:id - Actualizar (ADMIN, VETERINARIO)
animalRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO']), updateAnimal);

// DELETE /animales/:id - Eliminar (Soft delete/Hard Delete) (ADMIN, PROPIETARIO)
animalRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), deleteAnimal);

// PUT /animales/:id/baja - Dar de baja (Soft delete avanzado con motivo) (ADMIN, PROPIETARIO)
animalRouter.put('/:id/baja', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), darDeBajaAnimal);

// PATCH /animales/:id/retorno - Retornar de tránsito (ADMIN, PROPIETARIO)
animalRouter.patch('/:id/retorno', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), retornarAnimal);

export default animalRouter;
