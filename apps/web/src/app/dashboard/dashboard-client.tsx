'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  CircleDollarSign, ReceiptText, Package, AlertTriangle, 
  Zap, Plus, Boxes, CreditCard, RefreshCw, ChevronDown, Wrench, Box
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import api from '../../lib/api';

export default function DashboardClient() {
  const [rawData, setRawData] = useState({
    orders: [],
    expenses: [],
    products: [],
    customers: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('7d'); // '7d', '30d', '12m'
  const [tenantName, setTenantName] = useState('Enterprise Retail');

  const fetchDashboardData = async () => {
    setIsRefreshing(true);
    try {
      const [ordersRes, expensesRes, productsRes, customersRes] = await Promise.all([
        api.get('/orders').catch(() => ({ data: { data: [] } })),
        api.get('/expenses').catch(() => ({ data: { data: [] } })),
        api.get('/products').catch(() => ({ data: { data: [] } })),
        api.get('/customers').catch(() => ({ data: { data: [] } })),
      ]);

      setRawData({
        orders: ordersRes.data?.data || [],
        expenses: expensesRes.data?.data || [],
        products: productsRes.data?.data || [],
        customers: customersRes.data?.data || []
      });
    } catch (error) {
      console.error('Failed to load dashboard metrics', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { 
        const parsed = JSON.parse(userStr);
        setTenantName(parsed.businessName || parsed.tenantName || 'Enterprise Retail');
      } catch (e) {}
    }
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!isLoading) fetchDashboardData();
  }, [timeframe]);

  const metrics = useMemo(() => {
    const now = new Date();
    const cutoffDate = 
      timeframe === '7d' ? subDays(now, 7) :
      timeframe === '30d' ? subDays(now, 30) :
      subDays(now, 365); // 12m

    const validOrders = rawData.orders.filter((o: any) => 
      o.createdAt ? isAfter(parseISO(o.createdAt), cutoffDate) : true
    );

    const totalSales = validOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0);
    const taxAmount = totalSales * 0.16; // Standard 16% VAT approximation
    
    // Group Data for Bar Chart
    const chartDataMap: Record<string, { date: string, label: string, sales: number, transactions: number }> = {};
    
    validOrders.forEach((order: any) => {
      if (!order.createdAt) return;
      const dateObj = parseISO(order.createdAt);
      const dateKey = format(dateObj, 'yyyy-MM-dd');
      const label = format(dateObj, timeframe === '7d' ? 'EEE' : 'MMM dd');
      
      if (!chartDataMap[dateKey]) {
        chartDataMap[dateKey] = { date: dateKey, label, sales: 0, transactions: 0 };
      }
      chartDataMap[dateKey].sales += parseFloat(order.total || 0);
      chartDataMap[dateKey].transactions += 1;
    });

    const chartData = Object.values(chartDataMap).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const lowStockCount = rawData.products.filter((p: any) => p.stock <= (p.lowStockThreshold || 5)).length;

    const recentOrders = [...rawData.orders]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalSales,
      taxAmount,
      transactionCount: validOrders.length,
      activeProducts: rawData.products.length,
      lowStockCount,
      chartData,
      recentOrders
    };
  }, [rawData, timeframe]);

  const formatKES = (value: number) => `KES ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] flex flex-col space-y-5 pb-12 font-sans text-slate-800">
      
      {/* Enterprise Header matched to the exact design */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-700"></span> EXECUTIVE CONTROL TOWER <span className="text-slate-400 mx-1">&gt;</span> <span className="text-slate-600 truncate">{tenantName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Enterprise Operations & Analytics</h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-medium leading-relaxed">
            Consolidated telemetry across Point of Sale, Inventory Management, Procurement, and Tax Compliance.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          <Link href="/dashboard/pos" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5">
            <ReceiptText className="w-4 h-4" /> Launch POS
          </Link>
          
          <div className="hidden sm:flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer hover:bg-slate-50">
            All Branch Locations <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </div>
          
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)} 
            className="bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-50"
          >
            <option value="7d">Today / 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="12m">This Year</option>
          </select>
          
          <button 
            onClick={fetchDashboardData} 
            disabled={isRefreshing}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI GRID - 5 Column enterprise layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Gross Turnover */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gross Turnover</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <CircleDollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg lg:text-xl xl:text-2xl font-black text-slate-900 tracking-tight">
            {isLoading ? '...' : formatKES(metrics.totalSales)}
          </h3>
          <div className="mt-auto pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100/80">
            <span>Avg Ticket:</span>
            <span className="font-bold text-slate-800">
              {metrics.transactionCount ? formatKES(Math.round(metrics.totalSales / metrics.transactionCount)) : 'KES 0'}
            </span>
          </div>
        </div>

        {/* Tax & Levies */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Tax & Levies (16%)</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ReceiptText className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg lg:text-xl xl:text-2xl font-black text-emerald-600 tracking-tight">
            {isLoading ? '...' : formatKES(metrics.taxAmount)}
          </h3>
          <div className="mt-auto pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100/80">
            <span>eTIMS Signed:</span>
            <span className="font-bold text-emerald-600">{metrics.transactionCount} Receipts</span>
          </div>
        </div>

        {/* Order Volume */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Order Volume</span>
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg lg:text-xl xl:text-2xl font-black text-slate-900 tracking-tight">
            {isLoading ? '...' : metrics.transactionCount.toLocaleString()} Total
          </h3>
          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">Completed Status</p>
          <div className="mt-auto pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100/80">
            <span>POS Source:</span>
            <span className="font-bold text-slate-800">100%</span>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Catalog</span>
            <div className="w-7 h-7 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg lg:text-xl xl:text-2xl font-black text-slate-900 tracking-tight">
            {isLoading ? '...' : metrics.activeProducts.toLocaleString()} SKUs
          </h3>
          <p className={`text-[10px] font-bold mt-0.5 ${metrics.lowStockCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            {metrics.lowStockCount} Low Stock Warnings
          </p>
          <div className="mt-auto pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100/80">
            <span>Threshold Action:</span>
            <Link href="/dashboard/inventory/reorder" className="font-bold text-blue-600 hover:underline">Reorder →</Link>
          </div>
        </div>

        {/* Accounts Payable */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Accounts Payable</span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-lg lg:text-xl xl:text-2xl font-black text-slate-900 tracking-tight">KES 0</h3>
          <p className="text-[10px] font-medium text-slate-500 mt-0.5">0 Unpaid Vendor Bills</p>
          <div className="mt-auto pt-3 flex justify-between items-center text-[11px] font-medium text-slate-500 border-t border-slate-100/80">
            <span>Open POs:</span>
            <span className="font-bold text-slate-800">0</span>
          </div>
        </div>

      </div>

      {/* Main Charts & Action Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        
        {/* Chart Section */}
        <div className="lg:col-span-8 rounded-3xl bg-white shadow-sm border border-slate-200 p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Performance Trend ({timeframe.toUpperCase()})
              </h3>
              <p className="text-sm text-slate-500 mt-1">Visual breakdown of gross sales revenue and order volume.</p>
            </div>
            <div className="hidden sm:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                <span className="text-sm font-bold text-slate-700">Sales (KES)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3b82f6]"></div>
                <span className="text-sm font-bold text-slate-700">Transactions</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-[300px]">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center text-sm font-bold text-slate-400">Loading Telemetry...</div>
            ) : metrics.chartData.length === 0 ? (
              <div className="w-full h-full bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-sm font-bold text-slate-400 border border-dashed border-slate-200">
                <AlertTriangle className="w-8 h-8 mb-2 opacity-30" />
                No data available for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} 
                    dy={15} 
                  />
                  <YAxis yAxisId="left" orientation="left" hide={true} />
                  <YAxis yAxisId="right" orientation="right" hide={true} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                    labelStyle={{ fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}
                  />
                  <Bar yAxisId="left" name="Sales (KES)" dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  <Bar yAxisId="right" name="Transactions" dataKey="transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="lg:col-span-4 rounded-3xl bg-white shadow-sm border border-slate-200 p-6 flex flex-col">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <Link href="/dashboard/pos" className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-50/80 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <Zap className="h-8 w-8 text-orange-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-extrabold text-slate-900 text-center">Open Terminal</span>
            </Link>
            <Link href="/dashboard/products" className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-50/80 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <Plus className="h-8 w-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-extrabold text-slate-900 text-center">Add Product</span>
            </Link>
            <Link href="/dashboard/inventory" className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-50/80 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <Boxes className="h-8 w-8 text-amber-500 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-extrabold text-slate-900 text-center">Manage Stock</span>
            </Link>
            <Link href="/dashboard/sales" className="flex flex-col items-center justify-center p-6 bg-slate-50 hover:bg-blue-50/80 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <CreditCard className="h-8 w-8 text-cyan-600 mb-3 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-sm font-extrabold text-slate-900 text-center">View Ledger</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Control Centers - Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
        
        {/* FOH Command */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><Wrench className="w-4 h-4" /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Front-of-House Command</h2>
                <p className="text-[10px] text-slate-500">Live floor throughput and order tracking</p>
              </div>
            </div>
            <Link href="/dashboard/sales" className="text-[11px] sm:text-xs font-bold text-blue-700 hover:underline">Receipts &rarr;</Link>
          </div>
          <div className="grid grid-cols-2 divide-y md:divide-y-0 divide-x divide-slate-100">
            <div className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Checkout Terminals</p>
              <h3 className="text-base font-black text-slate-900">1 Active Terminal</h3>
              <p className="text-xs text-emerald-600 font-bold mt-1">Ready for checkout</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Walk-in Queue</p>
              <h3 className="text-base font-black text-blue-700">{metrics.transactionCount} Customers Served</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Today's Throughput</p>
            </div>
          </div>
        </div>

        {/* Materials Command */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Box className="w-4 h-4" /></div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Materials Management</h2>
                <p className="text-[10px] text-slate-500">Inventory levels, reorders, and inter-branch tracking</p>
              </div>
            </div>
            <Link href="/dashboard/inventory" className="text-[11px] sm:text-xs font-bold text-emerald-700 hover:underline">Ledger &rarr;</Link>
          </div>
          <div className="grid grid-cols-2 divide-y md:divide-y-0 divide-x divide-slate-100">
            <div className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Automated Stock Reorder</p>
              <h3 className={`text-base font-black ${metrics.lowStockCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{metrics.lowStockCount} Items Below Par</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">{metrics.activeProducts} Total Tracked SKUs</p>
            </div>
            <div className="p-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Purchase Requisitions</p>
              <h3 className="text-base font-black text-slate-900">0 Pending Approvals</h3>
              <p className="text-xs text-emerald-600 font-bold mt-1">0 Open Committed POs</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}