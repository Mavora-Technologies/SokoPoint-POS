'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Loader2, CheckCircle2, Receipt, Calendar } from 'lucide-react';
import api from '../../../lib/api';

interface OrderItem {
  id: string;
  orderNum: string;
  customer: string;
  total: number;
  status: string;
  method: string;
  createdAt: string;
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
        setOrders(res.data.data);
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

  const filtered = orders.filter(order => 
    (order?.orderNum || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (order?.customer || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <span className="truncate">Sales & Transactions</span>
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
                placeholder="Search by order number or customer..."
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
                  const displayOrderNum = order.orderNum.replace('VORA-', 'SOKO-');
                  
                  return (
                    <div key={order.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-sm font-mono font-bold text-green-600 block">{displayOrderNum}</span>
                          <h4 className="text-base font-bold text-slate-900 mt-0.5">{order.customer || 'Walk-in Customer'}</h4>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {order.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs sm:text-sm text-slate-500 pt-1">
                        <span className="uppercase font-bold tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {order.method}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" /> {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Amount</span>
                        <span className="text-base font-black text-slate-900">KES {totalVal.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Order #</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Payment Method</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(order => {
                    const totalVal = Number(order.total || 0);
                    const displayOrderNum = order.orderNum.replace('VORA-', 'SOKO-');
                    
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-mono font-bold text-green-600 align-middle">
                          {displayOrderNum}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-bold text-slate-900 align-middle">
                          {order.customer || 'Walk-in Customer'}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base uppercase font-bold text-slate-600 align-middle">
                          {order.method}
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">
                            <CheckCircle2 className="h-4 w-4" /> {order.status}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-slate-500 font-medium align-middle">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" /> {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 text-right pr-6 lg:pr-8 align-middle">
                          KES {totalVal.toLocaleString()}
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
