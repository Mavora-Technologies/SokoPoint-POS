'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import api from '../../../../lib/api';
import { Award, RefreshCw, TrendingUp, Trophy, Search, AlertCircle } from 'lucide-react';

interface StaffMetric {
  userId: string;
  name: string;
  email: string;
  transactionsProcessed: number;
  totalRevenue: number;
  avgBasketValue: number;
}

export default function StaffPerformancePage(): JSX.Element {
  const [metrics, setMetrics] = useState<StaffMetric[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/performance');
      const list: StaffMetric[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setMetrics(list.sort((a, b) => b.totalRevenue - a.totalRevenue));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load staff performance metrics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.totalRevenue || 0), 0);
  const totalTx = metrics.reduce((sum, m) => sum + Number(m.transactionsProcessed || 0), 0);

  const filtered = metrics.filter((m) =>
    !searchTerm.trim()
      ? true
      : m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-gray-400 tracking-wide mb-1">
            Staff Directory &rsaquo; <span className="text-[#041F56]">Talent &amp; Workforce Performance</span>
          </p>
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Workforce Performance &amp; KPI Evaluation Tower
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Monitor real-time retail checkout throughput, wholesale sales revenue, and average basket values per cashier.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMetrics}
          className="p-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-2xl"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase">ASSOCIATE SALES TOTAL</span>
            <h2 className="text-2xl font-black text-[#041F56] font-mono mt-2">
              KES {totalRevenue.toLocaleString('en-KE')}
            </h2>
          </div>
          <div className="p-3 bg-blue-50 text-[#0554F4] rounded-2xl"><TrendingUp className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase">TOTAL CHECKOUTS</span>
            <h2 className="text-2xl font-black text-emerald-600 font-mono mt-2">{totalTx}</h2>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Trophy className="w-5 h-5" /></div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-gray-400 uppercase">TRACKED STAFF</span>
            <h2 className="text-2xl font-black text-purple-700 font-mono mt-2">{metrics.length}</h2>
          </div>
          <div className="p-3 bg-purple-50 text-purple-700 rounded-2xl"><Award className="w-5 h-5" /></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <h2 className="text-xs font-black text-[#041F56] uppercase tracking-wider inline-flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Live Sales &amp; Efficiency Leaderboard
          </h2>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cashier or sales rep..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 bg-gray-50/50 outline-none focus:ring-2 focus:ring-[#0554F4]"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[780px] divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">RANK &amp; ASSOCIATE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">GROSS SALES GENERATED</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">SALES FULFILLED</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">AVG BASKET VALUE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                    Loading staff leaderboard...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center text-gray-400">
                    No staff performance records found.
                  </td>
                </tr>
              ) : (
                filtered.map((row, idx) => (
                  <tr key={row.userId} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-mono font-black text-[11px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-[#041F56]">{row.name}</p>
                          <p className="text-[10px] text-gray-400">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-[#0554F4]">
                      KES {Number(row.totalRevenue).toLocaleString('en-KE')}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-700">{row.transactionsProcessed} sales</td>
                    <td className="px-6 py-4 font-mono text-gray-700">
                      KES {Number(row.avgBasketValue).toLocaleString('en-KE')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}