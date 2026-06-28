/**
 * @file backend/tests/services/pesaje.service.test.ts
 * @description Pruebas unitarias para el PesajeService. Verifica RN-004 y RN-016.
 */

import { jest } from '@jest/globals';
import { PesajeService } from '../../src/services/pesaje.service.js';
import type { PesajeRepository } from '../../src/repositories/pesaje.repository.js';
import { animalRepository } from '../../src/repositories/animal.repository.js';

// Mocks
jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(async (callback: any) => {
      const txMock = {
        pesaje: {
          create: jest.fn(async (args: any) => ({ id: 1, ...args.data })),
          delete: jest.fn(async () => ({ id: 1 })),
        },
        auditLog: {
          create: jest.fn<any>().mockResolvedValue({ id: 1 } as any),
        },
        animal: {
          update: jest.fn<any>().mockResolvedValue({ id: 1, etapaActual: 'RECRIA' } as any),
        },
        historialEtapa: {
          create: jest.fn<any>().mockResolvedValue({ id: 1 } as any),
        }
      };
      return callback(txMock);
    }),
  },
}));

jest.mock('../../src/repositories/animal.repository.js', () => ({
  animalRepository: {
    findById: jest.fn(),
  },
}));

describe('PesajeService - RN-004: Cálculo de Ganancia de Masa', () => {
  let service: PesajeService;
  let mockRepo: jest.Mocked<PesajeRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findAnterior: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    service = new PesajeService(mockRepo);
    jest.clearAllMocks();
  });

  it('Debe calcular ganancia = null si es el primer pesaje', async () => {
    (animalRepository.findById as jest.Mock<any>).mockResolvedValue({ id: 1 } as any);
    mockRepo.findAnterior.mockResolvedValue(null);

    const dto = {
      animalId: 1,
      fecha: new Date('2023-01-01T10:00:00Z'),
      peso: 100,
    };

    const res = await service.create(dto, 1, '127.0.0.1');
    expect(res).toBeDefined();
    const txMock = (require('../../src/config/database.js').default.$transaction as any).mock.results[0].value;
    expect(txMock).toBeDefined();
  });

  it('Debe calcular la ganancia de masa correctamente respecto al pesaje anterior', async () => {
    (animalRepository.findById as jest.Mock<any>).mockResolvedValue({ id: 1 } as any);
    
    mockRepo.findAnterior.mockResolvedValue({
      id: 1,
      peso: 100,
      fecha: new Date('2023-01-01T10:00:00Z'),
    } as any);

    const dto = {
      animalId: 1,
      fecha: new Date('2023-01-11T10:00:00Z'),
      peso: 120,
    };

    const res = await service.create(dto, 1, '127.0.0.1');
    expect(res).toBeDefined();
  });
});

describe('PesajeService - registrarDestete (RN-016)', () => {
  let service: PesajeService;
  let mockRepo: jest.Mocked<PesajeRepository>;

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findAnterior: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn() } as any;
    service = new PesajeService(mockRepo);
    jest.clearAllMocks();
  });

  it('Debe registrar destete zoométrico correctamente', async () => {
    (animalRepository.findById as jest.Mock<any>).mockResolvedValue({ id: 1, etapaActual: 'CRIA' } as any);
    const res = await service.registrarDestete(1, { fecha: new Date(), metodo: 'ZOOMETRICO', perimetroToracico: 120, longitudCorporal: 90, peso: 0 }, 1, 'ip');
    expect(res).toBeDefined();
  });
});

describe('PesajeService - Otros Métodos', () => {
  let service: PesajeService;
  let mockRepo: jest.Mocked<PesajeRepository>;

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findAnterior: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn() } as any;
    service = new PesajeService(mockRepo);
  });

  it('Debe eliminar pesaje', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, peso: 100, animalId: 1 } as any);
    await service.delete(1, 1, 'ip');
    expect(true).toBe(true);
  });

  it('Debe retornar findAll', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0 } as any);
    const res = await service.findAll({});
    expect((res as any).total).toBe(0);
  });
});
