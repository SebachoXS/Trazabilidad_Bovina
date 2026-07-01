import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { animalsService } from '../features/animals/api/animals.service';
import { useCreateBatchEvent } from '../features/health/hooks/useCreateBatchEvent';
import { Loader2, Syringe, Save, CheckSquare, Square, AlertTriangle, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { GuiaMovilizacionForm } from '../features/movements/components/GuiaMovilizacionForm';
import { HistorialGuias } from '../features/movements/components/HistorialGuias';
import { useCanAccess } from '../features/auth/hooks/useCanAccess';

const batchEventSchema = z.object({
  tipo: z.enum(['VACUNACION', 'TRATAMIENTO', 'DIAGNOSTICO', 'DESPARASITACION', 'CIRUGIA']),
  fecha: z.string({ required_error: 'La fecha es requerida' }),
  producto: z.string().optional(),
  laboratorio: z.string().optional(),
  periodoRetiro: z.preprocess((val) => (val ? Number(val) : 0), z.number().min(0)),
  observaciones: z.string().max(500).optional(),
});

type BatchEventFormValues = z.infer<typeof batchEventSchema>;

export default function EventosLote() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'sanidad' | 'movimientos' | 'historial-guias'>('sanidad');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const canAccessMovimientos = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO']);
  
  const { data: animalsData, isLoading: animalsLoading, isError: animalsError } = useQuery({
    queryKey: ['animales', 'lote'],
    queryFn: () => animalsService.getAnimales(1, 1000, { estado: 'ACTIVO' })
  });

  const { mutateAsync, isPending } = useCreateBatchEvent();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BatchEventFormValues>({
    resolver: zodResolver(batchEventSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      periodoRetiro: 0,
      tipo: 'VACUNACION'
    }
  });

  const animals = animalsData?.data || [];

  const handleSelectAll = () => {
    if (selectedIds.size === animals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(animals.map(a => a.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const onSubmitSanidad = async (data: BatchEventFormValues) => {
    if (selectedIds.size === 0) {
      toast.error('Debes seleccionar al menos un animal.');
      return;
    }

    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
      ) as any;

      if (cleanData.diasRetiro !== undefined && cleanData.diasRetiro !== null) {
        cleanData.diasRetiro = parseInt(cleanData.diasRetiro, 10);
      } else {
        cleanData.diasRetiro = null;
      }
      
      if (cleanData.fecha) {
        cleanData.fecha = new Date(cleanData.fecha).toISOString();
      }

      const animalIdsArray = Array.from(selectedIds).map(id => parseInt(id as string, 10));

      await mutateAsync({
        animalIds: animalIdsArray,
        evento: cleanData
      });

      toast.success(`Evento registrado correctamente para ${selectedIds.size} animales.`);
      reset();
      setSelectedIds(new Set());
      
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      navigate('/');
    } catch (err: any) {
      const errorPayload = err.response?.data?.error || err.response?.data || err.message;
      const msg = typeof errorPayload === 'object' ? JSON.stringify(errorPayload, null, 2) : errorPayload;
      toast.error("Error del servidor: " + msg);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in p-2 sm:p-4">
      <div className="bg-white p-8 rounded-2xl relative overflow-hidden border border-gray-200 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600">
            <Syringe className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-950">Eventos por Lote</h1>
            <p className="text-gray-600 mt-1">Registra eventos sanitarios o emite guías de movilización masivas.</p>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTab('sanidad')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'sanidad' ? 'bg-indigo-50 text-indigo-800 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          <Syringe className="w-4 h-4" /> Sanidad (Tratamientos/Vacunaciones)
        </button>
        {canAccessMovimientos && (
          <button 
            onClick={() => setActiveTab('movimientos')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'movimientos' ? 'bg-indigo-50 text-indigo-800 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <Truck className="w-4 h-4" /> Traslados / Guías (CSMI)
          </button>
        )}
        {canAccessMovimientos && (
          <button 
            onClick={() => setActiveTab('historial-guias')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'historial-guias' ? 'bg-indigo-50 text-indigo-800 border-b-2 border-indigo-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            <CheckSquare className="w-4 h-4" /> Historial de Guías Emitidas
          </button>
        )}
      </div>

      {activeTab === 'historial-guias' && (
        <HistorialGuias />
      )}

      {activeTab === 'sanidad' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Izquierdo: Selección de Animales (Solo para Sanidad) */}
          <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6 flex flex-col max-h-[700px]">
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-950">1. Seleccionar Animales</h2>
              <div className="text-sm text-gray-600 font-medium">
                {selectedIds.size} seleccionados
              </div>
            </div>
            
            {animalsError ? (
              <div className="bg-red-50 text-red-600 border border-red-200 p-6 rounded-xl flex flex-col items-center justify-center text-center m-6">
                <AlertTriangle className="w-10 h-10 mb-2" />
                <p className="font-bold">Error de conexión con el servidor.</p>
                <p className="text-sm mt-1">Verifica que el backend esté en ejecución (npm run dev) o revisa tu conexión a la red.</p>
              </div>
            ) : animalsLoading ? (
              <div className="flex-1 flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 pr-2 space-y-2">
                <div 
                  onClick={handleSelectAll}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 cursor-pointer border border-gray-200 transition-colors mb-4 bg-gray-50"
                >
                  {selectedIds.size > 0 && selectedIds.size === animals.length ? (
                    <CheckSquare className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Square className="w-6 h-6 text-gray-400" />
                  )}
                  <span className="font-bold text-gray-950">Seleccionar Todos ({animals.length})</span>
                </div>

                {animals.map(animal => (
                  <div 
                    key={animal.id}
                    onClick={() => toggleSelect(animal.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer border transition-colors ${selectedIds.has(animal.id) ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-gray-50 border-gray-200 bg-white'}`}
                  >
                    {selectedIds.has(animal.id) ? (
                      <CheckSquare className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <Square className="w-6 h-6 text-gray-400" />
                    )}
                    <div>
                      <p className="font-mono font-bold text-gray-950">{animal.codigoVisual}</p>
                      <p className="text-xs text-gray-600">Raza: {animal.raza} | Sexo: {animal.sexo}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel Derecho: Formulario Sanitario */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
              <h2 className="text-xl font-bold text-gray-950 mb-6 pb-4 border-b border-gray-200">2. Detalle del Evento Sanitario</h2>
              
              {selectedIds.size === 0 && (
                 <div className="mb-6 bg-yellow-50 text-yellow-800 border border-yellow-200 px-4 py-3 rounded-lg flex items-start gap-3">
                   <AlertTriangle className="w-5 h-5 shrink-0" />
                   <span className="text-sm font-medium">Debes seleccionar animales primero.</span>
                 </div>
              )}

              <form id="batch-form" onSubmit={handleSubmit(onSubmitSanidad)} className="space-y-4">
                <Select
                  label="Tipo de Evento"
                  options={[
                    { value: 'VACUNACION', label: 'Vacunación' },
                    { value: 'DESPARASITACION', label: 'Desparasitación' },
                    { value: 'TRATAMIENTO', label: 'Tratamiento' },
                  ]}
                  {...register('tipo')}
                  error={errors.tipo?.message}
                />

                <Input
                  label="Fecha"
                  type="date"
                  {...register('fecha')}
                  error={errors.fecha?.message}
                />

                <Input
                  label="Producto Administrado"
                  placeholder="Ej: Ivermectina"
                  {...register('producto')}
                  error={errors.producto?.message}
                />
                
                <Input
                  label="Laboratorio"
                  placeholder="Ej: Bayer"
                  {...register('laboratorio')}
                  error={errors.laboratorio?.message}
                />

                <Input
                  label="Días de Retiro Sanitario"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register('periodoRetiro')}
                  error={errors.periodoRetiro?.message}
                  helperText="Tiempo que el animal no será apto para consumo (RN-002)."
                />

                <Textarea
                  label="Observaciones"
                  placeholder="Notas generales..."
                  {...register('observaciones')}
                  error={errors.observaciones?.message}
                />

                <button 
                  type="submit" 
                  disabled={isPending || selectedIds.size === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold shadow-md disabled:opacity-50 mt-6 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  <span>{isPending ? 'Procesando Lote...' : 'Aplicar a Lote'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : activeTab === 'movimientos' && canAccessMovimientos ? (
        <div className="w-full">
           <GuiaMovilizacionForm 
              animalsData={animals} 
              isLoadingData={animalsLoading} 
              isErrorData={animalsError} 
              onSuccess={() => setActiveTab('historial-guias')}
           />
        </div>
      ) : null}
    </div>
  );
}
