/**
 * @file backend/tests/services/reproduccion.service.test.ts
 * @description Pruebas unitarias para ReproduccionService. Verifica RN-003.
 */

import { jest } from '@jest/globals';
import { ReproduccionService } from '../../src/services/reproduccion.service.js';
import type { ReproduccionRepository } from '../../src/repositories/reproduccion.repository.js';
import { animalRepository } from '../../src/repositories/animal.repository.js';
import { BusinessRuleError, ConflictError } from '../../src/types/errors.js';

// Mocks
jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(async (callback: any) => {
      const txMock = {
        animal: {
          create: jest.fn(async (args: any) => ({ id: 2, ...args.data })),
          update: jest.fn<any>().mockResolvedValue({ id: 1, estado: 'ACTIVO' } as any),
        },
        eventoReproductivo: {
          create: jest.fn(async (args: any) => ({ id: 1, ...args.data })),
        },
        auditLog: {
          create: jest.fn<any>().mockResolvedValue({ id: 1 } as any),
        },
        predio: {
          findUnique: jest.fn<any>().mockResolvedValue({ id: 1, codigo: '001' }),
        },
        secuenciaPredio: {
          findUnique: jest.fn<any>().mockResolvedValue(null),
          create: jest.fn<any>().mockResolvedValue({ id: 1, secuencial: 1 }),
          update: jest.fn<any>().mockResolvedValue({ id: 1, secuencial: 2 }),
        },
      };
      return callback(txMock);
    }),
  },
}));

jest.mock('../../src/repositories/animal.repository.js', () => ({
  animalRepository: {
    findById: jest.fn(),
    findByCodigoVisual: jest.fn(),
  },
}));

describe('ReproduccionService - RN-003: Creación Atómica de Terneros', () => {
  let service: ReproduccionService;
  let mockRepo: jest.Mocked<ReproduccionRepository>;

  beforeEach(() => {
    mockRepo = {
      createEvento: jest.fn(),
      findEventosByAnimal: jest.fn(),
      deleteEvento: jest.fn(),
      findEventoById: jest.fn(),
    } as any;

    service = new ReproduccionService(mockRepo);
    jest.clearAllMocks();
  });

  it('Debe rechazar el parto si la madre no es HEMBRA', async () => {
    (animalRepository.findById as jest.Mock<any>).mockResolvedValue({ id: 1, sexo: 'MACHO' } as any);

    const dto = {
      fecha: new Date(),
      ternero: {
        codigoVisual: '1234567890',
        raza: 'CHAROLAIS' as const,
        sexo: 'MACHO' as const,
      },
    };

    await expect(service.registrarParto(1, dto, 1, '127.0.0.1')).rejects.toThrow(BusinessRuleError);
    await expect(service.registrarParto(1, dto, 1, '127.0.0.1')).rejects.toThrow('El animal seleccionado como madre no es HEMBRA.');
  });

  it('Debe rechazar el parto si el código visual del ternero ya existe', async () => {
    (animalRepository.findById as jest.Mock<any>).mockResolvedValue({ id: 1, sexo: 'HEMBRA' } as any);
    (animalRepository.findByCodigoVisual as jest.Mock<any>).mockResolvedValue({ id: 2 } as any);

    const dto = {
      fecha: new Date(),
      ternero: {
        codigoVisual: '1234567890',
        raza: 'CHAROLAIS' as const,
        sexo: 'MACHO' as const,
      },
    };

    await expect(service.registrarParto(1, dto, 1, '127.0.0.1')).rejects.toThrow(ConflictError);
  });

  it('Debe procesar el parto correctamente', async () => {
    (animalRepository.findById as jest.Mock<any>).mockResolvedValue({ id: 1, sexo: 'HEMBRA', predioId: 10, estado: 'GESTANTE' } as any);
    (animalRepository.findByCodigoVisual as jest.Mock<any>).mockResolvedValue(null as any);

    const dto = {
      fecha: new Date('2023-05-01T10:00:00Z'),
      ternero: {
        codigoVisual: '1234567890',
        raza: 'CHAROLAIS' as const,
        sexo: 'MACHO' as const,
      },
    };

    const res = await service.registrarParto(1, dto, 1, '127.0.0.1');
    expect(res).toBeDefined();
    expect((res as any).tipo).toBe('PARTO');
    expect((res as any).terneroId).toBe(2);
  });
});
