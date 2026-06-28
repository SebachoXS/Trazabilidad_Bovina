/**
 * @file backend/tests/services/animal.hoja-vida.test.ts
 * @description Pruebas unitarias para la Hoja de Vida Integral.
 */

import { jest } from '@jest/globals';
import { animalService } from '../../src/services/animal.service.js';
import prisma from '../../src/config/database.js';
import { NotFoundError } from '../../src/types/errors.js';

// Mocks
jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    animal: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/repositories/animal.repository.js', () => ({
  animalRepository: {
    findById: jest.fn(),
    findByCodigoVisual: jest.fn(),
  },
}));

describe('AnimalService - Hoja de Vida', () => {
  const repoMock = (animalService as any).repo as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Debe lanzar NotFoundError si el animal no existe', async () => {
    repoMock.findById.mockResolvedValue(null);
    await expect(animalService.getHojaDeVida(999)).rejects.toThrow(NotFoundError);
  });

  it('Debe retornar la Hoja de Vida ordenada cronológicamente', async () => {
    repoMock.findById.mockResolvedValue({ id: 1 } as any);
    
    (prisma.animal.findUnique as jest.Mock<any>).mockResolvedValue({
      id: 1,
      codigoVisual: '1234567890',
      nombre: 'Vaca1',
      estado: 'ACTIVO',
      fechaNacimiento: new Date('2020-01-01T00:00:00Z'),
      predio: { nombre: 'Predio A' },
      eventosSanitarios: [
        { fecha: new Date('2021-01-01T00:00:00Z'), tipo: 'VACUNACION' },
      ],
      pesajes: [
        { fecha: new Date('2022-01-01T00:00:00Z'), peso: 400 },
      ],
      eventosReproductivos: [],
      movimientos: [],
    } as any);

    const result = await animalService.getHojaDeVida(1);

    expect(result.animal.codigoVisual).toBe('1234567890');
    expect(result.lineaDeTiempo).toHaveLength(3); // Nacimiento + Vacunacion + Pesaje
    
    // El orden debe ser descendente (más reciente primero)
    expect(result.lineaDeTiempo[0].tipo).toBe('PESAJE'); // 2022
    expect(result.lineaDeTiempo[1].tipo).toBe('EVENTO_SANITARIO'); // 2021
    expect(result.lineaDeTiempo[2].tipo).toBe('NACIMIENTO'); // 2020
  });

  it('Debe devolver alertas si el animal está EN_RETIRO', async () => {
    repoMock.findById.mockResolvedValue({ id: 2 } as any);

    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 10);

    (prisma.animal.findUnique as jest.Mock<any>).mockResolvedValue({
      id: 2,
      codigoVisual: '0987654321',
      estado: 'EN_RETIRO',
      fechaNacimiento: new Date('2020-01-01T00:00:00Z'),
      predio: { nombre: 'Predio A' },
      eventosSanitarios: [
        { 
          fecha: new Date(), 
          tipo: 'TRATAMIENTO', 
          producto: 'Oxi',
          fechaFinRetiro: futuro,
        },
      ],
      pesajes: [],
      eventosReproductivos: [],
      movimientos: [],
    } as any);

    const result = await animalService.getHojaDeVida(2);
    
    expect(result.animal.estado).toBe('EN_RETIRO');
    expect(result.alertas).toHaveLength(1);
    expect(result.alertas[0].tipo).toBe('RETIRO_ACTIVO');
    expect(result.alertas[0].diasRestantes).toBeGreaterThan(0);
    expect(result.alertas[0].producto).toBe('Oxi');
  });
});
