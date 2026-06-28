import { z } from 'zod';
import { animalCreateSchema } from './animal.validator';
import { eventoSanitarioCreateSchema } from './health.validator';
import { pesajeCreateSchema } from './pesaje.validator';
import { eventoReproductivoCreateSchema as createEventoReproductivoSchema } from './reproduccion.validator';
import { movimientoCreateSchema } from './movimiento.validator';

const animalSyncSchema = z.object({
  id: z.string(), // local UUID
  payload: animalCreateSchema,
});

const eventoSyncSchema = z.object({
  id: z.string(),
  animalId: z.union([z.string(), z.number()]), // Puede referenciar UUID local o ID real
  payload: eventoSanitarioCreateSchema,
});

const pesajeSyncSchema = z.object({
  id: z.string(),
  animalId: z.union([z.string(), z.number()]),
  payload: pesajeCreateSchema,
});

const reproSyncSchema = z.object({
  id: z.string(),
  animalId: z.union([z.string(), z.number()]),
  payload: createEventoReproductivoSchema,
});

const movimientoSyncSchema = z.object({
  id: z.string(),
  animalId: z.union([z.string(), z.number()]),
  payload: movimientoCreateSchema,
});

export const syncBatchSchema = z.object({
  animales: z.array(animalSyncSchema).optional(),
  eventos: z.array(eventoSyncSchema).optional(),
  pesajes: z.array(pesajeSyncSchema).optional(),
  reproduccion: z.array(reproSyncSchema).optional(),
  movimientos: z.array(movimientoSyncSchema).optional(),
});

export type SyncBatchDto = z.infer<typeof syncBatchSchema>;
