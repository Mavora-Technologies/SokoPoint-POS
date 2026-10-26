'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Search, Plus, Loader2, FileText, CheckCircle, X, CheckCircle2, Package } from 'lucide-react';
import api from '../../../lib/api';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  itemsSummary?: string;
  status: string;
  totalAmount?: string;
  totalCost?: string;
  createdAt: string;
}

export default function PurchasingClient() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPO, setNewPO] = useState({
    poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    supplierName: '',
    itemsSummary: '',
    totalAmount: '',
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPOs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/purchase-orders');
      const data = response.data?.data || response.data || [];
      setPurchaseOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch POs', error);
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted) {
      fetchPOs();
    }
  }, [isMounted]);

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        poNumber: newPO.poNumber,
        supplierName: newPO.supplierName,
        itemsSummary: newPO.itemsSummary,
        totalCost: Number(newPO.totalAmount), // Sending as totalCost to match typical Prisma schema
        totalAmount: Number(newPO.totalAmount),
        status: 'PENDING'
      };

      const res = await api.post('/purchase-orders', payload);
      const created = res.data?.data || res.data;
      
      if (created) {
        setPurchaseOrders([created, ...purchaseOrders]);
      } else {
        await fetchPOs();
      }
      
      setIsModalOpen(false);
      setNewPO({
        poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        supplierName: '',
        itemsSummary: '',
        totalAmount: '',
      });
    } catch (error) {
      console.error('Failed to create PO', error);
      alert('Failed to create Purchase Order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-slate-900" />
      </div>
    );
  }

  const filteredPOs = purchaseOrders.filter((po) =>
    (po.poNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (po.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase())
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
              Manage vendor orders, track costs, and receive stock into your inventory.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-slate-900 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-slate-800 transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5 shrink-0" />
              Create PO
            </button>
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
                {filteredPOs.map((po) => {
                  const val = Number(po.totalAmount || po.totalCost || 0);
                  
                  return (
                    <div key={po.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center text-base">
                            <FileText className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                            {po.poNumber}
                          </div>
                          <div className="text-slate-500 mt-0.5 text-xs font-medium">
                            {new Date(po.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset shrink-0 ${
                          po.status === 'RECEIVED' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'
                        }`}>
                          {po.status}
                        </span>
                      </div>

                      <div className="text-sm font-bold text-slate-800 pt-1">
                        Supplier: <span className="font-normal text-slate-600">{po.supplierName}</span>
                      </div>
                      
                      {po.itemsSummary && (
                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                          <Package className="h-3 w-3 inline mr-1 text-slate-400" /> {po.itemsSummary}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                          <span className="text-base font-black text-slate-900">
                            KES {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          {po.status === 'PENDING' ? (
                            <button 
                              onClick={() => handleReceiveGoods(po.id)}
                              disabled={processingId === po.id}
                              className="text-white hover:bg-slate-800 bg-slate-900 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center transition-colors disabled:opacity-50 shadow-sm active:scale-95"
                            >
                              {processingId === po.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                              Receive Goods
                            </button>
                          ) : (
                            <span className="text-slate-400 text-sm font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-green-500" /> Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th scope="col" className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/4">PO Number</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Supplier & Details</th>
                    <th scope="col" className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                    <th scope="col" className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="relative py-4 pl-3 pr-6 lg:pr-8 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPOs.map((po) => {
                    const val = Number(po.totalAmount || po.totalCost || 0);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base align-middle">
                          <div className="font-bold text-slate-900 flex items-center">
                            <FileText className="mr-2 h-4 w-4 text-slate-400 shrink-0" />
                            {po.poNumber}
                          </div>
                          <div className="text-slate-400 mt-1 text-xs font-medium">{new Date(po.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base align-middle max-w-[250px]">
                          <div className="font-medium text-slate-900 truncate">{po.supplierName}</div>
                          {po.itemsSummary && (
                            <div className="text-xs text-slate-500 truncate mt-0.5">{po.itemsSummary}</div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 text-right align-middle whitespace-nowrap">
                          KES {val.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          <span className={`inline-flex items-center rounded-lg px-3 py-1 text-xs lg:text-sm font-bold ring-1 ring-inset whitespace-nowrap ${
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
                              className="text-white hover:bg-slate-800 bg-slate-900 px-4 py-2.5 rounded-xl text-xs lg:text-sm font-bold flex items-center ml-auto transition-colors disabled:opacity-50 shadow-sm active:scale-95"
                            >
                              {processingId === po.id ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
                              Receive Goods
                            </button>
                          ) : (
                            <span className="text-slate-400 font-bold flex items-center justify-end gap-1.5">
                              <CheckCircle2 className="h-4 w-4 text-green-500" /> Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create PO Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-lg lg:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <ClipboardList className="h-6 w-6 text-slate-900" /> Create Purchase Order
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreatePO} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">PO Number</label>
                    <input 
                      required 
                      type="text" 
                      value={newPO.poNumber} 
                      onChange={e => setNewPO({...newPO, poNumber: e.target.value})} 
                      disabled={isSubmitting}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm sm:text-base shadow-sm font-mono disabled:opacity-50 disabled:bg-slate-50" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Total Amount (KES)</label>
                    <input 
                      required 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={newPO.totalAmount} 
                      onChange={e => setNewPO({...newPO, totalAmount: e.target.value})} 
                      disabled={isSubmitting}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                      placeholder="0.00" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Supplier Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newPO.supplierName} 
                    onChange={e => setNewPO({...newPO, supplierName: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="e.g., Highland Dairies Ltd" 
                  />
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Items Summary / Notes</label>
                  <textarea 
                    rows={3}
                    value={newPO.itemsSummary} 
                    onChange={e => setNewPO({...newPO, itemsSummary: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all text-sm sm:text-base shadow-sm resize-none placeholder:text-slate-400 custom-scrollbar disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="Brief description of items ordered..." 
                  />
                </div>
                
                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-slate-900/20 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} 
                    Create Order
                  </button>
                </div>
              </form>
              
            </div>
          </div>
        )}

      </div>
    </div>
  );
}