'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Trash2, Loader2, RefreshCw } from 'lucide-react';
import api from '../../../../lib/api';

interface WastageRecord {
  id: string;
  reference: string;
  date: string;
  productName: string;
  sku: string;
  quantity: number;
  reason: string;
  valueLost: number;
  reportedBy: string;
  status: string;
}

export default function WastageAndSpoilagePage() {
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadWastage = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/wastage');
      setRecords(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWastage();
  }, [loadWastage]);

  const filtered = records.filter(
    (r) =>
      (r.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.reportedBy || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Trash2 className="h-6 w-6 text-red-600" /> Wastage &amp; Write-Offs
          </h1>
          <p className="text-slate-500 text-sm mt-1">Log damaged, expired, or lost stock and automatically deduct from Inventory Central.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadWastage} className="p-2.5 bg-white border border-slate-200 rounded-xl"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/dashboard/inventory/wastage/new" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5">
            <Trash2 className="h-4 w-4" /> Log Stock Wastage
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by Reference, Product, or Staff..." className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-600" />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[820px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reference &amp; Date</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product &amp; SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reason</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Qty</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Value Lost</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center text-slate-400 font-bold">No wastage or write-off records yet.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4"><p className="font-mono font-bold text-slate-900">{r.reference}</p><p className="text-xs text-slate-500">{new Date(r.date).toLocaleDateString('en-GB')} • {r.reportedBy}</p></td>
                  <td className="px-6 py-4"><p className="font-bold text-slate-900">{r.productName}</p><p className="text-xs font-mono text-slate-400">{r.sku}</p></td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-red-50 text-red-700 border border-red-200">{r.reason}</span></td>
                  <td className="px-6 py-4 font-black">{r.quantity} units</td>
                  <td className="px-6 py-4 font-mono font-black text-red-600">-KES {Number(r.valueLost || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{r.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}