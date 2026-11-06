'use client';

import { Search, Plus, Filter, History } from 'lucide-react';

export default function StockMovementsPage() {
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Stock Movements
            </h2>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              Track and audit all inventory changes, receipts, issues, and adjustments.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="h-4 w-4" /> Record Movement
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by reference, product, or SKU..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm outline-none transition-all shadow-sm"
              />
            </div>
            <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>

          {/* Empty State Shell */}
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-500 p-6 text-center">
            <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner border border-slate-100">
              <History className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700">No Stock Movements Found</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              The database connection is active, but no movement records exist for this module yet. Transactions like sales, adjustments, and receipts will appear here automatically.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}