/**
 * @file backend/tests/services/animal.service.test.ts
 * @description Pruebas unitarias para el AnimalService. Verifica RN-001.
 */

import { jest } from '@jest/globals';
import { AnimalService } from '../../src/services/animal.service.js';
import type { IAnimalRepository } from '../../src/repositories/animal.repository.js';
import { BusinessRuleError, ConflictError } from '../../src/types/errors.js';

// Mocks
jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    animal: {
      update: jest.fn<any>().mockResolvedValue({} as any),
    },
    auditLog: {
      create: jest.fn<any>().mockResolvedValue({ id: 1 } as any),
    },
    $transaction: jest.fn(async (callback: any) => {
      const txMock = {
        animal: {
          create: jest.fn<any>().mockResolvedValue({ id: 1, codigoVisual: '1234567890' } as any),
          update: jest.fn<any>().mockResolvedValue({ id: 1, codigoVisual: '1234567890' } as any),
        },
        auditLog: {
          create: jest.fn<any>().mockResolvedValue({ id: 1 } as any),
        },
      };
      return callback(txMock);
    }),
  },
}));

describe('AnimalService - RN-001: Inmutabilidad del Código Visual', () => {
  let service: AnimalService;
  let mockRepo: jest.Mocked<IAnimalRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByCodigoVisual: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    service = new AnimalService(mockRepo);
    jest.clearAllMocks();
  });

  it('Debe rechazar la creación si el código visual ya existe (ConflictError)', async () => {
    // Simulamos que el animal ya existe
    mockRepo.findByCodigoVisual.mockResolvedValue({ id: 1, codigoVisual: '1234567890' } as any);

    const dto = {
      codigoVisual: '1234567890',
      raza: 'CHAROLAIS' as const,
      sexo: 'MACHO' as const,
      predioId: 1,
      esToroCatalogo: false,
      isGestante: false,
      registrarIngreso: false,
    };

    await expect(service.create(dto, 1, '127.0.0.1')).rejects.toThrow(ConflictError);
  });

  it('Debe rechazar la actualización si se intenta modificar el codigoVisual (RN-001)', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, codigoVisual: '1234567890' } as any);

    const dto = {
      codigoVisual: '0987654321', // Intento ilegal
      raza: 'CHAROLAIS' as const,
    };

    await expect(service.update(1, dto as any, 1, '127.0.0.1')).rejects.toThrow(BusinessRuleError);
    await expect(service.update(1, dto as any, 1, '127.0.0.1')).rejects.toThrow('El código visual no puede modificarse una vez registrado.');
  });

  it('Debe permitir la actualización de otros campos sin modificar codigoVisual', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, codigoVisual: '1234567890' } as any);

    const dto = {
      raza: 'CHAROLAIS' as const,
    };

    const resultado = await service.update(1, dto, 1, '127.0.0.1');
    expect(resultado).toBeDefined();
  });

  it('debe rechazar la creación de un animal si la raza no es CHAROLAIS (RN-022)', () => {
    const { animalCreateSchema } = require('../../src/validators/animal.validator');
    const result = animalCreateSchema.safeParse({
      codigoVisual: '9999999999',
      raza: 'Angus',
      sexo: 'HEMBRA',
      predioId: 1
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('RAZA_NO_SOPORTADA');
  });
});

describe('AnimalService - Otros Métodos', () => {
  let service: AnimalService;
  let mockRepo: jest.Mocked<IAnimalRepository>;

  beforeEach(() => {
    mockRepo = { create: jest.fn(), findById: jest.fn(), findByCodigoVisual: jest.fn(), findAll: jest.fn(), update: jest.fn(), softDelete: jest.fn() } as any;
    service = new AnimalService(mockRepo);
    jest.clearAllMocks();
  });

  it('Debe retornar findAll', async () => {
    mockRepo.findAll.mockResolvedValue({ data: [], total: 0 } as any);
    const res = await service.findAll({} as any);
    expect((res as any).total).toBe(0);
  });

  it('Debe eliminar (soft delete) animal', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, codigoVisual: '123' } as any);
    await service.delete(1, 1, 'ip');
    expect(true).toBe(true); // si no tira error, pasó
  });

  it('Debe aprobarAlta', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, codigoVisual: '123' } as any);
    (require('../../src/config/database.js').default.animal.update as jest.Mock<any>).mockResolvedValue({ id: 1, estado: 'ACTIVO' } as any);
    await service.aprobarAlta(1, 1);
    expect(true).toBe(true);
  });

  it('Debe rechazarAlta', async () => {
    mockRepo.findById.mockResolvedValue({ id: 1, codigoVisual: '123' } as any);
    (require('../../src/config/database.js').default.animal.update as jest.Mock<any>).mockResolvedValue({ id: 1, deletedAt: new Date() } as any);
    await service.rechazarAlta(1, 1);
    expect(true).toBe(true);
  });
});
