'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Tag,
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  X,
  Trash2,
  Pencil,
  Eye,
  RefreshCw,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../lib/api';

interface CategoryItem {
  id: string;
  tenantId?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export default function CategoriesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formState, setFormState] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal State
  const [viewingCategory, setViewingCategory] = useState<CategoryItem | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const res = await api.get('/categories');
      const data = res.data?.data || res.data || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load categories from database.');
      }
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchCategories();
  }, [isMounted, fetchCategories]);

  const openAddModal = () => {
    setEditingCategory(null);
    setFormState({ name: '', description: '' });
    setIsFormOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormState({
      name: cat.name || '',
      description: cat.description || '',
    });
    setIsFormOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formState.name.trim();
    if (!trimmedName) return;

    try {
      setIsSubmitting(true);
      const payload = {
        name: trimmedName,
        description: formState.description.trim() || null,
      };

      if (editingCategory) {
        const res = await api.put(`/categories/${editingCategory.id}`, payload);
        const updated = res.data?.data || res.data;
        if (updated?.id) {
          setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? updated : c)));
        } else {
          await fetchCategories();
        }
        setFeedback(`Category "${trimmedName}" updated.`);
      } else {
        const res = await api.post('/categories', payload);
        const created = res.data?.data || res.data;
        if (created?.id) {
          setCategories((prev) => [created, ...prev]);
        } else {
          await fetchCategories();
        }
        setFeedback(`Category "${trimmedName}" added to database.`);
      }

      setIsFormOpen(false);
      setEditingCategory(null);
      setFormState({ name: '', description: '' });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save category. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: CategoryItem) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category.name}"?`)) return;

    setProcessingId(category.id);
    try {
      await api.delete(`/categories/${category.id}`);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      if (viewingCategory?.id === category.id) setViewingCategory(null);
      setFeedback(`Category "${category.name}" deleted.`);
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      if (status === 409) {
        alert(`Action Denied: ${message}`);
      } else {
        alert(message || 'Failed to delete category.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        (c?.name || '').toLowerCase().includes(q) ||
        (c?.description || '').toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const documentedCount = useMemo(
    () => categories.filter((c) => Boolean(c.description && c.description.trim())).length,
    [categories]
  );

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#0554F4]" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] overflow-x-hidden font-sans">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
              PRODUCT CATALOGUE &rsaquo; TAXONOMY &amp; DEPARTMENTS
            </p>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#041F56] flex items-center gap-3 truncate">
              <div className="p-2.5 bg-blue-50 rounded-xl text-[#0554F4] shrink-0">
                <Tag className="h-6 w-6" />
              </div>
              <span className="truncate">Category Management</span>
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-[#176E84] font-medium max-w-3xl">
              Organize retail, supermarket, and wholesale product departments synced with your PostgreSQL database.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchCategories}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh categories from database"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center justify-center rounded-xl bg-[#0554F4] hover:bg-[#041F56] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-[0.98]"
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" /> Add Category
            </button>
          </div>
        </div>

        {/* Error / Auth Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </span>
            {isUnauthorized && (
              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In Again
              </Link>
            )}
          </div>
        )}

        {/* Feedback Banner */}
        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {feedback}
            </span>
            <button type="button" onClick={() => setFeedback(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Live Database KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-black text-slate-400 uppercase">TOTAL CATEGORIES</span>
            <p className="text-2xl font-black text-[#041F56] font-mono mt-1">{categories.length}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-black text-emerald-600 uppercase">WITH DESCRIPTIONS</span>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{documentedCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-black text-[#0554F4] uppercase">FILTERED RESULTS</span>
            <p className="text-2xl font-black text-[#0554F4] font-mono mt-1">{filtered.length}</p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          {/* Search Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0554F4] text-sm outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[36vh] w-full">
              <Loader2 className="h-10 w-10 animate-spin text-[#0554F4]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[36vh] text-slate-500 p-6 text-center">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <Tag className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-base font-bold text-slate-700">No categories found</p>
              <p className="mt-1 text-xs text-slate-400">
                Try adjusting your search or click Add Category to create one.
              </p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET CARD VIEW */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map((cat) => (
                  <div key={cat.id} className="p-4 hover:bg-slate-50/80 transition-colors space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#0554F4] ring-1 ring-inset ring-blue-600/20">
                          <Tag className="h-3.5 w-3.5" /> {cat.name}
                        </span>
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                          {cat.description || <span className="italic text-slate-400">No description provided</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setViewingCategory(cat)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="p-2 text-[#0554F4] hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          disabled={processingId === cat.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                          title="Delete"
                        >
                          {processingId === cat.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                      Created: {new Date(cat.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Category Name
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-3 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 pl-6 pr-3 text-sm font-bold text-slate-900 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#0554F4] ring-1 ring-inset ring-blue-600/20">
                          <Tag className="h-3.5 w-3.5" /> {cat.name}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs sm:text-sm text-slate-600 align-middle max-w-md truncate">
                        {cat.description || <span className="italic text-slate-400">No description provided</span>}
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-500 font-mono align-middle whitespace-nowrap">
                        {new Date(cat.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-3 py-4 text-right pr-6 align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingCategory(cat)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Category"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className="p-2 text-[#0554F4] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Category"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            disabled={processingId === cat.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Category"
                          >
                            {processingId === cat.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* VIEW CATEGORY MODAL */}
        {viewingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#041F56] flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#0554F4]" /> Category Details
                </h3>
                <button
                  type="button"
                  onClick={() => setViewingCategory(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Category Name</p>
                  <p className="font-bold text-slate-900 text-base mt-0.5">{viewingCategory.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Description</p>
                  <p className="text-slate-600 mt-0.5">
                    {viewingCategory.description || 'No description provided.'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Database ID</p>
                    <p className="font-mono text-xs text-slate-500 truncate">{viewingCategory.id}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Created</p>
                    <p className="font-mono text-xs text-slate-600">
                      {new Date(viewingCategory.createdAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingCategory;
                    setViewingCategory(null);
                    openEditModal(target);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0554F4] hover:bg-[#041F56] rounded-xl"
                >
                  Edit Category
                </button>
                <button
                  type="button"
                  onClick={() => setViewingCategory(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD / EDIT CATEGORY MODAL */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-black text-[#041F56] flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#0554F4]" />
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCategory} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm text-slate-900 focus:ring-2 focus:ring-[#0554F4] outline-none disabled:opacity-50"
                    placeholder="e.g., Grains & Flour"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm text-slate-900 focus:ring-2 focus:ring-[#0554F4] outline-none resize-none disabled:opacity-50"
                    placeholder="Brief description of items in this category..."
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-[#0554F4] hover:bg-[#041F56] rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {editingCategory ? 'Update Category' : 'Save Category'}
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