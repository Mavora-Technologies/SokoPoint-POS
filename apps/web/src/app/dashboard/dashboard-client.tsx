'use client';

import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Users, 
  Package, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingCart,
  Receipt
} from 'lucide-react';
import api from '../../lib/api';

export default function DashboardClient() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalExpenses: 0,
    activeProducts: 0,
    totalCustomers: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ordersRes, expensesRes, productsRes, customersRes] = await Promise.all([
          api.get('/orders').catch(() => ({ data: { data: [] } })),
          api.get('/expenses').catch(() => ({ data: { data: [] } })),
          api.get('/products').catch(() => ({ data: { data: [] } })),
          api.get('/customers').catch(() => ({ data: { data: [] } })),
        ]);

        const orders = ordersRes.data?.data || [];
        const expenses = expensesRes.data?.data || [];

        const totalSales = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0);
        const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0);

        setStats({
          totalSales,
          totalExpenses,
          activeProducts: productsRes.data?.data?.length || 0,
          totalCustomers: customersRes.data?.data?.length || 0,
        });
      } catch (error) {
        console.error('Failed to load dashboard metrics', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const netProfit = stats.totalSales - stats.totalExpenses;
  const isProfitable = netProfit >= 0;

  return (
    <div className="w-full min-h-full flex flex-col space-y-6 sm:space-y-8 pb-8 px-4 sm:px-6 lg:px-8 pt-6">
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
          Executive Overview
        </h2>
        <p className="text-sm sm:text-base text-gray-500 max-w-3xl">
          Your daily business performance, sales metrics, and net profitability.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* Sales Card */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md hover:ring-blue-600/10 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 sm:p-4 bg-green-50 rounded-xl text-green-600 shrink-0">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Gross Sales</p>
              <p className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-gray-900 break-words leading-tight">
                {isLoading ? '...' : `KES ${stats.totalSales.toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md hover:ring-blue-600/10 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 sm:p-4 bg-red-50 rounded-xl text-red-600 shrink-0">
              <Receipt className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Expenses</p>
              <p className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-gray-900 break-words leading-tight">
                {isLoading ? '...' : `KES ${stats.totalExpenses.toLocaleString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md hover:ring-blue-600/10 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className={`p-3 sm:p-4 rounded-xl shrink-0 ${isProfitable ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Net Profit</p>
              <div className="flex items-center gap-2">
                <p className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-gray-900 break-words leading-tight">
                  {isLoading ? '...' : `KES ${Math.abs(netProfit).toLocaleString()}`}
                </p>
                {!isLoading && (
                  <span className="shrink-0 flex items-center justify-center">
                    {isProfitable 
                      ? <ArrowUpRight className="h-5 w-5 text-green-500 stroke-[3]" />
                      : <ArrowDownRight className="h-5 w-5 text-red-500 stroke-[3]" />
                    }
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Customers Card */}
        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md hover:ring-blue-600/10 flex flex-col justify-center">
          <div className="flex items-center gap-4">
            <div className="p-3 sm:p-4 bg-purple-50 rounded-xl text-purple-600 shrink-0">
              <Users className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">Total Customers</p>
              <p className="text-xl sm:text-2xl lg:text-2xl xl:text-3xl font-bold text-gray-900 break-words leading-tight">
                {isLoading ? '...' : stats.totalCustomers.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 w-full flex-1">
        
        {/* Quick Actions */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-900/5 p-5 sm:p-6 sm:p-8 flex flex-col h-full">
          <h3 className="text-lg font-bold leading-7 text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1">
            <a href="/dashboard/pos" className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-50/50 rounded-xl hover:bg-blue-50 transition-all border border-slate-100 hover:border-blue-200 group active:scale-[0.98]">
              <ShoppingCart className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-3 transition-colors" />
              <span className="text-sm font-bold text-gray-900 group-hover:text-blue-900 text-center transition-colors">Open POS Terminal</span>
            </a>
            <a href="/dashboard/expenses/new" className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-50/50 rounded-xl hover:bg-blue-50 transition-all border border-slate-100 hover:border-blue-200 group active:scale-[0.98]">
              <Receipt className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-3 transition-colors" />
              <span className="text-sm font-bold text-gray-900 group-hover:text-blue-900 text-center transition-colors">Log New Expense</span>
            </a>
            <a href="/dashboard/products" className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-50/50 rounded-xl hover:bg-blue-50 transition-all border border-slate-100 hover:border-blue-200 group active:scale-[0.98]">
              <Package className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-3 transition-colors" />
              <span className="text-sm font-bold text-gray-900 group-hover:text-blue-900 text-center transition-colors">Manage Inventory</span>
            </a>
            <a href="/dashboard/customers/new" className="flex flex-col items-center justify-center p-5 sm:p-6 bg-slate-50/50 rounded-xl hover:bg-blue-50 transition-all border border-slate-100 hover:border-blue-200 group active:scale-[0.98]">
              <Users className="h-7 w-7 sm:h-8 sm:w-8 text-gray-400 group-hover:text-blue-600 mb-3 transition-colors" />
              <span className="text-sm font-bold text-gray-900 group-hover:text-blue-900 text-center transition-colors">Add Customer</span>
            </a>
          </div>
        </div>

        {/* Blue System Status */}
        <div className="rounded-2xl bg-blue-950 shadow-sm ring-1 ring-gray-900/5 p-6 sm:p-8 text-white relative overflow-hidden flex flex-col justify-center h-full min-h-[300px]">
          <div className="relative z-10">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white mb-3">SokoPoint-POS System Ready</h3>
            <p className="text-blue-200 text-sm sm:text-base mb-8 leading-relaxed max-w-lg">
              Your core commerce engine is fully operational. You can now securely process sales, manage multi-branch inventory, handle vendor purchase orders, and track financial expenses in real-time.
            </p>
            <div className="space-y-4">
              <div className="flex items-center text-sm sm:text-base">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400 mr-4 animate-pulse shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                <span className="text-blue-300">API Services:</span>
                <span className="font-bold ml-2 text-white">Online</span>
              </div>
              <div className="flex items-center text-sm sm:text-base">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400 mr-4 animate-pulse shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                <span className="text-blue-300">Database Connection:</span>
                <span className="font-bold ml-2 text-white">Secure (PostgreSQL via Prisma)</span>
              </div>
              <div className="flex items-center text-sm sm:text-base">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400 mr-4 animate-pulse shrink-0 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                <span className="text-blue-300">Authentication:</span>
                <span className="font-bold ml-2 text-white">Active (JWT)</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full border-[2rem] sm:border-[3rem] border-blue-900/50 opacity-50 pointer-events-none"></div>
        </div>

      </div>
    </div>
  );
}