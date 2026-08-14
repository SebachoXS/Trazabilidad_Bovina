/**
 * @file backend/src/controllers/pesaje.controller.ts
 * @description Controlador de Pesajes.
 */

import type { Request, Response, NextFunction } from 'express';
import { pesajeService } from '../services/pesaje.service';
import { pesajeCreateSchema, pesajeQuerySchema, desteteSchema } from '../validators/pesaje.validator';
import { ValidationError } from '../types/errors';

export const createPesaje = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = pesajeCreateSchema.safeParse(req.body);
    if (!result.success) {
      console.error('Validation Error for Pesaje:', JSON.stringify(result.error, null, 2));
      throw new ValidationError('Datos inválidos', result.error);
    }

    const data = await pesajeService.create(result.data, req.user.sub, req.ip);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getPesajes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = pesajeQuerySchema.safeParse(req.query);
    if (!result.success) throw new ValidationError('Parámetros inválidos', result.error);

    const { getPredioFilterForUser } = await import('../utils/rbac');
    const rbacFilter = getPredioFilterForUser(req.user);

    const { data, meta } = await pesajeService.findAll(result.data, rbacFilter);
    res.json({ success: true, data, meta });
  } catch (err) {
    next(err);
  }
};

export const deletePesaje = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await pesajeService.delete(id, req.user.sub, req.ip);
    res.json({ success: true, message: 'Pesaje eliminado correctamente.' });
  } catch (err) {
    next(err);
  }
};

export const registrarDestete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = parseInt(req.params['animalId']!, 10);
    const result = desteteSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);

    const data = await pesajeService.registrarDestete(animalId, result.data, req.user.sub, req.ip);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
