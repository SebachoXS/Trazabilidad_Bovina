/**
 * @file frontend/src/features/animals/hooks/useSearchAnimalByCode.ts
 * @description Hook para buscar un animal por su código visual (10 dígitos).
 */

import { useState } from 'react';
import { animalsService } from '../api/animals.service';

export const useSearchAnimalByCode = () => {
  const [isSearching, setIsSearching] = useState(false);

  const searchAnimal = async (codigoVisual: string) => {
    try {
      setIsSearching(true);
      const data = await animalsService.getHojaDeVidaByCodigo(codigoVisual);
      return data.data.animal;
    } catch (error) {
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  return { searchAnimal, isSearching };
};
