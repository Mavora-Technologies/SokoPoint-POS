'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Package, ArrowUpRight, Loader2, PieChart } from 'lucide-react';
import api from '../../../lib/api';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalExpenses: number;
  netProfit: number;
  lowStockCount: number;
  recentOrders: Array<{ id: string; orderNum: string; customer: string; total: number; method: string; createdAt: string }>;
  categoryDistribution: Array<{ name: string; count: number }>;
}

export default function AnalyticsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockCount: 0,
    recentOrders: [],
    categoryDistribution: [],
  });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const [productsRes, ordersRes, expensesRes] = await Promise.all([
          api.get('/products'),
          api.get('/orders'),
          api.get('/expenses').catch(() => ({ data: { data: [] } }))
        ]);

        const products = productsRes.data.data || [];
        const orders = ordersRes.data.data || [];
        const expenses = expensesRes.data.data || [];

        const totalRevenue = orders.reduce((acc: number, o: any) => acc + Number(o.total || 0), 0);
        const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        const lowStockCount = products.filter((p: any) => Number(p.stock || 0) <= Number(p.minimumStock || 5)).length;

        const categoryMap: { [key: string]: number } = {};
        products.forEach((p: any) => {
          const cat = p.category || 'Uncategorized';
          categoryMap[cat] = (categoryMap[cat] || 0) + 1;
        });

        setData({
          totalRevenue,
          totalOrders: orders.length,
          totalProducts: products.length,
          totalExpenses,
          netProfit,
          lowStockCount,
          recentOrders: orders.slice(0, 5),
          categoryDistribution: Object.keys(categoryMap).map(name => ({ name, count: categoryMap[name] })),
        });
      } catch (error) {
        console.error('Failed to load real-time analytics', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isMounted) fetchAnalytics();
  }, [isMounted]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Analytics & Reports</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Live operational KPIs, revenue tracking, and inventory distribution from your database.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh] w-full bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8 lg:space-y-10 w-full">
            
            {/* Fluid KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full">
              
              {/* Revenue Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Total Revenue</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  KES {data.totalRevenue.toLocaleString()}
                </p>
              </div>

              {/* Profit Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-green-50 text-green-600 shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Net Profit</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  KES {data.netProfit.toLocaleString()}
                </p>
              </div>

              {/* Orders Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                    <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Total Orders</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  {data.totalOrders.toLocaleString()}
                </p>
              </div>

              {/* Alerts Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-amber-50 text-amber-600 shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Low Stock Alerts</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  {data.lowStockCount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Graphs & Breakdown Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 w-full">
              
              {/* Category Distribution Chart */}
              <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 p-5 sm:p-6 lg:p-8 flex flex-col w-full h-[400px]">
                <div className="flex items-center gap-3 mb-6 sm:mb-8 border-b border-slate-100 pb-4 shrink-0">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <PieChart className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Inventory by Category</h3>
                </div>
                
                <div className="space-y-5 sm:space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {data.categoryDistribution.length === 0 ? (
                    <p className="text-sm text-slate-500 py-8 text-center italic">No category data available.</p>
                  ) : (
                    data.categoryDistribution.map((cat, idx) => {
                      const maxCount = Math.max(...data.categoryDistribution.map(c => c.count), 1);
                      const percentage = Math.round((cat.count / maxCount) * 100);
                      return (
                        <div key={idx} className="space-y-2 w-full">
                          <div className="flex justify-between items-center text-sm sm:text-base">
                            <span className="font-bold text-slate-700 truncate pr-4">{cat.name}</span>
                            <span className="text-slate-500 font-semibold shrink-0">{cat.count.toLocaleString()} items</span>
                          </div>
                          <div className="h-3 sm:h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out" 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Recent Live Transactions */}
              <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 p-5 sm:p-6 lg:p-8 flex flex-col w-full h-[400px]">
                <div className="flex items-center gap-3 mb-4 sm:mb-6 border-b border-slate-100 pb-4 shrink-0">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <ArrowUpRight className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900">Recent Live Transactions</h3>
                </div>
                
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {data.recentOrders.length === 0 ? (
                    <p className="text-sm text-slate-500 py-8 text-center italic">No recent orders recorded.</p>
                  ) : (
                    data.recentOrders.map(order => (
                      <div key={order.id} className="py-4 sm:py-5 flex items-center justify-between group hover:bg-slate-50/50 rounded-xl px-2 transition-colors -mx-2">
                        <div className="min-w-0 pr-4">
                          <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {order.orderNum} <span className="font-medium text-slate-500 ml-1">({order.customer})</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 sm:mt-1.5">
                            <span className="text-xs sm:text-sm text-slate-400 font-medium">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {order.method}
                            </span>
                          </div>
                        </div>
                        <span className="text-base sm:text-lg lg:text-xl font-black text-slate-900 shrink-0">
                          KES {Number(order.total).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
            </div>
          </div>
        )}
      </div>
    </div>
  );
}