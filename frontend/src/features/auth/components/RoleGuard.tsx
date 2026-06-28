import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCanAccess, type Rol } from '../hooks/useCanAccess';
import toast from 'react-hot-toast';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Rol[];
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard' }: RoleGuardProps) {
  const canAccess = useCanAccess(allowedRoles);

  if (!canAccess) {
    // Es posible que el componente se monte rápido, por lo que usamos un pequeño delay 
    // o simplemente lo lanzamos.
    setTimeout(() => toast.error('No tienes permisos para acceder a esta sección.'), 0);
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
