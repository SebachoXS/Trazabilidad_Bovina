import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productivityService } from '../api/productivity.service';

export const useRegistrarDestete = (animalId: number | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => productivityService.registrarDestete(Number(animalId), data),
    onSuccess: () => {
      // Invalida la hoja de vida para actualizar la GDP, la etapa y el Timeline
      queryClient.invalidateQueries({ queryKey: ['animal', String(animalId), 'hoja-vida'] });
    },
  });
};
