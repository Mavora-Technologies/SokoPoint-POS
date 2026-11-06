'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

export default function LogWastagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const productsList = [
    { id: '1', name: 'Fresh Milk 500ml', sku: 'FM-500-02', available: 120, unitCost: 55 },
    { id: '2', name: 'Organic Tomatoes 1kg', sku: 'ORG-TOM-01', available: 12, unitCost: 150 },
    { id: '3', name: 'Premium Wheat Flour 2kg', sku: 'PWF-2KG-01', available: 80, unitCost: 180 },
  ];

  const reasonsList = ['EXPIRED', 'DAMAGED', 'SPILLAGE', 'THEFT', 'OTHER'];

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    reason: 'DAMAGED',
    remarks: ''
  });

  const selectedProduct = productsList.find(p => p.id === formData.productId);
  const estimatedValue = selectedProduct ? (parseInt(formData.quantity) || 0) * selectedProduct.unitCost : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (selectedProduct && parseInt(formData.quantity) > selectedProduct.available) {
      alert("Error: Wasted quantity exceeds available stock.");
      setLoading(false);
      return;
    }

    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard/inventory/wastage');
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Log Stock Wastage</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Record items that are unfit for sale to safely deduct them from active inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Product & SKU *</label>
              <select required name="productId" value={formData.productId} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all">
                <option value="">-- Select Compromised Product --</option>
                {productsList.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({prod.sku}) - Available: {prod.available} units
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Quantity Lost *</label>
              <input required type="number" min="1" max={selectedProduct?.available || 9999} name="quantity" value={formData.quantity} onChange={handleChange} placeholder="e.g. 5" className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none bg-white transition-all" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Reason for Write-Off *</label>
              <select required name="reason" value={formData.reason} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all">
                {reasonsList.map((reason, idx) => (
                  <option key={idx} value={reason}>{reason.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 p-5 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Estimated Value Lost:</span>
              <span className="text-xl font-black text-red-600">
                {estimatedValue.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
              </span>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Detailed Remarks / Explanation *</label>
              <textarea required rows={3} name="remarks" value={formData.remarks} onChange={handleChange} placeholder="Explain how the damage or loss occurred..." className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none bg-white transition-all resize-none" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Link href="/dashboard/inventory/wastage" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button type="submit" disabled={loading || (selectedProduct && parseInt(formData.quantity) > selectedProduct.available)} className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50 active:scale-[0.98]">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
              {loading ? 'Processing...' : 'Submit Write-Off Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}