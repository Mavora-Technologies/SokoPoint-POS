'use client';

import Link from 'next/link';
import { ClipboardCheck, ArrowRight, AlertTriangle } from 'lucide-react';

export default function ReorderSuggestionsPage() {
  const suggestions = [
    { id: 1, product: 'Premium Wheat Flour 2kg', sku: 'PWF-2KG-01', currentStock: 4, minThreshold: 15, suggestedQty: 100, supplier: 'Bidco Africa Ltd' },
    { id: 2, product: 'Fresh Milk 500ml', sku: 'FM-500-02', currentStock: 8, minThreshold: 30, suggestedQty: 250, supplier: 'Brookside Dairies' },
  ];

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <ClipboardCheck className="h-7 w-7 text-blue-600 hidden sm:block" /> Reorder Suggestions
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">System-identified products requiring replenishment based on minimum stock rules.</p>
          </div>
          <Link 
            href="/dashboard/procurement/requests"
            className="bg-blue-600 text-white px-6 py-3.5 rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            Convert to Purchase Request <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product & SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Min Threshold</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Reorder</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Supplier</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {suggestions.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{s.product}</p>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">{s.sku}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-red-50 text-red-600 border border-red-200">
                        <AlertTriangle className="h-3 w-3" /> {s.currentStock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{s.minThreshold} units</td>
                    <td className="px-6 py-4 text-emerald-600 font-black">{s.suggestedQty} units</td>
                    <td className="px-6 py-4 text-slate-700 font-bold">{s.supplier}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href="/dashboard/procurement/requests" className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 shadow-sm transition-colors">
                        Create Request
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}