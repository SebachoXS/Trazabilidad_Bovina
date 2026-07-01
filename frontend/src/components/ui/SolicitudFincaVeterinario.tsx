import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { adminService } from '../../features/admin/api/admin.service';
import { Building, Send, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function SolicitudFincaVeterinario() {
  const [fincas, setFincas] = useState<any[]>([]);
  const [solicitudesActivas, setSolicitudesActivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fincasRes, solicitudesRes] = await Promise.all([
        api.get('/predios/disponibles'),
        adminService.getSolicitudesAcceso()
      ]);
      setFincas(fincasRes.data.data);
      setSolicitudesActivas(solicitudesRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await adminService.solicitarAcceso(parseInt(selectedId, 10));
      toast.success('Solicitud enviada correctamente');
      setSelectedId('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al enviar la solicitud');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center py-12 px-4 min-h-[60vh] max-w-2xl mx-auto space-y-8">
      
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full">
        <div className="flex justify-center mb-4">
          <div className="bg-emerald-50 p-4 rounded-full">
            <Building className="w-10 h-10 text-emerald-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Mis Clientes (Veterinario)</h2>
        <p className="text-center text-gray-500 mb-6">
          Puedes enviar múltiples solicitudes a diferentes fincas. Una vez aprobadas, podrás intercambiar entre ellas desde el menú superior.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Solicitar acceso a una nueva finca</label>
              <select 
                value={selectedId} 
                onChange={e => setSelectedId(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-3"
              >
                <option value="">-- Elige la finca --</option>
                {fincas.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre} (Prop: {f.propietario})</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!selectedId || sending}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Send className="w-5 h-5 mr-2" /> Enviar Solicitud de Acceso
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {solicitudesActivas.length > 0 && (
        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-blue-500" />
            Tus Solicitudes Pendientes
          </h3>
          <ul className="space-y-3">
            {solicitudesActivas.map((s, idx) => (
              <li key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex justify-between items-center">
                <span className="font-medium text-gray-700">{s.predio.nombre} <span className="text-sm font-normal text-gray-500">({s.predio.propietario.nombre})</span></span>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">Pendiente</span>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
