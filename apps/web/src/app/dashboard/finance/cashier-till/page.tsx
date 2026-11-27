'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  Plus,
  RefreshCw,
  CheckCircle2,
  Loader2,
  X,
  Wallet,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import api from '../../../../lib/api';

export default function CashierTillPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [registerName, setRegisterName] = useState('Main Checkout Till 1');
  const [openingFloat, setOpeningFloat] = useState('0');
  const [cashierName, setCashierName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/cash-drawer');
      setShifts(Array.isArray(res.data?.data?.shifts) ? res.data.data.shifts : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const openShifts = shifts.filter((s) => s.status === 'OPEN');
    const closedShifts = shifts.filter((s) => s.status === 'CLOSED');
    const totalExpected = openShifts.reduce((acc, s) => acc + Number(s.expectedDrawer || 0), 0);
    const totalVariance = closedShifts.reduce((acc, s) => acc + Number(s.cashVariance || 0), 0);
    return {
      openCount: openShifts.length,
      closedCount: closedShifts.length,
      totalExpected,
      totalVariance,
    };
  }, [shifts]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/finance/z-reports/open-shift', {
        registerName: registerName.trim(),
        openingFloat: Number(openingFloat) || 0,
        cashierName: cashierName.trim(),
        operationalDate: new Date().toISOString().slice(0, 10),
      });
      setIsOpenModal(false);
      setOpeningFloat('0');
      setCashierName('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to open cashier till shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (shift: any) => {
    const val = prompt(
      `Enter physical cash counted for ${shift.registerName} (Expected: KES ${shift.expectedDrawer}):`,
      String(shift.expectedDrawer)
    );
    if (val === null) return;
    try {
      await api.patch(`/finance/z-reports/${shift.id}/close`, {
        physicalCount: Number(val) || 0,
      });
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to close till shift.');
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Finance &amp; Treasury &rsaquo; Cashier Till Operations
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56]">
            Cashier Till &amp; Shift Sessions
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Open checkout registers with verified floats, track active cashier custodians, and perform end-of-shift cash counts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsOpenModal(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Open Till Shift
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">ACTIVE OPEN TILLS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{stats.openCount} Register(s)</p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">{stats.closedCount} Closed in history</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">EXPECTED CASH IN OPEN TILLS</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {stats.totalExpected.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Opening float + sales</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">CUMULATIVE SHIFT VARIANCE</p>
            <p className={`text-xl font-black font-mono mt-1 ${stats.totalVariance === 0 ? 'text-[#041F56]' : 'text-rose-600'}`}>
              KES {stats.totalVariance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Over / (Short) across closed tills</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            {stats.totalVariance === 0 ? <Scale className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[860px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">REGISTER &amp; DATE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CASHIER CUSTODIAN</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">OPENING FLOAT</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">EXPECTED DRAWER</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">PHYSICAL COUNT</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : shifts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400">
                  No cashier till shifts opened yet.
                </td>
              </tr>
            ) : (
              shifts.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-bold text-[#041F56]">{s.registerName}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(s.operationalDate).toLocaleDateString('en-US')}
                    </p>
                  </td>
                  <td className="px-4 py-4 font-mono text-slate-600">{s.cashierName}</td>
                  <td className="px-4 py-4 text-right font-mono">
                    KES {Number(s.openingFloat || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-bold text-[#041F56]">
                    KES {Number(s.expectedDrawer || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right font-mono">
                    {s.physicalCount !== null ? `KES ${Number(s.physicalCount).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'CLOSED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {s.status === 'CLOSED' && <CheckCircle2 className="h-3 w-3" />} {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {s.status === 'OPEN' ? (
                      <button
                        onClick={() => handleCloseShift(s)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Close &amp; Count
                      </button>
                    ) : (
                      <span className="text-[11px] font-mono text-slate-400">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-[#041F56]">Open Cashier Till Shift</h2>
              <button onClick={() => setIsOpenModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Register / Checkout Till Name *</label>
                <input
                  required
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Opening Cash Float (KES) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Cashier Custodian (Optional)</label>
                <input
                  type="text"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="Defaults to currently signed-in user"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#0554F4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Start Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}