/**
 * @file frontend/src/layouts/AuthLayout.tsx
 * @description Layout para pantallas de autenticación (Login).
 */

import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <main className="w-full max-w-md">
        <Outlet />
      </main>
    </div>
  );
}
