/**
 * @file backend/src/validators/animal.validator.ts
 * @description Validadores Zod para la entidad Animal.
 * RN-001: El código visual debe tener exactamente 10 dígitos y ser inmutable.
 */

import { z } from 'zod';

export const codigoVisualSchema = z
  .string({
    required_error: 'El código visual es obligatorio.',
    invalid_type_error: 'El código visual debe ser texto.',
  })
  .length(10, 'El código visual debe tener exactamente 10 dígitos.')
  .regex(/^\d{10}$/, 'El código visual debe contener únicamente dígitos numéricos (0-9).');

export const animalCreateSchema = z.object({
  codigoVisual: codigoVisualSchema,
  nombre: z.string().max(100).optional(),
  raza: z.string().min(1, 'La raza es obligatoria.').max(100).toUpperCase().refine((val) => val === 'CHAROLAIS', { message: 'RAZA_NO_SOPORTADA' }),
  sexo: z.enum(['MACHO', 'HEMBRA'], { required_error: 'El sexo es obligatorio.' }),
  fechaNacimiento: z.coerce.date().optional(),
  pesoNacimiento: z.number().positive().optional(),
  predioId: z.number().int().positive('El predioId debe ser un número positivo.'),
  madreId: z.number().int().positive().optional(),
  padreId: z.number().int().positive().optional(),
  esToroCatalogo: z.boolean().default(false),
  isGestante: z.boolean().default(false),
  registrarIngreso: z.boolean().default(false),
  numeroGuiaIngreso: z.string().max(100).optional(),
});

/**
 * PATCH: codigoVisual NUNCA puede modificarse (RN-001).
 * predioId tampoco se puede modificar directamente aquí (requiere movimiento de TRASLADO).
 */
export const animalUpdateSchema = animalCreateSchema
  .omit({ codigoVisual: true, predioId: true })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Debe enviar al menos un campo para actualizar.'
  );

/**
 * Query params para búsqueda y filtrado de animales.
 */
export const animalQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(10000).default(20),
  estado: z.enum(['ACTIVO', 'EN_RETIRO', 'GESTANTE', 'VENDIDO', 'MUERTO']).optional(),
  sexo: z.enum(['MACHO', 'HEMBRA']).optional(),
  raza: z.string().optional(),
  predioId: z.coerce.number().int().positive().optional(),
  propietarioId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['codigoVisual', 'fechaNacimiento', 'updatedAt']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAnimalDto = z.infer<typeof animalCreateSchema>;
export type UpdateAnimalDto = z.infer<typeof animalUpdateSchema>;
export type AnimalQueryDto = z.infer<typeof animalQuerySchema>;
