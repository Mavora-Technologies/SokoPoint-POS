'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  Award,
  Plus,
  RefreshCw,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogIn,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface LoyaltyMember {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  customerType: string;
  points: number;
}

interface LoyaltyTx {
  id: string;
  customerId: string;
  customerName: string;
  transactionType: string;
  points: number;
  notes?: string | null;
  createdAt: string;
}

export default function LoyaltyRewardsPage(): JSX.Element {
  const [kpis, setKpis] = useState({
    totalMembers: 0,
    totalBalance: 0,
    totalEarned: 0,
    totalRedeemed: 0,
  });
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTx[]>([]);

  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'LEDGER'>('MEMBERS');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Earn / Redeem Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerId: '',
    type: 'EARN' as 'EARN' | 'REDEEM' | 'ADJUSTMENT',
    points: '',
    notes: '',
  });

  const loadLoyalty = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const res = await api.get('/loyalty');
      const payload = res.data?.data;
      if (payload) {
        if (payload.kpis) setKpis(payload.kpis);
        setMembers(Array.isArray(payload.members) ? payload.members : []);
        setTransactions(Array.isArray(payload.transactions) ? payload.transactions : []);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load loyalty & rewards.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLoyalty();
  }, [loadLoyalty]);

  const openAdjustModal = (customerId = '', defaultType: 'EARN' | 'REDEEM' = 'EARN') => {
    setForm({
      customerId: customerId || members[0]?.id || '',
      type: defaultType,
      points: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pts = Number(form.points);
    if (!form.customerId || !pts || pts <= 0) {
      alert('Select a customer and enter a valid points value.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/loyalty/adjust', {
        customerId: form.customerId,
        type: form.type,
        points: pts,
        notes: form.notes.trim() || undefined,
      });
      setIsModalOpen(false);
      setFeedback(`Loyalty points ${form.type === 'REDEEM' ? 'redeemed' : 'credited'} successfully.`);
      await loadLoyalty();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update loyalty points.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q)
    );
  }, [members, search]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        t.customerName.toLowerCase().includes(q) ||
        t.transactionType.toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q)
    );
  }, [transactions, search]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            CUSTOMERS &amp; CREDIT &rsaquo; LOYALTY PROGRAM &amp; REWARDS
          </p>
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Loyalty &amp; Rewards Program
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Reward repeat retail and wholesale shoppers, issue points, and track redemptions in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openAdjustModal()}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Issue / Redeem Points
          </button>
          <button
            type="button"
            onClick={loadLoyalty}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </span>
          {isUnauthorized && (
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In Again
            </Link>
          )}
        </div>
      )}

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {feedback}
          </span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">ENROLLED MEMBERS</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">{kpis.totalMembers}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-[#0554F4] uppercase">ACTIVE POINTS BALANCE</span>
          <h2 className="text-2xl font-black text-[#0554F4] font-mono mt-1.5">
            {kpis.totalBalance.toLocaleString()} pts
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-emerald-600 uppercase">TOTAL POINTS EARNED</span>
          <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">
            +{kpis.totalEarned.toLocaleString()} pts
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-amber-600 uppercase">TOTAL POINTS REDEEMED</span>
          <h2 className="text-2xl font-black text-amber-600 font-mono mt-1.5">
            -{kpis.totalRedeemed.toLocaleString()} pts
          </h2>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('MEMBERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              activeTab === 'MEMBERS' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Member Balances ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LEDGER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              activeTab === 'LEDGER' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Points Ledger ({transactions.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or notes..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        {activeTab === 'MEMBERS' ? (
          <table className="w-full min-w-[780px] divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CUSTOMER</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CONTACT</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TIER / TYPE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">POINTS BALANCE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                    Loading loyalty members...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-400">
                    No customers enrolled yet. Add customers in the Customer Directory to start awarding points.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-bold text-[#041F56]">{m.name}</td>
                    <td className="px-6 py-4 text-gray-600">{m.phone || m.email || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-bold">
                        {m.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-[#0554F4]">
                      {m.points.toLocaleString()} pts
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openAdjustModal(m.id, 'EARN')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold"
                      >
                        + Award
                      </button>
                      <button
                        type="button"
                        onClick={() => openAdjustModal(m.id, 'REDEEM')}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold"
                      >
                        - Redeem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[780px] divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CUSTOMER</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TYPE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">POINTS</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">NOTES</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">DATE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-gray-400">
                    No loyalty point transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isPositive = t.points >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50/60">
                      <td className="px-6 py-4 font-bold text-[#041F56]">{t.customerName}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {t.transactionType}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 font-mono font-black ${
                          isPositive ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {isPositive ? `+${t.points}` : t.points} pts
                      </td>
                      <td className="px-6 py-4 text-gray-600">{t.notes || '—'}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-500">
                        {new Date(t.createdAt).toLocaleString('en-GB')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* ISSUE / REDEEM POINTS MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#041F56]">Issue / Redeem Loyalty Points</h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Customer *</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                >
                  <option value="">-- Select Customer --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.points} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'EARN' })}
                  className={`py-2.5 rounded-xl text-xs font-bold border ${
                    form.type === 'EARN'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  Award Points (+)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'REDEEM' })}
                  className={`py-2.5 rounded-xl text-xs font-bold border ${
                    form.type === 'REDEEM'
                      ? 'bg-amber-50 border-amber-500 text-amber-700'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  Redeem Points (-)
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Points *</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Bulk purchase bonus or voucher redemption"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}