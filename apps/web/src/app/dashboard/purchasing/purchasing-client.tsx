'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Search, Plus, Loader2, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import api from '../../../lib/api';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  totalAmount: string;
  createdAt: string;
}

export default function PurchasingClient() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPOs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/purchase-orders');
      setPurchaseOrders(response.data.data);
    } catch (error) {
      console.error('Failed to fetch POs', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchPOs();
    }
  }, [isMounted]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
      </div>
    );
  }

  const handleReceiveGoods = async (poId: string) => {
    if (!confirm('Mark goods as received? This will permanently increase your inventory.')) return;
    
    try {
      setProcessingId(poId);
      await api.post(`/purchase-orders/${poId}/receive`);
      await fetchPOs(); 
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to receive goods');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPOs = purchaseOrders.filter((po) =>
    po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-slate-200/60 rounded-xl sm:rounded-2xl text-slate-900 shrink-0">
                <ClipboardList className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Purchase Orders</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Manage vendor orders and receive stock into your inventory.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <Link 
              href="/dashboard/purchasing/new"
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-slate-900 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create PO
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="rounded-2xl lg:rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-sm sm:text-base outline-none transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-slate-900" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                <ClipboardList className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No purchase orders found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">
                Create your first purchase order to request stock from a supplier.
              </p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW: Card Layout to completely eliminate horizontal scrolling */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredPOs.map((po) => (
                  <div key={po.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 flex items-center text-base">
                          <FileText className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                          {po.poNumber}
                        </div>
                        <div className="text-slate-500 mt-0.5 text-xs font-medium">{new Date(po.createdAt).toLocaleDateString()}</div>
                      </div>
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${
                        po.status === 'RECEIVED' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                      }`}>
                        {po.status}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-800">
                      Supplier: <span className="font-normal text-slate-600">{po.supplierName}</span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                        <span className="text-base font-black text-slate-900">
                          KES {parseFloat(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div>
                        {po.status === 'PENDING' ? (
                          <button 
                            onClick={() => handleReceiveGoods(po.id)}
                            disabled={processingId === po.id}
                            className="text-white hover:bg-slate-800 bg-slate-900 px-4 py-2 rounded-xl text-xs font-bold flex items-center transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {processingId === po.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                            Receive Goods
                          </button>
                        ) : (
                          <span className="text-slate-400 text-sm font-bold">Completed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th scope="col" className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">PO Number</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                    <th scope="col" className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="relative py-4 pl-3 pr-6 lg:pr-8 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base align-middle">
                        <div className="font-bold text-slate-900 flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                          {po.poNumber}
                        </div>
                        <div className="text-slate-400 mt-1 text-xs font-medium">{new Date(po.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base font-medium text-slate-900 align-middle">
                        {po.supplierName}
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 text-right align-middle">
                        KES {parseFloat(po.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-4 text-sm align-middle">
                        <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs lg:text-sm font-bold ring-1 ring-inset ${
                          po.status === 'RECEIVED' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                        }`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 lg:pr-8 text-right text-sm font-medium align-middle">
                        {po.status === 'PENDING' ? (
                          <button 
                            onClick={() => handleReceiveGoods(po.id)}
                            disabled={processingId === po.id}
                            className="text-white hover:bg-slate-800 bg-slate-900 px-4 py-2 rounded-xl text-xs lg:text-sm font-bold flex items-center ml-auto transition-colors disabled:opacity-50 shadow-sm"
                          >
                            {processingId === po.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                            Receive Goods
                          </button>
                        ) : (
                          <span className="text-slate-400 font-bold">Completed</span>
                        )}
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
