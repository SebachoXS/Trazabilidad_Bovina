/**
 * @file backend/src/controllers/admin.controller.ts
 * @description Controladores para Propietarios, Predios y Usuarios.
 */

import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import prisma from '../config/database';
import { 
  propietarioCreateSchema, propietarioUpdateSchema,
  predioCreateSchema, predioUpdateSchema, predioRechazarSchema,
  createUsuarioSchema, usuarioUpdateSchema, usuarioToggleSchema
} from '../validators/admin.validator';
import { ValidationError } from '../types/errors';

// ── PROPIETARIOS ───────────────────────────────────────────────────────────────

export const createPropietario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = propietarioCreateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    const data = await adminService.createPropietario(result.data);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getPropietarios = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.getAllPropietarios();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getPropietarioById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const data = await adminService.getPropietarioById(id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const updatePropietario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const result = propietarioUpdateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    const data = await adminService.updatePropietario(id, result.data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const deletePropietario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.deletePropietario(id);
    res.json({ success: true, message: 'Propietario eliminado correctamente.' });
  } catch (err) { next(err); }
};

// ── PREDIOS ───────────────────────────────────────────────────────────────────

export const createPredio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Destruir cualquier ID basura que envíe el frontend
    delete req.body.propietarioId; 

    // 2. Extraer el ID real del token (cubriendo todas las variantes)
    const rawUserId = (req.user as any)?.id || (req.user as any)?.userId || req.user?.sub || (req as any).userId;
    
    if (!rawUserId) {
      return res.status(401).json({ message: "Token inválido: No hay ID." });
    }

    // 3. Convertir a Int
    const numericId = typeof rawUserId === 'string' && !isNaN(Number(rawUserId)) 
      ? parseInt(rawUserId as string, 10) 
      : rawUserId;

    // Convertir código a string por si viene como número
    if (req.body.codigo !== undefined) {
      req.body.codigo = String(req.body.codigo);
    }
    
    // Parseo numérico estricto de coordenadas
    if (req.body.coordenadas && typeof req.body.coordenadas === 'string') {
      const parts = req.body.coordenadas.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lon = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
           req.body.coordenadas = `${lat}, ${lon}`;
        }
      }
    }

    // Buscar el perfil de Propietario enlazado a este Usuario
    const perfilUsuario = await prisma.usuario.findUnique({ 
      where: { id: numericId } 
    });
    
    let propietarioId = perfilUsuario?.propietarioId;
    
    // Auto-creación On-the-fly si el perfil Propietario no existe aún
    if (!propietarioId) {
      const nuevoPropietario = await prisma.propietario.create({
        data: {
          nombre: perfilUsuario?.nombre || (req.user as any)?.nombre || "Propietario Autogenerado",
          documento: perfilUsuario?.email || `TEMP-${numericId}`, // Fallback al email o ID para cumplir con unique
          email: perfilUsuario?.email || undefined
        }
      });
      
      propietarioId = nuevoPropietario.id;
      
      // Vincular el nuevo propietario al usuario
      await prisma.usuario.update({
        where: { id: numericId },
        data: { propietarioId: propietarioId }
      });
    }

    // 4. Crear la finca directamente usando el propietarioId validado relacionalmente
    const nuevaFinca = await prisma.predio.create({
      data: {
        nombre: req.body.nombre,
        codigo: req.body.codigo,
        municipio: req.body.municipio || req.body.canton,
        departamento: req.body.departamento || req.body.provincia,
        parroquia: req.body.parroquia,
        coordenadas: req.body.coordenadas,
        estado: 'PENDIENTE',
        propietarioId: propietarioId // ID del Propietario (creado o existente)
      }
    });

    return res.status(201).json({ success: true, data: nuevaFinca });
  } catch (err: any) { 
    res.status(400).json({ success: false, error: { message: err.message || 'Error al procesar la inserción.' } });
  }
};

export const getPredios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rol, propietarioId, prediosAsignados } = req.user;
    
    // Si es SUPER_ADMIN, trae todos. Si es PROPIETARIO, trae los de su propietarioId.
    // Si es VETERINARIO/OPERARIO, trae solo los de su prediosAsignados.
    const estadoQuery = req.query.estado as string || 'ACTIVO';
    const allPredios = await adminService.getAllPredios(estadoQuery);
    
    let filteredPredios = allPredios;
    if (rol === 'PROPIETARIO') {
      // Extraer el ID inmutable (userId) para evitar JWT desactualizados
      const rawUserId = (req.user as any)?.id || (req.user as any)?.userId || req.user?.sub;
      const userId = parseInt(String(rawUserId), 10);
      
      // Buscar el propietarioId actual directamente en la base de datos
      const perfilUsuario = await prisma.usuario.findUnique({ where: { id: userId } });
      const currentPropietarioId = perfilUsuario?.propietarioId;
      
      if (currentPropietarioId) {
        filteredPredios = allPredios.filter(p => p.propietarioId === currentPropietarioId);
      } else {
        filteredPredios = [];
      }
    } else if (rol !== 'SUPER_ADMIN' && prediosAsignados) {
      filteredPredios = allPredios.filter(p => prediosAsignados.includes(p.id));
    }

    res.json({ success: true, data: filteredPredios });
  } catch (err) {
    if (req.user?.rol === 'PROPIETARIO') {
      return res.json({ success: true, data: [] });
    }
    next(err);
  }
};

export const getPredioById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const data = await adminService.getPredioById(id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const updatePredio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const result = predioUpdateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    const data = await adminService.updatePredio(id, result.data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const deletePredio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.deletePredio(id);
    res.json({ success: true, message: 'Predio eliminado correctamente.' });
  } catch (err) { next(err); }
};

export const getPrediosPendientes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.getPrediosPendientes();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const aprobarPredio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.aprobarPredio(id, req.user.sub);
    res.json({ success: true, message: 'Predio aprobado exitosamente y ahora está activo.' });
  } catch (err) { next(err); }
};

export const rechazarPredio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const result = predioRechazarSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    
    await adminService.rechazarPredio(id, req.user.sub, result.data.motivoRechazo);
    res.json({ success: true, message: 'Solicitud de alta de predio rechazada.' });
  } catch (err) { next(err); }
};

export const getPredioStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const data = await adminService.getPredioStats(id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── USUARIOS ──────────────────────────────────────────────────────────────────

export const createUsuario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createUsuarioSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    const data = await adminService.createUsuario(result.data);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getUsuarios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propietarioId = req.user.propietarioId || null;
    const data = await adminService.getUsuariosByPropietario(propietarioId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const updateUsuario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const result = usuarioUpdateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    const data = await adminService.updateUsuario(id, result.data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const toggleUsuarioStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.toggleUsuarioStatus(id);
    res.json({ success: true, message: 'Estado del usuario actualizado.' });
  } catch (err) { next(err); }
};

export const getUsuariosPendientes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propietarioId = req.user.propietarioId || null;
    const data = await adminService.getUsuariosPendientes(propietarioId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const aprobarUsuario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.aprobarUsuario(id, req.user.sub);
    res.json({ success: true, message: 'Usuario aprobado exitosamente.' });
  } catch (err) { next(err); }
};

export const rechazarUsuario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.rechazarUsuario(id, req.user.sub);
    res.json({ success: true, message: 'Solicitud de acceso rechazada.' });
  } catch (err) { next(err); }
};

export const deleteUsuario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await adminService.deleteUsuario(id, req.user.sub);
    res.json({ success: true, message: 'Usuario eliminado correctamente.' });
  } catch (err) { next(err); }
};

// ── SOLICITUDES DE ACCESO MULTICLIENTE (VETERINARIO) ──
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const crearSolicitudAcceso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { predioId } = req.body;
    if (!predioId) throw new Error('predioId es requerido');
    
    const existing = await prisma.solicitudAcceso.findFirst({
      where: { usuarioId: req.user.sub, predioId: parseInt(predioId, 10), estado: 'PENDIENTE' }
    });
    if (existing) {
      return res.status(400).json({ error: 'Ya existe una solicitud pendiente para esta finca' });
    }

    await prisma.solicitudAcceso.create({
      data: {
        usuarioId: req.user.sub,
        predioId: parseInt(predioId, 10),
        estado: 'PENDIENTE'
      }
    });
    res.json({ success: true, message: 'Solicitud de acceso enviada correctamente' });
  } catch (err) { next(err); }
};

export const getSolicitudesAcceso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const propietarioId = req.user.propietarioId || null;
    let whereClause: any = { estado: 'PENDIENTE' };
    
    if (req.user.rol === 'PROPIETARIO' && propietarioId) {
      whereClause.predio = { propietarioId };
    } else if (req.user.rol === 'VETERINARIO') {
      whereClause.usuarioId = req.user.sub;
    }

    const solicitudes = await prisma.solicitudAcceso.findMany({
      where: whereClause,
      include: {
        usuario: { select: { id: true, nombre: true, email: true, rol: true } },
        predio: { select: { id: true, nombre: true, propietario: { select: { nombre: true } } } }
      },
      orderBy: { fecha: 'desc' }
    });

    res.json({ success: true, data: solicitudes });
  } catch (err) { next(err); }
};

export const aprobarSolicitudAcceso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const solicitud = await prisma.solicitudAcceso.findUnique({ where: { id } });
    if (!solicitud) throw new Error('Solicitud no encontrada');
    
    await prisma.solicitudAcceso.update({
      where: { id },
      data: { estado: 'APROBADA' }
    });

    await prisma.usuario.update({
      where: { id: solicitud.usuarioId },
      data: { fincasVeterinario: { connect: [{ id: solicitud.predioId }] } }
    });

    res.json({ success: true, message: 'Solicitud aprobada y acceso concedido' });
  } catch (err) { next(err); }
};

export const rechazarSolicitudAcceso = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await prisma.solicitudAcceso.update({
      where: { id },
      data: { estado: 'RECHAZADA' }
    });
    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (err) { next(err); }
};
