/**
 * @file frontend/src/features/animals/hooks/useAnimals.ts
 * @description Hook de React Query para la gestión de caché de la lista de animales.
 */

import { useQuery } from '@tanstack/react-query';
import { animalsService } from '../api/animals.service';

export const useAnimals = (page = 1, limit = 50, filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['animales', page, limit, filters],
    queryFn: () => animalsService.getAnimales(page, limit, filters),
  });
};
