/**
 * @file frontend/src/features/animals/api/animals.service.ts
 * @description Servicio de API para la gestión de animales.
 */

import { api } from '../../../services/api';
import type { AnimalState } from '../../../components/ui/Badge';

export interface AnimalDTO {
  id: number;
  codigoVisual: string;
  nombre: string | null;
  raza: string;
  sexo: 'MACHO' | 'HEMBRA';
  estado: AnimalState | 'PENDIENTE_APROBACION';
  fechaNacimiento: string | null;
  predioId: number;
}

export interface GetAnimalesResponse {
  success: boolean;
  data: AnimalDTO[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TimelineEvent {
  id: string; // Puede ser un id sintético "tipo-id"
  tipo: 'NACIMIENTO' | 'EVENTO_SANITARIO' | 'PESAJE' | 'EVENTO_REPRODUCTIVO' | 'MOVIMIENTO';
  fecha: string;
  detalle: string;
  producto?: string | null;
  peso?: number | null;
  motivo?: string | null;
  destino?: string | null;
}

export interface CreateAnimalDTO {
  codigoVisual: string;
  nombre?: string;
  raza: string;
  sexo: 'MACHO' | 'HEMBRA';
  fechaNacimiento?: string;
  padreId?: number;
  madreId?: number;
  predioId: number;
  pesoNacimiento?: number;
  isGestante?: boolean;
  registrarIngreso?: boolean;
  numeroGuiaIngreso?: string;
}

export interface AlertaAnimal {
  tipo: 'RETIRO_ACTIVO' | 'REVISAR_PESO';
  mensaje: string;
  diasRestantes?: number;
  producto?: string;
  fechaFinRetiro?: string;
}

export interface HojaDeVidaDTO {
  success: boolean;
  data: {
    animal: AnimalDTO & {
      padre?: { codigoVisual: string } | null;
      madre?: { codigoVisual: string } | null;
    };
    lineaDeTiempo: TimelineEvent[];
    alertas: AlertaAnimal[];
    estadisticas: {
      gananciaDiariaPromedio: number;
      numeroPartos: number;
      edadMeses: number;
    };
  };
}

export const animalsService = {
  getAnimales: async (page = 1, limit = 50, filters?: Record<string, any>): Promise<GetAnimalesResponse> => {
    const { data } = await api.get<GetAnimalesResponse>('/animales', {
      params: { page, limit, ...filters },
    });
    return data;
  },
  
  getHojaDeVida: async (id: number | string): Promise<HojaDeVidaDTO> => {
    const { data } = await api.get<HojaDeVidaDTO>(`/animales/${id}/hoja-de-vida`);
    return data;
  },

  createAnimal: async (payload: CreateAnimalDTO): Promise<{ success: boolean; data: AnimalDTO }> => {
    const { data } = await api.post<{ success: boolean; data: AnimalDTO }>('/animales', payload);
    return data;
  },

  getHojaDeVidaByCodigo: async (codigoVisual: string): Promise<HojaDeVidaDTO> => {
    const { data } = await api.get<HojaDeVidaDTO>(`/animales/codigo/${codigoVisual}/hoja-de-vida`);
    return data;
  },

  aprobarAlta: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/animales/${id}/aprobar-alta`);
    return data;
  },

  rechazarAlta: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/animales/${id}/rechazar-alta`);
    return data;
  },

  darDeBaja: async (id: number, motivo: string, detalle: string): Promise<{ success: boolean; data: any }> => {
    const { data } = await api.put(`/animales/${id}/baja`, { motivo, detalle });
    return data;
  }
};
