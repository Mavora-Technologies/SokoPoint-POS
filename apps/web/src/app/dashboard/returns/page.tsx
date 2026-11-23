'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  RefreshCcw,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogIn,
  Package,
} from 'lucide-react';

interface RefundRow {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customerName?: string | null;
  status: string;
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  paymentMethod: string;
  createdAt: string;
}

interface ProductOption {
  id: string;
  name: string;
  sellingPrice: string | number;
  stock?: number;
}

interface CustomerOption {
  id: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
}

interface DraftReturnLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

const getCustomerLabel = (c: CustomerOption): string => {
  if (c.name) return c.name;
  if (c.fullName) return c.fullName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.email || c.phone || 'Walk-in Customer';
};

export default function ReturnsRefundsPage(): JSX.Element {
  const [refunds, setRefunds] = useState<RefundRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [currency, setCurrency] = useState('KES');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [methodFilter, setMethodFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Process Return Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card' | 'credit' | 'bank'>('cash');
  const [restockInventory, setRestockInventory] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [draftItems, setDraftItems] = useState<DraftReturnLine[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [meRes, refundsRes, productsRes, customersRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/refunds'),
        api.get('/products'),
        api.get('/customers').catch(() => ({ data: { data: [] } })),
      ]);

      if (meRes?.data?.data?.currency) setCurrency(meRes.data.data.currency);

      setRefunds(Array.isArray(refundsRes.data?.data) ? refundsRes.data.data : []);
      setProducts(Array.isArray(productsRes.data?.data) ? productsRes.data.data : []);
      setCustomers(Array.isArray(customersRes.data?.data) ? customersRes.data.data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load returns & refunds.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, getCustomerLabel(c)));
    return map;
  }, [customers]);

  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      if (methodFilter !== 'ALL' && (r.paymentMethod || '').toLowerCase() !== methodFilter) {
        return false;
      }
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const buyer = (r.customerId ? customerMap.get(r.customerId) : r.customerName) || 'Walk-in Customer';
      return (
        (r.orderNumber || '').toLowerCase().includes(q) ||
        buyer.toLowerCase().includes(q) ||
        (r.paymentMethod || '').toLowerCase().includes(q)
      );
    });
  }, [refunds, methodFilter, search, customerMap]);

  // Live KPIs
  const totalRefunded = refunds.reduce((sum, r) => sum + Math.abs(Number(r.total || 0)), 0);
  const totalVatReversed = refunds.reduce((sum, r) => sum + Math.abs(Number(r.tax || 0)), 0);
  const avgRefund = refunds.length > 0 ? Math.round(totalRefunded / refunds.length) : 0;

  const handleAddLine = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = Math.max(1, parseInt(lineQty, 10) || 1);
    const unitPrice = Number(prod.sellingPrice ?? 0);

    setDraftItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) => (i.productId === prod.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { productId: prod.id, name: prod.name, unitPrice, quantity: qty }];
    });
    setSelectedProductId('');
    setLineQty('1');
  };

  const draftTotal = draftItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const draftBase = draftTotal / 1.16;
  const draftVat = draftTotal - draftBase;

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      alert('Add at least one returned product.');
      return;
    }

    const chosen = customers.find((c) => c.id === selectedCustomerId);
    const resolvedCustomer = chosen
      ? getCustomerLabel(chosen)
      : customCustomerName.trim() || 'Walk-in Customer';

    try {
      setSubmitting(true);
      const res = await api.post('/refunds', {
        customerId: selectedCustomerId || null,
        customer: resolvedCustomer,
        method: paymentMethod,
        restock: restockInventory,
        items: draftItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      const retNum = res.data?.data?.orderNumber || 'Return';
      setIsModalOpen(false);
      setDraftItems([]);
      setSelectedCustomerId('');
      setCustomCustomerName('');
      setFeedback(
        `${retNum} processed successfully.${restockInventory ? ' Returned units restored to Inventory Central.' : ''}`
      );
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to process return.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider mb-1">
            SALES &amp; WHOLESALE &rsaquo; CREDIT NOTES, RETURNS &amp; REFUNDS
          </p>
          <div className="flex items-center gap-2.5">
            <RefreshCcw className="w-6 h-6 text-rose-600" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Returns &amp; Refunds Ledger
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Process customer returns, reverse VAT entries, and automatically restock returned items into Inventory Central.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Process Return
          </button>
          <button
            type="button"
            onClick={loadData}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-rose-600 uppercase">TOTAL REFUNDED</span>
          <h2 className="text-2xl font-black text-rose-600 font-mono mt-1.5">
            {currency} {Math.round(totalRefunded).toLocaleString()}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">RETURNS PROCESSED</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">{refunds.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-amber-600 uppercase">VAT REVERSED (16%)</span>
          <h2 className="text-2xl font-black text-amber-600 font-mono mt-1.5">
            {currency} {Math.round(totalVatReversed).toLocaleString()}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">AVG REFUND VALUE</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">
            {currency} {avgRefund.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return #, customer, or method..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
        >
          <option value="ALL">All Refund Methods</option>
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
          <option value="credit">Credit Note</option>
          <option value="bank">Bank Transfer</option>
        </select>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[820px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">RETURN #</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CUSTOMER</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">REFUND METHOD</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">VAT REVERSED</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">REFUND AMOUNT</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">DATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                  Loading tenant returns &amp; refunds...
                </td>
              </tr>
            ) : filteredRefunds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-gray-400">
                  No returns or refunds recorded yet.
                </td>
              </tr>
            ) : (
              filteredRefunds.map((r) => {
                const buyer =
                  (r.customerId ? customerMap.get(r.customerId) : r.customerName) || 'Walk-in Customer';
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-mono font-bold text-rose-700">{r.orderNumber}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{buyer}</td>
                    <td className="px-6 py-4 uppercase font-bold text-[#0554F4]">{r.paymentMethod}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {currency}{' '}
                      {Math.abs(Number(r.tax || 0)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-rose-600">
                      -{currency}{' '}
                      {Math.abs(Number(r.total || 0)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-500">
                      {new Date(r.createdAt).toLocaleString('en-GB')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PROCESS RETURN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Process Customer Return &amp; Refund</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Records a negative credit entry and optionally restocks returned items in Inventory Central.
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessReturn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">
                    Customer ({customers.length})
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                  >
                    <option value="">-- Walk-in Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCustomerLabel(c)} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Refund Payout Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                  >
                    <option value="cash">Cash Refund</option>
                    <option value="mpesa">M-Pesa Reversal</option>
                    <option value="card">Card Refund</option>
                    <option value="credit">Store Credit Note</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
              </div>

              {!selectedCustomerId && (
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={customCustomerName}
                    onChange={(e) => setCustomCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-black text-[#041F56] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-rose-600" /> Returned Items
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    <option value="">-- Select Returned Product ({products.length}) --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} • {currency} {Number(p.sellingPrice ?? 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    className="w-full sm:w-24 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-4 py-2 bg-[#041F56] hover:bg-[#0554F4] text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    + Add Item
                  </button>
                </div>

                {draftItems.length > 0 && (
                  <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 overflow-hidden mt-2">
                    {draftItems.map((item) => (
                      <div key={item.productId} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {item.quantity} &times; {currency} {item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-rose-600">
                            -{currency} {(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDraftItems((prev) => prev.filter((i) => i.productId !== item.productId))}
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2.5 text-xs font-bold text-[#041F56] cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={restockInventory}
                  onChange={(e) => setRestockInventory(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span>Restock returned units back into Inventory Central</span>
              </label>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base Reversed</span>
                  <span className="font-mono font-semibold">
                    {currency} {draftBase.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>KRA VAT Reversed (16%)</span>
                  <span className="font-mono font-semibold">
                    {currency} {draftVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-rose-700 pt-2 border-t border-rose-200 mt-1">
                  <span>Total Refund Amount</span>
                  <span className="font-mono">
                    -{currency} {draftTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || draftItems.length === 0}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Refund
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}