/**
 * @file frontend/src/features/movements/api/movement.service.ts
 * @description Servicio API para Movimientos.
 */

import { api } from '../../../services/api';

export interface CreateMovimientoDTO {
  tipo: 'TRASLADO_INTERNO' | 'TRASLADO_EXTERNO' | 'CAMBIO_PROPIETARIO' | 'INGRESO' | 'EGRESO_SACRIFICIO';
  fecha: string;
  animalId: number;
  predioOrigenId?: number | null;
  predioDestinoId?: number | null;
  numeroGuia?: string | null;
  pesoMovimiento?: number | null;
  motivoEgreso?: string | null;
  observaciones?: string | null;
}

export const movementService = {
  createMovimiento: async (data: CreateMovimientoDTO) => {
    const response = await api.post('/movimientos', data);
    return response.data;
  }
};
