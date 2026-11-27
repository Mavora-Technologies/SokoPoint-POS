'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Package,
  RefreshCw,
  Star,
  Award,
  HelpCircle,
  Scissors,
  Search,
  Loader2,
  X,
} from 'lucide-react';
import api from '../../../../lib/api';

interface MatrixItem {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  quadrant: 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG';
  sellingPrice: number;
  unitCost: number;
  costPct: number;
  contributionMargin: number;
  unitsSold: number;
  mixPct: number;
  grossRevenue: number;
  aiAction: string;
  actionType: 'OPTIMIZED' | 'REPRICE' | 'PROMOTE' | 'REVIEW';
}

export default function AiAnomaliesMatrixPage() {
  const [days, setDays] = useState<14 | 30 | 60 | 90>(30);
  const [quadrantFilter, setQuadrantFilter] = useState<'ALL' | 'STAR' | 'PLOWHORSE' | 'PUZZLE' | 'DOG'>('ALL');
  const [search, setSearch] = useState('');

  const [summary, setSummary] = useState({ stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 });
  const [items, setItems] = useState<MatrixItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bidirectional Reprice Modal
  const [editing, setEditing] = useState<MatrixItem | null>(null);
  const [editSell, setEditSell] = useState('');
  const [editCost, setEditCost] = useState('');
  const [saving, setSaving] = useState(false);

  const loadMatrix = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/anomalies', { params: { days } });
      const d = res.data?.data || {};
      if (d.summary) setSummary(d.summary);
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch (err) {
      console.error('Failed to load SKU matrix', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (quadrantFilter !== 'ALL' && item.quadrant !== quadrantFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        item.productName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q)
      );
    });
  }, [items, quadrantFilter, search]);

  const handleSaveReprice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setSaving(true);
      await api.patch(`/ai/anomalies/${editing.productId}/reprice`, {
        sellingPrice: Number(editSell),
        unitCost: Number(editCost),
      });
      setEditing(null);
      await loadMatrix();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update SKU pricing.');
    } finally {
      setSaving(false);
    }
  };

  const renderQuadrantBadge = (q: MatrixItem['quadrant']) => {
    if (q === 'STAR') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Star className="h-3 w-3" /> STAR
        </span>
      );
    }
    if (q === 'PLOWHORSE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
          <Award className="h-3 w-3" /> PLOWHORSE
        </span>
      );
    }
    if (q === 'PUZZLE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <HelpCircle className="h-3 w-3" /> PUZZLE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <Scissors className="h-3 w-3" /> DOG
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; AI Copilot &rsaquo; SKU Engineering &amp; Margin Anomalies
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <Sparkles className="h-6 w-6 text-[#0554F4]" />
            SKU Portfolio Matrix &amp; Margin Anomaly Engine
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Algorithmic classification of retail &amp; wholesale SKUs into Stars, Plowhorses, Puzzles, and Dogs based on contribution margin and sales velocity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/products"
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5"
          >
            <Package className="h-4 w-4 text-[#0554F4]" /> Product Master Catalog
          </Link>
          <button
            onClick={loadMatrix}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Quadrant KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setQuadrantFilter(quadrantFilter === 'STAR' ? 'ALL' : 'STAR')}
          className={`text-left bg-white rounded-2xl border p-5 shadow-xs flex justify-between items-center cursor-pointer transition-all ${
            quadrantFilter === 'STAR' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-200/70'
          }`}
        >
          <div>
            <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider">STARS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{summary.stars} Items</p>
            <p className="text-[11px] text-slate-500 mt-0.5">High Volume &bull; High Margin</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Star className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuadrantFilter(quadrantFilter === 'PLOWHORSE' ? 'ALL' : 'PLOWHORSE')}
          className={`text-left bg-white rounded-2xl border p-5 shadow-xs flex justify-between items-center cursor-pointer transition-all ${
            quadrantFilter === 'PLOWHORSE' ? 'border-[#0554F4] ring-1 ring-[#0554F4]' : 'border-slate-200/70'
          }`}
        >
          <div>
            <p className="text-[10px] font-extrabold text-[#0554F4] uppercase tracking-wider">PLOWHORSES</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{summary.plowhorses} Items</p>
            <p className="text-[11px] text-slate-500 mt-0.5">High Volume &bull; Low Margin</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Award className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuadrantFilter(quadrantFilter === 'PUZZLE' ? 'ALL' : 'PUZZLE')}
          className={`text-left bg-white rounded-2xl border p-5 shadow-xs flex justify-between items-center cursor-pointer transition-all ${
            quadrantFilter === 'PUZZLE' ? 'border-purple-500 ring-1 ring-purple-500' : 'border-slate-200/70'
          }`}
        >
          <div>
            <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider">PUZZLES</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{summary.puzzles} Items</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Low Volume &bull; High Margin</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <HelpCircle className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setQuadrantFilter(quadrantFilter === 'DOG' ? 'ALL' : 'DOG')}
          className={`text-left bg-white rounded-2xl border p-5 shadow-xs flex justify-between items-center cursor-pointer transition-all ${
            quadrantFilter === 'DOG' ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-200/70'
          }`}
        >
          <div>
            <p className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider">DOGS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{summary.dogs} Items</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Low Volume &bull; Low Margin</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Scissors className="h-5 w-5" />
          </div>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value) as any)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
          >
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days (Standard Audit)</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days (Quarterly Cycle)</option>
          </select>

          <select
            value={quadrantFilter}
            onChange={(e) => setQuadrantFilter(e.target.value as any)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
          >
            <option value="ALL">All Matrix Quadrants</option>
            <option value="STAR">Stars Only</option>
            <option value="PLOWHORSE">Plowhorses Only</option>
            <option value="PUZZLE">Puzzles Only</option>
            <option value="DOG">Dogs Only</option>
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product, or category..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
          />
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[1060px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">SKU ITEM PROFILE</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">QUADRANT TIER</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">SELLING PRICE</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">UNIT COST</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">CONTRIBUTION MARGIN</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">UNITS SOLD</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">GROSS REVENUE</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">AI STRATEGIC ACTION</th>
              <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-16 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-16 text-center text-slate-400 font-semibold">
                  No sales velocity data found for this {days}-day audit window. Complete POS sales to populate the matrix.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.productId} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#041F56]">{item.productName}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.category} &bull; <span className="font-mono">{item.sku}</span>
                    </p>
                  </td>
                  <td className="px-4 py-4">{renderQuadrantBadge(item.quadrant)}</td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-[#041F56]">
                    KES {item.sellingPrice.toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-slate-600">
                    KES {item.unitCost.toLocaleString('en-KE')} ({item.costPct}%)
                  </td>
                  <td
                    className={`px-4 py-4 text-right font-mono font-bold ${
                      item.contributionMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    KES {item.contributionMargin.toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-4 text-right font-mono text-slate-700">
                    {item.unitsSold} ({item.mixPct}%)
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-[#0554F4]">
                    KES {Math.round(item.grossRevenue).toLocaleString('en-KE')}
                  </td>
                  <td className="px-4 py-4 text-[11px] text-slate-500 max-w-xs">{item.aiAction}</td>
                  <td className="px-5 py-4 text-right">
                    {item.actionType === 'OPTIMIZED' ? (
                      <span className="text-[11px] font-semibold text-slate-400">Optimized</span>
                    ) : (
                      <button
                        onClick={() => {
                          setEditing(item);
                          setEditSell(String(item.sellingPrice));
                          setEditCost(String(item.unitCost));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer border ${
                          item.actionType === 'PROMOTE'
                            ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                            : item.actionType === 'REPRICE'
                              ? 'bg-blue-50 hover:bg-blue-100 text-[#0554F4] border-blue-200'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.actionType === 'PROMOTE'
                          ? 'Optimize'
                          : item.actionType === 'REPRICE'
                            ? 'Reprice'
                            : 'Review'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* BIDIRECTIONAL REPRICE MODAL */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-[#041F56]">Optimize SKU Margin &amp; Pricing</h2>
                <p className="text-xs text-[#176E84] mt-0.5">
                  {editing.productName} ({editing.sku})
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReprice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Selling Price (KES) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={editSell}
                    onChange={(e) => setEditSell(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Unit Cost (KES) *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-3 text-xs flex justify-between">
                <span className="text-slate-500">New Contribution Margin:</span>
                <span className="font-mono font-extrabold text-emerald-600">
                  KES {(Number(editSell || 0) - Number(editCost || 0)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Sync Price to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}