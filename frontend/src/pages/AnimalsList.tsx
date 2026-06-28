/**
 * @file frontend/src/pages/AnimalsList.tsx
 * @description Página del Módulo 1 que visualiza la grilla del inventario bovino.
 */

import { Plus, Search, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAnimals } from '../features/animals/hooks/useAnimals';
import { animalsService } from '../features/animals/api/animals.service';
import { useAuthStore } from '../store/authStore';
import { useGlobalContext } from '../store/globalContextStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { useCanAccess } from '../features/auth/hooks/useCanAccess';

export default function AnimalsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore(state => state.user);
  const { selectedPredioId, selectedPropietarioId } = useGlobalContext();
  const isAdmin = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO']);
  const canCreate = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO']);

  const [activeTab, setActiveTab] = useState<'activos' | 'pendientes'>('activos');
  
  const { data, isLoading, isError } = useAnimals(1, 100, { 
    predioId: selectedPredioId === 'ALL' || !selectedPredioId ? undefined : Number(selectedPredioId), 
    propietarioId: selectedPropietarioId === 'ALL' || !selectedPropietarioId ? undefined : Number(selectedPropietarioId) 
  });

  const { mutateAsync: aprobar } = useMutation({
    mutationFn: animalsService.aprobarAlta,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['animales'] });
    },
    onError: () => toast.error('Error al aprobar animal')
  });

  const { mutateAsync: rechazar } = useMutation({
    mutationFn: animalsService.rechazarAlta,
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['animales'] });
    },
    onError: () => toast.error('Error al rechazar animal')
  });

  const animalesFull = data?.data || [];
  const activos = animalesFull.filter(a => a.estado !== 'PENDIENTE_APROBACION');
  const pendientes = animalesFull.filter(a => a.estado === 'PENDIENTE_APROBACION');

  const animalesAMostrar = activeTab === 'activos' ? activos : pendientes;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario Bovino</h1>
          <p className="text-gray-600 mt-1">Gestión y control del rebaño activo.</p>
        </div>
        {canCreate && (
          <Button className="shrink-0" onClick={() => navigate('/animales/nuevo')}>
            <Plus className="w-5 h-5" />
            Registrar Animal
          </Button>
        )}
      </div>

      {isAdmin && (
        <div className="flex gap-4 border-b border-gray-200">
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activos' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('activos')}
          >
            Inventario Activo
          </button>
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pendientes' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('pendientes')}
          >
            Validación de Aretes {pendientes.length > 0 && <span className="ml-2 bg-amber-100 text-amber-800 py-0.5 px-2 rounded-full text-xs">{pendientes.length}</span>}
          </button>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-brand border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input 
            className="pl-10" 
            placeholder="Buscar por código visual o nombre..." 
          />
        </div>
        {/* Futuros filtros: Raza, Estado, Sexo */}
      </div>

      {/* Grid / Content Section */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl flex flex-col items-center justify-center text-center max-w-lg mx-auto mt-10">
          <AlertTriangle className="w-12 h-12 mb-3" />
          <p className="font-bold text-lg">Error de conexión con el servidor.</p>
          <p className="text-sm mt-1">Verifica que el backend esté en ejecución (npm run dev) o revisa tu conexión a la red.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {animalesAMostrar.map((animal) => (
            <div 
              key={animal.id} 
              className="bg-white border border-gray-200 shadow-sm rounded-brand-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-mono text-xl font-bold text-gray-900">
                    {animal.codigoVisual}
                  </h3>
                  <p className="text-gray-600 font-medium truncate">
                    {animal.nombre || 'Sin nombre'}
                  </p>
                </div>
                {animal.estado === 'PENDIENTE_APROBACION' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Pendiente
                  </span>
                ) : (
                  <Badge estado={animal.estado as any} />
                )}
              </div>
              
              <div className="space-y-2 mt-4 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Raza:</span>
                  <span className="font-medium text-gray-900">{animal.raza}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sexo:</span>
                  <span className="font-medium text-gray-900">{animal.sexo}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nacimiento:</span>
                  <span className="font-medium text-gray-900">
                    {animal.fechaNacimiento 
                      ? new Date(animal.fechaNacimiento).toLocaleDateString() 
                      : 'Desconocido'}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                {activeTab === 'activos' ? (
                  <Button 
                    variant="outline" 
                    fullWidth 
                    className="text-sm"
                    onClick={() => navigate(`/animales/${animal.id}`)}
                  >
                    Ver Hoja de Vida
                  </Button>
                ) : isAdmin ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-red-400 border-red-900/50 hover:bg-red-900/20"
                      onClick={() => rechazar(animal.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                      onClick={() => aprobar(animal.id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {animalesAMostrar.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-500">
              No se encontraron animales registrados en el sistema.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
