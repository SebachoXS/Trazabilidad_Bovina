/**
 * @file backend/src/jobs/retiro.job.ts
 * @description Cron job de liberación automática de períodos de retiro vencidos.
 * Implementa la parte automática de RN-002 (SPEC.md §9).
 *
 * Ejecuta cada hora: busca animales EN_RETIRO cuyo período ya venció
 * y los cambia automáticamente a estado ACTIVO con registro en AuditLog.
 */

import cron from 'node-cron';
import { healthService } from '../services/health.service';

/**
 * Nombre del job para identificación en logs.
 */
const JOB_NAME = '[CronJob:RetiroVencido]';

/**
 * Función principal del cron job.
 * Llama al servicio de salud para liberar animales con retiro vencido.
 * No lanza errores al contexto del cron — los captura y loguea para no interrumpir el scheduler.
 */
async function ejecutarLiberacionRetiro(): Promise<void> {
  const inicio = new Date().toISOString();

  try {
    const resultado = await healthService.liberarAnimalesConRetiroVencido();

    if (resultado.animalesLiberados > 0) {
      console.info(
        `${JOB_NAME} [${inicio}] ✅ ${resultado.animalesLiberados} animal(es) liberado(s) de retiro. IDs: [${resultado.ids.join(', ')}]`
      );
    } else {
      console.debug(`${JOB_NAME} [${inicio}] Sin animales con retiro vencido.`);
    }
  } catch (error) {
    console.error(
      `${JOB_NAME} [${inicio}] ❌ Error al procesar retiros vencidos:`,
      error instanceof Error ? error.message : error
    );
  }
}

/**
 * Registra y arranca el cron job de liberación de retiro.
 * Debe llamarse una sola vez al iniciar la aplicación (en app.ts).
 *
 * Frecuencia: Cada hora en punto (cron: '0 * * * *').
 *
 * @example
 * // En app.ts:
 * import { startRetiroJob } from './jobs/retiro.job';
 * startRetiroJob();
 */
export function startRetiroJob(): void {
  cron.schedule(
    '0 * * * *',   // Cada hora en punto
    () => {
      void ejecutarLiberacionRetiro();
    },
    {
      scheduled: true,
      timezone: 'America/Bogota',   // Zona horaria Colombia (CONSTITUTION §1.1)
    }
  );

  console.info(`${JOB_NAME} ✅ Cron job registrado. Ejecuta cada hora (zona: America/Bogota).`);
}
