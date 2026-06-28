/**
 * @file frontend/src/features/auth/api/auth.service.ts
 * @description Servicio de llamadas a la API para la autenticación.
 */

import { api } from '../../../services/api';

export interface LoginCredentials {
  email: string;
  password?: string;
  codigoVisual?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    accessToken: string;
    expiresIn: number;
    user: {
      id: number;
      nombre: string;
      email: string;
      rol: 'SUPER_ADMIN' | 'PROPIETARIO' | 'VETERINARIO' | 'OPERARIO' | 'CLIENTE';
    };
  };
}

export const authService = {
  getPublicPredios: async () => {
    const { data } = await api.get('/public/predios');
    return data.data;
  },
  
  register: async (payload: any) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', credentials);
    return data;
  },
};
