'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, Search, Loader2, CheckCircle2, Receipt, Calendar, 
  CreditCard, FileSpreadsheet, Printer, ArrowUpDown, ChevronLeft, ChevronRight, X, User, ShieldAlert 
} from 'lucide-react';
import api from '../../../lib/api';

interface OrderItem {
  id: string;
  orderNum?: string;
  customer: string;
  total: number;
  status?: string;
  method: string;
  cashier?: string;
  createdAt?: string;
  date?: string;
  items?: Array<{
    id: string;
    name?: string;
    quantity: number;
    price: number;
    product?: { name: string };
  }>;
}

export default function SalesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [cashierFilter, setCashierFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Sorting & Pagination States
  const [sortField, setSortField] = useState<'createdAt' | 'total' | 'orderNum'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Order for Detail Modal & Reprint
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

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

  // Extract unique filter options from loaded data
  const uniqueCustomers = useMemo(() => {
    const set = new Set(orders.map(o => o.customer).filter(Boolean));
    return Array.from(set);
  }, [orders]);

  const uniqueCashiers = useMemo(() => {
    const set = new Set(orders.map(o => o.cashier || 'Cashier').filter(Boolean));
    return Array.from(set);
  }, [orders]);

  // Summary Metrics Calculation (Reconciled with filtered data or overall records)
  const metrics = useMemo(() => {
    let totalSales = 0;
    let cashSales = 0;
    let mpesaSales = 0;
    let refundCount = 0;
    let voidCount = 0;

    orders.forEach(order => {
      const amt = Number(order.total || 0);
      const status = (order.status || 'Completed').toUpperCase();
      const method = (order.method || '').toUpperCase();

      if (status === 'REFUNDED') {
        refundCount++;
        return;
      }
      if (status === 'VOIDED') {
        voidCount++;
        return;
      }

      totalSales += amt;
      if (method.includes('CASH')) cashSales += amt;
      if (method.includes('MPESA') || method.includes('M-PESA')) mpesaSales += amt;
    });

    return {
      totalSales,
      transactionCount: orders.length,
      cashSales,
      mpesaSales,
      refundCount,
      voidCount
    };
  }, [orders]);

  // Filtering & Sorting Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderId = (order?.orderNum || order?.id || '').toLowerCase();
      const customer = (order?.customer || '').toLowerCase();
      const method = (order?.method || '').toLowerCase();
      const cashier = (order?.cashier || 'cashier').toLowerCase();
      const status = order?.status || 'Completed';
      const orderDate = order?.createdAt || order?.date || '';

      const matchesSearch = orderId.includes(searchQuery.toLowerCase()) || 
                            customer.includes(searchQuery.toLowerCase()) || 
                            method.includes(searchQuery.toLowerCase());

      const matchesMethod = methodFilter === 'ALL' || method.includes(methodFilter.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || status === statusFilter;
      const matchesCustomer = customerFilter === 'ALL' || order.customer === customerFilter;
      const matchesCashier = cashierFilter === 'ALL' || (order.cashier || 'Cashier') === cashierFilter;

      let matchesDate = true;
      if (startDate && orderDate) {
        matchesDate = matchesDate && new Date(orderDate) >= new Date(startDate);
      }
      if (endDate && orderDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(orderDate) <= end;
      }

      return matchesSearch && matchesMethod && matchesStatus && matchesCustomer && matchesCashier && matchesDate;
    }).sort((a, b) => {
      let valA: any = a[sortField] || '';
      let valB: any = b[sortField] || '';

      if (sortField === 'total') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (sortField === 'createdAt') {
        valA = new Date(valA).getTime() || 0;
        valB = new Date(valB).getTime() || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, searchQuery, methodFilter, statusFilter, customerFilter, cashierFilter, startDate, endDate, sortField, sortOrder]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const handleSort = (field: 'createdAt' | 'total' | 'orderNum') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // CSV Export Function
  const exportToCSV = () => {
    const headers = ['Order ID', 'Date', 'Customer', 'Cashier', 'Payment Method', 'Status', 'Total (KES)'];
    const rows = filteredOrders.map(o => [
      o.orderNum || o.id,
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
      `"${o.customer || 'Walk-in'}"`,
      `"${o.cashier || 'Cashier'}"`,
      o.method || 'CASH',
      o.status || 'Completed',
      o.total || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Authorized Receipt Reprint Handler
  const handlePrintReceipt = (order: OrderItem) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      
      {/* Print Styles for Receipt Modal */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * { visibility: hidden; }
            #printable-receipt, #printable-receipt * { visibility: visible; }
            #printable-receipt { position: absolute; left: 0; top: 0; width: 80mm; margin: 0; padding: 5mm; }
            .no-print { display: none !important; }
          }
        `
      }} />

      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">
        
        {/* Header & Export Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-green-100 rounded-xl sm:rounded-2xl text-green-600 shrink-0">
                <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Sales Ledger</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500 font-medium max-w-3xl">
              Comprehensive overview of real-time transactions, payment methods, audit trails, and reporting summaries.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4 text-green-400" /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sales</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-2">KES {metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Transactions</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{metrics.transactionCount}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cash Payments</span>
            <span className="text-xl sm:text-2xl font-black text-green-600 mt-2">KES {metrics.cashSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">M-Pesa Payments</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-2">KES {metrics.mpesaSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Refunds</span>
            <span className="text-xl sm:text-2xl font-black text-amber-600 mt-2">{metrics.refundCount}</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Voids</span>
            <span className="text-xl sm:text-2xl font-black text-rose-600 mt-2">{metrics.voidCount}</span>
          </div>
        </div>

        {/* Advanced Filters Toolbar */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search order, customer..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-green-600 transition-all"
              />
            </div>

            {/* Payment Method Filter */}
            <select
              value={methodFilter}
              onChange={e => { setMethodFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="MPESA">M-Pesa</option>
              <option value="CARD">Card</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="VOIDED">Voided</option>
            </select>

            {/* Customer Filter */}
            <select
              value={customerFilter}
              onChange={e => { setCustomerFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="ALL">All Customers</option>
              {uniqueCustomers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            {/* Cashier Filter */}
            <select
              value={cashierFilter}
              onChange={e => { setCashierFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="ALL">All Cashiers</option>
              {uniqueCashiers.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Start Date */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-transparent text-sm outline-none text-slate-600"
                placeholder="Start Date"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-transparent text-sm outline-none text-slate-600"
                placeholder="End Date"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area / Table */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col w-full">
          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 animate-spin text-green-600" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100">
                <Receipt className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-lg font-bold text-slate-700">No matching transactions found</p>
              <p className="mt-1 text-sm text-slate-400">Try modifying your filter or search parameters.</p>
            </div>
          ) : (
            <div className="w-full">
              
              {/* Desktop & Tablet Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th 
                        onClick={() => handleSort('orderNum')}
                        className="py-4 pl-6 pr-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                      >
                        <div className="flex items-center gap-1.5">Order ID <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th 
                        onClick={() => handleSort('createdAt')}
                        className="px-3 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                      >
                        <div className="flex items-center gap-1.5">Date & Time <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                      <th className="px-3 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-3 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Cashier</th>
                      <th className="px-3 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                      <th className="px-3 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th 
                        onClick={() => handleSort('total')}
                        className="px-3 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider pr-6 cursor-pointer hover:text-slate-900"
                      >
                        <div className="flex items-center justify-end gap-1.5">Total Amount <ArrowUpDown className="h-3 w-3" /></div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedOrders.map(order => {
                      const totalVal = Number(order.total || 0);
                      const rawOrderNum = order.orderNum || order.id || 'Unknown';
                      const displayOrderNum = rawOrderNum.replace('VORA-', 'SOKO-');
                      const displayStatus = order.status || 'Completed';
                      const displayDate = order.createdAt || order.date;
                      
                      return (
                        <tr 
                          key={order.id} 
                          onClick={() => setSelectedOrder(order)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <td className="py-4 pl-6 pr-3 text-sm font-mono font-bold text-green-600 group-hover:underline">
                            {displayOrderNum}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-500 font-medium whitespace-nowrap">
                            {displayDate ? new Date(displayDate).toLocaleString() : 'N/A'}
                          </td>
                          <td className="px-3 py-4 text-sm font-bold text-slate-900">
                            {order.customer || 'Walk-in Customer'}
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600 font-medium">
                            {order.cashier || 'Cashier'}
                          </td>
                          <td className="px-3 py-4 text-sm uppercase font-bold text-slate-600">
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-slate-400" /> {order.method || 'CASH'}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ring-1 ring-inset ${
                              displayStatus === 'Completed' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                              displayStatus === 'REFUNDED' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' : 'bg-rose-50 text-rose-700 ring-rose-600/20'
                            }`}>
                              {displayStatus === 'Completed' && <CheckCircle2 className="h-3.5 w-3.5" />}
                              {displayStatus}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-sm font-black text-slate-900 text-right pr-6 whitespace-nowrap">
                            KES {totalVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/50 border-t border-slate-200">
                <span className="text-sm font-medium text-slate-500">
                  Showing page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong> ({filteredOrders.length} total orders)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Transaction Details & Authorized Receipt Reprint Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative flex flex-col my-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 bg-slate-900 text-white no-print">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Receipt className="h-5 w-5 text-green-400" /> Transaction Details
              </h3>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="text-slate-400 hover:text-white bg-white/10 rounded-full p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Receipt Layout */}
            <div id="printable-receipt" className="p-6 text-slate-900 bg-white font-mono text-sm space-y-4">
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <h2 className="font-extrabold text-xl uppercase tracking-widest text-black">SOKOPOINT</h2>
                <p className="text-xs text-slate-500 mt-1">123 Business Avenue, Nairobi</p>
                <p className="text-xs text-slate-500">Tel: +254 700 000 000</p>
                <div className="mt-3 text-xs font-semibold py-2 border-y border-dashed border-slate-300 flex justify-between">
                  <span>Order: {(selectedOrder.orderNum || selectedOrder.id).replace('VORA-', 'SOKO-')}</span>
                  <span>{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-2">
                  <span>Served by: <strong className="text-black">{selectedOrder.cashier || 'Cashier'}</strong></span>
                  <span>Customer: <strong className="text-black">{selectedOrder.customer || 'Walk-in'}</strong></span>
                </div>
              </div>

              {/* Items breakdown if present */}
              <div className="space-y-2 pb-4 border-b border-dashed border-slate-300">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                  <span>Item</span>
                  <span>Amount</span>
                </div>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <div>
                        <span className="font-bold block">{item.product?.name || item.name || 'Product'}</span>
                        <span className="text-slate-500">{item.quantity} x KES {item.price.toLocaleString()}</span>
                      </div>
                      <span className="font-bold">{(item.quantity * item.price).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 italic text-center py-2">Standard POS Transaction Itemized Record</div>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-bold text-sm pt-2 text-black">
                  <span>TOTAL PAID</span>
                  <span>KES {Number(selectedOrder.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-500 uppercase pt-1">
                  <span>Method:</span>
                  <span className="font-bold text-slate-700">{selectedOrder.method}</span>
                </div>
                <div className="flex justify-between text-slate-500 uppercase">
                  <span>Status:</span>
                  <span className="font-bold text-slate-700">{selectedOrder.status || 'Completed'}</span>
                </div>
              </div>

              <div className="text-center pt-4 border-t border-dashed border-slate-300 text-xs text-slate-600">
                <p className="font-bold">Thank you for your business!</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-5 bg-slate-50 border-t border-slate-200 flex gap-3 no-print">
              <button
                onClick={() => handlePrintReceipt(selectedOrder)}
                className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-md"
              >
                <Printer className="h-4 w-4 text-green-400" /> Print Receipt
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-3 bg-white text-slate-700 font-bold rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}