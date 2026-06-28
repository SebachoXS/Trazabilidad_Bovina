/**
 * @file backend/src/validators/movimiento.validator.ts
 * @description Validadores Zod para la entidad Movimiento.
 */

import { z } from 'zod';

const baseMovimientoSchema = z.object({
  tipo: z.enum([
    'TRASLADO_INTERNO',
    'TRASLADO_EXTERNO',
    'CAMBIO_PROPIETARIO',
    'INGRESO',
    'EGRESO_SACRIFICIO',
  ], { required_error: 'El tipo de movimiento es obligatorio.' }),
  fecha: z.coerce.date({ required_error: 'La fecha del movimiento es obligatoria.' }),
  animalId: z.number().int().positive('El animalId es obligatorio.'),
  predioOrigenId: z.number().int().positive().optional().nullable(),
  predioDestinoId: z.number().int().positive().optional().nullable(),
  numeroGuia: z.string().max(100).optional().nullable(),
  pesoMovimiento: z.number().positive('El peso debe ser positivo.').optional().nullable(),
  motivoEgreso: z.string().max(500).optional().nullable(),
  transportista: z.string().max(200).optional().nullable(),
  cedulaChofer: z.string().max(50).optional().nullable(),
  placaVehiculo: z.string().max(20).optional().nullable(),
  ruta: z.string().max(200).optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
});

export const movimientoCreateSchema = baseMovimientoSchema.superRefine((data, ctx) => {
  if (data.tipo === 'TRASLADO_INTERNO' && data.predioOrigenId === data.predioDestinoId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['predioDestinoId'],
      message: 'El predio de destino no puede ser igual al de origen en un traslado interno.',
    });
  }
});

export const movimientoBatchCreateSchema = z.object({
  animalIds: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos un animal.'),
  evento: baseMovimientoSchema.omit({ animalId: true }),
});

export const movimientoQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  animalId: z.coerce.number().int().positive().optional(),
  predioId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(['TRASLADO_INTERNO', 'TRASLADO_EXTERNO', 'CAMBIO_PROPIETARIO', 'INGRESO', 'EGRESO_SACRIFICIO']).optional(),
});

export type CreateMovimientoDto = z.infer<typeof movimientoCreateSchema>;
export type CreateMovimientoBatchDto = z.infer<typeof movimientoBatchCreateSchema>;
export type MovimientoQueryDto = z.infer<typeof movimientoQuerySchema>;
