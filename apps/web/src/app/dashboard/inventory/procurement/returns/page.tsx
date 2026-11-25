'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import api from '../../../../../lib/api';

export default function ProcurementSubPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchase-orders').catch(() => ({ data: { data: [] } }));
      setRecords(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex justify-between items-center">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">Inventory &rsaquo; Procurement</p>
          <h1 className="text-xl font-extrabold text-[#041F56]">Returns</h1>
        </div>
        <button onClick={load} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer">
          <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200/70 p-8 text-center text-xs text-slate-500">
        {loading ? <Loader2 className="h-6 w-6 animate-spin text-[#0554F4] mx-auto" /> : `${records.length} procurement record(s) synced with your tenant ledger.`}
      </div>
    </div>
  );
}
