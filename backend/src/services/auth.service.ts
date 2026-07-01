/**
 * @file backend/src/services/auth.service.ts
 * @description Servicio de Autenticación. Implementa validación de contraseñas,
 * generación de JWTs y gestión de la sesión.
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authRepository } from '../repositories/auth.repository';
import type { IAuthRepository } from '../repositories/auth.repository';
import { UnauthorizedError, NotFoundError } from '../types/errors';
import type { LoginDto } from '../validators/auth.validator';
import type { AuthPayload, Rol } from '../types/index';

export interface LoginResult {
  accessToken: string;
  refreshToken: string; // El controlador lo pondrá en una cookie httpOnly
  expiresIn: number;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    propietarioId: number | null;
    prediosAsignados: number[];
  };
}

export class AuthService {
  constructor(private readonly repo: IAuthRepository) {}

  /**
   * Autentica un usuario y genera un par de tokens (Access y Refresh).
   */
  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.repo.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Credenciales inválidas.');
    }

    if ((user as any).estado === 'PENDIENTE') {
      throw new UnauthorizedError('Tu cuenta está en revisión por el Administrador.');
    }
    if ((user as any).estado === 'RECHAZADO') {
      throw new UnauthorizedError('Cuenta rechazada.');
    }

    const combinedPredios = [
      ...(user.prediosAsignados || []).map((p: any) => p.id),
      ...(user.fincasVeterinario || []).map((p: any) => p.id)
    ];

    // Payload del JWT
    const payload: AuthPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol as Rol,
      propietarioId: user.propietarioId,
      prediosAsignados: combinedPredios,
    };

    const accessTokenSecret = process.env['JWT_SECRET'] ?? 'fallback_secret';
    const refreshTokenSecret = process.env['REFRESH_TOKEN_SECRET'] ?? 'fallback_refresh_secret';

    const accessToken = jwt.sign(payload, accessTokenSecret, { expiresIn: '8h' });
    const refreshToken = jwt.sign({ id: user.id }, refreshTokenSecret, { expiresIn: '7d' });

    // Hashear y guardar el refresh token (sobreescribe el anterior)
    const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, saltRounds);
    
    await this.repo.updateRefreshToken(user.id, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
      expiresIn: 8 * 60 * 60, // 8 horas en segundos
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        propietarioId: user.propietarioId,
        prediosAsignados: combinedPredios,
      },
    };
  }

  /**
   * Invalida la sesión actual eliminando el refresh token de la BD.
   */
  async logout(userId: number): Promise<void> {
    await this.repo.updateRefreshToken(userId, null);
  }

  /**
   * Refresca un Access Token usando un Refresh Token válido.
   */
  async refresh(token: string): Promise<{ accessToken: string; expiresIn: number }> {
    const refreshTokenSecret = process.env['REFRESH_TOKEN_SECRET'] ?? 'fallback_refresh_secret';

    try {
      const decoded = jwt.verify(token, refreshTokenSecret) as { id: number };
      const user = await this.repo.findById(decoded.id);

      const refreshTokenRecord = (user as any).sesiones?.[0];
      if (!user || !refreshTokenRecord) {
        throw new UnauthorizedError('Sesión inválida o expirada.');
      }

      // Validar que el token coincida con el hash almacenado
      const isValid = await bcrypt.compare(token, refreshTokenRecord.refreshToken);
      if (!isValid) {
        throw new UnauthorizedError('Sesión inválida o expirada.');
      }

      const combinedPredios = [
        ...(user.prediosAsignados || []).map((p: any) => p.id),
        ...(user.fincasVeterinario || []).map((p: any) => p.id)
      ];

      const payload: AuthPayload = {
        sub: user.id,
        email: user.email,
        rol: user.rol as Rol,
        propietarioId: user.propietarioId,
        prediosAsignados: combinedPredios,
      };

      const accessTokenSecret = process.env['JWT_SECRET'] ?? 'fallback_secret';
      const accessToken = jwt.sign(payload, accessTokenSecret, { expiresIn: '8h' });

      return {
        accessToken,
        expiresIn: 8 * 60 * 60,
      };
    } catch {
      throw new UnauthorizedError('Token de actualización inválido o expirado.');
    }
  }

  /**
   * Obtiene la información básica del usuario autenticado ("Me").
   */
  async getMe(userId: number) {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', 'Usuario no encontrado.');
    }

    return {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      propietarioId: user.propietarioId,
      prediosAsignados: user.prediosAsignados.map((p: any) => p.id),
    };
  }
}

export const authService = new AuthService(authRepository);
