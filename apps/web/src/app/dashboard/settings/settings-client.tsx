'use client';

import { useState, useEffect } from 'react';
import { Settings, Store, Printer, Bell, Shield, Save, CheckCircle2, Loader2 } from 'lucide-react';

export default function SettingsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    storeName: 'Vora-POS Supermarket',
    currency: 'KES',
    taxRate: '16',
    receiptFooter: 'Thank you for shopping with us! Please come again.',
    lowStockAlerts: true,
  });

  useEffect(() => { setIsMounted(true); }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Settings className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">System Settings</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Manage store preferences, receipt configurations, and general POS parameters.
            </p>
          </div>
        </div>

        {saved && (
          <div className="rounded-2xl bg-green-50 p-4 sm:p-5 ring-1 ring-green-600/20 flex items-center gap-3 w-full shadow-sm">
            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-green-600 shrink-0" />
            <p className="text-sm sm:text-base font-bold text-green-800">Settings updated successfully!</p>
          </div>
        )}

        {/* Main Settings Form Card */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 divide-y divide-slate-100 overflow-hidden w-full max-w-5xl mx-auto">
          
          {/* Section 1: Store Details */}
          <div className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-3">
              <Store className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" /> Store Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Store Name</label>
                <input
                  type="text"
                  value={settings.storeName}
                  onChange={e => setSettings({...settings, storeName: e.target.value})}
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Currency Symbol</label>
                <input
                  type="text"
                  value={settings.currency}
                  onChange={e => setSettings({...settings, currency: e.target.value})}
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Receipt & Tax */}
          <div className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-3">
              <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" /> Receipt & Tax
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Default Tax Rate (%)</label>
                <input
                  type="number"
                  value={settings.taxRate}
                  onChange={e => setSettings({...settings, taxRate: e.target.value})}
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Receipt Footer Message</label>
              <textarea
                rows={3}
                value={settings.receiptFooter}
                onChange={e => setSettings({...settings, receiptFooter: e.target.value})}
                className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm resize-none"
              />
            </div>
          </div>

          {/* Section 3: Notifications & Alerts */}
          <div className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-3">
              <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 shrink-0" /> Notifications & Alerts
            </h3>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 pr-4">
                <span className="text-base font-bold text-slate-900 block">Low Stock Warnings</span>
                <p className="text-sm text-slate-500 mt-0.5">Show alerts when items reach their minimum stock threshold.</p>
              </div>
              <input
                type="checkbox"
                checked={settings.lowStockAlerts}
                onChange={e => setSettings({...settings, lowStockAlerts: e.target.checked})}
                className="h-6 w-6 rounded border-slate-300 text-blue-600 focus:ring-blue-600 shrink-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-5 sm:p-6 lg:p-8 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl lg:rounded-b-3xl">
            <button 
              type="submit" 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-[0.98] touch-manipulation"
            >
              <Save className="mr-2 h-5 w-5" /> Save Changes
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
