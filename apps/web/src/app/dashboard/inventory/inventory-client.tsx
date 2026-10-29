'use client';

import { useState, useEffect } from 'react';
import { Package, Search, Loader2, AlertTriangle, CheckCircle2, SlidersHorizontal, X, Tag, Trash2 } from 'lucide-react';
import api from '../../../lib/api';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stock: number;
  minimumStock: number;
  category?: string;
  status?: string;
  imageUrl?: string;
}

export default function InventoryClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Adjustment Modal State
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStockVal, setNewStockVal] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/products');
        const data = res.data?.data || res.data || [];
        // Filter out deactivated items to keep the inventory view clean
        setInventory(Array.isArray(data) ? data.filter((p: any) => p.status !== 'INACTIVE') : []);
      } catch (error) {
        console.error('Failed to load inventory', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchInventory();
  }, [isMounted]);

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    try {
      setIsUpdating(true);
      await api.put(`/products/${selectedItem.id}`, { stock: Number(newStockVal) });
      
      setInventory(inventory.map(item => 
        item.id === selectedItem.id ? { ...item, stock: Number(newStockVal) } : item
      ));
      
      setSelectedItem(null);
      setNewStockVal('');
    } catch (error) {
      console.error('Failed to update stock', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeactivateProduct = async (product: InventoryItem) => {
    try {
      setProcessingId(product.id);
      const data = new FormData();
      data.append('name', product.name);
      data.append('category', product.category || 'General');
      data.append('sellingPrice', product.sellingPrice.toString());
      data.append('stock', product.stock.toString());
      data.append('status', 'INACTIVE'); 
      if (product.sku) data.append('sku', product.sku);
      if (product.imageUrl) data.append('imageUrl', product.imageUrl);

      await api.put(`/products/${product.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setInventory(inventory.filter(p => p.id !== product.id));
      alert(`Success: "${product.name}" has been deactivated. Its historical sales records remain intact.`);
    } catch (error) {
      console.error('Failed to deactivate product', error);
      alert('Failed to deactivate product. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteItem = async (product: InventoryItem) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"?`);
    if (!confirmed) return;

    setProcessingId(product.id);
    try {
      await api.delete(`/products/${product.id}`);
      setInventory(inventory.filter(p => p.id !== product.id));
    } catch (error: any) {
      console.error('Delete error:', error);
      const status = error.response?.status;
      
      if (status === 409) {
        const archive = window.confirm(`Action Denied: Cannot delete "${product.name}" because it has existing sales records.\n\nWould you like to DEACTIVATE this product instead? It will be removed from active inventory but its historical data will remain safe.`);
        if (archive) {
          await handleDeactivateProduct(product);
        }
      } else {
        alert(`Error: Could not delete product. It may be locked by database constraints.`);
      }
    } finally {
      if (processingId === product.id) setProcessingId(null);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(inventory.map(i => i.category || 'Uncategorized'))).filter(c => c !== 'Uncategorized')];

  const filtered = inventory.filter(item => {
    const nameMatch = (item?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const skuMatch = item?.sku ? item.sku.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const itemCat = item?.category || 'Uncategorized';
    const categoryMatch = selectedCategory === 'All' || itemCat === selectedCategory;
    return (nameMatch || skuMatch) && categoryMatch;
  });

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Package className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Inventory & Categories</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Monitor real-time stock levels, filter by product categories, and manage reorders.
            </p>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                selectedCategory === cat 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory by real name or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                <Package className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No inventory items found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">Try adjusting your search criteria or category filter.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(item => {
                  const stockCount = typeof item.stock === 'number' ? item.stock : 0;
                  const minStock = typeof item.minimumStock === 'number' ? item.minimumStock : 5;
                  const isLow = stockCount <= minStock;

                  return (
                    <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-slate-900 truncate">{item.name || 'Unnamed Product'}</h4>
                          <p className="text-xs sm:text-sm font-mono text-slate-400 mt-0.5 truncate">SKU: {item.sku || 'N/A'}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 shrink-0">
                          <Tag className="h-3 w-3" /> {item.category || 'General'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Stock Level</span>
                          <span className="text-base font-black text-slate-900">{stockCount} units</span>
                          <div className="mt-1">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700">
                                <AlertTriangle className="h-3 w-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-green-50 text-green-700">
                                <CheckCircle2 className="h-3 w-3" /> Healthy
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleDeleteItem(item)}
                            disabled={processingId === item.id}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {processingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                          </button>
                          <button 
                            onClick={() => { setSelectedItem(item); setNewStockVal(stockCount.toString()); }}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl text-xs transition-colors shadow-sm active:scale-95"
                          >
                            <SlidersHorizontal className="h-4 w-4" /> Adjust
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/3">
                      Product Name
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      In Stock
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(item => {
                    const stockCount = typeof item.stock === 'number' ? item.stock : 0;
                    const minStock = typeof item.minimumStock === 'number' ? item.minimumStock : 5;
                    const isLow = stockCount <= minStock;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-bold text-slate-900 align-middle">
                          {item.name || 'Unnamed Product'}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-mono text-slate-400 align-middle">
                          {item.sku || 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            <Tag className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> {item.category || 'General'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 align-middle">
                          {stockCount} units
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          {isLow ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                              <AlertTriangle className="h-4 w-4" /> Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                              <CheckCircle2 className="h-4 w-4" /> Healthy
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-right pr-6 lg:pr-8 align-middle flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDeleteItem(item)}
                            disabled={processingId === item.id}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            {processingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                          </button>
                          <button 
                            onClick={() => { setSelectedItem(item); setNewStockVal(stockCount.toString()); }}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-xl text-xs lg:text-sm transition-colors shadow-sm active:scale-95"
                          >
                            <SlidersHorizontal className="h-4 w-4" /> Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Responsive Adjustment Modal */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-md lg:max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <SlidersHorizontal className="h-6 w-6 text-blue-600" /> Adjust Stock Level
                </h3>
                <button 
                  onClick={() => setSelectedItem(null)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-5 sm:p-6 lg:p-8">
                <p className="text-sm sm:text-base text-slate-600 mb-6">
                  Editing stock count for <span className="font-bold text-slate-900">{selectedItem.name}</span>
                </p>

                <form onSubmit={handleUpdateStock} className="space-y-5 sm:space-y-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">New Stock Quantity</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      value={newStockVal} 
                      onChange={e => setNewStockVal(e.target.value)} 
                      disabled={isUpdating}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm disabled:opacity-50" 
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                    <button 
                      type="button" 
                      onClick={() => setSelectedItem(null)} 
                      disabled={isUpdating}
                      className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isUpdating}
                      className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                      Update Stock
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}