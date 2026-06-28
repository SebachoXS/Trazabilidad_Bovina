/**
 * @file backend/src/middlewares/rbac.middleware.ts
 * @description Control de acceso por roles (RBAC).
 * CONSTITUTION §6.2: Matriz RBAC para Admin, Veterinario, Operario, Estudiante.
 * CONSTITUTION §10.1 Mandato 6: Aplicar rbacMiddleware en todo endpoint protegido.
 */

import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../types/errors';

/** Roles válidos del sistema (espejo de los valores del campo `rol` en la BD). */
export type Rol = 'SUPER_ADMIN' | 'PROPIETARIO' | 'VETERINARIO' | 'OPERARIO' | 'CLIENTE';

/**
 * Fábrica de middleware RBAC. Retorna un middleware que verifica si el rol del
 * usuario autenticado está incluido en la lista de roles permitidos.
 *
 * @param {Rol[]} rolesPermitidos - Roles que tienen acceso al endpoint.
 * @returns Middleware de Express que verifica el rol.
 * @throws {ForbiddenError} Si el rol del usuario no está en la lista.
 *
 * @example
 * router.post('/eventos', authMiddleware, rbacMiddleware(['ADMIN', 'VETERINARIO']), createEvento);
 */
export const rbacMiddleware = (rolesPermitidos: Rol[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { rol } = req.user;

    if (!rolesPermitidos.includes(rol)) {
      return next(
        new ForbiddenError(
          `El rol "${rol}" no tiene permisos para esta operación. Roles permitidos: ${rolesPermitidos.join(', ')}.`
        )
      );
    }

    next();
  };
};
