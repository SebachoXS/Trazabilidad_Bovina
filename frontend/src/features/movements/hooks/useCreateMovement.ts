/**
 * @file frontend/src/features/movements/hooks/useCreateMovement.ts
 * @description Hook de React Query para registrar movimientos.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { movementService } from '../api/movement.service';
import type { CreateMovimientoDTO } from '../api/movement.service';

export const useCreateMovement = (animalId: number | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<CreateMovimientoDTO, 'animalId'>) => 
      movementService.createMovimiento({ ...data, animalId: Number(animalId) }),
    onSuccess: (data, variables) => {
      // Invalida la hoja de vida
      queryClient.invalidateQueries({ queryKey: ['animal', String(animalId), 'hoja-vida'] });
      
      // Invalida el inventario (puede que el animal ya no esté en el predio actual si fue egreso)
      queryClient.invalidateQueries({ queryKey: ['animales'] });
      
      // Invalida el dashboard de retiro por si salió un animal
      queryClient.invalidateQueries({ queryKey: ['reportes'] });
    },
  });
};
