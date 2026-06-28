import type { AuthPayload } from '../types/index';

/**
 * Genera el filtro `where` de Prisma para `predioId` o `propietarioId`
 * según el rol del usuario (RN-030).
 * 
 * @param user Usuario autenticado (AuthPayload)
 * @param predioField Nombre del campo en la tabla que se relaciona al predio (por defecto "predioId")
 * @returns Objeto con el filtro where para Prisma, o vacío si es SUPER_ADMIN
 */
export function getPredioFilterForUser(user: AuthPayload, predioField: string = 'predioId'): any {
  if (user.rol === 'SUPER_ADMIN') {
    return {}; // Sin filtro, acceso global
  }

  if (user.rol === 'PROPIETARIO') {
    // Si es propietario, puede ver animales/eventos de predios que le pertenezcan
    // Asumimos que la entidad (Animal/Evento) tiene una relación con Predio que a su vez tiene propietarioId
    // Retornamos un filtro relacional:
    return {
      predio: {
        propietarioId: user.propietarioId
      }
    };
  }

  // VETERINARIO, OPERARIO, CLIENTE
  return {
    [predioField]: {
      in: user.prediosAsignados || []
    }
  };
}
