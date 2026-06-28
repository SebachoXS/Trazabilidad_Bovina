/**
 * @file frontend/src/pages/Dashboard.tsx
 * @description Vista principal y centro de control del sistema de Trazabilidad.
 */

import { useAuthStore } from '../store/authStore';
import { useGlobalContext } from '../store/globalContextStore';
import { useDashboardData } from '../features/dashboard/hooks/useDashboardData';
import { StatCard } from '../components/ui/StatCard';
import { Loader2, Users, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { selectedPredioId, selectedPropietarioId } = useGlobalContext();
  const { metrics, alertasRetiro, isLoading, isError } = useDashboardData({
    predioId: selectedPredioId || undefined,
    propietarioId: selectedPropietarioId || undefined
  });
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-32">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl flex flex-col items-center justify-center text-center max-w-lg mx-auto mt-10">
        <AlertTriangle className="w-12 h-12 mb-3" />
        <p className="font-bold text-lg">Error de conexión con el servidor.</p>
        <p className="text-sm mt-1">Verifica que el backend esté en ejecución (npm run dev) o revisa tu conexión a la red.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-fade-in p-2 sm:p-4">
      {/* Saludo */}
      <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary)] rounded-full blur-[100px] opacity-10"></div>
        <h1 className="text-3xl font-bold text-emerald-950 relative z-10">¡Bienvenido de vuelta, {user?.nombre}! 👋</h1>
        <p className="mt-2 text-emerald-800 text-lg relative z-10">
          Este es el resumen operativo de tu predio al día de hoy.
        </p>
      </div>

      {/* Fila de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Total Inventario</p>
            <h3 className="text-3xl font-bold text-gray-900">{metrics.totalAnimales}</h3>
            <p className="text-xs text-gray-500 mt-1">Cabezas registradas</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="bg-emerald-50 p-4 rounded-xl text-primary">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Animales Activos</p>
            <h3 className="text-3xl font-bold text-gray-900">{metrics.animalesActivos}</h3>
            <p className="text-xs text-gray-500 mt-1">Dentro del predio</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 shadow-sm p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
          <div className="bg-red-50 p-4 rounded-xl text-red-600">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-gray-600 text-sm font-medium">Alertas de Retiro</p>
            <h3 className="text-3xl font-bold text-gray-900">{metrics.animalesEnRiesgo}</h3>
            <p className="text-xs text-gray-500 mt-1">No aptos para consumo</p>
          </div>
        </div>
      </div>

      {/* Panel Inferior: Alertas Críticas */}
      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-red-100">
        <div className="bg-red-50 border-b border-red-100 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600 w-6 h-6 animate-pulse" />
            <h2 className="text-xl font-bold text-gray-900">Control de Retiro Sanitario</h2>
          </div>
        </div>
        
        <div className="p-0">
          {!Array.isArray(alertasRetiro) || alertasRetiro.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShieldCheck className="w-16 h-16 text-primary/50 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-900 mb-1">Todo en orden</p>
              <p>No hay animales en periodo de retiro farmacológico.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-600 uppercase tracking-wider bg-gray-50">
                    <th className="py-4 px-6 font-medium">Código Visual</th>
                    <th className="py-4 px-6 font-medium">Producto</th>
                    <th className="py-4 px-6 font-medium">Fin de Retiro</th>
                    <th className="py-4 px-6 font-medium text-right">Días Restantes</th>
                    <th className="py-4 px-6"></th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {(Array.isArray(alertasRetiro) ? alertasRetiro : []).filter(a => a.fechaFinRetiro).map((alerta) => {
                    const isValidDate = alerta.fechaFinRetiro && !isNaN(new Date(alerta.fechaFinRetiro).getTime());
                    
                    return (
                    <tr key={alerta.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-gray-900">
                        {alerta.codigoVisual}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {alerta.producto || 'No especificado'}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {isValidDate ? new Date(alerta.fechaFinRetiro).toLocaleDateString() : 'Fecha no definida'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          {alerta.diasRestantes || 0} días
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={() => navigate(`/animales/${alerta.id}`)}
                          className="text-primary hover:text-primary-hover transition-colors font-medium flex items-center justify-end gap-1 w-full"
                        >
                          Ver Perfil <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
