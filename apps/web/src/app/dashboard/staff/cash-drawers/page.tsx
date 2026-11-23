'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import api from '../../../../lib/api';
import { Wallet, RefreshCw, AlertCircle } from 'lucide-react';

interface DrawerRow {
  id: string;
  custodianName: string;
  email: string;
  terminal: string;
  status: string;
  expectedCash: number;
  variance: number;
}

export default function CashDrawerCustodiansPage(): JSX.Element {
  const [drawers, setDrawers] = useState<DrawerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/cash-drawers');
      setDrawers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load cash drawer custodians.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalExpected = drawers.reduce((sum, d) => sum + Number(d.expectedCash || 0), 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-1">
            Staff Directory &rsaquo; <span className="text-[#041F56]">Cashier Custody &amp; Till Authorization</span>
          </p>
          <div className="flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Cash Drawer Custodians &amp; Terminal Allocations
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Monitor designated retail &amp; supermarket till custodians and reconcile expected cash from live POS orders.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">ACTIVE CUSTODIANS</span>
          <h2 className="text-2xl font-black text-emerald-600 mt-1.5">&bull; {drawers.length} Tills</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">EXPECTED CASH TOTAL</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">
            KES {totalExpected.toLocaleString('en-KE')}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">VARIANCE ALERTS</span>
          <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">0</h2>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[780px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">ASSIGNED CUSTODIAN</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TERMINAL</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">EXPECTED CASH</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CUSTODY STATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {drawers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-14 text-center text-gray-400">
                  No cash drawer custodians found.
                </td>
              </tr>
            ) : (
              drawers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#041F56]">{d.custodianName}</p>
                    <p className="text-[10px] text-gray-400">{d.email}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-700">{d.terminal}</td>
                  <td className="px-6 py-4 font-mono font-black text-[#041F56]">
                    KES {Number(d.expectedCash).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}