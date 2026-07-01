/**
 * @file backend/src/validators/admin.validator.ts
 * @description Validadores Zod para Propietarios, Predios y Usuarios.
 */

import { z } from 'zod';
import { createUsuarioSchema } from './auth.validator';

// ── PROPIETARIOS ───────────────────────────────────────────────────────────────

export const propietarioCreateSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(200),
  documento: z.string().min(5, 'El documento debe tener al menos 5 caracteres.').max(50),
  telefono: z.string().max(20).optional(),
  email: z.string().email('Correo electrónico inválido.').optional().nullable(),
  direccion: z.string().max(255).optional(),
});

export const propietarioUpdateSchema = propietarioCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviar al menos un campo para actualizar.'
);

// ── PREDIOS ───────────────────────────────────────────────────────────────────

export const predioCreateSchema = z.object({
  nombre: z.string().min(2),
  codigo: z.string().min(2),
  municipio: z.string().optional(), // mantenido por compatibilidad
  departamento: z.string().optional(), // mantenido por compatibilidad
  provincia: z.string().optional(),
  canton: z.string().optional(),
  parroquia: z.string().optional(),
  coordenadas: z.string().optional(),
  area: z.number().positive().optional(),
  propietarioId: z.number().int().positive().optional(),
});

export const predioRechazarSchema = z.object({
  motivoRechazo: z.string().min(5, 'El motivo de rechazo debe ser claro y conciso.'),
});

export const predioUpdateSchema = predioCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  'Debe enviar al menos un campo para actualizar.'
);

// ── USUARIOS ──────────────────────────────────────────────────────────────────

// Reexportamos createUsuarioSchema desde auth para mantener semántica centralizada
export { createUsuarioSchema };

export const usuarioUpdateSchema = createUsuarioSchema
  .omit({ password: true })
  .partial()
  .refine(
    (data) => Object.keys(data).length > 0,
    'Debe enviar al menos un campo para actualizar.'
  );

export const usuarioToggleSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio.' }),
});

export type CreatePropietarioDto = z.infer<typeof propietarioCreateSchema>;
export type UpdatePropietarioDto = z.infer<typeof propietarioUpdateSchema>;
export type CreatePredioDto = z.infer<typeof predioCreateSchema>;
export type UpdatePredioDto = z.infer<typeof predioUpdateSchema>;
export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof usuarioUpdateSchema>;
