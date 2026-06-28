import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TrazabilidadDB extends DBSchema {
  animalesCache: {
    key: string;
    value: {
      id: string; // Puede ser string (UUID local) o número (ID real)
      codigoVisual: string;
      nombre?: string;
      raza: string;
      sexo: 'MACHO' | 'HEMBRA';
      estado: string;
      isEnRetiro: boolean;
      fechaFinRetiro?: number;
      syncStatus: 'synced' | 'pending';
      payload?: any;
    };
  };
  eventosSyncQueue: {
    key: string;
    value: {
      id: string; // UUID temporal
      animalId: string | number; // Referencia
      tipo: string;
      fecha: string;
      payload: any;
      createdAt: number;
    };
  };
  pesajesSyncQueue: {
    key: string;
    value: {
      id: string; // UUID temporal
      animalId: string | number; // Referencia
      peso: number;
      fecha: string;
      payload: any;
      createdAt: number;
    };
  };
}

class IndexedDBService {
  private dbPromise: Promise<IDBPDatabase<TrazabilidadDB>>;

  constructor() {
    this.dbPromise = openDB<TrazabilidadDB>('trazabilidad-db', 1, {
      upgrade(db) {
        db.createObjectStore('animalesCache', { keyPath: 'id' });
        db.createObjectStore('eventosSyncQueue', { keyPath: 'id' });
        db.createObjectStore('pesajesSyncQueue', { keyPath: 'id' });
      },
    });
  }

  // --- ANIMALES CACHE ---
  async getAnimales(): Promise<TrazabilidadDB['animalesCache']['value'][]> {
    const db = await this.dbPromise;
    return db.getAll('animalesCache');
  }

  async getAnimal(id: string): Promise<TrazabilidadDB['animalesCache']['value'] | undefined> {
    const db = await this.dbPromise;
    return db.get('animalesCache', id);
  }

  async saveAnimal(animal: TrazabilidadDB['animalesCache']['value']): Promise<void> {
    const db = await this.dbPromise;
    await db.put('animalesCache', animal);
  }

  async saveAnimalesBatch(animales: TrazabilidadDB['animalesCache']['value'][]): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction('animalesCache', 'readwrite');
    animales.forEach(a => tx.store.put(a));
    await tx.done;
  }

  // --- SYNC QUEUES ---
  async addEventoToQueue(evento: TrazabilidadDB['eventosSyncQueue']['value']): Promise<void> {
    const db = await this.dbPromise;
    await db.put('eventosSyncQueue', evento);
  }

  async getEventosQueue(): Promise<TrazabilidadDB['eventosSyncQueue']['value'][]> {
    const db = await this.dbPromise;
    return db.getAll('eventosSyncQueue');
  }

  async clearEventosQueue(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('eventosSyncQueue');
  }

  async addPesajeToQueue(pesaje: TrazabilidadDB['pesajesSyncQueue']['value']): Promise<void> {
    const db = await this.dbPromise;
    await db.put('pesajesSyncQueue', pesaje);
  }

  async getPesajesQueue(): Promise<TrazabilidadDB['pesajesSyncQueue']['value'][]> {
    const db = await this.dbPromise;
    return db.getAll('pesajesSyncQueue');
  }

  async clearPesajesQueue(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('pesajesSyncQueue');
  }

  // Helper para generar UUIDs locales
  generateLocalUUID(): string {
    return 'local-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const dbService = new IndexedDBService();
