'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import api from '../../../../lib/api';

interface StaffMetric {
  userId: string;
  name: string;
  email: string;
  transactionsProcessed: number;
  totalRevenue: number;
  avgBasketValue: number;
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<StaffMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/performance');
      setMetrics(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load staff performance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <BarChart3 className="h-6 w-6 text-[#0554F4]" />
          Cashier Performance Metrics
        </h1>
        <p className="text-sm text-slate-500 mt-1">Sales throughput, revenue handled, and average basket size per staff member.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4]" /></div>
        ) : metrics.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <BarChart3 className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold">No cashier performance data yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Cashier / Sales Rep</th>
                  <th className="py-3.5 px-4">Transactions</th>
                  <th className="py-3.5 px-4">Total Sales Revenue</th>
                  <th className="py-3.5 px-4">Avg Basket Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {metrics.map((m) => (
                  <tr key={m.userId} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700">{m.transactionsProcessed}</td>
                    <td className="py-3.5 px-4 font-black text-[#62C02A]">
                      KES {Number(m.totalRevenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      KES {Number(m.avgBasketValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}