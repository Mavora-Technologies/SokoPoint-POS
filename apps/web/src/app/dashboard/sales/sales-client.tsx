'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Loader2, CheckCircle2, Receipt, Calendar, CreditCard } from 'lucide-react';
import api from '../../../lib/api';

interface OrderItem {
  id: string;
  orderNum?: string;
  customer: string;
  total: number;
  status?: string;
  method: string;
  createdAt?: string;
  date?: string;
}

export default function SalesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/orders');
        const data = res.data?.data || res.data || [];
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load sales orders', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchOrders();
  }, [isMounted]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  const filtered = orders.filter(order => {
    const orderId = (order?.orderNum || order?.id || '').toLowerCase();
    const customer = (order?.customer || '').toLowerCase();
    const method = (order?.method || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return orderId.includes(q) || customer.includes(q) || method.includes(q);
  });

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-green-100 rounded-xl sm:rounded-2xl text-green-600 shrink-0">
                <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Sales Ledger</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              View completed transactions, payment methods, and receipt histories.
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order number, customer, or payment method..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm sm:text-base outline-none transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-green-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                <Receipt className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No sales transactions found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW: Card Layout to completely eliminate horizontal scrolling */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(order => {
                  const totalVal = Number(order.total || 0);
                  const rawOrderNum = order.orderNum || order.id || 'Unknown';
                  const displayOrderNum = rawOrderNum.replace('VORA-', 'SOKO-');
                  const displayStatus = order.status || 'Completed';
                  const displayDate = order.createdAt || order.date;
                  
                  return (
                    <div key={order.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <span className="text-sm font-mono font-bold text-green-600 block truncate">{displayOrderNum}</span>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5 truncate">{order.customer || 'Walk-in Customer'}</h4>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset shrink-0 ${
                          displayStatus === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                        }`}>
                          {displayStatus === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5" />} 
                          {displayStatus}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-slate-500 gap-1.5 sm:gap-0 pt-1">
                        <span className="flex items-center gap-1.5 truncate">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /> 
                          {displayDate ? new Date(displayDate).toLocaleString() : 'N/A'}
                        </span>
                        <span className="flex items-center gap-1.5 uppercase font-bold tracking-wider text-slate-600 shrink-0">
                          <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                          {order.method || 'CASH'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                        <span className="text-base font-black text-slate-900">KES {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/4">Order ID & Date</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/4">Customer</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Payment Method</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(order => {
                    const totalVal = Number(order.total || 0);
                    const rawOrderNum = order.orderNum || order.id || 'Unknown';
                    const displayOrderNum = rawOrderNum.replace('VORA-', 'SOKO-');
                    const displayStatus = order.status || 'Completed';
                    const displayDate = order.createdAt || order.date;
                    
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base align-middle">
                          <div className="font-mono font-bold text-green-600">{displayOrderNum}</div>
                          <div className="flex items-center text-slate-400 mt-1 text-xs sm:text-sm font-medium">
                            <Calendar className="mr-1.5 h-4 w-4 text-slate-400 shrink-0" />
                            {displayDate ? new Date(displayDate).toLocaleString() : 'N/A'}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-bold text-slate-900 align-middle">
                          {order.customer || 'Walk-in Customer'}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base uppercase font-bold text-slate-600 align-middle">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                            {order.method || 'CASH'}
                          </div>
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold ring-1 ring-inset whitespace-nowrap ${
                            displayStatus === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                          }`}>
                            {displayStatus === 'Completed' && <CheckCircle2 className="h-4 w-4" />} 
                            {displayStatus}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 text-right pr-6 lg:pr-8 align-middle whitespace-nowrap">
                          KES {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}