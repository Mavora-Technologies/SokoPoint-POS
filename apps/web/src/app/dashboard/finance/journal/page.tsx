'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Loader2, X, Trash2 } from 'lucide-react';
import api from '../../../../lib/api';

export default function GeneralJournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [referenceNo, setReferenceNo] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { accountCode: '1010', accountName: 'Cash & Bank Treasury', debit: 0, credit: 0 },
    { accountCode: '4010', accountName: 'Retail & Wholesale Sales Revenue', debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/journal');
      setEntries(Array.isArray(res.data?.data) ? res.data.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.01;

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Debits must equal Credits before posting.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/finance/journal', { entryDate, referenceNo: referenceNo.trim(), description: description.trim(), lines });
      setIsOpen(false);
      setDescription('');
      setReferenceNo('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to post journal entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">Finance &amp; Treasury &rsaquo; Accounting Ledger</p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56]">General Journal (Double-Entry GL)</h1>
          <p className="text-xs text-[#176E84] mt-1">
            Post balanced debit/credit adjusting vouchers, accruals, and depreciation entries to your tenant general ledger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setIsOpen(true)} className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
            <Plus className="h-4 w-4" /> Post Journal Voucher
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[820px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">ENTRY # &amp; DATE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">NARRATION</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">LINES</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TOTAL DEBIT</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TOTAL CREDIT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center"><Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" /></td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-slate-400">No general journal entries posted yet.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-mono font-bold text-[#041F56]">{e.entryNumber}</p>
                    <p className="text-[10px] text-slate-400">{new Date(e.entryDate).toLocaleDateString('en-US')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800">{e.description}</p>
                    <p className="text-[10px] font-mono text-slate-400">{e.referenceNo || 'Manual Voucher'}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-500">{e.lines?.length || 0} account legs</td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-[#041F56]">KES {Number(e.totalDebit).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">KES {Number(e.totalCredit).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-[#041F56]">Post Double-Entry Journal Voucher</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 p-1 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handlePost} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Entry Date *</label>
                  <input required type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Narration / Description *</label>
                  <input required type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monthly branch rent accrual" className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#041F56]">GL Account Legs</span>
                  <button
                    type="button"
                    onClick={() => setLines((p) => [...p, { accountCode: '5010', accountName: 'Operating Expense', debit: 0, credit: 0 }])}
                    className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <input value={l.accountCode} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, accountCode: e.target.value } : x)))} placeholder="Code" className="col-span-2 px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                    <input value={l.accountName} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, accountName: e.target.value } : x)))} placeholder="Account Name" className="col-span-5 px-2 py-2 border border-slate-200 rounded-lg text-xs" />
                    <input type="number" min="0" step="any" value={l.debit} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, debit: Number(e.target.value) || 0 } : x)))} placeholder="Debit" className="col-span-2 px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                    <input type="number" min="0" step="any" value={l.credit} onChange={(e) => setLines((p) => p.map((x, i) => (i === idx ? { ...x, credit: Number(e.target.value) || 0 } : x)))} placeholder="Credit" className="col-span-2 px-2 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
                    <button type="button" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))} className="col-span-1 text-slate-400 hover:text-rose-600 flex justify-center cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-xs bg-slate-50 px-4 py-3 rounded-xl border border-slate-200/70">
                <span>Total Debits: <strong className="font-mono">KES {totalDebit.toFixed(2)}</strong></span>
                <span>Total Credits: <strong className="font-mono">KES {totalCredit.toFixed(2)}</strong></span>
                <span className={`font-bold ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isBalanced ? 'BALANCED' : 'OUT OF BALANCE'}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsOpen(false)} className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer">Cancel</button>
                <button type="submit" disabled={saving || !isBalanced} className="px-5 py-2.5 bg-[#0554F4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Post Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}