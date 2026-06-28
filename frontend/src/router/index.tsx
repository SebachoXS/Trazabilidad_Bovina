/**
 * @file frontend/src/router/index.tsx
 * @description Configuración de React Router.
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import AnimalsList from '../pages/AnimalsList';
import AnimalProfile from '../pages/AnimalProfile';
import AnimalCreate from '../pages/AnimalCreate';
import Dashboard from '../pages/Dashboard';
import EventosLote from '../pages/EventosLote';
import Reports from '../pages/Reports';
import Users from '../pages/Users';
import { RoleGuard } from '../features/auth/components/RoleGuard';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Login />
      }
    ]
  },
  {
    path: '/register',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <Register />
      }
    ]
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'dashboard',
        element: <Dashboard />
      },
      {
        path: 'animales',
        element: <AnimalsList />
      },
      {
        path: 'animales/nuevo',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO']}>
            <AnimalCreate />
          </RoleGuard>
        )
      },
      {
        path: 'animales/:id',
        element: <AnimalProfile />
      },
      {
        path: 'eventos-lote',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO']}>
            <EventosLote />
          </RoleGuard>
        )
      },
      {
        path: 'reportes',
        element: <Reports /> // Reportes tiene pestañas. Las protegemos en la UI.
      },
      {
        path: 'usuarios',
        element: (
          <RoleGuard allowedRoles={['SUPER_ADMIN', 'PROPIETARIO']}>
            <Users />
          </RoleGuard>
        )
      }
    ]
  }
]);
