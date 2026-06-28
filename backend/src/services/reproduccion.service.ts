/**
 * @file backend/src/services/reproduccion.service.ts
 * @description Servicio de Reproducción. Implementa la RN-003 (Creación Atómica de Terneros).
 */

import prisma from '../config/database';
import { reproduccionRepository } from '../repositories/reproduccion.repository';
import type { ReproduccionRepository } from '../repositories/reproduccion.repository';
import { animalRepository } from '../repositories/animal.repository';
import { BusinessRuleError, NotFoundError, ConflictError } from '../types/errors';
import type { CreateEventoReproductivoDto, CreatePartoDto } from '../validators/reproduccion.validator';
import type { EventoReproductivo } from '@prisma/client';

/**
 * Servicio encargado de gestionar los eventos reproductivos de los animales.
 * Incluye la lógica de negocio para registrar eventos y partos, así como la
 * creación atómica de terneros (RN-003).
 */
export class ReproduccionService {
  constructor(private readonly repo: ReproduccionRepository) {}

  /**
   * Crea un evento reproductivo general (Inseminación, etc.).
   */
  async createEvento(animalId: number, dto: CreateEventoReproductivoDto, userId: number, ip?: string): Promise<EventoReproductivo> {
    const animal = await animalRepository.findById(animalId);
    if (!animal) throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal no existe.');

    if (animal.sexo !== 'HEMBRA') {
      throw new BusinessRuleError('ANIMAL_NO_HEMBRA', 'Los eventos reproductivos (madre) solo aplican a hembras.');
    }

    return prisma.$transaction(async (tx) => {
      const evento = await tx.eventoReproductivo.create({
        data: {
          ...dto,
          animalId,
        },
      });

      // Si es inseminación o monta, pasamos estado a GESTANTE (opcional según regla estricta, pero común)
      if (dto.tipo === 'INSEMINACION' || dto.tipo === 'MONTA') {
        await tx.animal.update({
          where: { id: animalId },
          data: { estado: 'GESTANTE' },
        });
      }

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_EVENTO_REPRODUCTIVO',
          entidad: 'EventoReproductivo',
          entidadId: evento.id,
          ip: ip ?? null,
          datos: JSON.stringify(dto),
        },
      });

      return evento;
    });
  }

  /**
   * RN-003: Registrar Parto creando el ternero atómicamente.
   */
  async registrarParto(madreId: number, dto: CreatePartoDto, userId: number, ip?: string): Promise<EventoReproductivo> {
    const madre = await animalRepository.findById(madreId);
    if (!madre) throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal (madre) no existe.');

    // 1. Validar que la protagonista es HEMBRA
    if (madre.sexo !== 'HEMBRA') {
      throw new BusinessRuleError('PARTO_MADRE_INVALIDA', 'El animal seleccionado como madre no es HEMBRA.');
    }

    // 2. Validar que el código visual del ternero no exista
    const existeTernero = await animalRepository.findByCodigoVisual(dto.ternero.codigoVisual);
    if (existeTernero) {
      throw new ConflictError('CODIGO_VISUAL_DUPLICADO', 'El código visual del ternero ya existe.');
    }

    return prisma.$transaction(async (tx) => {
      // 2.5 Generar CUSA para el ternero
      const predio = await tx.predio.findUnique({ where: { id: madre.predioId } });
      if (!predio) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado');

      const currentYear = new Date().getFullYear().toString();
      let secuencia = await tx.secuenciaPredio.findUnique({
        where: { predioId_anio: { predioId: madre.predioId, anio: currentYear } }
      });
      if (!secuencia) {
        secuencia = await tx.secuenciaPredio.create({
          data: { predioId: madre.predioId, anio: currentYear, secuencial: 1 }
        });
      } else {
        secuencia = await tx.secuenciaPredio.update({
          where: { id: secuencia.id },
          data: { secuencial: { increment: 1 } }
        });
      }
      const cusa = `BOV-${currentYear}-${predio.codigo}-${String(secuencia.secuencial).padStart(4, '0')}`;

      // 3. Insertar Animal ternero
      const ternero = await tx.animal.create({
        data: {
          ...dto.ternero,
          cusa,
          predioId: madre.predioId, // El ternero nace en el mismo predio que la madre
          madreId: madre.id,
          fechaNacimiento: dto.fecha,
        },
      });

      // 4. Insertar EventoReproductivo
      const evento = await tx.eventoReproductivo.create({
        data: {
          animalId: madre.id,
          tipo: 'PARTO',
          fecha: dto.fecha,
          observaciones: dto.observaciones,
          terneroId: ternero.id,
        },
      });

      // 5. Actualizar estado de la madre si estaba GESTANTE
      if (madre.estado === 'GESTANTE') {
        await tx.animal.update({
          where: { id: madre.id },
          data: { estado: 'ACTIVO' },
        });
      }

      // 6. Insertar AuditLog
      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'REGISTRO_PARTO',
          entidad: 'EventoReproductivo',
          entidadId: evento.id,
          ip: ip ?? null,
          datos: JSON.stringify({ madreId, terneroId: ternero.id }),
        },
      });

      return evento;
    });
  }



  /**
   * Obtiene todos los eventos reproductivos de un animal específico.
   *
   * @param animalId - ID del animal del que se quieren consultar los eventos.
   * @returns Un arreglo con los eventos reproductivos encontrados, ordenados por fecha de forma descendente.
   */
  async getEventosByAnimal(animalId: number): Promise<EventoReproductivo[]> {
    return this.repo.findEventosByAnimal(animalId);
  }
}

export const reproduccionService = new ReproduccionService(reproduccionRepository);
