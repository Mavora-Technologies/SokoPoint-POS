'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  FileText,
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
  ArrowRightCircle,
} from 'lucide-react';

interface QuoteRow {
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
  wholesalePrice?: string | number;
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

interface DraftLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

const getCustomerLabel = (c: CustomerOption): string => {
  if (c.name) return c.name;
  if (c.fullName) return c.fullName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.email || c.phone || 'Unnamed Client';
};

export default function QuotationsInvoicesPage(): JSX.Element {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [currency, setCurrency] = useState('KES');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'quotation' | 'invoiced' | 'cancelled'>('ALL');
  const [search, setSearch] = useState('');

  // Create Quotation Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customClientName, setCustomClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'bank' | 'mpesa' | 'cash' | 'card'>('credit');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [draftItems, setDraftItems] = useState<DraftLine[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [meRes, quotesRes, productsRes, customersRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/quotations'),
        api.get('/products'),
        api.get('/customers').catch(() => ({ data: { data: [] } })),
      ]);

      if (meRes?.data?.data?.currency) setCurrency(meRes.data.data.currency);

      setQuotes(Array.isArray(quotesRes.data?.data) ? quotesRes.data.data : []);
      setProducts(Array.isArray(productsRes.data?.data) ? productsRes.data.data : []);
      setCustomers(Array.isArray(customersRes.data?.data) ? customersRes.data.data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load quotations & invoices.');
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

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'ALL' && q.status !== statusFilter) return false;
      const term = search.trim().toLowerCase();
      if (!term) return true;
      const client = (q.customerId ? customerMap.get(q.customerId) : q.customerName) || 'Client';
      return (
        (q.orderNumber || '').toLowerCase().includes(term) ||
        client.toLowerCase().includes(term) ||
        (q.status || '').toLowerCase().includes(term)
      );
    });
  }, [quotes, statusFilter, search, customerMap]);

  // Live KPIs
  const openQuotes = quotes.filter((q) => q.status === 'quotation' || q.status === 'sent');
  const invoicedQuotes = quotes.filter((q) => q.status === 'invoiced' || q.status === 'completed');
  const totalPipelineValue = openQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0);
  const totalInvoicedValue = invoicedQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0);

  const handleAddLine = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = Math.max(1, parseInt(lineQty, 10) || 1);
    const unitPrice = Number(prod.sellingPrice ?? prod.wholesalePrice ?? 0);

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

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      alert('Add at least one product line to create a quotation.');
      return;
    }

    const chosen = customers.find((c) => c.id === selectedCustomerId);
    const resolvedClient = chosen ? getCustomerLabel(chosen) : customClientName.trim() || 'Prospective Client';

    try {
      setSubmitting(true);
      const res = await api.post('/quotations', {
        customerId: selectedCustomerId || null,
        customer: resolvedClient,
        method: paymentMethod,
        items: draftItems.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      });
      const createdNum = res.data?.data?.orderNumber || 'Quotation';
      setIsModalOpen(false);
      setDraftItems([]);
      setSelectedCustomerId('');
      setCustomClientName('');
      setFeedback(`${createdNum} created successfully (inventory not deducted until converted to invoice).`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToInvoice = async (quote: QuoteRow) => {
    if (!window.confirm(`Convert ${quote.orderNumber} into a confirmed Invoice and deduct inventory stock?`)) {
      return;
    }
    try {
      setConvertingId(quote.id);
      const res = await api.patch(`/quotations/${quote.id}/convert`);
      const newInv = res.data?.data?.orderNumber || 'Invoice';
      setFeedback(`Converted to ${newInv} and updated Inventory Central stock.`);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to convert quotation.');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            SALES &amp; WHOLESALE &rsaquo; QUOTATIONS &amp; PROFORMA INVOICES
          </p>
          <div className="flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Quotations &amp; Invoices
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Issue proforma quotes to retail and B2B clients, then convert approved quotes into tax invoices with automatic stock deduction.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Quotation
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

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">OPEN QUOTES PIPELINE</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">
            {currency} {Math.round(totalPipelineValue).toLocaleString()}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-amber-600 uppercase">PENDING QUOTATIONS</span>
          <h2 className="text-2xl font-black text-amber-600 font-mono mt-1.5">{openQuotes.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-emerald-600 uppercase">CONVERTED INVOICES</span>
          <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{invoicedQuotes.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-[#0554F4] uppercase">INVOICED REVENUE</span>
          <h2 className="text-2xl font-black text-[#0554F4] font-mono mt-1.5">
            {currency} {Math.round(totalInvoicedValue).toLocaleString()}
          </h2>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'quotation', 'invoiced', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize ${
                statusFilter === st ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {st === 'ALL' ? `All (${quotes.length})` : st}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quote #, invoice #, or client..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
      </div>

      {/* Quotations & Invoices Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[860px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">REFERENCE #</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CLIENT</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">VAT (16%)</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TOTAL</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">STATUS</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">DATE</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                  Loading tenant quotations &amp; invoices...
                </td>
              </tr>
            ) : filteredQuotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-gray-400">
                  No quotations or invoices found. Click <strong>New Quotation</strong> to issue your first quote.
                </td>
              </tr>
            ) : (
              filteredQuotes.map((q) => {
                const client = (q.customerId ? customerMap.get(q.customerId) : q.customerName) || 'Client';
                const isConvertible = q.status === 'quotation' || q.status === 'sent';
                return (
                  <tr key={q.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{q.orderNumber}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{client}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {currency} {Number(q.tax || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-slate-900">
                      {currency} {Number(q.total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          q.status === 'invoiced' || q.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : q.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      {new Date(q.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {isConvertible ? (
                        <button
                          type="button"
                          disabled={convertingId === q.id}
                          onClick={() => handleConvertToInvoice(q)}
                          className="px-3 py-1.5 bg-[#62C02A] hover:bg-[#57ad25] text-white rounded-xl text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          {convertingId === q.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                          )}
                          Convert to Invoice
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-semibold">Finalized</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* NEW QUOTATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Create Proforma Quotation</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Stock is only deducted once the client approves and you convert to an invoice.
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">
                    Select Customer ({customers.length})
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                  >
                    <option value="">-- Enter Custom Client Below --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCustomerLabel(c)} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Proposed Payment Terms</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                  >
                    <option value="credit">Net Credit Invoice</option>
                    <option value="bank">Bank Transfer / EFT</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="cash">Cash on Delivery</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              {!selectedCustomerId && (
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Client / Company Name</label>
                  <input
                    type="text"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    placeholder="e.g. Westlands Superstore Ltd"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                  />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-black text-[#041F56] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#0554F4]" /> Quote Line Items
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800"
                  >
                    <option value="">-- Select Product ({products.length}) --</option>
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
                    + Add Line
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
                          <span className="font-mono font-black text-[#041F56]">
                            {currency} {(item.unitPrice * item.quantity).toLocaleString()}
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

              <div className="p-4 rounded-2xl bg-[#F5F8FE] border border-blue-100 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Taxable Base Net</span>
                  <span className="font-mono font-semibold">
                    {currency} {draftBase.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>KRA VAT (16%)</span>
                  <span className="font-mono font-semibold">
                    {currency} {draftVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-[#041F56] pt-2 border-t border-blue-200 mt-1">
                  <span>Quotation Total</span>
                  <span className="font-mono text-[#0554F4]">
                    {currency} {draftTotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
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
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Issue Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}