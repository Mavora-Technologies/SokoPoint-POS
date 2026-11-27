'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Shield, Plus, RefreshCw, Loader2, X } from 'lucide-react';
import api from '../../../../lib/api';

export default function CashDrawerPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shiftId, setShiftId] = useState('');
  const [movementType, setMovementType] = useState<'PAY_IN' | 'PAY_OUT' | 'SAFE_DROP'>('SAFE_DROP');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/cash-drawer');
      const d = res.data?.data || {};
      const openShifts = Array.isArray(d.shifts) ? d.shifts : [];
      setShifts(openShifts);
      setMovements(Array.isArray(d.movements) ? d.movements : []);
      const firstOpen = openShifts.find((s: any) => s.status === 'OPEN');
      if (firstOpen) setShiftId((prev) => prev || firstOpen.id);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    const activeBalance = shifts
      .filter((s) => s.status === 'OPEN')
      .reduce((acc, s) => acc + Number(s.expectedDrawer || 0), 0);
    const safeDrops = movements
      .filter((m) => m.movementType === 'SAFE_DROP')
      .reduce((acc, m) => acc + Number(m.amount || 0), 0);
    const payOuts = movements
      .filter((m) => m.movementType === 'PAY_OUT')
      .reduce((acc, m) => acc + Number(m.amount || 0), 0);
    return { activeBalance, safeDrops, payOuts };
  }, [shifts, movements]);

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/finance/cash-drawer/movement', {
        shiftId: shiftId || null,
        movementType,
        amount: Number(amount),
        reason: reason.trim(),
        referenceNo: referenceNo.trim(),
      });
      setIsModalOpen(false);
      setAmount('');
      setReason('');
      setReferenceNo('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record drawer movement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">Finance &amp; Treasury &rsaquo; Cash Management</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56]">Cash Drawer &amp; Safe Drop Control</h1>
          <p className="text-xs text-[#176E84] mt-1">
            Monitor live checkout drawer floats, record mid-shift safe drops, and audit petty cash pay-ins and pay-outs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Record Drawer Movement
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE DRAWERS BALANCE</p>
            <p className="text-xl font-black text-[#041F56] font-mono mt-1">
              KES {kpis.activeBalance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">Across {shifts.filter((s) => s.status === 'OPEN').length} open register(s)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center"><Wallet className="h-5 w-5" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">VAULT / SAFE DROPS</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.safeDrops.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Secured in branch safe</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Shield className="h-5 w-5" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">DRAWER PAY-OUTS</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.payOuts.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Petty cash disbursements</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><ArrowUpRight className="h-5 w-5" /></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[780px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">TIMESTAMP</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">REGISTER</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">TYPE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">REASON / AUDIT NOTE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CUSTODIAN</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">AMOUNT (KES)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-12 text-center"><Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" /></td></tr>
            ) : movements.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-400">No cash drawer movements recorded yet.</td></tr>
            ) : (
              movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono text-slate-500">{new Date(m.createdAt).toLocaleString('en-US')}</td>
                  <td className="px-4 py-4 font-bold text-[#041F56]">{m.registerName}</td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${m.movementType === 'PAY_IN' ? 'bg-emerald-50 text-emerald-700' : m.movementType === 'SAFE_DROP' ? 'bg-blue-50 text-[#0554F4]' : 'bg-rose-50 text-rose-700'}`}>
                      {m.movementType === 'PAY_IN' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                      {m.movementType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{m.reason}</td>
                  <td className="px-4 py-4 font-mono text-slate-500">{m.recordedBy}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-[#041F56]">
                    KES {Number(m.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-[#041F56]">Record Cash Drawer Movement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Active Till Shift</label>
                <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white">
                  <option value="">-- General Branch Drawer --</option>
                  {shifts.filter((s) => s.status === 'OPEN').map((s) => (
                    <option key={s.id} value={s.id}>{s.registerName} ({s.cashierName})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Movement Type *</label>
                  <select value={movementType} onChange={(e) => setMovementType(e.target.value as any)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white">
                    <option value="SAFE_DROP">Safe Drop (-)</option>
                    <option value="PAY_OUT">Petty Cash Pay-Out (-)</option>
                    <option value="PAY_IN">Float Top-Up / Pay-In (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Amount (KES) *</label>
                  <input required type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Reason / Audit Note *</label>
                <input required type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Mid-day cash skim to manager safe" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#0554F4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Commit Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}