/**
 * @file frontend/src/layouts/MainLayout.tsx
 * @description Layout principal post-login (Dashboard).
 */

import { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCanAccess } from '../features/auth/hooks/useCanAccess';
import { LogOut, LayoutDashboard, Users, FileText, Menu, X, Shield, Syringe } from 'lucide-react';
import { SearchBar } from '../components/ui/SearchBar';
import { GlobalFilters } from '../components/ui/GlobalFilters';

export default function MainLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const canAccessEventosLote = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO']);
  const canAccessUsuarios = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO']);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 shadow-sm p-4 flex flex-col gap-4 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Trazabilidad Bovina</h1>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-[var(--text-muted)] hover:bg-white/10 rounded-brand transition-colors"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
        <div className="w-full">
          <SearchBar />
        </div>
      </header>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-200 hidden md:block">
          <h1 className="text-xl font-bold text-primary">Trazabilidad Bovina</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Gestión Ganadera</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <NavLink 
            to="/dashboard" 
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-brand font-medium transition-colors ${isActive ? 'bg-emerald-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </NavLink>
          <NavLink 
            to="/animales" 
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-brand font-medium transition-colors ${isActive ? 'bg-emerald-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Users className="w-5 h-5" />
            Animales
          </NavLink>
          {canAccessEventosLote && (
            <NavLink 
              to="/eventos-lote" 
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-brand font-medium transition-colors ${isActive ? 'bg-emerald-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Syringe className="w-5 h-5" />
              Eventos Lote
            </NavLink>
          )}

          <NavLink 
            to="/reportes" 
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-brand font-medium transition-colors ${isActive ? 'bg-emerald-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <FileText className="w-5 h-5" />
            Reportes
          </NavLink>
          {canAccessUsuarios && (
            <NavLink 
              to="/usuarios" 
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-brand font-medium transition-colors ${isActive ? 'bg-emerald-50 text-primary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <Shield className="w-5 h-5" />
              Usuarios
            </NavLink>
          )}
        </nav>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-gray-200">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.nombre}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 rounded-brand transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto flex flex-col">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
          <div className="flex-1">
            <GlobalFilters />
          </div>
          <div className="w-96 ml-4">
            <SearchBar />
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
