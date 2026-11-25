'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Package,
  Sparkles,
  X,
  Trash2,
  AlertCircle,
  LogIn,
  Clock,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface InvoiceLine {
  id: string;
  itemName: string;
  sku: string;
  billedQty: number;
  unitPrice: number;
  vatRate: number;
  subtotal: number;
}

interface SupplierInvoice {
  id: string;
  internalRef: string;
  vendorInvoiceNo: string;
  supplierId?: string | null;
  supplierName: string;
  supplierKraPin: string;
  poNumber?: string | null;
  grnNumber?: string | null;
  taxableNet: number;
  vatAmount: number;
  invoiceTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: 'PAID' | 'UNPAID' | 'OVERDUE' | 'PARTIAL' | string;
  dueDate: string;
  notes?: string | null;
  items: InvoiceLine[];
}

interface UninvoicedGrn {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  deliveryNoteRef?: string | null;
  intakeDate: string;
  items: {
    productId: string;
    productName: string;
    sku: string;
    acceptedQty: number;
    unitPrice: number;
  }[];
}

interface DraftInvoiceLine {
  productId?: string | null;
  itemName: string;
  sku: string;
  billedQty: number;
  unitPrice: number;
  vatRate: number;
}

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [uninvoicedGrns, setUninvoicedGrns] = useState<UninvoicedGrn[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; costPrice?: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'UNPAID' | 'OVERDUE' | 'PAID'>('ALL');

  // Inspect Modal
  const [inspecting, setInspecting] = useState<SupplierInvoice | null>(null);
  const [settling, setSettling] = useState(false);

  // Create Bill Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<'GRN' | 'MANUAL'>('MANUAL');
  const [selectedGrnId, setSelectedGrnId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState('');
  const [draftLines, setDraftLines] = useState<DraftInvoiceLine[]>([]);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const [invRes, supRes, prodRes] = await Promise.allSettled([
      api.get('/inventory/invoices'),
      api.get('/inventory/suppliers').catch(() => api.get('/suppliers')),
      api.get('/products'),
    ]);

    if (invRes.status === 'fulfilled') {
      const payload = invRes.value.data?.data ?? {};
      setInvoices(Array.isArray(payload.invoices) ? payload.invoices : []);
      setUninvoicedGrns(Array.isArray(payload.uninvoicedGrns) ? payload.uninvoicedGrns : []);
    } else {
      const err: any = invRes.reason;
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load supplier invoices.');
      }
      setInvoices([]);
      setUninvoicedGrns([]);
    }

    if (supRes.status === 'fulfilled') {
      const sData = supRes.value.data?.data ?? supRes.value.data;
      const sList = Array.isArray(sData) ? sData : [];
      setSuppliers(sList);
      if (sList[0]?.id) setSupplierId((prev) => prev || sList[0].id);
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
    let outstanding = 0;
    let overdueCount = 0;
    let settledYtd = 0;
    const currentYear = new Date().getFullYear();

    for (const inv of invoices) {
      outstanding += Number(inv.balanceDue || 0);
      if (inv.status === 'OVERDUE') overdueCount += 1;
      if (new Date(inv.dueDate).getFullYear() === currentYear || inv.status === 'PAID') {
        settledYtd += Number(inv.amountPaid || 0);
      }
    }

    return {
      outstanding,
      overdueCount,
      settledYtd,
      uninvoicedCount: uninvoicedGrns.length,
    };
  }, [invoices, uninvoicedGrns]);

  const openCreateModal = () => {
    setVendorInvoiceNo('');
    setNotes('');
    setSelectedGrnId(null);
    setSelectedPoId(null);
    if (uninvoicedGrns.length > 0) {
      setEntryMode('GRN');
      applyGrnMatch(uninvoicedGrns[0]);
    } else {
      setEntryMode('MANUAL');
      const first = products[0];
      setDraftLines(
        first
          ? [
              {
                productId: first.id,
                itemName: first.name,
                sku: first.sku || 'NO-SKU',
                billedQty: 1,
                unitPrice: Number(first.costPrice || 0),
                vatRate: 16,
              },
            ]
          : []
      );
    }
    setIsCreateOpen(true);
  };

  const applyGrnMatch = (grn: UninvoicedGrn) => {
    setSelectedGrnId(grn.id);
    setSelectedPoId(grn.purchaseOrderId);
    if (grn.supplierId) setSupplierId(grn.supplierId);
    if (grn.deliveryNoteRef && grn.deliveryNoteRef !== 'NO-REF-ATTACHED') {
      setVendorInvoiceNo(grn.deliveryNoteRef);
    }
    setDraftLines(
      (grn.items || []).map((it) => ({
        productId: it.productId,
        itemName: it.productName,
        sku: it.sku,
        billedQty: Number(it.acceptedQty || 1),
        unitPrice: Number(it.unitPrice || 0),
        vatRate: 16,
      }))
    );
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !vendorInvoiceNo.trim() || draftLines.length === 0) {
      alert('Fill in Supplier, Vendor Invoice #, and at least one line item.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/inventory/invoices', {
        supplierId,
        vendorInvoiceNo: vendorInvoiceNo.trim(),
        dueDate,
        grnId: entryMode === 'GRN' ? selectedGrnId : null,
        purchaseOrderId: entryMode === 'GRN' ? selectedPoId : null,
        notes: notes.trim(),
        items: draftLines,
      });
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save supplier invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettleInvoice = async (inv: SupplierInvoice) => {
    try {
      setSettling(true);
      await api.patch(`/inventory/invoices/${inv.id}/pay`, { amount: inv.balanceDue });
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to record invoice settlement.');
    } finally {
      setSettling(false);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (statusTab === 'UNPAID' && inv.status !== 'UNPAID' && inv.status !== 'PARTIAL') return false;
      if (statusTab === 'OVERDUE' && inv.status !== 'OVERDUE') return false;
      if (statusTab === 'PAID' && inv.status !== 'PAID') return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        inv.vendorInvoiceNo.toLowerCase().includes(q) ||
        inv.internalRef.toLowerCase().includes(q) ||
        inv.supplierName.toLowerCase().includes(q)
      );
    });
  }, [invoices, statusTab, search]);

  const renderStatusBadge = (status: string) => {
    if (status === 'PAID') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> PAID / SETTLED
        </span>
      );
    }
    if (status === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="h-3 w-3" /> OVERDUE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="h-3 w-3" /> {status === 'PARTIAL' ? 'PARTIALLY PAID' : 'UNPAID'}
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Purchasing &rsaquo; Supplier Invoices (A/P)
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Accounts Payable &amp; Supplier Invoices
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Automated 3-way matching across POs, warehouse dock GRNs, and supplier bills with KRA VAT accounting.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Inward Bill / Auto-Match GRN
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL OUTSTANDING AP</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {kpis.outstanding.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-rose-500 mt-0.5">Pending vendor payouts</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OVERDUE BILLS</p>
            <p className="text-xl font-black text-amber-600 mt-1">
              {kpis.overdueCount} Invoice{kpis.overdueCount === 1 ? '' : 's'}
            </p>
            <p className="text-[11px] text-amber-600 mt-0.5">Past credit terms</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SETTLED PAYOUTS YTD</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.settledYtd.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Disbursed via B2B/Bank</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UNINVOICED GRNS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.uninvoicedCount} Received</p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">Ready for 1-click billing</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Package className="h-5 w-5" />
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

      {/* Search & Status Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor invoice #, internal ref, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl self-end lg:self-auto">
          {[
            { key: 'ALL', label: 'All Invoices' },
            { key: 'UNPAID', label: 'UNPAID' },
            { key: 'OVERDUE', label: 'OVERDUE' },
            { key: 'PAID', label: 'PAID' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
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

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[960px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">VENDOR INVOICE #</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">INTERNAL REF</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">SUPPLIER</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TAX (VAT 16%)</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">INVOICE TOTAL</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">BALANCE DUE</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">PAYMENT DUE DATE</th>
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
                  No supplier invoices posted yet.
                </td>
              </tr>
            ) : (
              filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-mono font-bold text-[#041F56]">{inv.vendorInvoiceNo}</p>
                    {(inv.grnNumber || inv.poNumber) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {inv.grnNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[9px] font-bold">
                            {inv.grnNumber}
                          </span>
                        )}
                        {inv.poNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 text-[#0554F4] font-mono text-[9px] font-bold">
                            {inv.poNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">{inv.internalRef}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{inv.supplierName}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">PIN: {inv.supplierKraPin}</p>
                  </td>
                  <td className="px-5 py-4">{renderStatusBadge(inv.status)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-600">
                    KES {Number(inv.vatAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-[#041F56]">
                    KES {Number(inv.invoiceTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`px-5 py-4 text-right font-mono font-bold ${
                      inv.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    KES {Number(inv.balanceDue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {new Date(inv.dueDate).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setInspecting(inv)}
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

      {/* INSPECT INVOICE MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-extrabold text-[#041F56]">
                    Invoice: <span className="font-mono">{inspecting.vendorInvoiceNo}</span>
                  </h2>
                  {renderStatusBadge(inspecting.status)}
                </div>
                <p className="text-xs text-[#176E84] mt-1">
                  Internal Ref: <strong className="font-mono text-[#041F56]">{inspecting.internalRef}</strong> | Supplier:{' '}
                  <strong className="text-[#041F56]">{inspecting.supplierName}</strong>
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
                BILLED ITEMS ({inspecting.items.length})
              </p>

              <div className="rounded-2xl border border-slate-200/80 overflow-x-auto">
                <table className="w-full min-w-[520px] divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">ITEM SKU</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">BILLED QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">UNIT PRICE</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">VAT RATE</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspecting.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          No line items recorded on this invoice.
                        </td>
                      </tr>
                    ) : (
                      inspecting.items.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#041F56]">{line.itemName}</p>
                            <p className="text-[10px] font-mono text-slate-400 uppercase">{line.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#041F56]">
                            {line.billedQty} pcs
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            KES {Number(line.unitPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500">{line.vatRate}%</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#041F56]">
                            KES {Number(line.subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary Box */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4 sm:p-5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Taxable Net:</span>
                <span className="font-mono">
                  KES {Number(inspecting.taxableNet || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span>KRA VAT (16%):</span>
                <span className="font-mono">
                  KES {Number(inspecting.vatAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold text-[#041F56]">
                <span>Total Invoiced:</span>
                <span className="font-mono">
                  KES {Number(inspecting.invoiceTotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-600 font-bold pb-2 border-b border-slate-200/80">
                <span>Amount Settled to Date:</span>
                <span className="font-mono">
                  KES {Number(inspecting.amountPaid || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-extrabold text-[#041F56]">Remaining Payable Balance:</span>
                <span className="text-base font-mono font-black text-rose-600">
                  KES {Number(inspecting.balanceDue || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
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

              {inspecting.balanceDue > 0 && (
                <button
                  type="button"
                  disabled={settling}
                  onClick={() => handleSettleInvoice(inspecting)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {settling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Settle Full Balance
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* INWARD SUPPLIER BILL & 3-WAY MATCH MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Inward Supplier Bill &amp; 3-Way Match</h2>
                <p className="text-xs text-[#176E84]">
                  Link physical warehouse dock verification directly to Accounts Payable liability
                </p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <button
                type="button"
                onClick={() => {
                  setEntryMode('GRN');
                  if (uninvoicedGrns[0]) applyGrnMatch(uninvoicedGrns[0]);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                  entryMode === 'GRN'
                    ? 'bg-blue-50 text-[#0554F4] border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" /> Auto-Match from Verified GRN ({uninvoicedGrns.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntryMode('MANUAL');
                  setSelectedGrnId(null);
                  setSelectedPoId(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  entryMode === 'MANUAL'
                    ? 'bg-blue-50 text-[#0554F4] border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Manual Entry
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4">
              {entryMode === 'GRN' && (
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1.5">
                    Select Uninvoiced GRN *
                  </label>
                  <select
                    value={selectedGrnId || ''}
                    onChange={(e) => {
                      const g = uninvoicedGrns.find((x) => x.id === e.target.value);
                      if (g) applyGrnMatch(g);
                    }}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {uninvoicedGrns.length === 0 ? (
                      <option value="">No uninvoiced GRNs available — switch to Manual Entry</option>
                    ) : (
                      uninvoicedGrns.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.grnNumber} (PO: {g.poNumber}) — {g.supplierName}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Select Supplier *</label>
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
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Vendor Invoice # *</label>
                  <input
                    required
                    type="text"
                    value={vendorInvoiceNo}
                    onChange={(e) => setVendorInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-99021"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Payment Due Date *</label>
                  <input
                    required
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#041F56]">Billed Line Items</label>
                  <button
                    type="button"
                    onClick={() => {
                      const first = products[0];
                      setDraftLines((prev) => [
                        ...prev,
                        {
                          productId: first?.id || null,
                          itemName: first?.name || 'Wholesale Stock Item',
                          sku: first?.sku || 'NO-SKU',
                          billedQty: 1,
                          unitPrice: Number(first?.costPrice || 0),
                          vatRate: 16,
                        },
                      ]);
                    }}
                    className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                  >
                    + Add Line Item
                  </button>
                </div>

                {draftLines.map((line, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <select
                      value={line.productId || ''}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        setDraftLines((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? {
                                  ...it,
                                  productId: prod?.id || null,
                                  itemName: prod?.name || it.itemName,
                                  sku: prod?.sku || 'NO-SKU',
                                  unitPrice: prod ? Number(prod.costPrice || 0) : it.unitPrice,
                                }
                              : it
                          )
                        );
                      }}
                      className="col-span-5 px-2.5 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="">-- Select SKU --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={line.billedQty}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, billedQty: Math.max(0.01, Number(e.target.value) || 1) } : it
                          )
                        )
                      }
                      className="col-span-2 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                      title="Quantity"
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={line.unitPrice}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, unitPrice: Math.max(0, Number(e.target.value) || 0) } : it
                          )
                        )
                      }
                      className="col-span-3 px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                      title="Unit Price (KES)"
                    />
                    <select
                      value={line.vatRate}
                      onChange={(e) =>
                        setDraftLines((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, vatRate: Number(e.target.value) } : it))
                        )
                      }
                      className="col-span-1 px-1 py-2 border border-slate-200 rounded-xl text-[11px] bg-white"
                      title="VAT %"
                    >
                      <option value={16}>16%</option>
                      <option value={0}>0%</option>
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
                <label className="block text-xs font-bold text-[#041F56] mb-1">Verification Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Matched against warehouse delivery note and signed by store manager"
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
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save &amp; Post Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}