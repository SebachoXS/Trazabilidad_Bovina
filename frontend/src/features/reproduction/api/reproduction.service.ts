/**
 * @file frontend/src/features/reproduction/api/reproduction.service.ts
 * @description Servicio API para el Módulo de Reproducción.
 */

import { api } from '../../../services/api';

export interface CreateEventoReproductivoDTO {
  tipo: 'INSEMINACION' | 'MONTA' | 'TACTO_GESTACION' | 'PARTO' | 'ABORTO';
  fecha: string;
  toroId?: number;
  observaciones?: string;
  
  // Datos anidados del ternero (Solo si tipo === 'PARTO')
  ternero?: {
    codigoVisual: string;
    nombre?: string;
    raza: string;
    sexo: 'MACHO' | 'HEMBRA';
    pesoNacimiento?: number;
    padreId?: number;
  };
}

export const reproductionService = {
  createEvent: async (animalId: number | string, data: CreateEventoReproductivoDTO) => {
    // Si es parto, el endpoint del backend es específico según el diseño de rutas
    // Revisando reproduccion.routes.ts: POST /reproduccion/:animalId/parto
    if (data.tipo === 'PARTO') {
      const response = await api.post(`/reproduccion/${animalId}/parto`, data);
      return response.data;
    } else {
      const response = await api.post(`/reproduccion/${animalId}`, data);
      return response.data;
    }
  }
};
