/**
 * @file frontend/src/features/dashboard/api/dashboard.service.ts
 * @description Servicio de API para reportes del Dashboard.
 */

import { api } from '../../../services/api';

export interface AnimalEnRetiroDTO {
  id: number;
  codigoVisual: string;
  eventoId: number;
  tipoEvento: string;
  fecha: string;
  diagnostico: string | null;
  producto: string | null;
  diasRetiro: number;
  fechaFinRetiro: string;
  diasRestantes: number;
}

export interface ReporteRetiroResponse {
  success: boolean;
  data: {
    total: number;
    detalle: AnimalEnRetiroDTO[];
  };
}

export const dashboardService = {
  getAnimalesEnRetiro: async (filters?: Record<string, any>): Promise<AnimalEnRetiroDTO[]> => {
    // Pedimos el formato JSON explícitamente al endpoint de reportes
    const { data } = await api.get<ReporteRetiroResponse>('/reportes/animales-en-retiro', {
      params: { formato: 'json', ...filters }
    });
    return data.data.detalle;
  }
};
