/**
 * @file frontend/src/features/movements/components/MovementModal.tsx
 * @description Modal para registrar movimientos de animales.
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useCreateMovement } from '../hooks/useCreateMovement';
import { adminService } from '../../admin/api/admin.service';
import { animalsService } from '../../animals/api/animals.service';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';

// Esquema Zod basado en backend
const movementSchema = z.object({
  tipo: z.enum([
    'TRASLADO_INTERNO',
    'TRASLADO_EXTERNO',
    'CAMBIO_PROPIETARIO',
    'INGRESO',
    'EGRESO_SACRIFICIO',
  ], { required_error: 'El tipo es obligatorio' }),
  fecha: z.string({ required_error: 'La fecha es obligatoria' }),
  predioOrigenId: z.number().optional(),
  predioDestinoId: z.union([z.number(), z.literal('EXTERNO')]).optional(),
  destinoExterno: z.string().optional(),
  numeroGuia: z.string().optional(),
  pesoMovimiento: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  transportista: z.string().optional(),
  motivoEgreso: z.string().optional(),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).superRefine((data, ctx) => {
  if (data.predioDestinoId === 'EXTERNO' && !data.destinoExterno) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destinoExterno'],
      message: 'Especifica el destino externo.',
    });
  }
});

type MovementFormValues = z.infer<typeof movementSchema>;

interface MovementModalProps {
  animalId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export function MovementModal({ animalId, isOpen, onClose }: MovementModalProps) {
  const { mutateAsync, isPending } = useCreateMovement(animalId);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { data: prediosResponse } = useQuery({
    queryKey: ['SUPER_ADMIN', 'PROPIETARIO', 'predios'],
    queryFn: () => adminService.getPredios(),
  });

  const { data: animalData, isLoading: isLoadingAnimal, isError: isErrorAnimal } = useQuery({
    queryKey: ['animal', animalId],
    queryFn: () => animalsService.getAnimalById(animalId as number),
    enabled: !!animalId
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      tipo: 'TRASLADO_INTERNO',
      fecha: new Date().toISOString().split('T')[0],
    }
  });

  // Auto-fill origin predio when animal data loads
  React.useEffect(() => {
    if (animalData?.data?.predioId) {
      setValue('predioOrigenId', animalData.data.predioId);
    }
  }, [animalData, setValue]);

  const tipoSeleccionado = watch('tipo');
  const predioDestinoSeleccionado = watch('predioDestinoId');
  const esExterno = ['TRASLADO_EXTERNO', 'CAMBIO_PROPIETARIO', 'EGRESO_SACRIFICIO'].includes(tipoSeleccionado);

  const onSubmit = async (data: MovementFormValues) => {
    try {
      setGlobalError(null);
      
      const cleanData = { ...data } as any;
      
      if (cleanData.predioDestinoId === 'EXTERNO') {
        cleanData.predioDestinoId = undefined;
        cleanData.observaciones = `${cleanData.observaciones || ''} | Destino Externo: ${cleanData.destinoExterno}`.trim();
      }
      delete cleanData.destinoExterno;
      
      // Remove empty strings
      Object.keys(cleanData).forEach(k => {
        if (cleanData[k] === '') cleanData[k] = undefined;
      });

      await mutateAsync(cleanData);
      
      toast.success('Movimiento registrado correctamente');
      reset();
      onClose();
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Error al intentar guardar el movimiento.');
      toast.error('Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-2xl rounded-brand-xl flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-950">Registrar Movimiento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {globalError && (
            <div className="mb-4 bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-brand flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{globalError}</span>
            </div>
          )}

          <form id="movement-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo de Movimiento"
                options={[
                  { value: 'TRASLADO_INTERNO', label: 'Traslado Interno (Potreros)' },
                  { value: 'TRASLADO_EXTERNO', label: 'Traslado Externo' },
                  { value: 'CAMBIO_PROPIETARIO', label: 'Cambio de Propietario (Venta)' },
                  { value: 'INGRESO', label: 'Ingreso al Predio' },
                  { value: 'EGRESO_SACRIFICIO', label: 'Egreso a Sacrificio (Matadero)' },
                ]}
                {...register('tipo')}
                error={errors.tipo?.message}
              />
              <Input
                label="Fecha del Movimiento"
                type="date"
                {...register('fecha')}
                error={errors.fecha?.message}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Predio Origen"
                disabled
                options={
                  isLoadingAnimal ? [{ value: '', label: 'Cargando origen...' }] :
                  isErrorAnimal || !animalData?.data?.predioId ? [{ value: '', label: 'No se pudo cargar el origen' }] :
                  [{ value: animalData.data.predioId.toString(), label: animalData.data.predio?.nombre || `Predio Actual (${animalData.data.predioId})` }]
                }
                {...register('predioOrigenId', { valueAsNumber: true })}
                error={errors.predioOrigenId?.message}
              />
              <div className="space-y-2">
                <Select
                  label="Predio Destino"
                  options={[
                    { value: '', label: 'Seleccione un destino...' },
                    ...(prediosResponse?.data?.map(p => ({ value: p.id.toString(), label: p.nombre })) || []),
                    { value: 'EXTERNO', label: '* Predio Externo / Tercero' }
                  ]}
                  {...register('predioDestinoId', {
                    setValueAs: v => v === 'EXTERNO' ? 'EXTERNO' : v ? Number(v) : undefined
                  })}
                  error={errors.predioDestinoId?.message}
                />
                {predioDestinoSeleccionado === 'EXTERNO' && (
                  <Input
                    placeholder="Escriba el nombre del destino..."
                    {...register('destinoExterno')}
                    error={errors.destinoExterno?.message}
                  />
                )}
              </div>
            </div>

            {/* Datos adicionales para externos */}
            <div className={`p-4 border rounded-brand space-y-4 ${esExterno ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className="text-sm font-semibold text-gray-950 flex items-center gap-2">
                Datos de Transporte y Control Externo
                {esExterno && <span className="text-amber-600 text-xs">*Auto-generado si vacío</span>}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Número de Guía Oficial"
                  placeholder="Ej: GUIA-12345 (Vacío para autogenerar)"
                  {...register('numeroGuia')}
                  error={errors.numeroGuia?.message}
                />
                <Input
                  label="Peso de Embarque / Origen (kg)"
                  type="number"
                  step="0.1"
                  {...register('pesoMovimiento')}
                  error={errors.pesoMovimiento?.message}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Transportista / Placa Vehículo"
                    placeholder="Ej: Pedro P. - ABC-123"
                    {...register('transportista')}
                    error={errors.transportista?.message}
                  />
                </div>
              </div>
            </div>

            <Textarea
              label="Motivo o Observaciones"
              placeholder="Detalles sobre el motivo del movimiento..."
              {...register('observaciones')}
              error={errors.observaciones?.message}
            />

          </form>
        </div>

        {/* Footer Modal */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-brand-xl bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="movement-form" isLoading={isPending}>
            <Save className="w-5 h-5 mr-2" />
            Guardar Movimiento
          </Button>
        </div>

      </div>
    </div>
  );
}
