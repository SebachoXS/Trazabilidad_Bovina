import { LogIn, Activity, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect } from 'react';

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 rounded-brand-xl shadow-lg border border-white/10">
        
        {/* Indicador de conexión */}
        <div className="flex justify-end mb-4">
          {isOnline ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              <Wifi className="w-3 h-3" /> Online
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
              <WifiOff className="w-3 h-3" /> Offline Mode
            </span>
          )}
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <Activity className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-center text-white">Trazabilidad Bovina</h1>
          <p className="text-[var(--text-muted)] text-center mt-2">Sistema Integral de Gestión y Control</p>
        </div>

        <button className="w-full bg-primary text-white hover:bg-primary-light font-medium py-3 px-4 rounded-brand flex items-center justify-center gap-2 transition-colors duration-200">
          <LogIn className="w-5 h-5" />
          <span>Iniciar Sesión</span>
        </button>
        
        <div className="mt-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/40">
            Fase 5 - Arquitectura Frontend
          </span>
        </div>
      </div>
    </div>
  );
}

export default App;
