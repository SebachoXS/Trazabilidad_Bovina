/**
 * @file frontend/src/features/admin/api/admin.service.ts
 * @description Servicio API para administración (Usuarios, Predios, Propietarios).
 */

import { api } from '../../../services/api';

export interface PredioDTO {
  id: number;
  nombre: string;
  ubicacion: string;
  hectareas: number;
  propietarioId: number;
  createdAt: string;
}

export interface UsuarioDTO {
  id: number;
  email: string;
  nombre: string;
  rol: 'SUPER_ADMIN' | 'PROPIETARIO' | 'VETERINARIO' | 'OPERARIO' | 'CLIENTE';
  propietarioId?: number;
  prediosAsignados?: number[];
  activo: boolean;
  createdAt: string;
}

export const adminService = {
  // Predios
  getPredios: async (): Promise<{ success: boolean; data: PredioDTO[] }> => {
    const { data } = await api.get('/predios');
    return data;
  },

  // Usuarios
  getUsuarios: async (params?: { predioId?: number, propietarioId?: number }): Promise<{ success: boolean; data: UsuarioDTO[] }> => {
    const { data } = await api.get('/usuarios', { params });
    return data;
  },

  createUsuario: async (payload: any): Promise<{ success: boolean; data: UsuarioDTO }> => {
    const { data } = await api.post('/usuarios', payload);
    return data;
  },

  toggleUsuarioStatus: async (id: number): Promise<{ success: boolean }> => {
    const { data } = await api.patch(`/usuarios/${id}/toggle`);
    return data;
  },

  getUsuariosPendientes: async (): Promise<{ success: boolean; data: UsuarioDTO[] }> => {
    const { data } = await api.get('/usuarios/pendientes');
    return data;
  },

  aprobarUsuario: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/usuarios/${id}/aprobar`);
    return data;
  },

  rechazarUsuario: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/usuarios/${id}/rechazar`);
    return data;
  },

  deleteUsuario: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/usuarios/${id}`);
    return data;
  }
};
