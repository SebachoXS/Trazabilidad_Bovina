/**
 * @file backend/src/controllers/public.controller.ts
 * @description Controlador público para recursos accesibles sin autenticación.
 */

import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export const getPublicPredios = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const predios = await prisma.predio.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        nombre: true
      },
      orderBy: { nombre: 'asc' }
    });
    
    res.json({ success: true, data: predios });
  } catch (err) {
    next(err);
  }
};
