/**
 * @file backend/src/repositories/auth.repository.ts
 * @description Repositorio de Autenticación. Maneja búsquedas de usuarios por email para el login
 * y la persistencia de refresh tokens.
 */

import prisma from '../config/database';
import type { Usuario, Predio, Propietario } from '@prisma/client';

export type UsuarioAutorizado = Usuario & { 
  prediosAsignados: Predio[];
  propietario: Propietario | null;
  sesiones?: any[];
};

export interface IAuthRepository {
  findByEmail(email: string): Promise<UsuarioAutorizado | null>;
  updateRefreshToken(userId: number, tokenHash: string | null): Promise<void>;
  findById(userId: number): Promise<UsuarioAutorizado | null>;
}

export class AuthRepository implements IAuthRepository {
  /**
   * Busca un usuario por email, incluyendo los predios asignados y propietario.
   * Excluye usuarios inactivos o eliminados.
   */
  async findByEmail(email: string): Promise<UsuarioAutorizado | null> {
    const user = await prisma.usuario.findUnique({
      where: { email },
      include: { prediosAsignados: true, propietario: true },
    });

    if (!user || !user.activo) {
      return null;
    }

    return user;
  }

  /**
   * Busca un usuario por ID.
   */
  async findById(userId: number): Promise<UsuarioAutorizado | null> {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: { 
        prediosAsignados: true, 
        propietario: true,
        sesiones: { orderBy: { createdAt: 'desc' }, take: 1 } 
      },
    });

    if (!user || !user.activo) {
      return null;
    }

    return user;
  }

  /**
   * Actualiza el hash del refresh token en la BD.
   * Se pasa `null` para invalidarlo (Logout).
   */
  async updateRefreshToken(userId: number, tokenHash: string | null): Promise<void> {
    if (tokenHash) {
      await prisma.sesionUsuario.deleteMany({ where: { usuarioId: userId } });
      await prisma.sesionUsuario.create({
        data: {
          usuarioId: userId,
          refreshToken: tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        },
      });
    } else {
      await prisma.sesionUsuario.deleteMany({ where: { usuarioId: userId } });
    }
  }
}

export const authRepository = new AuthRepository();
