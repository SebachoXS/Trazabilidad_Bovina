/**
 * @file backend/src/repositories/animal.repository.ts
 * @description Repositorio de Animales. Maneja persistencia y paginación.
 */

import prisma from '../config/database';
import type { Animal, Prisma } from '@prisma/client';
import type { AnimalQueryDto } from '../validators/animal.validator';

export interface PaginatedAnimalResult {
  data: Animal[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IAnimalRepository {
  create(data: Prisma.AnimalUncheckedCreateInput): Promise<Animal>;
  findById(id: number): Promise<Animal | null>;
  findByCodigoVisual(codigoVisual: string): Promise<Animal | null>;
  findAll(query: AnimalQueryDto, rbacFilter?: any): Promise<PaginatedAnimalResult>;
  update(id: number, data: Prisma.AnimalUncheckedUpdateInput): Promise<Animal>;
  softDelete(id: number): Promise<void>;
}

export class AnimalRepository implements IAnimalRepository {
  async create(data: Prisma.AnimalUncheckedCreateInput): Promise<Animal> {
    return prisma.animal.create({ data });
  }

  async findById(id: number): Promise<Animal | null> {
    return prisma.animal.findFirst({
      where: { id, deletedAt: null },
      include: {
        predio: { select: { id: true, nombre: true } },
        pesajes: { orderBy: { fecha: 'desc' } },
        movimientos: {
          orderBy: { fecha: 'desc' },
          include: {
            predioOrigen: { select: { id: true, nombre: true } },
            predioDestino: { select: { id: true, nombre: true } }
          }
        },
      },
    });
  }

  async findByCodigoVisual(codigoVisual: string): Promise<Animal | null> {
    return prisma.animal.findFirst({
      where: { codigoVisual, deletedAt: null },
      include: {
        predio: { select: { id: true, nombre: true } },
        pesajes: { orderBy: { fecha: 'desc' } },
        movimientos: {
          orderBy: { fecha: 'desc' },
          include: {
            predioOrigen: { select: { id: true, nombre: true } },
            predioDestino: { select: { id: true, nombre: true } }
          }
        },
      },
    });
  }

  async findAll(query: AnimalQueryDto, rbacFilter?: Prisma.AnimalWhereInput): Promise<PaginatedAnimalResult> {
    const where: Prisma.AnimalWhereInput = { deletedAt: null, ...rbacFilter };

    if (query.estado) where.estado = query.estado;
    if (query.sexo) where.sexo = query.sexo;
    if (query.raza) where.raza = { contains: query.raza };
    if (query.predioId) where.predioId = query.predioId;
    
    // Si viene propietarioId explícito (y no está ya filtrado por RBAC o lo sobreescribe de forma más restrictiva)
    if (query.propietarioId) {
      where.predio = { propietarioId: query.propietarioId };
    }

    if (query.search) {
      where.OR = [
        { codigoVisual: { contains: query.search } },
        { nombre: { contains: query.search } },
      ];
    }

    const skip = (query.page - 1) * query.limit;
    
    // Sort logic
    const orderBy: Prisma.AnimalOrderByWithRelationInput = {};
    orderBy[query.sortBy] = query.sortOrder;

    const [total, data] = await Promise.all([
      prisma.animal.count({ where }),
      prisma.animal.findMany({
        where,
        skip,
        take: query.limit,
        orderBy,
        include: {
          predio: { select: { id: true, nombre: true } },
        },
      }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async update(id: number, data: Prisma.AnimalUncheckedUpdateInput): Promise<Animal> {
    return prisma.animal.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: number): Promise<void> {
    await prisma.animal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const animalRepository = new AnimalRepository();
