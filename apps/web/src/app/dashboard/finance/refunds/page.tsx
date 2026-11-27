'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Plus,
  TrendingDown,
  TrendingUp,
  Scale,
  Loader2,
  X,
  RefreshCw,
} from 'lucide-react';
import api from '../../../../lib/api';

const METHODS = [
  'M-Pesa Mobile Money Reversal',
  'POS Cash Drawer Refund',
  'Bank Wire / EFT Reversal',
  'Card / PDQ Chargeback Reversal',
  'Supplier Invoice Credit Note Offset',
];

const REASONS = [
  'Customer Order Cancellation',
  'Defective or Damaged Packaging',
  'Billing / Overcharge Correction',
  'Wrong SKU / Size Exchange',
  'Expired / Spoiled Stock Return',
  'Supplier Batch Recall',
];

export default function FinanceRefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ALL' | 'AR_REFUND' | 'AP_CREDIT_MEMO'>('ALL');

  const [isOpen, setIsOpen] = useState(false);
  const [flowDirection, setFlowDirection] = useState<'AR_REFUND' | 'AP_CREDIT_MEMO'>('AR_REFUND');
  const [method, setMethod] = useState(METHODS[0]);
  const [reasonCode, setReasonCode] = useState(REASONS[0]);
  const [originalOrderId, setOriginalOrderId] = useState('');
  const [originalRef, setOriginalRef] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [amount, setAmount] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rRes, sRes] = await Promise.allSettled([
      api.get('/finance/refunds'),
      api.get('/inventory/suppliers').catch(() => api.get('/suppliers')),
    ]);
    if (rRes.status === 'fulfilled') {
      setRefunds(rRes.value.data?.data?.refunds || []);
      setSales(rRes.value.data?.data?.refundableSales || []);
    }
    if (sRes.status === 'fulfilled') {
      const sData = sRes.value.data?.data ?? sRes.value.data;
      setSuppliers(Array.isArray(sData) ? sData : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    let ar = 0;
    let ap = 0;
    for (const r of refunds) {
      if (r.flowDirection === 'AR_REFUND') ar += Number(r.amount || 0);
      else ap += Number(r.amount || 0);
    }
    return { ar, ap, net: ar - ap };
  }, [refunds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/finance/refunds', {
        flowDirection,
        method,
        reasonCode,
        clearingChannel: method.includes('M-Pesa') ? 'M-Pesa Express Till Clearing' : 'POS Cash Drawer Register',
        originalOrderId: originalOrderId || null,
        originalRef: originalRef.trim(),
        supplierId: flowDirection === 'AP_CREDIT_MEMO' ? supplierId || null : null,
        amount: Number(amount),
        auditNotes: auditNotes.trim(),
      });
      setIsOpen(false);
      setAmount('');
      setAuditNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to commit refund / credit memo.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(
    () =>
      refunds.filter((r) => {
        if (tab !== 'ALL' && r.flowDirection !== tab) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          r.documentNumber.toLowerCase().includes(q) ||
          r.reasonCode.toLowerCase().includes(q) ||
          r.counterpartyName.toLowerCase().includes(q)
        );
      }),
    [refunds, tab, search]
  );

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">Finance &amp; Treasury &rsaquo; Refunds &amp; Credit Memos</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56]">Refunds &amp; Returns Management</h1>
          <p className="text-xs text-[#176E84] mt-1">
            Audit customer sale refunds (AR), wholesale supplier credit memos (AP), and returned stock dispositions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Issue Refund / Credit Memo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">CUSTOMER REFUNDS (AR)</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.ar.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Returned POS sales</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">VENDOR CREDIT MEMOS (AP)</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.ap.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Recovered / offset from suppliers</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">NET REFUND OUTFLOW</p>
            <p className="text-xl font-black text-[#041F56] font-mono mt-1">
              KES {kpis.net.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#176E84] mt-0.5">Treasury impact delta</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center">
            <Scale className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search refund #, reason code, transaction reference, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
          />
        </div>
        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
          {[
            { key: 'ALL', label: 'All Refunds' },
            { key: 'AR_REFUND', label: 'Customer Refunds (AR)' },
            { key: 'AP_CREDIT_MEMO', label: 'Vendor Credit Memos (AP)' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                tab === t.key ? 'bg-[#041F56] text-white font-bold' : 'text-slate-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[880px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">REFUND DOCUMENT # &amp; DATE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">DIRECTION &amp; TYPE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">REASON CLASSIFICATION</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CLEARING CHANNEL</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">COUNTERPARTY / REF</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">AMOUNT (KES)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-12 text-center"><Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-slate-400">No refund documents or supplier credit memos recorded for this tenant yet.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-mono font-bold text-[#041F56]">{r.documentNumber}</p>
                    <p className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString('en-US')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.flowDirection === 'AR_REFUND' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {r.flowDirection === 'AR_REFUND' ? 'AR Customer Refund' : 'AP Credit Memo'}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{r.reasonCode}</td>
                  <td className="px-4 py-4 text-slate-600">{r.clearingChannel}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-[#041F56]">{r.counterpartyName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{r.originalRef || '—'}</p>
                  </td>
                  <td className={`px-6 py-4 text-right font-mono font-bold ${r.flowDirection === 'AR_REFUND' ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {r.flowDirection === 'AR_REFUND' ? '-' : '+'}KES {Number(r.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Post Refund / Credit Memo Document</h2>
                <p className="text-xs text-[#176E84]">Issue verified retail/wholesale sale refund or log supplier credit memo</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 p-1 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Refund Flow *</label>
                  <select value={flowDirection} onChange={(e) => setFlowDirection(e.target.value as any)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                    <option value="AR_REFUND">AR Customer Refund (-)</option>
                    <option value="AP_CREDIT_MEMO">AP Supplier Credit Memo (+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Disbursement / Recovery Method *</label>
                  <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                    {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {flowDirection === 'AR_REFUND' ? (
                <div className="rounded-2xl bg-blue-50/60 border border-blue-200/70 p-3.5">
                  <label className="block text-xs font-bold text-[#041F56] mb-1.5">Link Original POS Sale (Audit Trace)</label>
                  <select
                    value={originalOrderId}
                    onChange={(e) => {
                      setOriginalOrderId(e.target.value);
                      const s = sales.find((x) => x.id === e.target.value);
                      if (s) {
                        setOriginalRef(s.ref);
                        setAmount(String(s.amount));
                      }
                    }}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">-- Select Original POS Sale --</option>
                    {sales.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Supplier *</label>
                  <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Reason Code *</label>
                  <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                    {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Refund / Credit Amount (KES) *</label>
                  <input required type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1500.00" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Audit Notes</label>
                <input type="text" value={auditNotes} onChange={(e) => setAuditNotes(e.target.value)} placeholder="e.g. Verified returned goods at customer service desk" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs" />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsOpen(false)} className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Commit Credit Memo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}