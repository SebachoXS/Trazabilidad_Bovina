/**
 * @file frontend/src/features/admin/api/admin.service.ts
 * @description Servicio API para administración (Usuarios, Predios, Propietarios).
 */

import { api } from '../../../services/api';

export interface PredioDTO {
  id: number;
  nombre: string;
  codigo: string;
  municipio?: string;
  departamento?: string;
  provincia?: string;
  canton?: string;
  parroquia?: string;
  coordenadas?: string;
  area?: number;
  propietarioId: number;
  propietario?: { nombre: string; documento: string };
  estado: string;
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
  getPredios: async (estado?: string): Promise<{ success: boolean; data: PredioDTO[] }> => {
    const { data } = await api.get('/predios', { params: { estado } });
    return data;
  },

  createPredio: async (payload: any): Promise<{ success: boolean; data: PredioDTO }> => {
    const { data } = await api.post('/predios', payload);
    return data;
  },

  deletePredio: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.delete(`/predios/${id}`);
    return data;
  },

  getPrediosPendientes: async (): Promise<{ success: boolean; data: PredioDTO[] }> => {
    const { data } = await api.get('/predios/pendientes');
    return data;
  },

  aprobarPredio: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/predios/${id}/aprobar`);
    return data;
  },

  rechazarPredio: async (id: number, motivoRechazo: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/predios/${id}/rechazar`, { motivoRechazo });
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
  },

  // Solicitudes de Acceso (Veterinario)
  getSolicitudesAcceso: async (): Promise<{ success: boolean; data: any[] }> => {
    const { data } = await api.get('/usuarios/solicitudes-acceso');
    return data;
  },

  solicitarAcceso: async (predioId: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.post('/usuarios/solicitudes-acceso', { predioId });
    return data;
  },

  aprobarSolicitudAcceso: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/usuarios/solicitudes-acceso/${id}/aprobar`);
    return data;
  },

  rechazarSolicitudAcceso: async (id: number): Promise<{ success: boolean; message: string }> => {
    const { data } = await api.patch(`/usuarios/solicitudes-acceso/${id}/rechazar`);
    return data;
  }
};
