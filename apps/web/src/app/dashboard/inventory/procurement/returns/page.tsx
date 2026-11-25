'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  X,
  Trash2,
  AlertCircle,
  LogIn,
  PackageX,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface ReturnLine {
  id: string;
  productId?: string | null;
  productName: string;
  sku: string;
  returnQty: number;
  unitCost: number;
  subtotal: number;
  rejectionReason: string;
}

interface SupplierReturn {
  id: string;
  manifestNumber: string;
  debitNoteNo?: string | null;
  supplierId?: string | null;
  supplierName: string;
  supplierKraPin: string;
  grnNumber?: string | null;
  status: 'PENDING_DISPATCH' | 'DISPATCHED' | 'CREDITED' | string;
  taxableNet: number;
  vatAmount: number;
  debitValuation: number;
  notes?: string | null;
  createdAt: string;
  items: ReturnLine[];
}

interface DraftReturnLine {
  productId: string;
  productName: string;
  sku: string;
  returnQty: number;
  unitCost: number;
  rejectionReason: string;
}

const REJECTION_REASONS = [
  'DEFECTIVE / SPOILED',
  'EXPIRED STOCK',
  'DAMAGED PACKAGING',
  'WRONG ITEM DELIVERED',
  'SHORT WEIGHT / QUALITY',
];

export default function SupplierReturnsPage() {
  const [returnsList, setReturnsList] = useState<SupplierReturn[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [grns, setGrns] = useState<{ id: string; grnNumber: string; supplierName: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; costPrice?: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING_DISPATCH' | 'DISPATCHED' | 'CREDITED'>('ALL');

  // Inspect Modal
  const [inspecting, setInspecting] = useState<SupplierReturn | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Raise Return Manifest Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [debitNoteNo, setDebitNoteNo] = useState('');
  const [grnId, setGrnId] = useState('');
  const [notes, setNotes] = useState('');
  const [draftLines, setDraftLines] = useState<DraftReturnLine[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const [retRes, supRes, grnRes, prodRes] = await Promise.allSettled([
      api.get('/inventory/returns'),
      api.get('/inventory/suppliers').catch(() => api.get('/suppliers')),
      api.get('/inventory/grn'),
      api.get('/products'),
    ]);

    if (retRes.status === 'fulfilled') {
      const data = retRes.value.data?.data ?? retRes.value.data;
      setReturnsList(Array.isArray(data) ? data : []);
    } else {
      const err: any = retRes.reason;
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load supplier returns.');
      }
      setReturnsList([]);
    }

    if (supRes.status === 'fulfilled') {
      const sData = supRes.value.data?.data ?? supRes.value.data;
      const sList = Array.isArray(sData) ? sData : [];
      setSuppliers(sList);
      if (sList[0]?.id) setSupplierId((prev) => prev || sList[0].id);
    }

    if (grnRes.status === 'fulfilled') {
      const gData = grnRes.value.data?.data ?? grnRes.value.data;
      setGrns(Array.isArray(gData) ? gData : []);
    }

    if (prodRes.status === 'fulfilled') {
      const pData = prodRes.value.data?.data ?? prodRes.value.data;
      setProducts(Array.isArray(pData) ? pData : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live KPIs
  const kpis = useMemo(() => {
    let totalValuation = 0;
    let stagedCount = 0;
    for (const r of returnsList) {
      totalValuation += Number(r.debitValuation || 0);
      if (r.status === 'PENDING_DISPATCH') stagedCount += 1;
    }
    return {
      totalValuation,
      stagedCount,
      totalRecords: returnsList.length,
    };
  }, [returnsList]);

  const openCreateModal = () => {
    setDebitNoteNo('');
    setGrnId('');
    setNotes('');
    const first = products[0];
    setDraftLines(
      first
        ? [
            {
              productId: first.id,
              productName: first.name,
              sku: first.sku || 'NO-SKU',
              returnQty: 1,
              unitCost: Number(first.costPrice || 0),
              rejectionReason: REJECTION_REASONS[0],
            },
          ]
        : []
    );
    setIsCreateOpen(true);
  };

  const handleRaiseManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || draftLines.length === 0) {
      alert('Select a supplier and add at least one returned SKU.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/inventory/returns', {
        supplierId,
        debitNoteNo: debitNoteNo.trim(),
        grnId: grnId || null,
        notes: notes.trim(),
        items: draftLines,
      });
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to raise return manifest.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdvanceStatus = async (ret: SupplierReturn, nextStatus: 'DISPATCHED' | 'CREDITED') => {
    try {
      setUpdatingStatus(true);
      await api.patch(`/inventory/returns/${ret.id}/status`, { status: nextStatus });
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update return status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filtered = useMemo(() => {
    return returnsList.filter((r) => {
      if (statusTab !== 'ALL' && r.status !== statusTab) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        r.manifestNumber.toLowerCase().includes(q) ||
        (r.debitNoteNo || '').toLowerCase().includes(q) ||
        r.supplierName.toLowerCase().includes(q)
      );
    });
  }, [returnsList, statusTab, search]);

  const renderStatusBadge = (status: string) => {
    if (status === 'CREDITED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> DEBIT NOTE CREDITED
        </span>
      );
    }
    if (status === 'DISPATCHED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
          <Truck className="h-3 w-3" /> DISPATCHED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> PENDING DISPATCH
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Purchasing &rsaquo; Supplier Returns &amp; Debit Notes
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Supplier Returns &amp; Debit Notes
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Process outbound rejections for expired stock, damaged packaging, and defective consignments with debit note ledger adjustments.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Raise Return Manifest
        </button>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DEBIT CREDIT VALUATION</p>
            <p className="text-xl font-black text-[#041F56] font-mono mt-1">
              KES {kpis.totalValuation.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Recovered vendor liabilities</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">STAGED FOR SUPPLIER</p>
            <p className="text-xl font-black text-amber-600 mt-1">
              {kpis.stagedCount} Manifest{kpis.stagedCount === 1 ? '' : 's'}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">Awaiting driver pickup</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL RETURN FILES</p>
            <p className="text-xl font-black text-[#041F56] mt-1">
              {kpis.totalRecords} Record{kpis.totalRecords === 1 ? '' : 's'}
            </p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">Historical audit trail</p>
          </div>
          <button
            onClick={loadData}
            className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0554F4] flex items-center justify-center shrink-0 cursor-pointer"
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

      {/* Search & Status Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return #, debit note #, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Returns' },
            { key: 'PENDING_DISPATCH', label: 'PENDING DISPATCH' },
            { key: 'DISPATCHED', label: 'DISPATCHED' },
            { key: 'CREDITED', label: 'CREDITED' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
                statusTab === tab.key
                  ? 'bg-white text-[#041F56] font-bold shadow-xs'
                  : 'text-slate-500 font-medium hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[960px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">RETURN MANIFEST #</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">DEBIT NOTE #</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">SUPPLIER</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TAX (VAT 16%)</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">DEBIT VALUATION</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">ORIGIN GRN</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">CREATED DATE</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-slate-400 font-bold">
                  No supplier return manifests recorded yet.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{r.manifestNumber}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">{r.debitNoteNo || '-'}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{r.supplierName}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">PIN: {r.supplierKraPin}</p>
                  </td>
                  <td className="px-5 py-4">{renderStatusBadge(r.status)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-600">
                    KES {Number(r.vatAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-rose-600">
                    KES {Number(r.debitValuation || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">{r.grnNumber || '-'}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setInspecting(r)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0554F4] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      Inspect &rarr;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INSPECT RETURN MANIFEST MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-extrabold text-[#041F56] font-mono">{inspecting.manifestNumber}</h2>
                  {renderStatusBadge(inspecting.status)}
                </div>
                <p className="text-xs text-[#176E84] mt-1">
                  Supplier: <strong className="text-[#041F56]">{inspecting.supplierName}</strong>
                  {inspecting.debitNoteNo ? ` | Debit Note: ${inspecting.debitNoteNo}` : ''}
                </p>
              </div>
              <button
                onClick={() => setInspecting(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                OUTBOUND RETURNED ITEMS ({inspecting.items.length})
              </p>

              <div className="rounded-2xl border border-slate-200/80 overflow-x-auto">
                <table className="w-full min-w-[540px] divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">PRODUCT / SKU</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">RETURN QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">UNIT COST</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">SUBTOTAL</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">REJECTION REASON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspecting.items.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#041F56]">{line.productName}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{line.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {line.returnQty} pcs
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          KES {Number(line.unitCost || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#041F56]">
                          KES {Number(line.subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold uppercase">
                            <PackageX className="h-3 w-3" /> {line.rejectionReason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Valuation Summary Box */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4 sm:p-5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Taxable Net:</span>
                <span className="font-mono">
                  KES {Number(inspecting.taxableNet || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200/80">
                <span>Recoverable VAT (16%):</span>
                <span className="font-mono">
                  KES {Number(inspecting.vatAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-extrabold text-[#041F56]">Total Debit Note Value:</span>
                <span className="text-base font-mono font-black text-rose-600">
                  KES {Number(inspecting.debitValuation || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer"
              >
                Close
              </button>

              {inspecting.status === 'PENDING_DISPATCH' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleAdvanceStatus(inspecting, 'DISPATCHED')}
                  className="px-5 py-2.5 rounded-xl bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                  Mark Dispatched to Driver
                </button>
              )}

              {inspecting.status === 'DISPATCHED' && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleAdvanceStatus(inspecting, 'CREDITED')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Confirm Debit Note Credited
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAISE RETURN MANIFEST MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Raise Supplier Return Manifest</h2>
                <p className="text-xs text-[#176E84]">Stage rejected stock for driver pickup and debit note recovery</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRaiseManifest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Supplier *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Debit Note # (Optional)</label>
                  <input
                    type="text"
                    value={debitNoteNo}
                    onChange={(e) => setDebitNoteNo(e.target.value)}
                    placeholder="e.g. DN-SUP-1042"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Origin GRN (Optional)</label>
                  <select
                    value={grnId}
                    onChange={(e) => setGrnId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="">-- None --</option>
                    {grns.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.grnNumber} ({g.supplierName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#041F56]">Outbound Returned SKUs</label>
                  <button
                    type="button"
                    onClick={() => {
                      const first = products[0];
                      setDraftLines((prev) => [
                        ...prev,
                        {
                          productId: first?.id || '',
                          productName: first?.name || 'Returned Product',
                          sku: first?.sku || 'NO-SKU',
                          returnQty: 1,
                          unitCost: Number(first?.costPrice || 0),
                          rejectionReason: REJECTION_REASONS[0],
                        },
                      ]);
                    }}
                    className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                {draftLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      required
                      value={line.productId}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        setDraftLines((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? {
                                  ...it,
                                  productId: e.target.value,
                                  productName: prod?.name || it.productName,
                                  sku: prod?.sku || 'NO-SKU',
                                  unitCost: prod ? Number(prod.costPrice || 0) : it.unitCost,
                                }
                              : it
                          )
                        );
                      }}
                      className="col-span-4 px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="">-- Select SKU --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      min="1"
                      step="any"
                      value={line.returnQty}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, returnQty: Math.max(0.01, Number(e.target.value) || 1) } : it
                          )
                        )
                      }
                      className="col-span-2 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      title="Return Qty"
                    />
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      value={line.unitCost}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, unitCost: Math.max(0, Number(e.target.value) || 0) } : it
                          )
                        )
                      }
                      className="col-span-2 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                      title="Unit Cost"
                    />
                    <select
                      value={line.rejectionReason}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, rejectionReason: e.target.value } : it))
                        )
                      }
                      className="col-span-3 px-2 py-2 border border-slate-200 rounded-xl text-[11px] bg-white"
                    >
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setDraftLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="col-span-1 p-2 text-slate-400 hover:text-rose-600 cursor-pointer flex justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Damaged cartons staged at Bay 2 for supplier driver pickup"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Raise Return Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}