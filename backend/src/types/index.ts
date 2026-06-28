/**
 * @file backend/src/types/index.ts
 * @description Tipos e interfaces globales del sistema de trazabilidad bovina.
 * CONSTITUTION §4.1: Todos los tipos exportados deben vivir en el directorio types/.
 */

import type { Request } from 'express';

/** Roles válidos del sistema. */
export type Rol = 'SUPER_ADMIN' | 'PROPIETARIO' | 'VETERINARIO' | 'OPERARIO' | 'CLIENTE';

// ─────────────────────────────────────────────
// AUTENTICACIÓN Y SESIÓN
// ─────────────────────────────────────────────

/** Payload del JWT access token. */
export interface AuthPayload {
  sub: number;         // ID del usuario
  email: string;
  rol: Rol;
  propietarioId: number | null;
  prediosAsignados: number[];
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthPayload;
    }
  }
}

/** Request de Express extendido con el usuario autenticado (ahora es un alias). */
export type RequestWithUser = Request;

// ─────────────────────────────────────────────
// RESPUESTAS API
// ─────────────────────────────────────────────

/** Envelope de respuesta exitosa. CONSTITUTION §4.4 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Envelope de respuesta de error. CONSTITUTION §4.4 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Metadatos de paginación. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Resultado paginado genérico. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─────────────────────────────────────────────
// FILTROS COMUNES
// ─────────────────────────────────────────────

/** Filtros base de paginación para query params. */
export interface PaginationFilters {
  page?: number;
  limit?: number;
}
