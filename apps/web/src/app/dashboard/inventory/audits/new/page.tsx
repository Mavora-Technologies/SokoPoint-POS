'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ListChecks, ArrowLeft, Loader2, Save } from 'lucide-react';
import api from '../../../../../lib/api';

interface AuditItem {
  id: number;
  productName: string;
  sku: string;
  systemQuantity: number;
  physicalQuantity: number | '';
  unitCost: number;
  remarks: string;
}

export default function StartAuditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditItem[]>([]);

  useEffect(() => {
    // Populate with real items eventually, using retail placeholders for now
    setItems([
      { id: 1, productName: 'Premium Wheat Flour 2kg', sku: 'PWF-2KG-01', systemQuantity: 150, physicalQuantity: '', unitCost: 180, remarks: '' },
      { id: 2, productName: 'Fresh Milk 500ml', sku: 'FM-500-02', systemQuantity: 80, physicalQuantity: '', unitCost: 55, remarks: '' },
      { id: 3, productName: 'Cooking Oil 3L', sku: 'CO-3L-99', systemQuantity: 45, physicalQuantity: '', unitCost: 850, remarks: '' },
    ]);
  }, []);

  const handlePhysicalCountChange = (id: number, val: string) => {
    setItems(items.map(item => item.id === id ? { ...item, physicalQuantity: val === '' ? '' : Number(val) } : item));
  };

  const handleRemarksChange = (id: number, val: string) => {
    setItems(items.map(item => item.id === id ? { ...item, remarks: val } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API submission delay
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard/inventory/audits');
    }, 800);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <ListChecks className="h-7 w-7 text-blue-600 hidden sm:block" />
              Active Stocktake Session
            </h1>
            <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">
              Count physical stock, identify discrepancies, and submit for manager approval.
            </p>
          </div>
          <div className="px-4 py-2 bg-slate-50 text-slate-700 rounded-xl text-sm font-bold border border-slate-200">
            Branch: Main Supermarket
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-slate-50/80 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product & SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">System Qty</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Physical Count *</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Variance</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {items.map((item) => {
                  const variance = item.physicalQuantity === '' ? 0 : (item.physicalQuantity as number) - item.systemQuantity;
                  const varianceValue = variance * item.unitCost;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5 tracking-wide">{item.sku}</p>
                      </td>
                      <td className="px-6 py-4 font-black text-slate-500">{item.systemQuantity}</td>
                      <td className="px-6 py-4">
                        <input 
                          required
                          type="number" 
                          min="0"
                          value={item.physicalQuantity} 
                          onChange={(e) => handlePhysicalCountChange(item.id, e.target.value)}
                          placeholder="Enter count"
                          className="w-32 border border-slate-200 rounded-xl p-2.5 text-sm font-black focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50 shadow-sm transition-all" 
                        />
                      </td>
                      <td className="px-6 py-4 font-black">
                        {item.physicalQuantity !== '' ? (
                          <div className={variance < 0 ? 'text-red-600' : variance > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                            <p>{variance > 0 ? '+' : ''}{variance} units</p>
                            <p className="text-[10px] uppercase font-bold opacity-80 mt-0.5">
                              {varianceValue < 0 ? '' : '+'}{varianceValue.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
                            </p>
                          </div>
                        ) : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4">
                        <input 
                          type="text" 
                          value={item.remarks} 
                          onChange={(e) => handleRemarksChange(item.id, e.target.value)}
                          placeholder={variance !== 0 ? "Required for variance..." : "Optional"}
                          required={variance !== 0}
                          className={`w-full border rounded-xl p-2.5 text-xs font-medium outline-none shadow-sm transition-all ${
                            variance !== 0 && !item.remarks 
                              ? 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500 placeholder:text-red-300' 
                              : 'border-slate-200 bg-white focus:ring-2 focus:ring-blue-600'
                          }`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
            <Link 
              href="/dashboard/inventory/audits"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Cancel Session
            </Link>
            <button 
              type="submit" 
              disabled={loading}
              className="inline-flex items-center gap-2 px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {loading ? 'Submitting...' : 'Submit Audit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}