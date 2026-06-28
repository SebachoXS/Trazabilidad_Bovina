import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Save, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRegistrarDestete } from '../hooks/useRegistrarDestete';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Button } from '../../../components/ui/Button';

const desteteSchema = z.object({
  fecha: z.string({ required_error: 'La fecha es obligatoria' }),
  metodo: z.enum(['DIRECTO', 'DIFERENCIA', 'ZOOMETRICO']),
  peso: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  perimetroToracico: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  longitudCorporal: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  observaciones: z.string().max(500).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.metodo === 'ZOOMETRICO') {
    if (!data.perimetroToracico || !data.longitudCorporal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['metodo'],
        message: 'Para Zoométrico requieres perímetro y longitud.',
      });
    }
  } else {
    if (!data.peso) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['peso'],
        message: 'Para DIRECTO/DIFERENCIA debes proveer el peso.',
      });
    }
  }
});

type DesteteFormValues = z.infer<typeof desteteSchema>;

interface DesteteModalProps {
  animalId: number | string;
  isOpen: boolean;
  onClose: () => void;
}

export function DesteteModal({ animalId, isOpen, onClose }: DesteteModalProps) {
  const { mutateAsync, isPending } = useRegistrarDestete(animalId);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<DesteteFormValues>({
    resolver: zodResolver(desteteSchema),
    defaultValues: {
      fecha: new Date().toISOString().split('T')[0],
      metodo: 'DIRECTO',
    }
  });

  const metodo = watch('metodo');

  const onSubmit = async (data: DesteteFormValues) => {
    try {
      setGlobalError(null);
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, v === '' ? undefined : v])
      );
      
      await mutateAsync(cleanData);
      toast.success('Destete registrado correctamente. El animal pasó a RECRÍA.');
      reset();
      onClose();
    } catch (err: any) {
      setGlobalError(err.response?.data?.message || 'Error al intentar registrar el destete.');
      toast.error('Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-lg rounded-2xl flex flex-col overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)] rounded-full blur-[60px] opacity-20"></div>

        <div className="flex items-center justify-between p-6 border-b border-white/10 relative z-10">
          <h2 className="text-xl font-bold text-white">Registrar Destete</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 relative z-10">
          {globalError && (
            <div className="mb-5 bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{globalError}</span>
            </div>
          )}

          <form id="destete-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Fecha de Destete"
                type="date"
                {...register('fecha')}
                error={errors.fecha?.message}
                className="input-glass"
              />
              <Select
                label="Método (RN-016)"
                options={[
                  { value: 'DIRECTO', label: 'Báscula Directa' },
                  { value: 'DIFERENCIA', label: 'Por Diferencia' },
                  { value: 'ZOOMETRICO', label: 'Zoométrico (Cálculo C)' }
                ]}
                {...register('metodo')}
                error={errors.metodo?.message}
              />
            </div>

            {metodo !== 'ZOOMETRICO' ? (
              <Input
                label="Peso Final (kg)"
                type="number"
                step="0.1"
                placeholder="Ej: 150.5"
                {...register('peso')}
                error={errors.peso?.message}
                className="input-glass"
              />
            ) : (
              <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 p-4 rounded-lg space-y-4">
                <p className="text-sm text-[var(--text-muted)] font-medium">Método C: Peso = (PT² × LC) / 10.838</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Perímetro Torácico (m)"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 1.25"
                    {...register('perimetroToracico')}
                    error={errors.perimetroToracico?.message}
                    className="input-glass"
                  />
                  <Input
                    label="Longitud Corporal (m)"
                    type="number"
                    step="0.01"
                    placeholder="Ej: 1.10"
                    {...register('longitudCorporal')}
                    error={errors.longitudCorporal?.message}
                    className="input-glass"
                  />
                </div>
              </div>
            )}

            <Textarea
              label="Observaciones"
              placeholder="Notas..."
              {...register('observaciones')}
              error={errors.observaciones?.message}
              className="input-glass"
            />
          </form>
        </div>

        <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3 bg-black/20 relative z-10">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="submit" form="destete-form" isLoading={isPending} className="btn-primary">
            <Save className="w-5 h-5 mr-2" />
            Destetar
          </Button>
        </div>
      </div>
    </div>
  );
}
