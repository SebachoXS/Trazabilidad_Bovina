/**
 * @file backend/src/repositories/pesaje.repository.ts
 * @description Repositorio de Pesajes.
 */

import prisma from '../config/database';
import type { Prisma, Pesaje } from '@prisma/client';
import type { PesajeQueryDto } from '../validators/pesaje.validator';

export interface PaginatedPesajeResult {
  data: Pesaje[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class PesajeRepository {
  async create(data: Prisma.PesajeUncheckedCreateInput): Promise<Pesaje> {
    return prisma.pesaje.create({ data });
  }

  async findById(id: number): Promise<Pesaje | null> {
    return prisma.pesaje.findUnique({ where: { id } });
  }

  async findAnterior(animalId: number, fechaActual: Date): Promise<Pesaje | null> {
    return prisma.pesaje.findFirst({
      where: {
        animalId,
        fecha: { lt: fechaActual },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async findAll(query: PesajeQueryDto, rbacFilter?: any): Promise<PaginatedPesajeResult> {
    const where: Prisma.PesajeWhereInput = {
      ...(rbacFilter ? { animal: rbacFilter } : {}),
    };
    if (query.animalId) where.animalId = query.animalId;

    const skip = (query.page - 1) * query.limit;

    const [total, data] = await Promise.all([
      prisma.pesaje.count({ where }),
      prisma.pesaje.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { fecha: 'desc' },
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

  async update(id: number, data: Prisma.PesajeUpdateInput): Promise<Pesaje> {
    return prisma.pesaje.update({ where: { id }, data });
  }

  async delete(id: number): Promise<void> {
    await prisma.pesaje.delete({ where: { id } });
  }
}

export const pesajeRepository = new PesajeRepository();
