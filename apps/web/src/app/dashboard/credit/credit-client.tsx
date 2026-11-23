'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  X,
  Phone,
  AlertCircle,
  RefreshCw,
  Banknote,
  Trash2,
  LogIn,
} from 'lucide-react';
import api from '../../../lib/api';

interface CreditAccount {
  id: string;
  customerId?: string | null;
  customerName: string;
  phone: string;
  balance: number;
  creditLimit?: number;
  status: string;
  lastTxDate?: string;
  createdAt?: string;
}

interface CustomerOption {
  id: string;
  name: string;
  phone?: string | null;
  creditLimit?: number;
}

export default function CreditClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ALL');

  // Open Tab Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newAccount, setNewAccount] = useState({
    customerName: '',
    phone: '',
    balance: '',
    creditLimit: '0',
  });

  // Payment / Charge Adjustment Modal
  const [adjustTarget, setAdjustTarget] = useState<CreditAccount | null>(null);
  const [adjustMode, setAdjustMode] = useState<'PAYMENT' | 'CHARGE'>('PAYMENT');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [creditRes, customersRes] = await Promise.all([
        api.get('/credit'),
        api.get('/customers').catch(() => ({ data: { data: [] } })),
      ]);

      const creditData = creditRes.data?.data || creditRes.data || [];
      const customerData = customersRes.data?.data || customersRes.data || [];

      setAccounts(Array.isArray(creditData) ? creditData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load credit accounts.');
      }
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchData();
  }, [isMounted, fetchData]);

  const handleSelectExistingCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const found = customers.find((c) => c.id === customerId);
    if (found) {
      setNewAccount((prev) => ({
        ...prev,
        customerName: found.name || '',
        phone: found.phone || '',
        creditLimit: String(found.creditLimit ?? prev.creditLimit ?? 0),
      }));
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        customerId: selectedCustomerId || null,
        customerName: newAccount.customerName.trim(),
        phone: newAccount.phone.trim(),
        balance: Number(newAccount.balance) || 0,
        creditLimit: Number(newAccount.creditLimit) || 0,
      };

      const res = await api.post('/credit', payload);
      const created = res.data?.data || res.data;

      if (created) {
        setAccounts((prev) => [created, ...prev]);
      } else {
        await fetchData();
      }

      setIsModalOpen(false);
      setSelectedCustomerId('');
      setNewAccount({ customerName: '', phone: '', balance: '', creditLimit: '0' });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add credit account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const rawAmount = Number(adjustAmount);
    if (!rawAmount || rawAmount <= 0) {
      alert('Enter a valid amount greater than 0.');
      return;
    }

    const signedAmount = adjustMode === 'PAYMENT' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    try {
      setAdjusting(true);
      const res = await api.patch(`/credit/${adjustTarget.id}/payment`, { amount: signedAmount });
      const updated = res.data?.data || res.data;
      if (updated) {
        setAccounts((prev) => prev.map((a) => (a.id === adjustTarget.id ? updated : a)));
      } else {
        await fetchData();
      }
      setAdjustTarget(null);
      setAdjustAmount('');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update balance.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleDeleteAccount = async (acc: CreditAccount) => {
    if (!window.confirm(`Delete credit account for ${acc.customerName}?`)) return;
    try {
      setDeletingId(acc.id);
      await api.delete(`/credit/${acc.id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete credit account.');
    } finally {
      setDeletingId(null);
    }
  };

  const kpis = useMemo(() => {
    const totalOutstanding = accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0);
    const activeCount = accounts.filter((a) => Number(a.balance || 0) > 0).length;
    const settledCount = accounts.filter((a) => Number(a.balance || 0) <= 0).length;
    const totalLimit = accounts.reduce((sum, a) => sum + Number(a.creditLimit || 0), 0);
    return { totalOutstanding, activeCount, settledCount, totalLimit };
  }, [accounts]);

  const filtered = useMemo(() => {
    return accounts.filter((acc) => {
      const bal = Number(acc.balance || 0);
      if (statusFilter === 'ACTIVE' && bal <= 0) return false;
      if (statusFilter === 'SETTLED' && bal > 0) return false;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (acc?.customerName || '').toLowerCase().includes(q) ||
        (acc?.phone || '').toLowerCase().includes(q)
      );
    });
  }, [accounts, statusFilter, searchQuery]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0">
                <CreditCard className="h-6 w-6" />
              </div>
              <span className="truncate">Customer Credit &amp; Tabs</span>
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 font-medium">
              Track customer store credit, record partial or full settlements, and monitor active tabs.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchData}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh credit accounts"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 transition-all"
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" /> Open Tab / Credit
            </button>
          </div>
        </div>

        {/* Error / Auth Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </span>
            {isUnauthorized && (
              <Link
                href="/login"
                className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg inline-flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In Again
              </Link>
            )}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Outstanding Credit</span>
            <p className="text-2xl font-black text-amber-600 font-mono mt-1">
              KES {kpis.totalOutstanding.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Active Tabs</span>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">{kpis.activeCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Settled Accounts</span>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">{kpis.settledCount}</p>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Total Credit Limits</span>
            <p className="text-2xl font-black text-blue-600 font-mono mt-1">
              KES {kpis.totalLimit.toLocaleString('en-KE')}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5">
              {(['ALL', 'ACTIVE', 'SETTLED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                    statusFilter === st ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[36vh]">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[36vh] text-slate-500 p-6 text-center">
              <CreditCard className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">No credit accounts found</p>
              <p className="mt-1 text-xs text-slate-400">Open a new customer tab to start tracking store credit.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-xs font-bold text-slate-500 uppercase">Customer</th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Phone</th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Last Updated</th>
                    <th className="px-3 py-3.5 text-right text-xs font-bold text-slate-500 uppercase">Balance</th>
                    <th className="px-3 py-3.5 text-right text-xs font-bold text-slate-500 uppercase pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {filtered.map((acc) => {
                    const balanceVal = Number(acc.balance || 0);
                    const displayDate = acc.lastTxDate || acc.createdAt;
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 pl-6 pr-3 font-bold text-slate-900">{acc.customerName}</td>
                        <td className="px-3 py-4 text-slate-600 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {acc.phone}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              balanceVal > 0
                                ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                                : 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                            }`}
                          >
                            {balanceVal > 0 ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            {balanceVal > 0 ? 'Active Tab' : 'Settled'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-xs text-slate-500 font-mono">
                          {displayDate ? new Date(displayDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-3 py-4 text-right font-mono font-black text-slate-900">
                          KES {balanceVal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-4 text-right pr-6 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setAdjustTarget(acc);
                                setAdjustMode('PAYMENT');
                                setAdjustAmount('');
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg inline-flex items-center gap-1"
                              title="Record payment or add charge"
                            >
                              <Banknote className="h-3.5 w-3.5" /> Settle / Charge
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(acc)}
                              disabled={deletingId === acc.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                              title="Delete account"
                            >
                              {deletingId === acc.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* OPEN TAB MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" /> Open Customer Tab
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddAccount} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Existing Customer (Optional)
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleSelectExistingCustomer(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">-- Enter Manually Below --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    required
                    type="text"
                    value={newAccount.customerName}
                    onChange={(e) => setNewAccount({ ...newAccount, customerName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    required
                    type="text"
                    value={newAccount.phone}
                    onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="+254 700..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Initial Balance (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAccount.balance}
                      onChange={(e) => setNewAccount({ ...newAccount, balance: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (KES)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newAccount.creditLimit}
                      onChange={(e) => setNewAccount({ ...newAccount, creditLimit: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Save Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RECORD PAYMENT / ADD CHARGE MODAL */}
        {adjustTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{adjustTarget.customerName}</h3>
                  <p className="text-xs text-slate-500">
                    Current Balance: <strong className="font-mono">KES {Number(adjustTarget.balance).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
                <button onClick={() => setAdjustTarget(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAdjustBalance} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustMode('PAYMENT')}
                    className={`py-2.5 rounded-xl text-xs font-bold border ${
                      adjustMode === 'PAYMENT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Record Payment (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustMode('CHARGE')}
                    className={`py-2.5 rounded-xl text-xs font-bold border ${
                      adjustMode === 'CHARGE'
                        ? 'bg-amber-50 border-amber-500 text-amber-700'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Add Credit Charge (+)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Amount (KES) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTarget(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjusting}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50 ${
                      adjustMode === 'PAYMENT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {adjusting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {adjustMode === 'PAYMENT' ? 'Confirm Payment' : 'Add Charge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}