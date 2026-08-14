/**
 * @file frontend/src/pages/AnimalProfile.tsx
 * @description Página de Detalle: Hoja de Vida Integral de un Bovino.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertTriangle, Info, Weight, Stethoscope, Dna } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { useAnimalDetails } from '../features/animals/hooks/useAnimalDetails';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Timeline } from '../components/ui/Timeline';
import { HealthEventModal } from '../features/health/components/HealthEventModal';
import { WeighingModal } from '../features/productivity/components/WeighingModal';
import { ReproductionModal } from '../features/reproduction/components/ReproductionModal';
import { MovementModal } from '../features/movements/components/MovementModal';
import { DesteteModal } from '../features/productivity/components/DesteteModal';
import { Plus, Scale, Truck, Baby, Scissors } from 'lucide-react';
import { useCanAccess } from '../features/auth/hooks/useCanAccess';

export default function AnimalProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useAnimalDetails(id);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isWeighingModalOpen, setIsWeighingModalOpen] = useState(false);
  const [isReproModalOpen, setIsReproModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

  const [isDesteteModalOpen, setIsDesteteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'identificacion' | 'sanitario' | 'pesajes' | 'reproduccion' | 'movimientos'>('identificacion');

  const canAccessAdminVet = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO']);
  const canAccessAllMod = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO', 'VETERINARIO', 'OPERARIO']);
  const canAccessAdminProp = useCanAccess(['SUPER_ADMIN', 'PROPIETARIO']);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4 animate-fade-in">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--primary)]" />
        <p className="text-[var(--text-muted)] font-medium">Cargando expediente del bovino...</p>
      </div>
    );
  }

  if (isError || !data || !data.success) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center mx-auto max-w-lg mt-10">
        <AlertTriangle className="w-12 h-12 mb-3 animate-pulse" />
        <p className="text-xl font-medium text-white">Error al cargar la Hoja de Vida.</p>
        <p className="text-sm mt-2 text-[var(--text-muted)] text-center">El animal podría no existir o no tienes permisos suficientes.</p>
        <button className="btn-primary mt-6 px-6 py-2 rounded-lg font-medium" onClick={() => navigate('/animales')}>
          Volver al Inventario
        </button>
      </div>
    );
  }

  const { animal, lineaDeTiempo, alertas, estadisticas, resumenProductivo } = data.data;

  // Fórmulas Zootécnicas Avanzadas
  const pesajesSeguros = animal.pesajes || [];
  const pesajes = [...pesajesSeguros].sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  const pesoNacer = animal.pesoNacimiento || (pesajes.find((p: any) => p.tipoPesaje === 'NACIMIENTO')?.peso) || 30; // 30kg por defecto si se desconoce
  
  // Edad
  const calcularEdadDias = (fecha: string) => (new Date().getTime() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24);
  const edadDias = animal.fechaNacimiento ? calcularEdadDias(animal.fechaNacimiento) : 0;
  const edadMeses = edadDias > 0 ? (edadDias / 30.44).toFixed(2) : (estadisticas?.edadMeses ? Number(estadisticas.edadMeses).toFixed(2) : animal?.edad?.meses ? Number(animal.edad.meses).toFixed(2) : 'N/A');

  // GDP Dinámico (último periodo)
  let gdpReal = estadisticas?.gananciaDiariaPromedio ? Number(estadisticas.gananciaDiariaPromedio).toFixed(2) : resumenProductivo?.gdpPromedio ? Number(resumenProductivo.gdpPromedio).toFixed(2) : 'N/A';
  if (pesajes.length >= 2) {
    const p1 = pesajes[0];
    const p2 = pesajes[1];
    const dias = (new Date(p1.fecha).getTime() - new Date(p2.fecha).getTime()) / (1000 * 60 * 60 * 24);
    if (dias > 0) gdpReal = ((p1.peso - p2.peso) / dias).toFixed(2);
  }

  // Peso Ajustado 205 (Destete)
  let p205 = 'N/A';
  const destete = pesajes.find((p: any) => p.tipoPesaje === 'DESTETE') || pesajes.find((p: any) => p.tipoPesaje !== 'NACIMIENTO');
  if (destete && animal.fechaNacimiento) {
    const diasAlDestete = (new Date(destete.fecha).getTime() - new Date(animal.fechaNacimiento).getTime()) / (1000 * 60 * 60 * 24);
    if (diasAlDestete > 0) {
      p205 = (((destete.peso - pesoNacer) / diasAlDestete) * 205 + pesoNacer).toFixed(2);
    }
  }

  // Peso Ajustado 365 (Año)
  let p365 = 'N/A';
  const ultimoPesaje = pesajes.find((p: any) => p.tipoPesaje !== 'NACIMIENTO');
  if (ultimoPesaje && animal.fechaNacimiento) {
    const diasAlPesaje = (new Date(ultimoPesaje.fecha).getTime() - new Date(animal.fechaNacimiento).getTime()) / (1000 * 60 * 60 * 24);
    if (diasAlPesaje > 0) {
      p365 = (((ultimoPesaje.peso - pesoNacer) / diasAlPesaje) * 365 + pesoNacer).toFixed(2);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in p-2 sm:p-4">
      {/* Botón de retroceso y acciones */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <button 
          onClick={() => navigate('/animales')}
          className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Inventario
        </button>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* {canAccessAdminProp && (
            <button 
              onClick={() => setIsMoveModalOpen(true)}
              disabled={animal.estado === 'EN_RETIRO'}
              className={`bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${animal.estado === 'EN_RETIRO' ? 'opacity-50 cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 text-gray-700'}`}
              title={animal.estado === 'EN_RETIRO' ? 'En retiro sanitario' : ''}
            >
              <Truck className="w-4 h-4 mr-2" /> Movimiento
            </button>
          )} */}
          {canAccessAdminVet && (
            <button onClick={() => setIsReproModalOpen(true)} className="bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center text-gray-700">
              <Baby className="w-4 h-4 mr-2" /> Reproducción
            </button>
          )}
          {canAccessAllMod && (
            <button onClick={() => setIsWeighingModalOpen(true)} className="bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center text-gray-700">
              <Scale className="w-4 h-4 mr-2" /> Pesaje
            </button>
          )}
          {canAccessAllMod && animal.etapaActual === 'CRIA' && (
            <button onClick={() => setIsDesteteModalOpen(true)} className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors px-4 py-2 rounded-lg text-sm font-medium flex items-center border border-yellow-200">
              <Scissors className="w-4 h-4 mr-2" /> Destetar
            </button>
          )}
          {canAccessAdminVet && (
            <button onClick={() => setIsHealthModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Sanidad
            </button>
          )}
        </div>
      </div>

      {/* Alertas Críticas */}
      {alertas && alertas.length > 0 && (
        <div className="space-y-3">
          {alertas.map((alerta, idx) => (
            <div key={idx} className="bg-red-500/20 border border-red-500/40 text-white p-4 rounded-xl flex items-start gap-3 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5 text-red-400" />
              <div>
                <h3 className="font-bold text-lg text-red-100">{alerta.mensaje}</h3>
                {alerta.tipo === 'RETIRO_ACTIVO' && alerta.diasRestantes && (
                  <p className="text-red-300 text-sm mt-1 font-medium">
                    Faltan {alerta.diasRestantes} días. Administrado: {alerta.producto}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cabecera del Perfil (Hero Section) */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 lg:p-8 flex flex-col md:flex-row items-start gap-6 relative overflow-hidden shadow-sm">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-200 rounded-full blur-[120px] opacity-50 pointer-events-none"></div>
        
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full border-4 border-emerald-100 shadow-md flex items-center justify-center shrink-0 relative z-10">
          <span className="text-5xl drop-shadow-sm">🐄</span>
        </div>

        <div className="flex-1 space-y-4 relative z-10 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-mono font-bold text-gray-950 tracking-tight">
                {animal.codigoVisual}
              </h1>
              {animal.codigoSistema && (
                <p className="text-sm text-gray-600 font-mono mt-0.5">
                  ID: {animal.codigoSistema}
                </p>
              )}
              <p className="text-xl text-gray-700 font-medium mt-1">
                {animal.nombre ? `"${animal.nombre}"` : 'Sin nombre registrado'}
              </p>
            </div>
            <Badge estado={animal.estado} className="text-sm px-4 py-1.5 shadow-sm" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pt-4 border-t border-emerald-200/50">
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Info className="w-4 h-4"/> Raza</p>
              <p className="font-semibold text-gray-950">{animal.raza}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Info className="w-4 h-4"/> Sexo</p>
              <p className="font-semibold text-gray-950">{animal.sexo}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-1"><Stethoscope className="w-4 h-4"/> Edad</p>
              <p className="font-semibold text-gray-950">{edadMeses !== 'N/A' ? `${edadMeses} meses` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-emerald-700 mb-1 flex items-center gap-1"><Weight className="w-4 h-4"/> G.D.P</p>
              <p className="font-bold text-gray-950">{gdpReal !== 'N/A' ? `${gdpReal} kg/día` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-emerald-700 mb-1 flex items-center gap-1"><Weight className="w-4 h-4"/> P205</p>
              <p className="font-bold text-gray-950">{p205 !== 'N/A' ? `${p205} kg` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-emerald-700 mb-1 flex items-center gap-1"><Weight className="w-4 h-4"/> P365</p>
              <p className="font-bold text-gray-950">{p365 !== 'N/A' ? `${p365} kg` : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTab('identificacion')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'identificacion' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          Identificación
        </button>
        <button 
          onClick={() => setActiveTab('sanitario')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'sanitario' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          Historial Sanitario
        </button>
        <button 
          onClick={() => setActiveTab('pesajes')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'pesajes' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          Pesajes & Destete
        </button>
        {/* <button 
          onClick={() => setActiveTab('movimientos')}
          className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'movimientos' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
        >
          Movimientos
        </button> */}
        {animal.sexo === 'HEMBRA' && (
          <button 
            onClick={() => setActiveTab('reproduccion')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeTab === 'reproduccion' ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            Reproducción
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="glass-panel rounded-2xl p-6 min-h-[400px]">
        {activeTab === 'identificacion' && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-bold text-gray-950 mb-4">Ficha Técnica General</h2>
            
            {(animal.padre || animal.madre) && (
              <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex flex-col sm:flex-row items-center gap-6 shadow-sm">
                <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                  <Dna className="w-8 h-8" />
                </div>
                <div className="flex-1 flex gap-12 w-full justify-around sm:justify-start">
                  {animal.padre && (
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider mb-1">Padre</p>
                      <p className="font-mono font-bold text-lg text-gray-950">{animal.padre.codigoVisual}</p>
                    </div>
                  )}
                  {animal.madre && (
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider mb-1">Madre</p>
                      <p className="font-mono font-bold text-lg text-gray-950">{animal.madre.codigoVisual}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mt-6">
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500 font-medium">Propósito Productivo</p>
                <p className="text-lg font-bold text-gray-950 mt-1">
                  {(() => {
                    const val = animal.proposito;
                    if (!val) return 'No definido';
                    const map: Record<string, string> = {
                      'CARNE': 'Carne',
                      'LECHE': 'Leche',
                      'CRIA_GESTACION': 'Cría / Gestación',
                      'REPRODUCTOR_SEMENTAL': 'Reproductor (Semental)',
                      'DOBLE_PROPOSITO': 'Doble Propósito'
                    };
                    return map[val] || val;
                  })()}
                </p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500 font-medium">Fecha de Nacimiento</p>
                <p className="text-lg font-bold text-gray-950 mt-1">{animal.fechaNacimiento ? new Date(animal.fechaNacimiento).toLocaleDateString() : 'Desconocida'}</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500 font-medium">Etapa Productiva</p>
                <p className="text-lg font-bold text-gray-950 mt-1">{animal.etapaActual || 'No definida'}</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500 font-medium">Finca / Predio</p>
                <p className="text-lg font-bold text-gray-950 mt-1">{animal.predio?.nombre || 'Desconocida'}</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-xl shadow-sm">
                <p className="text-sm text-gray-500 font-medium">Peso al Nacer</p>
                <p className="text-lg font-bold text-gray-950 mt-1">{Number(pesoNacer).toFixed(2)} kg</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sanitario' && (
          <div className="animate-fade-in">
             <h2 className="text-xl font-bold text-white mb-6">Historial Clínico</h2>
             {lineaDeTiempo.filter(e => ['VACUNACION', 'TRATAMIENTO', 'DIAGNOSTICO'].includes(e.tipo)).length === 0 ? (
               <p className="text-[var(--text-muted)] text-center py-10">No hay registros sanitarios.</p>
             ) : (
               <Timeline events={lineaDeTiempo.filter(e => ['VACUNACION', 'TRATAMIENTO', 'DIAGNOSTICO'].includes(e.tipo))} />
             )}
          </div>
        )}

        {activeTab === 'pesajes' && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-xl font-bold text-gray-950">Curva de Desarrollo y Pesajes</h2>
             </div>
             
             {pesajes.length === 0 ? (
               <p className="text-gray-500 text-center py-10">No hay registros de pesaje para graficar.</p>
             ) : (
               <div className="space-y-8">
                 {/* Gráfica de Crecimiento */}
                 <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
                   <h3 className="text-sm font-semibold text-gray-950 mb-4 text-center">Evolución de Peso (kg)</h3>
                   <div className="h-72 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart
                         data={[...pesajes].reverse().map(p => ({
                           fecha: new Date(p.fecha).toLocaleDateString(),
                           peso: p.peso,
                           tipo: p.tipoPesaje || 'RUTINA'
                         }))}
                         margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                       >
                         <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                         <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#6b7280' }} tickMargin={10} axisLine={false} tickLine={false} />
                         <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} tickMargin={10} axisLine={false} tickLine={false} />
                         <RechartsTooltip 
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           labelStyle={{ fontWeight: 'bold', color: '#030712', marginBottom: '4px' }}
                           itemStyle={{ color: '#047857', fontWeight: 'bold' }}
                         />
                         <Legend wrapperStyle={{ paddingTop: '20px' }} />
                         <Line 
                           type="monotone" 
                           dataKey="peso" 
                           name="Peso Real (kg)" 
                           stroke="#059669" 
                           strokeWidth={3}
                           activeDot={{ r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                           dot={{ r: 4, fill: '#059669', strokeWidth: 0 }}
                         />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                 </div>

                 {/* Historial Detallado */}
                 <div>
                   <h3 className="text-lg font-bold text-gray-950 mb-4">Historial de Registros</h3>
                   <div className="grid grid-cols-1 gap-4">
                     {pesajes.map((p: any, idx: number) => {
                        const gananciaAnterior = pesajes[idx + 1] ? (p.peso - pesajes[idx + 1].peso).toFixed(2) : null;
                        const isDestete = p.tipoPesaje === 'DESTETE';
                        const metodoFormat = p.metodoMedicion ? p.metodoMedicion.replace('_', ' ') : 'BASCULA';

                        return (
                          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                            <div className="flex items-center gap-4">
                              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full flex-shrink-0">
                                <Scale className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 font-medium">{new Date(p.fecha).toLocaleDateString()}</p>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-semibold text-gray-950">{p.peso} kg</span>
                                  {gananciaAnterior && (
                                    <span className={`text-sm font-medium ${Number(gananciaAnterior) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      ({Number(gananciaAnterior) > 0 ? '+' : ''}{gananciaAnterior} kg)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col sm:items-end text-sm space-y-1">
                              <div className="flex flex-wrap gap-2 mb-1">
                                <span className="bg-gray-100 text-gray-900 px-2.5 py-0.5 rounded-md font-semibold text-xs border border-gray-200">
                                  {metodoFormat}
                                </span>
                                {isDestete && (
                                  <span className="bg-yellow-100 text-yellow-900 px-2.5 py-0.5 rounded-md font-semibold text-xs border border-yellow-200">
                                    DESTETE
                                  </span>
                                )}
                              </div>
                              {p.metodoMedicion === 'CINTA_ZOOMETRICA' && (
                                <p className="text-gray-600 text-xs font-medium">PT: {p.perimetroToracico} cm | LC: {p.longitudCorporal} cm</p>
                              )}
                              {p.condicionCorporal && <p className="text-gray-600 text-xs font-medium">Condición Corporal: {p.condicionCorporal}</p>}
                              {p.observaciones && <p className="text-gray-500 text-xs mt-1 max-w-sm sm:text-right italic">"{p.observaciones}"</p>}
                            </div>
                          </div>
                        );
                     })}
                   </div>
                 </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'movimientos' && (
          <div className="animate-fade-in">
             <h2 className="text-xl font-bold text-gray-900 mb-6">Historial de Movimientos</h2>
             {lineaDeTiempo.filter(e => e.tipo === 'MOVIMIENTO').length === 0 ? (
               <p className="text-gray-500 text-center py-10">No hay registros de movimientos.</p>
             ) : (
               <Timeline events={lineaDeTiempo.filter(e => e.tipo === 'MOVIMIENTO')} />
             )}
          </div>
        )}

        {activeTab === 'reproduccion' && (
          <div className="animate-fade-in">
             <h2 className="text-xl font-bold text-white mb-6">Historial Reproductivo</h2>
             {lineaDeTiempo.filter(e => ['REPRODUCCION', 'PARTO'].includes(e.tipo)).length === 0 ? (
               <p className="text-[var(--text-muted)] text-center py-10">No hay registros reproductivos.</p>
             ) : (
               <Timeline events={lineaDeTiempo.filter(e => ['REPRODUCCION', 'PARTO'].includes(e.tipo))} />
             )}
          </div>
        )}
      </div>

      <HealthEventModal animalId={id!} isOpen={isHealthModalOpen} onClose={() => setIsHealthModalOpen(false)} />
      <WeighingModal animalId={id!} isOpen={isWeighingModalOpen} onClose={() => setIsWeighingModalOpen(false)} />
      <ReproductionModal animalId={id!} isOpen={isReproModalOpen} onClose={() => setIsReproModalOpen(false)} />
      <MovementModal animalId={id!} isOpen={isMoveModalOpen} onClose={() => setIsMoveModalOpen(false)} />
      <DesteteModal animalId={id!} isOpen={isDesteteModalOpen} onClose={() => setIsDesteteModalOpen(false)} />
    </div>
  );
}
