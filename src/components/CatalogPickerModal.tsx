import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, Trash2, Tag, Layers, ChevronDown, ChevronUp, Edit2, RotateCcw, Package, Sparkles } from 'lucide-react';
import { CatalogItem, LineItem } from '../types/quotation';
import { storage } from '../services/storage';
import { useToast, useConfirm } from '../context/ToastContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddItems?: (items: LineItem[]) => void;
  mode?: 'picker' | 'manage';
}

export const CatalogPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddItems,
  mode = onAddItems ? 'picker' : 'manage'
}) => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Form state
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
      setIsAddingNew(false);
      setEditingItem(null);
      setSelectedIds([]);
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
    if (mode === 'manage') return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleStartEdit = (e: React.MouseEvent, item: CatalogItem) => {
    e.stopPropagation();
    setEditingItem(item);
    setNewTitle(item.title);
    setNewCategory(baseCategories.includes(item.category) && item.category !== 'All' ? item.category : 'Other');
    setNewCustomCategory(baseCategories.includes(item.category) ? '' : item.category);
    setNewDescription(item.description);
    setNewRate(item.defaultRate);
    setNewUnit(item.unit);
    setNewHsnSac(item.hsnSac || '9973');
    setIsAddingNew(true);
  };

  const handleCancelForm = () => {
    setIsAddingNew(false);
    setEditingItem(null);
    setNewTitle('');
    setNewDescription('');
    setNewRate('');
    setNewCustomCategory('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const finalCategory = newCategory === 'Other' && newCustomCategory.trim()
      ? newCustomCategory.trim()
      : newCategory;

    const itemData: CatalogItem = {
      id: editingItem ? editingItem.id : `custom-cat-${Date.now()}`,
      title: newTitle.trim(),
      category: finalCategory,
      description: newDescription.trim() || newTitle.trim(),
      defaultRate: Number(newRate) || 0,
      unit: newUnit.trim() || 'Per Day',
      hsnSac: newHsnSac.trim() || '9973',
      isCustom: true,
    };

    storage.saveCatalogItem(itemData);
    const updated = storage.getAllCatalogItems();
    setCatalogItems(updated);

    if (editingItem) {
      toast.success(`"${itemData.title}" updated in catalog`);
    } else {
      // Auto-select the newly created item if in picker mode
      if (mode === 'picker') {
        setSelectedIds((prev) => [...prev, itemData.id]);
      }
      toast.success(`"${itemData.title}" added to equipment catalog`);
    }

    handleCancelForm();
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string, title?: string) => {
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

  const handleResetDefaults = async () => {
    const confirmed = await confirm({
      title: 'Reset Catalog to Defaults',
      message: 'Are you sure you want to restore original factory equipment presets? Any customizations will be reset.',
      confirmText: 'Reset to Factory Defaults',
      cancelText: 'Cancel',
      variant: 'warning',
    });
    if (confirmed) {
      const resetItems = storage.resetCatalogToDefaults();
      setCatalogItems(resetItems);
      setSelectedIds([]);
      toast.success('Equipment catalog restored to standard presets!');
    }
  };

  const handleApply = () => {
    if (!onAddItems) {
      onClose();
      return;
    }

    const itemsToAdd: LineItem[] = catalogItems
      .filter((item) => selectedIds.includes(item.id))
      .map((item: CatalogItem) => ({
        id: `item-cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: `${item.title}${item.description && item.description !== item.title ? ` - ${item.description}` : ''}`,
        quantity: 1,
        amount: item.defaultRate,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">
                {isAddingNew
                  ? (editingItem ? 'Edit Equipment' : 'Add New Equipment')
                  : (mode === 'manage' ? 'Equipment & Services Catalog Manager' : 'Equipment & Services Catalog')}
              </h3>
              <p className="text-xs text-slate-400">
                {isAddingNew
                  ? (editingItem ? `Update pricing and specifications for "${editingItem.title}"` : 'Add custom equipment, displays, trussing or crew to your catalog')
                  : (mode === 'manage'
                    ? 'Configure inventory items, daily rental rates & specifications'
                    : 'Select equipment to insert into quotation or manage catalog items')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search, Filter & Actions Toolbar */}
        {!isAddingNew && (
          <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3 shrink-0">
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
                onClick={() => {
                  setEditingItem(null);
                  setNewTitle('');
                  setNewDescription('');
                  setNewRate('');
                  setNewCustomCategory('');
                  setIsAddingNew(true);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-3.5 py-2 rounded-lg text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
              >
                <Plus size={14} />
                <span>New Item</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                title="Reset catalog to standard factory presets"
                className="p-2 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-slate-200 bg-white transition-colors shrink-0 cursor-pointer"
              >
                <RotateCcw size={15} />
              </button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add / Edit Catalog Item Form */}
        {isAddingNew && (
          <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/70">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                {editingItem ? <Edit2 size={14} className="text-blue-600" /> : <Tag size={14} className="text-blue-600" />}
                <span>{editingItem ? `Edit Equipment: ${editingItem.title}` : 'Add New Equipment to Catalog'}</span>
              </span>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Back to Catalog
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="text-slate-600 font-semibold block mb-0.5">Item Title / Equipment Name *</label>
                <input
                  required
                  placeholder="e.g. 55-inch Commercial 4K LED TV with Standee"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-800 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-blue-500"
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
                    placeholder="Enter custom category name"
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 mt-2 text-xs focus:outline-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Default Rate (₹)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="e.g. 2500"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-bold text-slate-900 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">Billing Unit</label>
                <input
                  placeholder="e.g. Unit / Day, Sq.Ft, Set, Lot"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold block mb-0.5">SAC / HSN Code</label>
                <input
                  placeholder="e.g. 9973"
                  value={newHsnSac}
                  onChange={(e) => setNewHsnSac(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800 focus:outline-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-slate-600 font-semibold block mb-0.5">Description &amp; Specifications</label>
                <textarea
                  rows={3}
                  placeholder="Technical specifications, standee type, brand, resolution or inclusions"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-700 resize-none focus:outline-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                {editingItem ? 'Update Item' : (mode === 'picker' ? 'Save & Select' : 'Save to Catalog')}
              </button>
            </div>
          </form>
        )}

        {/* List of Catalog Items & Footer */}
        {!isAddingNew && (
          <>
            <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
              {filtered.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  <Package size={32} className="mx-auto mb-2 text-slate-300" />
                  <p>No equipment found matching your search filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTitle(search || '');
                      setIsAddingNew(true);
                    }}
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
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-4 ${mode === 'picker' ? 'cursor-pointer' : ''
                        } ${isSelected
                          ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {mode === 'picker' && (
                          <div className={`w-5 h-5 mt-0.5 rounded flex items-center justify-center border transition-all shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                            {isSelected && <Check size={14} />}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{item.title}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {item.category}
                            </span>
                            {item.hsnSac && (
                              <span className="text-[10px] text-slate-400 font-mono">SAC: {item.hsnSac}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-900">₹{item.defaultRate.toLocaleString('en-IN')}</div>
                          <div className="text-[11px] text-slate-400">/{item.unit}</div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Edit this item"
                            onClick={(e) => handleStartEdit(e, item)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            title="Delete from catalog"
                            onClick={(e) => handleDeleteItem(e, item.id, item.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                {mode === 'picker'
                  ? `${selectedIds.length} item${selectedIds.length !== 1 ? 's' : ''} selected`
                  : `${catalogItems.length} equipment item${catalogItems.length !== 1 ? 's' : ''} configured in catalog`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                >
                  {mode === 'manage' ? 'Close' : 'Cancel'}
                </button>
                {mode === 'picker' && (
                  <button
                    type="button"
                    disabled={selectedIds.length === 0}
                    onClick={handleApply}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow"
                  >
                    <Plus size={16} />
                    <span>Add Selected ({selectedIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
};
