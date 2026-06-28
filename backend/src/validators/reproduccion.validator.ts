/**
 * @file backend/src/validators/reproduccion.validator.ts
 * @description Validadores Zod para la entidad EventoReproductivo (Partos, Inseminación, etc.).
 */

import { z } from 'zod';
import { codigoVisualSchema } from './animal.validator';

export const eventoReproductivoCreateSchema = z.object({
  tipo: z.enum(['INSEMINACION', 'MONTA', 'TACTO_GESTACION', 'PARTO', 'ABORTO']),
  fecha: z.coerce.date({ required_error: 'La fecha del evento es obligatoria.' }),
  toroId: z.number().int().positive().optional(),
  observaciones: z.string().max(500).optional(),
});

/**
 * RN-003: Esquema específico para registrar un parto, que exige
 * crear un ternero (Animal) asociado de manera atómica.
 */
export const partoCreateSchema = z.object({
  fecha: z.coerce.date({ required_error: 'La fecha del parto es obligatoria.' }),
  observaciones: z.string().max(500).optional(),
  
  // Datos del ternero a crear atómicamente
  ternero: z.object({
    codigoVisual: codigoVisualSchema,
    nombre: z.string().max(100).optional(),
    raza: z.string().min(1, 'La raza del ternero es obligatoria.').max(100).toUpperCase().refine((val) => val === 'CHAROLAIS', { message: 'RAZA_NO_SOPORTADA' }),
    sexo: z.enum(['MACHO', 'HEMBRA'], { required_error: 'El sexo del ternero es obligatorio.' }),
    pesoNacimiento: z.number().positive('El peso de nacimiento debe ser positivo.').optional(),
    padreId: z.number().int().positive().optional(),
  }),
});

export type CreateEventoReproductivoDto = z.infer<typeof eventoReproductivoCreateSchema>;
export type CreatePartoDto = z.infer<typeof partoCreateSchema>;
