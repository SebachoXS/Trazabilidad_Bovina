/**
 * @file frontend/src/features/animals/hooks/useAnimalDetails.ts
 * @description Hook de React Query para obtener la hoja de vida de un animal.
 */

import { useQuery } from '@tanstack/react-query';
import { animalsService } from '../api/animals.service';

export const useAnimalDetails = (id: string | number | undefined) => {
  return useQuery({
    queryKey: ['animal', id, 'hoja-vida'],
    queryFn: () => animalsService.getHojaDeVida(id!),
    enabled: !!id, // Solo se ejecuta si el id existe
  });
};
