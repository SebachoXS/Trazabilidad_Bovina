import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, CheckSquare, Square } from 'lucide-react';

interface TransferListProps {
  availableAnimals: any[];
  selectedIds: Set<number>;
  onChange: (newSelectedIds: Set<number>) => void;
}

export const TransferList: React.FC<TransferListProps> = ({ availableAnimals, selectedIds, onChange }) => {
  const [leftSearch, setLeftSearch] = useState('');
  const [rightSearch, setRightSearch] = useState('');
  
  const [leftChecked, setLeftChecked] = useState<Set<number>>(new Set());
  const [rightChecked, setRightChecked] = useState<Set<number>>(new Set());

  // Derive available and selected lists based on selectedIds
  const leftList = useMemo(() => availableAnimals.filter(a => !selectedIds.has(a.id)), [availableAnimals, selectedIds]);
  const rightList = useMemo(() => availableAnimals.filter(a => selectedIds.has(a.id)), [availableAnimals, selectedIds]);

  // Apply search filters
  const filteredLeft = useMemo(() => leftList.filter(a => a.codigoVisual.toLowerCase().includes(leftSearch.toLowerCase()) || a.nombre?.toLowerCase().includes(leftSearch.toLowerCase())), [leftList, leftSearch]);
  const filteredRight = useMemo(() => rightList.filter(a => a.codigoVisual.toLowerCase().includes(rightSearch.toLowerCase()) || a.nombre?.toLowerCase().includes(rightSearch.toLowerCase())), [rightList, rightSearch]);

  const toggleLeftCheck = (id: number) => {
    const newChecked = new Set(leftChecked);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setLeftChecked(newChecked);
  };

  const toggleRightCheck = (id: number) => {
    const newChecked = new Set(rightChecked);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setRightChecked(newChecked);
  };

  const moveCheckedToRight = () => {
    const newSelected = new Set(selectedIds);
    leftChecked.forEach(id => newSelected.add(id));
    onChange(newSelected);
    setLeftChecked(new Set());
  };

  const moveCheckedToLeft = () => {
    const newSelected = new Set(selectedIds);
    rightChecked.forEach(id => newSelected.delete(id));
    onChange(newSelected);
    setRightChecked(new Set());
  };

  const moveAllToRight = () => {
    const newSelected = new Set(selectedIds);
    filteredLeft.forEach(a => newSelected.add(a.id));
    onChange(newSelected);
    setLeftChecked(new Set());
  };

  const moveAllToLeft = () => {
    const newSelected = new Set(selectedIds);
    filteredRight.forEach(a => newSelected.delete(a.id));
    onChange(newSelected);
    setRightChecked(new Set());
  };

  const renderList = (
    title: string,
    items: any[],
    checked: Set<number>,
    toggleCheck: (id: number) => void,
    searchValue: string,
    setSearchValue: (val: string) => void,
    emptyMessage: string
  ) => (
    <div className="flex-1 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
        <h3 className="font-bold text-gray-950 mb-2">{title} ({items.length})</h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-gray-950 bg-white"
            placeholder="Buscar arete o nombre..."
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(animal => (
              <div
                key={animal.id}
                onClick={() => toggleCheck(animal.id)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${checked.has(animal.id) ? 'bg-indigo-50 border-indigo-200' : 'border-transparent hover:bg-gray-100'}`}
              >
                {checked.has(animal.id) ? (
                  <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                ) : (
                  <Square className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <div>
                  <p className="font-mono font-bold text-gray-950 text-sm leading-tight">{animal.codigoVisual}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{animal.raza} • {animal.sexo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 items-stretch">
      {renderList(
        "Disponibles en Sitio",
        filteredLeft,
        leftChecked,
        toggleLeftCheck,
        leftSearch,
        setLeftSearch,
        "No hay animales disponibles."
      )}

      <div className="flex flex-row md:flex-col items-center justify-center gap-2 py-4 md:py-0">
        <button
          type="button"
          onClick={moveAllToRight}
          disabled={filteredLeft.length === 0}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 text-gray-700 transition-colors"
          title="Mover todos"
        >
          <ChevronsRight className="w-5 h-5 hidden md:block" />
          <ChevronRight className="w-5 h-5 md:hidden" />
          <ChevronRight className="w-5 h-5 md:hidden -ml-2" />
        </button>
        <button
          type="button"
          onClick={moveCheckedToRight}
          disabled={leftChecked.size === 0}
          className="p-2 rounded-lg border border-gray-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          title="Mover seleccionados"
        >
          <ChevronRight className="w-5 h-5 hidden md:block" />
          <ChevronRight className="w-5 h-5 md:hidden" />
        </button>
        <button
          type="button"
          onClick={moveCheckedToLeft}
          disabled={rightChecked.size === 0}
          className="p-2 rounded-lg border border-gray-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
          title="Regresar seleccionados"
        >
          <ChevronLeft className="w-5 h-5 hidden md:block" />
          <ChevronLeft className="w-5 h-5 md:hidden" />
        </button>
        <button
          type="button"
          onClick={moveAllToLeft}
          disabled={filteredRight.length === 0}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-50 text-gray-700 transition-colors"
          title="Regresar todos"
        >
          <ChevronsLeft className="w-5 h-5 hidden md:block" />
          <ChevronLeft className="w-5 h-5 md:hidden" />
          <ChevronLeft className="w-5 h-5 md:hidden -ml-2" />
        </button>
      </div>

      {renderList(
        "Seleccionados (Lote)",
        filteredRight,
        rightChecked,
        toggleRightCheck,
        rightSearch,
        setRightSearch,
        "No has seleccionado ningún animal."
      )}
    </div>
  );
};
