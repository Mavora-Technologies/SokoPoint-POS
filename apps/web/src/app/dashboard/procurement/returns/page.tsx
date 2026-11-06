'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Undo2, Loader2, Package } from 'lucide-react';

interface ReturnRecord {
  id: string;
  reference: string;
  supplier: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  reason: 'DAMAGED' | 'EXPIRED' | 'INCORRECT_SUPPLY' | 'REJECTED_GOODS';
  relatedPO: string;
  returnDate: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'REJECTED';
}

export default function SupplierReturnsPage() {
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setReturns([
        { id: '1', reference: 'RET-2026-001', supplier: 'Bidco Africa Ltd', productName: 'Premium Wheat Flour 2kg', batchNumber: 'BAT-101', quantity: 20, reason: 'DAMAGED', relatedPO: 'PO-2026-448', returnDate: '2026-11-05', status: 'PENDING_APPROVAL' },
        { id: '2', reference: 'RET-2026-002', supplier: 'Brookside Dairies', productName: 'Fresh Milk 500ml', batchNumber: 'BAT-EX-02', quantity: 12, reason: 'EXPIRED', relatedPO: 'PO-2025-110', returnDate: '2026-11-02', status: 'DISPATCHED' },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const filteredReturns = returns.filter(r => 
    r.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Undo2 className="h-7 w-7 text-orange-600 hidden sm:block" /> Supplier Returns
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium sm:ml-10">
              Manage return logistics for damaged, expired, or incorrectly supplied wholesale stock.
            </p>
          </div>
          <Link 
            href="/dashboard/procurement/returns/new"
            className="w-full lg:w-auto px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Package className="h-4 w-4" /> Initiate Return
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by ref, supplier, or product..." className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-orange-600 outline-none bg-slate-50/50 transition-all" />
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1000px] divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Return Ref & Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier & PO</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product & Batch</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : filteredReturns.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-20 text-center text-slate-500 font-bold">No return records found.</td></tr>
                ) : (
                  filteredReturns.map((ret) => {
                    let statusBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (ret.status === 'DISPATCHED') statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                    if (ret.status === 'APPROVED') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (ret.status === 'PENDING_APPROVAL') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    if (ret.status === 'REJECTED') statusBadge = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-bold font-mono text-slate-900">{ret.reference}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{new Date(ret.returnDate).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800">{ret.supplier}</p>
                          <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">PO: {ret.relatedPO}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{ret.productName}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">Batch: {ret.batchNumber}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {ret.quantity} <span className="text-xs font-normal text-slate-400">units</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-black tracking-wider uppercase text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {ret.reason.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 inline-flex text-[10px] font-black tracking-wider uppercase rounded-lg border ${statusBadge}`}>
                            {ret.status.replace('_', ' ')}
                          </span>
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