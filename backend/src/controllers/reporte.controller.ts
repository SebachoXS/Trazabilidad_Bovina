/**
 * @file backend/src/controllers/reporte.controller.ts
 * @description Controlador de Reportes. Maneja la lógica de respuesta según el formato solicitado.
 */

import type { Request, Response, NextFunction } from 'express';
import { reporteService } from '../services/reporte.service';
import { reporteQuerySchema } from '../validators/reporte.validator';
import { ValidationError } from '../types/errors';
import type { PassThrough } from 'stream';

const handleResponse = (res: Response, formato: 'json' | 'csv' | 'pdf', result: any, filename: string) => {
  if (formato === 'csv') {
    res.header('Content-Type', 'text/csv');
    res.attachment(`${filename}.csv`);
    return res.send(result);
  } else if (formato === 'pdf') {
    res.header('Content-Type', 'application/pdf');
    res.attachment(`${filename}.pdf`);
    return (result as PassThrough).pipe(res);
  } else {
    return res.json({ success: true, data: result });
  }
};

export const getInventario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = reporteQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError('Parámetros inválidos', query.error);

    if (req.user?.rol === 'PROPIETARIO') {
      if (!req.user.propietarioId) {
        return handleResponse(res, query.data.formato as any || 'json', { resumen: { total: 0, porSexo: {}, porEstado: {} }, detalle: [] }, 'inventario');
      }
      query.data.propietarioId = req.user.propietarioId;
    } else if (req.user?.rol === 'OPERARIO' || req.user?.rol === 'VETERINARIO') {
      if (!req.user.prediosAsignados || req.user.prediosAsignados.length === 0) {
        return handleResponse(res, query.data.formato as any || 'json', { resumen: { total: 0, porSexo: {}, porEstado: {} }, detalle: [] }, 'inventario');
      }
      if (query.data.predioId) {
        if (!req.user.prediosAsignados.includes(query.data.predioId)) {
          return res.status(403).json({ error: 'Acceso denegado a esta finca.' });
        }
      } else {
        query.data.predioId = req.user.prediosAsignados[0];
      }
    }

    const result = await reporteService.getInventario(query.data);
    handleResponse(res, query.data.formato, result, 'inventario');
  } catch (err) {
    next(err);
  }
};

export const getSanitario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = reporteQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError('Parámetros inválidos', query.error);

    if (req.user?.rol === 'PROPIETARIO') {
      if (!req.user.propietarioId) {
        return handleResponse(res, query.data.formato as any || 'json', { resumen: { totalEventos: 0, vacunaciones: 0, tratamientos: 0, diagnosticos: 0 }, detalle: [] }, 'sanitario');
      }
      query.data.propietarioId = req.user.propietarioId;
    } else if (req.user?.rol === 'OPERARIO' || req.user?.rol === 'VETERINARIO') {
      if (!req.user.prediosAsignados || req.user.prediosAsignados.length === 0) {
        return handleResponse(res, query.data.formato as any || 'json', { resumen: { totalEventos: 0, vacunaciones: 0, tratamientos: 0, diagnosticos: 0 }, detalle: [] }, 'sanitario');
      }
      if (query.data.predioId) {
        if (!req.user.prediosAsignados.includes(query.data.predioId)) {
          return res.status(403).json({ error: 'Acceso denegado a esta finca.' });
        }
      } else {
        query.data.predioId = req.user.prediosAsignados[0];
      }
    }

    const result = await reporteService.getSanitario(query.data);
    handleResponse(res, query.data.formato, result, 'sanitario');
  } catch (err) {
    next(err);
  }
};

export const getAnimalesEnRetiro = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = reporteQuerySchema.safeParse(req.query);
    if (!query.success) throw new ValidationError('Parámetros inválidos', query.error);

    if (req.user?.rol === 'PROPIETARIO') {
      if (!req.user.propietarioId) {
        return handleResponse(res, query.data.formato as any || 'json', { total: 0, detalle: [] }, 'retiro_sanitario');
      }
      query.data.propietarioId = req.user.propietarioId;
    } else if (req.user?.rol === 'OPERARIO' || req.user?.rol === 'VETERINARIO') {
      if (!req.user.prediosAsignados || req.user.prediosAsignados.length === 0) {
        return handleResponse(res, query.data.formato as any || 'json', { total: 0, detalle: [] }, 'retiro_sanitario');
      }
      if (query.data.predioId) {
        if (!req.user.prediosAsignados.includes(query.data.predioId)) {
          return res.status(403).json({ error: 'Acceso denegado a esta finca.' });
        }
      } else {
        query.data.predioId = req.user.prediosAsignados[0];
      }
    }

    const result = await reporteService.getAnimalesEnRetiro(query.data);
    handleResponse(res, query.data.formato, result, 'retiro_sanitario');
  } catch (err) {
    if (req.user?.rol === 'PROPIETARIO') {
      return handleResponse(res, req.query.formato as any || 'json', { total: 0, detalle: [] }, 'retiro_sanitario');
    }
    next(err);
  }
};
