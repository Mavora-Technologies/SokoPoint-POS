'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Trash2, Loader2 } from 'lucide-react';

interface WastageRecord {
  id: string;
  date: string;
  productName: string;
  sku: string;
  quantity: number;
  reason: 'EXPIRED' | 'DAMAGED' | 'SPILLAGE' | 'THEFT' | 'OTHER';
  valueLost: number;
  reportedBy: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
}

export default function WastageAndSpoilagePage() {
  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setRecords([
        { id: 'WST-2026-001', date: '2026-11-02', productName: 'Fresh Milk 500ml', sku: 'FM-500-02', quantity: 12, reason: 'EXPIRED', valueLost: 660, reportedBy: 'Jane Doe', status: 'APPROVED' },
        { id: 'WST-2026-002', date: '2026-11-04', productName: 'Organic Tomatoes 1kg', sku: 'ORG-TOM-01', quantity: 2, reason: 'DAMAGED', valueLost: 300, reportedBy: 'John Kamau', status: 'PENDING_APPROVAL' },
        { id: 'WST-2026-003', date: '2026-11-05', productName: 'Cooking Oil 3L', sku: 'CO-3L-99', quantity: 1, reason: 'SPILLAGE', valueLost: 850, reportedBy: 'Sarah Wangari', status: 'APPROVED' },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const filteredRecords = records.filter(r => 
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reportedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Trash2 className="h-7 w-7 text-red-600 hidden sm:block" /> Wastage & Spoilage
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium sm:ml-10">Log and track damaged, expired, or lost stock to maintain accurate inventory valuation.</p>
          </div>
          <Link 
            href="/dashboard/inventory/wastage/new"
            className="w-full sm:w-auto px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" /> Log Stock Wastage
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, Product, or Staff..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-red-600 outline-none bg-slate-50/50"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 w-full overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px] divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reference & Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product & SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Wasted</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Value Lost (KES)</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : (
                  filteredRecords.map((record) => {
                    let statusBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (record.status === 'APPROVED') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (record.status === 'PENDING_APPROVAL') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    if (record.status === 'REJECTED') statusBadge = "bg-red-50 text-red-700 border-red-200";

                    let reasonBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (record.reason === 'EXPIRED') reasonBadge = "bg-purple-50 text-purple-700 border-purple-200";
                    if (record.reason === 'DAMAGED' || record.reason === 'SPILLAGE') reasonBadge = "bg-orange-50 text-orange-700 border-orange-200";
                    if (record.reason === 'THEFT') reasonBadge = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-mono font-bold text-slate-900">{record.id}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{new Date(record.date).toLocaleDateString()} • {record.reportedBy}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{record.productName}</p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">{record.sku}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase tracking-wider rounded-lg border ${reasonBadge}`}>
                            {record.reason}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">{record.quantity} <span className="font-normal text-slate-400">units</span></td>
                        <td className="px-6 py-4 font-black text-red-600">-{record.valueLost.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${statusBadge}`}>
                            {record.status.replace('_', ' ')}
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