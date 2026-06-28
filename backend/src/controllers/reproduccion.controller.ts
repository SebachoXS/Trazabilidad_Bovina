/**
 * @file backend/src/controllers/reproduccion.controller.ts
 * @description Controlador de Reproducción.
 */

import type { Request, Response, NextFunction } from 'express';
import { reproduccionService } from '../services/reproduccion.service';
import { eventoReproductivoCreateSchema, partoCreateSchema } from '../validators/reproduccion.validator';
import { ValidationError } from '../types/errors';

export const createEventoReproductivo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = parseInt(req.params['animalId']!, 10);
    const result = eventoReproductivoCreateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos inválidos', result.error);

    const data = await reproduccionService.createEvento(animalId, result.data, req.user.sub, req.ip);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const registrarParto = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = parseInt(req.params['animalId']!, 10);
    const result = partoCreateSchema.safeParse(req.body);
    if (!result.success) throw new ValidationError('Datos de parto inválidos', result.error);

    const data = await reproduccionService.registrarParto(animalId, result.data, req.user.sub, req.ip);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getEventosByAnimal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = parseInt(req.params['animalId']!, 10);
    const data = await reproduccionService.getEventosByAnimal(animalId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
