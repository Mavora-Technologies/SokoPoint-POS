'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Smartphone,
  Send,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../lib/api';

interface MpesaTx {
  id: string;
  mpesaReceiptNo: string;
  direction: 'C2B_INBOUND' | 'B2B_OUTBOUND' | string;
  channelType: string;
  phoneOrShortcode: string;
  accountReference: string;
  beneficiaryOrOrder: string;
  amount: number;
  gatewayStatus: 'AWAITING_PIN' | 'COMPLETED' | 'FAILED' | string;
  remarks?: string | null;
  initiatedBy: string;
  createdAt: string;
}

export default function MpesaGatewayPage() {
  const [transactions, setTransactions] = useState<MpesaTx[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ALL' | 'C2B_INBOUND' | 'B2B_OUTBOUND'>('ALL');

  // Inspect Modal
  const [inspecting, setInspecting] = useState<MpesaTx | null>(null);
  const [confirmReceiptInput, setConfirmReceiptInput] = useState('');
  const [updating, setUpdating] = useState(false);

  // STK Push Modal
  const [isStkOpen, setIsStkOpen] = useState(false);
  const [stkRefSource, setStkRefSource] = useState<'ORDER' | 'DIRECT'>('DIRECT');
  const [stkPhone, setStkPhone] = useState('');
  const [stkAmount, setStkAmount] = useState('');
  const [stkAccountRef, setStkAccountRef] = useState('');
  const [stkRemarks, setStkRemarks] = useState('');
  const [sendingStk, setSendingStk] = useState(false);

  // B2B Payout Modal
  const [isB2bOpen, setIsB2bOpen] = useState(false);
  const [b2bReceiverType, setB2bReceiverType] = useState<'PAYBILL_B2B' | 'TILL_B2B'>('PAYBILL_B2B');
  const [b2bShortcode, setB2bShortcode] = useState('');
  const [b2bAmount, setB2bAmount] = useState('');
  const [b2bAccountRef, setB2bAccountRef] = useState('');
  const [b2bSupplierId, setB2bSupplierId] = useState('');
  const [b2bNotes, setB2bNotes] = useState('');
  const [sendingB2b, setSendingB2b] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const [mpRes, supRes] = await Promise.allSettled([
      api.get('/finance/mpesa'),
      api.get('/inventory/suppliers').catch(() => api.get('/suppliers')),
    ]);

    if (mpRes.status === 'fulfilled') {
      const data = mpRes.value.data?.data ?? mpRes.value.data;
      setTransactions(Array.isArray(data) ? data : []);
    } else {
      const err: any = mpRes.reason;
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load M-Pesa gateway transactions.');
      }
      setTransactions([]);
    }

    if (supRes.status === 'fulfilled') {
      const sData = supRes.value.data?.data ?? supRes.value.data;
      setSuppliers(Array.isArray(sData) ? sData : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live KPIs
  const kpis = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    let pendingCount = 0;

    for (const t of transactions) {
      if (t.gatewayStatus === 'AWAITING_PIN') pendingCount += 1;
      if (t.gatewayStatus === 'COMPLETED') {
        if (t.direction === 'C2B_INBOUND') inflow += Number(t.amount || 0);
        else outflow += Number(t.amount || 0);
      }
    }

    return {
      inflow,
      outflow,
      netLiquidity: inflow - outflow,
      pendingCount,
    };
  }, [transactions]);

  const openStkModal = () => {
    setStkPhone('');
    setStkAmount('');
    setStkAccountRef(`SKP-RCP-${Math.floor(100000 + Math.random() * 900000)}`);
    setStkRemarks('');
    setStkRefSource('DIRECT');
    setIsStkOpen(true);
  };

  const handleSendStk = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSendingStk(true);
      await api.post('/finance/mpesa/stk-push', {
        phoneNumber: stkPhone.trim(),
        amount: Number(stkAmount),
        accountReference: stkAccountRef.trim(),
        beneficiaryOrOrder: stkRefSource === 'ORDER' ? 'Active POS Order Settlement' : 'Direct Counter Checkout',
        remarks: stkRemarks.trim(),
      });
      setIsStkOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to dispatch STK Push prompt.');
    } finally {
      setSendingStk(false);
    }
  };

  const handleSendB2b = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSendingB2b(true);
      await api.post('/finance/mpesa/b2b-payout', {
        receiverType: b2bReceiverType,
        shortcode: b2bShortcode.trim(),
        amount: Number(b2bAmount),
        accountReference: b2bAccountRef.trim(),
        supplierId: b2bSupplierId || null,
        remarks: b2bNotes.trim(),
      });
      setIsB2bOpen(false);
      setB2bShortcode('');
      setB2bAmount('');
      setB2bAccountRef('');
      setB2bNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to authorize B2B payout.');
    } finally {
      setSendingB2b(false);
    }
  };

  const handleUpdateStatus = async (txId: string, status: 'COMPLETED' | 'FAILED') => {
    try {
      setUpdating(true);
      await api.patch(`/finance/mpesa/${txId}/status`, {
        gatewayStatus: status,
        mpesaReceiptNo: confirmReceiptInput.trim() || undefined,
      });
      setInspecting(null);
      setConfirmReceiptInput('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update transaction status.');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (tab !== 'ALL' && t.direction !== tab) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.mpesaReceiptNo.toLowerCase().includes(q) ||
        t.phoneOrShortcode.toLowerCase().includes(q) ||
        t.accountReference.toLowerCase().includes(q) ||
        t.beneficiaryOrOrder.toLowerCase().includes(q)
      );
    });
  }, [transactions, tab, search]);

  const renderStatusBadge = (status: string) => {
    if (status === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> COMPLETED
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="h-3 w-3" /> FAILED / CANCELLED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
        <Clock className="h-3 w-3" /> AWAITING PIN
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Payments Journal &rsaquo; M-Pesa Treasury Gateway
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            M-Pesa B2B / C2B Settlement Gateway
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Real-time Daraja API transaction telemetry: customer STK push prompts, supplier Paybill disbursements, and automated clearing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openStkModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Smartphone className="h-4 w-4" /> Request STK Push (AR)
          </button>
          <button
            onClick={() => setIsB2bOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="h-4 w-4" /> Pay Supplier Paybill (AP)
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-PESA INFLOW (C2B / STK)</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.inflow.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Customer collections</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">M-PESA OUTFLOW (B2B AP)</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.outflow.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Supplier paybill payouts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET LIQUIDITY POSITION</p>
            <p className={`text-xl font-black font-mono mt-1 ${kpis.netLiquidity >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              KES {kpis.netLiquidity.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#176E84] mt-0.5">Paybill float net balance</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PENDING PUSH PROMPTS</p>
            <p className="text-xl font-black text-amber-600 mt-1">{kpis.pendingCount} Trans</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting customer PIN</p>
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

      {/* Search & Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search M-Pesa receipt # (e.g. QK8912KL99), phone, or shortcode..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Transactions' },
            { key: 'C2B_INBOUND', label: 'C2B / STK Inflow' },
            { key: 'B2B_OUTBOUND', label: 'B2B Outflow' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                tab === t.key
                  ? 'bg-white text-[#041F56] font-bold shadow-xs'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[960px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">RECEIPT # / TIMESTAMP</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">DIRECTION &amp; FLOW</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">PHONE / SHORTCODE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">ACCOUNT REFERENCE</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">BENEFICIARY / ORDER REF</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">AMOUNT (KES)</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">GATEWAY STATUS</th>
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
                  No M-Pesa gateway transactions recorded yet.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isInbound = t.direction === 'C2B_INBOUND';
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-[#041F56]">{t.mpesaReceiptNo}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(t.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
                        {isInbound ? '↗ C2B Inbound' : '↙ B2B Outbound'}
                      </span>
                      <p className="text-[9px] font-mono text-slate-400 mt-1 uppercase">
                        {t.channelType.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-mono font-semibold text-slate-700">{t.phoneOrShortcode}</td>
                    <td className="px-4 py-4 font-mono font-bold text-[#041F56]">{t.accountReference}</td>
                    <td className="px-4 py-4 italic text-slate-500">{t.beneficiaryOrOrder}</td>
                    <td
                      className={`px-4 py-4 text-right font-mono font-bold ${
                        isInbound ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isInbound ? '+' : '-'}KES {Number(t.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">{renderStatusBadge(t.gatewayStatus)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setInspecting(t);
                          setConfirmReceiptInput(t.mpesaReceiptNo === 'PENDING-CALLBACK' ? '' : t.mpesaReceiptNo);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0554F4] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DISPATCH STK PUSH MODAL */}
      {isStkOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Dispatch M-Pesa STK Push Prompt</h2>
                <p className="text-xs text-[#176E84] mt-0.5">Pushes real-time USSD PIN prompt to customer handset</p>
              </div>
              <button onClick={() => setIsStkOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendStk} className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 p-3.5 space-y-2">
                <p className="text-xs font-bold text-[#041F56]">Account Reference Source *</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStkRefSource('ORDER')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      stkRefSource === 'ORDER'
                        ? 'border-[#0554F4] bg-blue-50 text-[#0554F4]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Active POS Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setStkRefSource('DIRECT')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      stkRefSource === 'DIRECT'
                        ? 'border-[#0554F4] bg-blue-50 text-[#0554F4]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Direct Register Ref
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Customer Phone Number *</label>
                <input
                  required
                  type="text"
                  value={stkPhone}
                  onChange={(e) => setStkPhone(e.target.value)}
                  placeholder="0712345678 or 254712345678"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#0554F4]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="any"
                    value={stkAmount}
                    onChange={(e) => setStkAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Resolved Account Ref *</label>
                  <input
                    required
                    type="text"
                    value={stkAccountRef}
                    onChange={(e) => setStkAccountRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Transaction Remarks</label>
                <input
                  type="text"
                  value={stkRemarks}
                  onChange={(e) => setStkRemarks(e.target.value)}
                  placeholder="e.g. Retail Counter / Wholesale Order Settlement"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStkOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingStk}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {sendingStk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Send STK Prompt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISBURSE M-PESA B2B MODAL */}
      {isB2bOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Disburse M-Pesa B2B Working Capital</h2>
                <p className="text-xs text-[#176E84] mt-0.5">Direct settlement to supplier Paybill or Buy Goods till</p>
              </div>
              <button onClick={() => setIsB2bOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendB2b} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Receiver Account Type *</label>
                  <select
                    value={b2bReceiverType}
                    onChange={(e) => setB2bReceiverType(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="PAYBILL_B2B">Business Paybill</option>
                    <option value="TILL_B2B">Buy Goods Till</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Paybill / Till Number *</label>
                  <input
                    required
                    type="text"
                    value={b2bShortcode}
                    onChange={(e) => setB2bShortcode(e.target.value)}
                    placeholder="e.g. 522522 or 991200"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Disbursement Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    step="any"
                    value={b2bAmount}
                    onChange={(e) => setB2bAmount(e.target.value)}
                    placeholder="e.g. 28500.00"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Account Reference / Acc No *</label>
                  <input
                    required
                    type="text"
                    value={b2bAccountRef}
                    onChange={(e) => setB2bAccountRef(e.target.value)}
                    placeholder="e.g. INV-8812 or Vendor Acc #"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Beneficiary Supplier</label>
                <select
                  value={b2bSupplierId}
                  onChange={(e) => setB2bSupplierId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                >
                  <option value="">Select supplier master...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Disbursement Notes</label>
                <input
                  type="text"
                  value={b2bNotes}
                  onChange={(e) => setB2bNotes(e.target.value)}
                  placeholder="e.g. Wholesale stock delivery settlement"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsB2bOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingB2b}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {sendingB2b ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Authorize B2B Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT M-PESA TRANSACTION MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-extrabold text-[#041F56] font-mono">{inspecting.mpesaReceiptNo}</h2>
                  {renderStatusBadge(inspecting.gatewayStatus)}
                </div>
                <p className="text-xs text-[#176E84] mt-1">
                  Account Ref: <strong className="font-mono text-[#041F56]">{inspecting.accountReference}</strong>
                </p>
              </div>
              <button onClick={() => setInspecting(null)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">AMOUNT</p>
                <p className="text-base font-mono font-black text-[#041F56] mt-0.5">
                  KES {Number(inspecting.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">PHONE / SHORTCODE</p>
                <p className="font-mono font-bold text-slate-800 mt-1">{inspecting.phoneOrShortcode}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">BENEFICIARY / ORDER</p>
                <p className="font-semibold text-slate-700 mt-0.5">{inspecting.beneficiaryOrOrder}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">INITIATED BY</p>
                <p className="font-mono text-slate-600 mt-0.5">{inspecting.initiatedBy}</p>
              </div>
            </div>

            {inspecting.gatewayStatus === 'AWAITING_PIN' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#041F56]">
                  M-Pesa Confirmation Code (Optional)
                </label>
                <input
                  type="text"
                  value={confirmReceiptInput}
                  onChange={(e) => setConfirmReceiptInput(e.target.value)}
                  placeholder="e.g. QK8912KL99 (auto-generated if blank)"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                />
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="text-xs font-bold text-slate-600 px-3 py-2 cursor-pointer"
              >
                Close
              </button>

              {inspecting.gatewayStatus === 'AWAITING_PIN' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleUpdateStatus(inspecting.id, 'FAILED')}
                    className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 text-xs font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Mark Failed
                  </button>
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => handleUpdateStatus(inspecting.id, 'COMPLETED')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm &amp; Sync Ledger
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}