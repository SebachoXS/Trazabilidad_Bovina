/**
 * @file backend/src/controllers/health.controller.ts
 * @description Controlador del Módulo Sanitario. Solo orquestación HTTP.
 * CONSTITUTION §3.1: "Los controladores no contienen lógica de negocio."
 * Extrae datos del Request, llama al servicio, formatea el Response.
 */

import type { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types/errors';
import { healthService } from '../services/health.service';
import {
  eventoSanitarioCreateSchema,
  eventoSanitarioUpdateSchema,
  eventoSanitarioQuerySchema,
  eventoSanitarioLoteSchema,
} from '../validators/health.validator';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Extrae y valida el parámetro :animalId de la URL como número entero. */
function parseAnimalId(param: string | undefined): number | null {
  const id = parseInt(param ?? '', 10);
  return isNaN(id) || id <= 0 ? null : id;
}

/** Extrae y valida el parámetro :id de la URL como número entero. */
function parseEventoId(param: string | undefined): number | null {
  const id = parseInt(param ?? '', 10);
  return isNaN(id) || id <= 0 ? null : id;
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

/**
 * POST /api/v1/animales/:animalId/eventos
 * Registra un nuevo evento sanitario para un animal.
 * Roles permitidos: ADMIN, VETERINARIO (verificado en la ruta).
 *
 * Implementa RN-002: si periodoRetiro > 0, calcula fechaFinRetiro y
 * cambia el estado del animal a EN_RETIRO automáticamente.
 */
export const createEvento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const animalId = parseAnimalId(req.params['animalId']);
    if (!animalId) {
      return next(new ValidationError('PARAM_INVALIDO', { animalId: 'Debe ser un número entero positivo.' }));
    }

    const parseResult = eventoSanitarioCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(new ValidationError('VALIDATION_ERROR', parseResult.error.flatten()));
    }

    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    const evento = await healthService.create(animalId, parseResult.data, req.user.sub, ip);

    res.status(201).json({ success: true, data: evento });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/eventos/lote
 * Registra un mismo evento sanitario para un grupo de animales.
 */
export const createBatchEvento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parseResult = eventoSanitarioLoteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(new ValidationError('VALIDATION_ERROR', parseResult.error.flatten()));
    }

    const ip = req.ip ?? req.headers['x-forwarded-for']?.toString();
    await healthService.createBatch(parseResult.data.animalIds, parseResult.data.evento, req.user.sub, ip);

    res.status(201).json({ success: true, message: 'Eventos registrados en lote exitosamente.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/animales/:animalId/eventos
 * Lista el historial sanitario de un animal con paginación y filtros.
 * Roles permitidos: Todos los autenticados.
 */
export const getEventosByAnimal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const animalId = parseAnimalId(req.params['animalId']);
    if (!animalId) {
      return next(new ValidationError('PARAM_INVALIDO', { animalId: 'Debe ser un número entero positivo.' }));
    }

    const queryResult = eventoSanitarioQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return next(new ValidationError('QUERY_INVALIDO', queryResult.error.flatten()));
    }

    const { getPredioFilterForUser } = await import('../utils/rbac');
    const rbacFilter = getPredioFilterForUser(req.user);

    const result = await healthService.findByAnimalId(animalId, queryResult.data, rbacFilter);

    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/animales/:animalId/eventos/:id
 * Obtiene el detalle de un evento sanitario específico.
 * Incluye protección anti-IDOR: el evento debe pertenecer al animal de la URL.
 * Roles permitidos: Todos los autenticados.
 */
export const getEventoById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const animalId = parseAnimalId(req.params['animalId']);
    const eventoId = parseEventoId(req.params['id']);

    if (!animalId || !eventoId) {
      return next(new ValidationError('PARAM_INVALIDO', { message: 'animalId e id deben ser enteros positivos.' }));
    }

    const evento = await healthService.findById(eventoId, animalId);

    res.status(200).json({ success: true, data: evento });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/animales/:animalId/eventos/:id
 * Actualiza los datos de un evento sanitario (corrección con auditoría).
 * Si se modifica periodoRetiro, recalcula fechaFinRetiro y reevalúa el estado del animal.
 * Roles permitidos: ADMIN, VETERINARIO (verificado en la ruta).
 */
export const updateEvento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const animalId = parseAnimalId(req.params['animalId']);
    const eventoId = parseEventoId(req.params['id']);

    if (!animalId || !eventoId) {
      return next(new ValidationError('PARAM_INVALIDO', { message: 'animalId e id deben ser enteros positivos.' }));
    }

    const parseResult = eventoSanitarioUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return next(new ValidationError('VALIDATION_ERROR', parseResult.error.flatten()));
    }

    const evento = await healthService.update(eventoId, animalId, parseResult.data, req.user.sub);

    res.status(200).json({ success: true, data: evento });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/animales/:animalId/eventos/:id
 * Elimina un evento sanitario con registro en AuditLog.
 * Roles permitidos: Solo ADMIN (verificado en la ruta).
 */
export const deleteEvento = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const eventoId = parseEventoId(req.params['id']);

    if (!eventoId) {
      return next(new ValidationError('PARAM_INVALIDO', { id: 'Debe ser un número entero positivo.' }));
    }

    await healthService.delete(eventoId, req.user.sub);

    res.status(200).json({
      success: true,
      data: { message: `Evento sanitario ${eventoId} eliminado correctamente.` },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/eventos-sanitarios
 * Lista global de eventos sanitarios del predio del usuario autenticado.
 * Soporta filtros avanzados: tipo, rango de fechas, conRetiroActivo.
 * Roles permitidos: ADMIN, VETERINARIO (verificado en la ruta).
 */
export const getAllEventos = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const queryResult = eventoSanitarioQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return next(new ValidationError('QUERY_INVALIDO', queryResult.error.flatten()));
    }

    const { getPredioFilterForUser } = await import('../utils/rbac');
    const rbacFilter = getPredioFilterForUser(req.user);

    const result = await healthService.findAll(rbacFilter, queryResult.data);

    res.status(200).json({ success: true, data: result.data, meta: result.meta });
  } catch (error) {
    next(error);
  }
};
