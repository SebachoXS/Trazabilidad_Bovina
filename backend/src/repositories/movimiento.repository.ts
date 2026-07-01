/**
 * @file backend/src/repositories/movimiento.repository.ts
 * @description Repositorio de Movimientos.
 */

import prisma from '../config/database';
import type { Prisma, Movimiento } from '@prisma/client';
import type { MovimientoQueryDto } from '../validators/movimiento.validator';

export interface PaginatedMovimientoResult {
  data: Movimiento[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class MovimientoRepository {
  async create(data: Prisma.MovimientoUncheckedCreateInput): Promise<Movimiento> {
    return prisma.movimiento.create({ data });
  }

  async findById(id: number): Promise<Movimiento | null> {
    return prisma.movimiento.findUnique({ where: { id } });
  }

  async findAll(query: MovimientoQueryDto, rbacFilter?: any): Promise<PaginatedMovimientoResult> {
    const where: Prisma.MovimientoWhereInput = {
      ...(rbacFilter ? { animal: rbacFilter } : {}),
    };
    if (query.animalId) where.animalId = query.animalId;
    if (query.tipo) where.tipo = query.tipo;
    if (query.predioId) {
      where.OR = [
        { predioOrigenId: query.predioId },
        { predioDestinoId: query.predioId },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [total, data] = await Promise.all([
      prisma.movimiento.count({ where }),
      prisma.movimiento.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { fecha: 'desc' },
        include: {
          predioOrigen: { select: { nombre: true } },
          predioDestino: { select: { nombre: true } },
          animal: { select: { id: true, codigoVisual: true, raza: true, sexo: true } },
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

  async delete(id: number): Promise<void> {
    await prisma.movimiento.delete({ where: { id } });
  }
}

export const movimientoRepository = new MovimientoRepository();
