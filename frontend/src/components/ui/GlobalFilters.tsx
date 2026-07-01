import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useGlobalContext } from '../../store/globalContextStore';
import { adminService } from '../../features/admin/api/admin.service';
import { Select } from './Select';
import { Building2, MapPin } from 'lucide-react';
import type { PredioDTO } from '../../features/admin/api/admin.service';

export function GlobalFilters() {
  const { user } = useAuthStore();
  const { selectedPropietarioId, selectedPredioId, setPropietarioId, setPredioId } = useGlobalContext();
  
  const [predios, setPredios] = useState<PredioDTO[]>([]);
  const [propietarios, setPropietarios] = useState<{ id: number; nombre: string }[]>([]);

  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const isPropietario = user?.rol === 'PROPIETARIO';
  const isOperativo = ['VETERINARIO', 'OPERARIO', 'CLIENTE'].includes(user?.rol || '');

  useEffect(() => {
    // Cargar predios (el backend ya filtra por RBAC)
    adminService.getPredios().then((res) => {
      if (res.success) {
        setPredios(res.data);
        
        // Si el operativo solo tiene 1 predio asignado, forzar la selección
        if (isOperativo && res.data.length === 1) {
          setPredioId(res.data[0]!.id);
        }
      }
    });

    if (isSuperAdmin) {
      // Si existiese un servicio getPropietarios, lo usaríamos aquí. 
      // Por brevedad, si la API está expuesta, la llamamos:
      fetch('/api/v1/propietarios', {
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().accessToken}` }
      })
      .then(r => r.json())
      .then(res => {
        if (res.success) setPropietarios(res.data);
      }).catch(() => {});
    }
  }, [isSuperAdmin, isOperativo, setPredioId]);

  // Filtrar predios según el propietario seleccionado en cascada
  const filteredPredios = isSuperAdmin && selectedPropietarioId
    ? predios.filter(p => p.propietarioId === selectedPropietarioId)
    : predios;

  // Lógica para VETERINARIO/OPERARIO con 1 solo predio
  if (isOperativo && predios.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-gray-700">
        <MapPin className="w-4 h-4 text-primary" />
        Finca Actual: <span className="text-gray-900 font-bold">{predios[0]?.nombre}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      {isSuperAdmin && (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            className="input-glass text-sm py-1.5 pl-3 pr-8 rounded-md bg-white border-gray-300 focus:border-primary text-gray-900"
            value={selectedPropietarioId || ''}
            onChange={(e) => setPropietarioId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todos los Propietarios</option>
            {propietarios.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {(isSuperAdmin || isPropietario || (isOperativo && predios.length > 1)) && (
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            className="input-glass text-sm py-1.5 pl-3 pr-8 rounded-md bg-white border-gray-300 focus:border-primary text-gray-900"
            value={selectedPredioId || ''}
            onChange={(e) => setPredioId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas las Fincas</option>
            {filteredPredios.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {user?.rol === 'VETERINARIO' && (
        <button
          onClick={() => {
            // Forzamos el estado como si no tuviera predios para que Dashboard muestre el Lobby
            // O simplemente navegamos a una ruta de lobby (si existiera). 
            // Para mantenerlo simple, usaremos un modal o redirigimos.
            window.dispatchEvent(new CustomEvent('open-lobby-veterinario'));
          }}
          className="ml-2 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-sm font-medium rounded-md hover:bg-emerald-200 transition-colors flex items-center"
        >
          <Building2 className="w-4 h-4 mr-1.5" />
          Nueva Finca
        </button>
      )}
    </div>
  );
}
