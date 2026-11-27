'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  RefreshCw,
  DollarSign,
  Users,
  ShieldCheck,
  Clock,
  Database,
  ShoppingCart,
  SlidersHorizontal,
  Loader2,
  X,
  Package,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api from '../../../../lib/api';

export default function AiForecastingPage() {
  const [horizon, setHorizon] = useState<7 | 14 | 30>(7);
  const [branchId, setBranchId] = useState('ALL');
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [recordedOrders, setRecordedOrders] = useState(0);
  const [settings, setSettings] = useState({
    targetLaborRatio: 12,
    avgHourlyWage: 250,
    defaultHorizonDays: 7,
  });
  const [kpis, setKpis] = useState({
    projectedSales: 0,
    projectedTransactions: 0,
    laborBudgetCeiling: 0,
    optimalLaborHours: 0,
  });
  const [dailyForecast, setDailyForecast] = useState<any[]>([]);
  const [restockForecast, setRestockForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Settings Modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editRatio, setEditRatio] = useState('12');
  const [editWage, setEditWage] = useState('250');
  const [savingSettings, setSavingSettings] = useState(false);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/forecasting', {
        params: { horizon, branchId },
      });
      const d = res.data?.data || {};
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      setRecordedOrders(Number(d.recordedOrders || 0));
      if (d.settings) {
        setSettings(d.settings);
        setEditRatio(String(d.settings.targetLaborRatio));
        setEditWage(String(d.settings.avgHourlyWage));
      }
      if (d.kpis) setKpis(d.kpis);
      setDailyForecast(Array.isArray(d.dailyForecast) ? d.dailyForecast : []);
      setRestockForecast(Array.isArray(d.restockForecast) ? d.restockForecast : []);
    } catch (err) {
      console.error('Failed to load demand forecast', err);
    } finally {
      setLoading(false);
    }
  }, [horizon, branchId]);

  useEffect(() => {
    loadForecast();
  }, [loadForecast]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.put('/ai/forecasting/settings', {
        targetLaborRatio: Number(editRatio),
        avgHourlyWage: Number(editWage),
        defaultHorizonDays: horizon,
      });
      setIsSettingsOpen(false);
      await loadForecast();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update forecast parameters.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; AI Copilot &rsaquo; Workforce &amp; Demand Forecasting
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-[#0554F4]" />
            Predictive Demand &amp; Workforce Capacity Planning
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Statistical regression models aligning anticipated retail &amp; wholesale checkout traffic with optimal cashier/stockroom scheduling and wage budgets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
            {([7, 14, 30] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                  horizon === h ? 'bg-white text-[#041F56] shadow-xs' : 'text-slate-500'
                }`}
              >
                {h}D
              </button>
            ))}
          </div>

          {branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
            >
              <option value="ALL">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#0554F4]" /> Labor Model
          </button>

          <button
            onClick={loadForecast}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROJECTED SALES</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {Math.round(kpis.projectedSales).toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">{horizon}-Day Horizon</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROJECTED CHECKOUTS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">
              {kpis.projectedTransactions.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">Anticipated Footfall</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LABOR BUDGET CEILING</p>
            <p className="text-xl font-black text-purple-600 font-mono mt-1">
              KES {Math.round(kpis.laborBudgetCeiling).toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-purple-600 mt-0.5">Target {settings.targetLaborRatio}% Labor Ratio</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OPTIMAL LABOR HOURS</p>
            <p className="text-xl font-black text-amber-600 font-mono mt-1">{kpis.optimalLaborHours} hrs</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Cashiers &amp; Stockroom Combined</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Content or Empty State */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : recordedOrders === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-blue-200/80 py-20 px-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0554F4] flex items-center justify-center mx-auto">
            <Database className="h-6 w-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h2 className="text-base font-extrabold text-[#041F56]">No Operational History for this Account</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Predictive models require real POS transactions to train sales regression and labor curves. This workspace currently has{' '}
              <strong className="font-mono text-[#041F56]">0 recorded orders</strong>.
            </p>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
            <Link
              href="/dashboard/pos"
              className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <ShoppingCart className="h-4 w-4" /> Open POS Register
            </Link>
            <Link
              href="/dashboard/orders"
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl"
            >
              View Orders Ledger
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Revenue Forecast Chart + Daily Roster */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
              <div className="mb-4">
                <h2 className="text-sm font-extrabold text-[#041F56]">
                  {horizon}-Day Projected Sales Curve
                </h2>
                <p className="text-[11px] text-slate-400">
                  Trained on {recordedOrders} real POS orders with day-of-week seasonality
                </p>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyForecast}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip formatter={(val: any) => [`KES ${Number(val).toLocaleString('en-KE')}`, 'Projected Sales']} />
                    <Area
                      type="monotone"
                      dataKey="projectedRevenue"
                      stroke="#0554F4"
                      fill="#0554F4"
                      fillOpacity={0.14}
                      strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="text-xs font-extrabold text-[#041F56] uppercase tracking-wider">
                  DAILY SHIFT CAPACITY SCHEDULE
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#176E84] uppercase">DATE</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#176E84] uppercase text-right">EST. SALES</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-[#176E84] uppercase text-right">EST. CHECKOUTS</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-[#176E84] uppercase text-right">RECOMMENDED HOURS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dailyForecast.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3 font-bold text-[#041F56]">{d.dayLabel}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          KES {Math.round(d.projectedRevenue).toLocaleString('en-KE')}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{d.projectedOrders}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-amber-600">
                          {d.recommendedHours} hrs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Predictive SKU Restock Runway */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-[#041F56]">SKU Demand &amp; Restock Runway</h2>
                <p className="text-[11px] text-slate-400">Projected {horizon}-day unit demand vs. on-hand stock</p>
              </div>
              <Package className="h-4 w-4 text-[#0554F4]" />
            </div>
            <div className="divide-y divide-slate-100">
              {restockForecast.length === 0 ? (
                <p className="p-10 text-center text-xs text-slate-400">No itemized SKU velocity data yet.</p>
              ) : (
                restockForecast.map((s) => (
                  <div key={s.id} className="px-5 py-3.5 flex justify-between items-center gap-3 text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-[#041F56] truncate">{s.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">
                        On-Hand: {s.currentStock} &bull; Est. Demand: {s.projectedDemand}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {s.shortfall > 0 ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Restock +{s.shortfall}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {s.daysOfCover > 90 ? '90+ days' : `${s.daysOfCover}d cover`}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* LABOR MODEL SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-[#041F56]">Configure Labor Capacity Model</h2>
                <p className="text-xs text-[#176E84] mt-0.5">Adjust target payroll ratio &amp; average hourly wage</p>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Target Labor Ratio (% of Sales) *</label>
                <input
                  required
                  type="number"
                  min="1"
                  max="50"
                  step="0.5"
                  value={editRatio}
                  onChange={(e) => setEditRatio(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Average Hourly Wage (KES/hr) *</label>
                <input
                  required
                  type="number"
                  min="50"
                  step="10"
                  value={editWage}
                  onChange={(e) => setEditWage(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {savingSettings && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}