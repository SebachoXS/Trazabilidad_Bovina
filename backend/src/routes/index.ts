/**
 * @file backend/src/routes/index.ts
 * @description Router raíz que agrega todos los módulos de la API v1.
 * CONSTITUTION §3.2: Estructura de directorios — routes/index.ts.
 */

import { Router } from 'express';
import healthRouter from './health.routes';
import authRouter from './auth.routes';
import animalRouter from './animal.routes';
import { propietarioRouter, predioRouter, usuarioRouter } from './admin.routes';
import publicRouter from './public.routes';
import { pesajeRouter } from './pesaje.routes';
import { reproduccionRouter } from './reproduccion.routes';
import { movimientoRouter } from './movimiento.routes';
import { reporteRouter } from './reporte.routes';
import { syncRouter } from './sync.routes';

const router = Router();

// ── Módulo 2: Historial Clínico y Control Sanitario ──
router.use('/', healthRouter);

// ── Módulo 1: Identificación y Registro Base ──
// Rutas públicas
router.use('/public', publicRouter);

// Resto de rutas (protegidas en su mayoría o manejan su propia auth)
router.use('/auth', authRouter);
router.use('/animales', animalRouter);
router.use('/propietarios', propietarioRouter);
router.use('/predios', predioRouter);
router.use('/usuarios', usuarioRouter);

// ── Módulo 3: Productividad, Reproducción y Movimiento ──
router.use('/pesajes', pesajeRouter);
router.use('/reproduccion', reproduccionRouter);
router.use('/movimientos', movimientoRouter);

// ── Módulo 4: Consulta e Informes ──
router.use('/reportes', reporteRouter);

// ── Sincronización Offline ──
router.use('/sync', syncRouter);

// ── Futuros módulos (se irán registrando aquí) ──
// router.use('/', movimientoRouter);
// router.use('/', movimientoRouter);
// router.use('/', reporteRouter);

export default router;
