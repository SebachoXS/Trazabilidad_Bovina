/**
 * @file backend/src/services/health.service.ts
 * @description Servicio del Módulo Sanitario. Contiene toda la lógica de negocio.
 * CONSTITUTION §3.1: Los servicios NO conocen Request ni Response de Express.
 * CONSTITUTION §4.1 (Principio S): Un servicio = un dominio.
 *
 * Reglas de negocio implementadas:
 * - RN-002: Cálculo automático de fechaFinRetiro y cambio de estado EN_RETIRO.
 * - RN-002: Liberación automática de retiro vencido (para cron job).
 * - Anti-IDOR: Verificación de que cada recurso pertenece al animal indicado.
 *
 * @see SPEC.md §9 — Reglas de Negocio Críticas
 */

import type { Animal } from '@prisma/client';
import prisma from '../config/database';
import { NotFoundError, BusinessRuleError } from '../types/errors';
import type { PaginatedResult } from '../types/index';
import type {
  IHealthRepository,
  EventoSanitarioConRelaciones,
  EventoQueryFilters,
  UpdateEventoSanitarioRepoDto,
} from '../repositories/health.repository';
import type {
  CreateEventoSanitarioDto,
  UpdateEventoSanitarioDto,
  EventoSanitarioQueryDto,
} from '../validators/health.validator';

// ─────────────────────────────────────────────
// DTOs DE RESPUESTA
// ─────────────────────────────────────────────

/** Información de alerta de retiro activo para la respuesta API. */
export interface AlertaRetiroDto {
  activa: boolean;
  diasRestantes: number;
  fechaLibre: Date;
  producto?: string | null;
  movimientosBloqueados: string[];
}

/** DTO de respuesta enriquecido para EventoSanitario. */
export interface EventoSanitarioResponseDto {
  id: number;
  animalId: number;
  tipo: string;
  fecha: Date;
  producto?: string | null;
  principioActivo?: string | null;
  dosis?: string | null;
  viaAdministracion?: string | null;
  lote?: string | null;
  laboratorio?: string | null;
  periodoRetiro: number;
  fechaFinRetiro?: Date | null;
  diagnostico?: string | null;
  observaciones?: string | null;
  creadoPor: { id: number; nombre: string };
  createdAt: Date;
  updatedAt: Date;
  animal: {
    id: number;
    codigoVisual: string;
    estado: string;
    alertaRetiro?: AlertaRetiroDto;
  };
}

/** Resultado de la operación de liberación de retiros vencidos (para logging del cron job). */
export interface LiberacionRetiroResult {
  animalesLiberados: number;
  ids: number[];
}

// ─────────────────────────────────────────────
// INTERFAZ DEL SERVICIO
// ─────────────────────────────────────────────

/** Interfaz pública del servicio sanitario. */
export interface IHealthService {
  create(
    animalId: number,
    dto: CreateEventoSanitarioDto,
    userId: number,
    ip?: string
  ): Promise<EventoSanitarioResponseDto>;

  createBatch(
    animalIds: number[],
    dto: CreateEventoSanitarioDto,
    userId: number,
    ip?: string
  ): Promise<void>;

  findByAnimalId(animalId: number, queryDto: EventoSanitarioQueryDto, rbacFilter?: any): Promise<PaginatedResult<EventoSanitarioResponseDto>>;
  findById(eventoId: number, animalId: number): Promise<EventoSanitarioResponseDto>;
  update(eventoId: number, animalId: number, dto: UpdateEventoSanitarioDto, userId: number): Promise<EventoSanitarioResponseDto>;
  delete(eventoId: number, userId: number): Promise<void>;
  findAll(rbacFilter: any, queryDto: EventoSanitarioQueryDto): Promise<PaginatedResult<EventoSanitarioResponseDto>>;
  liberarAnimalesConRetiroVencido(): Promise<LiberacionRetiroResult>;
}

// ─────────────────────────────────────────────
// IMPLEMENTACIÓN
// ─────────────────────────────────────────────

/**
 * Servicio central para el Módulo Sanitario.
 * 
 * Gestiona el alta, modificación y eliminación de eventos sanitarios de los animales,
 * e implementa la regla de negocio para el cálculo automático de los períodos de retiro (RN-002),
 * asegurando la salud pública y la correcta trazabilidad clínica del animal.
 */
export class HealthService implements IHealthService {
  constructor(private readonly repo: IHealthRepository) {}

  // ─────────────────────────────────────────
  // MÉTODO PRINCIPAL: create() — Implementa RN-002
  // ─────────────────────────────────────────

  /**
   * Registra un nuevo evento sanitario para un animal.
   *
   * Si el evento incluye un período de retiro (periodoRetiro > 0):
   * 1. Calcula automáticamente la fechaFinRetiro.
   * 2. Si fechaFinRetiro > ahora, cambia el estado del animal a EN_RETIRO.
   * 3. Registra la operación en el AuditLog.
   * Todo ocurre en una transacción Prisma atómica.
   *
   * @param {number} animalId - ID del animal receptor del evento.
   * @param {CreateEventoSanitarioDto} dto - Datos validados del evento.
   * @param {number} userId - ID del usuario que registra (para auditoría).
   * @param {string} [ip] - IP del cliente (para auditoría).
   * @returns {Promise<EventoSanitarioResponseDto>} El evento creado con la alerta de retiro.
   * @throws {NotFoundError} Si el animal no existe o está eliminado.
   */
  async create(
    animalId: number,
    dto: CreateEventoSanitarioDto,
    userId: number,
    ip?: string
  ): Promise<EventoSanitarioResponseDto> {
    // ── Paso 1: Verificar existencia del animal ──────────────────────────
    const animal = await prisma.animal.findFirst({
      where: { id: animalId, deletedAt: null },
    });

    if (!animal) {
      throw new NotFoundError(
        'ANIMAL_NOT_FOUND',
        `El animal con ID ${animalId} no existe o ha sido eliminado del sistema.`
      );
    }

    // ── Paso 2: Calcular fechaFinRetiro ──────────────────────────────────
    let fechaFinRetiro: Date | null = null;
    if (dto.periodoRetiro > 0) {
      fechaFinRetiro = new Date(
        dto.fecha.getTime() + dto.periodoRetiro * 24 * 60 * 60 * 1000
      );
    }

    // ── Paso 3: Determinar si aplica cambio de estado a EN_RETIRO ────────
    const debePonerEnRetiro =
      fechaFinRetiro !== null && fechaFinRetiro > new Date();

    // ── Paso 4: Transacción atómica ───────────────────────────────────────
    /**
     * Se usa la variante callback de $transaction para poder acceder al
     * ID del evento creado en el AuditLog de la misma transacción.
     * SPEC.md §Plan Open Question #3.
     */
    const evento = await prisma.$transaction(async (tx) => {
      // 4a: Crear el EventoSanitario
      const nuevoEvento = await tx.eventoSanitario.create({
        data: {
          ...dto,
          animalId,
          creadoPorId: userId,
          fechaFinRetiro,
        },
        include: {
          animal: true,
          creadoPor: { select: { id: true, nombre: true } },
        },
      });

      // 4b: Cambiar estado del animal a EN_RETIRO (si aplica)
      if (debePonerEnRetiro) {
        await tx.animal.update({
          where: { id: animalId },
          data: { estado: 'EN_RETIRO' },
        });

        // 4c: AuditLog del cambio de estado
        await tx.auditLog.create({
          data: {
            usuarioId: userId,
            accion: 'ANIMAL_EN_RETIRO',
            entidad: 'Animal',
            entidadId: animalId,
            ip: ip ?? null,
            datos: JSON.stringify({
              producto: dto.producto,
              periodoRetiro: dto.periodoRetiro,
              fechaFinRetiro: fechaFinRetiro?.toISOString(),
            }),
          },
        });
      }

      // 4d: AuditLog del evento sanitario
      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'CREATE_EVENTO_SANITARIO',
          entidad: 'EventoSanitario',
          entidadId: nuevoEvento.id,
          ip: ip ?? null,
          datos: JSON.stringify({ tipo: dto.tipo, producto: dto.producto }),
        },
      });

      return nuevoEvento;
    });

    // ── Paso 5: Construir estado actualizado del animal para la respuesta ──
    const estadoAnimalActualizado = debePonerEnRetiro ? 'EN_RETIRO' : animal.estado;

    return this.buildResponseDto(
      evento as EventoSanitarioConRelaciones,
      estadoAnimalActualizado,
      debePonerEnRetiro,
      fechaFinRetiro,
      dto.producto
    );
  }

  // ─────────────────────────────────────────
  // createBatch() - RN-013 Lotes
  // ─────────────────────────────────────────
  
  async createBatch(
    animalIds: number[],
    dto: CreateEventoSanitarioDto,
    userId: number,
    ip?: string
  ): Promise<void> {
    if (animalIds.length === 0) return;
    
    // Verificar que todos los animales existan
    const animales = await prisma.animal.findMany({
      where: { id: { in: animalIds }, deletedAt: null }
    });
    
    if (animales.length !== animalIds.length) {
      throw new BusinessRuleError('ANIMAL_NOT_FOUND', 'Uno o más animales no existen o están inactivos.');
    }
    
    // Calcular fecha fin retiro
    let fechaFinRetiro: Date | null = null;
    if (dto.periodoRetiro > 0) {
      fechaFinRetiro = new Date(dto.fecha.getTime() + dto.periodoRetiro * 24 * 60 * 60 * 1000);
    }
    const debePonerEnRetiro = fechaFinRetiro !== null && fechaFinRetiro > new Date();
    
    await prisma.$transaction(async (tx) => {
      for (const animal of animales) {
        const evento = await tx.eventoSanitario.create({
          data: {
            ...dto,
            animalId: animal.id,
            creadoPorId: userId,
            fechaFinRetiro
          }
        });
        
        if (debePonerEnRetiro && animal.estado !== 'EN_RETIRO') {
          await tx.animal.update({
            where: { id: animal.id },
            data: { estado: 'EN_RETIRO' }
          });
        }
        
        await tx.auditLog.create({
          data: {
            usuarioId: userId,
            accion: 'CREATE_EVENTO_SANITARIO_LOTE',
            entidad: 'EventoSanitario',
            entidadId: evento.id,
            ip: ip ?? null,
            datos: JSON.stringify({ tipo: dto.tipo, producto: dto.producto, lote: true }),
          }
        });
      }
    });
  }

  // ─────────────────────────────────────────
  // findByAnimalId()
  // ─────────────────────────────────────────

  /**
   * Lista el historial sanitario de un animal con paginación y filtros.
   * Verifica que el animal existe antes de consultar.
   *
   * @param {number} animalId - ID del animal.
   * @param {EventoSanitarioQueryDto} queryDto - Filtros y paginación.
   * @param {any} rbacFilter - Filtro de seguridad (RN-030).
   * @returns {Promise<PaginatedResult<EventoSanitarioResponseDto>>} Lista paginada.
   * @throws {NotFoundError} Si el animal no existe.
   */
  async findByAnimalId(
    animalId: number,
    queryDto: EventoSanitarioQueryDto,
    rbacFilter?: any
  ): Promise<PaginatedResult<EventoSanitarioResponseDto>> {
    const animalExiste = await prisma.animal.findFirst({
      where: { id: animalId, deletedAt: null },
      select: { id: true },
    });

    if (!animalExiste) {
      throw new NotFoundError('ANIMAL_NOT_FOUND', `El animal con ID ${animalId} no existe.`);
    }

    const filters = this.queryDtoToFilters(queryDto);
    const result = await this.repo.findByAnimalId(animalId, filters, rbacFilter);

    return {
      data: result.data.map((e) => this.buildResponseDto(e, e.animal.estado, false, e.fechaFinRetiro, e.producto)),
      meta: result.meta,
    };
  }

  // ─────────────────────────────────────────
  // findById() — Con protección Anti-IDOR
  // ─────────────────────────────────────────

  /**
   * Obtiene un evento sanitario por ID, verificando que pertenece al animal indicado.
   * Protección anti-IDOR: impide acceder a eventos de otros animales manipulando la URL.
   *
   * @param {number} eventoId - ID del evento.
   * @param {number} animalId - ID del animal (del param de URL).
   * @returns {Promise<EventoSanitarioResponseDto>} El evento.
   * @throws {NotFoundError} Si no existe o el evento no pertenece al animal.
   */
  async findById(
    eventoId: number,
    animalId: number
  ): Promise<EventoSanitarioResponseDto> {
    const evento = await this.repo.findById(eventoId);

    // Protección Anti-IDOR: el evento debe pertenecer al animal de la URL
    if (!evento || evento.animalId !== animalId) {
      throw new NotFoundError(
        'EVENTO_NOT_FOUND',
        `El evento sanitario con ID ${eventoId} no existe para el animal ${animalId}.`
      );
    }

    const alertaActiva =
      evento.fechaFinRetiro !== null &&
      evento.fechaFinRetiro !== undefined &&
      evento.fechaFinRetiro > new Date();

    return this.buildResponseDto(
      evento,
      evento.animal.estado,
      alertaActiva,
      evento.fechaFinRetiro ?? null,
      evento.producto
    );
  }

  // ─────────────────────────────────────────
  // update() — Con recálculo de retiro
  // ─────────────────────────────────────────

  /**
   * Actualiza un evento sanitario con auditoría.
   * Si se modifica `periodoRetiro`, recalcula `fechaFinRetiro` y reevalúa el estado del animal.
   *
   * @param {number} eventoId - ID del evento.
   * @param {number} animalId - ID del animal (validación anti-IDOR).
   * @param {UpdateEventoSanitarioDto} dto - Campos a actualizar.
   * @param {number} userId - ID del usuario (para auditoría).
   * @returns {Promise<EventoSanitarioResponseDto>} El evento actualizado.
   * @throws {NotFoundError} Si el evento no existe o no pertenece al animal.
   */
  async update(
    eventoId: number,
    animalId: number,
    dto: UpdateEventoSanitarioDto,
    userId: number
  ): Promise<EventoSanitarioResponseDto> {
    const eventoExistente = await this.repo.findById(eventoId);

    if (!eventoExistente || eventoExistente.animalId !== animalId) {
      throw new NotFoundError(
        'EVENTO_NOT_FOUND',
        `El evento sanitario con ID ${eventoId} no existe para el animal ${animalId}.`
      );
    }

    const updateData: UpdateEventoSanitarioRepoDto = { ...dto };

    // Recalcular fechaFinRetiro si cambió periodoRetiro
    if (dto.periodoRetiro !== undefined) {
      const fechaBase = dto.fecha ?? eventoExistente.fecha;
      updateData.fechaFinRetiro =
        dto.periodoRetiro > 0
          ? new Date(fechaBase.getTime() + dto.periodoRetiro * 24 * 60 * 60 * 1000)
          : null;
    }

    const eventoActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.eventoSanitario.update({
        where: { id: eventoId },
        data: updateData,
        include: {
          animal: true,
          creadoPor: { select: { id: true, nombre: true } },
        },
      });

      // Reevaluar estado del animal si cambió el período de retiro
      if (dto.periodoRetiro !== undefined && updateData.fechaFinRetiro !== undefined) {
        const nuevoEstado =
          updateData.fechaFinRetiro !== null && updateData.fechaFinRetiro > new Date()
            ? 'EN_RETIRO'
            : 'ACTIVO';

        await tx.animal.update({
          where: { id: animalId },
          data: { estado: nuevoEstado },
        });
      }

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'UPDATE_EVENTO_SANITARIO',
          entidad: 'EventoSanitario',
          entidadId: eventoId,
          datos: JSON.stringify(dto),
        },
      });

      return updated;
    });

    const eventoFinal = eventoActualizado as EventoSanitarioConRelaciones;
    const alertaActiva =
      eventoFinal.fechaFinRetiro !== null &&
      eventoFinal.fechaFinRetiro !== undefined &&
      eventoFinal.fechaFinRetiro > new Date();

    return this.buildResponseDto(
      eventoFinal,
      eventoFinal.animal.estado,
      alertaActiva,
      eventoFinal.fechaFinRetiro ?? null,
      eventoFinal.producto
    );
  }

  // ─────────────────────────────────────────
  // delete()
  // ─────────────────────────────────────────

  /**
   * Elimina un evento sanitario y registra en el AuditLog.
   * Solo ADMIN puede realizar esta operación (verificado por RBAC en la ruta).
   *
   * @param {number} eventoId - ID del evento a eliminar.
   * @param {number} userId - ID del usuario ADMIN (para auditoría).
   * @throws {NotFoundError} Si el evento no existe.
   */
  async delete(eventoId: number, userId: number): Promise<void> {
    const evento = await this.repo.findById(eventoId);

    if (!evento) {
      throw new NotFoundError(
        'EVENTO_NOT_FOUND',
        `El evento sanitario con ID ${eventoId} no existe.`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.eventoSanitario.delete({ where: { id: eventoId } });

      await tx.auditLog.create({
        data: {
          usuarioId: userId,
          accion: 'DELETE_EVENTO_SANITARIO',
          entidad: 'EventoSanitario',
          entidadId: eventoId,
          datos: JSON.stringify({ tipo: evento.tipo, animalId: evento.animalId }),
        },
      });
    });
  }

  // ─────────────────────────────────────────
  // findAll() — Búsqueda global por predio
  // ─────────────────────────────────────────

  /**
   * Lista todos los eventos de un predio con filtros avanzados.
   *
   * @param {any} rbacFilter - Filtro de seguridad (RN-030).
   * @param {EventoSanitarioQueryDto} queryDto - Filtros y paginación.
   * @returns {Promise<PaginatedResult<EventoSanitarioResponseDto>>} Lista paginada.
   */
  async findAll(
    rbacFilter: any,
    queryDto: EventoSanitarioQueryDto
  ): Promise<PaginatedResult<EventoSanitarioResponseDto>> {
    const filters = this.queryDtoToFilters(queryDto);
    const result = await this.repo.findAll(rbacFilter, filters);

    return {
      data: result.data.map((e) => {
        const alertaActiva =
          e.fechaFinRetiro !== null &&
          e.fechaFinRetiro !== undefined &&
          e.fechaFinRetiro > new Date();
        return this.buildResponseDto(e, e.animal.estado, alertaActiva, e.fechaFinRetiro ?? null, e.producto);
      }),
      meta: result.meta,
    };
  }

  // ─────────────────────────────────────────
  // liberarAnimalesConRetiroVencido() — Para Cron Job
  // ─────────────────────────────────────────

  /**
   * Libera automáticamente los animales cuyo período de retiro ya expiró.
   * Cambia su estado de EN_RETIRO a ACTIVO y registra el AuditLog.
   * Este método es invocado por el cron job horario (RN-002).
   *
   * @returns {Promise<LiberacionRetiroResult>} Número de animales liberados e IDs.
   */
  async liberarAnimalesConRetiroVencido(): Promise<LiberacionRetiroResult> {
    const animalesVencidos: Animal[] = await this.repo.findAnimalesEnRetiroVencido();

    if (animalesVencidos.length === 0) {
      return { animalesLiberados: 0, ids: [] };
    }

    const ids = animalesVencidos.map((a) => a.id);

    await prisma.$transaction(async (tx) => {
      // Liberar todos los animales en un solo UPDATE
      await tx.animal.updateMany({
        where: { id: { in: ids } },
        data: { estado: 'ACTIVO' },
      });

      // Un AuditLog por animal liberado
      await tx.auditLog.createMany({
        data: ids.map((id) => ({
          usuarioId: 1, // Usuario sistema (cron job). ID 1 = cuenta sistema/ADMIN.
          accion: 'RETIRO_FINALIZADO',
          entidad: 'Animal',
          entidadId: id,
          datos: JSON.stringify({ motivo: 'Período de retiro completado automáticamente.' }),
        })),
      });
    });

    return { animalesLiberados: animalesVencidos.length, ids };
  }

  // ─────────────────────────────────────────
  // HELPERS PRIVADOS
  // ─────────────────────────────────────────

  /**
   * Construye el DTO de respuesta enriquecido, incluyendo la alerta de retiro activo.
   * El color #dc2626 de la alerta es informativo para el frontend (CONSTITUTION §5.1).
   */
  private buildResponseDto(
    evento: EventoSanitarioConRelaciones,
    estadoAnimal: string,
    alertaActiva: boolean,
    fechaFinRetiro: Date | null,
    producto?: string | null
  ): EventoSanitarioResponseDto {
    let alertaRetiro: AlertaRetiroDto | undefined;

    if (alertaActiva && fechaFinRetiro !== null) {
      const ahora = new Date();
      const diasRestantes = Math.ceil(
        (fechaFinRetiro.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)
      );

      alertaRetiro = {
        activa: true,
        diasRestantes,
        fechaLibre: fechaFinRetiro,
        producto,
        movimientosBloqueados: ['TRASLADO_EXTERNO', 'EGRESO_SACRIFICIO', 'CAMBIO_PROPIETARIO'],
      };
    }

    return {
      id: evento.id,
      animalId: evento.animalId,
      tipo: evento.tipo,
      fecha: evento.fecha,
      producto: evento.producto,
      principioActivo: evento.principioActivo,
      dosis: evento.dosis,
      viaAdministracion: evento.viaAdministracion,
      lote: evento.lote,
      laboratorio: evento.laboratorio,
      periodoRetiro: evento.periodoRetiro,
      fechaFinRetiro: evento.fechaFinRetiro,
      diagnostico: evento.diagnostico,
      observaciones: evento.observaciones,
      creadoPor: evento.creadoPor,
      createdAt: evento.createdAt,
      updatedAt: evento.updatedAt,
      animal: {
        id: evento.animal.id,
        codigoVisual: evento.animal.codigoVisual,
        estado: estadoAnimal,
        ...(alertaRetiro ? { alertaRetiro } : {}),
      },
    };
  }

  /**
   * Convierte el DTO de query params al tipo interno de filtros del repositorio.
   */
  private queryDtoToFilters(queryDto: EventoSanitarioQueryDto): EventoQueryFilters {
    return {
      tipo: queryDto.tipo,
      fechaDesde: queryDto.fechaDesde,
      fechaHasta: queryDto.fechaHasta,
      conRetiroActivo: queryDto.conRetiroActivo,
      page: queryDto.page,
      limit: queryDto.limit,
    };
  }
}

// ─────────────────────────────────────────────
// SINGLETON EXPORTADO
// ─────────────────────────────────────────────

import { healthRepository } from '../repositories/health.repository';

/**
 * Instancia singleton del servicio sanitario.
 * Importar esta instancia en el controlador.
 */
export const healthService = new HealthService(healthRepository);

// ─────────────────────────────────────────────
// VALIDACIÓN DE BLOQUEO POR RETIRO (usado por MovimientoService)
// ─────────────────────────────────────────────

const MOVIMIENTOS_BLOQUEADOS_EN_RETIRO = [
  'TRASLADO_EXTERNO',
  'CAMBIO_PROPIETARIO',
  'EGRESO_SACRIFICIO',
] as const;

/**
 * Valida que un animal puede ser movido. Lanza BusinessRuleError si está EN_RETIRO.
 * Función exportada para ser usada por MovimientoService (RN-002 — bloqueo de movimientos).
 *
 * @param {string} estadoAnimal - Estado actual del animal.
 * @param {string} tipoMovimiento - Tipo de movimiento que se intenta registrar.
 * @param {string} codigoVisual - Código visual del animal (para el mensaje de error).
 * @param {Date | null} fechaFinRetiro - Fecha de fin de retiro.
 * @throws {BusinessRuleError} Si el animal está en retiro y el movimiento está bloqueado.
 */
export function validarMovimientoAnimalEnRetiro(
  estadoAnimal: string,
  tipoMovimiento: string,
  codigoVisual: string,
  fechaFinRetiro: Date | null
): void {
  if (
    estadoAnimal === 'EN_RETIRO' &&
    (MOVIMIENTOS_BLOQUEADOS_EN_RETIRO as ReadonlyArray<string>).includes(tipoMovimiento)
  ) {
    throw new BusinessRuleError(
      'ANIMAL_EN_RETIRO_BLOQUEADO',
      `El animal ${codigoVisual} tiene un período de retiro activo${
        fechaFinRetiro
          ? ` hasta el ${fechaFinRetiro.toLocaleDateString('es-CO')}`
          : ''
      }. No puede ser trasladado, egresado ni cambiar de propietario durante este período.`,
      { estadoAnimal, tipoMovimiento, fechaFinRetiro }
    );
  }
}
