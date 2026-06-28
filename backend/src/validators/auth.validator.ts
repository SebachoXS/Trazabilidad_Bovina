import { z } from 'zod';

/**
 * Esquema para la autenticación (Login).
 */
export const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(1, 'La contraseña es requerida.'),
});

/**
 * Esquema para la creación de un nuevo Usuario.
 * Aplicado por ADMIN para crear roles.
 */
export const createUsuarioSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.').max(200),
  email: z.string().email('Correo electrónico inválido.'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.'
    ),
  rol: z.enum(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO', 'CLIENTE'], {
    required_error: 'El rol es obligatorio.',
    invalid_type_error: 'Rol no válido.',
  }),
  propietarioId: z.number().int().positive('El propietarioId debe ser un número positivo.').optional(),
  prediosAsignados: z.array(z.number().int().positive()).optional(),
  predioId: z.union([z.number().positive(), z.literal('NEW')]).optional(),
  nombrePredio: z.string().optional(),
  ubicacionPredio: z.string().optional(),
});

export type LoginDto = z.infer<typeof loginSchema>;
export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
