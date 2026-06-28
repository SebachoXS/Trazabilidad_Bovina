/**
 * @file frontend/src/features/productivity/components/WeighingModal.tsx
 * @description Modal con formulario para registrar un pesaje de un bovino.
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreatePesaje } from '../hooks/useCreatePesaje';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';

// Esquema Zod alineado con backend pesajeCreateSchema
const weighingSchema = z.object({
  fecha: z.string({
    required_error: 'La fecha es obligatoria',
  }),
  peso: z.preprocess((val) => Number(val), 
    z.number()
     .positive('El peso debe ser positivo')
     .max(2000, 'El peso no puede superar los 2000 kg')
  ),
  metodoMedicion: z.enum(['BASCULA', 'CINTA_BOVINOMETRICA', 'CINTA_ZOOMETRICA']).default('BASCULA'),
  perimetroToracico: z.preprocess((val) => (val ? Number(val) : undefined), 
    z.number().positive('Debe ser positivo').optional()
  ),
  longitudCorporal: z.preprocess((val) => (val ? Number(val) : undefined), 
    z.number().positive('Debe ser positivo').optional()
  ),
  condicionCorporal: z.preprocess((val) => (val ? Number(val) : undefined), 
    z.number()
     .min(1, 'Mínimo 1.0').max(5, 'Máximo 5.0')
     .multipleOf(0.5, 'Valores en pasos de 0.5 (1.0, 1.5, 2.0, ...)')
     .optional()
  ),
  observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type WeighingFormValues = z.infer<typeof weighingSchema>;

interface WeighingModalProps {
  animalId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export function WeighingModal({ animalId, isOpen, onClose }: WeighingModalProps) {
  const { mutateAsync, isPending } = useCreatePesaje(animalId);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WeighingFormValues>({
    resolver: zodResolver(weighingSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      metodoMedicion: 'BASCULA',
    }
  });

  const pt = watch('perimetroToracico');
  const lc = watch('longitudCorporal');
  const metodoMedicion = watch('metodoMedicion');

  useEffect(() => {
    if (metodoMedicion === 'CINTA_ZOOMETRICA' && pt && lc && pt > 0 && lc > 0) {
      const pesoEstimado = (pt * pt * lc) / 10838;
      setValue('peso', Number(pesoEstimado.toFixed(1)), { shouldValidate: true });
    }
  }, [pt, lc, metodoMedicion, setValue]);

  const onSubmit = async (data: WeighingFormValues) => {
    try {
      setGlobalError(null);
      
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
      ) as any;

      await mutateAsync(cleanData);
      
      toast.success('Pesaje registrado correctamente');
      reset();
      onClose();
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Error al intentar guardar el pesaje.');
      toast.error('Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-lg rounded-brand-xl flex flex-col">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-950">Registrar Pesaje</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-950 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {globalError && (
            <div className="mb-4 bg-danger/10 text-danger border border-danger/20 px-4 py-3 rounded-brand flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <span className="text-sm">{globalError}</span>
            </div>
          )}

          <form id="weighing-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha de Pesaje"
                type="date"
                {...register('fecha')}
                error={errors.fecha?.message}
                className="text-gray-950"
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-950">Método de Medición</label>
                <select
                  {...register('metodoMedicion')}
                  className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-brand text-gray-950 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-shadow"
                >
                  <option value="BASCULA">Báscula Tradicional</option>
                  <option value="CINTA_BOVINOMETRICA">Cinta Bovinométrica (Directa)</option>
                  <option value="CINTA_ZOOMETRICA">Cinta Zoométrica (Cálculo)</option>
                </select>
              </div>
            </div>

            <div>
              <Input
                label="Peso (kg)"
                type="number"
                step="0.1"
                min="1"
                placeholder="Ej: 450.5"
                {...register('peso')}
                error={errors.peso?.message}
                className="text-gray-950 font-bold"
                readOnly={metodoMedicion === 'CINTA_ZOOMETRICA'}
                helperText={metodoMedicion === 'CINTA_ZOOMETRICA' ? 'Calculado automáticamente a partir de las medidas corporales' : ''}
              />
            </div>

            {metodoMedicion === 'CINTA_ZOOMETRICA' && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-brand space-y-4">
                <h3 className="text-sm font-semibold text-gray-950 flex items-center gap-2">
                  Estimación Anatómica
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Perímetro Torácico (cm)"
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="Ej: 150"
                    {...register('perimetroToracico')}
                    error={errors.perimetroToracico?.message}
                    className="text-gray-950"
                  />
                  <Input
                    label="Longitud Corporal (cm)"
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="Ej: 120"
                    {...register('longitudCorporal')}
                    error={errors.longitudCorporal?.message}
                    className="text-gray-950"
                  />
                </div>
              </div>
            )}

            <Input
              label="Condición Corporal (1.0 - 5.0)"
              type="number"
              step="0.5"
              min="1"
              max="5"
              placeholder="Ej: 3.5"
              {...register('condicionCorporal')}
              error={errors.condicionCorporal?.message}
              helperText="Opcional. Escala de 1 (Emaciado) a 5 (Obeso)."
            />

            <Textarea
              label="Observaciones"
              placeholder="Notas sobre el estado del animal al momento del pesaje..."
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
          <Button type="submit" form="weighing-form" isLoading={isPending}>
            <Save className="w-5 h-5 mr-2" />
            Guardar Pesaje
          </Button>
        </div>

      </div>
    </div>
  );
}
