/**
 * @file backend/src/repositories/reproduccion.repository.ts
 * @description Repositorio de Reproducción.
 */

import prisma from '../config/database';
import type { Prisma, EventoReproductivo } from '@prisma/client';

export class ReproduccionRepository {
  async createEvento(data: Prisma.EventoReproductivoUncheckedCreateInput): Promise<EventoReproductivo> {
    return prisma.eventoReproductivo.create({ data });
  }

  async findEventosByAnimal(animalId: number): Promise<EventoReproductivo[]> {
    return prisma.eventoReproductivo.findMany({
      where: { animalId },
      orderBy: { fecha: 'desc' },
    });
  }

  async deleteEvento(id: number): Promise<void> {
    await prisma.eventoReproductivo.delete({ where: { id } });
  }

  async findEventoById(id: number): Promise<EventoReproductivo | null> {
    return prisma.eventoReproductivo.findUnique({ where: { id } });
  }
}

export const reproduccionRepository = new ReproduccionRepository();
