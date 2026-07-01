import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { Loader2, Truck, FileText, ChevronRight, X, User, CheckCircle2 } from 'lucide-react';

export const HistorialGuias = () => {
  const [selectedGuia, setSelectedGuia] = useState<any>(null);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['movimientos'],
    queryFn: async () => {
      const res = await api.get('/movimientos');
      return res.data;
    }
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  if (isError) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Error al cargar el historial de guías.</div>;

  // El backend devuelve los movimientos individuales en response.data.data
  const movimientos = response?.data || [];
  
  // Agrupar por numeroGuia
  const guiasAgrupadas: Record<string, any[]> = {};
  movimientos.forEach((mov: any) => {
    if (!mov.numeroGuia) return;
    if (!guiasAgrupadas[mov.numeroGuia]) {
      guiasAgrupadas[mov.numeroGuia] = [];
    }
    guiasAgrupadas[mov.numeroGuia].push(mov);
  });

  const guiasList = Object.entries(guiasAgrupadas).map(([numeroGuia, movs]) => {
    const firstMov = movs[0];
    return {
      numeroGuia,
      fecha: firstMov.fecha,
      tipo: firstMov.tipo,
      origenId: firstMov.predioOrigenId, // Puedes poblar esto si el backend incluye `predioOrigen`
      destinoId: firstMov.predioDestinoId,
      transportista: firstMov.transportista,
      placa: firstMov.placaVehiculo,
      cedulaChofer: firstMov.cedulaChofer,
      observaciones: firstMov.observaciones,
      animales: movs.map(m => m.animal) // asume que include animal está en el GET del backend
    };
  }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-emerald-600" />
        Historial de Guías Emitidas
      </h2>

      {guiasList.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          No hay guías de movilización registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="py-4 px-6">N° Guía CSMI</th>
                <th className="py-4 px-6">Fecha</th>
                <th className="py-4 px-6">Tipo</th>
                <th className="py-4 px-6">Transportista</th>
                <th className="py-4 px-6 text-center">Bovinos</th>
                <th className="py-4 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {guiasList.map((guia) => (
                <tr key={guia.numeroGuia} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="py-4 px-6 font-bold text-gray-900">{guia.numeroGuia}</td>
                  <td className="py-4 px-6">{new Date(guia.fecha).toLocaleDateString()}</td>
                  <td className="py-4 px-6">
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded border border-gray-200">
                      {guia.tipo}
                    </span>
                  </td>
                  <td className="py-4 px-6">{guia.transportista || 'N/A'}</td>
                  <td className="py-4 px-6 text-center font-bold text-emerald-700">{guia.animales.length}</td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => setSelectedGuia(guia)}
                      className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center justify-end w-full gap-1"
                    >
                      Ver Detalles <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL DETALLES */}
      {selectedGuia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-emerald-50">
              <div>
                <h3 className="text-xl font-bold text-emerald-900">Guía: {selectedGuia.numeroGuia}</h3>
                <p className="text-emerald-700 text-sm">{new Date(selectedGuia.fecha).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                     import('../utils/generateCSMIPdf').then(({ generateCSMIPdf }) => {
                        generateCSMIPdf(selectedGuia);
                     });
                  }} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" /> Descargar PDF
                </button>
                <button onClick={() => setSelectedGuia(null)} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><User className="w-3 h-3"/> Conductor</p>
                  <p className="font-medium text-gray-900">{selectedGuia.transportista || 'N/A'}</p>
                  <p className="text-sm text-gray-600">CI: {selectedGuia.cedulaChofer || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Truck className="w-3 h-3"/> Vehículo</p>
                  <p className="font-medium text-gray-900">Placa: {selectedGuia.placa || 'N/A'}</p>
                </div>
              </div>

              {selectedGuia.observaciones && (
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-2">Observaciones de Ruta:</p>
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic">
                    {selectedGuia.observaciones}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Bovinos Trasladados ({selectedGuia.animales.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedGuia.animales.map((a: any, i: number) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-2 text-center text-sm shadow-sm flex flex-col">
                      <span className="font-mono font-bold text-gray-900">{a?.codigoVisual || `ID: ${a?.id || 'Desconocido'}`}</span>
                      {a?.raza && <span className="text-xs text-gray-500">{a.raza}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
