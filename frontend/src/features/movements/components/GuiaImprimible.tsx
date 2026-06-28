import React from 'react';

export const GuiaImprimible = React.forwardRef<HTMLDivElement, any>(({ data }, ref) => {
  if (!data) return null;
  const fechaActual = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div ref={ref} className="hidden print:block p-8 bg-white text-gray-950 min-h-screen font-sans">
      <div className="border border-gray-400 p-8 rounded-none">
        
        {/* Header Oficial CZPM */}
        <div className="flex flex-col text-center border-b-2 border-gray-950 pb-4 mb-6">
          <h1 className="text-2xl font-bold uppercase tracking-widest text-gray-950">Certificado Zoosanitario de Producción y Movilización (CZPM-M)</h1>
          <p className="text-sm font-semibold text-gray-800">República de Control Agropecuario - Sistema Oficial de Trazabilidad Bovina</p>
          <div className="mt-4 flex justify-between text-left w-full border-t border-gray-400 pt-2">
            <p className="font-bold text-lg text-gray-950">N° Guía: {data.evento.numeroGuia || 'AUTO-GENERADA'}</p>
            <p className="text-sm font-semibold text-gray-950">Fecha de Emisión: {fechaActual}</p>
          </div>
        </div>

        {/* Matriz Tabular */}
        <div className="grid grid-cols-2 gap-0 border-l border-t border-gray-400 mb-6 text-sm">
          {/* Col 1 */}
          <div className="border-r border-b border-gray-400 p-3">
            <h3 className="font-bold text-gray-950 uppercase mb-2">1. Motivo del Tránsito</h3>
            <p className="text-gray-950">{data.evento.tipo.replace('_', ' ')}</p>
          </div>
          <div className="border-r border-b border-gray-400 p-3">
            <h3 className="font-bold text-gray-950 uppercase mb-2">2. Fecha Autorizada de Movilización</h3>
            <p className="text-gray-950">{new Date(data.evento.fecha).toLocaleDateString()}</p>
          </div>

          {/* Col 2 */}
          <div className="border-r border-b border-gray-400 p-3">
            <h3 className="font-bold text-gray-950 uppercase mb-2">3. Origen del Tránsito</h3>
            <p className="text-gray-950"><span className="font-semibold">Finca Origen ID:</span> {data.evento.predioOrigenId || 'Predio Activo (CSMI)'}</p>
          </div>
          <div className="border-r border-b border-gray-400 p-3">
            <h3 className="font-bold text-gray-950 uppercase mb-2">4. Destino del Tránsito</h3>
            <p className="text-gray-950"><span className="font-semibold">Lugar:</span> {data.evento.predioDestinoId ? `Finca Registrada ID: ${data.evento.predioDestinoId}` : data.destinoExterno || 'Tercero Externo'}</p>
          </div>

          {/* Col 3: Transporte, span completo */}
          <div className="col-span-2 border-r border-b border-gray-400 p-3">
            <h3 className="font-bold text-gray-950 uppercase mb-2">5. Identificación del Medio de Transporte y Ruta</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <span className="font-semibold text-gray-950 block text-xs">Conductor:</span>
                <span className="text-gray-950">{data.evento.transportista || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-950 block text-xs">Cédula:</span>
                <span className="text-gray-950">{data.evento.cedulaChofer || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-950 block text-xs">Vehículo/Placa:</span>
                <span className="text-gray-950">{data.evento.placaVehiculo || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-950 block text-xs">Ruta Aprobada:</span>
                <span className="text-gray-950">{data.evento.ruta || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Animales */}
        <h3 className="font-bold text-gray-950 border-b border-gray-950 pb-2 mb-4 uppercase">6. Inventario Detallado de Bovinos ({data.animales?.length || data.totalAnimales})</h3>
        <table className="w-full text-sm border-collapse border border-gray-400 mb-10">
          <thead>
            <tr className="bg-gray-100 text-gray-950">
              <th className="border border-gray-400 p-2 text-left font-bold">N°</th>
              <th className="border border-gray-400 p-2 text-left font-bold">Código Oficial (Arete)</th>
              <th className="border border-gray-400 p-2 text-left font-bold">Raza Declarada</th>
              <th className="border border-gray-400 p-2 text-left font-bold">Categoría/Sexo</th>
              <th className="border border-gray-400 p-2 text-left font-bold">Estado Sanitario</th>
            </tr>
          </thead>
          <tbody>
            {data.animales?.map((a: any, i: number) => (
              <tr key={i} className="text-gray-950">
                <td className="border border-gray-400 p-2 text-center">{i + 1}</td>
                <td className="border border-gray-400 p-2 font-mono font-bold">{a.codigoVisual}</td>
                <td className="border border-gray-400 p-2">{a.raza}</td>
                <td className="border border-gray-400 p-2">{a.sexo}</td>
                <td className="border border-gray-400 p-2">APTO</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Firmas Oficiales */}
        <div className="grid grid-cols-3 gap-8 mt-24 text-center text-sm pt-4">
          <div>
            <div className="border-t border-gray-950 w-3/4 mx-auto mb-2"></div>
            <p className="font-bold text-gray-950">Firma Remitente (Origen)</p>
            <p className="text-gray-800 text-xs mt-1">C.I.: ___________________</p>
          </div>
          <div>
            <div className="border-t border-gray-950 w-3/4 mx-auto mb-2"></div>
            <p className="font-bold text-gray-950">Firma del Transportista</p>
            <p className="text-gray-800 text-xs mt-1">C.I.: {data.evento.cedulaChofer || '___________________'}</p>
          </div>
          <div>
            <div className="border-t border-gray-950 w-3/4 mx-auto mb-2"></div>
            <p className="font-bold text-gray-950">Firma Receptor (Destino)</p>
            <p className="text-gray-800 text-xs mt-1">Sello de Control</p>
          </div>
        </div>
        
        <div className="mt-8 text-xs text-gray-700 text-center border-t border-gray-400 pt-4">
          <p>Este documento es de uso estrictamente oficial y respalda la trazabilidad sanitaria del ganado movilizado.</p>
          <p>Generado automáticamente por el Sistema Integral de Trazabilidad Bovina (CSMI/SIFAE).</p>
        </div>
      </div>
    </div>
  );
});

GuiaImprimible.displayName = 'GuiaImprimible';
