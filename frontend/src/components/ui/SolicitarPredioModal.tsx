import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminService } from '../../features/admin/api/admin.service';
import { Button } from './Button';
import { Input } from './Input';
import { MapPin, X, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon paths in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const solicitarPredioSchema = z.object({
  nombre: z.string().min(2, 'El nombre es obligatorio'),
  codigo: z.string().min(2, 'El código de sitio es obligatorio'),
  provincia: z.string().min(2, 'La provincia es obligatoria'),
  canton: z.string().min(2, 'El cantón es obligatorio'),
  parroquia: z.string().min(2, 'La parroquia es obligatoria'),
  coordenadas: z.string().optional(),
});

type FormValues = z.infer<typeof solicitarPredioSchema>;

interface SolicitarPredioModalProps {
  propietarioId: number;
  isOpen: boolean;
  onClose: () => void;
}

// Subcomponente de React-Leaflet para capturar clics en el mapa
function LocationMarker({ onLocationSelected, setIsLoading }: { onLocationSelected: (lat: number, lng: number, address: any) => void, setIsLoading: (state: boolean) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  
  useMapEvents({
    async click(e) {
      setPosition(e.latlng);
      setIsLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${e.latlng.lat}&lon=${e.latlng.lng}`);
        if (!response.ok) throw new Error('Error en geocodificación');
        const data = await response.json();
        onLocationSelected(e.latlng.lat, e.latlng.lng, data.address || {});
      } catch (error) {
        console.error('Error Reverse Geocoding:', error);
        toast.error('No se pudo extraer la información geográfica.');
        // Al menos pasamos las coordenadas
        onLocationSelected(e.latlng.lat, e.latlng.lng, {});
      } finally {
        setIsLoading(false);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export function SolicitarPredioModal({ propietarioId, isOpen, onClose }: SolicitarPredioModalProps) {
  const queryClient = useQueryClient();
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormValues>({
    resolver: zodResolver(solicitarPredioSchema)
  });

  const { mutateAsync: createPredio, isPending } = useMutation({
    mutationFn: adminService.createPredio,
    onSuccess: () => {
      toast.success('Solicitud enviada exitosamente.');
      queryClient.invalidateQueries({ queryKey: ['predios'] }); // Limpieza global
      reset();
      onClose();
      // Fallback de emergencia para resincronizar Navbar y Context
      setTimeout(() => {
        window.location.reload();
      }, 800);
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.error?.details?.[0]?.message 
        || err.response?.data?.error?.message 
        || err.response?.data?.message 
        || 'Error al enviar la solicitud';
      toast.error(errorMessage);
    }
  });

  if (!isOpen) return null;

  const onSubmit = async (data: FormValues) => {
    const payload: any = {
      ...data,
      municipio: data.canton,
      departamento: data.provincia,
    };
    if (propietarioId && propietarioId > 0) {
      payload.propietarioId = propietarioId;
    }
    await createPredio(payload);
  };

  const handleLocationExtracted = (lat: number, lng: number, address: any) => {
    setValue('coordenadas', `${lat.toFixed(5)}, ${lng.toFixed(5)}`, { shouldValidate: true });
    
    // Mapeo Nominatim -> Formularios Locales
    if (address) {
      const provincia = address.state || address.region || '';
      const canton = address.county || address.city || address.town || '';
      const parroquia = address.village || address.suburb || address.hamlet || address.neighbourhood || address.city_district || address.town || '';
      
      if (provincia) setValue('provincia', provincia, { shouldValidate: true });
      if (canton) setValue('canton', canton, { shouldValidate: true });
      if (parroquia) setValue('parroquia', parroquia, { shouldValidate: true });
      
      if (provincia || canton) {
        toast.success('Ubicación auto-rellenada. Puede modificarla si lo desea.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 shadow-xl w-full max-w-lg rounded-brand-xl overflow-hidden animate-in zoom-in-95 relative">
        {isGeocoding && (
           <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[2px] flex items-center justify-center">
             <div className="flex flex-col items-center justify-center gap-2 bg-white p-4 rounded-xl shadow-lg border border-brand-100">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
                <p className="text-sm font-semibold text-gray-900">Extrayendo ubicación satelital...</p>
             </div>
           </div>
        )}
        
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-950" />
            <h2 className="text-lg font-bold text-gray-950">Solicitar Alta de Predio</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-950 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nombre de la Finca"
                placeholder="Ej. Hacienda Las Margaritas"
                {...register('nombre')}
                error={errors.nombre?.message}
                className="text-gray-950"
              />
            </div>
            
            <Input
              label="Código de Sitio (AGROCALIDAD)"
              placeholder="Ej. 170150"
              {...register('codigo')}
              error={errors.codigo?.message}
              className="text-gray-950"
            />

            <Input
              label="Provincia"
              placeholder="Ej. Pichincha"
              {...register('provincia')}
              error={errors.provincia?.message}
              className="text-gray-950"
            />
            
            <Input
              label="Cantón"
              placeholder="Ej. Mejía"
              {...register('canton')}
              error={errors.canton?.message}
              className="text-gray-950"
            />
            
            <Input
              label="Parroquia"
              placeholder="Ej. Machachi"
              {...register('parroquia')}
              error={errors.parroquia?.message}
              className="text-gray-950"
            />

            <div className="md:col-span-2 mt-2">
              <Input
                label="Coordenadas GPS (Automáticas o Manuales)"
                placeholder="Ej. -0.51000, -78.56667"
                {...register('coordenadas')}
                error={errors.coordenadas?.message}
                className="text-gray-950"
              />
            </div>
            
            {/* Mapa Interactivo */}
            <div className="md:col-span-2 w-full h-48 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative z-0 mt-1">
              <MapContainer 
                center={[-1.8312, -78.1834]} 
                zoom={6} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <LocationMarker 
                  setIsLoading={setIsGeocoding}
                  onLocationSelected={handleLocationExtracted} 
                />
              </MapContainer>
              <div className="absolute bottom-2 left-2 z-[400] pointer-events-none bg-white/80 px-2 py-1 rounded text-[10px] font-medium text-gray-700 backdrop-blur">
                Haga clic para autocompletar ubicación
              </div>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-4">
            <Button variant="outline" type="button" onClick={onClose} className="text-gray-950 border-gray-300">
              Cancelar
            </Button>
            <Button type="submit" isLoading={isPending || isGeocoding}>
              Enviar Solicitud
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
