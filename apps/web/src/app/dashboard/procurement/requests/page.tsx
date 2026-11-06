'use client';

import Link from 'next/link';
import { FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function PurchaseRequestsPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <FileText className="h-7 w-7 text-blue-600 hidden sm:block" /> Purchase Requests
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">
              Internal procurement requests generated from reorder triggers awaiting management approval.
            </p>
          </div>
          <Link 
            href="/dashboard/procurement/orders"
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Approve & Generate PO <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-400" /> Request #PR-2026-091
            </p>
            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approved
            </span>
          </div>
          
          <div className="p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-sm text-slate-700">
            <p><strong className="font-black text-slate-900">Supplier:</strong> Bidco Africa Ltd</p>
            <p><strong className="font-black text-slate-900">Requested Items:</strong> Premium Wheat Flour 2kg (100 units), Cooking Oil 3L (250 units)</p>
            <p><strong className="font-black text-slate-900">Requested By:</strong> Retail Procurement Officer</p>
            <p><strong className="font-black text-slate-900">Branch:</strong> Main Supermarket</p>
          </div>
          
          <div className="flex justify-end pt-4">
            <Link 
              href="/dashboard/procurement/orders" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              Proceed to Purchase Order (PO) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}