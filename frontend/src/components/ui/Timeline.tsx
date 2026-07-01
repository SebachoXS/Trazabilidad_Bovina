/**
 * @file frontend/src/components/ui/Timeline.tsx
 * @description Componente visual para mostrar hitos históricos.
 */

import { Baby, Syringe, Scale, Heart, ArrowRightLeft, Calendar } from 'lucide-react';
import type { TimelineEvent } from '../../features/animals/api/animals.service';

interface TimelineProps {
  events: TimelineEvent[];
}

const getEventIcon = (tipo: TimelineEvent['tipo']) => {
  switch (tipo) {
    case 'NACIMIENTO': return <Baby className="w-5 h-5 text-blue-600" />;
    case 'EVENTO_SANITARIO': return <Syringe className="w-5 h-5 text-danger" />;
    case 'PESAJE': return <Scale className="w-5 h-5 text-amber-600" />;
    case 'EVENTO_REPRODUCTIVO': return <Heart className="w-5 h-5 text-pink-600" />;
    case 'MOVIMIENTO': return <ArrowRightLeft className="w-5 h-5 text-indigo-600" />;
    default: return <Calendar className="w-5 h-5 text-gray-500" />;
  }
};

const getEventColor = (tipo: TimelineEvent['tipo']) => {
  switch (tipo) {
    case 'NACIMIENTO': return 'bg-blue-100 border-blue-200';
    case 'EVENTO_SANITARIO': return 'bg-danger/10 border-danger/20';
    case 'PESAJE': return 'bg-amber-100 border-amber-200';
    case 'EVENTO_REPRODUCTIVO': return 'bg-pink-100 border-pink-200';
    case 'MOVIMIENTO': return 'bg-indigo-100 border-indigo-200';
    default: return 'bg-gray-100 border-gray-200';
  }
};

export function Timeline({ events }: TimelineProps) {
  if (!events || events.length === 0) {
    return <div className="text-[var(--text-muted)] p-4">No hay eventos registrados.</div>;
  }

  return (
    <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 py-4">
      {events.map((event, idx) => (
        <div key={event.id || idx} className="relative pl-8">
          <span className={`absolute -left-[17px] flex items-center justify-center w-8 h-8 rounded-full border-2 ${getEventColor(event.tipo)} bg-white shadow-sm ring-4 ring-white`}>
            {getEventIcon(event.tipo)}
          </span>
          
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-900 capitalize text-base">
                {event.titulo || event.tipo.replace('_', ' ').toLowerCase()}
              </h4>
              <time className="text-sm font-medium text-gray-500 bg-white px-2.5 py-1 rounded-md border border-gray-200 shadow-sm">
                {new Date(event.fecha).toLocaleDateString()}
              </time>
            </div>
            
            <p className="text-gray-700 text-sm mt-2">{event.descripcion || event.detalle}</p>
            
            {/* Metadatos Específicos */}
            <div className="mt-4 flex flex-wrap gap-2">
              {event.producto && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 shadow-sm">
                  Producto: <span className="font-bold ml-1">{event.producto}</span>
                </span>
              )}
              {event.peso && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                  Peso: <span className="font-bold ml-1">{event.peso} kg</span>
                </span>
              )}
              {event.motivo && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                  Motivo: <span className="font-bold ml-1">{event.motivo}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
