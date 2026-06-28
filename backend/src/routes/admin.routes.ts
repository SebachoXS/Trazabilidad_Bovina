/**
 * @file backend/src/routes/admin.routes.ts
 * @description Rutas para el Módulo Administrativo: Propietarios, Predios y Usuarios.
 */

import { Router } from 'express';
import {
  createPropietario, getPropietarios, getPropietarioById, updatePropietario, deletePropietario,
  createPredio, getPredios, getPredioById, updatePredio, deletePredio, getPredioStats,
  createUsuario, getUsuarios, updateUsuario, toggleUsuarioStatus,
  getUsuariosPendientes, aprobarUsuario, rechazarUsuario, deleteUsuario
} from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { rbacMiddleware } from '../middlewares/rbac.middleware';

// ── PROPIETARIOS ───────────────────────────────────────────────────────────────
export const propietarioRouter = Router();
propietarioRouter.use(authMiddleware);
propietarioRouter.get('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO']), getPropietarios);
propietarioRouter.post('/', rbacMiddleware(['SUPER_ADMIN']), createPropietario);
propietarioRouter.get('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO']), getPropietarioById);
propietarioRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN']), updatePropietario);
propietarioRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN']), deletePropietario);

// ── PREDIOS ───────────────────────────────────────────────────────────────────
export const predioRouter = Router();
predioRouter.use(authMiddleware);
predioRouter.get('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getPredios);
predioRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), createPredio);
predioRouter.get('/:id', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getPredioById);
predioRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), updatePredio);
predioRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), deletePredio);
predioRouter.get('/:id/stats', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO']), getPredioStats);

// ── USUARIOS ──────────────────────────────────────────────────────────────────
export const usuarioRouter = Router();
usuarioRouter.use(authMiddleware);
// CRUD Usuarios
usuarioRouter.get('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), getUsuarios);
usuarioRouter.get('/pendientes', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), getUsuariosPendientes);
usuarioRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), createUsuario);
usuarioRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), updateUsuario);
usuarioRouter.patch('/:id/toggle', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), toggleUsuarioStatus);
usuarioRouter.patch('/:id/aprobar', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), aprobarUsuario);
usuarioRouter.patch('/:id/rechazar', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), rechazarUsuario);
usuarioRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), deleteUsuario);
