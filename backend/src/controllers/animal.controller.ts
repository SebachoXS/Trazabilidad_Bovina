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
    console.log("Payload recibido:", req.body);
    const data = { ...req.body };

    if (req.body.predioId) {
      const predioIdNumerico = parseInt(req.body.predioId, 10);
      data.predioId = predioIdNumerico;
    }
    // 1. Limpieza y parseo numérico seguro
    const invalidValues = ['', 'Ninguno / Sin registro', 'null', 'undefined'];
    if (invalidValues.includes(String(data.madreId))) data.madreId = null;
    if (invalidValues.includes(String(data.padreId))) data.padreId = null;
    if (data.pesoNacimiento === '') data.pesoNacimiento = undefined;

    if (typeof data.madreId === 'string' && data.madreId !== 'null') {
      const parsed = parseInt(data.madreId, 10);
      data.madreId = isNaN(parsed) ? null : parsed;
    }
    if (typeof data.padreId === 'string' && data.padreId !== 'null') {
      const parsed = parseInt(data.padreId, 10);
      data.padreId = isNaN(parsed) ? null : parsed;
    }
    if (typeof data.pesoNacimiento === 'string') {
      const parsed = parseFloat(data.pesoNacimiento);
      data.pesoNacimiento = isNaN(parsed) ? undefined : parsed;
    }
    if (typeof data.predioId === 'string') {
      const parsed = parseInt(data.predioId, 10);
      data.predioId = isNaN(parsed) ? undefined : parsed;
    }
    if (data.fechaNacimiento) {
      data.fechaNacimiento = new Date(data.fechaNacimiento);
    }

    // 2. Validación Preventiva y Fallback de Predio Activo
    if (req.user.rol === 'PROPIETARIO' && req.user.propietarioId) {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      let predioExiste = null;
      if (data.predioId) {
        predioExiste = await prisma.predio.findUnique({ where: { id: data.predioId } });
      }

      if (!predioExiste) {
        const predioFallback = await prisma.predio.findFirst({
          where: {
            propietarioId: req.user.propietarioId,
            OR: [{ estado: 'ACTIVO' }, { estado: null }],
            deletedAt: null
          }
        });
        
        if (predioFallback) {
          data.predioId = predioFallback.id;
        } else {
          res.status(400).json({ error: "No se puede registrar el animal porque el predio seleccionado no existe en la base de datos. Por favor, selecciona una finca válida." });
          return;
        }
      }
    }

    const result = animalCreateSchema.safeParse(data);
    if (!result.success) {
      throw new ValidationError('Datos de creación inválidos', result.error);
    }

    const animal = await animalService.create(result.data, req.user.sub, req.ip ?? '127.0.0.1', req.user.rol);

    res.status(201).json({
      success: true,
      data: animal,
    });
  } catch (error: any) {
    console.error("Error crítico al guardar bovino:", error);
    
    return res.status(400).json({ 
      success: false,
      error: error.message || "Error al crear el animal", 
      codigo: error.code 
    });
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

    // INTERCEPCIÓN DE SEGURIDAD PARA VETERINARIO (M:N)
    if (req.user.rol === 'VETERINARIO' || req.user.rol === 'OPERARIO') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const accesos = await prisma.solicitudAcceso.findMany({
        where: { usuarioId: req.user.sub, estado: 'APROBADA' },
        select: { predioId: true }
      });
      
      const fincasIds = accesos.map(a => a.predioId);
      
      if (fincasIds.length === 0) {
        res.json({
          success: true,
          data: [],
          meta: { page: 1, limit: result.data.limit || 10, total: 0, totalPages: 0 }
        });
        return;
      }
      
      // Sobrescribimos o forzamos el filtro de finca
      // Aseguramos que solo busque en las fincas permitidas
      if (result.data.predioId && !fincasIds.includes(result.data.predioId)) {
        res.json({
          success: true,
          data: [],
          meta: { page: 1, limit: result.data.limit || 10, total: 0, totalPages: 0 }
        });
        return;
      }
      
      if (!result.data.predioId) {
        // En lugar de pasar un rbacFilter mágico, forzamos en query si se soporta (pero AnimalQueryDto solo recibe predioId único)
        // Para soportar un array, pasamos el rbacFilter explícito:
      }
    }

    const { getPredioFilterForUser } = await import('../utils/rbac');
    let rbacFilter = getPredioFilterForUser(req.user);

    // Hard override para VETERINARIO / OPERARIO basado en DB real
    if (req.user.rol === 'VETERINARIO' || req.user.rol === 'OPERARIO') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const accesos = await prisma.solicitudAcceso.findMany({
        where: { usuarioId: req.user.sub, estado: 'APROBADA' },
        select: { predioId: true }
      });
      const fincasIds = accesos.map(a => a.predioId);
      
      rbacFilter = { predioId: { in: fincasIds } };
    }

    const paginatedResult = await animalService.findAll(result.data, rbacFilter);

    res.json({
      success: true,
      data: paginatedResult.data,
      meta: paginatedResult.meta,
    });
  } catch (error) {
    if (req.user?.rol === 'PROPIETARIO') {
      return res.json({
        success: true,
        data: [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 0 }
      });
    }
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
      message: 'Animal borrado físicamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const retornarAnimal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const animal = await animalService.retornar(id, req.user.sub, req.ip);

    res.json({
      success: true,
      data: animal,
      message: 'Animal retornado al predio exitosamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const darDeBajaAnimal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    const { motivo, detalle } = req.body;
    
    if (!motivo) {
      res.status(400).json({ success: false, error: 'El motivo es requerido.' });
      return;
    }

    const animal = await animalService.darDeBaja(id, motivo, detalle || '', req.user.sub, req.ip);

    res.json({
      success: true,
      data: animal,
      message: 'Animal dado de baja exitosamente.',
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
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const rechazarAltaAnimal = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = parseInt(req.params['id']!, 10);
    await animalService.rechazarAlta(id, req.user.sub);
    res.json({ success: true, message: 'Alta de animal rechazada.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
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
