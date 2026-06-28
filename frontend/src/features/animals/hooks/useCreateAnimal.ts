/**
 * @file frontend/src/features/animals/hooks/useCreateAnimal.ts
 * @description Hook de React Query para mutación de alta de animal.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { animalsService } from '../api/animals.service';
import type { CreateAnimalDTO } from '../api/animals.service';

export const useCreateAnimal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAnimalDTO) => animalsService.createAnimal(data),
    onSuccess: () => {
      // Invalida la lista de animales para que la grilla se recargue automáticamente
      queryClient.invalidateQueries({ queryKey: ['animales'] });
    },
  });
};
