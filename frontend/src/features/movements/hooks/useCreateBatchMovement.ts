import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';

export function useCreateBatchMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/api/v1/movimientos/batch', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Guía de Movilización registrada y procesada.');
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Error al procesar el traslado masivo.';
      toast.error(msg);
    },
  });
}
