/**
 * @file backend/src/types/errors.ts
 * @description Clases de error tipadas del dominio.
 * CONSTITUTION §4.4: "Crear clases de error tipadas".
 * Estos errores son interceptados y formateados por error.middleware.ts.
 */

/** Error base del dominio. No usar directamente; usar las subclases. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** HTTP 404 — Recurso no encontrado. */
export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(message, 404, code);
  }
}

/** HTTP 400 — Error de validación de datos de entrada. */
export class ValidationError extends AppError {
  constructor(code: string, details: unknown) {
    super('Error de validación en los datos enviados.', 400, code, details);
  }
}

/** HTTP 401 — No autenticado. */
export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado. Token inválido o expirado.') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** HTTP 403 — Sin permisos suficientes. */
export class ForbiddenError extends AppError {
  constructor(message = 'Permisos insuficientes para esta operación.') {
    super(message, 403, 'PERMISOS_INSUFICIENTES');
  }
}

/** HTTP 409 — Conflicto: recurso duplicado. */
export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(message, 409, code);
  }
}

/** HTTP 422 — Regla de negocio violada. */
export class BusinessRuleError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(message, 422, code, details);
  }
}
