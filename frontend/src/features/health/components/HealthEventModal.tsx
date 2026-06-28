/**
 * @file frontend/src/features/health/components/HealthEventModal.tsx
 * @description Modal con formulario para registrar un evento sanitario a un bovino.
 */

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateHealthEvent } from '../hooks/useCreateHealthEvent';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';

// Replicamos la constante del backend para tipos que requieren producto
const TIPOS_REQUIEREN_PRODUCTO = ['VACUNACION', 'TRATAMIENTO', 'DESPARASITACION'];

// Esquema Zod (Espejo estricto del backend)
const healthEventSchema = z.object({
  tipo: z.enum(['VACUNACION', 'TRATAMIENTO', 'DIAGNOSTICO', 'DESPARASITACION', 'CIRUGIA'], {
    required_error: 'El tipo es obligatorio',
  }),
  fecha: z.string({
    required_error: 'La fecha es obligatoria',
  }),
  producto: z.string().optional(),
  principioActivo: z.string().optional(),
  dosis: z.string().optional(),
  viaAdministracion: z.string().optional(),
  lote: z.string().optional(),
  laboratorio: z.string().optional(),
  periodoRetiro: z.preprocess((val) => (val ? Number(val) : 0), z.number().min(0, 'No puede ser negativo')),
  diagnostico: z.string().optional(),
  observaciones: z.string().optional(),
}).superRefine((data, ctx) => {
  if (TIPOS_REQUIEREN_PRODUCTO.includes(data.tipo) && !data.producto) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['producto'],
      message: `El producto es obligatorio para el tipo ${data.tipo}.`,
    });
  }
});

type HealthEventFormValues = z.infer<typeof healthEventSchema>;

interface HealthEventModalProps {
  animalId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export function HealthEventModal({ animalId, isOpen, onClose }: HealthEventModalProps) {
  const { mutateAsync, isPending } = useCreateHealthEvent(animalId);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<HealthEventFormValues>({
    resolver: zodResolver(healthEventSchema),
    defaultValues: {
      tipo: 'VACUNACION',
      fecha: new Date().toISOString().split('T')[0], // Hoy por defecto
      periodoRetiro: 0,
    }
  });

  const tipoSeleccionado = watch('tipo');
  const requiereProducto = TIPOS_REQUIEREN_PRODUCTO.includes(tipoSeleccionado);

  const onSubmit = async (data: HealthEventFormValues) => {
    try {
      setGlobalError(null);
      
      // Limpieza de strings vacíos
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
      ) as any;

      // Ensure fecha is ISO format, form returns YYYY-MM-DD which is fine for backend coercion.
      await mutateAsync(cleanData);
      
      toast.success('Evento sanitario registrado');
      reset();
      onClose();
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Error al intentar guardar el evento sanitario.');
      toast.error('Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-2xl rounded-brand-xl flex flex-col max-h-[90vh]">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Registrar Evento Sanitario</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {globalError && (
            <div className="mb-4 bg-danger/10 text-danger border border-danger/20 px-4 py-3 rounded-brand flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{globalError}</span>
            </div>
          )}

          <form id="health-event-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Fila 1: Tipo y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Tipo de Evento"
                options={[
                  { value: 'VACUNACION', label: 'Vacunación' },
                  { value: 'TRATAMIENTO', label: 'Tratamiento Médico' },
                  { value: 'DESPARASITACION', label: 'Desparasitación' },
                  { value: 'DIAGNOSTICO', label: 'Diagnóstico Clínico' },
                  { value: 'CIRUGIA', label: 'Cirugía' },
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

            {/* Medicación (Condicional visualmente, aunque siempre se puede llenar) */}
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-brand space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                Datos del Medicamento / Insumo
                {requiereProducto && <span className="text-danger text-xs">*Requerido</span>}
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Producto"
                  placeholder="Ej: Ivermectina 1%"
                  {...register('producto')}
                  error={errors.producto?.message}
                />
                <Input
                  label="Principio Activo"
                  placeholder="Opcional"
                  {...register('principioActivo')}
                  error={errors.principioActivo?.message}
                />
                <Input
                  label="Dosis Aplicada"
                  placeholder="Ej: 5ml"
                  {...register('dosis')}
                  error={errors.dosis?.message}
                />
                <Input
                  label="Vía de Adm."
                  placeholder="Ej: Intramuscular"
                  {...register('viaAdministracion')}
                  error={errors.viaAdministracion?.message}
                />
              </div>
            </div>

            {/* Fila 3: Riesgo y Retiro */}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Periodo de Retiro (Días)"
                type="number"
                min={0}
                {...register('periodoRetiro')}
                error={errors.periodoRetiro?.message}
                helperText="Días en que el animal no es apto para consumo. 0 = Sin retiro."
                className={watch('periodoRetiro') > 0 ? '!border-amber-500 !bg-amber-900/20 focus:border-amber-500 focus:ring-amber-500/50' : ''}
              />
              <Input
                label="Lote / Laboratorio"
                placeholder="Ej: L-1234, LabX"
                {...register('lote')}
                error={errors.lote?.message}
              />
            </div>

            {/* Fila 4: Observaciones */}
            <Textarea
              label="Diagnóstico / Observaciones"
              placeholder="Detalles adicionales sobre el procedimiento o la salud del animal..."
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
          <Button type="submit" form="health-event-form" isLoading={isPending}>
            <Save className="w-5 h-5 mr-2" />
            Guardar Evento
          </Button>
        </div>

      </div>
    </div>
  );
}
