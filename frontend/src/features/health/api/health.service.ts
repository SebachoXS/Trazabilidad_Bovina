/**
 * @file frontend/src/features/health/api/health.service.ts
 * @description Servicio de API para el Módulo Sanitario.
 */

import { api } from '../../../services/api';

export interface CreateEventoSanitarioDTO {
  tipo: 'VACUNACION' | 'TRATAMIENTO' | 'DIAGNOSTICO' | 'DESPARASITACION' | 'CIRUGIA';
  fecha: string;
  producto?: string;
  principioActivo?: string;
  dosis?: string;
  viaAdministracion?: string;
  lote?: string;
  laboratorio?: string;
  periodoRetiro: number;
  diagnostico?: string;
  observaciones?: string;
}

export const healthService = {
  createEvento: async (animalId: number | string, data: CreateEventoSanitarioDTO) => {
    const response = await api.post(`/animales/${animalId}/eventos`, data);
    return response.data;
  },
  createBatchEvento: async (data: { animalIds: number[]; evento: CreateEventoSanitarioDTO }) => {
    const response = await api.post(`/eventos/lote`, data);
    return response.data;
  }
};
