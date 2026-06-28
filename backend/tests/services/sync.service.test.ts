import { syncService } from '../../src/services/sync.service';
import { animalService } from '../../src/services/animal.service';
import { pesajeService } from '../../src/services/pesaje.service';
import type { SyncBatchDto } from '../../src/validators/sync.validator';

jest.mock('../../src/services/animal.service');
jest.mock('../../src/services/pesaje.service');

describe('SyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe procesar un lote offline y resolver referencias UUID temporales', async () => {
    const mockAnimalCreate = animalService.create as jest.Mock;
    const mockPesajeCreate = pesajeService.create as jest.Mock;

    mockAnimalCreate.mockResolvedValue({ id: 100, codigoVisual: '1234567890' });
    mockPesajeCreate.mockResolvedValue({ id: 200, animalId: 100, peso: 200 });

    const batch: SyncBatchDto = {
      animales: [
        {
          id: 'uuid-temporal-1',
          payload: {
            codigoVisual: '1234567890',
            raza: 'CHAROLAIS',
            sexo: 'MACHO',
            predioId: 1,
            fechaNacimiento: new Date('2023-01-01'),
            esToroCatalogo: false,
            isGestante: false,
            registrarIngreso: false,
          },
        },
      ],
      pesajes: [
        {
          id: 'uuid-temporal-pesaje-1',
          animalId: 'uuid-temporal-1', // Referencia al ID temporal
          payload: {
            animalId: 1, // el validador exige un animalId (aunque sea falso, luego se reemplaza)
            peso: 250,
            fecha: new Date('2023-05-01'),
          },
        },
      ],
    };

    const response = await syncService.processBatch(batch, 1, '127.0.0.1');

    expect(response.success).toBe(true);
    expect(mockAnimalCreate).toHaveBeenCalledTimes(1);
    
    // Lo más crítico: asegurar que el servicio de pesajes fue llamado con el ID resuelto (100) y no el uuid-temporal
    expect(mockPesajeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ animalId: 100, peso: 250 }),
      1,
      '127.0.0.1'
    );
  });
});
