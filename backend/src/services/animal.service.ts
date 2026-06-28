/**
 * @file backend/src/services/animal.service.ts
 * @description Servicio de Animales. Orquesta la RN-001 (Inmutabilidad del Código Visual).
 */

import prisma from '../config/database';
import { animalRepository } from '../repositories/animal.repository';
import type { IAnimalRepository, PaginatedAnimalResult } from '../repositories/animal.repository';
import { BusinessRuleError, NotFoundError, ConflictError } from '../types/errors';
import type { CreateAnimalDto, UpdateAnimalDto, AnimalQueryDto } from '../validators/animal.validator';
import type { Animal } from '@prisma/client';

export class AnimalService {
  constructor(private readonly repo: IAnimalRepository) {}

  /**
   * Crea un animal verificando que el código visual no esté duplicado.
   */
  async create(dto: CreateAnimalDto, userId: number, ip?: string, rol?: string): Promise<Animal> {
    const existe = await this.repo.findByCodigoVisual(dto.codigoVisual);
    if (existe) {
      throw new ConflictError(
        'CODIGO_VISUAL_DUPLICADO',
        `El código visual ${dto.codigoVisual} ya está registrado.`
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Obtener predio para el código CUSA
      const predio = await tx.predio.findUnique({ where: { id: dto.predioId } });
      if (!predio) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado');

      // 2. CUSA Gen (SecuenciaPredio)
      const currentYear = new Date().getFullYear().toString();
      
      let secuencia = await tx.secuenciaPredio.findUnique({
        where: { predioId_anio: { predioId: dto.predioId, anio: currentYear } }
      });
      
      if (!secuencia) {
        secuencia = await tx.secuenciaPredio.create({
          data: { predioId: dto.predioId, anio: currentYear, secuencial: 1 }
        });
      } else {
        secuencia = await tx.secuenciaPredio.update({
          where: { id: secuencia.id },
          data: { secuencial: { increment: 1 } }
        });
      }

      const cusa = `BOV-${currentYear}-${predio.codigo}-${String(secuencia.secuencial).padStart(4, '0')}`;

      const estado = rol === 'ADMIN' ? 'ACTIVO' : 'PENDIENTE_APROBACION';
      const animal = await tx.animal.create({
        data: {
          codigoVisual: dto.codigoVisual,
          cusa,
          nombre: dto.nombre,
          raza: dto.raza,
          sexo: dto.sexo,
          fechaNacimiento: dto.fechaNacimiento,
          pesoNacimiento: dto.pesoNacimiento,
          esToroCatalogo: dto.esToroCatalogo,
          estado,
          isGestante: dto.isGestante,
          predioId: dto.predioId,
          madreId: dto.madreId,
          padreId: dto.padreId,
        },
      });

      // RN-010: Sincronización de Peso Inicial
      if (dto.pesoNacimiento) {
         await tx.pesaje.create({
           data: {
             animalId: animal.id,
             peso: dto.pesoNacimiento,
             fecha: dto.fechaNacimiento ?? new Date(),
             tipoPesaje: 'NACIMIENTO',
             operarioId: userId,
             observaciones: 'Registro de peso inicial del sistema'
           }
         });
      }

      // RN-008: Registro Atómico de Movimiento de Ingreso
      if (dto.registrarIngreso) {
         await tx.movimiento.create({
           data: {
             animalId: animal.id,
             tipo: 'INGRESO',
             fecha: dto.fechaNacimiento ?? new Date(),
             predioDestinoId: dto.predioId,
             numeroGuia: dto.numeroGuiaIngreso,
             creadoPorId: userId,
           }
         });
      }

      // RN-008: Diagnóstico de Gestación
      if (dto.isGestante && dto.sexo === 'HEMBRA') {
         await tx.eventoReproductivo.create({
           data: {
             animalId: animal.id,
             tipo: 'DIAGNOSTICO_GESTACION',
             fecha: new Date(),
             resultado: 'POSITIVO',
             observaciones: 'Gestación declarada al ingreso'
           }
         });
      }

      // 2. Registrar auditoría
      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_ANIMAL',
          entidad: 'Animal',
          entidadId: animal.id,
          ip: ip ?? null,
          datos: JSON.stringify({ codigoVisual: animal.codigoVisual, raza: animal.raza, sexo: animal.sexo }),
        },
      });

      return animal;
    });
  }

  /**
   * Busca animal por ID. Lanza error si no existe.
   */
  async findById(id: number): Promise<Animal> {
    const animal = await this.repo.findById(id);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', `El animal con ID ${id} no existe.`);
    }
    return animal;
  }

  /**
   * Busca animal por Código Visual. Lanza error si no existe.
   */
  async findByCodigoVisual(codigoVisual: string): Promise<Animal> {
    const animal = await this.repo.findByCodigoVisual(codigoVisual);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', `El animal con código ${codigoVisual} no existe.`);
    }
    return animal;
  }

  /**
   * Obtiene la lista paginada de animales.
   */
  async findAll(query: AnimalQueryDto, rbacFilter?: any): Promise<PaginatedAnimalResult> {
    return this.repo.findAll(query, rbacFilter);
  }

  /**
   * Actualiza un animal. 
   * RN-001: El DTO ya omite codigoVisual (impedido por Zod),
   * pero validamos internamente por seguridad en caso de ser invocado directamente.
   */
  async update(id: number, dto: UpdateAnimalDto, userId: number, ip?: string): Promise<Animal> {
    const animal = await this.repo.findById(id);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', `El animal con ID ${id} no existe.`);
    }

    // RN-001 Defensive check (por si acaso el DTO fue bypasseado)
    if ('codigoVisual' in dto) {
      throw new BusinessRuleError(
        'CODIGO_VISUAL_IMMUTABLE',
        'El código visual no puede modificarse una vez registrado.'
      );
    }

    return prisma.$transaction(async (tx) => {
      const animalActualizado = await tx.animal.update({
        where: { id },
        data: dto,
      });

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'UPDATE_ANIMAL',
          entidad: 'Animal',
          entidadId: id,
          ip: ip ?? null,
          datos: JSON.stringify(dto),
        },
      });

      return animalActualizado;
    });
  }

  /**
   * Elimina un animal mediante soft-delete.
   */
  async delete(id: number, userId: number, ip?: string): Promise<void> {
    const animal = await this.repo.findById(id);
    if (!animal) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', `El animal con ID ${id} no existe.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.animal.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'DELETE_ANIMAL',
          entidad: 'Animal',
          entidadId: id,
          ip: ip ?? null,
          datos: JSON.stringify({ codigoVisual: animal.codigoVisual }),
        },
      });
    });
  }
  /**
   * Obtiene la Hoja de Vida Integral de un animal (Fase 4).
   */
  async getHojaDeVida(idOrCodigo: number | string) {
    let animalBase: Animal | null;
    if (typeof idOrCodigo === 'number') {
      animalBase = await this.repo.findById(idOrCodigo);
    } else {
      animalBase = await this.repo.findByCodigoVisual(idOrCodigo);
    }

    if (!animalBase) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal no existe.');
    }

    // Consulta detallada del animal
    const animal = await prisma.animal.findUnique({
      where: { id: animalBase.id },
      include: {
        predio: { select: { id: true, nombre: true } },
        madre: { select: { id: true, codigoVisual: true, nombre: true } },
        padre: { select: { id: true, codigoVisual: true, nombre: true } },
        eventosSanitarios: true,
        pesajes: { orderBy: { fecha: 'desc' } },
        eventosReproductivos: true,
        movimientos: {
          include: {
            predioOrigen: { select: { nombre: true } },
            predioDestino: { select: { nombre: true } },
          },
        },
      },
    });

    if (!animal) throw new NotFoundError('ANIMAL_NOT_FOUND', 'El animal no existe.');

    // Construcción de la línea de tiempo
    const lineaDeTiempo: any[] = [];

    // Nacimiento
    if (animal.fechaNacimiento) {
      lineaDeTiempo.push({
        fecha: animal.fechaNacimiento,
        tipo: 'NACIMIENTO',
        icono: '🐄',
        titulo: 'Nacimiento registrado',
        descripcion: animal.pesoNacimiento ? `Peso al nacer: ${animal.pesoNacimiento} kg.` : '',
        categoria: 'REGISTRO',
      });
    }

    // Sanitarios
    for (const ev of animal.eventosSanitarios) {
      lineaDeTiempo.push({
        fecha: ev.fecha,
        tipo: 'EVENTO_SANITARIO',
        icono: '🔴',
        titulo: `${ev.tipo} — ${ev.producto || 'N/A'}`,
        descripcion: `Retiro: ${ev.periodoRetiro} días.`,
        categoria: 'SANITARIO',
      });
    }

    // Pesajes
    for (let i = 0; i < animal.pesajes.length; i++) {
      const p = animal.pesajes[i];
      const pesajeAnterior = animal.pesajes[i + 1];
      const ganancia = pesajeAnterior ? (p.peso - pesajeAnterior.peso) : null;
      lineaDeTiempo.push({
        fecha: p.fecha,
        tipo: 'PESAJE',
        icono: '⚖️',
        titulo: `Pesaje: ${p.peso} kg`,
        descripcion: `CC: ${p.condicionCorporal || 'N/A'}. Ganancia: ${ganancia !== null ? (ganancia > 0 ? '+' : '') + ganancia.toFixed(2) + ' kg' : 'N/A'}`,
        categoria: 'PRODUCTIVIDAD',
      });
    }

    // Reproductivos
    for (const er of animal.eventosReproductivos) {
      lineaDeTiempo.push({
        fecha: er.fecha,
        tipo: 'EVENTO_REPRODUCTIVO',
        icono: '🧬',
        titulo: `${er.tipo}`,
        descripcion: er.observaciones || '',
        categoria: 'REPRODUCCION',
      });
    }

    // Movimientos
    for (const mov of animal.movimientos) {
      let destino = mov.predioDestino?.nombre;
      if (!destino && mov.observaciones?.includes('Destino Externo:')) {
        const match = mov.observaciones.match(/Destino Externo:\s*(.+)/);
        destino = match ? match[1] : 'N/A';
      }
      
      const detalles = [
        destino ? `Destino: ${destino}` : null,
        mov.numeroGuia ? `Guía: ${mov.numeroGuia}` : null,
        mov.transportista ? `Transporte: ${mov.transportista}` : null
      ].filter(Boolean).join(' | ');

      lineaDeTiempo.push({
        fecha: mov.fecha,
        tipo: 'MOVIMIENTO',
        icono: '🚚',
        titulo: `${mov.tipo}`,
        descripcion: detalles || 'Movimiento sin detalles adicionales',
        categoria: 'LOGISTICA',
      });
    }

    // Ordenar timeline desc
    lineaDeTiempo.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

    // Alertas
    const alertas = [];
    if (animal.estado === 'EN_RETIRO') {
      const retiroActivo = animal.eventosSanitarios
        .filter(e => e.fechaFinRetiro && e.fechaFinRetiro > new Date())
        .sort((a, b) => b.fechaFinRetiro!.getTime() - a.fechaFinRetiro!.getTime())[0];

      if (retiroActivo) {
        const diasRestantes = Math.ceil((retiroActivo.fechaFinRetiro!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        alertas.push({
          tipo: 'RETIRO_ACTIVO',
          severidad: 'CRITICA',
          color: '#dc2626',
          mensaje: `Animal en período de retiro. Libre el ${retiroActivo.fechaFinRetiro!.toLocaleDateString()}.`,
          diasRestantes,
          producto: retiroActivo.producto,
          fechaLibre: retiroActivo.fechaFinRetiro,
          movimientosBloqueados: ['TRASLADO_EXTERNO', 'EGRESO_SACRIFICIO', 'CAMBIO_PROPIETARIO'],
        });
      }
    }

    return {
      animal: {
        id: animal.id,
        codigoVisual: animal.codigoVisual,
        nombre: animal.nombre,
        raza: animal.raza,
        sexo: animal.sexo,
        estado: animal.estado,
        fechaNacimiento: animal.fechaNacimiento,
        pesoNacimiento: animal.pesoNacimiento,
        pesoActual: animal.pesajes[0]?.peso || animal.pesoNacimiento,
        predio: animal.predio,
        pesajes: animal.pesajes || [],
      },
      alertas,
      genealogia: {
        madre: animal.madre,
        padre: animal.padre,
      },
      ultimoPesaje: animal.pesajes[0] || null,
      lineaDeTiempo,
      resumenSanitario: {
        totalVacunaciones: animal.eventosSanitarios.filter(e => e.tipo === 'VACUNACION').length,
        totalTratamientos: animal.eventosSanitarios.filter(e => e.tipo === 'TRATAMIENTO').length,
        totalDiagnosticos: animal.eventosSanitarios.filter(e => e.tipo === 'DIAGNOSTICO').length,
        enRetiroActivo: animal.estado === 'EN_RETIRO',
      },
      resumenProductivo: {
        totalPesajes: animal.pesajes.length,
        pesoMaximo: animal.pesajes.length > 0 ? Math.max(...animal.pesajes.map(p => p.peso)) : null,
        pesoMinimo: animal.pesajes.length > 0 ? Math.min(...animal.pesajes.map(p => p.peso)) : null,
      },
    };
  }

  /**
   * Aprueba un animal pendiente.
   */
  async aprobarAlta(id: number, adminId: number): Promise<void> {
    const animal = await this.repo.findById(id);
    if (!animal) throw new NotFoundError('ANIMAL_NOT_FOUND', 'Animal no encontrado.');

    await prisma.animal.update({
      where: { id },
      data: { estado: 'ACTIVO' }
    });

    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'APROBAR_ALTA_ANIMAL',
        entidad: 'Animal',
        entidadId: id,
        datos: JSON.stringify({ animalId: id })
      }
    });
  }

  /**
   * Rechaza (soft delete) un animal pendiente.
   */
  async rechazarAlta(id: number, adminId: number): Promise<void> {
    const animal = await this.repo.findById(id);
    if (!animal) throw new NotFoundError('ANIMAL_NOT_FOUND', 'Animal no encontrado.');

    await prisma.animal.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'RECHAZAR_ALTA_ANIMAL',
        entidad: 'Animal',
        entidadId: id,
        datos: JSON.stringify({ animalId: id })
      }
    });
  }
}

export const animalService = new AnimalService(animalRepository);
