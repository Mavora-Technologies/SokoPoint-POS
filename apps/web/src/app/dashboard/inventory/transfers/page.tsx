'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ArrowRightLeft, Loader2, ArrowRight, Package } from 'lucide-react';
import api from '../../../../lib/api';

interface BranchTransfer {
  id: string;
  date: string;
  sourceBranch: string;
  destinationBranch: string;
  productName: string;
  sku: string;
  quantity: number;
  status: 'PENDING' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'REJECTED';
  requestedBy: string;
}

export default function BranchTransfersPage() {
  const [transfers, setTransfers] = useState<BranchTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Attempting to fetch live transfers, falling back to mock data
    const fetchTransfers = async () => {
      try {
        const res = await api.get('/inventory/transfers');
        const data = res.data?.data || res.data;
        if (data && Array.isArray(data) && data.length > 0) {
          setTransfers(data);
          return;
        }
        throw new Error('No live data');
      } catch (error) {
        setTransfers([
          { id: 'TRF-2026-001', date: '2026-11-04', sourceBranch: 'Main Supermarket', destinationBranch: 'CBD Express Outlet', productName: 'Premium Wheat Flour 2kg', sku: 'PWF-2KG-01', quantity: 50, status: 'RECEIVED', requestedBy: 'Jane Doe' },
          { id: 'TRF-2026-002', date: '2026-11-05', sourceBranch: 'Main Supermarket', destinationBranch: 'Westlands Branch', productName: 'Fresh Milk 500ml', sku: 'FM-500-02', quantity: 200, status: 'DISPATCHED', requestedBy: 'John Kamau' },
          { id: 'TRF-2026-003', date: '2026-11-05', sourceBranch: 'CBD Express Outlet', destinationBranch: 'Main Supermarket', productName: 'Cooking Oil 3L', sku: 'CO-3L-99', quantity: 20, status: 'PENDING', requestedBy: 'Sarah Wangari' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, []);

  const filteredTransfers = transfers.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destinationBranch.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 w-full">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0 hidden sm:flex">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              Branch Transfers
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl sm:ml-14">
              Manage and track internal retail inventory transfers between SokoPoint branches.
            </p>
          </div>
          <Link 
            href="/dashboard/inventory/transfers/new"
            className="w-full lg:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <ArrowRightLeft className="h-4 w-4" /> Request New Transfer
          </Link>
        </div>

        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 w-full">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Transfer ID, Branch, Product, or SKU..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-slate-50/50 transition-all"
            />
          </div>
        </div>

        {/* Main Table Section */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 w-full overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1000px] divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Transfer ID & Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Route (From &rarr; To)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product & SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
                        <span className="font-medium">Loading transfer records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100">
                          <Package className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-bold text-slate-700">No branch transfers found</p>
                        <p className="mt-1 text-sm text-slate-400">Try adjusting your search criteria.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((transfer) => {
                    let statusBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (transfer.status === 'RECEIVED') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (transfer.status === 'DISPATCHED') statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                    if (transfer.status === 'PENDING') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    if (transfer.status === 'REJECTED') statusBadge = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <tr key={transfer.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-slate-900">{transfer.id}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{new Date(transfer.date).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700">{transfer.sourceBranch}</p>
                          <p className="text-[11px] text-slate-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" /> {transfer.destinationBranch}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{transfer.productName}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wide">{transfer.sku}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {transfer.quantity} <span className="text-xs font-normal text-slate-400">units</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 inline-flex text-[10px] uppercase font-black tracking-wider rounded-lg border ${statusBadge}`}>
                            {transfer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {transfer.status === 'DISPATCHED' ? (
                            <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-emerald-700">
                              Confirm Receipt
                            </button>
                          ) : transfer.status === 'PENDING' ? (
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:bg-blue-700">
                              Approve & Dispatch
                            </button>
                          ) : (
                            <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm border border-slate-200">
                              View Details
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}