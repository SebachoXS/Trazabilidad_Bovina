import { Router } from 'express';
import { syncController } from '../controllers/sync.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const syncRouter = Router();

syncRouter.post('/', authMiddleware, syncController.syncBatch.bind(syncController));
