'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Download,
  RefreshCw,
  FileText,
  Package,
  TrendingUp,
  Receipt,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Truck,
  Building2,
  User,
  QrCode,
  X,
  RotateCcw,
} from 'lucide-react';
import api from '../../../lib/api';
import RefundOrderModal from '../../../components/RefundOrderModal';

interface OrderItemRow {
  productId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderRow {
  id: string;
  orderNum: string;
  branchId?: string | null;
  branchName: string;
  custodianName: string;
  customer: string;
  customerPin?: string | null;
  saleChannel: string;
  status: string;
  method: string;
  subtotal: number;
  tax: number;
  total: number;
  etimsCuNo?: string | null;
  createdAt: string;
  items: OrderItemRow[];
}

const SERVICE_CHANNELS = [
  'Retail Checkout',
  'Wholesale Dispatch',
  'Delivery',
  'Click & Collect',
];

const FULFILLMENT_STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'packing', label: 'Packing' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function OrdersClient() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'pending' | 'packing' | 'dispatched' | 'completed' | 'refunded' | 'cancelled'>('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [settlementFilter, setSettlementFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'REFUNDED'>('ALL');
  const [tenderFilter, setTenderFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [onlyWithPin, setOnlyWithPin] = useState(false);

  // Inspect & Refund Modals
  const [inspectingOrder, setInspectingOrder] = useState<OrderRow | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState<OrderRow | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id) setCurrentUserId(String(parsed.id));
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/orders');
      const data = response.data?.data ?? response.data ?? [];
      setOrders(Array.isArray(data) ? data : []);
      if (Array.isArray(response.data?.branches)) {
        setBranches(response.data.branches);
      }
    } catch (error) {
      console.error('Failed to fetch orders', error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const st = (o.status || 'completed').toLowerCase();
      if (statusTab !== 'ALL' && st !== statusTab) return false;
      if (branchFilter !== 'ALL' && o.branchId !== branchFilter) return false;
      if (channelFilter !== 'ALL' && o.saleChannel !== channelFilter) return false;

      if (settlementFilter === 'PAID' && (st === 'refunded' || st === 'cancelled' || st === 'pending')) return false;
      if (settlementFilter === 'PENDING' && st !== 'pending') return false;
      if (settlementFilter === 'REFUNDED' && st !== 'refunded') return false;

      const m = (o.method || 'cash').toLowerCase();
      if (tenderFilter !== 'ALL' && !m.includes(tenderFilter)) return false;

      if (dateFrom && new Date(o.createdAt) < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && new Date(o.createdAt) > new Date(`${dateTo}T23:59:59`)) return false;

      if (minAmount && Number(o.total || 0) < Number(minAmount)) return false;
      if (onlyWithPin && !o.customerPin) return false;

      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (o.orderNum || '').toLowerCase().includes(q) ||
        (o.customer || '').toLowerCase().includes(q) ||
        (o.customerPin || '').toLowerCase().includes(q) ||
        (o.branchName || '').toLowerCase().includes(q) ||
        (o.custodianName || '').toLowerCase().includes(q)
      );
    });
  }, [
    orders,
    statusTab,
    branchFilter,
    channelFilter,
    settlementFilter,
    tenderFilter,
    dateFrom,
    dateTo,
    minAmount,
    onlyWithPin,
    searchQuery,
  ]);

  const kpis = useMemo(() => {
    let activeQueue = 0;
    let grossTurnover = 0;
    let outputVat = 0;
    let validCount = 0;

    for (const o of filteredOrders) {
      const st = (o.status || 'completed').toLowerCase();
      if (['pending', 'packing', 'dispatched'].includes(st)) {
        activeQueue += 1;
      }
      if (st !== 'cancelled' && st !== 'refunded') {
        grossTurnover += Number(o.total || 0);
        outputVat += Number(o.tax || 0);
        validCount += 1;
      }
    }

    const avgTicket = validCount > 0 ? grossTurnover / validCount : 0;
    return {
      totalCount: filteredOrders.length,
      avgTicket,
      activeQueue,
      grossTurnover,
      outputVat,
    };
  }, [filteredOrders]);

  const handleStatusUpdate = async (orderId: string, nextStatus: string) => {
    try {
      setUpdatingStatus(true);
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      setInspectingOrder((prev) =>
        prev && prev.id === orderId ? { ...prev, status: nextStatus } : prev
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCsv = () => {
    const header = [
      'Order #',
      'Date',
      'Branch',
      'Cashier',
      'Channel',
      'Customer',
      'KRA PIN',
      'Status',
      'Tender',
      'VAT (KES)',
      'Total (KES)',
    ];
    const rows = filteredOrders.map((o) => [
      o.orderNum,
      new Date(o.createdAt).toISOString(),
      o.branchName,
      o.custodianName,
      o.saleChannel,
      o.customer,
      o.customerPin || '',
      o.status,
      o.method.toUpperCase(),
      Number(o.tax || 0).toFixed(2),
      Number(o.total || 0).toFixed(2),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SokoPoint-Orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusBadge = (status: string) => {
    const st = (status || 'completed').toLowerCase();
    if (st === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> Completed
        </span>
      );
    }
    if (st === 'dispatched') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Truck className="h-3 w-3" /> Dispatched
        </span>
      );
    }
    if (st === 'packing' || st === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" /> {st === 'packing' ? 'Packing' : 'Pending'}
        </span>
      );
    }
    if (st === 'refunded' || st === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="h-3 w-3" /> {st === 'refunded' ? 'Refunded' : 'Cancelled'}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
        {st}
      </span>
    );
  };

  const formatTender = (method: string) => {
    const m = (method || 'cash').toLowerCase();
    if (m.includes('mpesa')) return 'M-PESA';
    if (m.includes('card')) return 'CARD PDQ';
    if (m.includes('bank')) return 'BANK EFT';
    if (m.includes('credit')) return 'WHOLESALE CREDIT';
    return 'CASH DRAWER';
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Order-to-Cash &amp; Sales &rsaquo; Order Management Ledger
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Enterprise Order-to-Cash Ledger
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Multi-branch retail &amp; wholesale fulfillment tracking, tender settlement audit, itemized SKU drill-downs, and KRA eTIMS fiscal records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/pos"
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> New POS Ticket
          </Link>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-[#041F56] hover:bg-[#062d7a] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
          <button
            onClick={fetchOrders}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FILTERED TICKETS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.totalCount.toLocaleString()} Orders</p>
            <p className="text-[11px] text-[#0554F4] mt-0.5 font-mono">
              Avg Ticket: KES {Math.round(kpis.avgTicket).toLocaleString('en-KE')}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE DISPATCH QUEUE</p>
            <p className="text-xl font-black text-amber-600 mt-1">{kpis.activeQueue} In Progress</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Pending, Packing &amp; Dispatched</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GROSS TURNOVER</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.grossTurnover.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Excludes cancelled &amp; refunded orders</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OUTPUT VAT (16%)</p>
            <p className="text-xl font-black text-purple-600 font-mono mt-1">
              KES {kpis.outputVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-purple-600 mt-0.5">KRA Statutory Liability</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Multi-Filter Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, branch, cashier, or KRA PIN..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
            />
          </div>

          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl overflow-x-auto">
            {[
              { key: 'ALL', label: 'All Statuses' },
              { key: 'pending', label: 'Pending' },
              { key: 'packing', label: 'Packing' },
              { key: 'dispatched', label: 'Dispatched' },
              { key: 'completed', label: 'Completed' },
              { key: 'refunded', label: 'Refunded' },
              { key: 'cancelled', label: 'Cancelled' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusTab(t.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap cursor-pointer ${
                  statusTab === t.key ? 'bg-white text-[#041F56] font-bold shadow-xs' : 'text-slate-500'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">BRANCH OUTLET</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
            >
              <option value="ALL">All Locations ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">SERVICE CHANNEL</label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
            >
              <option value="ALL">All Channels</option>
              {SERVICE_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">PAYMENT STATUS</label>
            <select
              value={settlementFilter}
              onChange={(e) => setSettlementFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
            >
              <option value="ALL">All Settlements</option>
              <option value="PAID">Paid / Settled</option>
              <option value="PENDING">Pending Payment</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">TENDER METHOD</label>
            <select
              value={tenderFilter}
              onChange={(e) => setTenderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
            >
              <option value="ALL">All Tenders</option>
              <option value="cash">Cash Drawer</option>
              <option value="mpesa">M-Pesa STK / C2B</option>
              <option value="card">Card Terminal (PDQ)</option>
              <option value="credit">Wholesale Credit</option>
              <option value="bank">Bank EFT / Wire</option>
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">DATE WINDOW</label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-xl text-[11px]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-2 py-2 border border-slate-200 rounded-xl text-[11px]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">TICKET RANGE &amp; B2B</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="Min KES"
                className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setOnlyWithPin((p) => !p)}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border cursor-pointer ${
                  onlyWithPin
                    ? 'bg-[#0554F4] text-white border-[#0554F4]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
                title="Filter B2B orders with KRA PIN"
              >
                PIN
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[980px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">ORDER # &amp; TIMESTAMP</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">BRANCH &amp; CUSTODIAN</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CHANNEL / CUSTOMER</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">FULFILLMENT</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">SETTLEMENT &amp; ETIMS</th>
              <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">TOTAL (KES)</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="p-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-16 text-center text-slate-400 font-semibold">
                  No orders match your current filters. Transactions from the POS terminal will appear here.
                </td>
              </tr>
            ) : (
              filteredOrders.map((o) => {
                const isRefunded = (o.status || '').toLowerCase() === 'refunded';
                return (
                  <tr key={o.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <p className="font-mono font-bold text-[#041F56]">{o.orderNum}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {o.saleChannel} &bull; {new Date(o.createdAt).toLocaleString('en-US')}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-800 inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" /> {o.branchName}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3" /> {o.custodianName}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#041F56]">{o.saleChannel}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {o.customer}
                        {o.customerPin ? ` • PIN: ${o.customerPin}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-4">{renderStatusBadge(o.status)}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> Paid ({formatTender(o.method)})
                      </span>
                      {o.etimsCuNo && (
                        <p className="text-[10px] font-mono text-[#0554F4] mt-1 inline-flex items-center gap-1">
                          <QrCode className="h-3 w-3" /> {o.etimsCuNo}
                        </p>
                      )}
                    </td>
                    <td
                      className={`px-4 py-4 text-right font-mono font-black ${
                        isRefunded ? 'text-slate-400 line-through' : 'text-[#041F56]'
                      }`}
                    >
                      KES {Number(o.total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setInspectingOrder(o)}
                        className="text-[#0554F4] hover:underline font-bold text-xs cursor-pointer"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* INSPECT ORDER MODAL */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#041F56] font-mono">
                  {inspectingOrder.orderNum}
                </h2>
                <p className="text-xs text-[#176E84] mt-0.5 leading-relaxed">
                  {inspectingOrder.branchName} &bull; Channel:{' '}
                  <strong className="text-[#041F56]">{inspectingOrder.saleChannel}</strong> &bull; Cashier:{' '}
                  <strong className="text-[#041F56]">{inspectingOrder.custodianName}</strong>
                </p>
              </div>
              <button
                onClick={() => setInspectingOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 2x2 Summary Box */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">GRAND TOTAL</p>
                <p className="text-lg font-mono font-black text-[#041F56] mt-0.5">
                  KES {Number(inspectingOrder.total || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PAYMENT SETTLEMENT</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">
                  Paid ({formatTender(inspectingOrder.method)})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VAT &amp; TAX (16%)</p>
                <p className="text-xs font-mono font-bold text-[#041F56] mt-0.5">
                  VAT: KES {Number(inspectingOrder.tax || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CUSTOMER / KRA PIN</p>
                <p className="text-xs font-bold text-[#041F56] mt-0.5">
                  {inspectingOrder.customer}
                  {inspectingOrder.customerPin ? ` (${inspectingOrder.customerPin})` : ''}
                </p>
              </div>
            </div>

            {/* Ordered Line Items */}
            <div className="space-y-2.5">
              <p className="text-xs font-extrabold text-[#041F56]">Ordered Line Items:</p>
              {inspectingOrder.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  No itemized line items recorded.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {inspectingOrder.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 px-4 py-3 flex justify-between items-center gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#041F56] truncate">
                          {it.quantity}x {it.productName}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          SKU: {it.sku || 'N/A'}
                        </p>
                      </div>
                      <span className="font-mono text-xs font-extrabold text-[#041F56] shrink-0">
                        KES {Number(it.subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Advance Fulfillment Status */}
            <div className="space-y-2.5">
              <p className="text-xs font-extrabold text-[#041F56]">Advance Fulfillment Status:</p>
              <div className="grid grid-cols-3 gap-2">
                {FULFILLMENT_STEPS.map((step) => {
                  const isActive = (inspectingOrder.status || '').toLowerCase() === step.key;
                  const isCancel = step.key === 'cancelled';
                  return (
                    <button
                      key={step.key}
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusUpdate(inspectingOrder.id, step.key)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                        isActive
                          ? 'bg-[#041F56] text-white border-[#041F56] shadow-xs'
                          : isCancel
                            ? 'bg-rose-50/70 text-rose-600 border-rose-200 hover:bg-rose-100'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {step.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              {(inspectingOrder.status || '').toLowerCase() !== 'refunded' ? (
                <button
                  type="button"
                  onClick={() => {
                    setOrderToRefund(inspectingOrder);
                    setInspectingOrder(null);
                  }}
                  className="text-xs font-bold text-rose-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Issue Refund
                </button>
              ) : (
                <span className="text-[11px] font-bold text-rose-500">Order Refunded</span>
              )}

              <button
                type="button"
                onClick={() => setInspectingOrder(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      <RefundOrderModal
        isOpen={!!orderToRefund}
        onClose={() => setOrderToRefund(null)}
        order={
          orderToRefund
            ? {
                id: orderToRefund.id,
                orderNum: orderToRefund.orderNum,
                total: Number(orderToRefund.total) || 0,
              }
            : null
        }
        onSuccess={() => {
          fetchOrders();
        }}
        currentUserId={currentUserId}
      />
    </div>
  );
}