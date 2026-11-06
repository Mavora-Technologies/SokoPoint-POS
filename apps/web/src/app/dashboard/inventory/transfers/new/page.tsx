'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRightLeft, ArrowLeft, Loader2, Send } from 'lucide-react';
import api from '../../../../../lib/api';

export default function NewBranchTransferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const branchesList = [
    'Main Supermarket',
    'CBD Express Outlet',
    'Westlands Branch',
    'South B Minimart'
  ];

  const productsList = [
    { id: '1', name: 'Premium Wheat Flour 2kg', sku: 'PWF-2KG-01', available: 450 },
    { id: '2', name: 'Fresh Milk 500ml', sku: 'FM-500-02', available: 1200 },
    { id: '3', name: 'Cooking Oil 3L', sku: 'CO-3L-99', available: 80 },
  ];

  const [formData, setFormData] = useState({
    sourceBranch: 'Main Supermarket',
    destinationBranch: '',
    productId: '',
    quantity: '',
    remarks: ''
  });

  const selectedProduct = productsList.find(p => p.id === formData.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (selectedProduct && parseInt(formData.quantity) > selectedProduct.available) {
      alert("Error: Transfer quantity exceeds available stock in the source branch.");
      setLoading(false);
      return;
    }

    // Simulate API delay
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard/inventory/transfers');
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <ArrowRightLeft className="h-7 w-7 text-blue-600 hidden sm:block" /> Request Branch Transfer
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">
            Initiate a secure stock transfer from one retail branch to another.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Branch Routing */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Source Branch (From) *</label>
              <select
                required
                name="sourceBranch"
                value={formData.sourceBranch}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
              >
                {branchesList.map((branch, idx) => (
                  <option key={idx} value={branch}>{branch}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Destination Branch (To) *</label>
              <select
                required
                name="destinationBranch"
                value={formData.destinationBranch}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
              >
                <option value="">-- Select Destination --</option>
                {branchesList.map((branch, idx) => (
                  <option key={idx} value={branch} disabled={branch === formData.sourceBranch}>{branch}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900 mb-6">Transfer Items</h3>
            </div>

            {/* Medicine & Quantity */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Product & SKU *</label>
              <select
                required
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all"
              >
                <option value="">-- Select Available Product --</option>
                {productsList.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.name} ({prod.sku}) - Available: {prod.available} units
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Transfer Quantity *</label>
              <input 
                required 
                type="number" 
                min="1"
                max={selectedProduct?.available || 9999}
                name="quantity" 
                value={formData.quantity} 
                onChange={handleChange}
                placeholder="e.g. 50"
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all" 
              />
              {selectedProduct && (
                <p className={`text-xs mt-2 font-bold ${parseInt(formData.quantity) > selectedProduct.available ? 'text-red-600' : 'text-emerald-600'}`}>
                  Stock remaining at Source after transfer: {Math.max(0, selectedProduct.available - (parseInt(formData.quantity) || 0))} units
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Remarks / Reason</label>
              <textarea 
                rows={3}
                name="remarks" 
                value={formData.remarks} 
                onChange={handleChange}
                placeholder="Optional notes regarding this transfer request..."
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none bg-white transition-all resize-none" 
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Link 
              href="/dashboard/inventory/transfers"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button 
              type="submit" 
              disabled={loading || (selectedProduct && parseInt(formData.quantity) > selectedProduct.available)}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {loading ? 'Processing...' : 'Submit Transfer Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}