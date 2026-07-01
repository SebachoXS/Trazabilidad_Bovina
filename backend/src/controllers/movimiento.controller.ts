/**
 * @file backend/src/controllers/movimiento.controller.ts
 * @description Controlador de Movimientos.
 */

import type { Request, Response, NextFunction } from 'express';
import { movimientoService } from '../services/movimiento.service';
import { movimientoCreateSchema, movimientoQuerySchema, movimientoBatchCreateSchema } from '../validators/movimiento.validator';
import { ValidationError } from '../types/errors';

export const createMovimientoBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = movimientoBatchCreateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos de lote inválidos', result.error);

    const data = await movimientoService.createBatch(result.data, req.user.sub, req.ip);
    res.status(201).json({ success: true, count: result.data.animalIds.length, data });
  } catch (err) {
    next(err);
  }
};

export const createMovimiento = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = movimientoCreateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);

    const data = await movimientoService.create(result.data, req.user.sub, req.ip);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getMovimientos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = movimientoQuerySchema.safeParse(req.query);
    if (!result.success) throw new ValidationError('Parámetros inválidos', result.error);

    const { getPredioFilterForUser } = await import('../utils/rbac');
    const rbacFilter = getPredioFilterForUser(req.user);

    const { data, meta } = await movimientoService.findAll(result.data, rbacFilter);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
};

export const getMovimientoById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const data = await movimientoService.getById(id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
