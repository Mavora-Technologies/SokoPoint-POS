'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  RefreshCw,
  DollarSign,
  Percent,
  Receipt,
  BarChart3,
  Store,
  Loader2,
  Tags,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../../../lib/api';

type PresetRange = 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM';

const PIE_COLORS = ['#0554F4', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'];

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

const getPresetDates = (preset: Exclude<PresetRange, 'CUSTOM'>) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (preset === 'TODAY') {
    const s = toIsoDate(today);
    return { start: s, end: s };
  }
  if (preset === 'YESTERDAY') {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const s = toIsoDate(y);
    return { start: s, end: s };
  }
  if (preset === 'THIS_WEEK') {
    const day = today.getDay(); // 0 = Sun
    const diff = day === 0 ? 6 : day - 1; // Monday start
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    return { start: toIsoDate(start), end: toIsoDate(today) };
  }
  // THIS_MONTH
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: toIsoDate(start), end: toIsoDate(today) };
};

export default function ReportsClient() {
  const [preset, setPreset] = useState<PresetRange>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => getPresetDates('THIS_MONTH').start);
  const [endDate, setEndDate] = useState(() => getPresetDates('THIS_MONTH').end);
  const [branchId, setBranchId] = useState('ALL');

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState({
    grossSales: 0,
    netSales: 0,
    totalTax: 0,
    voidedAmount: 0,
    voidedCount: 0,
    fulfilledOrders: 0,
    totalOrders: 0,
    activeBranches: 0,
    avgOrderValue: 0,
    avgSalesByBranch: 0,
  });
  const [trend, setTrend] = useState<any[]>([]);
  const [topBranches, setTopBranches] = useState<any[]>([]);
  const [paymentMix, setPaymentMix] = useState<any[]>([]);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/sales-overview', {
        params: { startDate, endDate, branchId },
      });
      const d = res.data?.data || {};
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      if (d.kpis) setKpis(d.kpis);
      setTrend(Array.isArray(d.trend) ? d.trend : []);
      setTopBranches(Array.isArray(d.topBranches) ? d.topBranches : []);
      setPaymentMix(Array.isArray(d.paymentMix) ? d.paymentMix : []);
      setCategorySales(Array.isArray(d.categorySales) ? d.categorySales : []);
      setTopProducts(Array.isArray(d.topProducts) ? d.topProducts : []);
    } catch (err) {
      console.error('Failed to load sales overview', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, branchId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const applyPreset = (next: Exclude<PresetRange, 'CUSTOM'>) => {
    setPreset(next);
    const { start, end } = getPresetDates(next);
    setStartDate(start);
    setEndDate(end);
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await api.get('/reports/export', {
        params: { startDate, endDate, branchId },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SokoPoint-Sales-${startDate}-to-${endDate}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportTopProducts = () => {
    const rows = [
      ['Item Name', 'SKU', 'Units Sold', 'Gross Revenue (KES)'],
      ...topProducts.map((p) => [p.itemName, p.sku || '', p.unitsSold, Number(p.grossRevenue || 0).toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SokoPoint-Top-Products-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxBranchRev = useMemo(() => Math.max(...topBranches.map((b) => Number(b.revenue || 0)), 1), [topBranches]);
  const maxCatRev = useMemo(() => Math.max(...categorySales.map((c) => Number(c.revenue || 0)), 1), [categorySales]);
  const maxOrdersInBucket = useMemo(() => Math.max(...trend.map((t) => Number(t.orderVolume || 0)), 0), [trend]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Reporting Hub &rsaquo; Sales Overview
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <TrendingUp className="h-6 w-6 text-[#0554F4]" />
            Retail &amp; Wholesale Sales Overview
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Real-time omnichannel sales analytics, visual trends, volume velocity, and multi-branch rankings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
          <button
            onClick={loadOverview}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dynamic Timeframe & Branch Filter Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          {(
            [
              { key: 'TODAY', label: 'TODAY' },
              { key: 'YESTERDAY', label: 'YESTERDAY' },
              { key: 'THIS_WEEK', label: 'THIS WEEK' },
              { key: 'THIS_MONTH', label: 'THIS MONTH' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              onClick={() => applyPreset(p.key)}
              className={`px-3.5 py-2 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer ${
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
          {/* 5 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SALES AMOUNT</p>
                <p className="text-lg font-black text-[#041F56] font-mono mt-1">
                  KES {Math.round(kpis.grossSales).toLocaleString('en-KE')}
                </p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  Net: KES {Math.round(kpis.netSales).toLocaleString('en-KE')}
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VOIDED / REFUNDS</p>
                <p className="text-lg font-black text-amber-600 font-mono mt-1">
                  KES {Math.round(kpis.voidedAmount).toLocaleString('en-KE')}
                </p>
                <p className="text-[11px] text-rose-500 mt-0.5">{kpis.voidedCount} Voided Orders</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Percent className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NO OF ORDERS</p>
                <p className="text-lg font-black text-[#041F56] mt-1">{kpis.totalOrders.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{kpis.fulfilledOrders} Fulfilled</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AVG ORDER VALUE</p>
                <p className="text-lg font-black text-[#0554F4] font-mono mt-1">
                  KES {kpis.avgOrderValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Ticket Velocity</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AVG SALES BY BRANCH</p>
                <p className="text-lg font-black text-purple-600 font-mono mt-1">
                  KES {Math.round(kpis.avgSalesByBranch).toLocaleString('en-KE')}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{kpis.activeBranches} Branches Active</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* 2 Main Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Sales Trend Area Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="text-sm font-extrabold text-[#041F56]">Sales Revenue Trend</h2>
                <p className="text-[11px] text-slate-400">Continuous gross revenue flow across selected timeframe</p>
              </div>
              <div className="h-64 w-full">
                {trend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No sales recorded in this date window.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0554F4" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#0554F4" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip formatter={(val: any) => [`KES ${Number(val).toLocaleString('en-KE')}`, 'Gross Sales']} />
                      <Area
                        type="monotone"
                        dataKey="grossCollections"
                        stroke="#0554F4"
                        strokeWidth={2.5}
                        fill="url(#salesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Order Volume Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-sm font-extrabold text-[#041F56]">No of Orders by Period</h2>
                  <p className="text-[11px] text-slate-400">Total customer transaction density per bucket</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Volume Max: {maxOrdersInBucket}</span>
              </div>
              <div className="h-64 w-full">
                {trend.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No order volume in this date window.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip formatter={(val: any) => [`${val} Orders`, 'Volume']} />
                      <Bar dataKey="orderVolume" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 3 Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top Branches by Sales */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold text-[#041F56]">Top Branches by Sales</h2>
                  <p className="text-[11px] text-slate-400">Branch revenue distribution</p>
                </div>
                <Store className="h-4 w-4 text-[#0554F4]" />
              </div>
              {topBranches.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No branch sales data.</p>
              ) : (
                <div className="space-y-3.5">
                  {topBranches.map((b, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#041F56] truncate pr-2">
                          <span className="text-[#0554F4] mr-1.5">{idx + 1}</span>
                          {b.branchName}
                        </span>
                        <span className="font-mono font-bold text-[#0554F4] shrink-0">
                          KES {Math.round(Number(b.revenue || 0)).toLocaleString('en-KE')}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0554F4] rounded-full"
                          style={{ width: `${Math.round((Number(b.revenue || 0) / maxBranchRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sales by Payment Method */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold text-[#041F56]">Sales by Payment Method</h2>
                  <p className="text-[11px] text-slate-400">Tender mix breakdown</p>
                </div>
                <button onClick={handleExportCsv} className="text-[11px] font-bold text-[#0554F4] hover:underline cursor-pointer">
                  Export
                </button>
              </div>
              {paymentMix.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No payment data.</p>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentMix}
                          dataKey="total"
                          nameKey="method"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {paymentMix.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(val: any) => `KES ${Number(val).toLocaleString('en-KE')}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full space-y-1.5 mt-2">
                    {paymentMix.map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                          />
                          {p.method}
                        </span>
                        <span className="font-mono font-bold text-[#041F56]">
                          KES {Math.round(Number(p.total || 0)).toLocaleString('en-KE')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sales by Product Category */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-extrabold text-[#041F56]">Sales by Product Category</h2>
                  <p className="text-[11px] text-slate-400">Revenue split across merchandise departments</p>
                </div>
                <Tags className="h-4 w-4 text-[#0554F4]" />
              </div>
              {categorySales.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No category sales data.</p>
              ) : (
                <div className="space-y-3.5">
                  {categorySales.map((c, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-[#041F56] truncate pr-2">{c.category}</span>
                        <span className="font-mono font-bold text-slate-700 shrink-0">
                          KES {Math.round(Number(c.revenue || 0)).toLocaleString('en-KE')}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${Math.round((Number(c.revenue || 0) / maxCatRev) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Product Sales Velocity */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-[#041F56]">Top Product Sales Velocity</h2>
                <p className="text-[11px] text-slate-400">Best-selling retail &amp; wholesale SKUs by revenue and unit count</p>
              </div>
              <button
                onClick={handleExportTopProducts}
                className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
              >
                Export Items
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">ITEM NAME</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">UNITS SOLD</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">GROSS REVENUE (KES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-10 text-center text-slate-400">
                        No product sales recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    topProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-bold text-[#041F56]">
                          {p.itemName}
                          {p.sku && <span className="ml-2 text-[10px] font-mono text-slate-400">{p.sku}</span>}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">{p.unitsSold}</td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-[#0554F4]">
                          {Number(p.grossRevenue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Periodic Revenue Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-xs font-extrabold text-[#041F56] uppercase tracking-wider">PERIODIC REVENUE TIMELINE</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Detailed performance ledger over the selected period</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">TIME PERIOD</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">ORDER VOLUME</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">NET SALES (EXCL. TAX)</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">STATUTORY TAX</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">TOTAL GROSS COLLECTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trend.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400">
                        No periodic revenue records for this timeframe.
                      </td>
                    </tr>
                  ) : (
                    trend.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="px-6 py-3.5 font-mono font-bold text-[#041F56]">{t.period}</td>
                        <td className="px-4 py-3.5 text-slate-600">{t.orderVolume} orders</td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-700">
                          KES {Number(t.netSales || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-semibold text-purple-600">
                          KES {Number(t.statutoryTax || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right font-mono font-bold text-[#0554F4]">
                          KES {Number(t.grossCollections || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
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
    </div>
  );
}