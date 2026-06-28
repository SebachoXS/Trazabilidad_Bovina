/**
 * @file frontend/src/features/reports/api/report.service.ts
 * @description Servicio API para los reportes de la granja.
 */

import { api } from '../../../services/api';
import type { AnimalDTO } from '../../animals/api/animals.service';

export interface InventarioStats {
  total: number;
  porEstado: Record<string, number>;
  porSexo: Record<string, number>;
}

export interface SanidadStats {
  totalEventos: number;
  porTipo: Record<string, number>;
  animalesEnRetiro: number;
}

export const reportService = {
  getInventario: async (filters?: Record<string, any>): Promise<{ success: boolean; data: InventarioStats }> => {
    const { data } = await api.get('/reportes/inventario', { params: filters });
    return { success: data.success, data: data.data.resumen };
  },

  getSanidad: async (filters?: Record<string, any>): Promise<{ success: boolean; data: SanidadStats }> => {
    const { data } = await api.get('/reportes/sanitario', { params: filters });
    const resumen = data.data.resumen;
    return { 
      success: data.success, 
      data: {
        totalEventos: resumen.totalEventos,
        porTipo: {
          VACUNACION: resumen.vacunaciones,
          TRATAMIENTO: resumen.tratamientos,
          DIAGNOSTICO: resumen.diagnosticos
        },
        animalesEnRetiro: 0 // Defaulting to 0 since backend doesn't provide this directly here
      } 
    };
  },

  getRetiros: async (filters?: Record<string, any>): Promise<{ success: boolean; data: AnimalDTO[] }> => {
    const { data } = await api.get('/reportes/animales-en-retiro', { params: filters });
    return { success: data.success, data: data.data.detalle };
  },

  downloadReport: async (url: string, format: 'pdf' | 'csv', filename: string, filters?: Record<string, any>) => {
    const response = await api.get(url, {
      params: { formato: format, ...filters },
      responseType: 'blob'
    });
    const blob = new Blob([response.data], { 
      type: format === 'pdf' ? 'application/pdf' : 'text/csv' 
    });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};
