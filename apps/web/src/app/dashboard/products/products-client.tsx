'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Loader2, Search, Trash2, Edit3, X, CheckCircle2, Image as ImageIcon, ImagePlus, RefreshCw, Archive } from 'lucide-react';
import api from '../../../lib/api';

interface Product {
  id: string;
  name: string;
  category?: string;
  price?: number;
  sellingPrice?: number;
  stock: number;
  sku?: string;
  imageUrl?: string;
  status?: string;
}

const PRODUCT_CATEGORIES = [
  'General', 'Bakery', 'Beverages', 'Dairy & Eggs', 'Grains & Flour', 
  'Household & Essentials', 'Pantry & Oils', 'Clothes (Male)', 
  'Clothes (Female)', 'Shoes', 'Utensils', 'Farm Tools', 'Machines'
];

export default function ProductsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', category: 'General', price: '', stock: '', sku: '', imageUrl: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => { setIsMounted(true); }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/products?status=${viewMode}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (error) {
      console.error('Failed to load products', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) fetchProducts();
  }, [isMounted, viewMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('category', formData.category);
      data.append('sellingPrice', formData.price);
      data.append('stock', formData.stock);
      data.append('status', 'ACTIVE');
      if (formData.sku) data.append('sku', formData.sku);
      if (selectedFile) {
        data.append('file', selectedFile);
      } else if (formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl);
      }

      const res = await api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const created = res.data?.data || res.data;
      if (created && viewMode === 'ACTIVE') {
        setProducts([created, ...products]);
      } else {
        await fetchProducts();
      }
      setIsAddModalOpen(false);
      setFormData({ name: '', category: 'General', price: '', stock: '', sku: '', imageUrl: '' });
      setSelectedFile(null);
      setImagePreview('');
    } catch (error) {
      console.error('Failed to add product', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product?.name || '', 
      category: product?.category || 'General',
      price: (product?.sellingPrice ?? product?.price ?? 0).toString(),
      stock: (product?.stock ?? 0).toString(), 
      sku: product?.sku || '', 
      imageUrl: product?.imageUrl || '',
    });
    setImagePreview(product?.imageUrl || '');
    setSelectedFile(null);
    setIsEditModalOpen(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${product.name}"?`);
    if (!confirmed) return;

    setProcessingId(product.id);
    try {
      const res = await api.delete(`/products/${product.id}`);
      setProducts(products.filter(p => p.id !== product.id));
      if (res.data?.message) {
        alert(res.data.message);
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(`Error: Could not process deletion.`);
    } finally {
      if (processingId === product.id) setProcessingId(null);
    }
  };

  const handleRestoreProduct = async (product: Product) => {
    setProcessingId(product.id);
    try {
      const data = new FormData();
      data.append('status', 'ACTIVE');

      await api.put(`/products/${product.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setProducts(products.filter(p => p.id !== product.id));
      alert(`Success: "${product.name}" has been restored to active inventory.`);
    } catch (error: any) {
      console.error('Failed to restore product', error);
      alert('Failed to restore product');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('category', formData.category);
      data.append('sellingPrice', formData.price);
      data.append('stock', formData.stock);
      if (formData.sku) data.append('sku', formData.sku);
      if (selectedFile) {
        data.append('file', selectedFile);
      } else if (formData.imageUrl) {
        data.append('imageUrl', formData.imageUrl);
      }

      const res = await api.put(`/products/${selectedProduct.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const updated = res.data?.data || res.data;
      if (updated) {
        setProducts(products.map(p => (p.id === selectedProduct.id ? updated : p)));
      } else {
        await fetchProducts();
      }
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      setFormData({ name: '', category: 'General', price: '', stock: '', sku: '', imageUrl: '' });
      setSelectedFile(null);
      setImagePreview('');
    } catch (error: any) {
      console.error('Failed to update product', error);
      if (error.response?.status === 403) {
        alert(`Action Denied:\n\n${error.response.data.message}`);
      } else {
        alert('Failed to update product');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  const filtered = products.filter(p => 
    (p?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p?.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p?.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDisplayImage = (item: Product) => {
    const hasRealImageInDB = item.imageUrl && !item.imageUrl.includes('placehold.co');
    if (hasRealImageInDB) {
      return item.imageUrl;
    }
    // Direct local public folder fallback matching exact product name
    return `/products/${item.name}.png`;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.target as HTMLImageElement;
    if (target.src.endsWith('.png')) {
      target.src = target.src.replace('.png', '.jpg');
    } else {
      target.style.display = 'none';
      target.nextElementSibling?.classList.remove('hidden');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <img src="/SokoPoint POS Logo.png" alt="Logo" className="h-8 sm:h-10 w-auto object-contain shrink-0" /> 
              <span className="truncate">SokoPoint Inventory</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Manage retail and wholesale items, pricing, images, and stock levels.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => {
                setFormData({ name: '', category: 'General', price: '', stock: '', sku: '', imageUrl: '' });
                setSelectedFile(null);
                setImagePreview('');
                setIsAddModalOpen(true);
              }} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-green-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-green-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Product
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full gap-4">
            
            <div className="flex bg-slate-200/50 p-1 rounded-xl w-full sm:w-fit shrink-0">
              <button 
                onClick={() => setViewMode('ACTIVE')}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'ACTIVE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Package className="h-4 w-4" /> Active
              </button>
              <button 
                onClick={() => setViewMode('ARCHIVED')}
                className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${viewMode === 'ARCHIVED' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Archive className="h-4 w-4" /> Archived
              </button>
            </div>

            <div className="relative w-full sm:max-w-md lg:max-w-lg shrink-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, category, or SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm sm:text-base outline-none transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                {viewMode === 'ARCHIVED' ? <Archive className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" /> : <Package className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />}
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">
                No {viewMode === 'ARCHIVED' ? 'archived' : 'active'} products found
              </p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">
                {viewMode === 'ARCHIVED' ? 'Deleted products with sales history will appear here.' : 'Try adjusting your search or add a new product.'}
              </p>
            </div>
          ) : (
            <div className="w-full">
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(item => {
                  const displayImage = getDisplayImage(item);
                  return (
                    <div key={item.id} className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3 ${viewMode === 'ARCHIVED' ? 'opacity-75 grayscale-[50%]' : ''}`}>
                      <div className="flex items-start gap-3.5">
                        <img 
                          src={displayImage} 
                          alt={item.name} 
                          className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover ring-1 ring-slate-200 bg-white shrink-0" 
                          onError={handleImageError}
                        />
                        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-slate-100 hidden items-center justify-center text-slate-400 shrink-0">
                          <ImageIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-bold text-slate-900 truncate">{item.name}</h4>
                          {item.sku && <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">SKU: {item.sku}</p>}
                          <div className="mt-1">
                            {item.category ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700">
                                {item.category}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Uncategorized</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Price & Stock</span>
                          <span className="text-base font-black text-slate-900">
                            KES {(Number(item.sellingPrice) || Number(item.price) || 0).toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-slate-500 ml-2">({item.stock} units)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {viewMode === 'ACTIVE' ? (
                            <>
                              <button onClick={() => openEditModal(item)} className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                                <Edit3 className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(item)} 
                                disabled={processingId === item.id}
                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                              >
                                {processingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleRestoreProduct(item)} 
                              disabled={processingId === item.id}
                              className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {processingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Restore
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Price (KES)</th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Stock</th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(item => {
                    const displayImage = getDisplayImage(item);
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors group ${viewMode === 'ARCHIVED' ? 'opacity-75 grayscale-[50%]' : ''}`}>
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-bold text-slate-900 align-middle">
                          <div className="flex items-center gap-4">
                            <img 
                              src={displayImage} 
                              alt={item.name} 
                              className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-200 bg-white shrink-0" 
                              onError={handleImageError}
                            />
                            <div className="h-12 w-12 rounded-2xl bg-slate-100 hidden items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-slate-900 font-bold block truncate">{item.name}</span>
                              {item.sku && <span className="text-xs font-mono text-slate-400 block mt-0.5">SKU: {item.sku}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          {item.category ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                              {item.category}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Uncategorized</span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-right font-black text-slate-900 align-middle">
                          KES {(Number(item.sellingPrice) || Number(item.price) || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-right font-bold text-slate-700 align-middle">
                          {item.stock} units
                        </td>
                        <td className="px-3 py-4 text-sm text-right pr-6 lg:pr-8 align-middle space-x-1">
                          {viewMode === 'ACTIVE' ? (
                            <>
                              <button onClick={() => openEditModal(item)} className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-colors inline-flex items-center">
                                <Edit3 className="h-5 w-5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(item)} 
                                disabled={processingId === item.id}
                                className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-flex items-center disabled:opacity-50"
                              >
                                {processingId === item.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                              </button>
                            </>
                          ) : (
                            <button 
                              onClick={() => handleRestoreProduct(item)} 
                              disabled={processingId === item.id}
                              className="px-4 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                            >
                              {processingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-lg lg:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Package className="h-6 w-6 text-green-600" /> Add New Product
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddProduct} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Product Image</label>
                  <div className="flex items-center gap-4">
                    <input type="file" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} className="hidden" id="image-upload-add" />
                    <label htmlFor="image-upload-add" className="cursor-pointer flex items-center justify-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl hover:bg-slate-100 transition-all text-sm font-bold text-slate-700 shadow-sm">
                      <ImagePlus className="h-5 w-5 text-slate-600 mr-2" /> Upload Image
                    </label>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded-xl shadow-sm border border-slate-200" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" placeholder="e.g., Premium Coffee" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Price (KES)</label>
                    <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Initial Stock</label>
                    <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" placeholder="0" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm appearance-none bg-white">
                      {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">SKU Code</label>
                    <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" placeholder="e.g., SKU-101" />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-70 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-green-600/20">
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Save Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-lg lg:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Edit3 className="h-6 w-6 text-green-600" /> Edit Product
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleUpdateProduct} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Product Image</label>
                  <div className="flex items-center gap-4">
                    <input type="file" accept="image/*" onChange={handleFileChange} disabled={isSubmitting} className="hidden" id="image-upload-edit" />
                    <label htmlFor="image-upload-edit" className="cursor-pointer flex items-center justify-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl hover:bg-slate-100 transition-all text-sm font-bold text-slate-700 shadow-sm">
                      <ImagePlus className="h-5 w-5 text-slate-600 mr-2" /> Change Image
                    </label>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded-xl shadow-sm border border-slate-200" />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Price (KES)</label>
                    <input required type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Stock</label>
                    <input required type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm appearance-none bg-white">
                      {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">SKU Code</label>
                    <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all text-sm sm:text-base shadow-sm" />
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-70 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-green-600/20">
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Update Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}