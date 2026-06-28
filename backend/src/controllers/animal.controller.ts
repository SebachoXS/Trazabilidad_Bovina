/**
 * @file backend/src/controllers/animal.controller.ts
 * @description Controlador de Animales.
 */

import type { Request, Response, NextFunction } from 'express';
import { animalService } from '../services/animal.service';
import { animalCreateSchema, animalUpdateSchema, animalQuerySchema } from '../validators/animal.validator';
import { ValidationError } from '../types/errors';

export const createAnimal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = animalCreateSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Datos de creación inválidos', result.error);
    }

    const animal = await animalService.create(result.data, req.user.sub, req.ip ?? '127.0.0.1', req.user.rol);

    res.status(201).json({
      success: true,
      data: animal,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnimalById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const animal = await animalService.findById(id);

    res.json({
      success: true,
      data: animal,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnimalByCodigoVisual = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const codigoVisual = req.params['codigoVisual']!;
    const animal = await animalService.findByCodigoVisual(codigoVisual);

    res.json({
      success: true,
      data: animal,
    });
  } catch (error) {
    next(error);
  }
};

export const getAnimales = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = animalQuerySchema.safeParse(req.query);
    if (!result.success) {
      throw new ValidationError('Parámetros de búsqueda inválidos', result.error);
    }

    const { getPredioFilterForUser } = await import('../utils/rbac');
    const rbacFilter = getPredioFilterForUser(req.user);

    const paginatedResult = await animalService.findAll(result.data, rbacFilter);

    res.json({
      success: true,
      data: paginatedResult.data,
      meta: paginatedResult.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAnimal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const result = animalUpdateSchema.safeParse(req.body);
    
    if (!result.success) {
      throw new ValidationError('Datos de actualización inválidos', result.error);
    }

    const animal = await animalService.update(id, result.data, req.user.sub, req.ip);

    res.json({
      success: true,
      data: animal,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAnimal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await animalService.delete(id, req.user.sub, req.ip);

    res.json({
      success: true,
      message: 'Animal marcado como fallecido.',
    });
  } catch (error) {
    next(error);
  }
};

export const aprobarAltaAnimal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await animalService.aprobarAlta(id, req.user.sub);
    res.json({ success: true, message: 'Alta de animal aprobada exitosamente.' });
  } catch (error) { next(error); }
};

export const rechazarAltaAnimal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await animalService.rechazarAlta(id, req.user.sub);
    res.json({ success: true, message: 'Alta de animal rechazada.' });
  } catch (error) { next(error); }
};

export const getHojaDeVida = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    let identifier: number | string = id as string;
    if (!isNaN(Number(id))) {
      identifier = Number(id);
    }
    const data = await animalService.getHojaDeVida(identifier);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const getHojaDeVidaByCodigo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { codigoVisual } = req.params;
    const data = await animalService.getHojaDeVida(codigoVisual as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
