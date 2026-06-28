/**
 * @file frontend/src/features/health/hooks/useCreateHealthEvent.ts
 * @description Hook de React Query para guardar un nuevo evento sanitario.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { healthService } from '../api/health.service';
import type { CreateEventoSanitarioDTO } from '../api/health.service';

export const useCreateHealthEvent = (animalId: number | string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventoSanitarioDTO) => healthService.createEvento(animalId, data),
    onSuccess: () => {
      // Invalida la hoja de vida para que aparezca el nuevo evento en el Timeline
      queryClient.invalidateQueries({ queryKey: ['animal', animalId, 'hoja-vida'] });
      // Invalida reportes de retiro por si este evento generó una alerta
      queryClient.invalidateQueries({ queryKey: ['reportes', 'retiro'] });
    },
  });
};
