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

    const result = await reporteService.getAnimalesEnRetiro(query.data);
    handleResponse(res, query.data.formato, result, 'retiro_sanitario');
  } catch (err) {
    next(err);
  }
};
