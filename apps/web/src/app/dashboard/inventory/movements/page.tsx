'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Download, Search, ArrowLeft, History, Loader2, Package, RefreshCw } from 'lucide-react';
import api from '../../../../lib/api';

interface MovementRecord {
  id: string;
  reference: string;
  type: 'RECEIVE' | 'SALE' | 'ADJUSTMENT' | 'TRANSFER' | 'WASTAGE' | 'RETURN';
  productName: string;
  sku: string;
  quantityChange: number;
  user: string;
  timestamp: string;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/inventory/movements');
      setMovements(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load stock movements.');
      setMovements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const exportToCSV = () => {
    const headers = ['Reference,Type,Product,SKU,Quantity Change,Operator,Timestamp\n'];
    const rows = movements.map((m) =>
      `"${m.reference}","${m.type}","${m.productName}","${m.sku}",${m.quantityChange},"${m.user}","${new Date(m.timestamp).toLocaleString('en-GB')}"`
    );
    const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sokopoint_stock_movements_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const filtered = movements.filter(
    (m) =>
      (m.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.user || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <History className="h-6 w-6 text-blue-600" /> Stock Movements &amp; Audit Ledger
          </h1>
          <p className="text-slate-500 text-sm mt-1">Immutable tenant audit trail for receipts, POS sales, transfers, and wastage.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/inventory" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <button onClick={exportToCSV} disabled={movements.length === 0} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
            <Download className="h-4 w-4 text-emerald-600" /> Export CSV
          </button>
          <button onClick={fetchMovements} className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">{error}</div>}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex justify-between items-center gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search reference, product, SKU, or operator..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
        <span className="text-xs font-bold text-slate-500">Entries: <strong className="text-slate-900">{movements.length}</strong></span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[820px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reference #</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product &amp; SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Qty Change</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Operator</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No stock movement records yet</p>
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{m.reference}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-blue-50 text-blue-700 border border-blue-200">{m.type}</span></td>
                  <td className="px-6 py-4"><p className="font-bold text-slate-900">{m.productName}</p><p className="text-xs font-mono text-slate-400">{m.sku}</p></td>
                  <td className="px-6 py-4 font-black">
                    <span className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange} units
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{m.user}</td>
                  <td className="px-6 py-4 text-right text-xs font-mono text-slate-500">{new Date(m.timestamp).toLocaleString('en-GB')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}