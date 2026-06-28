/**
 * @file frontend/src/features/reproduction/hooks/useCreateReproductionEvent.ts
 * @description Hook de React Query para registrar eventos reproductivos.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reproductionService } from '../api/reproduction.service';
import type { CreateEventoReproductivoDTO } from '../api/reproduction.service';

export const useCreateReproductionEvent = (animalId: number | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventoReproductivoDTO) => reproductionService.createEvent(animalId, data),
    onSuccess: (data, variables) => {
      // Invalida la hoja de vida de la madre
      queryClient.invalidateQueries({ queryKey: ['animal', String(animalId), 'hoja-vida'] });
      
      // Si fue un parto, hay un nuevo ternero. Invalidamos el inventario general.
      if (variables.tipo === 'PARTO') {
        queryClient.invalidateQueries({ queryKey: ['animales'] });
      }
    },
  });
};
