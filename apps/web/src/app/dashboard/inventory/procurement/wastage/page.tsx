'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Trash2,
  Loader2,
  RefreshCw,
  DollarSign,
  FileText,
  Snowflake,
  Store,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface WastageRecord {
  id: string;
  reference: string;
  date: string;
  productName: string;
  sku: string;
  barcode?: string;
  quantity: number;
  reason: string;
  costCenter: string;
  storageLocation: string;
  disposalMethod: string;
  unitCost: number;
  valueLost: number;
  reportedBy: string;
  remarks?: string | null;
  status: string;
}

const REASON_LABELS: Record<string, string> = {
  SHELF_EXPIRED: 'Shelf Expired',
  DAMAGED: 'Damaged / Broken',
  COLD_CHAIN_SPOILAGE: 'Chiller / Spoilage',
  SPILLAGE: 'Spillage / Leak',
  THEFT_SHRINKAGE: 'Theft / Shrinkage',
  SUPPLIER_RECALL: 'Supplier Recall',
  OTHER: 'Other',
};

export default function WastageAndSpoilagePage() {
  const [kpis, setKpis] = useState({
    totalFinancialLoss: 0,
    loggedIncidents: 0,
    topLossVector: { label: 'None', amount: 0 },
    topCostCenter: { label: 'Retail Floor', amount: 0 },
  });
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('ALL');
  const [reasonFilter, setReasonFilter] = useState('ALL');

  const loadWastage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);
      const res = await api.get('/inventory/wastage');
      const payload = res.data?.data;
      if (payload && Array.isArray(payload.records)) {
        if (payload.kpis) setKpis(payload.kpis);
        setRecords(payload.records);
      } else if (Array.isArray(payload)) {
        setRecords(payload);
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load wastage ledger.');
      }
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWastage();
  }, [loadWastage]);

  const costCenters = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.costCenter || 'Retail Floor'))).sort();
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (costCenterFilter !== 'ALL' && (r.costCenter || 'Retail Floor') !== costCenterFilter) return false;
      if (reasonFilter !== 'ALL' && r.reason !== reasonFilter) return false;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      return (
        (r.reference || '').toLowerCase().includes(q) ||
        (r.productName || '').toLowerCase().includes(q) ||
        (r.sku || '').toLowerCase().includes(q) ||
        (r.reportedBy || '').toLowerCase().includes(q)
      );
    });
  }, [records, costCenterFilter, reasonFilter, searchTerm]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            Inventory Ledger &rsaquo; Loss Prevention &amp; Scrap
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
            Wastage, Spoilage &amp; Loss Control
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Audit shelf expiries, damaged goods, cold-chain spoilage, and shrinkage with live inventory ledger balancing.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadWastage}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/dashboard/inventory/procurement/wastage/new"
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Log Waste Incident
          </Link>
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

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">TOTAL FINANCIAL LOSS</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.totalFinancialLoss.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Audited write-offs</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600"><DollarSign className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">LOGGED INCIDENTS</p>
            <p className="text-2xl font-black text-[#041F56] font-mono mt-1">{kpis.loggedIncidents} Entries</p>
            <p className="text-[11px] text-[#0554F4] font-semibold mt-0.5">Across all store sections</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-[#0554F4]"><FileText className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">TOP LOSS VECTOR</p>
            <p className="text-2xl font-black text-amber-600 font-mono mt-1">
              KES {kpis.topLossVector.amount.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
              {REASON_LABELS[kpis.topLossVector.label] || kpis.topLossVector.label}
            </p>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><Snowflake className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">TOP COST CENTER</p>
            <p className="text-2xl font-black text-[#041F56] font-mono mt-1">
              KES {kpis.topCostCenter.amount.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{kpis.topCostCenter.label}</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-2xl text-[#041F56]"><Store className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by product, SKU, document #, or staff..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={costCenterFilter}
            onChange={(e) => setCostCenterFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-700"
          >
            <option value="ALL">All Cost Centers</option>
            {costCenters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {[
            { key: 'ALL', label: 'All Incidents' },
            { key: 'SHELF_EXPIRED', label: 'Expired' },
            { key: 'DAMAGED', label: 'Damaged' },
            { key: 'COLD_CHAIN_SPOILAGE', label: 'Spoilage' },
            { key: 'THEFT_SHRINKAGE', label: 'Shrinkage' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setReasonFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                reasonFilter === tab.key ? 'bg-[#041F56] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[980px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-5 py-4 text-[10px] font-black text-[#176E84] uppercase">DOC # &amp; DATE</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">DISCARDED PRODUCT &amp; SKU</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">COST CENTER</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">LOSS CLASSIFICATION</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">WRITTEN-OFF QTY</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">UNIT COST</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">TOTAL LOSS</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">STORAGE / DISPOSAL</th>
              <th className="px-5 py-4 text-[10px] font-black text-[#176E84] uppercase">AUDITOR / NOTES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-rose-600 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-bold">No wastage or shrinkage records found.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-4">
                    <p className="font-mono font-bold text-[#041F56]">{r.reference}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(r.date).toLocaleString('en-GB')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{r.productName}</p>
                    <p className="text-[10px] font-mono text-slate-400">{r.sku} {r.barcode ? `• ${r.barcode}` : ''}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {r.costCenter || 'Retail Floor'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                      {REASON_LABELS[r.reason] || r.reason}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-black text-rose-600">-{r.quantity} pcs</td>
                  <td className="px-4 py-4 text-right font-mono text-slate-600">
                    KES {Number(r.unitCost || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 text-right font-mono font-black text-rose-600">
                    KES {Number(r.valueLost || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-700">{r.storageLocation || 'Main Store'}</p>
                    <p className="text-[10px] uppercase text-slate-400">{(r.disposalMethod || 'DISPOSED').replace('_', ' ')}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[#0554F4]">{r.reportedBy}</p>
                    <p className="text-[11px] text-slate-500 max-w-[200px] truncate">{r.remarks || '—'}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}