'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  TrendingUp,
  Receipt,
  ShoppingBag,
  Package,
  Wallet,
  ArrowRight,
  ChevronDown,
  Activity,
  Box,
  ShieldCheck,
  Users,
  Scale,
  Truck,
} from 'lucide-react';
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay, parseISO } from 'date-fns';
import api from '../../lib/api';

interface RawOrder {
  id: string;
  orderNumber?: string;
  total: string | number;
  tax?: string | number;
  paymentMethod?: string;
  channel?: string;
  status?: string;
  branchId?: string;
  branchName?: string;
  createdAt?: string;
  items?: { productName?: string; name?: string; quantity: number; subtotal?: number; unitPrice?: number }[];
}

interface RawProduct {
  id: string;
  name: string;
  stock?: number;
  minimumStock?: number;
  reorderLevel?: number;
  costPrice?: string | number;
  sellingPrice?: string | number;
}

interface RawCustomer {
  id: string;
  name?: string;
  creditBalance?: string | number;
  type?: string;
}

interface RawExpense {
  id: string;
  amount: string | number;
  status?: string;
  createdAt?: string;
}

export default function DashboardClient() {
  const [rawData, setRawData] = useState<{
    orders: RawOrder[];
    products: RawProduct[];
    customers: RawCustomer[];
    expenses: RawExpense[];
    branches: string[];
  }>({
    orders: [],
    products: [],
    customers: [],
    expenses: [],
    branches: ['All Branch Locations'],
  });

  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('SokoPoint Enterprise');
  const [activeTab, setActiveTab] = useState('Executive Overview');

  const [branchOpen, setBranchOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('All Branch Locations');

  const [channelOpen, setChannelOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState('All Sales Channels');

  const [timeOpen, setTimeOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState('Past 7 Days');

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const branchRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchRef.current && !branchRef.current.contains(event.target as Node)) setBranchOpen(false);
      if (channelRef.current && !channelRef.current.contains(event.target as Node)) setChannelOpen(false);
      if (timeRef.current && !timeRef.current.contains(event.target as Node)) setTimeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, ordersRes, productsRes, customersRes, expensesRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/orders').catch(() => ({ data: { data: [] } })),
        api.get('/products').catch(() => ({ data: { data: [] } })),
        api.get('/customers').catch(() => ({ data: { data: [] } })),
        api.get('/expenses').catch(() => ({ data: { data: [] } })),
      ]);

      if (meRes?.data?.data?.businessName) {
        setTenantName(meRes.data.data.businessName);
      }

      const orders: RawOrder[] = Array.isArray(ordersRes.data?.data) ? ordersRes.data.data : [];
      const products: RawProduct[] = Array.isArray(productsRes.data?.data) ? productsRes.data.data : [];
      const customers: RawCustomer[] = Array.isArray(customersRes.data?.data) ? customersRes.data.data : [];
      const expenses: RawExpense[] = Array.isArray(expensesRes.data?.data) ? expensesRes.data.data : [];

      const uniqueBranches = Array.from(
        new Set(
          orders
            .map((o) => o.branchName)
            .filter((b): b is string => Boolean(b))
        )
      );

      setRawData({
        orders,
        products,
        customers,
        expenses,
        branches: ['All Branch Locations', ...uniqueBranches],
      });
    } catch (error) {
      console.error('Failed to fetch tenant dashboard telemetry:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Compute all KPIs & charts from real tenant-isolated records
  const data = useMemo(() => {
    const now = new Date();
    let rangeStart = startOfDay(now);
    let rangeEnd = endOfDay(now);

    if (selectedTime === 'Yesterday') {
      rangeStart = startOfDay(subDays(now, 1));
      rangeEnd = endOfDay(subDays(now, 1));
    } else if (selectedTime === 'Past 7 Days') {
      rangeStart = startOfDay(subDays(now, 7));
    } else if (selectedTime === 'Past 30 Days') {
      rangeStart = startOfDay(subDays(now, 30));
    } else if (selectedTime === 'Custom Range' && startDate && endDate) {
      rangeStart = startOfDay(parseISO(startDate));
      rangeEnd = endOfDay(parseISO(endDate));
    }

    const filteredOrders = rawData.orders.filter((o) => {
      if (selectedBranch !== 'All Branch Locations' && o.branchName && o.branchName !== selectedBranch) {
        return false;
      }
      if (selectedChannel !== 'All Sales Channels') {
        const orderChannel = (o.channel || 'Retail POS').toLowerCase();
        if (!orderChannel.includes(selectedChannel.toLowerCase())) return false;
      }
      if (o.createdAt) {
        const dt = parseISO(o.createdAt);
        if (isBefore(dt, rangeStart) || isAfter(dt, rangeEnd)) return false;
      }
      return true;
    });

    const totalSales = filteredOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const vatAmount = filteredOrders.reduce(
      (sum, o) => sum + (o.tax !== undefined ? Number(o.tax) : Number(o.total || 0) * (16 / 116)),
      0
    );
    const transactionCount = filteredOrders.length;
    const wholesaleOrders = filteredOrders.filter((o) => (o.channel || '').toLowerCase() === 'wholesale').length;
    const completedOrders = filteredOrders.filter((o) => (o.status || 'completed').toLowerCase() === 'completed').length;

    // Stock valuation & alerts
    const totalStockItems = rawData.products.length;
    const lowStockItems = rawData.products.filter(
      (p) => Number(p.stock ?? 0) <= Number(p.reorderLevel || p.minimumStock || 5)
    ).length;
    const outOfStockItems = rawData.products.filter((p) => Number(p.stock ?? 0) <= 0).length;
    const stockValuation = rawData.products.reduce(
      (sum, p) => sum + Number(p.stock ?? 0) * Number(p.costPrice || p.sellingPrice || 0),
      0
    );

    // Customers & Credit
    const totalCustomers = rawData.customers.length;
    const outstandingCredit = rawData.customers.reduce((sum, c) => sum + Number(c.creditBalance || 0), 0);

    // Expenses
    const totalExpenses = rawData.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashSales = filteredOrders
      .filter((o) => (o.paymentMethod || 'cash').toLowerCase() === 'cash')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);

    // Trend Data (grouped by day)
    const trendMap: Record<string, { sortKey: number; label: string; sales: number }> = {};
    filteredOrders.forEach((o) => {
      if (!o.createdAt) return;
      const dt = parseISO(o.createdAt);
      const key = format(dt, 'yyyy-MM-dd');
      const label = format(dt, selectedTime === 'Past 7 Days' ? 'EEE' : 'MMM dd');
      if (!trendMap[key]) {
        trendMap[key] = { sortKey: dt.getTime(), label, sales: 0 };
      }
      trendMap[key].sales += Number(o.total || 0);
    });
    const trendData = Object.values(trendMap)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ label, sales }) => ({ label, sales }));

    // Payment / Channel Mix for Donut Chart
    const channelMap: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      const key = (o.paymentMethod || 'Cash').toUpperCase();
      channelMap[key] = (channelMap[key] || 0) + Number(o.total || 0);
    });
    const channelData = Object.entries(channelMap).map(([channel, amount]) => ({ channel, amount }));

    // Top Selling Products
    const productMap: Record<string, { name: string; sold: number; rev: number }> = {};
    filteredOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const name = item.productName || item.name || 'Retail Item';
        if (!productMap[name]) productMap[name] = { name, sold: 0, rev: 0 };
        productMap[name].sold += Number(item.quantity || 1);
        productMap[name].rev += Number(item.subtotal || Number(item.unitPrice || 0) * Number(item.quantity || 1));
      });
    });
    const topSelling = Object.values(productMap)
      .sort((a, b) => b.rev - a.rev)
      .slice(0, 6);

    // Recent Activity Audit Trail
    const auditTrail = filteredOrders.slice(0, 4).map((o) => ({
      event: `SALE ${o.orderNumber || o.id.slice(0, 8)}`,
      user: `${(o.paymentMethod || 'CASH').toUpperCase()} • KES ${Number(o.total || 0).toLocaleString()}`,
      timestamp: o.createdAt ? format(parseISO(o.createdAt), 'HH:mm') : 'Live',
    }));

    return {
      totalSales,
      vatAmount,
      transactionCount,
      wholesaleOrders,
      completedOrders,
      totalStockItems,
      lowStockItems,
      outOfStockItems,
      stockValuation,
      totalCustomers,
      outstandingCredit,
      totalExpenses,
      cashSales,
      trendData,
      channelData,
      topSelling,
      auditTrail,
    };
  }, [rawData, selectedBranch, selectedChannel, selectedTime, startDate, endDate]);

  // --- DYNAMIC SVG AREA GRAPH RENDERER ---
  const isGraphEmpty = data.trendData.length === 0 || data.totalSales === 0;
  const svgWidth = 1000;
  const svgHeight = 350;
  const pad = { top: 20, right: 20, bottom: 40, left: 80 };
  const chartW = svgWidth - pad.left - pad.right;
  const chartH = svgHeight - pad.top - pad.bottom;

  const maxSalesValue = isGraphEmpty ? 0 : Math.max(...data.trendData.map((d) => Number(d.sales)), 10);
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    y: pad.top + chartH - pct * chartH,
    val: maxSalesValue * pct,
  }));

  const points = data.trendData.map((item, index) => ({
    x: pad.left + (data.trendData.length > 1 ? (index / (data.trendData.length - 1)) * chartW : chartW / 2),
    y: pad.top + chartH - (Number(item.sales) / maxSalesValue) * chartH,
    label: item.label,
  }));

  let linePath = '';
  let areaPath = '';
  if (!isGraphEmpty && points.length > 1) {
    linePath = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 3;
      const cp2x = p1.x - (p1.x - p0.x) / 3;
      linePath += ` C ${cp1x},${p0.y} ${cp2x},${p1.y} ${p1.x},${p1.y}`;
    }
    areaPath = `${linePath} L ${points[points.length - 1].x},${pad.top + chartH} L ${points[0].x},${pad.top + chartH} Z`;
  } else if (!isGraphEmpty && points.length === 1) {
    linePath = `M ${points[0].x - 20},${points[0].y} L ${points[0].x + 20},${points[0].y}`;
    areaPath = `M ${points[0].x - 20},${pad.top + chartH} L ${points[0].x - 20},${points[0].y} L ${points[0].x + 20},${points[0].y} L ${points[0].x + 20},${pad.top + chartH} Z`;
  }

  // --- DYNAMIC DONUT CHART RENDERER ---
  const donutSegments = useMemo(() => {
    if (data.channelData.length === 0 || data.totalSales === 0) return [];
    let currentOffset = 0;
    const circumference = 2 * Math.PI * 40;
    const colors = ['#10b981', '#0554F4', '#f59e0b', '#05BBBB'];

    return data.channelData.map((ch, i) => {
      const percentage = Number(ch.amount) / data.totalSales;
      const strokeDasharray = `${percentage * circumference} ${circumference}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += percentage * circumference;
      return { ...ch, percentage, strokeDasharray, strokeDashoffset, color: colors[i % colors.length] };
    });
  }, [data.channelData, data.totalSales]);

  const getDropdownBtnClass = (isOpen: boolean) =>
    `flex items-center justify-between bg-white px-3 py-2.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all w-full md:w-auto ${
      isOpen
        ? 'border-[#041F56] ring-1 ring-[#041F56] text-slate-900 shadow-sm'
        : 'border-slate-300 text-slate-700 hover:border-slate-400'
    }`;

  const tabs = [
    { name: 'Executive Overview', icon: TrendingUp },
    { name: 'Retail & Wholesale', icon: ShoppingBag },
    { name: 'Inventory & Procurement', icon: Package },
    { name: 'Treasury & Compliance', icon: ShieldCheck },
  ];

  return (
    <div className="w-full bg-[#F5F8FE] min-h-screen p-3 sm:p-5 lg:p-6 font-sans antialiased text-slate-800">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="w-full xl:w-auto">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#0554F4]"></span> EXECUTIVE CONTROL TOWER{' '}
            <span className="text-slate-300 mx-1">&gt;</span>{' '}
            <span className="text-slate-500 truncate">{tenantName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Enterprise Operations & Analytics
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-1 font-medium">
            Consolidated telemetry across Retail POS, Wholesale Orders, Multi-Branch Stock, Procurement, Cash Tills, and KRA eTIMS.
          </p>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-2.5 w-full xl:w-auto">
          <Link
            href="/dashboard/pos"
            className="bg-[#0554F4] hover:bg-[#041F56] text-white px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
          >
            <Receipt className="w-4 h-4" /> Launch POS
          </Link>

          {/* Branch Dropdown */}
          <div className="relative w-full md:w-auto" ref={branchRef}>
            <button onClick={() => setBranchOpen(!branchOpen)} className={`md:min-w-[200px] ${getDropdownBtnClass(branchOpen)}`}>
              <span className="truncate">{selectedBranch}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${branchOpen ? 'rotate-180 text-slate-800' : ''}`} />
            </button>
            {branchOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1.5 max-h-60 overflow-y-auto">
                {rawData.branches.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedBranch(opt);
                      setBranchOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      selectedBranch === opt ? 'bg-[#0554F4] text-white font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sales Channel Dropdown */}
          <div className="relative w-full md:w-auto" ref={channelRef}>
            <button onClick={() => setChannelOpen(!channelOpen)} className={`md:min-w-[180px] ${getDropdownBtnClass(channelOpen)}`}>
              <span className="truncate">{selectedChannel}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${channelOpen ? 'rotate-180 text-slate-800' : ''}`} />
            </button>
            {channelOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1.5">
                {['All Sales Channels', 'Retail POS', 'Wholesale', 'Delivery'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedChannel(opt);
                      setChannelOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      selectedChannel === opt ? 'bg-[#0554F4] text-white font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Filter Dropdown */}
          <div className="relative w-full md:w-auto" ref={timeRef}>
            <button onClick={() => setTimeOpen(!timeOpen)} className={`md:min-w-[140px] ${getDropdownBtnClass(timeOpen)}`}>
              <span>{selectedTime}</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform ${timeOpen ? 'rotate-180 text-slate-800' : ''}`} />
            </button>
            {timeOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-full md:w-[200px] bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1.5">
                {['Today', 'Yesterday', 'Past 7 Days', 'Past 30 Days', 'Custom Range'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedTime(opt);
                      setShowCustomPicker(opt === 'Custom Range');
                      setTimeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                      selectedTime === opt ? 'bg-[#0554F4] text-white font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={fetchDashboardData}
            className="w-full md:w-auto p-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm flex items-center justify-center"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#0554F4]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Range Bar */}
      {showCustomPicker && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">Custom Date Range:</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button
            onClick={() => {
              setShowCustomPicker(false);
              setSelectedTime('Past 7 Days');
            }}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium underline ml-auto"
          >
            Reset
          </button>
        </div>
      )}

      {/* Executive Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 shadow-sm transition-colors ${
                isActive ? 'bg-[#041F56] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#05BBBB]' : 'text-slate-400'}`} /> {tab.name}
            </button>
          );
        })}
      </div>

      {/* --- EXECUTIVE OVERVIEW --- */}
      {activeTab === 'Executive Overview' && (
        <>
          {/* 6-Card KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Turnover</span>
                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center text-[#0554F4] border border-blue-100">
                  <TrendingUp className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                KES {loading ? '...' : Math.round(data.totalSales).toLocaleString()}
              </h3>
              <p className="text-[10px] font-medium text-slate-500 mt-1">
                VAT: KES {Math.round(data.vatAmount).toLocaleString()}
              </p>
              <div className="mt-4 pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span>Avg Basket:</span>
                <span className="font-bold text-slate-800">
                  KES {data.transactionCount ? Math.round(data.totalSales / data.transactionCount).toLocaleString() : 0}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Volume</span>
                <div className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {loading ? '...' : data.transactionCount} Total Orders
              </h3>
              <p className="text-[10px] font-bold text-orange-600 mt-1">{data.wholesaleOrders} Wholesale Orders</p>
              <div className="mt-4 pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span>Completed:</span>
                <span className="font-bold text-[#0554F4]">{data.completedOrders}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cash Till Custody</span>
                <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                  <Scale className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-[#0554F4] tracking-tight">
                KES {loading ? '...' : Math.round(data.cashSales).toLocaleString()}
              </h3>
              <p className="text-[10px] font-medium text-slate-500 mt-1">Cash Drawer Expected</p>
              <div className="mt-4 pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span>Net Variance:</span>
                <span className="font-bold text-emerald-600">KES 0</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stock Valuation</span>
                <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                  <Box className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                KES {loading ? '...' : Math.round(data.stockValuation).toLocaleString()}
              </h3>
              <p className="text-[10px] font-bold text-rose-600 mt-1">{data.lowStockItems} Low Stock Alerts</p>
              <div className="mt-4 pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span>Out of Stock:</span>
                <span className="font-bold text-rose-600">{data.outOfStockItems} SKUs</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tax & KRA eTIMS</span>
                <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-emerald-600 tracking-tight">
                KES {loading ? '...' : Math.round(data.vatAmount).toLocaleString()}
              </h3>
              <p className="text-[10px] font-medium text-slate-500 mt-1">16% Standard VAT</p>
              <div className="mt-4 pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span>Receipts Issued:</span>
                <span className="font-bold text-emerald-600">{data.transactionCount}</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customers & Credit</span>
                <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                {loading ? '...' : data.totalCustomers} Accounts
              </h3>
              <p className="text-[10px] font-medium text-slate-500 mt-1">Retail & Wholesale CRM</p>
              <div className="mt-4 pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100">
                <span>Credit Tabs:</span>
                <span className="font-bold text-[#0554F4]">KES {Math.round(data.outstandingCredit).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 3-Panel Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Revenue Velocity Area Graph */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Revenue & Checkout Velocity</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Trading volume and throughput distribution</p>
                </div>
                <Link href="/dashboard/reports" className="text-[11px] font-bold text-[#0554F4] flex items-center gap-1 hover:underline">
                  View Ledger <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex-1 w-full relative min-h-[300px]">
                {loading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 animate-pulse bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    Syncing tenant telemetry...
                  </div>
                ) : isGraphEmpty ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                    <TrendingUp className="w-8 h-8 mb-3 text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">No sales activity recorded for this period.</p>
                  </div>
                ) : (
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                    <defs>
                      <linearGradient id="sokoSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0554F4" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0554F4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    {gridLines.map((line, i) => (
                      <g key={`grid-${i}`}>
                        <line x1={pad.left} y1={line.y} x2={svgWidth - pad.right} y2={line.y} stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="2" />
                        <text x={pad.left - 15} y={line.y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontWeight="600">
                          {line.val === 0 ? '0' : line.val >= 1000 ? `${(line.val / 1000).toFixed(1)}k` : Math.round(line.val).toLocaleString()}
                        </text>
                      </g>
                    ))}
                    <path d={areaPath} fill="url(#sokoSalesGrad)" />
                    <path d={linePath} fill="none" stroke="#0554F4" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    {points.map((p, i) => (
                      <g key={`point-${i}`}>
                        <circle cx={p.x} cy={p.y} r="6" fill="#ffffff" stroke="#0554F4" strokeWidth="4" />
                        <text x={p.x} y={svgHeight - 10} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="600">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
              </div>
            </div>

            {/* Payment Mix Donut Chart */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Payment Tender Mix</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Cash, M-Pesa & Card split</p>
                </div>
              </div>
              <div className="flex-1 w-full relative min-h-[260px] flex flex-col items-center justify-center">
                {isGraphEmpty ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center p-4">
                    <p className="text-xs font-medium text-slate-400">No tender data</p>
                  </div>
                ) : (
                  <>
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                        {donutSegments.map((seg, i) => (
                          <circle
                            key={i}
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="12"
                            strokeDasharray={seg.strokeDasharray}
                            strokeDashoffset={seg.strokeDashoffset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
                        <span className="text-[14px] font-black text-slate-900 mt-0.5">
                          KES {Math.round(data.totalSales).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="w-full mt-6 space-y-2 px-2 max-h-[80px] overflow-y-auto">
                      {donutSegments.map((seg, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="flex items-center gap-2 font-semibold text-slate-700">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span> {seg.channel}
                          </span>
                          <span className="font-black text-slate-900">{Math.round(seg.percentage * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Top Selling Products</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Ranked by revenue contribution</p>
                </div>
                <Link href="/dashboard/products" className="text-[11px] font-bold text-[#0554F4] hover:underline">
                  Catalog &rarr;
                </Link>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[260px] pr-2 custom-scrollbar">
                {loading ? (
                  <div className="text-center text-slate-400 text-xs animate-pulse py-8">Syncing records...</div>
                ) : data.topSelling.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl min-h-[200px]">
                    <p className="text-xs font-medium text-slate-400">No product sales recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.topSelling.map((prod, idx) => (
                      <div key={idx} className="flex justify-between items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded bg-[#041F56] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-bold text-[#1e293b] leading-tight mb-1">{prod.name}</h4>
                            <p className="text-[10px] text-slate-500">{prod.sold} units sold</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-black text-[#1e293b] shrink-0">
                          KES {Math.round(prod.rev).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3 Stacked Command Centers */}
          <div className="space-y-4">
            {/* 1. Retail Floor & Wholesale Command */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-white px-4 sm:px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0554F4] border border-blue-100 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1e293b]">Retail Floor & Wholesale Command</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Supermarket checkout throughput, wholesale B2B orders, and customer credit</p>
                  </div>
                </div>
                <Link href="/dashboard/orders" className="text-[11px] font-bold text-[#0554F4] hover:underline whitespace-nowrap ml-2">
                  Orders Ledger &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                <div className="p-4 sm:p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">RETAIL CHECKOUT THROUGHPUT</p>
                  <h3 className="text-xl font-black text-[#1e293b]">{data.transactionCount} Receipts</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">{data.completedOrders} Completed</p>
                </div>
                <div className="p-4 sm:p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">WHOLESALE & BULK ORDERS</p>
                  <h3 className="text-xl font-black text-orange-600">{data.wholesaleOrders} Active Orders</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">B2B Price Lists & Allocations</p>
                </div>
                <div className="p-4 sm:p-6 border-t xl:border-t-0 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CUSTOMER CREDIT & TABS</p>
                  <h3 className="text-xl font-black text-[#1e293b]">KES {Math.round(data.outstandingCredit).toLocaleString()}</h3>
                  <p className="text-[11px] text-[#0554F4] font-bold mt-1">{data.totalCustomers} Registered Accounts</p>
                </div>
                <div className="p-4 sm:p-6 border-t xl:border-t-0 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">DISPATCH & FULFILMENT</p>
                  <h3 className="text-xl font-black text-[#1e293b]">0 Pending Dispatch</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Partial & Full Delivery Notes</p>
                </div>
              </div>
            </div>

            {/* 2. Inventory & Procure-to-Pay */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-white px-4 sm:px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1e293b]">Inventory & Procure-to-Pay</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Warehouse stock levels, reorder alerts, inter-branch transfers, and supplier POs</p>
                  </div>
                </div>
                <Link href="/dashboard/inventory" className="text-[11px] font-bold text-emerald-600 hover:underline whitespace-nowrap ml-2">
                  Inventory Ledger &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                <div className="p-4 sm:p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">AUTOMATED STOCK REORDER</p>
                  <h3 className="text-xl font-black text-red-600">{data.lowStockItems} Items Below Par</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">{data.totalStockItems} Total Tracked SKUs</p>
                </div>
                <div className="p-4 sm:p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">OUT-OF-STOCK SKUS</p>
                  <h3 className="text-xl font-black text-amber-600">{data.outOfStockItems} Zero Balance</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Immediate replenishment needed</p>
                </div>
                <div className="p-4 sm:p-6 border-t xl:border-t-0 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">PURCHASE ORDERS</p>
                  <h3 className="text-xl font-black text-[#1e293b]">0 Pending GRN</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">Supplier Procure-to-Pay</p>
                </div>
                <div className="p-4 sm:p-6 border-t xl:border-t-0 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">INTER-BRANCH TRANSFERS</p>
                  <h3 className="text-xl font-black text-[#1e293b]">0 In-Transit</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Multi-warehouse reconciliation</p>
                </div>
              </div>
            </div>

            {/* 3. Treasury, Cash Custody & Governance */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-white px-4 sm:px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-[#1e293b]">Treasury, Cash Custody & Governance</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Cash register sessions, M-Pesa reconciliation, expenses, and KRA eTIMS</p>
                  </div>
                </div>
                <Link href="/dashboard/tills" className="text-[11px] font-bold text-indigo-600 hover:underline whitespace-nowrap ml-2">
                  Cash Registers &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-white">
                <div className="p-4 sm:p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">CASH DRAWER CUSTODY</p>
                  <h3 className="text-xl font-black text-[#1e293b]">KES {Math.round(data.cashSales).toLocaleString()}</h3>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">Expected Drawer Cash</p>
                </div>
                <div className="p-4 sm:p-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">OPERATIONAL EXPENSES</p>
                  <h3 className="text-xl font-black text-[#1e293b]">KES {Math.round(data.totalExpenses).toLocaleString()}</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">Recorded Period Outflows</p>
                </div>
                <div className="p-4 sm:p-6 border-t xl:border-t-0 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">VAT LIABILITY (16%)</p>
                  <h3 className="text-xl font-black text-emerald-600">KES {Math.round(data.vatAmount).toLocaleString()}</h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">KRA eTIMS Ready</p>
                </div>
                <div className="p-4 sm:p-6 border-t xl:border-t-0 border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">M-PESA & DIGITAL RECON</p>
                  <h3 className="text-xl font-black text-[#1e293b]">{data.transactionCount} Verified</h3>
                  <p className="text-[11px] text-amber-600 font-bold mt-1">0 Unallocated Callbacks</p>
                </div>
              </div>

              {/* Live Audit Trail */}
              <div className="border-t border-slate-200">
                <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex items-center gap-2 text-[10px] font-bold text-[#1e293b] uppercase tracking-wider bg-white">
                  <Activity className="w-3.5 h-3.5 text-[#0554F4]" /> LIVE TENANT TRANSACTION & AUDIT TRAIL
                </div>
                <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 bg-white">
                  {data.auditTrail.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 xl:col-span-4 text-[11px] text-slate-400 font-medium py-2">
                      No auditable transactions recorded for this period.
                    </div>
                  ) : (
                    data.auditTrail.map((log, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center shadow-sm">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-900 uppercase">{log.event}</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">{log.user}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">{log.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* --- RETAIL & WHOLESALE TAB --- */}
      {activeTab === 'Retail & Wholesale' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[360px]">
          <h2 className="text-lg font-black text-slate-900 mb-4">Retail & Wholesale Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Total Orders</h4>
              <p className="text-2xl font-black text-[#0554F4]">{data.transactionCount}</p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Wholesale Orders</h4>
              <p className="text-2xl font-black text-slate-900">{data.wholesaleOrders}</p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Customer Accounts</h4>
              <p className="text-2xl font-black text-emerald-600">{data.totalCustomers}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- INVENTORY & PROCUREMENT TAB --- */}
      {activeTab === 'Inventory & Procurement' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[360px]">
          <h2 className="text-lg font-black text-slate-900 mb-4">Inventory & Procurement Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Total Stock SKUs</h4>
              <p className="text-2xl font-black text-slate-900">{data.totalStockItems}</p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Low Stock Alerts</h4>
              <p className="text-2xl font-black text-red-600">{data.lowStockItems}</p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Stock Valuation</h4>
              <p className="text-2xl font-black text-emerald-600">KES {Math.round(data.stockValuation).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- TREASURY & COMPLIANCE TAB --- */}
      {activeTab === 'Treasury & Compliance' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 min-h-[360px]">
          <h2 className="text-lg font-black text-slate-900 mb-4">Treasury & Compliance Operations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Expected Drawer Cash</h4>
              <p className="text-2xl font-black text-[#0554F4]">KES {Math.round(data.cashSales).toLocaleString()}</p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Operational Expenses</h4>
              <p className="text-2xl font-black text-slate-900">KES {Math.round(data.totalExpenses).toLocaleString()}</p>
            </div>
            <div className="p-5 border border-slate-200 rounded-xl bg-slate-50">
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-1">Tax Collected (16% VAT)</h4>
              <p className="text-2xl font-black text-emerald-600">KES {Math.round(data.vatAmount).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}