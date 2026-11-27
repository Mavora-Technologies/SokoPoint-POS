'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SlidersHorizontal,
  Plus,
  RefreshCw,
  Clock,
  FileCheck2,
  ArrowLeftRight,
  AlertCircle,
  Search,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import api from '../../../../lib/api';

interface AdjustmentVoucher {
  id: string;
  voucherNumber: string;
  adjustmentType: string;
  reasonCode: string;
  amount: number;
  linkedShiftSeq?: string | null;
  debitGlAccount: string;
  creditGlAccount: string;
  auditRemarks: string;
  status: 'AWAITING_SIGN_OFF' | 'APPROVED' | 'POSTED' | 'DECLINED' | string;
  makerName: string;
  checkerName?: string | null;
  createdAt: string;
  checkedAt?: string | null;
}

const ADJUSTMENT_TYPES = [
  {
    label: 'Till Variance Write-Off',
    defaultDebit: '5210 - Cash Over/Short Expense',
    defaultCredit: '1010 - Main Till Cash',
  },
  {
    label: 'Staff Payroll Clawback',
    defaultDebit: '1240 - Staff Advances & Recoveries',
    defaultCredit: '1010 - Main Till Cash',
  },
  {
    label: 'Stock Shrinkage Write-Off',
    defaultDebit: '5190 - Inventory Shrinkage & Spoilage',
    defaultCredit: '1310 - Merchandise Inventory',
  },
  {
    label: 'Bank Reconciliation Drift',
    defaultDebit: '5320 - Bank Charges & Tariff Variance',
    defaultCredit: '1020 - Operating Bank Account',
  },
  {
    label: 'Vendor AP Debit Adjustment',
    defaultDebit: '2010 - Accounts Payable (Suppliers)',
    defaultCredit: '5010 - Cost of Goods Sold',
  },
  {
    label: 'Wholesale Credit Write-Down',
    defaultDebit: '5410 - Bad Debt & Credit Allowance',
    defaultCredit: '1120 - Wholesale Accounts Receivable',
  },
];

const REASON_CODES = [
  'Drawer Cash Discrepancy',
  'Counterfeit Note Confiscation',
  'Unresolved Shift Drift',
  'Bank Processing Fee Variance',
  'POS System Rounding Discrepancy',
  'Staff Shift Shortage Recovery',
  'Damaged / Expired Stock Write-Off',
  'Supplier Short-Delivery Debit',
];

export default function GeneralJournalPage() {
  const [vouchers, setVouchers] = useState<AdjustmentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Filters
  const [statusTab, setStatusTab] = useState<'ALL' | 'AWAITING_SIGN_OFF' | 'APPROVED' | 'POSTED' | 'DECLINED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Propose Voucher Modal
  const [isOpen, setIsOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState(ADJUSTMENT_TYPES[0].label);
  const [reasonCode, setReasonCode] = useState(REASON_CODES[0]);
  const [amount, setAmount] = useState('');
  const [linkedShiftSeq, setLinkedShiftSeq] = useState('');
  const [debitGlAccount, setDebitGlAccount] = useState(ADJUSTMENT_TYPES[0].defaultDebit);
  const [creditGlAccount, setCreditGlAccount] = useState(ADJUSTMENT_TYPES[0].defaultCredit);
  const [auditRemarks, setAuditRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/finance/adjustments');
      setVouchers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load adjustments', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpis = useMemo(() => {
    let pendingAmt = 0;
    let pendingCount = 0;
    let postedAmt = 0;
    let tillWriteOffAmt = 0;
    let declinedCount = 0;

    for (const v of vouchers) {
      const amt = Number(v.amount || 0);
      if (v.status === 'AWAITING_SIGN_OFF') {
        pendingAmt += amt;
        pendingCount += 1;
      } else if (v.status === 'POSTED' || v.status === 'APPROVED') {
        postedAmt += amt;
      } else if (v.status === 'DECLINED') {
        declinedCount += 1;
      }
      if (v.adjustmentType === 'Till Variance Write-Off' && v.status !== 'DECLINED') {
        tillWriteOffAmt += amt;
      }
    }

    return { pendingAmt, pendingCount, postedAmt, tillWriteOffAmt, declinedCount };
  }, [vouchers]);

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      if (statusTab !== 'ALL' && v.status !== statusTab) return false;
      if (categoryFilter !== 'ALL' && v.adjustmentType !== categoryFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        v.voucherNumber.toLowerCase().includes(q) ||
        v.reasonCode.toLowerCase().includes(q) ||
        v.debitGlAccount.toLowerCase().includes(q) ||
        v.creditGlAccount.toLowerCase().includes(q) ||
        v.makerName.toLowerCase().includes(q)
      );
    });
  }, [vouchers, statusTab, categoryFilter, search]);

  const handleTypeChange = (nextType: string) => {
    setAdjustmentType(nextType);
    const preset = ADJUSTMENT_TYPES.find((t) => t.label === nextType);
    if (preset) {
      setDebitGlAccount(preset.defaultDebit);
      setCreditGlAccount(preset.defaultCredit);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/finance/adjustments', {
        adjustmentType,
        reasonCode,
        amount: Number(amount),
        linkedShiftSeq: linkedShiftSeq.trim(),
        debitGlAccount: debitGlAccount.trim(),
        creditGlAccount: creditGlAccount.trim(),
        auditRemarks: auditRemarks.trim(),
      });
      setIsOpen(false);
      setAmount('');
      setLinkedShiftSeq('');
      setAuditRemarks('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit adjustment voucher.');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id: string, action: 'POST' | 'DECLINE') => {
    try {
      setReviewingId(id);
      await api.patch(`/finance/adjustments/${id}/review`, { action });
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to process voucher review.');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Financial Corrections &amp; Governance
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <SlidersHorizontal className="h-6 w-6 text-[#0554F4]" />
            Financial Adjustments, GL Entries &amp; Maker-Checker Audit
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Two-person integrity control: Till over/short write-offs, staff payroll clawbacks, stock shrinkage adjustments, and general ledger journal reversals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Adjustment Voucher
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENDING CHECKER SIGN-OFF</p>
            <p className="text-xl font-black text-amber-600 font-mono mt-1">
              KES {kpis.pendingAmt.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{kpis.pendingCount} Adjustments Awaiting Review</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">APPROVED &amp; POSTED TO GL</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.postedAmt.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Reconciled Ledger Balance</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCheck2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TILL VARIANCE WRITE-OFFS</p>
            <p className="text-xl font-black text-purple-600 font-mono mt-1">
              KES {kpis.tillWriteOffAmt.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-purple-600 mt-0.5">Cash Drawer Discrepancies</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DECLINED ADJUSTMENTS</p>
            <p className="text-xl font-black text-rose-600 mt-1">{kpis.declinedCount} Vouchers</p>
            <p className="text-[11px] text-rose-500 mt-0.5">Segregation of Duties Enforced</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
              {[
                { key: 'ALL', label: 'All Entries' },
                { key: 'AWAITING_SIGN_OFF', label: 'Awaiting Sign-Off' },
                { key: 'APPROVED', label: 'Approved' },
                { key: 'POSTED', label: 'Posted' },
                { key: 'DECLINED', label: 'Declined' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStatusTab(t.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
                    statusTab === t.key ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
            >
              <option value="ALL">All Adjustment Categories</option>
              {ADJUSTMENT_TYPES.map((t) => (
                <option key={t.label} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full xl:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher #, reason, or GL code..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">VOUCHER #</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CATEGORY &amp; REASON</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">MAKER (AUTHOR)</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">DEBIT / CREDIT GL</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ADJUSTMENT AMOUNT</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CHECKER (APPROVER)</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <SlidersHorizontal className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-[#041F56]">No Adjustment Vouchers Recorded</p>
                    <p className="text-xs text-slate-400 mt-1">
                      New tenants start with an empty GL adjustment book. Click <strong>New Adjustment Voucher</strong> to propose a write-off or balance correction.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <p className="font-mono font-bold text-[#041F56]">{v.voucherNumber}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(v.createdAt).toLocaleDateString('en-US')}
                        {v.linkedShiftSeq ? ` • Shift #${v.linkedShiftSeq}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">{v.adjustmentType}</p>
                      <p className="text-[10px] text-slate-500">{v.reasonCode}</p>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600">{v.makerName}</td>
                    <td className="px-4 py-4 font-mono text-[11px]">
                      <p className="text-[#041F56]">DR: {v.debitGlAccount}</p>
                      <p className="text-slate-500">CR: {v.creditGlAccount}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-bold text-[#041F56]">
                      KES {Number(v.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">
                      {v.status === 'POSTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> POSTED TO GL
                        </span>
                      ) : v.status === 'DECLINED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3" /> DECLINED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" /> AWAITING SIGN-OFF
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-500">{v.checkerName || 'Pending'}</td>
                    <td className="px-5 py-4 text-right">
                      {v.status === 'AWAITING_SIGN_OFF' ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            disabled={reviewingId === v.id}
                            onClick={() => handleReview(v.id, 'POST')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Approve &amp; Post
                          </button>
                          <button
                            disabled={reviewingId === v.id}
                            onClick={() => handleReview(v.id, 'DECLINE')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">Audited</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROPOSE FINANCIAL ADJUSTMENT VOUCHER MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Propose Financial Adjustment Voucher</h2>
                <p className="text-xs text-slate-400 mt-0.5">Maker-Checker GL Journal Adjustment</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Adjustment Type *</label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {ADJUSTMENT_TYPES.map((t) => (
                      <option key={t.label} value={t.label}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Reason Code *</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {REASON_CODES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Adjustment Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Linked Till Shift ID (Optional)</label>
                  <input
                    type="text"
                    value={linkedShiftSeq}
                    onChange={(e) => setLinkedShiftSeq(e.target.value)}
                    placeholder="e.g. 14"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Debit General Ledger Account *</label>
                  <input
                    required
                    type="text"
                    value={debitGlAccount}
                    onChange={(e) => setDebitGlAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Credit General Ledger Account *</label>
                  <input
                    required
                    type="text"
                    value={creditGlAccount}
                    onChange={(e) => setCreditGlAccount(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Audit Justification &amp; Remarks *</label>
                <textarea
                  required
                  rows={3}
                  value={auditRemarks}
                  onChange={(e) => setAuditRemarks(e.target.value)}
                  placeholder="Detail the root cause of the variance and operational verification completed..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="py-2.5 rounded-xl bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Submit Voucher for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}