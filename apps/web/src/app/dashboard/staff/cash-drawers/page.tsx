'use client';

import { useState, useEffect, useCallback } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import api from '../../../../lib/api';

interface CashDrawerCustodian {
  id: string;
  custodianName: string;
  email: string;
  terminal: string;
  status: string;
  expectedCash: number;
  variance: number;
}

export default function CashDrawersPage() {
  const [drawers, setDrawers] = useState<CashDrawerCustodian[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrawers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/cash-drawers');
      setDrawers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load cash drawers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrawers();
  }, [loadDrawers]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <Banknote className="h-6 w-6 text-[#62C02A]" />
          Cash Drawer Custodians
        </h1>
        <p className="text-sm text-slate-500 mt-1">Live cash accountability reconciled directly from tenant POS orders.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4]" /></div>
        ) : drawers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Banknote className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold">No cash drawer custodians found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Custodian</th>
                  <th className="py-3.5 px-4">Terminal</th>
                  <th className="py-3.5 px-4">Expected Cash</th>
                  <th className="py-3.5 px-4">Variance</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {drawers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{d.custodianName}</p>
                      <p className="text-xs text-slate-400">{d.email}</p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{d.terminal}</td>
                    <td className="py-3.5 px-4 font-black text-slate-900">
                      KES {Number(d.expectedCash).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">
                      KES {Number(d.variance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                        {d.status}
                      </span>
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