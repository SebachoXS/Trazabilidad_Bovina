/**
 * @file frontend/src/features/reports/hooks/useReports.ts
 * @description Hooks para consumir los reportes del backend.
 */

import { useQuery } from '@tanstack/react-query';
import { reportService } from '../api/report.service';

export const useInventarioReport = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['reportes', 'inventario', filters],
    queryFn: () => reportService.getInventario(filters),
    staleTime: 60000,
  });
};

export const useSanidadReport = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['reportes', 'sanidad', filters],
    queryFn: () => reportService.getSanidad(filters),
    staleTime: 60000,
  });
};

export const useRetirosReport = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['reportes', 'retiros', filters],
    queryFn: () => reportService.getRetiros(filters),
    staleTime: 60000,
  });
};
