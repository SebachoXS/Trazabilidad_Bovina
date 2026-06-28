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
  async createPredio(data: Prisma.PredioUncheckedCreateInput): Promise<Predio> {
    return prisma.predio.create({ data });
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

  async findAllPredios(): Promise<Predio[]> {
    return prisma.predio.findMany({
      where: { deletedAt: null },
      include: { propietario: true },
    });
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
      // 1. Soft-delete del predio
      await tx.predio.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      // 2. Cascada de seguridad (RN-012)
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
      ...(propietarioId ? { propietarioId } : {})
    };
    return prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true, nombre: true, email: true, rol: true,
        propietarioId: true, activo: true, createdAt: true, updatedAt: true, deletedAt: true
      },
    });
  }

  async findUsuariosPendientes(propietarioId: number | null): Promise<Omit<Usuario, 'passwordHash' | 'refreshToken'>[]> {
    const whereClause: Prisma.UsuarioWhereInput = {
      activo: false,
      deletedAt: null,
      ...(propietarioId ? { propietarioId } : {})
    };

    return prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true, nombre: true, email: true, rol: true,
        propietarioId: true, activo: true, createdAt: true, updatedAt: true, deletedAt: true
      },
    });
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
