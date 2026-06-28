/**
 * @file frontend/src/pages/Login.tsx
 * @description Pantalla oficial de Inicio de Sesión.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, LogIn, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authService } from '../features/auth/api/auth.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

// Esquema de validación estricto
const loginSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio').email('Formato de correo inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.login);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setGlobalError(null);
      const response = await authService.login(data);
      
      // Persistir token y data del usuario
      // response ya es el body del backend: { success, data: { accessToken, user, expiresIn } }
      const { accessToken, user: userData } = response.data;
      loginAction(userData, accessToken, '');
      
      // Redirigir al dashboard
      navigate('/', { replace: true });
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Error de conexión. Revisa tus credenciales.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="glass-panel p-8 sm:p-10 rounded-2xl w-full max-w-md animate-fade-in relative overflow-hidden">
        {/* Adorno brillante en la esquina */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-green-500 rounded-full blur-[60px] opacity-30"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="bg-[var(--primary)]/20 p-4 rounded-full mb-4 border border-[var(--primary)]/30 shadow-[0_0_15px_rgba(46,159,91,0.3)]">
            <Activity className="w-10 h-10 text-[var(--primary)]" />
          </div>
          <h1 className="text-center text-3xl font-bold text-white tracking-tight">Trazabilidad Bovina</h1>
          <p className="text-[var(--text-muted)] text-center mt-2 font-medium">Acceso Seguro al Sistema</p>
        </div>

        {globalError && (
          <div className="mb-6 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-3 rounded-lg flex items-start gap-3 relative z-10">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Correo Electrónico</label>
            <input
              type="email"
              className="input-glass w-full rounded-lg px-4 py-3 text-sm"
              placeholder="admin@granja.com"
              {...register('email')}
            />
            {errors.email && <span className="text-red-400 text-xs mt-1 block">{errors.email.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1.5">Contraseña</label>
            <input
              type="password"
              className="input-glass w-full rounded-lg px-4 py-3 text-sm"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && <span className="text-red-400 text-xs mt-1 block">{errors.password.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary w-full rounded-lg py-3 flex items-center justify-center gap-2 font-semibold shadow-[0_0_15px_rgba(46,159,91,0.4)] disabled:opacity-70 mt-4"
          >
            <LogIn className="w-5 h-5" />
            <span>{isSubmitting ? 'Iniciando...' : 'Ingresar'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
