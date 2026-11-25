'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  Scale,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  RotateCcw,
  X,
  Wallet,
  Smartphone,
  CreditCard,
  Landmark,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../lib/api';

interface TreasuryPayment {
  id: string;
  documentNumber: string;
  flowDirection: 'INBOUND_AR' | 'OUTBOUND_AP' | string;
  paymentMethod: string;
  clearingChannel: string;
  transactionRef: string;
  supplierId?: string | null;
  counterpartyName: string;
  allocatedBill: string;
  amount: number;
  clearingStatus: 'POSTED_UNRECONCILED' | 'CLEARED' | 'REVERSED' | string;
  auditNotes?: string | null;
  processedBy: string;
  createdAt: string;
}

const DISBURSEMENT_METHODS = [
  { value: 'M_PESA_B2B', label: 'M-Pesa B2B Paybill / Buy Goods' },
  { value: 'BANK_WIRE', label: 'Bank EFT / RTGS Wire Transfer' },
  { value: 'CASH_DRAWER', label: 'POS Cash Drawer Register' },
  { value: 'CARD_PDQ', label: 'Card PDQ / Offline Terminal' },
];

const CLEARING_ACCOUNTS = [
  'M-Pesa B2B Corporate Paybill',
  'M-Pesa Express Till Clearing',
  'POS Cash Drawer Register',
  'KCB / Equity Operating Account',
  'Card PDQ Merchant Settlement',
];

export default function TenderSettlementPage() {
  const [payments, setPayments] = useState<TreasuryPayment[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [flowTab, setFlowTab] = useState<'ALL' | 'OUTBOUND_AP' | 'INBOUND_AR'>('ALL');

  // Inspect Modal
  const [inspecting, setInspecting] = useState<TreasuryPayment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Post Payment Document Modal
  const [isPostOpen, setIsPostOpen] = useState(false);
  const [flowDirection, setFlowDirection] = useState<'OUTBOUND_AP' | 'INBOUND_AR'>('OUTBOUND_AP');
  const [paymentMethod, setPaymentMethod] = useState('M_PESA_B2B');
  const [clearingChannel, setClearingChannel] = useState(CLEARING_ACCOUNTS[0]);
  const [amount, setAmount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const [pmtRes, supRes] = await Promise.allSettled([
      api.get('/finance/tender-settlement'),
      api.get('/inventory/suppliers').catch(() => api.get('/suppliers')),
    ]);

    if (pmtRes.status === 'fulfilled') {
      const data = pmtRes.value.data?.data ?? pmtRes.value.data;
      setPayments(Array.isArray(data) ? data : []);
    } else {
      const err: any = pmtRes.reason;
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load treasury payment documents.');
      }
      setPayments([]);
    }

    if (supRes.status === 'fulfilled') {
      const sData = supRes.value.data?.data ?? supRes.value.data;
      const sList = Array.isArray(sData) ? sData : [];
      setSuppliers(sList);
      if (sList[0]?.id) setSupplierId((prev) => prev || sList[0].id);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live KPIs
  const kpis = useMemo(() => {
    let outboundAp = 0;
    let inboundAr = 0;
    let pendingClearing = 0;

    for (const p of payments) {
      if (p.clearingStatus === 'REVERSED') continue;
      if (p.flowDirection === 'OUTBOUND_AP') outboundAp += Number(p.amount || 0);
      else inboundAr += Number(p.amount || 0);

      if (p.clearingStatus === 'POSTED_UNRECONCILED') pendingClearing += 1;
    }

    return {
      outboundAp,
      inboundAr,
      netCashPosition: inboundAr - outboundAp,
      pendingClearing,
    };
  }, [payments]);

  const handleReconcile = async (docId: string) => {
    try {
      setActionLoading(true);
      await api.patch(`/finance/tender-settlement/${docId}/reconcile`);
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reconcile payment document.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStornoReverse = async (docId: string) => {
    if (!confirm('Post a compensating Storno Reversal for this treasury document?')) return;
    try {
      setActionLoading(true);
      await api.post(`/finance/tender-settlement/${docId}/reverse`);
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to post storno reversal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCommitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      alert('Enter a valid amount greater than 0.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/finance/tender-settlement', {
        flowDirection,
        paymentMethod,
        clearingChannel,
        amount: Number(amount),
        transactionRef: transactionRef.trim(),
        supplierId: flowDirection === 'OUTBOUND_AP' ? supplierId || null : null,
        counterpartyName: flowDirection === 'INBOUND_AR' ? counterpartyName.trim() || 'Retail Cash Collection' : '',
        auditNotes: auditNotes.trim(),
      });
      setIsPostOpen(false);
      setAmount('');
      setTransactionRef('');
      setAuditNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to commit treasury payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (flowTab !== 'ALL' && p.flowDirection !== flowTab) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.documentNumber.toLowerCase().includes(q) ||
        p.transactionRef.toLowerCase().includes(q) ||
        p.counterpartyName.toLowerCase().includes(q) ||
        p.clearingChannel.toLowerCase().includes(q)
      );
    });
  }, [payments, flowTab, search]);

  const getChannelIcon = (method: string) => {
    if (method.includes('MPESA') || method.includes('M_PESA')) return <Smartphone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />;
    if (method.includes('BANK')) return <Landmark className="h-3.5 w-3.5 text-[#0554F4] shrink-0" />;
    if (method.includes('CARD')) return <CreditCard className="h-3.5 w-3.5 text-slate-500 shrink-0" />;
    return <Wallet className="h-3.5 w-3.5 text-amber-600 shrink-0" />;
  };

  const renderClearingBadge = (status: string) => {
    if (status === 'CLEARED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> RECONCILED
        </span>
      );
    }
    if (status === 'REVERSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <RotateCcw className="h-3 w-3" /> STORNO REVERSED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
        <Clock className="h-3 w-3" /> POSTED UNRECONCILED
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Finance &amp; Treasury &rsaquo; Payments Journal
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Payments &amp; Treasury Operations
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Audit outbound supplier disbursements (AP), bank clearings, M-Pesa B2B channels, and POS cash ledger reconciliations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/payments/reconciliation"
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#0554F4] text-xs font-bold rounded-xl inline-flex items-center gap-1.5"
          >
            <Scale className="h-4 w-4" /> Reconciliation Workbench
          </Link>
          <button
            onClick={() => setIsPostOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Post Payment Document
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OUTBOUND AP PAYOUTS</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.outboundAp.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Disbursed to suppliers</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">INBOUND RECEIPTS (AR)</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.inboundAr.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Customer &amp; POS collections</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET CASH POSITION</p>
            <p className={`text-xl font-black font-mono mt-1 ${kpis.netCashPosition >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              KES {kpis.netCashPosition.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#176E84] mt-0.5">Treasury liquidity delta</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENDING BANK CLEARING</p>
            <p className="text-xl font-black text-amber-600 mt-1">
              {kpis.pendingClearing} Document{kpis.pendingClearing === 1 ? '' : 's'}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting bank statement</p>
          </div>
          <button
            onClick={loadData}
            className="w-10 h-10 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex justify-between items-center">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          {isUnauthorized && (
            <Link href="/login" className="px-3 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1">
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>
      )}

      {/* Search & Flow Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payment #, bank reference, M-Pesa code, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Payments' },
            { key: 'OUTBOUND_AP', label: 'Supplier Outflow (AP)' },
            { key: 'INBOUND_AR', label: 'Collections (AR)' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFlowTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                flowTab === tab.key
                  ? 'bg-white text-[#041F56] font-bold shadow-xs'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[1000px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">DOCUMENT # &amp; DATE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">FLOW &amp; DIRECTION</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">TREASURY CLEARING CHANNEL</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">TRANSACTION / RECEIPT REF</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">COUNTERPARTY / INVOICE REF</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">AMOUNT (KES)</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CLEARING STATUS</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-bold">
                  No treasury payment documents posted yet.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const isInbound = p.flowDirection === 'INBOUND_AR';
                return (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-[#041F56]">{p.documentNumber}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(p.createdAt).toLocaleDateString('en-US')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          isInbound
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isInbound ? '↗ Inbound AR' : '↙ Outbound AP'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                        {getChannelIcon(p.paymentMethod)}
                        <span className="truncate max-w-[180px]">{p.clearingChannel}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600">{p.transactionRef}</td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#0554F4]">{p.counterpartyName}</p>
                      <p className="text-[10px] text-slate-400">{p.allocatedBill}</p>
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-mono font-bold ${
                        isInbound ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isInbound ? '+' : '-'}KES {Number(p.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">{renderClearingBadge(p.clearingStatus)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {p.clearingStatus === 'POSTED_UNRECONCILED' && (
                          <button
                            onClick={() => handleReconcile(p.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Clear
                          </button>
                        )}
                        <button
                          onClick={() => setInspecting(p)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0554F4] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          Inspect &rarr;
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* INSPECT PAYMENT DOCUMENT MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-extrabold text-[#041F56] font-mono">{inspecting.documentNumber}</h2>
                  {renderClearingBadge(inspecting.clearingStatus)}
                </div>
                <p className="text-xs text-[#176E84] mt-1">
                  Flow: <strong className="text-[#041F56]">{inspecting.flowDirection.replace('_', ' ')}</strong> | Channel:{' '}
                  <strong className="text-[#041F56]">{inspecting.paymentMethod}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspecting(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">DISBURSED / COLLECTED AMOUNT</p>
                <p className="text-lg font-mono font-black text-[#041F56] mt-1">
                  KES {Number(inspecting.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">TRANSACTION REFERENCE</p>
                <p className="text-sm font-mono font-bold text-[#041F56] mt-1">{inspecting.transactionRef}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">COUNTERPARTY</p>
                <p className="text-xs font-bold text-slate-800 mt-1">{inspecting.counterpartyName}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">ALLOCATED BILL</p>
                <p className="text-xs font-bold text-[#0554F4] mt-1">{inspecting.allocatedBill}</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500">Clearing Treasury Channel:</span>
                <span className="font-bold text-slate-800">{inspecting.clearingChannel}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-slate-500">Processed By:</span>
                <span className="font-mono text-slate-700">{inspecting.processedBy}</span>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-3 text-slate-600">
                <strong className="text-slate-700">Audit Notes: </strong>
                {inspecting.auditNotes || `Treasury settlement for ${inspecting.transactionRef}`}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer"
              >
                Close
              </button>

              {inspecting.clearingStatus !== 'REVERSED' && (
                <div className="flex flex-wrap items-center gap-2.5">
                  {inspecting.clearingStatus === 'POSTED_UNRECONCILED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleReconcile(inspecting.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Reconcile to Bank
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStornoReverse(inspecting.id)}
                    className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Compensating Storno Reversal
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* POST TREASURY PAYMENT DOCUMENT MODAL */}
      {isPostOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Post Treasury Payment Document</h2>
                <p className="text-xs text-[#176E84]">Record vendor disbursements (AP) or cash receipts (AR)</p>
              </div>
              <button onClick={() => setIsPostOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCommitPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Payment Flow *</label>
                  <select
                    value={flowDirection}
                    onChange={(e) => setFlowDirection(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="OUTBOUND_AP">OUTBOUND AP: Supplier Payout</option>
                    <option value="INBOUND_AR">INBOUND AR: Customer / POS Collection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Disbursement Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {DISBURSEMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Treasury Clearing Account *</label>
                <select
                  value={clearingChannel}
                  onChange={(e) => setClearingChannel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                >
                  {CLEARING_ACCOUNTS.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Disbursement Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 45000.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">M-Pesa / Bank Wire Ref #</label>
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="E.G. QK8912KL99"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              {flowDirection === 'OUTBOUND_AP' ? (
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Beneficiary Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Collection Counterparty</label>
                  <input
                    type="text"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    placeholder="e.g. Wholesale Credit Settlement / Till 1 Drop"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Payment Purpose / Description</label>
                <input
                  type="text"
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="e.g. Weekly wholesale stock & beverage supplier settlement"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPostOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Commit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}