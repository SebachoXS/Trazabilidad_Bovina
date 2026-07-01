/**
 * @file frontend/src/pages/AnimalCreate.tsx
 * @description Pantalla para el Alta de un nuevo Bovino.
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useCreateAnimal } from '../features/animals/hooks/useCreateAnimal';
import { animalsService } from '../features/animals/api/animals.service';
import { adminService } from '../features/admin/api/admin.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useGlobalContext } from '../store/globalContextStore';

// Validación estricta según CONSTITUTION.md
const animalCreateSchema = z.object({
  codigoVisual: z.string()
    .length(10, 'El código visual debe tener exactamente 10 dígitos')
    .regex(/^\d{10}$/, 'El código visual debe contener solo dígitos numéricos'),
  nombre: z.string().optional(),
  raza: z.string().min(2, 'La raza es requerida y debe tener al menos 2 caracteres'),
  sexo: z.enum(['MACHO', 'HEMBRA'], {
    required_error: 'Debe seleccionar un sexo',
  }),
  fechaNacimiento: z.string().optional(),
  pesoNacimiento: z.preprocess((val) => (val ? Number(val) : undefined), z.number().positive().optional()),
  padreId: z.preprocess((val) => (val ? Number(val) : undefined), z.number().optional()),
  madreId: z.preprocess((val) => (val ? Number(val) : undefined), z.number().optional()),
  padreManual: z.string().optional(),
  predioIdLocal: z.preprocess((val) => (val ? Number(val) : undefined), z.number().optional()),
  registrarIngreso: z.boolean().default(false),
  numeroGuia: z.string().optional(),
  isGestante: z.boolean().default(false),
  proposito: z.enum(['CARNE', 'LECHE', 'CRIA_GESTACION', 'REPRODUCTOR_SEMENTAL', 'DOBLE_PROPOSITO']).optional(),
}).superRefine((data, ctx) => {
  if (data.registrarIngreso && !data.numeroGuia) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['numeroGuia'],
      message: 'Debe proveer número de guía si registra el ingreso.',
    });
  }
  if (data.proposito) {
    if (data.sexo === 'MACHO' && !['CARNE', 'REPRODUCTOR_SEMENTAL'].includes(data.proposito)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proposito'], message: 'Propósito no válido para machos.' });
    }
    if (data.sexo === 'HEMBRA' && !['CARNE', 'LECHE', 'CRIA_GESTACION', 'DOBLE_PROPOSITO'].includes(data.proposito)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['proposito'], message: 'Propósito no válido para hembras.' });
    }
  }
});

type AnimalFormValues = z.infer<typeof animalCreateSchema>;

export default function AnimalCreate() {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateAnimal();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AnimalFormValues>({
    resolver: zodResolver(animalCreateSchema),
    defaultValues: {
      sexo: 'HEMBRA',
      raza: 'CHAROLAIS',
      padreId: undefined,
      madreId: undefined,
      registrarIngreso: false,
      isGestante: false,
    }
  });

  const registrarIngreso = watch('registrarIngreso');
  const sexo = watch('sexo');
  const padreId = watch('padreId');

  useEffect(() => {
    setValue('proposito', undefined as any);
  }, [sexo, setValue]);

  // Queries para cargar padres y madres
  const { data: madresResponse } = useQuery({
    queryKey: ['animales', 'madres'],
    queryFn: () => animalsService.getAnimales(1, 100, { sexo: 'HEMBRA' }),
  });

  const { data: padresResponse } = useQuery({
    queryKey: ['animales', 'padres'],
    queryFn: () => animalsService.getAnimales(1, 100, { sexo: 'MACHO' }),
  });

  const madresOptions = [
    { value: '', label: 'Ninguna / Sin registro' },
    ...(madresResponse?.data?.map(m => {
      const baseLabel = `${m.codigoVisual} ${m.nombre ? `(${m.nombre})` : ''}`.trim();
      return {
        value: m.id.toString(),
        label: m.estado === 'ACTIVO' ? baseLabel : `${baseLabel} - [${m.estado.replace(/_/g, ' ')}]`
      };
    }) || [])
  ];

  const padresOptions = [
    { value: '', label: 'Ninguno / Sin registro' },
    ...(padresResponse?.data?.map(p => {
      const baseLabel = `${p.codigoVisual} ${p.nombre ? `(${p.nombre})` : ''}`.trim();
      return {
        value: p.id.toString(),
        label: p.estado === 'ACTIVO' ? baseLabel : `${baseLabel} - [${p.estado.replace(/_/g, ' ')}]`
      };
    }) || []),
    { value: '-1', label: 'Otro / No Registrado (Ingreso Manual)' }
  ];

  const { selectedPredioId } = useGlobalContext();

  const { data: prediosRes, isLoading: prediosLoading } = useQuery({
    queryKey: ['predios'],
    queryFn: () => adminService.getPredios(),
    enabled: !selectedPredioId, // Solo consulta si no hay predio seleccionado globalmente
  });
  const predios = prediosRes?.data || [];

  const onSubmit = async (data: AnimalFormValues) => {
    try {
      setGlobalError(null);
      const finalPredioId = selectedPredioId || data.predioIdLocal;
      
      if (!finalPredioId) {
        toast.error('Debe asignar el animal a una finca (Seleccione un predio en el formulario o en la barra global).');
        return;
      }

      // Ajuste de limpieza de datos si vienen strings vacíos (evita Error 400 Zod/Prisma)
      const cleanData: any = {
        ...data,
        predioId: finalPredioId ? Number(finalPredioId) : undefined
      };
      
      delete cleanData.predioIdLocal;
      
      // Limpiar campos vacíos para que no viajen al backend
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] === '' || cleanData[key] === null || cleanData[key] === undefined) {
          delete cleanData[key];
        }
      });
      
      if (cleanData.pesoNacimiento) {
        cleanData.pesoNacimiento = Number(cleanData.pesoNacimiento);
      }

      if (cleanData.fechaNacimiento) {
        cleanData.fechaNacimiento = new Date(cleanData.fechaNacimiento).toISOString();
      }

      // Manejo de padre manual (opción -1)
      if (cleanData.padreId === -1) {
        delete cleanData.padreId;
        if (cleanData.padreManual) {
          // Adjuntamos al nombre como nota si hay ingreso manual de padre
          cleanData.nombre = cleanData.nombre 
            ? `${cleanData.nombre} (Padre: ${cleanData.padreManual})` 
            : `(Padre: ${cleanData.padreManual})`;
        }
      }
      delete cleanData.padreManual;
      
      if (cleanData.numeroGuia) {
        cleanData.numeroGuiaIngreso = cleanData.numeroGuia;
        delete cleanData.numeroGuia;
      }

      const response = await mutateAsync(cleanData);
      
      if (response.success && response.data) {
        toast.success('¡Bovino registrado correctamente!');
        // Navegar directo al perfil del nuevo animal
        navigate(`/animales/${response.data.id}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error al intentar registrar el animal.';
      setGlobalError(msg);
      toast.error('Error al guardar');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-2 sm:p-4">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/animales')}
          className="text-gray-500 hover:text-gray-900 transition-colors p-2 bg-white border border-gray-200 shadow-sm rounded-full"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registrar Animal</h1>
          <p className="text-gray-600 mt-1">Dar de alta un nuevo bovino en el inventario.</p>
        </div>
      </div>

      {globalError && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <span className="text-sm font-medium">{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 shadow-xl rounded-2xl p-6 sm:p-8 space-y-8 relative overflow-hidden">
        {/* Adorno brillante en la esquina */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-100 rounded-full blur-[100px] opacity-50"></div>
        
        {/* Sección: Identificación */}
        <div className="space-y-4 relative z-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Identificación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Código Visual (Obligatorio)</label>
              <input
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                placeholder="Ej: 1234567890"
                maxLength={10}
                {...register('codigoVisual')}
              />
              <span className="text-xs text-gray-600 mt-1 block">Exactamente 10 dígitos numéricos. Inmutable.</span>
              {errors.codigoVisual && <span className="text-red-600 text-xs mt-1 block">{errors.codigoVisual.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Nombre (Opcional)</label>
              <input
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                placeholder="Ej: La Pinta"
                {...register('nombre')}
              />
              {errors.nombre && <span className="text-red-600 text-xs mt-1 block">{errors.nombre.message}</span>}
            </div>
          </div>
        </div>

        {/* Sección: Características */}
        <div className="space-y-4 relative z-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Características</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Raza (Fija por sistema)</label>
              <input 
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-gray-100 text-gray-700 font-bold border border-gray-300 cursor-not-allowed" 
                readOnly 
                {...register('raza')} 
              />
              {errors.raza && <span className="text-red-600 text-xs mt-1 block">{errors.raza.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Sexo (Obligatorio)</label>
              <select className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900" {...register('sexo')}>
                <option value="HEMBRA">Hembra</option>
                <option value="MACHO">Macho</option>
              </select>
              {errors.sexo && <span className="text-red-600 text-xs mt-1 block">{errors.sexo.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Propósito Productivo</label>
              <select className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900" {...register('proposito')}>
                <option value="">Seleccione propósito...</option>
                <option value="CARNE">Carne</option>
                {sexo === 'HEMBRA' && <option value="LECHE">Leche</option>}
                {sexo === 'HEMBRA' && <option value="CRIA_GESTACION">Cría / Gestación</option>}
                {sexo === 'HEMBRA' && <option value="DOBLE_PROPOSITO">Doble Propósito</option>}
                {sexo === 'MACHO' && <option value="REPRODUCTOR_SEMENTAL">Reproductor (Semental)</option>}
              </select>
              {errors.proposito && <span className="text-red-600 text-xs mt-1 block">{errors.proposito.message}</span>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Fecha Nac. (Opcional)</label>
              <input
                type="date"
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                {...register('fechaNacimiento')}
              />
              {errors.fechaNacimiento && <span className="text-red-600 text-xs mt-1 block">{errors.fechaNacimiento.message}</span>}
            </div>
            {!selectedPredioId && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Asignar a Finca / Predio</label>
                <select 
                  className="w-full rounded-lg px-4 py-2.5 text-sm bg-indigo-50 border border-indigo-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-indigo-900 font-medium" 
                  {...register('predioIdLocal')}
                  disabled={prediosLoading}
                >
                  <option value="">{prediosLoading ? 'Cargando fincas...' : 'Seleccione una finca...'}</option>
                  {predios.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
                {errors.predioIdLocal && <span className="text-red-600 text-xs mt-1 block">{errors.predioIdLocal.message}</span>}
              </div>
            )}
          </div>
        </div>
        
        {/* Sección: Genealogía */}
        <div className="space-y-4 relative z-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Genealogía</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Select
                label="Madre (ID)"
                options={madresOptions}
                {...register('madreId')}
                error={errors.madreId?.message}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Select
                label="Padre (ID Toro)"
                options={padresOptions}
                {...register('padreId')}
                error={errors.padreId?.message}
              />
              {padreId === -1 && (
                <div className="mt-2 animate-fade-in">
                  <Input
                    label="Nombre de Padre No Registrado"
                    placeholder="Ej: Toro Importado XYZ"
                    {...register('padreManual')}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sección: Sincronización */}
        <div className="space-y-4 relative z-10">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">Opciones Avanzadas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">Peso al Nacimiento (kg)</label>
              <input
                type="number"
                step="0.1"
                className="w-full rounded-lg px-4 py-2.5 text-sm bg-white border border-gray-300 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                placeholder="Ej: 35.5"
                {...register('pesoNacimiento')}
              />
            </div>
            
            <div className="flex flex-col gap-3 justify-center pt-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500"
                  {...register('registrarIngreso')}
                />
                <span className="text-sm font-medium text-gray-900">Registrar Ingreso Automático</span>
              </label>

              {registrarIngreso && (
                <div className="animate-fade-in">
                  <input
                    type="text"
                    className="w-full rounded-lg px-4 py-2 text-sm bg-white border border-gray-300 text-gray-900 focus:ring-1 focus:ring-emerald-500"
                    placeholder="Número de Guía de Ingreso"
                    {...register('numeroGuia')}
                  />
                  {errors.numeroGuia && <span className="text-red-600 text-xs mt-1 block">{errors.numeroGuia.message}</span>}
                </div>
              )}

              {sexo === 'HEMBRA' && (
                <label className="flex items-center gap-3 cursor-pointer mt-2 animate-fade-in">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300 bg-white text-emerald-600 focus:ring-emerald-500"
                    {...register('isGestante')}
                  />
                  <span className="text-sm font-medium text-gray-900">Ingresa Gestante</span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200 relative z-10">
          <button 
            type="submit" 
            disabled={isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto px-8 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold shadow-md disabled:opacity-70 transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>{isPending ? 'Guardando...' : 'Guardar Bovino'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
