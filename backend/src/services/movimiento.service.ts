/**
 * @file backend/src/services/movimiento.service.ts
 * @description Servicio de Movimientos. Implementa la RN-002 (Bloqueo Sanitario).
 */

import prisma from '../config/database';
import { movimientoRepository } from '../repositories/movimiento.repository';
import type { MovimientoRepository } from '../repositories/movimiento.repository';
import { animalRepository } from '../repositories/animal.repository';
import { adminRepository } from '../repositories/admin.repository';
import { BusinessRuleError, NotFoundError } from '../types/errors';
import type { CreateMovimientoDto } from '../validators/movimiento.validator';
import type { Movimiento } from '@prisma/client';

export class MovimientoService {
  constructor(private readonly repo: MovimientoRepository) {}

  /**
   * Registra un movimiento y actualiza la ubicación/estado del animal (RN-002).
   */
  async create(dto: CreateMovimientoDto, userId: number, ip?: string): Promise<Movimiento> {
    const animal = await animalRepository.findById(dto.animalId);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal no existe.');
    }

    // RN-002: BLOQUEO DE MOVIMIENTOS EN RETIRO
    const movimientosExternos = ['TRASLADO_EXTERNO', 'CAMBIO_PROPIETARIO', 'EGRESO_SACRIFICIO'];
    if (animal.estado === 'EN_RETIRO' && movimientosExternos.includes(dto.tipo)) {
      throw new BusinessRuleError(
        'ANIMAL_EN_RETIRO_BLOQUEADO',
        'Animal en retiro no puede ser trasladado externamente ni egresado.'
      );
    }

    // Validar predios implicados
    if (dto.predioOrigenId) {
      const pO = await adminRepository.findPredioById(dto.predioOrigenId);
      if (!pO) throw new NotFoundError('PREDIO_NOT_FOUND', 'El predio de origen no existe.');
      
      // Lógica de negocio extra: el predio origen debe coincidir con el predio actual del animal
      if (animal.predioId !== dto.predioOrigenId && dto.tipo !== 'INGRESO') {
        throw new BusinessRuleError('PREDIO_ORIGEN_INVALIDO', 'El animal no se encuentra en el predio de origen indicado.');
      }
    }

    if (dto.predioDestinoId) {
      const pD = await adminRepository.findPredioById(dto.predioDestinoId);
      if (!pD) throw new NotFoundError('PREDIO_NOT_FOUND', 'El predio de destino no existe.');
    }

    return prisma.$transaction(async (tx) => {
      let finalGuia = dto.numeroGuia;
      if (!finalGuia || finalGuia.trim() === '') {
        const count = await tx.movimiento.count();
        finalGuia = `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
      }

      // 1. Insertar Movimiento
      const movimiento = await tx.movimiento.create({
        data: {
          ...dto,
          numeroGuia: finalGuia,
          creadoPorId: userId,
        },
      });

      // 2. Determinar nuevo estado / predio del animal
      let nuevoEstado = animal.estado;
      let nuevoPredioId = animal.predioId;

      switch (dto.tipo) {
        case 'TRASLADO_INTERNO':
          // Se asume que el destino es un lote interno del mismo predio. 
          // Como nuestra BD sólo tiene `predioId`, aquí podríamos asimilar a un simple movimiento virtual, 
          // pero si `predioDestinoId` está configurado (distinto o igual) se actualiza.
          if (dto.predioDestinoId) nuevoPredioId = dto.predioDestinoId;
          break;
        case 'TRASLADO_EXTERNO':
        case 'CAMBIO_PROPIETARIO':
          if (dto.predioDestinoId) nuevoPredioId = dto.predioDestinoId;
          break;
        case 'INGRESO':
          if (dto.predioDestinoId) nuevoPredioId = dto.predioDestinoId;
          break;
        case 'EGRESO_SACRIFICIO':
          nuevoEstado = 'MUERTO';
          break;
      }

      // Actualizar Animal si hay cambios
      if (nuevoEstado !== animal.estado || nuevoPredioId !== animal.predioId) {
        await tx.animal.update({
          where: { id: animal.id },
          data: { estado: nuevoEstado, predioId: nuevoPredioId },
        });
      }

      // RN-014: Sincronización de Peso
      if (dto.pesoMovimiento) {
        await tx.pesaje.create({
          data: {
            animalId: animal.id,
            peso: dto.pesoMovimiento,
            fecha: dto.fecha,
            tipoPesaje: 'CONTROL',
            operarioId: userId,
            observaciones: `Pesaje asociado a movimiento: ${dto.tipo}`
          }
        });
      }

      // 3. Registrar AuditLog
      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_MOVIMIENTO',
          entidad: 'Movimiento',
          entidadId: movimiento.id,
          ip: ip ?? null,
          datos: JSON.stringify({ tipo: dto.tipo, estadoAnterior: animal.estado, nuevoEstado, nuevoPredioId }),
        },
      });

      return movimiento;
    });
  }

  async findAll(query: any, rbacFilter?: any) {
    return this.repo.findAll(query, rbacFilter);
  }

  async getById(id: number) {
    const mov = await this.repo.findById(id);
    if (!mov) throw new NotFoundError('MOVIMIENTO_NOT_FOUND', 'Movimiento no encontrado.');
    return mov;
  }

  async createBatch(dto: import('../validators/movimiento.validator').CreateMovimientoBatchDto, userId: number, ip?: string): Promise<Movimiento[]> {
    const { animalIds, evento } = dto;
    if (!animalIds.length) {
      throw new BusinessRuleError('NO_ANIMALS', 'No se proporcionaron animales para el movimiento masivo.');
    }

    const movimientosExternos = ['TRASLADO_EXTERNO', 'CAMBIO_PROPIETARIO', 'EGRESO_SACRIFICIO'];

    if (evento.predioOrigenId) {
      const pO = await adminRepository.findPredioById(evento.predioOrigenId);
      if (!pO) throw new NotFoundError('PREDIO_NOT_FOUND', 'El predio de origen no existe.');
    }
    if (evento.predioDestinoId) {
      const pD = await adminRepository.findPredioById(evento.predioDestinoId);
      if (!pD) throw new NotFoundError('PREDIO_NOT_FOUND', 'El predio de destino no existe.');
    }

    return prisma.$transaction(async (tx) => {
      // Validar todos los animales antes de hacer inserciones
      const animalesDb = await tx.animal.findMany({
        where: { id: { in: animalIds } }
      });

      if (animalesDb.length !== animalIds.length) {
        throw new NotFoundError('ANIMAL_NOT_FOUND', 'Uno o más animales no existen.');
      }

      for (const animal of animalesDb) {
        if (animal.estado === 'EN_RETIRO' && movimientosExternos.includes(evento.tipo)) {
          throw new BusinessRuleError(
            'ANIMAL_EN_RETIRO_BLOQUEADO',
            `Animal ${animal.codigoVisual} en retiro no puede ser trasladado externamente.`
          );
        }
        if (evento.predioOrigenId && animal.predioId !== evento.predioOrigenId && evento.tipo !== 'INGRESO') {
          throw new BusinessRuleError('PREDIO_ORIGEN_INVALIDO', `El animal ${animal.codigoVisual} no se encuentra en el predio de origen indicado.`);
        }
      }

      // Folio global si no hay
      let finalGuia = evento.numeroGuia;
      if (!finalGuia || finalGuia.trim() === '') {
        const count = await tx.movimiento.count();
        finalGuia = `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
      }

      const resultados: Movimiento[] = [];

      for (const animal of animalesDb) {
        // 1. Inserción
        const movimiento = await tx.movimiento.create({
          data: {
            ...evento,
            animalId: animal.id,
            numeroGuia: finalGuia,
            creadoPorId: userId,
          },
        });
        resultados.push(movimiento);

        // 2. Determinar nuevo estado / predio
        let nuevoEstado = animal.estado;
        let nuevoPredioId = animal.predioId;

        switch (evento.tipo) {
          case 'TRASLADO_INTERNO':
            if (evento.predioDestinoId) nuevoPredioId = evento.predioDestinoId;
            break;
          case 'TRASLADO_EXTERNO':
          case 'CAMBIO_PROPIETARIO':
          case 'INGRESO':
            if (evento.predioDestinoId) nuevoPredioId = evento.predioDestinoId;
            break;
          case 'EGRESO_SACRIFICIO':
            nuevoEstado = 'MUERTO';
            break;
        }

        // Actualizar Animal si hay cambios
        if (nuevoEstado !== animal.estado || nuevoPredioId !== animal.predioId) {
          await tx.animal.update({
            where: { id: animal.id },
            data: { estado: nuevoEstado, predioId: nuevoPredioId },
          });
        }

        if (evento.pesoMovimiento) {
          await tx.pesaje.create({
            data: {
              animalId: animal.id,
              peso: evento.pesoMovimiento,
              fecha: evento.fecha,
              tipoPesaje: 'CONTROL',
              operarioId: userId,
              observaciones: `Pesaje asociado a movimiento masivo: ${evento.tipo}`
            }
          });
        }
      }

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_MOVIMIENTO_BATCH',
          entidad: 'Movimiento',
          entidadId: 0,
          ip: ip ?? null,
          datos: JSON.stringify({ tipo: evento.tipo, numeroGuia: finalGuia, cantidad: animalIds.length }),
        },
      });

      return resultados;
    });
  }
}

export const movimientoService = new MovimientoService(movimientoRepository);
