/**
 * @file backend/src/repositories/health.repository.ts
 * @description Capa de acceso a datos para EventoSanitario usando Prisma.
 * CONSTITUTION §3.1: Los servicios dependen de interfaces de repositorio (principio D de SOLID).
 * CONSTITUTION §10.1 Mandato 7: Solo Prisma. Prohibido SQL raw con interpolación.
 */

import type { EventoSanitario, Animal, Prisma } from '@prisma/client';
import prisma from '../config/database';
import type { PaginatedResult, PaginationMeta } from '../types/index';
import type { CreateEventoSanitarioDto } from '../validators/health.validator';

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────

/**
 * Convierte undefined a null para satisfacer Prisma con exactOptionalPropertyTypes.
 * Prisma espera `string | null` en campos opcionales, no `string | undefined`.
 */
function toNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

// ─────────────────────────────────────────────
// TIPOS DEL REPOSITORIO
// ─────────────────────────────────────────────

/** Tipo de evento sanitario válido. */
export type TipoEventoSanitario = 'VACUNACION' | 'TRATAMIENTO' | 'DIAGNOSTICO' | 'DESPARASITACION' | 'CIRUGIA';

/** DTO interno del repositorio para crear un evento (incluye campos de sistema). */
export interface CreateEventoSanitarioRepoDto extends CreateEventoSanitarioDto {
  animalId: number;
  creadoPorId: number;
  fechaFinRetiro?: Date | null;
}

/** DTO interno del repositorio para actualizar un evento. */
export type UpdateEventoSanitarioRepoDto = Partial<CreateEventoSanitarioDto> & {
  fechaFinRetiro?: Date | null;
};

/** Evento sanitario con relaciones incluidas (para respuestas API). */
export type EventoSanitarioConRelaciones = EventoSanitario & {
  animal: Animal;
  creadoPor: { id: number; nombre: string };
};

/** Filtros para la búsqueda de eventos. */
export interface EventoQueryFilters {
  tipo?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  conRetiroActivo?: boolean;
  page: number;
  limit: number;
}

// ─────────────────────────────────────────────
// INTERFAZ DEL REPOSITORIO
// ─────────────────────────────────────────────

/**
 * Interfaz del repositorio sanitario.
 * El servicio depende de esta interfaz (Principio D — SOLID).
 */
export interface IHealthRepository {
  create(data: CreateEventoSanitarioRepoDto): Promise<EventoSanitarioConRelaciones>;
  findById(id: number): Promise<EventoSanitarioConRelaciones | null>;
  findByAnimalId(animalId: number, filters: EventoQueryFilters, rbacFilter?: any): Promise<PaginatedResult<EventoSanitarioConRelaciones>>;
  findAll(rbacFilter: any, filters: EventoQueryFilters): Promise<PaginatedResult<EventoSanitarioConRelaciones>>;
  update(id: number, data: UpdateEventoSanitarioRepoDto): Promise<EventoSanitarioConRelaciones>;
  delete(id: number): Promise<void>;
  findAnimalesEnRetiroVencido(): Promise<Animal[]>;
}

// ─────────────────────────────────────────────
// SELECT COMPARTIDO
// ─────────────────────────────────────────────

const eventoWithRelations = {
  animal: true,
  creadoPor: {
    select: { id: true, nombre: true },
  },
} satisfies Prisma.EventoSanitarioInclude;

// ─────────────────────────────────────────────
// IMPLEMENTACIÓN CON PRISMA
// ─────────────────────────────────────────────

export class PrismaHealthRepository implements IHealthRepository {
  /**
   * Persiste un nuevo EventoSanitario.
   * Convierte undefined → null para compatibilidad con Prisma y exactOptionalPropertyTypes.
   */
  async create(data: CreateEventoSanitarioRepoDto): Promise<EventoSanitarioConRelaciones> {
    const result = await prisma.eventoSanitario.create({
      data: {
        tipo: data.tipo,
        fecha: data.fecha,
        periodoRetiro: data.periodoRetiro,
        fechaFinRetiro: data.fechaFinRetiro ?? null,
        producto: toNull(data.producto),
        principioActivo: toNull(data.principioActivo),
        dosis: toNull(data.dosis),
        viaAdministracion: toNull(data.viaAdministracion),
        lote: toNull(data.lote),
        laboratorio: toNull(data.laboratorio),
        diagnostico: toNull(data.diagnostico),
        observaciones: toNull(data.observaciones),
        animalId: data.animalId,
        creadoPorId: data.creadoPorId,
      },
      include: eventoWithRelations,
    });
    return result as unknown as EventoSanitarioConRelaciones;
  }

  async findById(id: number): Promise<EventoSanitarioConRelaciones | null> {
    const result = await prisma.eventoSanitario.findUnique({
      where: { id },
      include: eventoWithRelations,
    });
    return result as unknown as EventoSanitarioConRelaciones | null;
  }

  async findByAnimalId(
    animalId: number,
    filters: EventoQueryFilters,
    rbacFilter?: any
  ): Promise<PaginatedResult<EventoSanitarioConRelaciones>> {
    const { tipo, fechaDesde, fechaHasta, conRetiroActivo, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.EventoSanitarioWhereInput = {
      animalId,
      animal: { ...rbacFilter },
      ...(tipo !== undefined ? { tipo } : {}),
      ...((fechaDesde !== undefined || fechaHasta !== undefined)
        ? {
            fecha: {
              ...(fechaDesde !== undefined ? { gte: fechaDesde } : {}),
              ...(fechaHasta !== undefined ? { lte: fechaHasta } : {}),
            },
          }
        : {}),
      ...(conRetiroActivo === true ? { fechaFinRetiro: { gt: new Date() } } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.eventoSanitario.findMany({
        where,
        include: eventoWithRelations,
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      prisma.eventoSanitario.count({ where }),
    ]);

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { data: data as unknown as EventoSanitarioConRelaciones[], meta };
  }

  async findAll(
    rbacFilter: any,
    filters: EventoQueryFilters
  ): Promise<PaginatedResult<EventoSanitarioConRelaciones>> {
    const { tipo, fechaDesde, fechaHasta, conRetiroActivo, page, limit } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.EventoSanitarioWhereInput = {
      animal: { ...rbacFilter },
      ...(tipo !== undefined ? { tipo } : {}),
      ...((fechaDesde !== undefined || fechaHasta !== undefined)
        ? {
            fecha: {
              ...(fechaDesde !== undefined ? { gte: fechaDesde } : {}),
              ...(fechaHasta !== undefined ? { lte: fechaHasta } : {}),
            },
          }
        : {}),
      ...(conRetiroActivo === true ? { fechaFinRetiro: { gt: new Date() } } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.eventoSanitario.findMany({
        where,
        include: eventoWithRelations,
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      prisma.eventoSanitario.count({ where }),
    ]);

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { data: data as unknown as EventoSanitarioConRelaciones[], meta };
  }

  async update(id: number, data: UpdateEventoSanitarioRepoDto): Promise<EventoSanitarioConRelaciones> {
    // Construir el objeto de actualización mapeando undefined → null
    const updateData: Prisma.EventoSanitarioUpdateInput = {};

    if (data.tipo !== undefined) updateData['tipo'] = data.tipo;
    if (data.fecha !== undefined) updateData['fecha'] = data.fecha;
    if (data.periodoRetiro !== undefined) updateData['periodoRetiro'] = data.periodoRetiro;
    if (data.fechaFinRetiro !== undefined) updateData['fechaFinRetiro'] = data.fechaFinRetiro;
    if ('producto' in data) updateData['producto'] = toNull(data.producto);
    if ('principioActivo' in data) updateData['principioActivo'] = toNull(data.principioActivo);
    if ('dosis' in data) updateData['dosis'] = toNull(data.dosis);
    if ('viaAdministracion' in data) updateData['viaAdministracion'] = toNull(data.viaAdministracion);
    if ('lote' in data) updateData['lote'] = toNull(data.lote);
    if ('laboratorio' in data) updateData['laboratorio'] = toNull(data.laboratorio);
    if ('diagnostico' in data) updateData['diagnostico'] = toNull(data.diagnostico);
    if ('observaciones' in data) updateData['observaciones'] = toNull(data.observaciones);

    const result = await prisma.eventoSanitario.update({
      where: { id },
      data: updateData,
      include: eventoWithRelations,
    });
    return result as unknown as EventoSanitarioConRelaciones;
  }

  async delete(id: number): Promise<void> {
    await prisma.eventoSanitario.delete({ where: { id } });
  }

  async findAnimalesEnRetiroVencido(): Promise<Animal[]> {
    const ahora = new Date();
    return prisma.animal.findMany({
      where: {
        estado: 'EN_RETIRO',
        deletedAt: null,
        eventosSanitarios: {
          none: {
            fechaFinRetiro: { gt: ahora },
          },
        },
      },
    });
  }
}

// ─────────────────────────────────────────────
// SINGLETON EXPORTADO
// ─────────────────────────────────────────────

export const healthRepository = new PrismaHealthRepository();
