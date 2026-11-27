'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Zap,
  Upload,
  FileText,
  Landmark,
  Scale,
  Sparkles,
  CheckCircle2,
  Loader2,
  X,
  Plus,
  Trash2,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../lib/api';

interface BookPayment {
  id: string;
  documentNumber: string;
  flowDirection: string;
  paymentMethod: string;
  clearingChannel: string;
  transactionRef: string;
  counterpartyName: string;
  allocatedBill: string;
  amount: number;
  createdAt: string;
}

interface BankLine {
  id: string;
  clearingChannel: string;
  txDate: string;
  referenceNo: string;
  description: string;
  amount: number;
  status: string;
}

interface ClearedItem {
  id: string;
  txDate: string;
  referenceNo: string;
  description: string;
  amount: number;
  clearingChannel: string;
  matchedAt: string;
  documentNumber?: string;
  counterpartyName?: string;
}

interface DraftLine {
  txDate: string;
  referenceNo: string;
  description: string;
  amount: number;
}

const CHANNELS = [
  'POS Cash Drawer Register',
  'M-Pesa Express Till Clearing',
  'M-Pesa B2B Corporate Paybill',
  'KCB / Equity Operating Account',
  'Card PDQ Merchant Settlement',
];

export default function BankReconciliationPage() {
  const [bookPayments, setBookPayments] = useState<BookPayment[]>([]);
  const [bankLines, setBankLines] = useState<BankLine[]>([]);
  const [clearedHistory, setClearedHistory] = useState<ClearedItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [channelFilter, setChannelFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'MATCHING' | 'HISTORY'>('MATCHING');

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);

  // Import Statement Modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importChannel, setImportChannel] = useState(CHANNELS[0]);
  const [statementRef, setStatementRef] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [closingBalance, setClosingBalance] = useState('0.00');
  const [statementDate, setStatementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [csvText, setCsvText] = useState('');
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const res = await api.get('/finance/reconciliation');
      const d = res.data?.data || {};
      setBookPayments(Array.isArray(d.bookPayments) ? d.bookPayments : []);
      setBankLines(Array.isArray(d.bankLines) ? d.bankLines : []);
      setClearedHistory(Array.isArray(d.clearedHistory) ? d.clearedHistory : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load reconciliation workbench.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredBooks = useMemo(
    () =>
      channelFilter === 'ALL'
        ? bookPayments
        : bookPayments.filter((b) => b.clearingChannel === channelFilter),
    [bookPayments, channelFilter]
  );

  const filteredBanks = useMemo(
    () =>
      channelFilter === 'ALL'
        ? bankLines
        : bankLines.filter((b) => b.clearingChannel === channelFilter),
    [bankLines, channelFilter]
  );

  const kpis = useMemo(() => {
    const bookTotal = filteredBooks.reduce((s, b) => s + Number(b.amount || 0), 0);
    const bankTotal = filteredBanks.reduce((s, b) => s + Math.abs(Number(b.amount || 0)), 0);
    return {
      bookCount: filteredBooks.length,
      bookTotal,
      bankCount: filteredBanks.length,
      bankTotal,
      variance: Math.abs(bookTotal - bankTotal),
    };
  }, [filteredBooks, filteredBanks]);

  const openImportModal = () => {
    setStatementRef(`BST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setCsvText('');
    setDraftLines([]);
    setIsImportOpen(true);
  };

  const parseCsvLines = (raw: string) => {
    const rows = raw
      .split(/\r?\n/)
      .map((r) => r.trim())
      .filter(Boolean);
    const parsed: DraftLine[] = [];
    for (const row of rows) {
      const parts = row.split(',').map((p) => p.trim());
      if (parts.length < 4) continue;
      const amt = Number(parts[3]);
      if (!Number.isFinite(amt) || amt === 0) continue;
      parsed.push({
        txDate: parts[0] || statementDate,
        referenceNo: parts[1] || 'NO-REF',
        description: parts[2] || 'Bank Statement Entry',
        amount: amt,
      });
    }
    setDraftLines((prev) => [...prev, ...parsed]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setCsvText(text);
      parseCsvLines(text);
    };
    reader.readAsText(file);
  };

  const handleCommitStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftLines.length === 0) {
      alert('Parse CSV lines or add at least one statement line manually.');
      return;
    }
    try {
      setImporting(true);
      await api.post('/finance/reconciliation/import', {
        clearingChannel: importChannel,
        statementRef,
        openingBalance: Number(openingBalance) || 0,
        closingBalance: Number(closingBalance) || 0,
        statementDate,
        lines: draftLines,
      });
      setIsImportOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to commit statement feed.');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmMatch = async () => {
    if (!selectedBookId || !selectedBankId) return;
    try {
      setMatching(true);
      await api.post('/finance/reconciliation/match', {
        paymentId: selectedBookId,
        bankLineId: selectedBankId,
      });
      setSelectedBookId(null);
      setSelectedBankId(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to match and clear.');
    } finally {
      setMatching(false);
    }
  };

  const handleAutoMatch = async () => {
    try {
      setMatching(true);
      const res = await api.post('/finance/reconciliation/auto-match');
      const count = res.data?.data?.matchedCount || 0;
      alert(`Auto-matched and cleared ${count} pair(s).`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Auto-match failed.');
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Payments Journal &rsaquo; Bank Reconciliation Workbench
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Two-Sided Bank Statement Reconciliation
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Pair SokoPoint book payments against M-Pesa, bank, card, and cash drawer statements, resolve discrepancies, and clear unrecorded debits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAutoMatch}
            disabled={matching || filteredBooks.length === 0 || filteredBanks.length === 0}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Zap className="h-4 w-4" /> 1-Click Auto Match
          </button>
          <button
            onClick={openImportModal}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="h-4 w-4" /> Import Statement Feed
          </button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UNRECONCILED BOOK LEDGER</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.bookCount} Payments</p>
            <p className="text-xs font-mono font-bold text-[#0554F4] mt-0.5">
              KES {kpis.bookTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UNMATCHED BANK STATEMENT FEED</p>
            <p className="text-xl font-black text-amber-600 mt-1">{kpis.bankCount} Lines</p>
            <p className="text-xs font-mono font-bold text-amber-600 mt-0.5">
              KES {kpis.bankTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RECONCILIATION VARIANCE</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.variance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Net unallocated discrepancy</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Scale className="h-5 w-5" />
          </div>
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

      {/* Filter & Action Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-[#041F56]">Clearing Channel:</span>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
            >
              <option value="ALL">All Treasury Channels</option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('MATCHING')}
              className={`px-3.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                activeTab === 'MATCHING' ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Two-Sided Matching
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-3.5 py-1.5 rounded-lg text-xs cursor-pointer ${
                activeTab === 'HISTORY' ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
              }`}
            >
              Cleared History ({clearedHistory.length})
            </button>
          </div>
        </div>

        <button
          onClick={handleConfirmMatch}
          disabled={!selectedBookId || !selectedBankId || matching}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
        >
          {matching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Confirm Match &amp; Clear
        </button>
      </div>

      {/* Workbench Split or Cleared History */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : activeTab === 'MATCHING' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: ERP Ledger Payments (Book) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-[#041F56]">ERP Ledger Payments (Book)</h2>
                <p className="text-[11px] text-slate-400">Unreconciled internal POS &amp; treasury postings</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4]">
                {filteredBooks.length} Pending
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {filteredBooks.length === 0 ? (
                <p className="p-10 text-center text-xs text-slate-400">All book payments are reconciled.</p>
              ) : (
                filteredBooks.map((b) => {
                  const selected = selectedBookId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBookId(selected ? null : b.id)}
                      className={`w-full text-left px-5 py-4 transition-colors flex justify-between items-start gap-3 cursor-pointer ${
                        selected ? 'bg-blue-50/80 ring-1 ring-inset ring-[#0554F4]' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-xs text-[#041F56]">{b.documentNumber}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold uppercase">
                            {b.paymentMethod.replace('_', ' ')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              b.flowDirection === 'INBOUND_AR'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {b.flowDirection === 'INBOUND_AR' ? 'AR INFLOW' : 'AP OUTFLOW'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 truncate">
                          {b.counterpartyName} &bull; {b.allocatedBill}
                        </p>
                        <p className="text-[10px] font-mono text-[#0554F4] mt-0.5">Ref: {b.transactionRef}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-extrabold text-xs text-[#041F56]">
                          KES {Number(b.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(b.createdAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Bank Statement Feed (Actual) */}
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-extrabold text-[#041F56]">Bank Statement Feed (Actual)</h2>
                <p className="text-[11px] text-slate-400">Click a line to pair with book ledger, or import a statement feed</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                {filteredBanks.length} Pending
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto flex-1">
              {filteredBanks.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <p className="text-xs text-slate-400">No bank lines pending. Import a statement feed to match.</p>
                  <button
                    onClick={openImportModal}
                    className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-[#0554F4] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" /> Import Statement CSV / Manual Lines
                  </button>
                </div>
              ) : (
                filteredBanks.map((bl) => {
                  const selected = selectedBankId === bl.id;
                  return (
                    <button
                      key={bl.id}
                      type="button"
                      onClick={() => setSelectedBankId(selected ? null : bl.id)}
                      className={`w-full text-left px-5 py-4 transition-colors flex justify-between items-start gap-3 cursor-pointer ${
                        selected ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-500' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-mono font-bold text-xs text-[#041F56]">{bl.referenceNo}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate">{bl.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{bl.clearingChannel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-mono font-extrabold text-xs ${bl.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {bl.amount >= 0 ? '+' : ''}KES {Number(bl.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(bl.txDate).toLocaleDateString('en-US')}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Cleared History Table */
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
          <table className="w-full min-w-[780px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">BANK REF</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">MATCHED BOOK DOC</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CHANNEL</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">AMOUNT (KES)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clearedHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No cleared reconciliation pairs yet.
                  </td>
                </tr>
              ) : (
                clearedHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="px-6 py-3.5 font-mono font-bold text-[#041F56]">{h.referenceNo}</td>
                    <td className="px-4 py-3.5 font-mono text-[#0554F4]">{h.documentNumber || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{h.clearingChannel}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-600">
                      KES {Number(h.amount).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> MATCHED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* IMPORT BANK STATEMENT FEED MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Import Bank Statement Feed</h2>
                <p className="text-xs text-[#176E84]">Upload CSV bank/M-Pesa feed, paste statement rows, or enter actual statement lines manually</p>
              </div>
              <button onClick={() => setIsImportOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCommitStatement} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Target Clearing Channel *</label>
                  <select
                    value={importChannel}
                    onChange={(e) => setImportChannel(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Statement Reference # *</label>
                  <input
                    required
                    type="text"
                    value={statementRef}
                    onChange={(e) => setStatementRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Opening Balance (KES)</label>
                  <input
                    type="number"
                    step="any"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Closing Balance (KES)</label>
                  <input
                    type="number"
                    step="any"
                    value={closingBalance}
                    onChange={(e) => setClosingBalance(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Statement Date</label>
                  <input
                    type="date"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              {/* Quick CSV Parser */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2.5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <p className="text-[10px] font-extrabold text-[#041F56] uppercase tracking-wider">
                    QUICK CSV FEED PARSER (DATE, REF, DESCRIPTION, AMOUNT)
                  </p>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <label className="text-emerald-700 hover:underline cursor-pointer inline-flex items-center gap-1">
                      <Upload className="h-3.5 w-3.5" /> Upload .CSV
                      <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => parseCsvLines(csvText)}
                      className="text-[#0554F4] hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Parse Lines
                    </button>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`2026-11-23, SKP-RCP-400801, POS Counter M-Pesa Collection, 470\n2026-11-23, B2B-INV-8812, Wholesale Supplier Payout, -28500`}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono bg-white"
                />
              </div>

              {/* Parsed / Manual Lines */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-[#041F56]">Statement Transaction Lines ({draftLines.length})</p>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftLines((prev) => [
                        ...prev,
                        { txDate: statementDate, referenceNo: '', description: '', amount: 0 },
                      ])
                    }
                    className="text-xs font-bold text-[#0554F4] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Line Manually
                  </button>
                </div>

                {draftLines.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-400">
                    No statement lines added yet. Upload a CSV, paste rows above, or click &ldquo;Add Line Manually&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {draftLines.map((line, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          type="date"
                          value={line.txDate}
                          onChange={(e) =>
                            setDraftLines((p) => p.map((it, i) => (i === idx ? { ...it, txDate: e.target.value } : it)))
                          }
                          className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                        />
                        <input
                          type="text"
                          value={line.referenceNo}
                          onChange={(e) =>
                            setDraftLines((p) => p.map((it, i) => (i === idx ? { ...it, referenceNo: e.target.value } : it)))
                          }
                          placeholder="Ref #"
                          className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-mono"
                        />
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) =>
                            setDraftLines((p) => p.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))
                          }
                          placeholder="Description"
                          className="col-span-3 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                        />
                        <input
                          type="number"
                          step="any"
                          value={line.amount}
                          onChange={(e) =>
                            setDraftLines((p) => p.map((it, i) => (i === idx ? { ...it, amount: Number(e.target.value) || 0 } : it)))
                          }
                          className="col-span-2 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setDraftLines((p) => p.filter((_, i) => i !== idx))}
                          className="col-span-1 text-slate-400 hover:text-rose-600 flex justify-center cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsImportOpen(false)} className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || draftLines.length === 0}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Commit Statement Feed
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}