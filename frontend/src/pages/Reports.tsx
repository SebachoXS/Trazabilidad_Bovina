import React, { useState } from 'react';
import { useGlobalContext } from '../store/globalContextStore';
import { useInventarioReport, useSanidadReport, useRetirosReport } from '../features/reports/hooks/useReports';
import { reportService } from '../features/reports/api/report.service';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { Users, HeartPulse, AlertTriangle, FileText, Download, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'SANIDAD' | 'RETIROS'>('INVENTARIO');
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  const { selectedPredioId, selectedPropietarioId } = useGlobalContext();
  const filters = {
    predioId: selectedPredioId === 'ALL' || !selectedPredioId ? undefined : Number(selectedPredioId),
    propietarioId: selectedPropietarioId === 'ALL' || !selectedPropietarioId ? undefined : Number(selectedPropietarioId)
  };

  const inventario = useInventarioReport(filters);
  const sanidad = useSanidadReport(filters);
  const retiros = useRetirosReport(filters);

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      const url = activeTab === 'INVENTARIO' ? '/reportes/inventario' : '/reportes/sanitario';
      const filename = activeTab === 'INVENTARIO' ? 'reporte_inventario' : 'reporte_sanitario';
      
      if (activeTab === 'RETIROS') {
        toast.error('La exportación de retiros aún no está soportada en backend.');
        return;
      }

      await reportService.downloadReport(url, format, filename, filters);
      toast.success(`Exportado a ${format.toUpperCase()} con éxito.`);
    } catch (error) {
      toast.error('Error al exportar el reporte.');
    } finally {
      setIsExporting(false);
    }
  };

  if (inventario.isLoading || sanidad.isLoading || retiros.isLoading || !inventario.data || !sanidad.data || !retiros.data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 font-medium text-lg flex items-center gap-3 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
          Cargando información del reporte...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in p-2 sm:p-4">
      
      {/* Header & Acciones */}
      <div className="bg-white p-8 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-gray-200 shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-950">Reportes y Analíticas</h1>
            <p className="text-gray-600 mt-1">Consulta los datos globales de la granja</p>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <button 
            onClick={() => handleExport('csv')}
            disabled={isExporting || activeTab === 'RETIROS'}
            className="bg-white px-4 py-2 flex items-center gap-2 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 border border-gray-300 shadow-sm"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar CSV
          </button>
          <button 
            onClick={() => handleExport('pdf')}
            disabled={isExporting || activeTab === 'RETIROS'}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 flex items-center gap-2 rounded-lg font-medium shadow-md disabled:opacity-50 transition-colors"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-gray-100 p-1.5 rounded-xl border border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('INVENTARIO')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'INVENTARIO' ? 'bg-white text-gray-950 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" />
          Inventario
        </button>
        <button
          onClick={() => setActiveTab('SANIDAD')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'SANIDAD' ? 'bg-white text-gray-950 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          Sanidad
        </button>
        <button
          onClick={() => setActiveTab('RETIROS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'RETIROS' ? 'bg-red-50 text-red-700 shadow-sm border border-red-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Retiros Críticos
          {retiros.data?.data && retiros.data.data.length > 0 && (
            <span className="ml-2 bg-red-600 text-white text-xs px-2.5 py-0.5 rounded-full font-bold shadow-sm">
              {retiros.data.data.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 min-h-[400px] shadow-sm">
        
        {/* INVENTARIO TAB */}
        {activeTab === 'INVENTARIO' && (
          <div className="space-y-6 animate-fade-in">
            {inventario.isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
            ) : inventario.isError ? (
              <div className="text-red-600 text-center py-10">Error al cargar el inventario.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
                    <div className="bg-blue-100 p-4 rounded-xl text-blue-600">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-sm font-medium">Total de Animales</p>
                      <h3 className="text-3xl font-bold text-gray-950">{inventario.data?.data?.total || 0}</h3>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                    <h3 className="text-sm font-medium text-gray-600 mb-4 border-b border-gray-200 pb-2">Distribución por Estado</h3>
                    <div className="space-y-3">
                      {Object.entries(inventario.data?.data?.porEstado || {}).map(([estado, count]) => (
                        <div key={estado} className="flex justify-between items-center">
                          <span className="text-sm text-gray-950">{estado}</span>
                          <span className="text-sm font-bold text-emerald-600">{count as React.ReactNode}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                    <h3 className="text-sm font-medium text-gray-600 mb-4 border-b border-gray-200 pb-2">Distribución por Sexo</h3>
                    <div className="space-y-3">
                      {Object.entries(inventario.data?.data?.porSexo || {}).map(([sexo, count]) => (
                        <div key={sexo} className="flex justify-between items-center">
                          <span className="text-sm text-gray-950">{sexo}</span>
                          <span className="text-sm font-bold text-emerald-600">{count as React.ReactNode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SANIDAD TAB */}
        {activeTab === 'SANIDAD' && (
          <div className="space-y-6 animate-fade-in">
            {sanidad.isLoading ? (
               <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
            ) : sanidad.isError ? (
              <div className="text-red-600 text-center py-10">Error al cargar los datos sanitarios.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600 shadow-sm">
                    <HeartPulse className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Eventos Registrados</p>
                    <h3 className="text-3xl font-bold text-gray-950">{sanidad.data?.data?.totalEventos || 0}</h3>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl flex items-center gap-4 transition-transform hover:-translate-y-1">
                  <div className="bg-red-100 p-4 rounded-xl text-red-600 shadow-sm">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm font-medium">En Retiro Activo</p>
                    <h3 className="text-3xl font-bold text-gray-950">{sanidad.data?.data?.animalesEnRetiro || 0}</h3>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-6 rounded-2xl">
                  <h3 className="text-sm font-medium text-gray-600 mb-4 border-b border-gray-200 pb-2">Por Tipo de Evento</h3>
                  <div className="space-y-3">
                    {Object.entries(sanidad.data?.data?.porTipo || {}).map(([tipo, count]) => (
                      <div key={tipo} className="flex justify-between items-center">
                        <span className="text-sm text-gray-950">{tipo}</span>
                        <span className="text-sm font-bold text-emerald-600">{count as React.ReactNode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RETIROS TAB */}
        {activeTab === 'RETIROS' && (
          <div className="space-y-6 animate-fade-in">
            {retiros.isLoading ? (
               <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-emerald-600" /></div>
            ) : retiros.isError ? (
              <div className="text-red-600 text-center py-10">Error al cargar los retiros.</div>
            ) : (!retiros.data?.data || retiros.data.data.length === 0) ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <HeartPulse className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-950">¡Todo en orden!</h3>
                <p className="text-gray-500 mt-2 text-lg">No hay animales en período de retiro en este momento.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 text-sm font-medium text-gray-600 bg-gray-50">
                      <th className="py-4 px-6 rounded-tl-lg">Código Visual</th>
                      <th className="py-4 px-6">Animal</th>
                      <th className="py-4 px-6">Estado</th>
                      <th className="py-4 px-6 text-right rounded-tr-lg">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(retiros.data?.data || []).map((animal: any) => (
                      <tr key={animal.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 font-mono font-bold text-gray-950 text-lg">{animal.codigoVisual}</td>
                        <td className="py-4 px-6 font-medium text-gray-600">{animal.nombre || 'Sin nombre'}</td>
                        <td className="py-4 px-6">
                          <Badge estado={animal.estado || 'EN_RETIRO'} />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => navigate(`/animales/${animal.id}`)}
                            className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            Ver Detalles
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
