'use client';

import { useState, useEffect, useCallback } from 'react';
import { Landmark, Lock, Unlock, RefreshCw, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '../../../../lib/api';

export default function FinancialControlPage() {
  const [metrics, setMetrics] = useState({
    totalInflow: 0,
    totalOutflow: 0,
    netLiquidity: 0,
    outstandingAp: 0,
    unreconciledCount: 0,
  });
  const [periods, setPeriods] = useState<any[]>([]);
  const [periodKey, setPeriodKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [threshold, setThreshold] = useState('50000');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/control');
      const d = res.data?.data || {};
      if (d.metrics) setMetrics(d.metrics);
      setPeriods(Array.isArray(d.periods) ? d.periods : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleLock = async (key: string, nextLocked: boolean, limit: number) => {
    try {
      setSaving(true);
      await api.put('/finance/control/periods', {
        periodKey: key,
        isLocked: nextLocked,
        approvalThreshold: limit,
      });
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update fiscal period lock.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex justify-between items-center">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">Finance &amp; Treasury &rsaquo; Governance</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56]">Financial Control &amp; Fiscal Period Locks</h1>
          <p className="text-xs text-[#176E84] mt-1">
            Enforce accounting period close locks, treasury liquidity oversight, and disbursement approval thresholds.
          </p>
        </div>
        <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">NET TREASURY LIQUIDITY</p>
          <p className="text-xl font-black text-emerald-600 font-mono mt-1">KES {metrics.netLiquidity.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">OUTSTANDING AP LIABILITY</p>
          <p className="text-xl font-black text-rose-600 font-mono mt-1">KES {metrics.outstandingAp.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">UNRECONCILED DOCUMENTS</p>
          <p className="text-xl font-black text-amber-600 mt-1">{metrics.unreconciledCount} Pending</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">LOCKED FISCAL PERIODS</p>
          <p className="text-xl font-black text-[#041F56] mt-1">{periods.filter((p) => p.isLocked).length} Closed</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-[#041F56] inline-flex items-center gap-2">
          <Landmark className="h-4 w-4 text-[#0554F4]" /> Close / Lock Accounting Period
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-bold text-[#041F56] mb-1">Fiscal Month (YYYY-MM)</label>
            <input type="month" value={periodKey} onChange={(e) => setPeriodKey(e.target.value)} className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#041F56] mb-1">Director Approval Threshold (KES)</label>
            <input type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
          </div>
          <button
            disabled={saving}
            onClick={() => handleToggleLock(periodKey, true, Number(threshold) || 50000)}
            className="px-4 py-2.5 bg-[#041F56] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />} Lock Period
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 divide-y divide-slate-100">
          {periods.length === 0 ? (
            <p className="text-xs text-slate-400 py-4">No fiscal period locks configured yet.</p>
          ) : (
            periods.map((p) => (
              <div key={p.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <span className="font-mono font-bold text-[#041F56]">{p.periodKey}</span>
                  <span className="ml-3 text-slate-500">Approval Limit: KES {Number(p.approvalThreshold).toLocaleString('en-KE')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${p.isLocked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {p.isLocked ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {p.isLocked ? 'LOCKED' : 'OPEN'}
                  </span>
                  <button
                    onClick={() => handleToggleLock(p.periodKey, !p.isLocked, Number(p.approvalThreshold))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {p.isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {p.isLocked ? 'Reopen' : 'Lock'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}