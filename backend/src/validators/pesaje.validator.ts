/**
 * @file backend/src/validators/pesaje.validator.ts
 * @description Validadores Zod para la entidad Pesaje.
 */

import { z } from 'zod';

export const pesajeCreateSchema = z.object({
  fecha: z.coerce.date({ required_error: 'La fecha del pesaje es obligatoria.' }),
  peso: z
    .number({ required_error: 'El peso es obligatorio.' })
    .positive('El peso debe ser positivo.')
    .max(2000, 'El peso no puede superar los 2000 kg.'),
  condicionCorporal: z
    .number()
    .min(1, 'Mínimo 1.0').max(5, 'Máximo 5.0')
    .multipleOf(0.5, 'Valores en pasos de 0.5 (1.0, 1.5, 2.0, ...)')
    .optional()
    .nullable(),
  metodoMedicion: z.enum(['BASCULA', 'CINTA_BOVINOMETRICA', 'CINTA_ZOOMETRICA']).optional().nullable(),
  perimetroToracico: z.number().positive().optional().nullable(),
  longitudCorporal: z.number().positive().optional().nullable(),
  observaciones: z.string().max(500).optional().nullable(),
  animalId: z.number().int().positive('El ID del animal es obligatorio.'),
});

export const pesajeQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  animalId: z.coerce.number().int().positive().optional(),
});

export type CreatePesajeDto = z.infer<typeof pesajeCreateSchema>;
export type PesajeQueryDto = z.infer<typeof pesajeQuerySchema>;

export const desteteSchema = z.object({
  fecha: z.coerce.date({ required_error: 'La fecha del destete es obligatoria.' }),
  metodo: z.enum(['DIRECTO', 'DIFERENCIA', 'ZOOMETRICO'], { required_error: 'Debe especificar el método de destete.' }),
  peso: z.number().positive().optional(),
  perimetroToracico: z.number().positive().optional(),
  longitudCorporal: z.number().positive().optional(),
  observaciones: z.string().max(500).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.metodo === 'ZOOMETRICO') {
    if (!data.perimetroToracico || !data.longitudCorporal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metodo'],
        message: 'Para el Método Zoométrico se requieren el perímetro torácico y la longitud corporal.',
      });
    }
  } else {
    if (!data.peso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['peso'],
        message: 'Para los métodos DIRECTO o DIFERENCIA debe especificar el peso.',
      });
    }
  }
});

export type DesteteDto = z.infer<typeof desteteSchema>;
