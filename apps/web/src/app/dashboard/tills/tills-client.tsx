'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  Loader2,
  Lock,
  DollarSign,
  Coins,
  ShieldAlert,
  Search,
  X,
  CheckCircle2,
} from 'lucide-react';
import api from '../../../lib/api';

interface ShiftRow {
  id: string;
  shiftSeq: number;
  registerName: string;
  cashierName: string;
  cashierEmail: string;
  cashierRole: string;
  shiftRotation: string;
  branchName: string;
  openingFloat: number;
  cashSales: number;
  expectedCash: number;
  countedCash: number | null;
  variance: number;
  status: 'OPEN' | 'CLOSED' | string;
  supervisorSignoff?: string | null;
  handoverNotes?: string | null;
  openedAt: string;
  closedAt?: string | null;
}

const ROTATIONS = ['Morning Shift', 'Midday Shift', 'Evening Shift', 'Night Closing'];
const BREACH_TOLERANCE = 50;

export default function TillsClient() {
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [registers, setRegisters] = useState<{ id: string; name: string; terminalCode: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [search, setSearch] = useState('');

  // Open Shift Modal
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [cashierUserId, setCashierUserId] = useState('');
  const [registerName, setRegisterName] = useState('No Physical Drawer');
  const [shiftRotation, setShiftRotation] = useState(ROTATIONS[0]);
  const [openingFloat, setOpeningFloat] = useState('5000');
  const [branchId, setBranchId] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Close Shift Modal
  const [closingShift, setClosingShift] = useState<ShiftRow | null>(null);
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closing, setClosing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tills');
      const d = res.data?.data || {};
      setShifts(Array.isArray(d.shifts) ? d.shifts : []);
      setStaff(Array.isArray(d.staff) ? d.staff : []);
      setRegisters(Array.isArray(d.registers) ? d.registers : []);
      setBranches(Array.isArray(d.branches) ? d.branches : []);
    } catch (error) {
      console.error('Failed to load cashier shifts', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    const openShifts = shifts.filter((s) => s.status === 'OPEN');
    const closedShifts = shifts.filter((s) => s.status === 'CLOSED');
    const reconciledCash = closedShifts.reduce((acc, s) => acc + Number(s.countedCash || 0), 0);
    const netDrift = closedShifts.reduce((acc, s) => acc + Number(s.variance || 0), 0);
    const breaches = closedShifts.filter((s) => Math.abs(Number(s.variance || 0)) > BREACH_TOLERANCE).length;
    return {
      activeCount: openShifts.length,
      reconciledCash,
      netDrift,
      breaches,
    };
  }, [shifts]);

  const filtered = useMemo(() => {
    return shifts.filter((s) => {
      if (tab !== 'ALL' && s.status !== tab) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        s.cashierName.toLowerCase().includes(q) ||
        s.cashierEmail.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q) ||
        s.registerName.toLowerCase().includes(q)
      );
    });
  }, [shifts, tab, search]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/tills', {
        cashierUserId: cashierUserId || undefined,
        registerName,
        shiftRotation,
        openingFloat: Number(openingFloat) || 0,
        branchId: branchId || undefined,
        handoverNotes: handoverNotes.trim(),
      });
      setIsOpenModal(false);
      setCashierUserId('');
      setHandoverNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to open cashier shift.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingShift) return;
    try {
      setClosing(true);
      await api.patch(`/tills/${closingShift.id}/status`, {
        countedCash: Number(countedCash) || 0,
        closingNotes: closingNotes.trim(),
      });
      setClosingShift(null);
      setCountedCash('');
      setClosingNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to close cashier shift.');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Treasury &amp; Workforce Custody
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <Wallet className="h-6 w-6 text-[#0554F4]" />
            Cashier Shift &amp; Drawer Settlement Cockpit
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Multi-cashier POS custody, roster-linked drawer allocation, mid-shift safe drops, and blind Z-report closeouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpenModal(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Open Cashier Shift
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE SESSIONS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.activeCount}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Concurrent Open Shifts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Lock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RECONCILED CASH</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.reconciledCash.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Settled to Main Safe</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET DRIFT VARIANCE</p>
            <p className="text-xl font-black text-[#041F56] font-mono mt-1">
              KES {kpis.netDrift.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Cumulative Over/Short</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AUDITED BREACHES</p>
            <p className="text-xl font-black text-rose-600 mt-1">{kpis.breaches}</p>
            <p className="text-[11px] text-rose-500 mt-0.5">&gt; KES {BREACH_TOLERANCE} Tolerance</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
            {[
              { key: 'ALL', label: 'All Shifts' },
              { key: 'OPEN', label: 'In Service (Open)' },
              { key: 'CLOSED', label: 'Reconciled (Closed)' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                  tab === t.key ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cashier..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
              />
            </div>
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
              {filtered.length} Recorded Shifts
            </span>
          </div>
        </div>

        {/* Shifts Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">SHIFT ID</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CASHIER CUSTODIAN</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">BRANCH OUTLET</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">OPENING FLOAT</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">POS SALES SO FAR</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">EXPECTED CASH</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">COUNTED CASH</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">VARIANCE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">AUDIT STATUS</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">TIMELINE &amp; SIGN-OFF</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="p-14 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-14 text-center text-slate-400 font-semibold">
                    No cashier shift sessions recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const isClosed = s.status === 'CLOSED';
                  const isDiscrepancy = isClosed && Math.abs(Number(s.variance || 0)) > BREACH_TOLERANCE;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4 font-mono font-bold text-[#041F56]">#{s.shiftSeq}</td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#041F56]">{s.cashierName}</p>
                        <p className="text-[10px] text-slate-400">
                          {s.cashierRole} &bull; {s.cashierEmail || s.registerName}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-700">{s.branchName}</p>
                        <p className="text-[10px] text-slate-400">{s.shiftRotation}</p>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-700">
                        KES {Number(s.openingFloat || 0).toLocaleString('en-KE')}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-emerald-600">
                        +KES {Number(s.cashSales || 0).toLocaleString('en-KE')}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-[#0554F4]">
                        KES {Number(s.expectedCash || 0).toLocaleString('en-KE')}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-purple-700">
                        {isClosed ? `KES ${Number(s.countedCash || 0).toLocaleString('en-KE')}` : '—'}
                      </td>
                      <td
                        className={`px-4 py-4 text-right font-mono font-bold ${
                          !isClosed
                            ? 'text-slate-400'
                            : Number(s.variance) === 0
                              ? 'text-emerald-600'
                              : Number(s.variance) > 0
                                ? 'text-amber-600'
                                : 'text-rose-600'
                        }`}
                      >
                        {isClosed
                          ? `${Number(s.variance) > 0 ? '+' : ''}KES ${Number(s.variance || 0).toLocaleString('en-KE')}`
                          : '—'}
                      </td>
                      <td className="px-4 py-4">
                        {!isClosed ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
                            IN SERVICE
                          </span>
                        ) : isDiscrepancy ? (
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            DISCREPANCY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" /> BALANCED
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-[10px] text-slate-500">
                        <p>
                          In:{' '}
                          {new Date(s.openedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {isClosed && (
                          <p className="text-slate-400">Closed by: {s.supervisorSignoff || 'Supervisor'}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isClosed ? (
                          <button
                            onClick={() => {
                              setClosingShift(s);
                              setCountedCash(String(s.expectedCash || 0));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                          >
                            Close Shift
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEN CASHIER SHIFT SESSION MODAL */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Open Cashier Shift Session</h2>
                <p className="text-xs text-[#176E84] mt-0.5">
                  Assign staff custodian, cash drawer &amp; starting float
                </p>
              </div>
              <button onClick={() => setIsOpenModal(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">
                  Cashier Custodian (Leave blank for yourself)
                </label>
                <select
                  value={cashierUserId}
                  onChange={(e) => setCashierUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                >
                  <option value="">Myself (Current Authenticated Session)</option>
                  {staff.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Cash Drawer Register</label>
                  <select
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="No Physical Drawer">No Physical Drawer</option>
                    {registers.map((r) => (
                      <option key={r.id} value={`${r.name} [${r.terminalCode}]`}>
                        {r.name} [{r.terminalCode}]
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Shift Rotation</label>
                  <select
                    value={shiftRotation}
                    onChange={(e) => setShiftRotation(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {ROTATIONS.map((rot) => (
                      <option key={rot} value={rot}>
                        {rot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Opening Float (KES) *</label>
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
                {branches.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Outlet</label>
                    <select
                      value={branchId}
                      onChange={(e) => setBranchId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                    >
                      <option value="">Default Active Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">
                  Handover / Float Verification Notes
                </label>
                <input
                  type="text"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  placeholder="e.g. Verified KES 5,000 change denominations"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="py-2.5 rounded-xl bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm &amp; Open Shift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BLIND Z-REPORT CLOSEOUT MODAL */}
      {closingShift && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Close Shift #{closingShift.shiftSeq}</h2>
                <p className="text-xs text-[#176E84]">
                  {closingShift.cashierName} &bull; {closingShift.registerName}
                </p>
              </div>
              <button onClick={() => setClosingShift(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Physical Counted Cash (KES) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Supervisor Sign-Off Notes</label>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="e.g. Safe drop verified and sealed"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setClosingShift(null)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {closing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Closeout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}