import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Building, Send, CheckCircle, Loader2 } from 'lucide-react';

export function SolicitudFincaTrabajador() {
  const [fincas, setFincas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/predios/disponibles').then(res => {
      setFincas(res.data.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!selectedId) return;
    setSending(true);
    try {
      await api.post('/usuarios/solicitar-finca', { predioId: selectedId });
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (success) {
    return (
      <div className="flex justify-center items-center h-full py-32">
        <div className="bg-green-50 border border-green-200 p-8 rounded-2xl flex flex-col items-center max-w-lg text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-green-800">Solicitud Enviada</h2>
          <p className="text-green-700 mt-2">
            Tu solicitud de vinculación ha sido enviada al propietario. Espera a que sea aprobada para acceder al sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-50 p-4 rounded-full">
            <Building className="w-10 h-10 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Vincularse a una Finca</h2>
        <p className="text-center text-gray-500 mb-6">
          Para comenzar a trabajar, debes solicitar acceso a la finca en la que operas.
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selecciona una finca</label>
              <select 
                value={selectedId} 
                onChange={e => setSelectedId(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary p-3"
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
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  <Send className="w-5 h-5 mr-2" /> Enviar Solicitud
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
