import { Request, Response, NextFunction } from 'express';
import { syncService } from '../services/sync.service';
import { syncBatchSchema } from '../validators/sync.validator';

export class SyncController {
  async syncBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = syncBatchSchema.parse(req.body);
      const userId = req.user!.sub;
      const ip = req.ip;

      const result = await syncService.processBatch(dto, userId, ip);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const syncController = new SyncController();
