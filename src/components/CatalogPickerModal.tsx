import React, { useState } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { CATALOG_PRESETS } from '../config/catalog';
import { CatalogItem, LineItem } from '../types/quotation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: LineItem[]) => void;
}

export const CatalogPickerModal: React.FC<Props> = ({ isOpen, onClose, onAddItems }) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const categories = ['All', 'Screen', 'Processor', 'Truss & Rigging', 'Crew & Logistics', 'Sound & Lights'];

  const filtered = CATALOG_PRESETS.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                          item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    const itemsToAdd: LineItem[] = CATALOG_PRESETS
      .filter((item) => selectedIds.includes(item.id))
      .map((item: CatalogItem) => ({
        id: `item-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: `${item.title} - ${item.description}`,
        quantity: 1,
        rate: item.defaultRate,
        unit: item.unit,
        hsnSac: item.hsnSac,
      }));

    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
    }
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <h3 className="text-lg font-bold">Equipment & Services Catalog</h3>
            <p className="text-xs text-slate-400">Select standard equipment to quickly add to your quotation</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search equipment, processors, truss, crew..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-blue-500"
            />
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List of items */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">No items found matching your filter</div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all ${
                      isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <Check size={14} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        {item.hsnSac && (
                          <span className="text-[10px] text-slate-400 font-mono">SAC: {item.hsnSac}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900">₹{item.defaultRate.toLocaleString('en-IN')}</div>
                    <div className="text-[11px] text-slate-400">/{item.unit}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            {selectedIds.length} item{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleApply}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow"
            >
              <Plus size={16} />
              Add Selected ({selectedIds.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
