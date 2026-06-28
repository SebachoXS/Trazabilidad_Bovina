/**
 * @file backend/src/validators/reporte.validator.ts
 * @description Esquemas de validación para consultas de reportes.
 */

import { z } from 'zod';

export const reporteQuerySchema = z.object({
  predioId: z.coerce.number().int().positive('El predioId debe ser un ID válido').optional(),
  propietarioId: z.coerce.number().int().positive('El propietarioId debe ser un ID válido').optional(),
  fechaDesde: z.coerce.date().optional(),
  fechaHasta: z.coerce.date().optional(),
  formato: z.enum(['json', 'csv', 'pdf']).default('json'),
});

export type ReporteQueryDto = z.infer<typeof reporteQuerySchema>;
