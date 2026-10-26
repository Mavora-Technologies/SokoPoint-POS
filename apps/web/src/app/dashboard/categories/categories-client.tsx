'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Loader2, Search, CheckCircle2, X, Trash2 } from 'lucide-react';
import api from '../../../lib/api';

interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export default function CategoriesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/categories');
        const data = res.data?.data || res.data || [];
        setCategories(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load categories', error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchCategories();
  }, [isMounted]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await api.post('/categories', newCategory);
      const created = res.data?.data || res.data;
      
      if (created) {
        setCategories([created, ...categories]);
      } else {
        const refresh = await api.get('/categories');
        setCategories(refresh.data?.data || refresh.data || []);
      }
      
      setIsModalOpen(false);
      setNewCategory({ name: '', description: '' });
    } catch (error) {
      console.error('Failed to add category', error);
      alert('Failed to add category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: CategoryItem) => {
    if (!confirm(`Are you sure you want to delete the category "${category.name}"?`)) return;

    try {
      // 1. Fetch products to verify if any product is using this category
      const productsRes = await api.get('/products').catch(() => ({ data: { data: [] } }));
      const products = productsRes.data?.data || productsRes.data || [];

      // 2. Check if the category name is linked to any active product
      const isUsed = products.some((p: any) => 
        (p.category || '').toLowerCase() === category.name.toLowerCase()
      );

      // 3. Block deletion if products depend on it
      if (isUsed) {
        alert(`Action Denied: The category "${category.name}" cannot be deleted because it is currently assigned to one or more active products. Please reassign those products first.`);
        return;
      }

      // 4. Safe to delete
      await api.delete(`/categories/${category.id}`);
      setCategories(categories.filter(c => c.id !== category.id));
    } catch (error: any) {
      console.error('Failed to delete category', error);
      alert('Failed to delete category. It may be locked by database constraints.');
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = categories.filter(c => 
    (c?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c?.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Tag className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Category Management</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Organize and manage store inventory categories and classifications.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5 shrink-0" /> Add Category
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories by name..."
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
                <Tag className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No categories found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">Try adjusting your search or add a new category.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW: Card Layout to completely eliminate horizontal scrolling */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(cat => (
                  <div key={cat.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors group space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          <Tag className="h-3.5 w-3.5" /> {cat.name}
                        </span>
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                          {cat.description || <span className="italic text-slate-400">No description provided</span>}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-2 sm:p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex items-center text-[11px] sm:text-xs text-slate-400 font-medium tracking-wide pt-2 border-t border-slate-100">
                      Created: {new Date(cat.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/4">
                      Category Name
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/2">
                      Description
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-bold text-slate-900 align-middle">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 group-hover:bg-blue-100 transition-colors">
                          <Tag className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> {cat.name}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base text-slate-600 align-middle max-w-sm truncate">
                        {cat.description || <span className="italic text-slate-400">No description provided</span>}
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base text-slate-500 font-medium align-middle whitespace-nowrap">
                        {new Date(cat.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-4 text-sm text-right pr-6 lg:pr-8 align-middle">
                        <button 
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-flex items-center"
                          title="Delete Category"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Responsive Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-lg lg:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Tag className="h-6 w-6 text-blue-600" /> Add New Category
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddCategory} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Category Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newCategory.name} 
                    onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="e.g., Beverages & Coffee" 
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Description (Optional)</label>
                  <textarea 
                    rows={4} 
                    value={newCategory.description} 
                    onChange={e => setNewCategory({...newCategory, description: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm resize-none placeholder:text-slate-400 custom-scrollbar disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="Brief description of items in this category..." 
                  />
                </div>
                
                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} Save Category
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