'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  RefreshCw,
  DollarSign,
  Package,
  Percent,
  AlertTriangle,
  Search,
  Store,
  Tags,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import api from '../../../../lib/api';

type PresetRange = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

interface SkuMarginRow {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  unitsSold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
}

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const getPresetDates = (preset: Exclude<PresetRange, 'CUSTOM'>) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'TODAY') {
    const s = toIsoDate(today);
    return { start: s, end: s };
  }
  if (preset === 'THIS_WEEK') {
    const day = today.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday start
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    return { start: toIsoDate(start), end: toIsoDate(today) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: toIsoDate(start), end: toIsoDate(today) };
};

export default function AnalyticsMarginsPage() {
  const [preset, setPreset] = useState<PresetRange>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => getPresetDates('THIS_MONTH').start);
  const [endDate, setEndDate] = useState(() => getPresetDates('THIS_MONTH').end);
  const [branchId, setBranchId] = useState('ALL');

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    blendedMarginPct: 0,
    lowMarginSkuCount: 0,
    trackedSkuCount: 0,
  });
  const [trend, setTrend] = useState<any[]>([]);
  const [categoryMargins, setCategoryMargins] = useState<any[]>([]);
  const [branchMargins, setBranchMargins] = useState<any[]>([]);
  const [skuMargins, setSkuMargins] = useState<SkuMarginRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'HIGH' | 'LOW'>('ALL');

  // Bidirectional SKU Pricing Edit Modal
  const [editingSku, setEditingSku] = useState<SkuMarginRow | null>(null);
  const [editCost, setEditCost] = useState('');
  const [editSell, setEditSell] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const loadMargins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/margins', {
        params: { startDate, endDate, branchId },
      });
      const d = res.data?.data || {};
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      if (d.kpis) setKpis(d.kpis);
      setTrend(Array.isArray(d.trend) ? d.trend : []);
      setCategoryMargins(Array.isArray(d.categoryMargins) ? d.categoryMargins : []);
      setBranchMargins(Array.isArray(d.branchMargins) ? d.branchMargins : []);
      setSkuMargins(Array.isArray(d.skuMargins) ? d.skuMargins : []);
    } catch (err) {
      console.error('Failed to load margin intelligence', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, branchId]);

  useEffect(() => {
    loadMargins();
  }, [loadMargins]);

  const applyPreset = (next: Exclude<PresetRange, 'CUSTOM'>) => {
    setPreset(next);
    const { start, end } = getPresetDates(next);
    setStartDate(start);
    setEndDate(end);
  };

  const filteredSkus = useMemo(() => {
    return skuMargins.filter((s) => {
      if (healthFilter === 'HIGH' && s.marginPct < 30) return false;
      if (healthFilter === 'LOW' && s.marginPct >= 15) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        s.productName.toLowerCase().includes(q) ||
        s.sku.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [skuMargins, healthFilter, search]);

  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSku) return;
    try {
      setSavingPrice(true);
      await api.patch(`/analytics/margins/sku/${editingSku.productId}`, {
        costPrice: Number(editCost),
        sellingPrice: Number(editSell),
      });
      setEditingSku(null);
      await loadMargins();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update SKU pricing.');
    } finally {
      setSavingPrice(false);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'SKU',
      'Product Name',
      'Category',
      'Units Sold',
      'Unit Cost (KES)',
      'Selling Price (KES)',
      'COGS (KES)',
      'Revenue (KES)',
      'Gross Profit (KES)',
      'Margin (%)',
    ];
    const rows = filteredSkus.map((s) => [
      s.sku,
      s.productName,
      s.category,
      s.unitsSold,
      Number(s.unitCost).toFixed(2),
      Number(s.unitPrice).toFixed(2),
      Number(s.cogs).toFixed(2),
      Number(s.revenue).toFixed(2),
      Number(s.grossProfit).toFixed(2),
      `${s.marginPct}%`,
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SokoPoint-Margins-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMarginBadge = (pct: number) => {
    if (pct < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          LOSS ({pct}%)
        </span>
      );
    }
    if (pct < 15) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          LOW ({pct}%)
        </span>
      );
    }
    if (pct >= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          HIGH ({pct}%)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
        HEALTHY ({pct}%)
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; SuiteAnalytics Hub &rsaquo; Profitability
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-[#0554F4]" />
            Gross Margin &amp; SKU Profitability Intelligence
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Live COGS vs. retail &amp; wholesale revenue analysis, department margin rankings, and direct SKU pricing optimization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export Margins CSV
          </button>
          <button
            onClick={loadMargins}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dynamic Timeframe Filter Strip (TODAY, THIS WEEK, THIS MONTH) */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: 'TODAY', label: 'TODAY' },
              { key: 'THIS_WEEK', label: 'THIS WEEK' },
              { key: 'THIS_MONTH', label: 'THIS MONTH' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-4 py-2 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer ${
                preset === p.key
                  ? 'bg-[#041F56] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setPreset('CUSTOM');
                setStartDate(e.target.value);
              }}
              className="text-xs font-mono font-bold text-[#041F56] bg-transparent outline-none"
            />
            <span className="text-slate-400 text-xs">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setPreset('CUSTOM');
                setEndDate(e.target.value);
              }}
              className="text-xs font-mono font-bold text-[#041F56] bg-transparent outline-none"
            />
          </div>

          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
          >
            <option value="ALL">All Branch Locations</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : (
        <>
          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GROSS REVENUE</p>
                <p className="text-xl font-black text-[#041F56] font-mono mt-1">
                  KES {Math.round(kpis.totalRevenue).toLocaleString('en-KE')}
                </p>
                <p className="text-[11px] text-[#0554F4] mt-0.5">{kpis.trackedSkuCount} Active SKUs Sold</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COST OF GOODS (COGS)</p>
                <p className="text-xl font-black text-amber-600 font-mono mt-1">
                  KES {Math.round(kpis.totalCogs).toLocaleString('en-KE')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Weighted unit cost basis</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Package className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GROSS PROFIT</p>
                <p
                  className={`text-xl font-black font-mono mt-1 ${
                    kpis.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  KES {Math.round(kpis.grossProfit).toLocaleString('en-KE')}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Revenue less COGS</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BLENDED GROSS MARGIN</p>
                <p className="text-xl font-black text-purple-600 font-mono mt-1">{kpis.blendedMarginPct}%</p>
                <p className="text-[11px] text-rose-500 mt-0.5 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {kpis.lowMarginSkuCount} Low-Margin SKUs (&lt;15%)
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Percent className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Trend Chart + Category & Branch Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Revenue vs COGS Trend */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="text-sm font-extrabold text-[#041F56]">Revenue vs. COGS &amp; Gross Profit Trend</h2>
                <p className="text-[11px] text-slate-400">Daily profitability spread across selected timeframe</p>
              </div>
              <div className="h-64 w-full">
                {trend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No sales recorded for this timeframe.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip formatter={(val: any) => `KES ${Number(val).toLocaleString('en-KE')}`} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0554F4" fill="#0554F4" fillOpacity={0.12} strokeWidth={2} />
                      <Area type="monotone" dataKey="cogs" name="COGS" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="grossProfit" name="Gross Profit" stroke="#10b981" fill="#10b981" fillOpacity={0.18} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Category & Branch Margins */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-extrabold text-[#041F56]">Department Margin Ranking</h2>
                  <Tags className="h-4 w-4 text-[#0554F4]" />
                </div>
                {categoryMargins.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No category data.</p>
                ) : (
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {categoryMargins.map((c, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#041F56] truncate pr-2">{c.category}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-slate-600">
                            KES {Math.round(c.grossProfit).toLocaleString('en-KE')}
                          </span>
                          {renderMarginBadge(c.marginPct)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-extrabold text-[#041F56]">Branch Margin Performance</h2>
                  <Store className="h-4 w-4 text-[#0554F4]" />
                </div>
                {branchMargins.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No branch data.</p>
                ) : (
                  <div className="space-y-2.5 max-h-36 overflow-y-auto pr-1">
                    {branchMargins.map((b, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[#041F56] truncate pr-2">{b.branchName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-emerald-600 font-bold">
                            KES {Math.round(b.grossProfit).toLocaleString('en-KE')}
                          </span>
                          {renderMarginBadge(b.marginPct)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SKU Profitability Ledger */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-[#041F56]">SKU Margin &amp; Pricing Optimization Ledger</h2>
                <p className="text-[11px] text-slate-400">Click Adjust Price on any SKU to update cost/selling prices bidirectionally</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
                  {[
                    { key: 'ALL', label: 'All SKUs' },
                    { key: 'HIGH', label: 'High Margin (≥30%)' },
                    { key: 'LOW', label: 'Low Margin (<15%)' },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setHealthFilter(t.key as any)}
                      className={`px-3 py-1 rounded-lg text-xs cursor-pointer ${
                        healthFilter === t.key ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search SKU or product..."
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
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">UNITS</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">UNIT COST</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">SELL PRICE</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">REVENUE</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">GROSS PROFIT</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">MARGIN</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSkus.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-slate-400">
                        No SKU margin records found for the selected timeframe.
                      </td>
                    </tr>
                  ) : (
                    filteredSkus.map((s) => (
                      <tr key={s.productId} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-[#041F56]">{s.productName}</p>
                          <p className="text-[10px] font-mono text-slate-400">{s.sku}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-600">{s.category}</td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-700">{s.unitsSold}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-600">
                          KES {Number(s.unitCost).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-[#041F56]">
                          KES {Number(s.unitPrice).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0554F4]">
                          KES {Number(s.revenue).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-mono font-bold ${
                            s.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          KES {Number(s.grossProfit).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5">{renderMarginBadge(s.marginPct)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setEditingSku(s);
                              setEditCost(String(s.unitCost));
                              setEditSell(String(s.unitPrice));
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                          >
                            <Pencil className="h-3 w-3" /> Adjust
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

      {/* BIDIRECTIONAL SKU PRICING MODAL */}
      {editingSku && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-[#041F56]">Adjust SKU Cost &amp; Selling Price</h2>
                <p className="text-xs text-[#176E84] mt-0.5">
                  {editingSku.productName} ({editingSku.sku})
                </p>
              </div>
              <button onClick={() => setEditingSku(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSavePricing} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Unit Cost Price (KES) *</label>
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
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-3 text-xs flex justify-between">
                <span className="text-slate-500">Projected Unit Margin:</span>
                <span className="font-mono font-extrabold text-[#041F56]">
                  {Number(editSell) > 0
                    ? `${(((Number(editSell) - Number(editCost)) / Number(editSell)) * 100).toFixed(1)}%`
                    : '0.0%'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSku(null)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingPrice && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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