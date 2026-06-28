/**
 * @file frontend/src/features/productivity/api/productivity.service.ts
 * @description Servicio de API para el Módulo Productivo (Pesajes).
 */

import { api } from '../../../services/api';

export interface CreatePesajeDTO {
  animalId: number;
  fecha: string;
  peso: number;
  condicionCorporal?: number | null;
  observaciones?: string | null;
}

export const productivityService = {
  createPesaje: async (data: CreatePesajeDTO) => {
    const response = await api.post('/pesajes', data);
    return response.data;
  },
  registrarDestete: async (animalId: number, data: any) => {
    const response = await api.post(`/animales/${animalId}/pesajes/destete`, data);
    return response.data;
  }
};
