/**
 * @file backend/src/services/admin.service.ts
 * @description Servicio Administrativo para Propietarios, Predios y Usuarios.
 */

import bcrypt from 'bcrypt';
import { adminRepository } from '../repositories/admin.repository';
import type { AdminRepository } from '../repositories/admin.repository';
import { BusinessRuleError, ConflictError, NotFoundError } from '../types/errors';
import type { 
  CreatePropietarioDto, UpdatePropietarioDto, 
  CreatePredioDto, UpdatePredioDto, 
  CreateUsuarioDto, UpdateUsuarioDto 
} from '../validators/admin.validator';
import type { Propietario, Predio, Usuario, Prisma } from '@prisma/client';
import prisma from '../config/database';

export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  // ── PROPIETARIOS ───────────────────────────────────────────────────────────────

  async createPropietario(dto: CreatePropietarioDto): Promise<Propietario> {
    const existe = await this.repo.findPropietarioByDocumento(dto.documento);
    if (existe) {
      throw new ConflictError('PROPIETARIO_DUPLICADO', 'Ya existe un propietario con ese documento.');
    }
    return this.repo.createPropietario(dto);
  }

  async getPropietarioById(id: number): Promise<Propietario> {
    const p = await this.repo.findPropietarioById(id);
    if (!p) throw new NotFoundError('PROPIETARIO_NOT_FOUND', 'Propietario no encontrado.');
    return p;
  }

  async getAllPropietarios(): Promise<Propietario[]> {
    return this.repo.findAllPropietarios();
  }

  async updatePropietario(id: number, dto: UpdatePropietarioDto): Promise<Propietario> {
    const p = await this.repo.findPropietarioById(id);
    if (!p) throw new NotFoundError('PROPIETARIO_NOT_FOUND', 'Propietario no encontrado.');
    return this.repo.updatePropietario(id, dto);
  }

  async deletePropietario(id: number): Promise<void> {
    const p = await this.repo.findPropietarioById(id);
    if (!p) throw new NotFoundError('PROPIETARIO_NOT_FOUND', 'Propietario no encontrado.');

    // Verificar si tiene predios activos
    // El include en el repo trae { predios: { where: { deletedAt: null } } }
    const prediosAsociados = (p as any).predios;
    if (prediosAsociados && prediosAsociados.length > 0) {
      throw new BusinessRuleError('PROPIETARIO_CON_PREDIOS', 'No se puede eliminar un propietario con predios activos.');
    }

    await this.repo.softDeletePropietario(id);
  }

  // ── PREDIOS ───────────────────────────────────────────────────────────────────

  async createPredio(dto: CreatePredioDto): Promise<Predio> {
    const existe = await this.repo.findPredioByCodigo(dto.codigo);
    if (existe) {
      throw new ConflictError('PREDIO_DUPLICADO', 'Ya existe un predio con ese código.');
    }

    const prop = await this.repo.findPropietarioById(dto.propietarioId);
    if (!prop) {
      throw new NotFoundError('PROPIETARIO_NOT_FOUND', 'El propietario indicado no existe.');
    }

    return this.repo.createPredio(dto);
  }

  async getPredioById(id: number): Promise<Predio> {
    const p = await this.repo.findPredioById(id);
    if (!p) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado.');
    return p;
  }

  async getAllPredios(estado?: string): Promise<Predio[]> {
    return this.repo.findAllPredios(estado);
  }

  async updatePredio(id: number, dto: UpdatePredioDto): Promise<Predio> {
    const p = await this.repo.findPredioById(id);
    if (!p) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado.');
    return this.repo.updatePredio(id, dto);
  }

  async deletePredio(id: number): Promise<void> {
    const p = await this.repo.findPredioById(id);
    if (!p) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado.');

    const animalesCount = await this.repo.countAnimalesEnPredio(id);
    if (animalesCount > 0) {
      throw new BusinessRuleError('PREDIO_CON_ANIMALES_ACTIVOS', 'No se puede eliminar un predio con animales activos.');
    }

    await this.repo.softDeletePredio(id);
  }

  async getPrediosPendientes(): Promise<Predio[]> {
    return this.repo.findPrediosPendientes();
  }

  async aprobarPredio(id: number, adminId: number): Promise<void> {
    const p = await this.repo.findPredioById(id);
    if (!p) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado.');
    if (p.estado === 'ACTIVO') throw new BusinessRuleError('PREDIO_YA_ACTIVO', 'El predio ya está activo.');
    
    await this.repo.updatePredio(id, { estado: 'ACTIVO' });

    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'APROBACION_PREDIO',
        entidad: 'Predio',
        entidadId: id,
        datos: JSON.stringify({ predioAprobadoId: id }),
      }
    });
  }

  async rechazarPredio(id: number, adminId: number, motivoRechazo: string): Promise<void> {
    const p = await this.repo.findPredioById(id);
    if (!p) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado.');
    if (p.estado !== 'PENDIENTE') {
      throw new BusinessRuleError('ESTADO_INVALIDO', 'Solo se pueden rechazar predios pendientes.');
    }
    
    // Mutación estricta de estado
    await this.repo.updatePredio(id, { estado: 'RECHAZADO', motivoRechazo });
    
    // Validación estricta: confirmamos con Prisma que la mutación persistió
    const mutacionComprobada = await this.repo.findPredioById(id);
    if (!mutacionComprobada || mutacionComprobada.estado !== 'RECHAZADO') {
      throw new Error('Inconsistencia en BD: El estado del predio no pudo mutar a RECHAZADO.');
    }
    
    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'RECHAZO_PREDIO',
        entidad: 'Predio',
        entidadId: id,
        datos: JSON.stringify({ predioRechazadoId: id, motivo: motivoRechazo }),
      }
    });
  }

  async getPredioStats(id: number) {
    const p = await this.repo.findPredioById(id);
    if (!p) throw new NotFoundError('PREDIO_NOT_FOUND', 'Predio no encontrado.');

    const totalAnimales = await this.repo.countAnimalesEnPredio(id);
    // Para simplificar, este endpoint puede extenderse con prisma.animal.groupBy si fuera necesario.
    return {
      predio: p,
      stats: { totalAnimales },
    };
  }

  // ── USUARIOS ──────────────────────────────────────────────────────────────────

  async createUsuario(dto: CreateUsuarioDto): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>> {
    const existe = await this.repo.findUsuarioByEmail(dto.email);
    if (existe) {
      throw new ConflictError('USUARIO_DUPLICADO', 'El correo ya está en uso.');
    }

    const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    if (dto.predioId === 'NEW') {
      if (!dto.nombrePredio || !dto.ubicacionPredio) {
        throw new BusinessRuleError('VALIDATION_ERROR', 'Nombre y ubicación de la finca son obligatorios.');
      }

      if (!dto.propietarioId) {
        throw new BusinessRuleError('VALIDATION_ERROR', 'Se requiere seleccionar un propietario para asignar la nueva finca.');
      }

      const userSafe = await prisma.$transaction(async (tx) => {
        const municipio = dto.ubicacionPredio!.split(',')[0]?.trim() || '';
        const departamento = dto.ubicacionPredio!.split(',')[1]?.trim() || municipio;

        const nuevoPredio = await tx.predio.create({
          data: {
            nombre: dto.nombrePredio!,
            codigo: `PRD-${Date.now().toString().slice(-6)}`,
            municipio,
            departamento,
            propietarioId: dto.propietarioId!,
          }
        });

        const nuevo = await tx.usuario.create({
          data: {
            nombre: dto.nombre,
            email: dto.email,
            passwordHash,
            rol: dto.rol,
            propietarioId: dto.propietarioId,
            prediosAsignados: {
              connect: [{ id: nuevoPredio.id }]
            }
          }
        });
        
        const { passwordHash: _ph, ...safe } = nuevo as any;
        return safe;
      });

      return userSafe;
    }

    const data: Prisma.UsuarioCreateInput = {
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
    };

    if (dto.propietarioId) {
      data.propietario = { connect: { id: dto.propietarioId } };
    }

    if (dto.predioId && typeof dto.predioId === 'number') {
      data.prediosAsignados = { connect: [{ id: dto.predioId }] };
    }

    const nuevo = await prisma.usuario.create({ data });
    const { passwordHash: _ph, ...userSafe } = nuevo as any;
    return userSafe;
  }

  async getUsuariosByPropietario(propietarioId: number | null): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>[]> {
    return this.repo.findAllUsuariosByPropietario(propietarioId);
  }

  async getUsuariosPendientes(propietarioId: number | null): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>[]> {
    return this.repo.findUsuariosPendientes(propietarioId);
  }

  async updateUsuario(id: number, dto: UpdateUsuarioDto): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>> {
    const u = await this.repo.findUsuarioById(id);
    if (!u) throw new NotFoundError('USUARIO_NOT_FOUND', 'Usuario no encontrado.');

    if (dto.email && dto.email !== u.email) {
      const existeEmail = await this.repo.findUsuarioByEmail(dto.email);
      if (existeEmail) throw new ConflictError('USUARIO_DUPLICADO', 'El correo ya está en uso.');
    }

    const updateData: Prisma.UsuarioUncheckedUpdateInput = {
      nombre: dto.nombre,
      email: dto.email,
      rol: dto.rol,
      propietarioId: dto.propietarioId,
    };

    const actualizado = await this.repo.updateUsuario(id, updateData);
    const { passwordHash: _ph, ...userSafe } = actualizado as any;
    return userSafe;
  }

  async toggleUsuarioStatus(id: number): Promise<void> {
    const u = await this.repo.findUsuarioById(id);
    if (!u) throw new NotFoundError('USUARIO_NOT_FOUND', 'Usuario no encontrado.');

    const isActivo = u.estado === 'ACTIVO';
    const nuevoEstado = isActivo ? 'INACTIVO' : 'ACTIVO';

    await this.repo.updateUsuario(id, { activo: !isActivo, estado: nuevoEstado });
    
    if (isActivo) {
      // Invalida la sesión actual del usuario al suspenderlo
      await prisma.sesionUsuario.deleteMany({ where: { usuarioId: id } });
    }
  }

  async aprobarUsuario(id: number, adminId: number): Promise<void> {
    const u: any = await this.repo.findUsuarioById(id);
    if (!u) throw new NotFoundError('USUARIO_NOT_FOUND', 'Usuario no encontrado.');

    const updateData: any = { activo: true, estado: 'ACTIVO' };
    
    if (u.fincaSolicitadaId) {
      updateData.prediosAsignados = { connect: [{ id: u.fincaSolicitadaId }] };
      updateData.fincaSolicitadaId = null;
    }

    await this.repo.updateUsuario(id, updateData);
    
    // Log
    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'APROBACION_USUARIO',
        entidad: 'Usuario',
        entidadId: id,
        datos: JSON.stringify({ usuarioAprobadoId: id }),
      }
    });
  }

  async rechazarUsuario(id: number, adminId: number): Promise<void> {
    const u: any = await this.repo.findUsuarioById(id);
    if (!u) throw new NotFoundError('USUARIO_NOT_FOUND', 'Usuario no encontrado.');

    const updateData: any = { activo: false, estado: 'RECHAZADO' };
    if (u.fincaSolicitadaId) {
      updateData.fincaSolicitada = { disconnect: true };
    }

    await this.repo.updateUsuario(id, updateData);
    // await this.repo.softDeleteUsuario(id);
    
    // Log
    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'RECHAZO_USUARIO',
        entidad: 'Usuario',
        entidadId: id,
        datos: JSON.stringify({ usuarioRechazadoId: id }),
      }
    });
  }

  async deleteUsuario(id: number, adminId: number): Promise<void> {
    const u = await this.repo.findUsuarioById(id);
    if (!u) throw new NotFoundError('USUARIO_NOT_FOUND', 'Usuario no encontrado.');

    await this.repo.softDeleteUsuario(id);
    
    // Log
    await prisma.auditLog.create({
      data: {
        usuarioId: adminId,
        accion: 'ELIMINACION_USUARIO',
        entidad: 'Usuario',
        entidadId: id,
        datos: JSON.stringify({ usuarioEliminadoId: id, email: u.email }),
      }
    });
  }
}

export const adminService = new AdminService(adminRepository);
