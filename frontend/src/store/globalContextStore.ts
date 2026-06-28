import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlobalContextState {
  selectedPropietarioId: number | null;
  selectedPredioId: number | null;
  setPropietarioId: (id: number | null) => void;
  setPredioId: (id: number | null) => void;
  clearContext: () => void;
}

export const useGlobalContext = create<GlobalContextState>()(
  persist(
    (set) => ({
      selectedPropietarioId: null,
      selectedPredioId: null,
      setPropietarioId: (id) => set({ selectedPropietarioId: id, selectedPredioId: null }), // Al cambiar propietario, limpiamos el predio para forzar la cascada
      setPredioId: (id) => set({ selectedPredioId: id }),
      clearContext: () => set({ selectedPropietarioId: null, selectedPredioId: null }),
    }),
    {
      name: 'global-context-storage',
    }
  )
);
