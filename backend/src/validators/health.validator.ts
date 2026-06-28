/**
 * @file backend/src/validators/health.validator.ts
 * @description Esquemas Zod para el Módulo Sanitario (Módulo 2).
 * CONSTITUTION §6.3: Validación estricta en backend y frontend.
 * SPEC.md §7: eventoSanitarioCreateSchema con superRefine condicional.
 *
 * Orden de exports:
 * 1. Schemas Zod
 * 2. Tipos inferidos (DTOs)
 */

import { z } from 'zod';

// ─────────────────────────────────────────────
// CONSTANTES DEL DOMINIO
// ─────────────────────────────────────────────

/** Tipos de evento sanitario válidos según el modelo Prisma. */
export const TIPOS_EVENTO_SANITARIO = [
  'VACUNACION',
  'TRATAMIENTO',
  'DIAGNOSTICO',
  'DESPARASITACION',
  'CIRUGIA',
] as const;

/**
 * Tipos que REQUIEREN el campo `producto` de forma obligatoria.
 * RN: Si tipo ∈ TIPOS_REQUIEREN_PRODUCTO y producto está ausente → error de validación.
 */
export const TIPOS_REQUIEREN_PRODUCTO: ReadonlyArray<string> = [
  'VACUNACION',
  'TRATAMIENTO',
  'DESPARASITACION',
];

// ─────────────────────────────────────────────
// SCHEMA DE CREACIÓN
// ─────────────────────────────────────────────

/**
 * Schema Zod para la creación de un EventoSanitario.
 * Aplica validaciones de tipo, longitud y la regla condicional de producto obligatorio.
 *
 * Campos obligatorios: `tipo`, `fecha`.
 * Campos con default: `periodoRetiro` (default: 0).
 */
export const eventoSanitarioCreateSchema = z
  .object({
    tipo: z.enum(TIPOS_EVENTO_SANITARIO, {
      required_error: 'El tipo de evento sanitario es obligatorio.',
      invalid_type_error: `El tipo debe ser uno de: ${TIPOS_EVENTO_SANITARIO.join(', ')}.`,
    }),

    fecha: z.coerce.date({
      required_error: 'La fecha del evento es obligatoria.',
      invalid_type_error: 'La fecha debe ser una fecha válida en formato ISO 8601.',
    }),

    producto: z
      .string({
        invalid_type_error: 'El nombre del producto debe ser texto.',
      })
      .max(200, 'El nombre del producto no puede superar los 200 caracteres.')
      .optional(),

    principioActivo: z
      .string()
      .max(200, 'El principio activo no puede superar los 200 caracteres.')
      .optional(),

    dosis: z
      .string()
      .max(50, 'La dosis no puede superar los 50 caracteres.')
      .optional(),

    viaAdministracion: z
      .string()
      .max(50, 'La vía de administración no puede superar los 50 caracteres.')
      .optional(),

    lote: z
      .string()
      .max(100, 'El número de lote no puede superar los 100 caracteres.')
      .optional(),

    laboratorio: z
      .string()
      .max(200, 'El nombre del laboratorio no puede superar los 200 caracteres.')
      .optional(),

    /**
     * Días de retiro obligatorio. 0 = sin retiro.
     * Si > 0, el servicio calculará fechaFinRetiro y pondrá al animal EN_RETIRO.
     * RN-002 — SPEC.md §9.
     */
    periodoRetiro: z
      .number({
        invalid_type_error: 'El período de retiro debe ser un número entero.',
      })
      .int('El período de retiro debe ser un número entero (días).')
      .min(0, 'El período de retiro no puede ser negativo.')
      .default(0),

    diagnostico: z
      .string()
      .max(500, 'El diagnóstico no puede superar los 500 caracteres.')
      .optional(),

    observaciones: z
      .string()
      .max(1000, 'Las observaciones no pueden superar los 1000 caracteres.')
      .optional(),
  })
  /**
   * Validación condicional: tipos que requieren medicamento/vacuna
   * deben incluir el campo `producto`.
   */
  .superRefine((data, ctx) => {
    if (TIPOS_REQUIEREN_PRODUCTO.includes(data.tipo) && !data.producto) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['producto'],
        message: `El campo "producto" es obligatorio para eventos de tipo "${data.tipo}". Indique el nombre del medicamento o vacuna utilizado.`,
      });
    }
  });

// ─────────────────────────────────────────────
// SCHEMA DE ACTUALIZACIÓN
// ─────────────────────────────────────────────

/**
 * Schema Zod para actualizar un EventoSanitario (PATCH).
 * Todos los campos son opcionales. NO incluye superRefine condicional
 * para permitir actualizaciones parciales sin re-enviar todos los datos.
 *
 * Nota: Si se cambia `periodoRetiro`, el servicio recalcula `fechaFinRetiro`
 * y reevalúa el estado del animal.
 */
export const eventoSanitarioUpdateSchema = eventoSanitarioCreateSchema
  .innerType()
  .partial();

// ─────────────────────────────────────────────
// SCHEMA DE QUERY PARAMS (GET con filtros)
// ─────────────────────────────────────────────

/**
 * Schema Zod para validar query params del listado de eventos.
 * Todos los campos son opcionales. Los numéricos se coercionan desde strings.
 */
export const eventoSanitarioQuerySchema = z.object({
  tipo: z
    .enum(TIPOS_EVENTO_SANITARIO)
    .optional(),

  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),

  /** Si "true", filtra solo animales con período de retiro aún activo. */
  conRetiroActivo: z
    .string()
    .transform((val) => val === 'true')
    .optional(),

  page: z.coerce
    .number()
    .int()
    .positive()
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100, 'El límite máximo por página es 100.')
    .default(20),
});

// ─────────────────────────────────────────────
// TIPOS INFERIDOS (DTOs)
// ─────────────────────────────────────────────

/** DTO de entrada para crear un EventoSanitario. */
export type CreateEventoSanitarioDto = z.infer<typeof eventoSanitarioCreateSchema>;

/** DTO de entrada para actualizar un EventoSanitario (todos los campos opcionales). */
export type UpdateEventoSanitarioDto = z.infer<typeof eventoSanitarioUpdateSchema>;

/** DTO de filtros para el listado de EventoSanitario. */
export type EventoSanitarioQueryDto = z.infer<typeof eventoSanitarioQuerySchema>;

// ─────────────────────────────────────────────
// SCHEMA DE LOTE (RN-013)
// ─────────────────────────────────────────────

export const eventoSanitarioLoteSchema = z.object({
  animalIds: z.array(z.number().int().positive()).min(1, 'Debe especificar al menos un animal.'),
  evento: eventoSanitarioCreateSchema
});

export type CreateEventoLoteDto = z.infer<typeof eventoSanitarioLoteSchema>;
