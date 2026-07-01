/**
 * @file frontend/src/pages/Register.tsx
 * @description Pantalla pública de Registro.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../features/auth/api/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().min(1, 'El correo es obligatorio').email('Formato de correo inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres.')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Debe contener al menos una mayúscula, una minúscula, un número y un carácter especial.'
    ),
  rol: z.enum(['PROPIETARIO', 'VETERINARIO', 'OPERARIO'], { required_error: 'Selecciona un rol válido' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setGlobalError(null);
      setSuccessMsg(null);
      const response = await authService.register(data);
      setSuccessMsg(response.message || 'Tu solicitud ha sido enviada al Administrador del predio. Recibirás acceso cuando sea aprobada');
    } catch (err: any) {
      let errorMessage = err.response?.data?.error?.message || err.response?.data?.message || 'Error al enviar la solicitud.';
      const issues = err.response?.data?.error?.details?.issues;
      if (issues && Array.isArray(issues)) {
        errorMessage = issues.map((i: any) => i.message).join(' | ');
      } else if (err.response?.data?.error?.details?.message) {
        errorMessage = err.response.data.error.details.message;
      } else if (typeof err.response?.data?.error?.details === 'string') {
        errorMessage = err.response.data.error.details;
      }
      setGlobalError(errorMessage);
    }
  };

  return (
    <div className="glass-panel p-8 sm:p-10 rounded-brand-xl shadow-xl border border-white/10 w-full">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-primary/10 p-4 rounded-full mb-4">
          <Activity className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-center text-3xl font-bold text-white">Registro</h1>
        <p className="text-[var(--text-muted)] text-center mt-2">Solicita acceso al sistema</p>
      </div>

      {globalError && (
        <div className="mb-6 p-4 bg-danger/10 text-danger border border-danger/20 rounded-brand-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{globalError}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600 w-5 h-5 flex-shrink-0" />
          <p className="text-green-800 font-medium text-sm">{successMsg}</p>
        </div>
      )}

      {!successMsg && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Nombre Completo"
            {...register('nombre')}
            error={errors.nombre?.message}
            placeholder="Ej. Juan Pérez"
          />

          <Input
            label="Correo Electrónico"
            type="email"
            {...register('email')}
            error={errors.email?.message}
            placeholder="tu@email.com"
          />

          <Input
            label="Contraseña"
            type="password"
            {...register('password')}
            error={errors.password?.message}
            placeholder="••••••••"
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-white">Rol Solicitado</label>
            <select
              {...register('rol')}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base input-glass [&>option]:bg-white [&>option]:text-gray-900 sm:text-sm rounded-md"
            >
              <option value="">Selecciona un rol</option>
              <option value="PROPIETARIO">Propietario</option>
              <option value="VETERINARIO">Veterinario</option>
              <option value="OPERARIO">Operario</option>
            </select>
            {errors.rol && <p className="mt-1 text-sm text-danger">{errors.rol.message}</p>}
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <UserPlus className="w-5 h-5 mr-2" />
            Enviar Solicitud
          </Button>
        </form>
      )}

      <div className="mt-4 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          ¿Ya tienes cuenta aprobada?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-white transition-colors">
            Inicia Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
