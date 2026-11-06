'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Undo2, ArrowLeft, Loader2, Save } from 'lucide-react';

export default function InitiateReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier: 'Bidco Africa Ltd', relatedPO: '', productName: 'Premium Wheat Flour 2kg', batchNumber: '', quantity: '', reason: 'DAMAGED', remarks: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard/procurement/returns');
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-orange-500">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Undo2 className="h-7 w-7 text-orange-600 hidden sm:block" /> Initiate Supplier Return
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">Log damaged, expired, or rejected goods for supplier dispatch and credit notes.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Supplier *</label>
              <select required name="supplier" value={formData.supplier} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                <option value="Bidco Africa Ltd">Bidco Africa Ltd</option>
                <option value="Brookside Dairies">Brookside Dairies</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Related PO (Optional)</label>
              <input type="text" name="relatedPO" placeholder="e.g. PO-2026-448" value={formData.relatedPO} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Product *</label>
              <select required name="productName" value={formData.productName} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                <option value="Premium Wheat Flour 2kg">Premium Wheat Flour 2kg</option>
                <option value="Fresh Milk 500ml">Fresh Milk 500ml</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Batch Number *</label>
              <input required type="text" name="batchNumber" placeholder="e.g. BAT-101" value={formData.batchNumber} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Quantity to Return *</label>
              <input required type="number" min="1" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Reason for Return *</label>
              <select required name="reason" value={formData.reason} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                <option value="DAMAGED">Damaged in Transit</option>
                <option value="EXPIRED">Expired / Near Expiry</option>
                <option value="INCORRECT_SUPPLY">Incorrect Item Supplied</option>
                <option value="REJECTED_GOODS">Rejected Quality</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Detailed Remarks / Explanation</label>
              <textarea rows={3} name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Optional context regarding the return..." className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none" />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Link href="/dashboard/procurement/returns" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md shadow-orange-600/20 transition-all disabled:opacity-50 active:scale-[0.98]">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {loading ? 'Processing...' : 'Create Return Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}