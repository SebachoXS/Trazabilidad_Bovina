/**
 * @file frontend/src/features/dashboard/hooks/useDashboardData.ts
 * @description Hook que orquesta llamadas paralelas para nutrir el Dashboard.
 */

import { useQueries } from '@tanstack/react-query';
import { dashboardService } from '../api/dashboard.service';
import { animalsService } from '../../animals/api/animals.service';

export const useDashboardData = (filters?: Record<string, any>) => {
  const results = useQueries({
    queries: [
      {
        queryKey: ['animales', 'resumen', filters],
        queryFn: () => animalsService.getAnimales(1, 100, filters), // Traemos hasta 100 para evaluar el total general
      },
      {
        queryKey: ['reportes', 'retiro', filters],
        queryFn: () => dashboardService.getAnimalesEnRetiro(filters),
      }
    ]
  });

  const [inventarioQuery, retiroQuery] = results;

  const isLoading = inventarioQuery.isLoading || retiroQuery.isLoading;
  const isError = inventarioQuery.isError || retiroQuery.isError;

  // Calculamos métricas derivadas del inventario
  const totalAnimales = inventarioQuery.data?.meta.total || 0;
  const animalesActivos = inventarioQuery.data?.data.filter(a => a.estado === 'ACTIVO').length || 0;
  
  // Extraemos las alertas críticas
  const alertasRetiro = retiroQuery.data || [];

  return {
    isLoading,
    isError,
    metrics: {
      totalAnimales,
      animalesActivos,
      animalesEnRiesgo: alertasRetiro.length
    },
    alertasRetiro,
  };
};
