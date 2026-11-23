'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  Truck,
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
  Building2,
} from 'lucide-react';

interface OrderRow {
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
  sku?: string | null;
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

interface DraftLineItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

const getCustomerLabel = (c: CustomerOption): string => {
  if (c.name) return c.name;
  if (c.fullName) return c.fullName;
  const full = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return full || c.email || c.phone || 'Unnamed Account';
};

export default function WholesaleOrdersPage(): JSX.Element {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [currency, setCurrency] = useState('KES');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'WHOLESALE' | 'ALL'>('WHOLESALE');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // New Wholesale Order Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customBuyerName, setCustomBuyerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'bank' | 'mpesa' | 'cash' | 'card'>('credit');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState('10');
  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);

  const loadWholesaleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [meRes, ordersRes, productsRes, customersRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/orders'),
        api.get('/products'),
        api.get('/customers').catch(() => ({ data: { data: [] } })),
      ]);

      if (meRes?.data?.data?.currency) {
        setCurrency(meRes.data.data.currency);
      }

      const rawOrders: OrderRow[] = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      const rawProducts: ProductOption[] = Array.isArray(productsRes.data?.data) ? productsRes.data.data : [];
      const rawCustomers: CustomerOption[] = Array.isArray(customersRes.data?.data) ? customersRes.data.data : [];

      setOrders(rawOrders);
      setProducts(rawProducts);
      setCustomers(rawCustomers);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load wholesale orders from database.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWholesaleData();
  }, [loadWholesaleData]);

  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach((c) => map.set(c.id, getCustomerLabel(c)));
    return map;
  }, [customers]);

  const wholesaleOnlyOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.orderNumber?.toUpperCase().startsWith('WHL-') ||
          ['credit', 'bank'].includes((o.paymentMethod || '').toLowerCase())
      ),
    [orders]
  );

  const activeList = viewMode === 'WHOLESALE' ? wholesaleOnlyOrders : orders;

  const filteredOrders = useMemo(() => {
    return activeList.filter((o) => {
      if (paymentFilter !== 'ALL' && (o.paymentMethod || '').toLowerCase() !== paymentFilter) {
        return false;
      }
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const buyer = (o.customerId ? customerMap.get(o.customerId) : o.customerName) || 'Walk-in / B2B';
      return (
        (o.orderNumber || '').toLowerCase().includes(q) ||
        buyer.toLowerCase().includes(q) ||
        (o.paymentMethod || '').toLowerCase().includes(q)
      );
    });
  }, [activeList, paymentFilter, search, customerMap]);

  // Live KPIs
  const totalRevenue = wholesaleOnlyOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const creditAndBankCount = wholesaleOnlyOrders.filter((o) =>
    ['credit', 'bank'].includes((o.paymentMethod || '').toLowerCase())
  ).length;
  const avgBulkOrder =
    wholesaleOnlyOrders.length > 0 ? Math.round(totalRevenue / wholesaleOnlyOrders.length) : 0;

  // Draft Order Line Management
  const handleAddLineItem = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const qty = Math.max(1, parseInt(lineQty, 10) || 1);
    const availableStock = Number(prod.stock ?? 0);
    const unitPrice = Number(prod.wholesalePrice ?? prod.sellingPrice ?? 0);

    if (availableStock > 0 && qty > availableStock) {
      alert(`Only ${availableStock} units available in inventory for ${prod.name}.`);
      return;
    }

    setDraftItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (availableStock > 0 && nextQty > availableStock) {
          alert(`Only ${availableStock} units available in inventory for ${prod.name}.`);
          return prev;
        }
        return prev.map((i) => (i.productId === prod.id ? { ...i, quantity: nextQty } : i));
      }
      return [
        ...prev,
        {
          productId: prod.id,
          name: prod.name,
          unitPrice,
          quantity: qty,
          maxStock: availableStock,
        },
      ];
    });

    setSelectedProductId('');
    setLineQty('10');
  };

  const removeDraftItem = (productId: string) => {
    setDraftItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const draftTotal = draftItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const draftBase = draftTotal / 1.16;
  const draftVat = draftTotal - draftBase;

  const handleCreateWholesaleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      alert('Add at least one product to the wholesale order.');
      return;
    }

    const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
    const resolvedBuyerName = selectedCustomer
      ? getCustomerLabel(selectedCustomer)
      : customBuyerName.trim() || 'Wholesale Client';

    try {
      setSubmitting(true);
      const orderNum = `WHL-${Math.floor(Math.random() * 900000) + 100000}`;

      await api.post('/orders', {
        orderNum,
        customerId: selectedCustomerId || null,
        customer: resolvedBuyerName,
        saleChannel: 'Wholesale',
        method: paymentMethod,
        isRefund: false,
        items: draftItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      setIsModalOpen(false);
      setDraftItems([]);
      setSelectedCustomerId('');
      setCustomBuyerName('');
      setFeedback(`Wholesale order ${orderNum} created and inventory stock updated.`);
      await loadWholesaleData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create wholesale order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            SALES &amp; WHOLESALE &rsaquo; B2B BULK ORDERS &amp; DISPATCH
          </p>
          <div className="flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Wholesale &amp; Bulk Orders
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Create bulk B2B orders, manage trade credit/bank settlements, and sync deductions directly with Inventory Central.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Wholesale Order
          </button>
          <button
            type="button"
            onClick={loadWholesaleData}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl"
            aria-label="Refresh wholesale orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error / Auth Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </span>
          {isUnauthorized && (
            <Link
              href="/login"
              className="px-3.5 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1.5 hover:bg-[#041F56]"
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

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">WHOLESALE TURNOVER</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">
            {currency} {Math.round(totalRevenue).toLocaleString()}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-[#0554F4] uppercase">WHOLESALE ORDERS</span>
          <h2 className="text-2xl font-black text-[#0554F4] font-mono mt-1.5">
            {wholesaleOnlyOrders.length}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-emerald-600 uppercase">CREDIT &amp; BANK ORDERS</span>
          <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">
            {creditAndBankCount}
          </h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-purple-600 uppercase">AVG BULK ORDER</span>
          <h2 className="text-2xl font-black text-purple-700 font-mono mt-1.5">
            {currency} {avgBulkOrder.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* Filters & View Switcher */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('WHOLESALE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              viewMode === 'WHOLESALE' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Wholesale Orders ({wholesaleOnlyOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              viewMode === 'ALL' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            All Tenant Orders ({orders.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, buyer, or method..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="credit">Trade Credit</option>
            <option value="bank">Bank Transfer</option>
            <option value="mpesa">M-Pesa</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
          </select>
        </div>
      </div>

      {/* Orders Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[860px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">ORDER NUMBER</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CUSTOMER / BUYER</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">PAYMENT</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TAX (16% VAT)</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TOTAL</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">STATUS</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">DATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                  Loading tenant wholesale ledger...
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-14 text-center text-gray-400">
                  No wholesale orders found. Click <strong>New Wholesale Order</strong> to create a bulk B2B order.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const buyerName =
                  (order.customerId ? customerMap.get(order.customerId) : order.customerName) ||
                  'Wholesale / Walk-in';
                return (
                  <tr key={order.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{order.orderNumber}</td>
                    <td className="px-6 py-4 font-semibold text-gray-800">{buyerName}</td>
                    <td className="px-6 py-4 uppercase font-bold text-[#0554F4]">{order.paymentMethod}</td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {currency} {Number(order.tax || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 font-mono font-black text-slate-900">
                      {currency} {Number(order.total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${
                          order.status === 'refunded'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-500">
                      {new Date(order.createdAt).toLocaleString('en-GB')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE WHOLESALE ORDER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#0554F4]" /> Create Wholesale Order
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Persists to PostgreSQL and deducts stock directly from Inventory Central.
                </p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWholesaleOrder} className="space-y-4">
              {/* Buyer & Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">
                    Wholesale Customer ({customers.length})
                  </label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
                  >
                    <option value="">-- Enter Custom Buyer Below --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCustomerLabel(c)} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Payment Terms *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
                  >
                    <option value="credit">Trade Credit (Invoice)</option>
                    <option value="bank">Bank Transfer / EFT</option>
                    <option value="mpesa">M-Pesa Paybill</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
              </div>

              {!selectedCustomerId && (
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Business / Buyer Name</label>
                  <input
                    type="text"
                    value={customBuyerName}
                    onChange={(e) => setCustomBuyerName(e.target.value)}
                    placeholder="e.g. Kilimani Mini-Mart Ltd"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
                  />
                </div>
              )}

              {/* Add Product Line */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-xs font-black text-[#041F56] flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#0554F4]" /> Add Bulk Line Items
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">-- Select Product from Inventory ({products.length}) --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} • {currency} {Number(p.wholesalePrice ?? p.sellingPrice ?? 0).toLocaleString()} (Stock:{' '}
                        {Number(p.stock ?? 0)})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={lineQty}
                    onChange={(e) => setLineQty(e.target.value)}
                    placeholder="Qty"
                    className="w-full sm:w-24 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-900"
                  />
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="px-4 py-2 bg-[#041F56] hover:bg-[#0554F4] text-white rounded-xl text-xs font-bold shrink-0"
                  >
                    + Add Line
                  </button>
                </div>

                {/* Draft Items List */}
                {draftItems.length > 0 && (
                  <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 overflow-hidden mt-2">
                    {draftItems.map((item) => (
                      <div key={item.productId} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {item.quantity} units &times; {currency} {item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-black text-[#041F56]">
                            {currency} {(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeDraftItem(item.productId)}
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

              {/* Totals Summary */}
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
                  <span>Wholesale Order Total</span>
                  <span className="font-mono text-[#62C02A]">
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
                  className="px-5 py-2.5 bg-[#62C02A] hover:bg-[#57ad25] text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm &amp; Deduct Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}