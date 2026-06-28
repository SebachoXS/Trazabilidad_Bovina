/**
 * @file backend/src/app.ts
 * @description Instancia principal de Express con todos los middlewares y rutas registradas.
 * CONSTITUTION §3.2: Estructura de directorios — app.ts.
 */

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes/index';
import { errorMiddleware } from './middlewares/error.middleware';
import { startRetiroJob } from './jobs/retiro.job';
import { initBackupJob } from './jobs/backup.job';

const app = express();

// ── Seguridad (CONSTITUTION §6.4) ─────────────────────────────────────────────
app.use(helmet());

app.use(
  cors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  })
);

// Rate limiting en autenticación (CONSTITUTION §6.4)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes. Intente en 15 minutos.' },
  },
});
app.use('/api/v1/auth', authLimiter);

// ── Parsers ────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Rutas de la API ────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter);

// ── Health check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Manejo de errores centralizado (siempre al final) ─────────────────────────
app.use(errorMiddleware);

// ── Cron Jobs ─────────────────────────────────────────────────────────────────
if (process.env['NODE_ENV'] !== 'test') {
  startRetiroJob();
  initBackupJob();
}

// ── Test DB Connection ───────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.info('✅ Conexión a SQLite verificada correctamente.'))
  .catch(err => {
    console.error('❌ Error crítico: La base de datos SQLite está inaccesible, corrupta o bloqueada.', err);
    process.exit(1);
  });

// ── Arranque del servidor ─────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

app.listen(PORT, () => {
  console.info(`🐄 Sistema de Trazabilidad Bovina — Backend corriendo en http://localhost:${PORT}`);
  console.info(`   Entorno: ${process.env['NODE_ENV'] ?? 'development'}`);
  console.info(`   API:     http://localhost:${PORT}/api/v1`);
});

export default app;
