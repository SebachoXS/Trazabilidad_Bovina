import React, { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateBatchMovement } from '../hooks/useCreateBatchMovement';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../admin/api/admin.service';
import { Loader2, Truck, Printer, MapPin, ClipboardList, CheckCircle2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { GuiaImprimible } from './GuiaImprimible';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import { TransferList } from './TransferList';

const guiaSchema = z.object({
  tipo: z.enum(['TRASLADO_INTERNO', 'TRASLADO_EXTERNO', 'CAMBIO_PROPIETARIO', 'EGRESO_SACRIFICIO']),
  fecha: z.string({ required_error: 'La fecha es requerida' }),
  predioDestinoId: z.string().optional(),
  destinoExterno: z.string().optional(),
  ruta: z.string().min(1, 'La ruta es obligatoria'),
  transportista: z.string().min(1, 'El nombre del chofer es obligatorio'),
  cedulaChofer: z.string().min(1, 'La cédula del chofer es obligatoria'),
  placaVehiculo: z.string().min(1, 'La placa del vehículo es obligatoria'),
  observaciones: z.string().optional()
});

type GuiaFormValues = z.infer<typeof guiaSchema>;

export const GuiaMovilizacionForm = ({ animalsData, isLoadingData, isErrorData }: { animalsData: any[], isLoadingData?: boolean, isErrorData?: boolean }) => {
  const { data: prediosRes, isLoading: prediosLoading } = useQuery({ queryKey: ['predios'], queryFn: () => adminService.getPredios() });
  const predios = prediosRes?.data || [];
  
  const { mutateAsync, isPending } = useCreateBatchMovement();
  const [printData, setPrintData] = useState<any>(null);
  
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: 'Certificado_Zoosanitario_Movilizacion',
  });

  const [step, setStep] = useState(1);
  const [selectedAnimals, setSelectedAnimals] = useState<Set<number>>(new Set());

  const { register, handleSubmit, watch, formState: { errors }, reset, trigger } = useForm<GuiaFormValues>({
    resolver: zodResolver(guiaSchema),
    defaultValues: { fecha: new Date().toISOString().split('T')[0], tipo: 'TRASLADO_EXTERNO' },
    mode: 'onTouched'
  });

  const watchTipo = watch('tipo');
  const watchDestino = watch('predioDestinoId');

  const handleNextStep = async () => {
    let isValid = false;
    if (step === 1) {
      isValid = await trigger(['tipo', 'fecha', 'predioDestinoId', 'destinoExterno']);
    } else if (step === 2) {
      isValid = await trigger(['ruta', 'transportista', 'cedulaChofer', 'placaVehiculo']);
    }
    
    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setStep(prev => prev - 1);
  };

  const onSubmit = async (data: GuiaFormValues) => {
    if (selectedAnimals.size === 0) {
      toast.error('Debe seleccionar al menos un animal para el traslado en el Paso 3.');
      return;
    }

    const cleanData: any = { ...data };
    
    if (cleanData.predioDestinoId === 'EXTERNO') {
      cleanData.predioDestinoId = undefined;
      cleanData.observaciones = `${cleanData.observaciones || ''} | Destino Externo: ${cleanData.destinoExterno}`.trim();
    } else if (cleanData.predioDestinoId) {
      cleanData.predioDestinoId = parseInt(cleanData.predioDestinoId, 10);
    }
    
    delete cleanData.destinoExterno;
    cleanData.fecha = new Date(cleanData.fecha).toISOString();
    
    const payload = {
      animalIds: Array.from(selectedAnimals),
      evento: cleanData
    };

    try {
      await mutateAsync(payload);
      
      const movilizados = animalsData.filter(a => selectedAnimals.has(a.id));
      setPrintData({ evento: cleanData, animales: movilizados, destinoExterno: data.destinoExterno, totalAnimales: movilizados.length });
      
      toast.success('Guía generada correctamente.');
      
      setTimeout(() => {
         handlePrint();
         reset();
         setSelectedAnimals(new Set());
         setStep(1);
      }, 500);
      
    } catch (e) {
      console.error(e);
      toast.error('Ocurrió un error al generar la guía.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 w-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-950 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-emerald-600"/> 
          Emisión de Guía de Movilización (SIFAE/CZPM-M)
        </h2>
        
        {/* Wizard Progress */}
        <div className="flex items-center gap-2 mt-4 md:mt-0">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          <div className={`h-1 w-8 ${step >= 2 ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 2 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
          <div className={`h-1 w-8 ${step >= 3 ? 'bg-emerald-600' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${step >= 3 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-950 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" /> Paso 1: Origen y Destino
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select label="Tipo de Movimiento" {...register('tipo')} error={errors.tipo?.message}>
                <option value="TRASLADO_INTERNO">Traslado Interno (Misma Finca)</option>
                <option value="TRASLADO_EXTERNO">Feria Comercial / Exposición</option>
                <option value="CAMBIO_PROPIETARIO">Venta / Finca Tercero</option>
                <option value="EGRESO_SACRIFICIO">Camal / Matadero (Sacrificio)</option>
              </Select>

              <Input type="date" label="Fecha de Movilización" {...register('fecha')} error={errors.fecha?.message} />

              <Select label="Destino Registrado (Predio/Camal)" {...register('predioDestinoId')} error={errors.predioDestinoId?.message} disabled={prediosLoading}>
                <option value="">{prediosLoading ? 'Cargando fincas...' : 'Seleccione destino...'}</option>
                <option value="EXTERNO" className="font-bold">* OTRO DESTINO EXTERNO *</option>
                {predios?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </Select>

              {watchDestino === 'EXTERNO' && (
                <Input label="Especifique el Destino Externo (Texto Libre)" {...register('destinoExterno')} error={errors.destinoExterno?.message} />
              )}
            </div>
            
            <div className="flex justify-end pt-4">
              <button type="button" onClick={handleNextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center">
                Continuar a Transporte <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-950 flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-600" /> Paso 2: Datos del Transporte (Custodia Legal)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Input label="Ruta de Movilización (Vía Principal)" placeholder="Ej. Ruta 25, Vía Daule - Milagro" {...register('ruta')} error={errors.ruta?.message} />
                <Input label="Nombre del Conductor" placeholder="Ej. Juan Pérez" {...register('transportista')} error={errors.transportista?.message} />
              </div>
              <div className="space-y-4">
                <Input label="Cédula del Conductor" placeholder="Ej. 09XXXXXXX" {...register('cedulaChofer')} error={errors.cedulaChofer?.message} />
                <Input label="Placa y Descripción del Vehículo" placeholder="Ej. ABC-1234 - Camión Ford Hino" {...register('placaVehiculo')} error={errors.placaVehiculo?.message} />
              </div>
            </div>

            <Textarea label="Observaciones (Opcional)" placeholder="Notas sobre el transporte, clima, paradas..." {...register('observaciones')} error={errors.observaciones?.message} />

            <div className="flex justify-between pt-4">
              <button type="button" onClick={handlePrevStep} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors flex items-center border border-gray-300">
                <ChevronLeft className="w-5 h-5 mr-1" /> Atrás
              </button>
              <button type="button" onClick={handleNextStep} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center">
                Continuar a Selección de Lote <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-950 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gray-600" /> Paso 3: Selección de Lote a Movilizar
            </h3>
            
            {isLoadingData ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
            ) : isErrorData ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">Error cargando inventario.</div>
            ) : (
              <TransferList 
                availableAnimals={animalsData} 
                selectedIds={selectedAnimals} 
                onChange={setSelectedAnimals} 
              />
            )}

            <div className="flex justify-between pt-4 mt-6 border-t border-gray-200">
              <button type="button" onClick={handlePrevStep} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-6 rounded-lg transition-colors flex items-center border border-gray-300">
                <ChevronLeft className="w-5 h-5 mr-1" /> Atrás
              </button>
              <button type="submit" disabled={isPending || selectedAnimals.size === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center disabled:opacity-50 shadow-md text-lg">
                {isPending ? <Loader2 className="w-6 h-6 mr-2 animate-spin" /> : <Printer className="w-6 h-6 mr-2" />}
                Emitir Certificado (PDF)
              </button>
            </div>
          </div>
        )}
      </form>
      
      {/* Oculto, usado sólo para imprimir */}
      <div className="hidden">
        <GuiaImprimible ref={printRef} data={printData} />
      </div>
    </div>
  );
};
