'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Receipt, Loader2 } from 'lucide-react';
import api from '../../../lib/api';

export default function ReportsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalExpenses: 0, netProfit: 0, totalOrders: 0 });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/reports/summary');
        setMetrics(res.data.data);
      } catch (error) {
        console.error('Failed to load reports', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchReports();
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
              <span className="truncate">Financial Reports</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Real-time performance analytics pulled directly from your database.
            </p>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh] w-full bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full">
            
            {/* Total Revenue Card */}
            <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex items-center w-full">
              <div className="p-3 sm:p-4 rounded-xl lg:rounded-2xl bg-green-50 text-green-600 shrink-0">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="ml-4 sm:ml-5 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-500 truncate">Total Revenue</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 truncate">
                  KES {metrics.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Total Expenses Card */}
            <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex items-center w-full">
              <div className="p-3 sm:p-4 rounded-xl lg:rounded-2xl bg-red-50 text-red-600 shrink-0">
                <Receipt className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="ml-4 sm:ml-5 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-500 truncate">Total Expenses</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 truncate">
                  KES {metrics.totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Net Profit Card */}
            <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex items-center w-full">
              <div className="p-3 sm:p-4 rounded-xl lg:rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="ml-4 sm:ml-5 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-500 truncate">Net Profit</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 truncate">
                  KES {metrics.netProfit.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Total Orders Card */}
            <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex items-center w-full">
              <div className="p-3 sm:p-4 rounded-xl lg:rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="ml-4 sm:ml-5 min-w-0 flex-1">
                <p className="text-sm sm:text-base font-semibold text-slate-500 truncate">Total Orders</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 truncate">
                  {metrics.totalOrders.toLocaleString()}
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
