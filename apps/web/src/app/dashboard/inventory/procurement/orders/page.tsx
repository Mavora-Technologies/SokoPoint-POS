'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  Clock,
  Send,
  PackageCheck,
  CheckCircle2,
  X,
  Trash2,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface PoLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
  subtotal: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  paymentTerms: string;
  status: 'DRAFT_PO' | 'SENT_TO_VENDOR' | 'PARTIAL_INWARD' | 'FULLY_RECEIVED' | 'COMPLETED' | 'CANCELLED' | string;
  netSubtotal: number;
  vatAmount: number;
  totalAmount: number;
  expectedDelivery?: string | null;
  dateRaised: string;
  notes?: string | null;
  items: PoLineItem[];
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; paymentTerms?: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; costPrice?: number }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'COMPLETED'>('ALL');

  // Inspect Modal
  const [inspecting, setInspecting] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create PO Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; orderedQty: number; unitPrice: number }[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const [poResult, supResult, prodResult] = await Promise.allSettled([
      api.get('/inventory/orders'),
      api.get('/inventory/suppliers').catch(() => api.get('/suppliers')),
      api.get('/products'),
    ]);

    if (poResult.status === 'fulfilled') {
      const poData = poResult.value.data?.data ?? poResult.value.data;
      setOrders(Array.isArray(poData) ? poData : []);
    } else {
      const err: any = poResult.reason;
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load purchase orders.');
      }
      setOrders([]);
    }

    if (supResult.status === 'fulfilled') {
      const sData = supResult.value.data?.data ?? supResult.value.data;
      const sList = Array.isArray(sData) ? sData : [];
      setSuppliers(sList);
      if (sList[0]?.id) {
        setSupplierId((prev) => prev || sList[0].id);
      }
    }

    if (prodResult.status === 'fulfilled') {
      const pData = prodResult.value.data?.data ?? prodResult.value.data;
      setProducts(Array.isArray(pData) ? pData : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (poId: string, nextStatus: 'SENT_TO_VENDOR' | 'CANCELLED') => {
    try {
      setActionLoading(true);
      await api.patch(`/inventory/orders/${poId}/status`, { status: nextStatus });
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update purchase order status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Select a supplier first.');
      return;
    }
    if (draftItems.length === 0) {
      alert('Add at least one SKU line item.');
      return;
    }
    try {
      setCreating(true);
      await api.post('/inventory/orders', {
        supplierId,
        expectedDelivery: expectedDelivery || null,
        notes: notes.trim(),
        items: draftItems,
      });
      setIsCreateOpen(false);
      setExpectedDelivery('');
      setNotes('');
      setDraftItems([]);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to raise purchase order.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((po) => {
      const st = (po.status || '').toUpperCase();
      if (statusTab === 'DRAFT' && st !== 'DRAFT_PO' && st !== 'DRAFT') return false;
      if (statusTab === 'ISSUED' && st !== 'SENT_TO_VENDOR' && st !== 'ISSUED') return false;
      if (statusTab === 'PARTIAL' && st !== 'PARTIAL_INWARD' && st !== 'PARTIALLY_RECEIVED') return false;
      if (statusTab === 'COMPLETED' && st !== 'FULLY_RECEIVED' && st !== 'COMPLETED') return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (po.poNumber || '').toLowerCase().includes(q) ||
        (po.supplierName || '').toLowerCase().includes(q)
      );
    });
  }, [orders, statusTab, search]);

  const renderStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    if (st === 'DRAFT_PO' || st === 'DRAFT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          <Clock className="h-3 w-3" /> DRAFT PO
        </span>
      );
    }
    if (st === 'SENT_TO_VENDOR' || st === 'ISSUED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
          <Send className="h-3 w-3" /> SENT TO VENDOR
        </span>
      );
    }
    if (st === 'PARTIAL_INWARD' || st === 'PARTIALLY_RECEIVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <PackageCheck className="h-3 w-3" /> PARTIAL INWARD
        </span>
      );
    }
    if (st === 'FULLY_RECEIVED' || st === 'COMPLETED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> FULLY RECEIVED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        {st.replaceAll('_', ' ')}
      </span>
    );
  };

  const inspectingNet = useMemo(() => {
    if (!inspecting) return 0;
    if (inspecting.netSubtotal) return Number(inspecting.netSubtotal);
    return (inspecting.items || []).reduce((acc, l) => acc + Number(l.subtotal || 0), 0);
  }, [inspecting]);

  const inspectingVat = useMemo(() => {
    if (!inspecting) return 0;
    if (inspecting.vatAmount) return Number(inspecting.vatAmount);
    return inspectingNet * 0.16;
  }, [inspecting, inspectingNet]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Purchasing &rsaquo; Purchase Orders
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Vendor Purchase Orders &amp; Contracts
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Issue contractual POs to wholesale suppliers, trace VAT tax compliance, and track delivery intake schedules.
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
            onClick={() => {
              const firstProd = products[0];
              setDraftItems(
                firstProd
                  ? [{ productId: firstProd.id, orderedQty: 10, unitPrice: Number(firstProd.costPrice || 0) }]
                  : []
              );
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Raise Purchase Order
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

      {/* Search & Status Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PO # or supplier name..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'ALL', label: 'All Orders' },
            { key: 'DRAFT', label: 'DRAFT' },
            { key: 'ISSUED', label: 'ISSUED' },
            { key: 'PARTIAL', label: 'PARTIALLY RECEIVED' },
            { key: 'COMPLETED', label: 'COMPLETED' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all cursor-pointer ${
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

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[920px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">PO NUMBER</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">SUPPLIER</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TAX (VAT 16%)</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TOTAL (KES)</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">EXPECTED DELIVERY</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">DATE RAISED</th>
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
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              filtered.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{po.poNumber}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{po.supplierName}</p>
                    <p className="text-[10px] font-mono uppercase text-slate-400 mt-0.5">
                      {(po.paymentTerms || 'NET_30').replace('_', ' ')}
                    </p>
                  </td>
                  <td className="px-5 py-4">{renderStatusBadge(po.status)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-600">
                    KES {Number(po.vatAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-[#041F56]">
                    KES {Number(po.totalAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString('en-US') : '-'}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {new Date(po.dateRaised).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setInspecting(po)}
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

      {/* INSPECT PURCHASE ORDER MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-extrabold text-[#041F56] font-mono">{inspecting.poNumber}</h2>
                  {renderStatusBadge(inspecting.status)}
                </div>
                <p className="text-xs text-[#176E84] mt-1">
                  Supplier: <strong className="text-[#041F56]">{inspecting.supplierName}</strong> | Terms:{' '}
                  {inspecting.paymentTerms || 'NET_30'}
                </p>
              </div>
              <button
                onClick={() => setInspecting(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contract Line Items */}
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                CONTRACT LINE ITEMS ({inspecting.items.length})
              </p>

              <div className="rounded-2xl border border-slate-200/80 overflow-x-auto">
                <table className="w-full min-w-[540px] divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">ITEM SKU</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">ORDERED QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">RECEIVED QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">UNIT PRICE</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspecting.items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          No line items recorded for this purchase order.
                        </td>
                      </tr>
                    ) : (
                      inspecting.items.map((line) => (
                        <tr key={line.id}>
                          <td className="px-4 py-3">
                            <p className="font-bold text-[#041F56]">{line.productName}</p>
                            <p className="text-[10px] font-mono text-slate-400 uppercase">{line.sku}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-[#041F56]">
                            {line.orderedQty} pcs
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {line.receivedQty} pcs
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            KES {Number(line.unitPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </td>
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

            {/* Summary Box */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4 sm:p-5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Net Subtotal:</span>
                <span className="font-mono">
                  KES {inspectingNet.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500 pb-2 border-b border-slate-200/80">
                <span>VAT (16%):</span>
                <span className="font-mono">
                  KES {inspectingVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm font-extrabold text-[#041F56]">Total Commitment:</span>
                <span className="text-base font-mono font-black text-[#0554F4]">
                  KES {Number(inspecting.totalAmount || inspectingNet + inspectingVat).toLocaleString('en-KE', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer"
              >
                Close
              </button>

              {(inspecting.status === 'DRAFT_PO' || inspecting.status === 'DRAFT') && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange(inspecting.id, 'CANCELLED')}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel PO
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusChange(inspecting.id, 'SENT_TO_VENDOR')}
                    className="px-5 py-2.5 rounded-xl bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Transmit &amp; Issue to Supplier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAISE PURCHASE ORDER MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Raise Purchase Order</h2>
                <p className="text-xs text-[#176E84]">Create a draft PO for a wholesale supplier</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Expected Delivery</label>
                  <input
                    type="date"
                    value={expectedDelivery}
                    onChange={(e) => setExpectedDelivery(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#041F56]">Contract Line Items</label>
                  <button
                    type="button"
                    onClick={() => {
                      const first = products[0];
                      setDraftItems((prev) => [
                        ...prev,
                        { productId: first?.id || '', orderedQty: 10, unitPrice: Number(first?.costPrice || 0) },
                      ]);
                    }}
                    className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                  >
                    + Add Line
                  </button>
                </div>

                {draftItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      required
                      value={line.productId}
                      onChange={(e) => {
                        const prod = products.find((p) => p.id === e.target.value);
                        setDraftItems((prev) =>
                          prev.map((it, i) =>
                            i === idx
                              ? {
                                  ...it,
                                  productId: e.target.value,
                                  unitPrice: prod ? Number(prod.costPrice || 0) : it.unitPrice,
                                }
                              : it
                          )
                        );
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="">-- Select SKU --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku || 'NO-SKU'})
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      min="1"
                      value={line.orderedQty}
                      onChange={(e) =>
                        setDraftItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, orderedQty: Math.max(1, Number(e.target.value) || 1) } : it
                          )
                        )
                      }
                      className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
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
                  placeholder="Optional delivery or warehouse instructions"
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
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Draft PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}