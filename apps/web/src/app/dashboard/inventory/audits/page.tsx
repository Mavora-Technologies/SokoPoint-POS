'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../lib/api';

interface AuditSession {
  id: string;
  reference: string;
  auditType: 'FULL' | 'SPOT_CHECK';
  blindMode: boolean;
  branch: string;
  auditor: string;
  status: 'IN_PROGRESS' | 'RECONCILED';
  totalItemsCounted: number;
  varianceValue: number;
  createdAt: string;
  reconciledAt?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string;
}

export default function PhysicalAuditsPage() {
  const router = useRouter();
  const [audits, setAudits] = useState<AuditSession[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  // Initiate Stock Take Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [auditType, setAuditType] = useState<'FULL' | 'SPOT_CHECK'>('FULL');
  const [blindMode, setBlindMode] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);
      const [auditsRes, prodRes] = await Promise.all([
        api.get('/inventory/audits'),
        api.get('/products').catch(() => ({ data: { data: [] } })),
      ]);
      setAudits(Array.isArray(auditsRes.data?.data) ? auditsRes.data.data : []);
      setProducts(Array.isArray(prodRes.data?.data) ? prodRes.data.data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load stocktake sessions.');
      }
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (auditType === 'SPOT_CHECK' && selectedProductIds.length === 0) {
      alert('Select at least one product for a Spot Check.');
      return;
    }

    try {
      setCreating(true);
      const res = await api.post('/inventory/audits', {
        auditType,
        blindMode,
        notes: notes.trim(),
        productIds: auditType === 'SPOT_CHECK' ? selectedProductIds : [],
      });
      const createdId = res.data?.data?.id;
      setIsModalOpen(false);
      setNotes('');
      setSelectedProductIds([]);
      if (createdId) {
        router.push(`/dashboard/inventory/audits/sheet?id=${createdId}`);
      } else {
        await fetchAudits();
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create audit session.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            Inventory Ledger &rsaquo; Stock Audit &amp; Count Cycles
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
            Physical Stocktake &amp; Reconciliation
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Snapshot live store balances, run blind physical counts, detect cost variances, and balance stock ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAudits}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Start New Stock Take
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex justify-between items-center">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          {isUnauthorized && (
            <Link
              href="/login"
              className="px-3 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>
      )}

      {/* Sessions Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[920px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">AUDIT SESSION #</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">AUDIT SCOPE &amp; MODE</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">STATUS</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">CREATED DATE</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">AUDITOR</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">
                NET FINANCIAL VARIANCE
              </th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">RECONCILED AT</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : audits.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                  No stocktake sessions yet. Click <strong>Start New Stock Take</strong> to snapshot live inventory.
                </td>
              </tr>
            ) : (
              audits.map((a) => {
                const isReconciled = a.status === 'RECONCILED';
                const val = Number(a.varianceValue || 0);
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{a.reference}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">
                        {a.auditType === 'SPOT_CHECK'
                          ? `SPOT_CHECK (${a.totalItemsCounted} SKU${a.totalItemsCounted !== 1 ? 's' : ''})`
                          : `FULL (${a.totalItemsCounted} SKUs)`}
                      </p>
                      {a.blindMode && <p className="text-[10px] font-bold text-purple-600 mt-0.5">Blind Counting</p>}
                    </td>
                    <td className="px-6 py-4">
                      {isReconciled ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" /> RECONCILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="h-3 w-3" /> IN_PROGRESS
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {new Date(a.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-[#176E84]">{a.auditor}</td>
                    <td className="px-6 py-4 text-right font-mono font-black">
                      {!isReconciled ? (
                        <span className="text-slate-400 font-semibold">Pending</span>
                      ) : (
                        <span
                          className={
                            val < 0 ? 'text-rose-600' : val > 0 ? 'text-emerald-600' : 'text-slate-700'
                          }
                        >
                          KES {val.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">
                      {a.reconciledAt ? new Date(a.reconciledAt).toLocaleDateString('en-GB') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/inventory/audits/sheet?id=${a.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-[#0554F4]"
                      >
                        {isReconciled ? 'View Sheet' : 'Audit Sheet'} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* INITIATE STOCK TAKE AUDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-[#041F56]">Initiate Stock Take Audit</h2>
                <p className="text-xs text-[#176E84] mt-0.5">
                  Snapshots live system balances for physical verification
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1.5">Audit Type *</label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
                >
                  <option value="FULL">Full Inventory Audit (All active catalog SKUs)</option>
                  <option value="SPOT_CHECK">Spot Check (Select specific SKUs)</option>
                </select>
              </div>

              {auditType === 'SPOT_CHECK' && (
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    Select Products ({selectedProductIds.length})
                  </p>
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                      />
                      <span>
                        {p.name} {p.sku ? `(${p.sku})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <label className="flex items-center justify-between p-4 rounded-2xl bg-purple-50/70 border border-purple-200 cursor-pointer">
                <div>
                  <p className="text-sm font-black text-purple-900">Blind Counting Mode</p>
                  <p className="text-xs text-purple-700">
                    Hides theoretical system quantities from floor staff
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={blindMode}
                  onChange={(e) => setBlindMode(e.target.checked)}
                  className="h-5 w-5 accent-[#0554F4]"
                />
              </label>

              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1.5">Session Audit Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. End of Month retail stocktake before supplier orders"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Audit Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}