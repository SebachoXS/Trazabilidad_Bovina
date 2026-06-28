import type { SyncBatchDto } from '../validators/sync.validator';
import { animalService } from './animal.service';
import { healthService } from './health.service';
import { pesajeService } from './pesaje.service';
import { reproduccionService } from './reproduccion.service';
import { movimientoService } from './movimiento.service';

export class SyncService {
  /**
   * Procesa un lote (batch) de registros creados de manera offline.
   * Utiliza las capas de servicio existentes para asegurar que todas
   * las Reglas de Negocio Críticas (RN-002, RN-003, etc.) se respeten.
   * Resuelve dinámicamente los UUIDs locales.
   */
  async processBatch(batch: SyncBatchDto, userId: number, ip?: string): Promise<any> {
    const idMap = new Map<string, number>();
    const resultados = {
      animales: [] as any[],
      eventos: [] as any[],
      pesajes: [] as any[],
      reproduccion: [] as any[],
      movimientos: [] as any[]
    };

    // PROCESAMIENTO SECUENCIAL (Para evitar bloqueos de base de datos)
    // Se procesa en orden lógico: Animales -> Pesajes -> Salud -> Reproduccion -> Movimientos

    if (batch.animales) {
      for (const req of batch.animales) {
        try {
          const animal = await animalService.create(req.payload, userId, ip, 'OPERARIO');
          idMap.set(req.id, animal.id);
          resultados.animales.push({ localId: req.id, remoteId: animal.id, status: 'success' });
        } catch (error: any) {
          resultados.animales.push({ localId: req.id, status: 'error', error: error.message });
        }
      }
    }

    if (batch.pesajes) {
      for (const req of batch.pesajes) {
        try {
          const animalId = typeof req.animalId === 'string' ? idMap.get(req.animalId) : req.animalId;
          if (!animalId) throw new Error('Referencia a animal no resuelta');

          const payload = { ...req.payload, animalId };
          const pesaje = await pesajeService.create(payload, userId, ip);
          resultados.pesajes.push({ localId: req.id, remoteId: pesaje.id, status: 'success' });
        } catch (error: any) {
          resultados.pesajes.push({ localId: req.id, status: 'error', error: error.message });
        }
      }
    }

    if (batch.eventos) {
      for (const req of batch.eventos) {
        try {
          const animalId = typeof req.animalId === 'string' ? idMap.get(req.animalId) : req.animalId;
          if (!animalId) throw new Error('Referencia a animal no resuelta');

          const evento = await healthService.create(animalId as number, req.payload as any, userId, ip);
          resultados.eventos.push({ localId: req.id, remoteId: evento.id, status: 'success' });
        } catch (error: any) {
          resultados.eventos.push({ localId: req.id, status: 'error', error: error.message });
        }
      }
    }

    if (batch.reproduccion) {
      for (const req of batch.reproduccion) {
        try {
          const animalId = typeof req.animalId === 'string' ? idMap.get(req.animalId) : req.animalId;
          if (!animalId) throw new Error('Referencia a animal no resuelta');

          const repro = await reproduccionService.createEvento(animalId as number, req.payload as any, userId, ip);
          resultados.reproduccion.push({ localId: req.id, remoteId: repro.id, status: 'success' });
        } catch (error: any) {
          resultados.reproduccion.push({ localId: req.id, status: 'error', error: error.message });
        }
      }
    }

    if (batch.movimientos) {
      for (const req of batch.movimientos) {
        try {
          const animalId = typeof req.animalId === 'string' ? idMap.get(req.animalId) : req.animalId;
          if (!animalId) throw new Error('Referencia a animal no resuelta');

          const dto = { ...req.payload, animalId };
          const mov = await movimientoService.create(dto, userId, ip);
          resultados.movimientos.push({ localId: req.id, remoteId: mov.id, status: 'success' });
        } catch (error: any) {
          resultados.movimientos.push({ localId: req.id, status: 'error', error: error.message });
        }
      }
    }

    return { success: true, processed: resultados };
  }
}

export const syncService = new SyncService();
