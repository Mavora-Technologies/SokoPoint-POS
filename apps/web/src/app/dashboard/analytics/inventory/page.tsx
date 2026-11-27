'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Download,
  RefreshCw,
  Search,
  Loader2,
  SlidersHorizontal,
  X,
  ShieldCheck,
} from 'lucide-react';
import api from '../../../../lib/api';

interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  physicalStock: number;
  parMin: number;
  unitCost: number;
  sellingPrice: number;
  baseUnit: string;
  bookValue: number;
  status: 'ADEQUATE' | 'REORDER' | 'DEPLETED' | string;
}

export default function InventoryValuationPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [branchId, setBranchId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ADEQUATE' | 'REORDER' | 'DEPLETED'>('ALL');
  const [search, setSearch] = useState('');

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState({
    totalAssetValuation: 0,
    totalSkus: 0,
    depletedCount: 0,
    reorderCount: 0,
    adequateCount: 0,
    wasteLoss: 0,
    wasteCount: 0,
  });
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [capitalization, setCapitalization] = useState<any[]>([]);
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Bidirectional Stock Adjust Modal
  const [adjusting, setAdjusting] = useState<StockItem | null>(null);
  const [adjStock, setAdjStock] = useState('');
  const [adjParMin, setAdjParMin] = useState('');
  const [savingAdj, setSavingAdj] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/inventory', {
        params: { startDate, endDate, category: categoryFilter, branchId },
      });
      const d = res.data?.data || {};
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      setCategories(Array.isArray(d.categories) ? d.categories : []);
      if (d.kpis) setKpis(d.kpis);
      setExpiringBatches(Array.isArray(d.expiringBatches) ? d.expiringBatches : []);
      setCapitalization(Array.isArray(d.capitalizationByCategory) ? d.capitalizationByCategory : []);
      setItems(Array.isArray(d.items) ? d.items : []);
    } catch (err) {
      console.error('Failed to load inventory valuation', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, categoryFilter, branchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, statusFilter, search]);

  const maxCatValue = useMemo(
    () => Math.max(...capitalization.map((c) => Number(c.totalValue || 0)), 1),
    [capitalization]
  );

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjusting) return;
    try {
      setSavingAdj(true);
      await api.patch(`/analytics/inventory/${adjusting.id}`, {
        physicalStock: Number(adjStock),
        parMin: Number(adjParMin),
      });
      setAdjusting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update stock count.');
    } finally {
      setSavingAdj(false);
    }
  };

  const handleExportStockCsv = () => {
    const header = ['Product Name', 'SKU', 'Category', 'Physical Stock', 'Base Unit', 'Unit Cost (KES)', 'Book Value (KES)', 'Par Min', 'Status'];
    const rows = filteredItems.map((i) => [
      i.name,
      i.sku,
      i.category,
      i.physicalStock,
      i.baseUnit,
      Number(i.unitCost).toFixed(2),
      Number(i.bookValue).toFixed(2),
      i.parMin,
      i.status,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SokoPoint-Inventory-Valuation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status: string) => {
    if (status === 'DEPLETED') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          Depleted (0)
        </span>
      );
    }
    if (status === 'REORDER') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          Reorder Urgently
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Adequate
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Reporting Hub &rsaquo; Inventory Valuation &amp; Depletion
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <Boxes className="h-6 w-6 text-[#0554F4]" />
            Inventory Valuation &amp; Depletion Analysis
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Audit retail &amp; wholesale inventory asset valuations, stock-out vulnerabilities, batch expiration dates, and departmental shrinkage write-offs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportStockCsv}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Stock (CSV)
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs font-mono font-bold text-[#041F56] bg-transparent outline-none"
          />
          <span className="text-slate-400 text-xs">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs font-mono font-bold text-[#041F56] bg-transparent outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
        >
          <option value="ALL">All Merchandise Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
          className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
        >
          <option value="ALL">All Branch Warehouses</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : (
        <>
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL ASSET VALUATION</p>
              <p className="text-xl font-black text-[#041F56] font-mono mt-1">
                KES {Math.round(kpis.totalAssetValuation).toLocaleString('en-KE')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{kpis.totalSkus} Catalog SKUs</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STOCK DEPLETIONS</p>
              <p className="text-xl font-black text-rose-600 mt-1">{kpis.depletedCount}</p>
              <p className="text-[11px] text-rose-500 mt-0.5">Zero Stock Level</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REORDER WARNINGS</p>
              <p className="text-xl font-black text-amber-600 mt-1">{kpis.reorderCount}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Below Par Min Threshold</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ADEQUATE INVENTORY</p>
              <p className="text-xl font-black text-emerald-600 mt-1">{kpis.adequateCount}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Sufficient Headroom</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SPOILAGE &amp; WASTE LOSS</p>
              <p className="text-xl font-black text-purple-600 font-mono mt-1">
                KES {Math.round(kpis.wasteLoss).toLocaleString('en-KE')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">{kpis.wasteCount} Scrap / Shrinkage Logged</p>
            </div>
          </div>

          {/* 2 Split Panels: Expiry Radar + Capitalization by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Critical Batch Expiry Radar */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-extrabold text-[#041F56]">Critical Batch Expiry Radar</h2>
                  <p className="text-[11px] text-slate-400">Stock batches expiring within the next 30 days</p>
                </div>
              </div>

              {expiringBatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center space-y-1.5">
                  <ShieldCheck className="h-7 w-7 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-[#041F56]">No Expiring Batches Detected</p>
                  <p className="text-[11px] text-slate-400">All tracked SKUs are within safe shelf-life windows.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {expiringBatches.map((b, idx) => {
                    const isExpired = Number(b.daysLeft) <= 0;
                    return (
                      <div
                        key={idx}
                        className={`rounded-2xl border px-4 py-3 flex justify-between items-center gap-3 ${
                          isExpired
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-amber-50/40 border-amber-200/80'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#041F56] truncate">{b.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Lot: {b.lotRef} &bull; Qty: {b.qty}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-[11px] font-extrabold ${isExpired ? 'text-rose-600' : 'text-amber-600'}`}>
                            {isExpired ? 'Expired' : `${b.daysLeft} days left`}
                          </p>
                          <p className="text-[10px] font-mono text-slate-500">
                            KES {Math.round(Number(b.bookValue || 0)).toLocaleString('en-KE')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Capitalization by Merchandise Category */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-extrabold text-[#041F56]">Capitalization by Merchandise Category</h2>
                  <p className="text-[11px] text-slate-400">Proportion of financial assets tied up in inventory</p>
                </div>
                <button
                  onClick={handleExportStockCsv}
                  className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                >
                  Export Valuation
                </button>
              </div>

              {capitalization.length === 0 ? (
                <p className="text-xs text-slate-400 py-10 text-center">No inventory capitalization data available.</p>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                  {capitalization.map((c, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-extrabold text-[#041F56] uppercase">
                          {c.category}{' '}
                          <span className="font-normal text-slate-400 normal-case ml-1">
                            ({c.skuCount} SKUs &bull; {Number(c.totalUnits).toLocaleString('en-KE')} units)
                          </span>
                        </span>
                        <span className="font-mono font-bold text-[#041F56]">
                          KES {Math.round(Number(c.totalValue || 0)).toLocaleString('en-KE')}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0554F4] rounded-full transition-all"
                          style={{ width: `${Math.max(2, Math.round((Number(c.totalValue || 0) / maxCatValue) * 100))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stock-on-Hand Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div>
                <h2 className="text-xs font-extrabold text-[#041F56] uppercase tracking-wider">
                  STOCK-ON-HAND LEDGER ({filteredItems.length} SKUS)
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Physical counts, par levels, and unit cost valuations
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                >
                  <option value="ALL">All Stock Statuses</option>
                  <option value="ADEQUATE">Adequate Level</option>
                  <option value="REORDER">Below Par Threshold</option>
                  <option value="DEPLETED">Depleted (0 Count)</option>
                </select>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product or SKU..."
                    className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">PRODUCT / SKU</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CATEGORY</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">PHYSICAL STOCK</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">BASE UNIT</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">UNIT COST</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">BOOK VALUE</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">PAR MIN</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        No inventory SKUs match your active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[#041F56]">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</p>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-600 uppercase text-[11px]">
                          {item.category}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-[#041F56]">
                          {Number(item.physicalStock).toLocaleString('en-KE')}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">{item.baseUnit}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                          KES {Number(item.unitCost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0554F4]">
                          KES {Number(item.bookValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-500">
                          {Number(item.parMin).toLocaleString('en-KE')}
                        </td>
                        <td className="px-4 py-3.5">{renderStatusBadge(item.status)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setAdjusting(item);
                              setAdjStock(String(item.physicalStock));
                              setAdjParMin(String(item.parMin));
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                          >
                            <SlidersHorizontal className="h-3 w-3" /> Adjust
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* BIDIRECTIONAL STOCK & PAR LEVEL ADJUSTMENT MODAL */}
      {adjusting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-[#041F56]">Adjust Physical Stock &amp; Par Min</h2>
                <p className="text-xs text-[#176E84] mt-0.5">
                  {adjusting.name} ({adjusting.sku})
                </p>
              </div>
              <button onClick={() => setAdjusting(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Physical Stock *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={adjStock}
                    onChange={(e) => setAdjStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Par Min Threshold *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={adjParMin}
                    onChange={(e) => setAdjParMin(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjusting(null)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdj}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingAdj && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Sync Stock Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}