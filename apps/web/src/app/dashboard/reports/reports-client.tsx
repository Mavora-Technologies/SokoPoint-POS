'use client';

import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Calendar, ShieldCheck, DollarSign, PieChart, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

interface Order {
  id: string;
  orderNum?: string;
  total: number;
  method: string;
  status?: string;
  cashier?: string;
  createdAt?: string;
}

export default function ReportsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // User Role Check (e.g., restricted to Admin/Manager)
  const [userRole, setUserRole] = useState('cashier');

  useEffect(() => {
    setIsMounted(true);
    const role = localStorage.getItem('userRole') || 'admin'; // Change or connect to your auth state
    setUserRole(role);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/orders');
        const data = res.data?.data || res.data || [];
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load reports data', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchOrders();
  }, [isMounted]);

  // Date Filter Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const dateStr = order.createdAt || '';
      if (!dateStr) return true;
      const orderDate = new Date(dateStr);

      if (startDate && orderDate < new Date(startDate)) return false;
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    });
  }, [orders, startDate, endDate]);

  // Daily Sales Summary Aggregation
  const dailySales = useMemo(() => {
    const map: Record<string, { date: string; count: number; total: number; cash: number; mpesa: number; card: number }> = {};
    
    filteredOrders.forEach(order => {
      if (order.status === 'VOIDED' || order.status === 'REFUNDED') return;
      const dateKey = order.createdAt ? order.createdAt.slice(0, 10) : 'Unknown Date';
      
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, count: 0, total: 0, cash: 0, mpesa: 0, card: 0 };
      }

      const amt = Number(order.total || 0);
      const method = (order.method || 'CASH').toUpperCase();

      map[dateKey].count++;
      map[dateKey].total += amt;
      if (method.includes('CASH')) map[dateKey].cash += amt;
      else if (method.includes('MPESA')) map[dateKey].mpesa += amt;
      else map[dateKey].card += amt;
    });

    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders]);

  // Payment Reconciliation Totals
  const reconciliation = useMemo(() => {
    let expectedCash = 0;
    let expectedMpesa = 0;
    let expectedCard = 0;
    let totalRevenue = 0;

    filteredOrders.forEach(order => {
      if (order.status === 'VOIDED' || order.status === 'REFUNDED') return;
      const amt = Number(order.total || 0);
      const method = (order.method || 'CASH').toUpperCase();

      totalRevenue += amt;
      if (method.includes('CASH')) expectedCash += amt;
      else if (method.includes('MPESA')) expectedMpesa += amt;
      else expectedCard += amt;
    });

    return { expectedCash, expectedMpesa, expectedCard, totalRevenue };
  }, [filteredOrders]);

  // Secure Export Handler
  const handleExport = async (format: 'csv' | 'excel') => {
    const authorizedRoles = ['admin', 'manager', 'supervisor'];
    if (!authorizedRoles.includes(userRole.toLowerCase())) {
      alert('Access Denied: You do not have authorization to export system reports.');
      return;
    }

    try {
      const res = await api.post('/reports/export', {
        format,
        startDate,
        endDate
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_report_${startDate || 'all'}_to_${endDate || 'all'}.${format === 'csv' ? 'csv' : 'xlsx'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed', error);
      alert('Failed to generate report export. Please try again.');
    }
  };

  if (!isMounted || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  const isAuthorized = ['admin', 'manager', 'supervisor'].includes(userRole.toLowerCase());

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 pb-12">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header & Date Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-2xl text-green-600">
                <FileText className="h-7 w-7" />
              </div>
              Reports & Payment Reconciliation
            </h2>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              Analyze daily performance, reconcile payment channels, and securely export audit reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-sm outline-none text-slate-700"
              />
            </div>
            <span className="text-slate-400 font-bold">to</span>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-sm outline-none text-slate-700"
              />
            </div>

            {/* Export Buttons (Role Restricted) */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={() => handleExport('csv')}
                disabled={!isAuthorized}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                  isAuthorized ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Download className="h-4 w-4 text-green-400" /> Export CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={!isAuthorized}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                  isAuthorized ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Download className="h-4 w-4 text-white" /> Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Payment Reconciliation Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Expected Cash Drawer</span>
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">KES {reconciliation.expectedCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <span className="text-xs font-medium text-slate-500 mt-1 block">Reconciled physical cash records</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">M-Pesa Gateway Total</span>
              <PieChart className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">KES {reconciliation.expectedMpesa.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <span className="text-xs font-medium text-slate-500 mt-1 block">Matched automated till receipts</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Card Settlements</span>
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-600">KES {reconciliation.expectedCard.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <span className="text-xs font-medium text-slate-500 mt-1 block">POS terminal card settlements</span>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-green-400">Total Net Revenue</span>
            <p className="text-2xl sm:text-3xl font-black mt-2">KES {reconciliation.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <span className="text-xs text-slate-400 mt-1">For selected date range</span>
          </div>
        </div>

        {/* Daily Sales Summary Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900">Daily Sales Summaries</h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dailySales.length} Active Days</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-4 pl-6 pr-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Transactions</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Cash (KES)</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">M-Pesa (KES)</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Card (KES)</th>
                  <th className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-6">Total (KES)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dailySales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No sales recorded for this date range.
                    </td>
                  </tr>
                ) : (
                  dailySales.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 pl-6 pr-3 text-sm font-bold text-slate-900">{day.date}</td>
                      <td className="px-3 py-4 text-sm font-medium text-center text-slate-600">{day.count}</td>
                      <td className="px-3 py-4 text-sm font-medium text-right text-slate-600">{day.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-4 text-sm font-medium text-right text-emerald-600">{day.mpesa.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-4 text-sm font-medium text-right text-blue-600">{day.card.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-4 text-sm font-black text-right text-slate-900 pr-6">{day.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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