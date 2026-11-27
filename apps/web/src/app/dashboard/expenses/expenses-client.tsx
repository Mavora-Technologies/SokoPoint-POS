'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Receipt,
  Plus,
  RefreshCw,
  Clock,
  CreditCard,
  DollarSign,
  AlertCircle,
  Search,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  ThumbsUp,
} from 'lucide-react';
import api from '../../../lib/api';

interface ExpenseVoucher {
  id: string;
  voucherNumber: string;
  expenseDate: string;
  categoryName: string;
  glAccountCode: string;
  subtotal: number;
  vatAmount: number;
  totalPayable: number;
  settlementTender: string;
  payeeName: string;
  etrReceiptNo?: string | null;
  merchantKraPin?: string | null;
  businessPurpose: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'DISBURSED' | 'DECLINED' | string;
  claimantName: string;
  branchName: string;
  reviewedBy?: string | null;
  disbursedBy?: string | null;
}

const EXPENSE_CATEGORIES = [
  { label: 'Store Equipment & Refrigeration Repairs', gl: '6310' },
  { label: 'Local Logistics, Fuel & Delivery Fleet', gl: '6120' },
  { label: 'Packaging, Bags & Store Consumables', gl: '6410' },
  { label: 'Staff Welfare, Allowances & Per Diem', gl: '6110' },
  { label: 'Store Electricity, Water & Internet', gl: '6210' },
  { label: 'Branch Rent, Security & Permits', gl: '6250' },
  { label: 'POS Hardware, Thermal Paper & IT', gl: '6340' },
];

const SETTLEMENT_TENDERS = [
  'Cash Drawer / Safe Drop',
  'M-Pesa Direct Disbursement',
  'Bank EFT / Wire',
  'Petty Cash Vault',
];

export default function ExpensesClient() {
  const [vouchers, setVouchers] = useState<ExpenseVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'DISBURSED' | 'DECLINED'>('ALL');
  const [search, setSearch] = useState('');

  // New Voucher Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subtotal, setSubtotal] = useState('');
  const [vatAmount, setVatAmount] = useState('0');
  const [settlementTender, setSettlementTender] = useState(SETTLEMENT_TENDERS[0]);
  const [payeeName, setPayeeName] = useState('');
  const [etrReceiptNo, setEtrReceiptNo] = useState('');
  const [merchantKraPin, setMerchantKraPin] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Review & Action Modal
  const [reviewing, setReviewing] = useState<ExpenseVoucher | null>(null);
  const [processingAction, setProcessingAction] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses');
      const data = res.data?.data ?? res.data;
      setVouchers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load expense vouchers', err);
      setVouchers([]);
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
    let approvedAmt = 0;
    let disbursedAmt = 0;
    let declinedCount = 0;

    for (const v of vouchers) {
      const amt = Number(v.totalPayable || 0);
      if (v.status === 'PENDING_REVIEW') {
        pendingAmt += amt;
        pendingCount += 1;
      } else if (v.status === 'APPROVED') {
        approvedAmt += amt;
      } else if (v.status === 'DISBURSED') {
        disbursedAmt += amt;
      } else if (v.status === 'DECLINED') {
        declinedCount += 1;
      }
    }

    return { pendingAmt, pendingCount, approvedAmt, disbursedAmt, declinedCount };
  }, [vouchers]);

  const filtered = useMemo(() => {
    return vouchers.filter((v) => {
      if (tab !== 'ALL' && v.status !== tab) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        v.voucherNumber.toLowerCase().includes(q) ||
        v.payeeName.toLowerCase().includes(q) ||
        v.categoryName.toLowerCase().includes(q) ||
        v.businessPurpose.toLowerCase().includes(q) ||
        v.claimantName.toLowerCase().includes(q)
      );
    });
  }, [vouchers, tab, search]);

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cat = EXPENSE_CATEGORIES[categoryIdx] || EXPENSE_CATEGORIES[0];
    try {
      setSubmitting(true);
      await api.post('/expenses', {
        categoryName: cat.label,
        glAccountCode: cat.gl,
        expenseDate,
        subtotal: Number(subtotal),
        vatAmount: Number(vatAmount) || 0,
        settlementTender,
        payeeName: payeeName.trim() || 'Store Vendor',
        etrReceiptNo: etrReceiptNo.trim(),
        merchantKraPin: merchantKraPin.trim(),
        businessPurpose: businessPurpose.trim(),
      });
      setIsModalOpen(false);
      setSubtotal('');
      setVatAmount('0');
      setPayeeName('');
      setEtrReceiptNo('');
      setMerchantKraPin('');
      setBusinessPurpose('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit expense voucher.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (action: 'APPROVE' | 'DISBURSE' | 'DECLINE') => {
    if (!reviewing) return;
    try {
      setProcessingAction(true);
      await api.patch(`/expenses/${reviewing.id}/action`, { action });
      setReviewing(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update voucher status.');
    } finally {
      setProcessingAction(false);
    }
  };

  const renderStatus = (status: string) => {
    if (status === 'DISBURSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> DISBURSED
        </span>
      );
    }
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
          <ThumbsUp className="h-3 w-3" /> APPROVED (READY FOR PAY)
        </span>
      );
    }
    if (status === 'DECLINED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="h-3 w-3" /> DECLINED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> PENDING REVIEW
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Financial Accounting &amp; Disbursements
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <Receipt className="h-6 w-6 text-[#0554F4]" />
            Corporate Expense Management &amp; Employee Claims
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Multi-tier review, GL account coding, KRA ETR receipt compliance, and automated treasury &amp; petty cash disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Expense Voucher
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENDING REVIEW</p>
            <p className="text-xl font-black text-amber-600 font-mono mt-1">
              KES {kpis.pendingAmt.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">{kpis.pendingCount} Claims in Approval Queue</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">APPROVED FOR PAYOUT</p>
            <p className="text-xl font-black text-[#0554F4] font-mono mt-1">
              KES {kpis.approvedAmt.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Ready for Cashier / B2C Pay</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DISBURSED (SETTLED)</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.disbursedAmt.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Cleared from General Ledger</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">REJECTED CLAIMS</p>
            <p className="text-xl font-black text-rose-600 mt-1">{kpis.declinedCount} Claims</p>
            <p className="text-[11px] text-rose-500 mt-0.5">Failed Policy Verification</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
            {[
              { key: 'ALL', label: 'All Claims' },
              { key: 'PENDING_REVIEW', label: 'Pending Review' },
              { key: 'APPROVED', label: 'Approved' },
              { key: 'DISBURSED', label: 'Disbursed' },
              { key: 'DECLINED', label: 'Declined' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
                  tab === t.key ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search voucher, payee, or description..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">VOUCHER #</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">DATE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CLAIMANT / STAFF</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CATEGORY &amp; GL ACCOUNT</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">DESCRIPTION &amp; PAYEE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">SUBTOTAL</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">TAX (VAT)</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">TOTAL PAYABLE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">LIFECYCLE STATUS</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center">
                    <Receipt className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-[#041F56]">No Expense Claims Recorded</p>
                    <p className="text-xs text-slate-400 mt-1">
                      New tenants start with zero synthetic entries. Click <strong>New Expense Voucher</strong> to submit an operational disbursement.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-mono font-bold text-[#041F56]">{v.voucherNumber}</td>
                    <td className="px-4 py-4 font-mono text-slate-500">
                      {new Date(v.expenseDate).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#041F56]">{v.claimantName}</p>
                      <p className="text-[10px] text-slate-400">{v.branchName}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-800">{v.categoryName}</p>
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px] font-bold">
                        GL: {v.glAccountCode}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800">{v.businessPurpose}</p>
                      <p className="text-[10px] text-slate-400">
                        {v.payeeName} {v.etrReceiptNo ? `• ETR/Rec: ${v.etrReceiptNo}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-700">
                      KES {Number(v.subtotal || 0).toLocaleString('en-KE')}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-500">
                      KES {Number(v.vatAmount || 0).toLocaleString('en-KE')}
                    </td>
                    <td className="px-4 py-4 text-right font-mono font-black text-[#041F56]">
                      KES {Number(v.totalPayable || 0).toLocaleString('en-KE')}
                    </td>
                    <td className="px-4 py-4">{renderStatus(v.status)}</td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setReviewing(v)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#041F56] text-xs font-bold cursor-pointer"
                      >
                        Review &amp; Action
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW CORPORATE EXPENSE VOUCHER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">New Corporate Expense Voucher</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submit employee reimbursement or petty cash disbursement
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitVoucher} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Expense Category *</label>
                  <select
                    value={categoryIdx}
                    onChange={(e) => setCategoryIdx(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {EXPENSE_CATEGORIES.map((c, idx) => (
                      <option key={c.gl} value={idx}>
                        {c.label} (GL: {c.gl})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Expense Date *</label>
                  <input
                    required
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Base Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">VAT / Tax Portion (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={vatAmount}
                    onChange={(e) => setVatAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Settlement Tender *</label>
                  <select
                    value={settlementTender}
                    onChange={(e) => setSettlementTender(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {SETTLEMENT_TENDERS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Payee / Merchant Name</label>
                  <input
                    type="text"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    placeholder="e.g. Kenya Power, Wholesale Hardware"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">ETR / Receipt Number</label>
                  <input
                    type="text"
                    value={etrReceiptNo}
                    onChange={(e) => setEtrReceiptNo(e.target.value)}
                    placeholder="e.g. REC-99214"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Merchant KRA Tax PIN</label>
                  <input
                    type="text"
                    value={merchantKraPin}
                    onChange={(e) => setMerchantKraPin(e.target.value)}
                    placeholder="e.g. P051234567X"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Detailed Business Purpose *</label>
                <textarea
                  required
                  rows={3}
                  value={businessPurpose}
                  onChange={(e) => setBusinessPurpose(e.target.value)}
                  placeholder="State the justification, operational department, and reason for this expenditure..."
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  Submit Voucher for Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW & ACTION MODAL */}
      {reviewing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-[#041F56] font-mono">{reviewing.voucherNumber}</h2>
                  {renderStatus(reviewing.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {reviewing.categoryName} (GL: {reviewing.glAccountCode})
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">TOTAL PAYABLE</p>
                <p className="text-base font-mono font-black text-[#041F56] mt-0.5">
                  KES {Number(reviewing.totalPayable || 0).toLocaleString('en-KE')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">SETTLEMENT TENDER</p>
                <p className="font-semibold text-slate-800 mt-1">{reviewing.settlementTender}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">PAYEE / ETR</p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {reviewing.payeeName} {reviewing.etrReceiptNo ? `(${reviewing.etrReceiptNo})` : ''}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">KRA PIN</p>
                <p className="font-mono text-slate-600 mt-0.5">{reviewing.merchantKraPin || '—'}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">BUSINESS PURPOSE</p>
                <p className="text-slate-700 mt-0.5">{reviewing.businessPurpose}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setReviewing(null)}
                className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {reviewing.status === 'PENDING_REVIEW' && (
                  <>
                    <button
                      disabled={processingAction}
                      onClick={() => handleTransition('DECLINE')}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      disabled={processingAction}
                      onClick={() => handleTransition('APPROVE')}
                      className="px-4 py-2 rounded-xl bg-[#0554F4] text-white text-xs font-bold cursor-pointer"
                    >
                      Approve for Payout
                    </button>
                  </>
                )}

                {reviewing.status === 'APPROVED' && (
                  <button
                    disabled={processingAction}
                    onClick={() => handleTransition('DISBURSE')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {processingAction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Disburse &amp; Post to GL
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}