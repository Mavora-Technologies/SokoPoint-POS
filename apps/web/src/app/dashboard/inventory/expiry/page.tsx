'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, ShieldAlert, Loader2, ShieldCheck, X, RefreshCw } from 'lucide-react';
import api from '../../../../lib/api';

interface BatchItem {
  id: string;
  productName: string;
  sku: string;
  batchNumber: string;
  expiryDate: string;
  currentQuantity: number;
  isQuarantined: boolean;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
}

export default function BatchesAndExpirationsPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchItem | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'quarantined'>('alerts');

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/inventory/batches');
      const raw = Array.isArray(res.data?.data) ? res.data.data : [];
      const now = new Date();

      setBatches(
        raw.map((b: any) => {
          const expDate = b.expiryDate ? new Date(b.expiryDate) : new Date();
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const status = diffDays < 0 ? 'EXPIRED' : diffDays <= 14 ? 'CRITICAL' : diffDays <= 45 ? 'WARNING' : 'GOOD';
          return { ...b, currentQuantity: Number(b.currentQuantity ?? 0), status };
        })
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load product batches.');
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleConfirmQuarantine = async () => {
    if (!selectedBatch) return;
    try {
      await api.patch(`/inventory/batches/${selectedBatch.id}/quarantine`);
      setSelectedBatch(null);
      await fetchBatches();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to quarantine batch.');
    }
  };

  const expiredCount = batches.filter((b) => b.status === 'EXPIRED' && !b.isQuarantined).length;
  const criticalCount = batches.filter((b) => b.status === 'CRITICAL' && !b.isQuarantined).length;
  const warningCount = batches.filter((b) => b.status === 'WARNING' && !b.isQuarantined).length;
  const quarantinedList = batches.filter((b) => b.isQuarantined);
  const activeAlertsList = batches.filter((b) => b.status !== 'GOOD' && !b.isQuarantined);
  const rows = activeTab === 'alerts' ? activeAlertsList : quarantinedList;

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-blue-600" /> Batches &amp; Expirations
          </h1>
          <p className="text-slate-500 text-sm mt-1">Real-time tracking of near-expiry and expired retail perishable inventory.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBatches} className="p-2.5 bg-white border border-slate-200 rounded-xl"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/dashboard/inventory" className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" /> Back to Inventory
          </Link>
        </div>
      </div>

      {error && <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">{error}</div>}

      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 w-fit">
        <button onClick={() => setActiveTab('alerts')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'alerts' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
          Active Expiry Alerts ({activeAlertsList.length})
        </button>
        <button onClick={() => setActiveTab('quarantined')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === 'quarantined' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
          Quarantined Stock ({quarantinedList.length})
        </button>
      </div>

      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 p-5 rounded-2xl"><p className="text-xs font-bold text-red-600 uppercase">Expired</p><p className="text-3xl font-black text-red-700 mt-1">{expiredCount}</p></div>
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl"><p className="text-xs font-bold text-amber-600 uppercase">Expiring &lt; 14 Days</p><p className="text-3xl font-black text-amber-700 mt-1">{criticalCount}</p></div>
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl"><p className="text-xs font-bold text-blue-600 uppercase">Expiring &lt; 45 Days</p><p className="text-3xl font-black text-blue-700 mt-1">{warningCount}</p></div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[780px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU &amp; Batch</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Expiry</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                  <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">{activeTab === 'alerts' ? 'No active expiry alerts' : 'No quarantined batches'}</p>
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-bold text-slate-900">{item.productName}</td>
                  <td className="px-6 py-4 font-mono text-xs">{item.sku} • {item.batchNumber}</td>
                  <td className="px-6 py-4 font-bold text-red-600">{new Date(item.expiryDate).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-4 font-black">{item.currentQuantity} units</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-black rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{item.isQuarantined ? 'QUARANTINED' : item.status}</span></td>
                  <td className="px-6 py-4 text-right">
                    {!item.isQuarantined ? (
                      <button onClick={() => setSelectedBatch(item)} className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                        <ShieldAlert className="h-3.5 w-3.5" /> Quarantine
                      </button>
                    ) : <span className="text-xs text-slate-400 font-bold">Isolated</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-amber-600" /> Isolate Batch</h3>
              <button onClick={() => setSelectedBatch(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-600">Quarantine <strong>{selectedBatch.productName}</strong> (Batch <code>{selectedBatch.batchNumber}</code>, {selectedBatch.currentQuantity} units)?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSelectedBatch(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
              <button onClick={handleConfirmQuarantine} className="px-5 py-2 text-xs font-bold text-white bg-amber-600 rounded-xl">Confirm Quarantine</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}