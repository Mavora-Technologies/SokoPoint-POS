'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, ArrowRightLeft, Loader2, ArrowRight, Package, RefreshCw } from 'lucide-react';
import api from '../../../../lib/api';

interface BranchTransfer {
  id: string;
  reference: string;
  date: string;
  sourceBranch: string;
  destinationBranch: string;
  productName: string;
  sku: string;
  quantity: number;
  status: 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'REJECTED';
  requestedBy: string;
}

export default function BranchTransfersPage() {
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/transfers');
      setTransfers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/inventory/transfers/${id}/status`, { status });
      await fetchTransfers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update transfer status.');
    }
  };

  const filtered = transfers.filter(
    (t) =>
      (t.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.destinationBranch || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" /> Inter-Branch Transfers
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track internal stock transfers between your tenant branches.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchTransfers} className="p-2.5 bg-white border border-slate-200 rounded-xl"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/dashboard/inventory/transfers/new" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
            <ArrowRightLeft className="h-4 w-4" /> Request New Transfer
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Transfer #, Branch, or Product..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[860px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Transfer # &amp; Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Route</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product &amp; SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No branch transfers recorded yet</p>
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4"><p className="font-mono font-bold text-slate-900">{t.reference}</p><p className="text-xs text-slate-500">{new Date(t.date).toLocaleDateString('en-GB')}</p></td>
                  <td className="px-6 py-4"><p className="font-bold text-slate-700">{t.sourceBranch}</p><p className="text-xs text-slate-400 flex items-center gap-1"><ArrowRight className="h-3 w-3" /> {t.destinationBranch}</p></td>
                  <td className="px-6 py-4"><p className="font-bold text-slate-900">{t.productName}</p><p className="text-xs font-mono text-slate-400">{t.sku}</p></td>
                  <td className="px-6 py-4 font-black">{t.quantity} units</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] uppercase font-black rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{t.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    {t.status === 'PENDING' && (
                      <button onClick={() => handleUpdateStatus(t.id, 'DISPATCHED')} className="px-3.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold">Dispatch</button>
                    )}
                    {t.status === 'DISPATCHED' && (
                      <button onClick={() => handleUpdateStatus(t.id, 'RECEIVED')} className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold">Confirm Receipt</button>
                    )}
                    {t.status === 'RECEIVED' && <span className="text-xs font-bold text-emerald-600">Completed</span>}
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