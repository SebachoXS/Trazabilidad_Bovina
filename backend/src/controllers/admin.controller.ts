/**
 * @file backend/src/controllers/admin.controller.ts
 * @description Controladores para Propietarios, Predios y Usuarios.
 */

import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service';
import { 
  propietarioCreateSchema, propietarioUpdateSchema,
  predioCreateSchema, predioUpdateSchema,
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
    const result = predioCreateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    const data = await adminService.createPredio(result.data);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getPredios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rol, propietarioId, prediosAsignados } = req.user;
    
    // Si es SUPER_ADMIN, trae todos. Si es PROPIETARIO, trae los de su propietarioId.
    // Si es VETERINARIO/OPERARIO, trae solo los de su prediosAsignados.
    const allPredios = await adminService.getAllPredios();
    
    let filteredPredios = allPredios;
    if (rol === 'PROPIETARIO' && propietarioId) {
      filteredPredios = allPredios.filter(p => p.propietarioId === propietarioId);
    } else if (rol !== 'SUPER_ADMIN' && prediosAsignados) {
      filteredPredios = allPredios.filter(p => prediosAsignados.includes(p.id));
    }

    res.json({ success: true, data: filteredPredios });
  } catch (err) { next(err); }
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
    const result = usuarioToggleSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);
    await adminService.toggleUsuarioStatus(id, result.data.activo);
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
