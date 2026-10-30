'use client';

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Receipt, Loader2, ArrowUpRight, ArrowDownRight, Download, Calendar } from 'lucide-react';
import api from '../../../lib/api';

export default function ReportsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({ 
    totalRevenue: 0, 
    totalExpenses: 0, 
    netProfit: 0, 
    totalOrders: 0 
  });

  // Export States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportType, setExportType] = useState('sales');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        
        // Fetch raw data directly to guarantee perfectly synced real-time metrics
        const [ordersRes, expensesRes] = await Promise.all([
          api.get('/orders').catch(() => ({ data: { data: [] } })),
          api.get('/expenses').catch(() => ({ data: { data: [] } })),
        ]);

        const orders = ordersRes.data?.data || [];
        const expenses = expensesRes.data?.data || [];

        const totalRevenue = orders.reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0);
        const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + parseFloat(exp.amount || 0), 0);
        const netProfit = totalRevenue - totalExpenses;
        const totalOrders = orders.length;

        setMetrics({ totalRevenue, totalExpenses, netProfit, totalOrders });
      } catch (error) {
        console.error('Failed to load reports', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchReports();
  }, [isMounted]);

  const handleExport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both a start and end date for the report.');
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date.');
      return;
    }

    try {
      setIsExporting(true);
      
      const response = await api.get(`/reports/export`, {
        params: { startDate, endDate, type: exportType },
        responseType: 'blob', // Crucial for handling raw file data (CSV)
      });

      // Create a temporary link to force the browser to download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exportType}_report_${startDate}_to_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error: any) {
      console.error('Export failed:', error);
      if (error.response?.status === 403) {
        alert('Action Denied: You do not have Administrator permissions to export raw financial data.');
      } else {
        alert('Failed to generate the report. Please try again.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const isProfitable = metrics.netProfit >= 0;

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
          <div className="space-y-6 lg:space-y-8">
            
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full">
              
              {/* Total Revenue Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-green-50 text-green-600 shrink-0">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Total Revenue</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  KES {metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Total Expenses Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-red-50 text-red-600 shrink-0">
                    <Receipt className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Total Expenses</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  KES {metrics.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>

              {/* Net Profit Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full relative">
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className={`p-2.5 sm:p-3 rounded-xl lg:rounded-2xl shrink-0 ${isProfitable ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Net Profit</p>
                </div>
                <div className="flex items-center gap-3 mt-auto relative z-10">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible">
                    KES {Math.abs(metrics.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="shrink-0 flex items-center justify-center">
                    {isProfitable 
                      ? <ArrowUpRight className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 stroke-[3]" />
                      : <ArrowDownRight className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 stroke-[3]" />
                    }
                  </span>
                </div>
              </div>

              {/* Total Orders Card */}
              <div className="bg-white overflow-hidden rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all p-5 sm:p-6 lg:p-8 flex flex-col justify-between h-40 sm:h-44 w-full">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 sm:p-3 rounded-xl lg:rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <p className="text-sm sm:text-base font-bold text-slate-500">Total Orders</p>
                </div>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap overflow-visible mt-auto">
                  {metrics.totalOrders.toLocaleString()}
                </p>
              </div>

            </div>

            {/* Export & Filters Section */}
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 p-5 sm:p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-700">
                  <Download className="h-5 w-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Export Data & Reconciliation
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 items-end">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 font-medium"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Report Type</label>
                  <select 
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-slate-900 font-medium appearance-none bg-white"
                  >
                    <option value="sales">Sales & Payment Reconciliation</option>
                    <option value="expenses">Expenses & Outflow</option>
                  </select>
                </div>

                <div>
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    {isExporting ? 'Generating...' : 'Download CSV'}
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}