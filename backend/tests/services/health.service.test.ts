/**
 * @file backend/tests/services/health.service.test.ts
 * @description Tests unitarios del HealthService con repositorio mockeado.
 * CONSTITUTION §8.1: Cobertura mínima 80% en servicios.
 * Se usa jest.fn() para simular el repositorio sin tocar la BD real.
 */

import { HealthService } from '../../src/services/health.service';
import type { IHealthRepository } from '../../src/repositories/health.repository';
import { NotFoundError } from '../../src/types/errors';

// ─────────────────────────────────────────────
// MOCKS GLOBALES
// ─────────────────────────────────────────────

// Mock de Prisma para que las transacciones funcionen sin BD
jest.mock('../../src/config/database.js', () => ({
  __esModule: true,
  default: {
    animal: {
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    eventoSanitario: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

import prisma from '../../src/config/database.js';
const prismaMock = prisma as jest.Mocked<typeof prisma>;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Crea un mock completo de IHealthRepository. */
function createMockRepository(): jest.Mocked<IHealthRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByAnimalId: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAnimalesEnRetiroVencido: jest.fn(),
  };
}

/** Crea un animal mock básico. */
function animalMock(overrides = {}) {
  return {
    id: 1,
    codigoVisual: '1234567890',
    nombre: 'Estrella',
    raza: 'CHAROLAIS',
    sexo: 'HEMBRA' as const,
    estado: 'ACTIVO' as const,
    predioId: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    fechaNacimiento: null,
    pesoNacimiento: null,
    madreId: null,
    padreId: null,
    cusa: 'BOV-2026-ANT-0001',
    esToroCatalogo: false,
    isGestante: false,
    etapaActual: 'CRIA' as const,
    ...overrides,
  };
}

/** Crea un DTO de creación de evento válido. */
function dtoTratamientoConRetiro(diasRetiro = 28) {
  return {
    tipo: 'TRATAMIENTO' as const,
    fecha: new Date('2026-06-18T08:00:00Z'),
    producto: 'Oxitetraciclina LA',
    periodoRetiro: diasRetiro,
    principioActivo: undefined,
    dosis: undefined,
    viaAdministracion: undefined,
    lote: undefined,
    laboratorio: undefined,
    diagnostico: undefined,
    observaciones: undefined,
  };
}

/** Crea un evento sanitario mock con relaciones. */
function eventoMock(overrides = {}) {
  const ahora = new Date();
  return {
    id: 1,
    animalId: 1,
    tipo: 'TRATAMIENTO' as const,
    fecha: ahora,
    producto: 'Oxitetraciclina LA',
    principioActivo: null,
    dosis: null,
    viaAdministracion: null,
    lote: null,
    laboratorio: null,
    periodoRetiro: 28,
    fechaFinRetiro: new Date(ahora.getTime() + 28 * 86_400_000),
    diagnostico: null,
    observaciones: null,
    creadoPorId: 1,
    createdAt: ahora,
    updatedAt: ahora,
    animal: animalMock(),
    creadoPor: { id: 1, nombre: 'Dr. García' },
    ...overrides,
  };
}

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────

let mockRepo: jest.Mocked<IHealthRepository>;
let service: HealthService;

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo = createMockRepository();
  service = new HealthService(mockRepo);
});

// ─────────────────────────────────────────────
// TESTS: create()
// ─────────────────────────────────────────────

describe('HealthService.create()', () => {
  it('debe cambiar animal a EN_RETIRO cuando tratamiento tiene periodoRetiro > 0', async () => {
    // Arrange
    const animal = animalMock();
    const dto = dtoTratamientoConRetiro(28);
    const eventoCreado = eventoMock();

    (prismaMock.animal.findFirst as jest.Mock).mockResolvedValue(animal);
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn) => {
      // Simular la transacción callback
      const tx = {
        eventoSanitario: { create: jest.fn().mockResolvedValue(eventoCreado) },
        animal: { update: jest.fn().mockResolvedValue({ ...animal, estado: 'EN_RETIRO' }) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    // Act
    const resultado = await service.create(1, dto, 1);

    // Assert
    expect(resultado.animal.estado).toBe('EN_RETIRO');
    expect(resultado.animal.alertaRetiro).toBeDefined();
    expect(resultado.animal.alertaRetiro?.activa).toBe(true);
    expect(resultado.animal.alertaRetiro?.diasRestantes).toBeGreaterThan(0);
    expect(resultado.animal.alertaRetiro?.movimientosBloqueados).toContain('TRASLADO_EXTERNO');
  });

  it('NO debe cambiar estado si periodoRetiro = 0 (vacunación sin retiro)', async () => {
    const animal = animalMock();
    const dto = {
      ...dtoTratamientoConRetiro(0),
      tipo: 'VACUNACION' as const,
      producto: 'Brucelosis RB51',
    };
    const eventoSinRetiro = eventoMock({ periodoRetiro: 0, fechaFinRetiro: null });

    (prismaMock.animal.findFirst as jest.Mock).mockResolvedValue(animal);
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        eventoSanitario: { create: jest.fn().mockResolvedValue(eventoSinRetiro) },
        animal: { update: jest.fn() },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const resultado = await service.create(1, dto, 1);

    expect(resultado.animal.estado).toBe('ACTIVO');
    expect(resultado.animal.alertaRetiro).toBeUndefined();
  });

  it('NO debe cambiar estado si fechaFinRetiro ya venció (retiro en el pasado)', async () => {
    const animal = animalMock();
    // Fecha del evento: hace 30 días
    const fechaAntigua = new Date(Date.now() - 30 * 86_400_000);
    const dto = {
      ...dtoTratamientoConRetiro(14), // Retiro de 14 días, pero el evento fue hace 30 días
      fecha: fechaAntigua,
    };
    // fechaFinRetiro = fechaAntigua + 14 días → sigue siendo en el pasado
    const fechaFinRetiroVencida = new Date(fechaAntigua.getTime() + 14 * 86_400_000);
    const eventoVencido = eventoMock({ periodoRetiro: 14, fechaFinRetiro: fechaFinRetiroVencida, fecha: fechaAntigua });

    (prismaMock.animal.findFirst as jest.Mock).mockResolvedValue(animal);
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        eventoSanitario: { create: jest.fn().mockResolvedValue(eventoVencido) },
        animal: { update: jest.fn() },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const resultado = await service.create(1, dto, 1);

    // El animal no debe estar en retiro porque fechaFinRetiro < ahora
    expect(resultado.animal.alertaRetiro).toBeUndefined();
  });

  it('debe lanzar NotFoundError si el animal no existe', async () => {
    (prismaMock.animal.findFirst as jest.Mock).mockResolvedValue(null);
    const dto = dtoTratamientoConRetiro();

    await expect(service.create(999, dto, 1)).rejects.toThrow(NotFoundError);
    await expect(service.create(999, dto, 1)).rejects.toMatchObject({
      code: 'ANIMAL_NOT_FOUND',
    });
  });
});

// ─────────────────────────────────────────────
// TESTS: findById() — Anti-IDOR
// ─────────────────────────────────────────────

describe('HealthService.findById()', () => {
  it('debe lanzar NotFoundError si el evento pertenece a otro animal (IDOR)', async () => {
    const eventoDeOtroAnimal = eventoMock({ animalId: 99 }); // Pertenece al animal 99
    mockRepo.findById.mockResolvedValue(eventoDeOtroAnimal as ReturnType<typeof eventoMock>);

    // Intentar acceder al evento del animal 99 usando el animal 1
    await expect(service.findById(1, 1)).rejects.toThrow(NotFoundError);
    await expect(service.findById(1, 1)).rejects.toMatchObject({
      code: 'EVENTO_NOT_FOUND',
    });
  });

  it('debe lanzar NotFoundError si el evento no existe', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.findById(999, 1)).rejects.toThrow(NotFoundError);
  });

  it('debe retornar el evento si pertenece al animal correcto', async () => {
    const evento = eventoMock({ animalId: 1 });
    mockRepo.findById.mockResolvedValue(evento as ReturnType<typeof eventoMock>);

    const resultado = await service.findById(1, 1);
    expect(resultado.id).toBe(1);
    expect(resultado.animalId).toBe(1);
  });
});

// ─────────────────────────────────────────────
// TESTS: liberarAnimalesConRetiroVencido() — Cron Job
// ─────────────────────────────────────────────

describe('HealthService.liberarAnimalesConRetiroVencido()', () => {
  it('debe liberar animales con retiro vencido y retornar el conteo', async () => {
    const animalesVencidos = [animalMock({ id: 1 }), animalMock({ id: 2 })];
    mockRepo.findAnimalesEnRetiroVencido.mockResolvedValue(animalesVencidos);

    (prismaMock.$transaction as jest.Mock).mockImplementation(async (fn) => {
      const tx = {
        animal: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
        auditLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      return fn(tx);
    });

    const resultado = await service.liberarAnimalesConRetiroVencido();
    expect(resultado.animalesLiberados).toBe(2);
    expect(resultado.ids).toEqual([1, 2]);
  });

  it('debe retornar 0 si no hay animales con retiro vencido', async () => {
    mockRepo.findAnimalesEnRetiroVencido.mockResolvedValue([]);

    const resultado = await service.liberarAnimalesConRetiroVencido();
    expect(resultado.animalesLiberados).toBe(0);
    expect(resultado.ids).toHaveLength(0);
    // No debe llamar a $transaction si no hay animales
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
