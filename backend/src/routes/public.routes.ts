/**
 * @file backend/src/routes/public.routes.ts
 * @description Rutas de acceso público.
 */

import { Router } from 'express';
import { getPublicPredios } from '../controllers/public.controller';

const publicRouter = Router();

publicRouter.get('/predios', getPublicPredios);

export default publicRouter;
