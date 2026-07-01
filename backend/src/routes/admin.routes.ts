/**
 * @file backend/src/routes/admin.routes.ts
 * @description Rutas para el Módulo Administrativo: Propietarios, Predios y Usuarios.
 */

import { Router } from 'express';
import {
  createPropietario, getPropietarios, getPropietarioById, updatePropietario, deletePropietario,
  createPredio, getPredios, getPredioById, updatePredio, deletePredio, getPredioStats,
  getPrediosPendientes, aprobarPredio, rechazarPredio,
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
predioRouter.get('/disponibles', rbacMiddleware(['OPERARIO', 'CLIENTE', 'VETERINARIO']), async (req, res, next) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const fincas = await prisma.predio.findMany({
      where: { estado: 'ACTIVO', deletedAt: null },
      select: { id: true, nombre: true, propietario: { select: { usuarios: { select: { nombre: true }, take: 1 } } } }
    });
    res.json({ success: true, data: fincas.map((f: any) => ({ id: f.id, nombre: f.nombre, propietario: f.propietario?.usuarios?.[0]?.nombre || 'Desconocido' })) });
  } catch (err) { next(err); }
});
predioRouter.get('/pendientes', rbacMiddleware(['SUPER_ADMIN']), getPrediosPendientes);
predioRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), createPredio);
predioRouter.patch('/:id/aprobar', rbacMiddleware(['SUPER_ADMIN']), aprobarPredio);
predioRouter.patch('/:id/rechazar', rbacMiddleware(['SUPER_ADMIN']), rechazarPredio);
predioRouter.get('/:id', rbacMiddleware(['SUPER_ADMIN', 'VETERINARIO', 'OPERARIO', 'CLIENTE']), getPredioById);
predioRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), updatePredio);
predioRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), deletePredio);
predioRouter.get('/:id/stats', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO']), getPredioStats);

// ── USUARIOS ──────────────────────────────────────────────────────────────────
export const usuarioRouter = Router();
usuarioRouter.use(authMiddleware);
// Acciones de TRABAJADOR / CLIENTE
usuarioRouter.post('/solicitar-finca', rbacMiddleware(['OPERARIO', 'CLIENTE']), async (req, res, next) => {
  try {
    const { predioId } = req.body;
    if (!predioId) throw new Error('predioId es requerido');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.usuario.update({
      where: { id: req.user.sub },
      data: { fincaSolicitadaId: parseInt(predioId, 10), estado: 'PENDIENTE' }
    });
    res.json({ success: true, message: 'Solicitud enviada' });
  } catch (err) { next(err); }
});

// CRUD Usuarios
usuarioRouter.get('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), getUsuarios);
usuarioRouter.get('/pendientes', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), getUsuariosPendientes);
usuarioRouter.post('/', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), createUsuario);
usuarioRouter.patch('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), updateUsuario);
usuarioRouter.patch('/:id/toggle', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), toggleUsuarioStatus);
usuarioRouter.patch('/:id/aprobar', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), aprobarUsuario);
usuarioRouter.patch('/:id/rechazar', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), rechazarUsuario);
usuarioRouter.delete('/:id', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), deleteUsuario);

// ── Solicitudes de Acceso (Multicliente para VETERINARIO) ──
import { crearSolicitudAcceso, getSolicitudesAcceso, aprobarSolicitudAcceso, rechazarSolicitudAcceso } from '../controllers/admin.controller';
usuarioRouter.post('/solicitudes-acceso', rbacMiddleware(['VETERINARIO']), crearSolicitudAcceso);
usuarioRouter.get('/solicitudes-acceso', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO']), getSolicitudesAcceso);
usuarioRouter.patch('/solicitudes-acceso/:id/aprobar', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), aprobarSolicitudAcceso);
usuarioRouter.patch('/solicitudes-acceso/:id/rechazar', rbacMiddleware(['SUPER_ADMIN', 'PROPIETARIO']), rechazarSolicitudAcceso);
