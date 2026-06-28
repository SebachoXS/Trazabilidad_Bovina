/**
 * @file backend/src/controllers/auth.controller.ts
 * @description Controlador de Autenticación.
 */

import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { loginSchema } from '../validators/auth.validator';
import { createUsuarioSchema } from '../validators/admin.validator';
import { ValidationError } from '../types/errors';
import prisma from '../config/database';
import bcrypt from 'bcrypt';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Datos de inicio de sesión inválidos', result.error);
    }

    const { accessToken, refreshToken, expiresIn, user } = await authService.login(result.data);

    // Inyectar el refresh token en una cookie httpOnly
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn,
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user.sub;
    await authService.logout(userId);

    res.clearCookie('refreshToken');

    res.json({
      success: true,
      message: 'Sesión cerrada correctamente.',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // El refresh token debe venir en las cookies (requiere cookie-parser en app.ts)
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No se encontró el token de actualización.' },
      });
      return;
    }

    const { accessToken, expiresIn } = await authService.refresh(token);

    res.json({
      success: true,
      data: {
        accessToken,
        expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user.sub;
    const user = await authService.getMe(userId);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = createUsuarioSchema.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError('Datos de registro inválidos', result.error);
    }

    const { email, password, nombre, rol, propietarioId, prediosAsignados } = result.data;

    const exists = await prisma.usuario.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ success: false, message: 'El correo ya está registrado.' });
      return;
    }

    const saltRounds = parseInt(process.env['BCRYPT_ROUNDS'] ?? '12', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash,
        rol,
        propietarioId,
        activo: false,
        ...(prediosAsignados && prediosAsignados.length > 0
          ? {
              prediosAsignados: {
                connect: prediosAsignados.map((id) => ({ id })),
              },
            }
          : {}),
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registro exitoso. Tu cuenta debe ser aprobada por el administrador.',
      data: { id: newUser.id, email: newUser.email }
    });
  } catch (error) {
    next(error);
  }
};
