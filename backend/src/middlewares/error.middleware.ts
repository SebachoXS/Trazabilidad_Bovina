/**
 * @file backend/src/middlewares/error.middleware.ts
 * @description Middleware centralizado de manejo de errores.
 * CONSTITUTION §4.4: Formato uniforme de respuesta de error.
 * Intercepta todos los errores propagados con next(error) y los formatea.
 */

import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';

/**
 * Middleware de manejo de errores centralizado.
 * Debe registrarse como el ÚLTIMO middleware en app.ts.
 *
 * Formatos de respuesta:
 * - AppError (y subclases): usa statusCode y code del error.
 * - Errores inesperados: HTTP 500 con código INTERNAL_SERVER_ERROR.
 */
export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const isDev = process.env['NODE_ENV'] === 'development';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(isDev && err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Error inesperado — no revelar detalles en producción
  console.error(`[ERROR] ${req.method} ${req.path}:`, err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado en el servidor.',
      ...(isDev ? { details: err.message } : {}),
    },
  });
};
