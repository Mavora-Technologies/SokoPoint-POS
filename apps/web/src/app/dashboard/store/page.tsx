'use client';

import { Store, MonitorSmartphone, Printer } from 'lucide-react';

export default function StorePage() {
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Store className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Store Devices</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Monitor connected POS hardware, registers, and receipt printers.
            </p>
          </div>
        </div>

        {/* Device Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 w-full">
          
          {/* POS Terminal Card */}
          <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all flex items-center gap-4 sm:gap-6 w-full">
            <div className="p-3 sm:p-4 bg-blue-50 text-blue-600 rounded-xl lg:rounded-2xl shrink-0">
              <MonitorSmartphone className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">POS Terminal 1</h3>
              <p className="text-sm sm:text-base text-green-600 font-bold mt-0.5 truncate">Online & Synced</p>
            </div>
          </div>

          {/* Receipt Printer Card */}
          <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl shadow-sm hover:shadow-md ring-1 ring-slate-200 transition-all flex items-center gap-4 sm:gap-6 w-full">
            <div className="p-3 sm:p-4 bg-slate-100 text-slate-600 rounded-xl lg:rounded-2xl shrink-0">
              <Printer className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">Receipt Printer (Network)</h3>
              <p className="text-sm sm:text-base text-green-600 font-bold mt-0.5 truncate">192.168.1.55 • Ready</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}