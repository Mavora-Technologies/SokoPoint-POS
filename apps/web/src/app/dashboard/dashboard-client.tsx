'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  CircleDollarSign, ReceiptText, Package, AlertTriangle, 
  Zap, Plus, Boxes, CreditCard, RefreshCw
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, subDays, isAfter, parseISO } from 'date-fns';
import Link from 'next/link';
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
    fetchDashboardData();
  }, []);

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

    // Calculate low stock alerts
    const lowStockCount = rawData.products.filter((p: any) => p.stock <= (p.lowStockThreshold || 5)).length;

    // Get 5 most recent orders for the table
    const recentOrders = [...rawData.orders]
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalSales,
      transactionCount: validOrders.length,
      activeProducts: rawData.products.length,
      lowStockCount,
      chartData,
      recentOrders
    };
  }, [rawData, timeframe]);

  const formatKES = (value: number) => `KES ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] flex flex-col space-y-6 sm:space-y-8 pb-12 px-4 sm:px-6 lg:px-8 pt-6 font-sans">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Executive Overview
          </h2>
          <p className="text-sm text-slate-500">
            Real-time database analytics, sales performance, and active business workflows.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            disabled={isRefreshing}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
            {(['7d', '30d', '12m'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  timeframe === t 
                    ? 'bg-blue-900 text-white shadow-md' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : '12 Months'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* Gross Sales */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Gross Sales</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              {isLoading ? '...' : formatKES(metrics.totalSales)}
            </p>
            <p className="text-xs font-semibold text-emerald-500">Live DB Aggregation</p>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <ReceiptText className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Completed Orders</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              {isLoading ? '...' : metrics.transactionCount.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-blue-500">POS Checkout Records</p>
          </div>
        </div>

        {/* Active Products */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Package className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Active Products</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              {isLoading ? '...' : metrics.activeProducts.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-purple-500">Available in Catalog →</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col justify-between h-40">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 rounded-lg text-orange-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Low Stock Alerts</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 tracking-tight mb-1">
              {isLoading ? '...' : metrics.lowStockCount.toLocaleString()}
            </p>
            <p className="text-xs font-semibold text-red-500">Inventory Threshold Warning →</p>
          </div>
        </div>
      </div>

      {/* PERFORMANCE TREND CHART */}
      <div className="rounded-3xl bg-white shadow-sm border border-slate-100 p-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Performance Trend ({timeframe.toUpperCase()})
            </h3>
            <p className="text-sm text-slate-500 mt-1">Visual breakdown of gross sales revenue and order volume.</p>
          </div>
          <div className="flex items-center gap-6">
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
        
        <div className="h-[350px] w-full">
          {isLoading ? (
            <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="label" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 13, fill: '#64748b', fontWeight: 600 }} 
                  dy={15} 
                />
                {/* Hidden Y-Axes for clean visual look matching the design */}
                <YAxis yAxisId="left" orientation="left" hide={true} />
                <YAxis yAxisId="right" orientation="right" hide={true} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                />
                <Bar yAxisId="left" name="Sales (KES)" dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={60} />
                <Bar yAxisId="right" name="Transactions" dataKey="transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* BOTTOM SECTION: QUICK ACTIONS & RECENT SALES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Quick Actions Grid */}
        <div className="lg:col-span-4 rounded-3xl bg-white shadow-sm border border-slate-100 p-6">
          <h3 className="text-xl font-extrabold text-slate-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/pos" className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-blue-50/50 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <Zap className="h-8 w-8 text-orange-400 mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-extrabold text-slate-900">Open POS</span>
            </Link>
            <Link href="/dashboard/products/new" className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-blue-50/50 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <Plus className="h-8 w-8 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-extrabold text-slate-900">Add Product</span>
            </Link>
            <Link href="/dashboard/inventory" className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-blue-50/50 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <Boxes className="h-8 w-8 text-amber-600 mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-extrabold text-slate-900">Inventory</span>
            </Link>
            <Link href="/dashboard/sales" className="flex flex-col items-center justify-center p-8 bg-slate-50 hover:bg-blue-50/50 rounded-2xl transition-all border border-slate-100 active:scale-[0.98] group">
              <CreditCard className="h-8 w-8 text-cyan-500 mb-4 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-extrabold text-slate-900">Payments</span>
            </Link>
          </div>
        </div>

        {/* Recent POS Sales Table */}
        <div className="lg:col-span-8 rounded-3xl bg-white shadow-sm border border-slate-100 p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-extrabold text-slate-900">Recent POS Sales</h3>
            <Link href="/dashboard/sales" className="text-sm font-bold text-blue-600 hover:text-blue-800">
              View All →
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date & Time</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Receipt #</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Method</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="pb-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                      No recent sales found.
                    </td>
                  </tr>
                ) : (
                  metrics.recentOrders.map((order: any, idx: number) => (
                    <tr key={order.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 text-sm font-bold text-slate-700">
                        {order.createdAt ? format(parseISO(order.createdAt), 'M/d/yy, h:mm:ss a') : 'N/A'}
                      </td>
                      <td className="py-4 text-sm text-slate-500">
                        {order.receiptNumber || '-'}
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                          {order.paymentMethod || 'CARD'}
                        </span>
                      </td>
                      <td className="py-4 text-sm font-black text-slate-900 text-right">
                        {formatKES(parseFloat(order.total || 0))}
                      </td>
                      <td className="py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          ✓ completed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}