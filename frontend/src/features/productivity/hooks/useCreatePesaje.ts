/**
 * @file frontend/src/features/productivity/hooks/useCreatePesaje.ts
 * @description Hook de React Query para registrar un nuevo pesaje.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { productivityService } from '../api/productivity.service';
import type { CreatePesajeDTO } from '../api/productivity.service';

export const useCreatePesaje = (animalId: number | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreatePesajeDTO, 'animalId'>) => 
      productivityService.createPesaje({ ...data, animalId: Number(animalId) }),
    onSuccess: () => {
      // Invalida la hoja de vida para actualizar la GDP y el Timeline
      queryClient.invalidateQueries({ queryKey: ['animal', String(animalId), 'hoja-vida'] });
    },
  });
};
