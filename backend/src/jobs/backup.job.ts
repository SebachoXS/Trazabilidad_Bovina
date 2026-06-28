import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipe = promisify(pipeline);

const DB_PATH = path.join(__dirname, '../../prisma/dev.db');
const BACKUP_DIR = path.join(__dirname, '../../backups');

export const backupDatabase = async () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_PATH)) {
      console.warn('⚠️ Base de datos SQLite no encontrada. Omitiendo backup.');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `dev-${timestamp}.db.gz`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    const source = fs.createReadStream(DB_PATH);
    const gzip = zlib.createGzip();
    const destination = fs.createWriteStream(backupFilePath);

    await pipe(source, gzip, destination);

    console.log(`✅ Backup generado exitosamente: ${backupFilePath}`);
  } catch (error) {
    console.error('❌ Error generando backup de la base de datos:', error);
  }
};

// Se ejecuta todos los días a las 03:00 AM
export const initBackupJob = () => {
  console.log('🕒 Inicializando Cron Job de Backup (03:00 AM)...');
  cron.schedule('0 3 * * *', () => {
    console.log('🔄 Ejecutando backup programado de base de datos...');
    backupDatabase();
  });
};
