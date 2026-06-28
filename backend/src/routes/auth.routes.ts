/**
 * @file backend/src/routes/auth.routes.ts
 * @description Rutas de Autenticación.
 */

import { Router } from 'express';
import { login, logout, refresh, getMe, register } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const authRouter = Router();

// Rutas Públicas
authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.post('/refresh', refresh);

// Rutas Privadas (Requieren token de acceso válido)
authRouter.post('/logout', authMiddleware, logout);
authRouter.get('/me', authMiddleware, getMe);

export default authRouter;
