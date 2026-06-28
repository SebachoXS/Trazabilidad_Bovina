import { useMutation, useQueryClient } from '@tanstack/react-query';
import { healthService, type CreateEventoSanitarioDTO } from '../api/health.service';

export const useCreateBatchEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { animalIds: number[]; evento: CreateEventoSanitarioDTO }) => 
      healthService.createBatchEvento(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      queryClient.invalidateQueries({ queryKey: ['reportes', 'retiro'] });
    },
  });
};
