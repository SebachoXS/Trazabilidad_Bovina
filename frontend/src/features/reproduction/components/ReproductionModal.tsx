/**
 * @file frontend/src/features/reproduction/components/ReproductionModal.tsx
 * @description Modal para registrar eventos reproductivos y partos (con creación atómica de terneros).
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateReproductionEvent } from '../hooks/useCreateReproductionEvent';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';
import { useQuery } from '@tanstack/react-query';
import { animalsService } from '../../animals/api/animals.service';

// Expresión regular para el Código Visual de 10 dígitos (CONSTITUTION §10.1)
const CODIGO_VISUAL_REGEX = /^\d{10}$/;

const reproductionSchema = z.object({
  tipo: z.enum(['INSEMINACION', 'MONTA', 'TACTO_GESTACION', 'PARTO', 'ABORTO'], {
    required_error: 'El tipo es obligatorio',
  }),
  fecha: z.string({
    required_error: 'La fecha es obligatoria',
  }),
  toroId: z.preprocess((val) => (val ? Number(val) : undefined), z.number().optional()),
  toroManual: z.string().optional(),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
  
  // Datos del ternero (solo aplicables si tipo === PARTO)
  terneroCodigoVisual: z.string().optional(),
  terneroRaza: z.string().optional(),
  terneroSexo: z.enum(['MACHO', 'HEMBRA']).optional(),
  terneroPeso: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
}).superRefine((data, ctx) => {
  if (data.tipo === 'PARTO') {
    if (!data.terneroCodigoVisual || !CODIGO_VISUAL_REGEX.test(data.terneroCodigoVisual)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['terneroCodigoVisual'],
        message: 'El ternero requiere un código visual válido (10 dígitos).',
      });
    }
    if (!data.terneroRaza) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['terneroRaza'],
        message: 'La raza del ternero es obligatoria en un parto.',
      });
    }
    if (!data.terneroSexo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['terneroSexo'],
        message: 'El sexo del ternero es obligatorio en un parto.',
      });
    }
  }
});

type ReproductionFormValues = z.infer<typeof reproductionSchema>;

interface ReproductionModalProps {
  animalId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export function ReproductionModal({ animalId, isOpen, onClose }: ReproductionModalProps) {
  const { mutateAsync, isPending } = useCreateReproductionEvent(animalId);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const { data: torosResponse } = useQuery({
    queryKey: ['animales', 'padres'],
    queryFn: () => animalsService.getAnimales(1, 100, { sexo: 'MACHO' }),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReproductionFormValues>({
    resolver: zodResolver(reproductionSchema),
    defaultValues: {
      tipo: 'INSEMINACION',
      fecha: new Date().toISOString().split('T')[0],
      terneroSexo: 'MACHO',
    }
  });

  const tipoSeleccionado = watch('tipo');
  const esParto = tipoSeleccionado === 'PARTO';
  const toroIdSeleccionado = watch('toroId');

  const torosOptions = [
    { value: '', label: 'Ninguno / Sin registro' },
    ...(torosResponse?.data?.map(t => ({
      value: t.id.toString(),
      label: `${t.codigoVisual} ${t.nombre ? `(${t.nombre})` : ''}`
    })) || []),
    { value: '-1', label: 'Otro / No Registrado (Ingreso Manual)' }
  ];

  const onSubmit = async (data: ReproductionFormValues) => {
    try {
      setGlobalError(null);
      
      let finalToroId = data.toroId === -1 ? undefined : data.toroId;
      let observacionesFinales = data.observaciones === '' ? undefined : data.observaciones;
      
      if (data.toroId === -1 && data.toroManual) {
        observacionesFinales = observacionesFinales 
          ? `${observacionesFinales}\n(Padre Manual: ${data.toroManual})` 
          : `(Padre Manual: ${data.toroManual})`;
      }

      const payload: any = {
        tipo: data.tipo,
        fecha: data.fecha,
        toroId: finalToroId,
        observaciones: observacionesFinales,
      };

      if (data.tipo === 'PARTO') {
        payload.ternero = {
          codigoVisual: data.terneroCodigoVisual,
          raza: data.terneroRaza,
          sexo: data.terneroSexo,
          pesoNacimiento: data.terneroPeso,
        };
      }

      await mutateAsync(payload);
      
      toast.success(esParto ? '¡Parto y Ternero registrados exitosamente!' : 'Evento reproductivo guardado');
      reset();
      onClose();
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || err.message || 'Error al intentar guardar el evento reproductivo.');
      toast.error('Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-2xl rounded-brand-xl flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Registrar Evento Reproductivo</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {globalError && (
            <div className="mb-4 bg-danger/10 text-danger border border-danger/20 px-4 py-3 rounded-brand flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{globalError}</span>
            </div>
          )}

          <form id="repro-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo de Evento"
                options={[
                  { value: 'INSEMINACION', label: 'Inseminación Artificial' },
                  { value: 'MONTA', label: 'Monta Natural' },
                  { value: 'TACTO_GESTACION', label: 'Tacto / Chequeo de Gestación' },
                  { value: 'PARTO', label: 'Parto (Nacimiento)' },
                  { value: 'ABORTO', label: 'Aborto' },
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
            </div>

            {/* Datos del Toro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Select
                  label="ID del Toro (Opcional)"
                  options={torosOptions}
                  {...register('toroId')}
                  error={errors.toroId?.message}
                />
                {toroIdSeleccionado === -1 && (
                  <div className="mt-2 animate-fade-in">
                    <Input
                      label="Nombre de Toro No Registrado"
                      placeholder="Ej: Toro Importado XYZ"
                      {...register('toroManual')}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Expansión Dinámica: Datos del Ternero */}
            {esParto && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-brand space-y-4">
                <h3 className="text-sm font-semibold text-emerald-900 flex items-center gap-2">
                  Registro de Nuevo Ternero
                  <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">Automático</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Código Visual del Ternero"
                    placeholder="10 dígitos numéricos"
                    maxLength={10}
                    {...register('terneroCodigoVisual')}
                    error={errors.terneroCodigoVisual?.message}
                  />
                  <Select
                    label="Sexo del Ternero"
                    options={[
                      { value: 'MACHO', label: 'Macho' },
                      { value: 'HEMBRA', label: 'Hembra' },
                    ]}
                    {...register('terneroSexo')}
                    error={errors.terneroSexo?.message}
                  />
                  <Input
                    label="Raza (Fija por sistema)"
                    readOnly
                    className="bg-gray-100 text-gray-700 font-bold border border-gray-300 cursor-not-allowed"
                    {...register('terneroRaza')}
                    error={errors.terneroRaza?.message}
                  />
                  <Input
                    label="Peso al Nacer (kg)"
                    type="number"
                    step="0.1"
                    placeholder="Ej: 35.5"
                    {...register('terneroPeso')}
                    error={errors.terneroPeso?.message}
                  />
                </div>
              </div>
            )}

            <Textarea
              label="Observaciones"
              placeholder="Detalles sobre el evento..."
              {...register('observaciones')}
              error={errors.observaciones?.message}
            />

          </form>
        </div>

        {/* Footer Modal */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3 rounded-b-brand-xl">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="repro-form" isLoading={isPending}>
            <Save className="w-5 h-5 mr-2" />
            Guardar {esParto ? 'Parto' : 'Evento'}
          </Button>
        </div>

      </div>
    </div>
  );
}
