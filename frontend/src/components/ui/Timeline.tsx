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
    <div className="relative border-l border-white/10 ml-3 space-y-8 py-4">
      {events.map((event, idx) => (
        <div key={event.id || idx} className="relative pl-8">
          <span className={`absolute -left-4 flex items-center justify-center w-8 h-8 rounded-full border ${getEventColor(event.tipo)} bg-[#0f172a] shadow-sm`}>
            {getEventIcon(event.tipo)}
          </span>
          
          <div className="glass-panel border border-white/10 rounded-brand-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-white capitalize">
                {event.tipo.replace('_', ' ').toLowerCase()}
              </h4>
              <time className="text-sm text-[var(--text-muted)]">
                {new Date(event.fecha).toLocaleDateString()}
              </time>
            </div>
            
            <p className="text-white/80 text-sm">{event.detalle}</p>
            
            {/* Metadatos Específicos */}
            <div className="mt-3 flex flex-wrap gap-2">
              {event.producto && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white/10 text-white border border-white/10">
                  Producto: {event.producto}
                </span>
              )}
              {event.peso && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-900/20 text-amber-400 border border-amber-500/30">
                  Peso: {event.peso} kg
                </span>
              )}
              {event.motivo && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-900/20 text-indigo-400 border border-indigo-500/30">
                  Motivo: {event.motivo}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
