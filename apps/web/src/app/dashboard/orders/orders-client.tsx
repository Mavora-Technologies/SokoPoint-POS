'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Search, Loader2, Calendar, CreditCard, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

interface Order {
  id: string;
  date: string;
  customer: string;
  total: number;
  status: string;
  method: string;
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Failed to fetch orders', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchOrders();
    }
  }, [isMounted]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
      </div>
    );
  }

  const filteredOrders = orders.filter((o) =>
    o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 truncate">
              Orders & Sales
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              View completed POS transactions, walk-in customer orders, and sales history.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full">
          <div className="rounded-2xl lg:rounded-3xl bg-white p-5 sm:p-6 lg:p-8 shadow-sm ring-1 ring-slate-200 flex items-center gap-4 sm:gap-6 w-full">
            <div className="p-3 sm:p-4 bg-green-50 rounded-xl lg:rounded-2xl text-green-600 shrink-0">
              <ArrowUpRight className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-semibold text-slate-500 truncate">Displayed Revenue</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 truncate">
                KES {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
          
          <div className="rounded-2xl lg:rounded-3xl bg-white p-5 sm:p-6 lg:p-8 shadow-sm ring-1 ring-slate-200 flex items-center gap-4 sm:gap-6 w-full">
            <div className="p-3 sm:p-4 bg-blue-50 rounded-xl lg:rounded-2xl text-blue-600 shrink-0">
              <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm sm:text-base font-semibold text-slate-500 truncate">Total Transactions</p>
              <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 truncate">
                {filteredOrders.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="rounded-2xl lg:rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by order ID, customer, or payment method..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Data State */}
          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-slate-900" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                <ShoppingBag className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No orders found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">
                Transactions processed through the POS terminal will appear here.
              </p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW: Card Layout to completely eliminate horizontal scrolling */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{order.id}</h4>
                        <p className="text-sm font-semibold text-slate-600 mt-0.5">{order.customer}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                        order.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                      }`}>
                        {order.status === 'Completed' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {order.status}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between text-xs sm:text-sm text-slate-500 gap-1 sm:gap-0 pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {new Date(order.date).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {order.method}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</span>
                      <span className="text-base font-black text-slate-900">
                        KES {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th scope="col" className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Order ID & Date
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">
                      Total (KES)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base align-middle">
                        <div className="font-bold text-slate-900">{order.id}</div>
                        <div className="flex items-center text-slate-400 mt-1 text-xs sm:text-sm font-medium">
                          <Calendar className="mr-1.5 h-4 w-4 text-slate-400 shrink-0" />
                          {new Date(order.date).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base font-medium text-slate-700 align-middle">
                        {order.customer}
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base text-slate-500 align-middle">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-slate-400 shrink-0" />
                          {order.method}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm align-middle">
                        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs lg:text-sm font-bold ring-1 ring-inset ${
                          order.status === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                        }`}>
                          {order.status === 'Completed' && <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 text-right pr-6 lg:pr-8 align-middle">
                        {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}