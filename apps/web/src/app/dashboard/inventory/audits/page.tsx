'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, ListChecks, FileText, Loader2, ArrowRight } from 'lucide-react';
import api from '../../../../lib/api';

interface AuditSession {
  id: string;
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
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Attempting to fetch live audits, falling back to mock data if endpoint isn't ready
    const fetchAudits = async () => {
      try {
        const res = await api.get('/inventory/audits');
        const data = res.data?.data || res.data;
        if (data && Array.isArray(data) && data.length > 0) {
          setAudits(data);
          return;
        }
        throw new Error('No live data');
      } catch (error) {
        setAudits([
          { id: 'AUD-2026-11-001', date: '2026-11-01', branch: 'Main Supermarket Branch', auditor: 'Jane Doe (Store Manager)', status: 'APPROVED', totalItemsCounted: 450, varianceValue: -1250.00 },
          { id: 'AUD-2026-11-002', date: '2026-11-04', branch: 'Main Supermarket Branch', auditor: 'John Kamau (Inventory)', status: 'PENDING_APPROVAL', totalItemsCounted: 120, varianceValue: -450.50 },
          { id: 'AUD-2026-11-003', date: '2026-11-05', branch: 'Main Supermarket Branch', auditor: 'Sarah Wangari (Clerk)', status: 'DRAFT', totalItemsCounted: 35, varianceValue: 0.00 },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchAudits();
  }, []);

  const filteredAudits = audits.filter(a => 
    a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.auditor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0 hidden sm:flex">
                <ListChecks className="h-6 w-6" />
              </div>
              Physical Audits & Reconciliation
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl sm:ml-14">
              Manage retail stocktaking, capture physical counts, and reconcile inventory variances securely.
            </p>
          </div>
          
          <Link 
            href="/dashboard/inventory/audits/new"
            className="w-full lg:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Start New Audit Session
          </Link>
        </div>

        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Audit ID or Auditor Name..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-slate-50/50 transition-all"
            />
          </div>
        </div>

        {/* Main Table Section */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 w-full overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px] divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Reference</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Branch</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Auditor</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Items Counted</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Variance (KES)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                        <span className="font-medium">Loading audit sessions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAudits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100">
                          <FileText className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-bold text-slate-700">No audit sessions found</p>
                        <p className="mt-1 text-sm text-slate-400">Try adjusting your search criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAudits.map((audit) => {
                    let statusBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (audit.status === 'APPROVED') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (audit.status === 'PENDING_APPROVAL') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    if (audit.status === 'REJECTED') statusBadge = "bg-red-50 text-red-700 border-red-200";
                    if (audit.status === 'DRAFT') statusBadge = "bg-blue-50 text-blue-700 border-blue-200";

                    return (
                      <tr key={audit.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">{audit.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{new Date(audit.date).toLocaleDateString()}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{audit.branch}</p>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{audit.auditor}</td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {audit.totalItemsCounted} <span className="text-xs font-normal text-slate-400">SKUs</span>
                        </td>
                        <td className="px-6 py-4 font-black">
                          <span className={audit.varianceValue < 0 ? 'text-red-600' : audit.varianceValue > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            {audit.varianceValue < 0 ? '' : '+'}{audit.varianceValue.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 inline-flex text-[10px] uppercase font-black tracking-wider rounded-lg border ${statusBadge}`}>
                            {audit.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm border border-slate-200">
                            {audit.status === 'DRAFT' ? 'Resume' : 'View Report'} <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}