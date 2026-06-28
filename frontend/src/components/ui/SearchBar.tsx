/**
 * @file frontend/src/components/ui/SearchBar.tsx
 * @description Componente de búsqueda predictiva por arete (código visual).
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { useSearchAnimalByCode } from '../../features/animals/hooks/useSearchAnimalByCode';
import { animalsService } from '../../features/animals/api/animals.service';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLFormElement>(null);
  
  const { searchAnimal, isSearching } = useSearchAnimalByCode();
  const navigate = useNavigate();

  // Debounce para la búsqueda predictiva
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch de sugerencias (Predictivo)
  const { data: suggestionsData, isFetching: isLoadingSuggestions } = useQuery({
    queryKey: ['animales', 'search', debouncedQuery],
    queryFn: () => animalsService.getAnimales(1, 5, { search: debouncedQuery }),
    enabled: debouncedQuery.length >= 3 && debouncedQuery.length < 10,
  });

  const suggestions = suggestionsData?.data || [];

  const executeSearch = async (queryToSearch: string) => {
    const trimmedQuery = queryToSearch.trim();
    if (!trimmedQuery) return;

    if (!/^\d{10}$/.test(trimmedQuery)) {
      toast.error('El código visual debe tener exactamente 10 dígitos.');
      return;
    }

    try {
      setIsOpen(false);
      const animal = await searchAnimal(trimmedQuery);
      setQuery('');
      navigate(`/animales/${animal.id}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error(`No se encontró un animal con el arete ${trimmedQuery}`);
      } else {
        toast.error('Error al buscar el animal. Intente de nuevo.');
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    
    // Auto submit si exactos 10 dígitos
    if (/^\d{10}$/.test(val.trim())) {
      executeSearch(val);
    }
  };

  const handleSelectSuggestion = (id: number) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/animales/${id}`);
  };

  return (
    <form ref={wrapperRef} onSubmit={handleSearch} className="relative flex-1 max-w-md w-full">
      <div className="relative flex items-center w-full h-10 rounded-brand focus-within:shadow-lg input-glass overflow-hidden transition-all z-20">
        <div className="grid place-items-center h-full w-12 text-[var(--text-muted)]">
          <Search className="h-5 w-5" />
        </div>
        <input
          className="peer h-full w-full outline-none text-sm text-gray-900 pr-2 bg-transparent placeholder:text-gray-400"
          type="text"
          id="search"
          placeholder="Buscar por arete (10 dígitos)..."
          value={query}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          disabled={isSearching}
          autoComplete="off"
        /> 
        {(isSearching || isLoadingSuggestions) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown predictivo */}
      {isOpen && debouncedQuery.length >= 3 && debouncedQuery.length < 10 && (
        <div className="absolute top-full left-0 right-0 mt-1 glass-panel rounded-brand shadow-lg overflow-hidden z-50">
          {suggestions.length > 0 ? (
            <ul className="max-h-60 overflow-y-auto">
              {suggestions.map((animal) => (
                <li 
                  key={animal.id} 
                  onClick={() => handleSelectSuggestion(animal.id)}
                  className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0 transition-colors text-gray-900"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-gray-900">{animal.codigoVisual}</span>
                    {animal.nombre && (
                      <span className="text-xs text-gray-500">{animal.nombre}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !isLoadingSuggestions && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No se encontraron sugerencias
              </div>
            )
          )}
        </div>
      )}
    </form>
  );
}
