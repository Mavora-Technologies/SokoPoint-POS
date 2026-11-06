'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download, Plus, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function GoodsInwardPage() {
  const router = useRouter();

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Download className="h-7 w-7 text-emerald-600 hidden sm:block" /> Goods Inward (GRN)
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">
              Verify delivered stock against Purchase Orders and log batches directly into inventory.
            </p>
          </div>
          <Link 
            href="/dashboard/inventory/batches"
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Finalize & Add Batch to Inventory
          </Link>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-400" /> Inspection & Verification for PO #PO-2026-448
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-medium sm:ml-7">Bidco Africa Ltd delivery receipt check.</p>
          </div>

          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-900 space-y-3">
            <p><strong className="font-black">Supplier:</strong> Bidco Africa Ltd</p>
            <p><strong className="font-black">Delivered Items:</strong> Premium Wheat Flour 2kg (100 units inspected & verified)</p>
            <p className="flex items-center gap-2">
              <strong className="font-black">Quality Inspection:</strong> 
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" /> Passed
              </span> 
              <span className="text-emerald-700">(Batch serial numbers verified against dispatch note)</span>
            </p>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button 
              onClick={() => router.push('/dashboard/procurement/orders')}
              className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Back to POs
            </button>
            <button 
              onClick={() => router.push('/dashboard/inventory/batches')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Post to Inventory Batches <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}