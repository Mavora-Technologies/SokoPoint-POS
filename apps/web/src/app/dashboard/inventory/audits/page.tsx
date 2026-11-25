'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, ListChecks, FileText, Loader2, RefreshCw, AlertCircle, LogIn } from 'lucide-react';
import api from '../../../../lib/api';

interface AuditSession {
  id: string;
  reference: string;
  date: string;
  branch: string;
  auditor: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  totalItemsCounted: number;
  varianceValue: number;
}

export default function PhysicalAuditsPage() {
  const [audits, setAudits] = useState<AuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAudits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);
      const res = await api.get('/inventory/audits');
      setAudits(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load audit sessions.');
      }
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudits();
  }, [fetchAudits]);

  const handleStartNewAudit = async () => {
    try {
      setCreating(true);
      await api.post('/inventory/audits', { branch: 'Main Branch', status: 'DRAFT' });
      await fetchAudits();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to start audit session.');
    } finally {
      setCreating(false);
    }
  };

  const filteredAudits = audits.filter(
    (a) =>
      (a.reference || a.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.auditor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.branch || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600"><ListChecks className="h-6 w-6" /></div>
              Physical Audits &amp; Reconciliation
            </h1>
            <p className="text-slate-500 text-sm mt-1">Manage retail stocktaking, capture physical counts, and reconcile variances.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAudits}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleStartNewAudit}
              disabled={creating}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Start New Audit Session
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex justify-between items-center">
            <span className="inline-flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
            {isUnauthorized && (
              <Link href="/login" className="px-3 py-1.5 bg-blue-600 text-white rounded-lg inline-flex items-center gap-1">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </Link>
            )}
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Audit Reference, Branch, or Auditor..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[820px] divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reference</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date &amp; Branch</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Auditor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Items Counted</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Variance (KES)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></td></tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No audit sessions recorded yet</p>
                  </td>
                </tr>
              ) : (
                filteredAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{audit.reference || audit.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{new Date(audit.date).toLocaleDateString('en-GB')}</p>
                      <p className="text-xs text-slate-500">{audit.branch}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{audit.auditor}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{audit.totalItemsCounted} SKUs</td>
                    <td className="px-6 py-4 font-mono font-black">
                      <span className={audit.varianceValue < 0 ? 'text-red-600' : 'text-emerald-600'}>
                        KES {Number(audit.varianceValue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-[10px] uppercase font-black rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        {audit.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}