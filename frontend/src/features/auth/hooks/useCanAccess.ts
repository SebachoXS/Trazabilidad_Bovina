import { useAuthStore } from '../../../store/authStore';

export type Rol = 'SUPER_ADMIN' | 'PROPIETARIO' | 'VETERINARIO' | 'OPERARIO' | 'CLIENTE';

export function useCanAccess(allowedRoles: Rol[]): boolean {
  const user = useAuthStore((state) => state.user);
  
  if (!user) return false;
  return allowedRoles.includes(user.rol as Rol);
}
