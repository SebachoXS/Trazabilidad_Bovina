/**
 * @file backend/src/repositories/admin.repository.ts
 * @description Repositorio central para Propietarios, Predios y Usuarios (Módulo Administrativo).
 */

import prisma from '../config/database';
import type { Prisma, Propietario, Predio, Usuario } from '@prisma/client';

export class AdminRepository {
  // ── PROPIETARIOS ───────────────────────────────────────────────────────────────
  async createPropietario(data: Prisma.PropietarioCreateInput): Promise<Propietario> {
    return prisma.propietario.create({ data });
  }

  async findPropietarioById(id: number): Promise<Propietario | null> {
    return prisma.propietario.findFirst({
      where: { id, deletedAt: null },
      include: { predios: { where: { deletedAt: null } } },
    });
  }

  async findPropietarioByDocumento(documento: string): Promise<Propietario | null> {
    return prisma.propietario.findFirst({
      where: { documento, deletedAt: null },
    });
  }

  async findAllPropietarios(): Promise<Propietario[]> {
    return prisma.propietario.findMany({
      where: { deletedAt: null },
    });
  }

  async updatePropietario(id: number, data: Prisma.PropietarioUpdateInput): Promise<Propietario> {
    return prisma.propietario.update({ where: { id }, data });
  }

  async softDeletePropietario(id: number): Promise<void> {
    await prisma.propietario.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── PREDIOS ───────────────────────────────────────────────────────────────────
  async createPredio(data: Prisma.PredioUncheckedCreateInput | any): Promise<Predio> {
    // Sanitización estricta: eliminamos campos espurios del frontend que no existen en el esquema
    const { provincia, canton, ...validData } = data;
    
    // Aseguramos el mapeo de nombres si el frontend u otro servicio omitió la traducción
    if (provincia && !validData.departamento) validData.departamento = provincia;
    if (canton && !validData.municipio) validData.municipio = canton;

    return prisma.predio.create({ data: validData });
  }

  async findPredioById(id: number): Promise<Predio | null> {
    return prisma.predio.findFirst({
      where: { id, deletedAt: null },
      include: { propietario: true },
    });
  }

  async findPredioByCodigo(codigo: string): Promise<Predio | null> {
    return prisma.predio.findFirst({
      where: { codigo, deletedAt: null },
    });
  }

  async findAllPredios(estado: string = 'ACTIVO'): Promise<Predio[]> {
    try {
      if (estado === 'TODOS') {
        return await prisma.predio.findMany({ 
          include: { 
            propietario: {
              include: { usuarios: { where: { rol: 'PROPIETARIO' }, take: 1 } }
            } 
          } 
        });
      }

      const estadoFiltro = estado === 'ACTIVO' 
        ? { NOT: { estado: 'RECHAZADO' }, OR: [{ estado: 'ACTIVO' }] } 
        : { estado };

      return await prisma.predio.findMany({
        where: { ...estadoFiltro, deletedAt: null },
        include: { 
          propietario: {
            include: { usuarios: { where: { rol: 'PROPIETARIO' }, take: 1 } }
          } 
        },
      });
    } catch (error: any) {
      // Fallback si la columna estado no existe aún en la base de datos SQLite actual
      if (estado === 'ACTIVO') {
        return await prisma.predio.findMany({
          where: { deletedAt: null },
          include: { propietario: true },
        });
      }
      return [];
    }
  }

  async findPrediosPendientes(): Promise<Predio[]> {
    try {
      return await prisma.predio.findMany({
        where: { estado: 'PENDIENTE', deletedAt: null },
        include: { propietario: true },
      });
    } catch (error) {
      return []; // Si no existe la columna estado, no puede haber predios pendientes
    }
  }

  async countAnimalesEnPredio(predioId: number): Promise<number> {
    return prisma.animal.count({
      where: { predioId, deletedAt: null, estado: { not: 'PENDIENTE_APROBACION' } },
    });
  }

  async updatePredio(id: number, data: Prisma.PredioUpdateInput): Promise<Predio> {
    return prisma.predio.update({ where: { id }, data });
  }

  async softDeletePredio(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Hard-delete del predio y sus secuencias asociadas
      await tx.secuenciaPredio.deleteMany({ where: { predioId: id } });
      await tx.predio.delete({
        where: { id }
      });
      // 2. Cascada de seguridad (RN-012) - desactiva usuarios que perdieron su predio
      await tx.usuario.updateMany({
        where: { prediosAsignados: { some: { id } } },
        data: { activo: false },
      });
    });
  }

  // ── USUARIOS ──────────────────────────────────────────────────────────────────
  async createUsuario(data: Prisma.UsuarioUncheckedCreateInput): Promise<Usuario> {
    return prisma.usuario.create({ data });
  }

  async findUsuarioByEmail(email: string): Promise<Usuario | null> {
    return prisma.usuario.findFirst({
      where: { email, deletedAt: null },
    });
  }
  async findUsuarioById(id: number): Promise<Usuario | null> {
    return prisma.usuario.findFirst({ where: { id, deletedAt: null } });
  }

  async findAllUsuariosByPropietario(propietarioId: number | null): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>[]> {
    const whereClause: Prisma.UsuarioWhereInput = {
      deletedAt: null,
      ...(propietarioId ? {
        OR: [
          { propietarioId: propietarioId },
          { prediosAsignados: { some: { propietarioId: propietarioId } } }
        ]
      } : {})
    };
    return prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true, nombre: true, email: true, rol: true,
        propietarioId: true, activo: true, estado: true,
        prediosAsignados: { select: { id: true, nombre: true } },
        createdAt: true, updatedAt: true, deletedAt: true
      },
    }) as any;
  }

  async findUsuariosPendientes(propietarioId: number | null): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>[]> {
    const whereClause: Prisma.UsuarioWhereInput = {
      deletedAt: null,
      OR: [
        { estado: 'PENDIENTE', ...(propietarioId ? { propietarioId } : {}) },
        { fincaSolicitada: propietarioId ? { propietarioId } : { isNot: null } }
      ]
    };

    return prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true, nombre: true, email: true, rol: true,
        propietarioId: true, activo: true, estado: true,
        fincaSolicitadaId: true,
        fincaSolicitada: { select: { id: true, nombre: true } },
        prediosAsignados: { select: { id: true, nombre: true } },
        createdAt: true, updatedAt: true, deletedAt: true
      },
    }) as any;
  }

  async updateUsuario(id: number, data: Prisma.UsuarioUncheckedUpdateInput): Promise<Usuario> {
    return prisma.usuario.update({ where: { id }, data });
  }

  async softDeleteUsuario(id: number): Promise<void> {
    await prisma.usuario.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const adminRepository = new AdminRepository();
