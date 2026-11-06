'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Users, Package, TrendingUp, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Receipt, Calendar, Activity, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend
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
  const [timeframe, setTimeframe] = useState('30d'); // '7d', '30d', '90d', 'all'

  // 1. Fetch Real Data
  useEffect(() => {
    const fetchDashboardData = async () => {
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
      }
    };

    fetchDashboardData();
  }, []);

  // 2. Dynamically Filter and Calculate Metrics Based on Timeframe
  const metrics = useMemo(() => {
    const now = new Date();
    const cutoffDate = 
      timeframe === '7d' ? subDays(now, 7) :
      timeframe === '30d' ? subDays(now, 30) :
      timeframe === '90d' ? subDays(now, 90) : 
      new Date(0); // 'all'

    // Filter data by timeframe
    const validOrders = rawData.orders.filter((o: any) => 
      o.createdAt ? isAfter(parseISO(o.createdAt), cutoffDate) : true
    );
    const validExpenses = rawData.expenses.filter((e: any) => 
      e.createdAt ? isAfter(parseISO(e.createdAt), cutoffDate) : true
    );

    // Calculate Totals
    const totalSales = validOrders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0);
    const totalExpenses = validExpenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0);
    const netProfit = totalSales - totalExpenses;
    
    // Group Data for Charts (Daily Aggregation)
    const chartDataMap: Record<string, { date: string, sales: number, expenses: number }> = {};
    
    validOrders.forEach((order: any) => {
      if (!order.createdAt) return;
      const dateStr = format(parseISO(order.createdAt), 'MMM dd');
      if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { date: dateStr, sales: 0, expenses: 0 };
      chartDataMap[dateStr].sales += parseFloat(order.total || 0);
    });

    validExpenses.forEach((exp: any) => {
      if (!exp.createdAt) return;
      const dateStr = format(parseISO(exp.createdAt), 'MMM dd');
      if (!chartDataMap[dateStr]) chartDataMap[dateStr] = { date: dateStr, sales: 0, expenses: 0 };
      chartDataMap[dateStr].expenses += parseFloat(exp.amount || 0);
    });

    // Convert map to sorted array
    const chartData = Object.values(chartDataMap).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      totalSales,
      totalExpenses,
      netProfit,
      transactionCount: validOrders.length,
      activeProducts: rawData.products.length, // Global metric
      totalCustomers: rawData.customers.length, // Global metric
      chartData,
      isProfitable: netProfit >= 0
    };
  }, [rawData, timeframe]);

  // Format currency helper
  const formatKES = (value: number) => `KES ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="w-full min-h-full flex flex-col space-y-6 sm:space-y-8 pb-8 px-4 sm:px-6 lg:px-8 pt-6">
      
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Business Intelligence
          </h2>
          <p className="text-sm sm:text-base text-slate-500 max-w-3xl">
            Live analytics and financial performance metrics.
          </p>
        </div>
        
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm shrink-0">
          <Calendar className="h-4 w-4 text-slate-400 ml-2 mr-1" />
          <select 
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="bg-transparent border-none text-sm font-semibold text-slate-700 py-1.5 pr-8 pl-2 focus:ring-0 cursor-pointer outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* Gross Sales KPI */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md flex flex-col justify-between h-36">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-slate-500">Gross Sales</p>
            </div>
          </div>
          <p className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
            {isLoading ? '...' : formatKES(metrics.totalSales)}
          </p>
        </div>

        {/* Expenses KPI */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md flex flex-col justify-between h-36">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-red-50 rounded-xl text-red-600 shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-500">Total Expenses</p>
          </div>
          <p className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
            {isLoading ? '...' : formatKES(metrics.totalExpenses)}
          </p>
        </div>

        {/* Net Profit KPI */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md flex flex-col justify-between h-36 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-2 relative z-10">
            <div className={`p-2.5 rounded-xl shrink-0 ${metrics.isProfitable ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-500">Net Profit</p>
          </div>
          <div className="flex items-center gap-3 relative z-10">
            <p className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : formatKES(Math.abs(metrics.netProfit))}
            </p>
            {!isLoading && (
              <span className="shrink-0">
                {metrics.isProfitable 
                  ? <ArrowUpRight className="h-6 w-6 text-green-500 stroke-[3]" />
                  : <ArrowDownRight className="h-6 w-6 text-red-500 stroke-[3]" />
                }
              </span>
            )}
          </div>
        </div>

        {/* Transactions / Volume KPI */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-md flex flex-col justify-between h-36">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-slate-500">Transactions</p>
          </div>
          <p className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">
            {isLoading ? '...' : metrics.transactionCount.toLocaleString()} <span className="text-sm font-semibold text-slate-400">orders</span>
          </p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Revenue & Expense Trend</h3>
          </div>
          
          <div className="h-80 w-full">
            {isLoading ? (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-xl" />
            ) : metrics.chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                <p>No transaction data available for this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }} 
                    tickFormatter={(value: any) => `K ${(Number(value) / 1000).toFixed(0)}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [formatKES(Number(value)), '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name="Gross Sales" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpenses)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Financial Breakdown & Secondary Metrics */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 p-5 sm:p-6 flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Database Insights</h3>
          
          <div className="flex-1 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500">
                    <Package className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-slate-700">Inventory Items</span>
                </div>
                <span className="font-black text-slate-900">{isLoading ? '-' : metrics.activeProducts}</span>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500">
                    <Users className="h-5 w-5" />
                  </div>
                  <span className="font-semibold text-slate-700">Registered Clients</span>
                </div>
                <span className="font-black text-slate-900">{isLoading ? '-' : metrics.totalCustomers}</span>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Management</h4>
              <div className="grid grid-cols-2 gap-2">
                <a href="/dashboard/pos" className="text-center py-2 px-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                  Open POS
                </a>
                <a href="/dashboard/reports" className="text-center py-2 px-3 bg-slate-50 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">
                  Full Reports
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}