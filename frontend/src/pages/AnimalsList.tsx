/**
 * @file frontend/src/pages/AnimalsList.tsx
 * @description Página del Módulo 1 que visualiza la grilla del inventario bovino.
 */

import { Plus, Search, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2, ArrowLeftCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAnimals } from '../features/animals/hooks/useAnimals';
import { animalsService } from '../features/animals/api/animals.service';
import { api } from '../services/api';
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

  const [activeTab, setActiveTab] = useState<'activos' | 'pendientes' | 'historial'>('activos');

  const [isBajaModalOpen, setIsBajaModalOpen] = useState(false);
  const [animalToBaja, setAnimalToBaja] = useState<number | null>(null);
  const [bajaMotivo, setBajaMotivo] = useState('Venta');
  const [bajaDetalle, setBajaDetalle] = useState('');

  const handleDarDeBaja = async () => {
    if (!animalToBaja) return;
    if (bajaMotivo === 'Otro' && !bajaDetalle) {
      toast.error('Debe especificar el detalle del motivo.');
      return;
    }
    try {
      await animalsService.darDeBaja(animalToBaja, bajaMotivo, bajaDetalle);
      toast.success('Animal dado de baja exitosamente');
      setIsBajaModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error('Error al dar de baja');
    }
  };

  const { data, isLoading, isError } = useAnimals(1, 100, { 
    predioId: selectedPredioId === 'ALL' || !selectedPredioId ? undefined : Number(selectedPredioId), 
    propietarioId: selectedPropietarioId === 'ALL' || !selectedPropietarioId ? undefined : Number(selectedPropietarioId) 
  });

  // Mutaciones desacopladas de React Query para máxima estabilidad

  const animalesFull = data?.data || [];
  const activos = animalesFull.filter(a => a.estado !== 'PENDIENTE_APROBACION' && a.estado !== 'DADO_DE_BAJA');
  const pendientes = animalesFull.filter(a => a.estado === 'PENDIENTE_APROBACION');
  const bajas = animalesFull.filter(a => a.estado === 'DADO_DE_BAJA');

  const animalesAMostrar = activeTab === 'activos' ? activos : activeTab === 'pendientes' ? pendientes : bajas;

  if ((user?.rol === 'VETERINARIO' || user?.rol === 'OPERARIO') && (!user.prediosAsignados || user.prediosAsignados.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-950">Acceso Restringido</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          Aún no tienes acceso a ninguna finca aprobada. Por favor, solicita acceso en tu Dashboard.
        </p>
        <Button onClick={() => navigate('/dashboard')} className="mt-6">Ir al Dashboard</Button>
      </div>
    );
  }

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
          <button
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'historial' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            onClick={() => setActiveTab('historial')}
          >
            Historial de Bajas {bajas.length > 0 && <span className="ml-2 bg-gray-100 text-gray-800 py-0.5 px-2 rounded-full text-xs">{bajas.length}</span>}
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
                  <span className="text-gray-500">Raza:</span>
                  <span className="font-medium text-gray-900">{animal.raza}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sexo:</span>
                  <span className="font-medium text-gray-900">{animal.sexo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nacimiento:</span>
                  <span className="font-medium text-gray-900">
                    {animal.fechaNacimiento 
                      ? new Date(animal.fechaNacimiento).toLocaleDateString() 
                      : 'Desconocido'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Propósito:</span>
                  <span className="font-medium text-gray-900">
                    {(() => {
                      const val = (animal as any).proposito;
                      if (!val) return 'No definido';
                      const map: Record<string, string> = {
                        'CARNE': 'Carne',
                        'LECHE': 'Leche',
                        'CRIA_GESTACION': 'Cría / Gestación',
                        'REPRODUCTOR_SEMENTAL': 'Reproductor (Semental)',
                        'DOBLE_PROPOSITO': 'Doble Propósito'
                      };
                      return map[val] || val;
                    })()}
                  </span>
                </div>
                {activeTab === 'historial' && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-md">
                    <div className="flex justify-between mb-1">
                      <span className="text-red-700 font-semibold text-xs uppercase tracking-wider">Motivo de Baja</span>
                      <span className="text-red-800 font-bold text-sm">{(animal as any).motivoBaja || 'N/A'}</span>
                    </div>
                    {(animal as any).detalleBaja && (
                      <p className="text-red-600 text-sm mt-1 mb-2">{(animal as any).detalleBaja}</p>
                    )}
                    <div className="flex justify-between border-t border-red-100 pt-2 mt-2">
                      <span className="text-red-700/70 text-xs">Fecha:</span>
                      <span className="text-red-700 text-xs font-medium">
                        {(animal as any).fechaBaja ? new Date((animal as any).fechaBaja).toLocaleDateString() : 'Desconocida'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
                {activeTab === 'activos' ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 text-sm"
                        onClick={() => navigate(`/animales/${animal.id}`)}
                      >
                        Ver Hoja de Vida
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          className="text-red-500 border-red-500 hover:bg-red-50"
                          title="Dar de Baja"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnimalToBaja(animal.id);
                            setBajaMotivo('Venta');
                            setBajaDetalle('');
                            setIsBajaModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {animal.estado === 'EN_TRANSITO' && (
                      <Button
                        variant="outline"
                        className="w-full bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 mt-1"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await api.patch(`/animales/${animal.id}/retorno`);
                            queryClient.invalidateQueries({ queryKey: ['animales'] });
                            toast.success('Animal retornado al predio exitosamente.');
                          } catch (err: any) {
                            console.error(err);
                            toast.error('Error al retornar el animal.');
                          }
                        }}
                      >
                        <ArrowLeftCircle className="w-4 h-4 mr-2" /> Finalizar Tránsito
                      </Button>
                    )}
                  </div>
                ) : activeTab === 'historial' ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-sm border-gray-300 text-gray-700 hover:bg-gray-50"
                      onClick={() => navigate(`/animales/${animal.id}`)}
                    >
                      Ver Hoja de Vida
                    </Button>
                  </div>
                ) : isAdmin ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 text-red-400 border-red-900/50 hover:bg-red-900/20"
                      onClick={async () => {
                        try {
                          await api.patch(`/animales/${animal.id}/rechazar-alta`);
                          window.location.reload();
                        } catch (err: any) {
                          const errorPayload = err.response?.data?.error || err.response?.data || err.message;
                          const msg = typeof errorPayload === 'object' ? JSON.stringify(errorPayload, null, 2) : errorPayload;
                          alert("Error exacto del servidor:\n" + msg);
                          console.error("Fallo detallado:", err);
                        }
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Rechazar
                    </Button>
                    <Button 
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white border-none"
                      onClick={async () => {
                        try {
                          if (!animal?.id) throw new Error("ID del animal no definido");
                          await api.patch(`/animales/${animal.id}/aprobar-alta`);
                          window.location.reload();
                        } catch (err: any) {
                          const errorPayload = err.response?.data?.error || err.response?.data || err.message;
                          const msg = typeof errorPayload === 'object' ? JSON.stringify(errorPayload, null, 2) : errorPayload;
                          alert("Error exacto del servidor:\n" + msg);
                          console.error("Fallo detallado:", err);
                        }
                      }}
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

      {/* Modal Dar de Baja */}
      {isBajaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Dar de Baja Animal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <select
                  className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-primary focus:border-primary outline-none"
                  value={bajaMotivo}
                  onChange={(e) => setBajaMotivo(e.target.value)}
                >
                  <option value="Venta">Venta</option>
                  <option value="Faenamiento">Faenamiento</option>
                  <option value="Muerte">Muerte</option>
                  <option value="Robo/Pérdida">Robo/Pérdida</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              {bajaMotivo === 'Otro' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Detalle</label>
                  <Input
                    type="text"
                    className="w-full"
                    value={bajaDetalle}
                    onChange={(e) => setBajaDetalle(e.target.value)}
                    placeholder="Especifique el motivo..."
                  />
                </div>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setIsBajaModalOpen(false)}>Cancelar</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white border-none" onClick={handleDarDeBaja}>Confirmar Baja</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
