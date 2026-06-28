/**
 * @file backend/src/middlewares/auth.middleware.ts
 * @description Middleware de autenticación JWT.
 * Verifica el token Bearer en el header Authorization y adjunta el payload al Request.
 * CONSTITUTION §6.1: JWT con expiración de 8 horas.
 * CONSTITUTION §10.1 Mandato 6: "Todo endpoint nuevo es privado por defecto."
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthPayload } from '../types/index';
import { UnauthorizedError } from '../types/errors';

/**
 * Middleware que valida el JWT del header Authorization.
 * Adjunta `req.user` con el payload del token para uso en controladores y RBAC.
 *
 * @throws {UnauthorizedError} Si el token está ausente, mal formado o expirado.
 */
export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token de acceso no proporcionado.'));
  }

  const token = authHeader.slice(7);
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    return next(new Error('JWT_SECRET no configurado en el servidor.'));
  }

  try {
    const payload = jwt.verify(token, secret) as unknown as AuthPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Token inválido o expirado.'));
  }
};
