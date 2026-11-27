'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Scale,
  Plus,
  Printer,
  RefreshCw,
  Receipt,
  DollarSign,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Users,
  Landmark,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import api from '../../../../lib/api';

export default function ZReportsPage() {
  const [opDate, setOpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState({
    grossSales: 0,
    settledSalesCount: 0,
    estimatedVat: 0,
    cashTotal: 0,
    mpesaTotal: 0,
    mpesaCount: 0,
    cardTotal: 0,
    cardCount: 0,
    creditTotal: 0,
    creditCount: 0,
    bankTotal: 0,
    bankCount: 0,
  });
  const [shifts, setShifts] = useState<any[]>([]);
  const [tab, setTab] = useState<'ALL' | 'BALANCED' | 'DISCREPANCIES' | 'OPEN'>('ALL');
  const [loading, setLoading] = useState(true);

  // Open Till Shift Modal
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [registerName, setRegisterName] = useState('Main Checkout Till 1');
  const [openingFloat, setOpeningFloat] = useState('0');
  const [cashierName, setCashierName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/z-reports', { params: { date: opDate } });
      const d = res.data?.data || {};
      if (d.summary) setSummary(d.summary);
      setShifts(Array.isArray(d.shifts) ? d.shifts : []);
    } finally {
      setLoading(false);
    }
  }, [opDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shiftStats = useMemo(() => {
    const open = shifts.filter((s) => s.status === 'OPEN').length;
    const closed = shifts.filter((s) => s.status === 'CLOSED').length;
    const expectedDrawer = shifts.reduce((acc, s) => acc + Number(s.expectedDrawer || 0), 0);
    const reconciledVault = shifts
      .filter((s) => s.status === 'CLOSED')
      .reduce((acc, s) => acc + Number(s.physicalCount || 0), 0);
    const netDrift = shifts
      .filter((s) => s.status === 'CLOSED')
      .reduce((acc, s) => acc + Number(s.cashVariance || 0), 0);
    return { open, closed, expectedDrawer, reconciledVault, netDrift };
  }, [shifts]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/finance/z-reports/open-shift', {
        registerName: registerName.trim(),
        openingFloat: Number(openingFloat) || 0,
        cashierName: cashierName.trim(),
        operationalDate: opDate,
      });
      setIsOpenModal(false);
      setOpeningFloat('0');
      setCashierName('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start till shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (shift: any) => {
    const val = prompt(`Enter physical cash counted for ${shift.registerName} (Expected: KES ${shift.expectedDrawer}):`, String(shift.expectedDrawer));
    if (val === null) return;
    try {
      await api.patch(`/finance/z-reports/${shift.id}/close`, { physicalCount: Number(val) || 0 });
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to close till shift.');
    }
  };

  const filteredShifts = useMemo(
    () =>
      shifts.filter((s) => {
        if (tab === 'OPEN') return s.status === 'OPEN';
        if (tab === 'BALANCED') return s.status === 'CLOSED' && Math.abs(Number(s.cashVariance || 0)) < 0.01;
        if (tab === 'DISCREPANCIES') return s.status === 'CLOSED' && Math.abs(Number(s.cashVariance || 0)) >= 0.01;
        return true;
      }),
    [shifts, tab]
  );

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0 mt-0.5">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#0554F4] mb-0.5">
              Enterprise Control &rsaquo; Cash Management &rsaquo; Z-Report &amp; Treasury Reconciliation
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56]">
              End-of-Day Z-Report &amp; Multi-Tender Reconciliation
            </h1>
            <p className="text-xs text-[#176E84] mt-1">
              Dual-custody audit matching checkout till floats, live POS cash sales, M-Pesa Daraja clearing, wholesale credit tabs, and GL variance vouchers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={opDate}
            onChange={(e) => setOpDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56] bg-white"
          />
          <button
            onClick={() => setIsOpenModal(true)}
            className="px-4 py-2 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Open Till Shift
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#041F56] hover:bg-[#062d7a] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Z-Report
          </button>
          <button onClick={loadData} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">GROSS POS SALES</p>
            <p className="text-xl font-black text-[#041F56] font-mono mt-1">
              KES {summary.grossSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {summary.settledSalesCount} Settled Sales &bull; VAT KES {summary.estimatedVat.toFixed(2)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center"><Receipt className="h-5 w-5" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">EXPECTED DRAWER CASH</p>
            <p className="text-xl font-black text-[#0554F4] font-mono mt-1">
              KES {shiftStats.expectedDrawer.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">+KES {summary.cashTotal.toFixed(2)} Cash Sales</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><DollarSign className="h-5 w-5" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">RECONCILED VAULT CASH</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {shiftStats.reconciledVault.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{shiftStats.closed} Closed Shifts &bull; {shiftStats.open} Open</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Scale className="h-5 w-5" /></div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">NET CASH DRIFT</p>
            <p className={`text-xl font-black font-mono mt-1 ${shiftStats.netDrift === 0 ? 'text-[#041F56]' : 'text-rose-600'}`}>
              KES {shiftStats.netDrift.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Over / (Short) Balance</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><ShieldCheck className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Settlement Channel Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-extrabold text-[#041F56] uppercase tracking-wider">SETTLEMENT CHANNEL BREAKDOWN &amp; CLEARING AUDIT</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Audit for operational date <strong>{opDate}</strong> &bull; Total Cleared:{' '}
              <strong className="text-emerald-600 font-mono">KES {summary.grossSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-blue-50 text-[#0554F4] text-[11px] font-bold">
            {shiftStats.closed} Closed Shifts &bull; {shiftStats.open} Open
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl border border-slate-200/70 p-4">
            <p className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-[#0554F4]" /> Physical Till Cash</p>
            <p className="text-base font-mono font-black text-[#041F56] mt-1">KES {summary.cashTotal.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Expected Drawer: KES {shiftStats.expectedDrawer.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4">
            <p className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-emerald-600" /> M-Pesa C2B &amp; STK</p>
            <p className="text-base font-mono font-black text-emerald-600 mt-1">KES {summary.mpesaTotal.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.mpesaCount} Verified Txns</p>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4">
            <p className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-purple-600" /> Card Terminal (PDQ)</p>
            <p className="text-base font-mono font-black text-purple-600 mt-1">KES {summary.cardTotal.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.cardCount} Merchant Slips</p>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4">
            <p className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-teal-600" /> Wholesale Credit Tabs</p>
            <p className="text-base font-mono font-black text-teal-600 mt-1">KES {summary.creditTotal.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.creditCount} Account Settlements</p>
          </div>
          <div className="rounded-xl border border-slate-200/70 p-4">
            <p className="text-[11px] font-bold text-slate-700 inline-flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-[#0554F4]" /> Bank Wire / Direct EFT</p>
            <p className="text-base font-mono font-black text-[#041F56] mt-1">KES {summary.bankTotal.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{summary.bankCount} Corporate Transfers</p>
          </div>
        </div>
      </div>

      {/* Till Shifts Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center flex-wrap gap-3">
          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
            {[
              { key: 'ALL', label: 'All Tills' },
              { key: 'BALANCED', label: 'Balanced' },
              { key: 'DISCREPANCIES', label: 'Discrepancies' },
              { key: 'OPEN', label: 'Pending Close' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer ${tab === t.key ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-slate-400">{filteredShifts.length} Drawer Records Audited</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">TILL SHIFT &amp; REGISTER</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CASHIER CUSTODIAN</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">FLOAT + SALES</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">EXPECTED DRAWER</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">PHYSICAL COUNT</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">CASH VARIANCE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">AUDIT CLEARANCE</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredShifts.length === 0 ? (
                <tr><td colSpan={8} className="p-12 text-center text-slate-400">No till shifts recorded for {opDate}.</td></tr>
              ) : (
                filteredShifts.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 font-bold text-[#041F56]">{s.registerName}</td>
                    <td className="px-4 py-4 font-mono text-slate-600">{s.cashierName}</td>
                    <td className="px-4 py-4 text-right font-mono">KES {(Number(s.openingFloat) + Number(s.cashSales)).toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-[#041F56]">KES {Number(s.expectedDrawer).toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-mono">{s.physicalCount !== null ? `KES ${Number(s.physicalCount).toFixed(2)}` : '—'}</td>
                    <td className={`px-4 py-4 text-right font-mono font-bold ${Number(s.cashVariance) === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {s.status === 'CLOSED' ? `KES ${Number(s.cashVariance).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${s.status === 'CLOSED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {s.status === 'CLOSED' && <CheckCircle2 className="h-3 w-3" />} {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {s.status === 'OPEN' ? (
                        <button onClick={() => handleCloseShift(s)} className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer">
                          Close &amp; Count
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">{s.supervisorSignoff || 'Verified'}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Till Shift Modal */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Open Checkout Till Shift</h2>
                <p className="text-xs text-[#176E84]">Record opening cash float for operational date {opDate}</p>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="text-slate-400 p-1 cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Register / Checkout Till Name *</label>
                <input required type="text" value={registerName} onChange={(e) => setRegisterName(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Opening Cash Float (KES) *</label>
                <input required type="number" min="0" step="any" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Cashier Custodian (Optional)</label>
                <input type="text" value={cashierName} onChange={(e) => setCashierName(e.target.value)} placeholder="Defaults to currently signed-in user" className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsOpenModal(false)} className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#0554F4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer">
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Start Shift Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}