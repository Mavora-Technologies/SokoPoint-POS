'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  Tag,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react';

interface ProductPriceRow {
  id: string;
  name: string;
  sku?: string | null;
  costPrice: number;
  sellingPrice: number;
  marginAmount: number;
  marginPct: number;
}

interface PromotionRow {
  id: string;
  name: string;
  code?: string | null;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minPurchase: number;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function PricingPromotionsPage(): JSX.Element {
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    avgMarginPct: 0,
    lowMarginCount: 0,
    activePromotions: 0,
  });
  const [products, setProducts] = useState<ProductPriceRow[]>([]);
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [currency, setCurrency] = useState('KES');

  const [activeTab, setActiveTab] = useState<'PRICES' | 'PROMOTIONS'>('PRICES');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Edit Product Price Modal
  const [editingProduct, setEditingProduct] = useState<ProductPriceRow | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editSelling, setEditSelling] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  // Create Promotion Modal
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoForm, setPromoForm] = useState({
    name: '',
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '',
    minPurchase: '0',
    startDate: '',
    endDate: '',
  });

  const loadPricing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [meRes, pricingRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/pricing'),
      ]);

      if (meRes?.data?.data?.currency) setCurrency(meRes.data.data.currency);

      const payload = pricingRes.data?.data;
      if (payload) {
        if (payload.kpis) setKpis(payload.kpis);
        setProducts(Array.isArray(payload.products) ? payload.products : []);
        setPromotions(Array.isArray(payload.promotions) ? payload.promotions : []);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load pricing & promotions.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const openPriceModal = (p: ProductPriceRow) => {
    setEditingProduct(p);
    setEditCost(String(p.costPrice));
    setEditSelling(String(p.sellingPrice));
  };

  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setSavingPrice(true);
      await api.patch(`/pricing/products/${editingProduct.id}`, {
        costPrice: Number(editCost) || 0,
        sellingPrice: Number(editSelling) || 0,
      });
      setFeedback(`Updated live pricing for "${editingProduct.name}".`);
      setEditingProduct(null);
      await loadPricing();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update product price.');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPromo(true);
      await api.post('/pricing/promotions', {
        name: promoForm.name.trim(),
        code: promoForm.code.trim() || null,
        discountType: promoForm.discountType,
        discountValue: Number(promoForm.discountValue),
        minPurchase: Number(promoForm.minPurchase) || 0,
        startDate: promoForm.startDate || null,
        endDate: promoForm.endDate || null,
      });
      setIsPromoModalOpen(false);
      setPromoForm({
        name: '',
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minPurchase: '0',
        startDate: '',
        endDate: '',
      });
      setFeedback('Promotion created successfully.');
      await loadPricing();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create promotion.');
    } finally {
      setSavingPromo(false);
    }
  };

  const handleTogglePromo = async (id: string) => {
    try {
      await api.patch(`/pricing/promotions/${id}/toggle`);
      await loadPricing();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update promotion status.');
    }
  };

  const handleDeletePromo = async (promo: PromotionRow) => {
    if (!window.confirm(`Delete promotion "${promo.name}"?`)) return;
    try {
      await api.delete(`/pricing/promotions/${promo.id}`);
      await loadPricing();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete promotion.');
    }
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)
    );
  }, [products, search]);

  const filteredPromos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q)
    );
  }, [promotions, search]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            PRODUCT CATALOGUE &rsaquo; PRICE LISTS &amp; PROMOTIONS
          </p>
          <div className="flex items-center gap-2.5">
            <Tag className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Price Lists &amp; Promotions
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Manage retail selling prices, monitor gross margins, and launch storewide or promo-code discounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPromoModalOpen(true)}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Promotion
          </button>
          <button
            type="button"
            onClick={loadPricing}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </span>
          {isUnauthorized && (
            <Link href="/login" className="px-3.5 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5" /> Sign In Again
            </Link>
          )}
        </div>
      )}

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

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">PRICED SKUS</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">{kpis.totalProducts}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-emerald-600 uppercase">AVG GROSS MARGIN</span>
          <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{kpis.avgMarginPct}%</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-amber-600 uppercase">LOW MARGIN (&lt;10%)</span>
          <h2 className="text-2xl font-black text-amber-600 font-mono mt-1.5">{kpis.lowMarginCount}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-[#0554F4] uppercase">ACTIVE PROMOTIONS</span>
          <h2 className="text-2xl font-black text-[#0554F4] font-mono mt-1.5">{kpis.activePromotions}</h2>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('PRICES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              activeTab === 'PRICES' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Product Price List ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PROMOTIONS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
              activeTab === 'PROMOTIONS' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Percent className="w-3.5 h-3.5" /> Promotions ({promotions.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'PRICES' ? 'Search product or SKU...' : 'Search promo name or code...'}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        {activeTab === 'PRICES' ? (
          <table className="w-full min-w-[780px] divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">PRODUCT &amp; SKU</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">COST PRICE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">SELLING PRICE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">GROSS MARGIN</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                    Loading live product price list...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-400">
                    No products found in your catalog.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#041F56]">{p.name}</p>
                      <p className="text-[10px] font-mono text-gray-400">{p.sku || '—'}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {currency} {p.costPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-[#041F56]">
                      {currency} {p.sellingPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                          p.marginPct < 10
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.marginPct}% ({currency} {p.marginAmount.toLocaleString('en-KE')})
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openPriceModal(p)}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0554F4] rounded-xl text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Price
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[780px] divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">PROMOTION</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CODE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">DISCOUNT</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">MIN PURCHASE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">STATUS</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-gray-400">
                    No promotions configured yet. Click <strong>New Promotion</strong> to create one.
                  </td>
                </tr>
              ) : (
                filteredPromos.map((pr) => (
                  <tr key={pr.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-bold text-[#041F56]">{pr.name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-[#0554F4]">{pr.code || 'AUTO'}</td>
                    <td className="px-6 py-4 font-mono font-black text-emerald-700">
                      {pr.discountType === 'PERCENTAGE'
                        ? `${pr.discountValue}% OFF`
                        : `${currency} ${pr.discountValue.toLocaleString()} OFF`}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {currency} {pr.minPurchase.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePromo(pr.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          pr.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {pr.isActive ? 'ACTIVE' : 'PAUSED'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePromo(pr)}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Delete promotion"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* EDIT PRODUCT PRICE MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Update Product Price</h2>
                <p className="text-xs text-gray-500">{editingProduct.name}</p>
              </div>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePrice} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Cost Price ({currency})</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Selling Price ({currency}) *</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSelling}
                  onChange={(e) => setEditSelling(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingPrice && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW PROMOTION MODAL */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#041F56]">Create Promotion / Discount</h2>
              <button type="button" onClick={() => setIsPromoModalOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreatePromo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Promotion Name *</label>
                <input
                  required
                  type="text"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="e.g. End-Month Supermarket Sale"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Promo Code (Optional)</label>
                  <input
                    type="text"
                    value={promoForm.code}
                    onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value })}
                    placeholder="e.g. SAVE10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono uppercase outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Discount Type</label>
                  <select
                    value={promoForm.discountType}
                    onChange={(e) => setPromoForm({ ...promoForm, discountType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ({currency})</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Discount Value *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={promoForm.discountValue}
                    onChange={(e) => setPromoForm({ ...promoForm, discountValue: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Min Basket ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    value={promoForm.minPurchase}
                    onChange={(e) => setPromoForm({ ...promoForm, minPurchase: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromoModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPromo}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingPromo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Create Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}