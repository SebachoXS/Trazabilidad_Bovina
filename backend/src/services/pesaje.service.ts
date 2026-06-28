/**
 * @file backend/src/services/pesaje.service.ts
 * @description Servicio de Pesajes. Implementa la RN-004 (Cálculo de Ganancia de Masa).
 */

import prisma from '../config/database';
import { pesajeRepository } from '../repositories/pesaje.repository';
import type { PesajeRepository } from '../repositories/pesaje.repository';
import { animalRepository } from '../repositories/animal.repository';
import { NotFoundError, BusinessRuleError } from '../types/errors';
import type { CreatePesajeDto, DesteteDto } from '../validators/pesaje.validator';
import type { Pesaje } from '@prisma/client';
import { calcularPesoDesteteAjustado, calcularPesoAnioAjustado } from '../utils/zootecniaUtils';

/**
 * Servicio encargado de la gestión de pesajes de los animales.
 * Realiza el registro de peso y permite el registro de destetes
 * mediante métodos directos o zoométricos (RN-016), además del
 * cálculo dinámico de ganancia (RN-004).
 */
export class PesajeService {
  constructor(private readonly repo: PesajeRepository) {}

  /**
   * Registra un pesaje y calcula la ganancia de masa (RN-004).
   */
  async create(dto: CreatePesajeDto, userId: number, ip?: string): Promise<Pesaje> {
    const animal = await animalRepository.findById(dto.animalId);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal no existe.');
    }

    // RN-004: Cálculo de ganancia
    const pesajeAnterior = await this.repo.findAnterior(dto.animalId, dto.fecha);
    
    let ganancia: number | null = null;
    let gananciaDiaria: number | null = null;

    if (pesajeAnterior) {
      ganancia = dto.peso - pesajeAnterior.peso;
      const msDiff = dto.fecha.getTime() - pesajeAnterior.fecha.getTime();
      const dias = msDiff / (1000 * 60 * 60 * 24);

      if (dias > 0) {
        gananciaDiaria = ganancia / dias;
      }
    }

    let pesoDesteteAjustado = null;
    let pesoAnioAjustado = null;
    const pesoNacer = animal.pesoNacimiento ?? 30; // 30kg default

    if (animal.fechaNacimiento) {
      pesoDesteteAjustado = calcularPesoDesteteAjustado(dto.peso, pesoNacer, animal.fechaNacimiento, dto.fecha);
      pesoAnioAjustado = calcularPesoAnioAjustado(dto.peso, pesoNacer, animal.fechaNacimiento, dto.fecha);
    }

    return prisma.$transaction(async (tx) => {
      const pesaje = await tx.pesaje.create({
        data: {
          ...dto,
          pesoDesteteAjustado,
          pesoAnioAjustado,
          operarioId: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_PESAJE',
          entidad: 'Pesaje',
          entidadId: pesaje.id,
          ip: ip ?? null,
          datos: JSON.stringify({
            peso: pesaje.peso,
            ganancia,
            gananciaDiaria,
          }),
        },
      });

      return pesaje;
    });
  }

  /**
   * Registra el destete de un animal (RN-016).
   * Puede ser mediante peso directo o método zoométrico.
   * Transiciona la etapa del animal a RECRIA.
   *
   * @param animalId - ID del animal a destetar.
   * @param dto - Datos del destete.
   * @param userId - ID del operario/usuario actual.
   * @param ip - Dirección IP de la solicitud.
   * @returns El nuevo registro de pesaje de tipo DESTETE.
   */
  async registrarDestete(animalId: number, dto: DesteteDto, userId: number, ip?: string): Promise<Pesaje> {
    const animal = await animalRepository.findById(animalId);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal no existe.');
    }

    if (animal.etapaActual !== 'CRIA') {
      throw new BusinessRuleError('ANIMAL_NO_ES_CRIA', 'Solo los animales en etapa de CRÍA pueden ser destetados.');
    }

    let pesoFinal = dto.peso;

    // Cálculo Zoométrico (RN-016)
    if (dto.metodo === 'ZOOMETRICO') {
      const pt = dto.perimetroToracico!;
      const lc = dto.longitudCorporal!;
      pesoFinal = (pt * pt * lc) / 10838;
      // Redondear a 2 decimales
      pesoFinal = Math.round(pesoFinal * 100) / 100;
    }

    let pesoDesteteAjustado = null;
    let pesoAnioAjustado = null;
    const pesoNacer = animal.pesoNacimiento ?? 30; // 30kg default

    if (animal.fechaNacimiento) {
      pesoDesteteAjustado = calcularPesoDesteteAjustado(pesoFinal, pesoNacer, animal.fechaNacimiento, dto.fecha);
      pesoAnioAjustado = calcularPesoAnioAjustado(pesoFinal, pesoNacer, animal.fechaNacimiento, dto.fecha);
    }

    // El cálculo de ganancia se hace dinámicamente en GET /hoja-de-vida

    return prisma.$transaction(async (tx) => {
      // 1. Insertar pesaje
      const pesaje = await tx.pesaje.create({
        data: {
          animalId,
          peso: pesoFinal!,
          metodoMedicion: dto.metodo === 'ZOOMETRICO' ? 'CINTA_ZOOMETRICA' : 'BASCULA',
          perimetroToracico: dto.perimetroToracico,
          longitudCorporal: dto.longitudCorporal,
          pesoDesteteAjustado,
          pesoAnioAjustado,
          fecha: dto.fecha,
          tipoPesaje: 'DESTETE',
          operarioId: userId,
          observaciones: dto.observaciones ?? `Destete calculado por método ${dto.metodo}`,
        },
      });

      // 2. Transicionar Etapa
      const etapaAnterior = animal.etapaActual;
      const etapaNueva = 'RECRIA';

      await tx.animal.update({
        where: { id: animal.id },
        data: { etapaActual: etapaNueva },
      });

      await tx.historialEtapa.create({
        data: {
          animalId,
          etapaAnterior,
          etapaNueva,
          fecha: dto.fecha,
          observaciones: `Destete registrado - Método ${dto.metodo}`,
        }
      });

      // 3. Auditoría
      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_DESTETE',
          entidad: 'Pesaje',
          entidadId: pesaje.id,
          ip: ip ?? null,
          datos: JSON.stringify({ metodo: dto.metodo, pesoFinal }),
        },
      });

      return pesaje;
    });
  }

  async findAll(query: any, rbacFilter?: any) {
    return this.repo.findAll(query, rbacFilter);
  }

  async delete(id: number, userId: number, ip?: string): Promise<void> {
    const pesaje = await this.repo.findById(id);
    if (!pesaje) {
      throw new NotFoundError('PESAJE_NOT_FOUND', 'Pesaje no encontrado.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.pesaje.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'DELETE_PESAJE',
          entidad: 'Pesaje',
          entidadId: id,
          ip: ip ?? null,
          datos: JSON.stringify({ peso: pesaje.peso, animalId: pesaje.animalId }),
        },
      });
    });
  }
}

export const pesajeService = new PesajeService(pesajeRepository);
