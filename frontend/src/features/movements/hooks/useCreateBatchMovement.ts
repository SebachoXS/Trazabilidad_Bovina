import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';

export function useCreateBatchMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/movimientos/batch', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Guía de Movilización registrada y procesada.');
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
    },
    onError: (err: any) => {
      const errorPayload = err.response?.data?.error || err.response?.data || err.message;
      const msg = typeof errorPayload === 'object' ? JSON.stringify(errorPayload, null, 2) : errorPayload;
      toast.error("Fallo del servidor en traslado (Hook): " + msg);
    },
  });
}
