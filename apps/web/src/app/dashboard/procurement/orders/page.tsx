'use client';

import Link from 'next/link';
import { ClipboardList, ArrowRight, Truck } from 'lucide-react';

export default function PurchaseOrdersPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <ClipboardList className="h-7 w-7 text-blue-600 hidden sm:block" /> Purchase Orders (PO)
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">
              Official binding orders dispatched to approved wholesale suppliers.
            </p>
          </div>
          <Link 
            href="/dashboard/procurement/grn"
            className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            Receive Goods Inward (GRN) <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-5 sm:p-6 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors group">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl hidden sm:block">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-lg">PO #PO-2026-448 (Bidco Africa Ltd)</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded-lg border border-blue-200">
                    Dispatched
                  </span>
                  <span className="text-sm text-slate-500 font-medium">
                    Expected Delivery: <strong className="text-slate-700">Nov 10, 2026</strong>
                  </span>
                </div>
              </div>
            </div>
            
            <Link 
              href="/dashboard/procurement/grn" 
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-blue-600 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-50 hover:border-blue-200 transition-all"
            >
              Create Goods Inward (GRN) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}