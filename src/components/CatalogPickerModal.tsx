import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, Trash2, Tag, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { CatalogItem, LineItem } from '../types/quotation';
import { storage } from '../services/storage';
import { useToast, useConfirm } from '../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: LineItem[]) => void;
}

export const CatalogPickerModal: React.FC<Props> = ({ isOpen, onClose, onAddItems }) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New item form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Screen');
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRate, setNewRate] = useState<number | ''>('');
  const [newUnit, setNewUnit] = useState('Per Day');
  const [newHsnSac, setNewHsnSac] = useState('9973');

  useEffect(() => {
    if (isOpen) {
      setCatalogItems(storage.getAllCatalogItems());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract distinct categories from catalog items
  const baseCategories = ['All', 'Screen', 'Processor', 'Truss & Rigging', 'Crew & Logistics', 'Sound & Lights'];
  const allCategories = Array.from(
    new Set([...baseCategories, ...catalogItems.map((i) => i.category)])
  );

  const filtered = catalogItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const term = search.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      (item.hsnSac || '').toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const finalCategory = newCategory === 'Other' && newCustomCategory.trim() 
      ? newCustomCategory.trim() 
      : newCategory;

    const item: CatalogItem = {
      id: `custom-cat-${Date.now()}`,
      title: newTitle.trim(),
      category: finalCategory,
      description: newDescription.trim() || newTitle.trim(),
      defaultRate: Number(newRate) || 0,
      unit: newUnit.trim() || 'Per Day',
      hsnSac: newHsnSac.trim() || '9973',
      isCustom: true,
    };

    storage.saveCatalogItem(item);
    const updated = storage.getAllCatalogItems();
    setCatalogItems(updated);
    
    // Auto-select the newly created item
    setSelectedIds((prev) => [...prev, item.id]);

    // Reset form
    setNewTitle('');
    setNewDescription('');
    setNewRate('');
    setNewCustomCategory('');
    setIsAddingNew(false);
    toast.success(`"${item.title}" added to equipment catalog`);
  };

  const handleDeleteCustomItem = async (e: React.MouseEvent, id: string, title?: string) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete Equipment',
      message: `Are you sure you want to delete ${title ? `"${title}"` : 'this item'} from your catalog?`,
      confirmText: 'Delete Item',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (confirmed) {
      storage.deleteCatalogItem(id);
      setCatalogItems(storage.getAllCatalogItems());
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      toast.success(`${title ? `"${title}"` : 'Item'} removed from catalog`);
    }
  };

  const handleApply = () => {
    const itemsToAdd: LineItem[] = catalogItems
      .filter((item) => selectedIds.includes(item.id))
      .map((item: CatalogItem) => ({
        id: `item-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: `${item.title}${item.description && item.description !== item.title ? ` - ${item.description}` : ''}`,
        quantity: 1,
        rate: item.defaultRate,
        unit: item.unit,
        hsnSac: item.hsnSac,
      }));

    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
      toast.success(`Added ${itemsToAdd.length} ${itemsToAdd.length === 1 ? 'item' : 'items'} to quotation`);
    }
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Layers className="text-blue-400" size={22} />
            <div>
              <h3 className="text-lg font-bold">Equipment &amp; Services Catalog</h3>
              <p className="text-xs text-slate-400">Select standard equipment or add custom gear to your catalog</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Search, Filter & Add Button */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={17} />
              <input
                type="text"
                placeholder="Search catalog by title, description, SAC code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddingNew(!isAddingNew)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0"
            >
              <Plus size={15} />
              <span>{isAddingNew ? 'Hide Form' : 'New Catalog Item'}</span>
              {isAddingNew ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {allCategories.map((cat) => (
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

        {/* Add New Catalog Item Form Drawer */}
        {isAddingNew && (
          <form onSubmit={handleCreateNewItem} className="p-4 bg-blue-50/60 border-b border-blue-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                <Tag size={14} className="text-blue-600" />
                Add New Item to Equipment Catalog
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-600 font-semibold block mb-0.5">Item Title / Equipment Name *</label>
                <input
                  required
                  placeholder="e.g. 55-inch Vertical Touch Screen Standee / Yamaha Digital Mixer"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-slate-800 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-500"
                >
                  <option value="Screen">Screen (LED / TV / Video Wall)</option>
                  <option value="Processor">Processor &amp; Switchers</option>
                  <option value="Truss & Rigging">Truss &amp; Rigging</option>
                  <option value="Crew & Logistics">Crew &amp; Logistics</option>
                  <option value="Sound & Lights">Sound &amp; Lights</option>
                  <option value="Staging">Staging &amp; Fabrication</option>
                  <option value="Other">Other / Custom</option>
                </select>
                {newCategory === 'Other' && (
                  <input
                    placeholder="Enter custom category"
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 mt-1.5 text-xs focus:outline-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Default Rate (₹)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 3500"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-900 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Billing Unit</label>
                <input
                  placeholder="e.g. Per Day / Sq.Ft / Set / Lot"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">SAC / HSN Code</label>
                <input
                  placeholder="e.g. 9973"
                  value={newHsnSac}
                  onChange={(e) => setNewHsnSac(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-mono text-slate-800 focus:outline-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-600 font-semibold block mb-0.5">Description &amp; Specifications (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Technical specifications, brand, size, or package inclusion details"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-700 resize-none focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm"
              >
                Save &amp; Select
              </button>
            </div>
          </form>
        )}

        {/* List of Catalog Items */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <p>No equipment found matching your filter.</p>
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Plus size={14} /> Add "{search || 'new item'}" to catalog
              </button>
            </div>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{item.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {item.category}
                        </span>
                        {item.isCustom && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                            Custom
                          </span>
                        )}
                        {item.hsnSac && (
                          <span className="text-[10px] text-slate-400 font-mono">SAC: {item.hsnSac}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">₹{item.defaultRate.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-slate-400">/{item.unit}</div>
                    </div>

                    {item.isCustom && (
                      <button
                        title="Delete custom item"
                        onClick={(e) => handleDeleteCustomItem(e, item.id, item.title)}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
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
