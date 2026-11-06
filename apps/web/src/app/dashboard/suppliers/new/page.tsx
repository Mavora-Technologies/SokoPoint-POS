'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowLeft, Loader2, Save } from 'lucide-react';

export default function RegisterSupplierPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '', contactPerson: '', phone: '', email: '', kraPin: '', paymentTerms: 'Net 30'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/dashboard/suppliers');
    }, 800);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        
        <div className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Truck className="h-7 w-7 text-blue-600 hidden sm:block" /> Register New Supplier
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium sm:ml-10">Add a new wholesale vendor to the approved procurement list.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Company Name *</label>
              <input required type="text" name="companyName" value={formData.companyName} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Contact Person *</label>
              <input required type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Phone Number *</label>
              <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Email Address *</label>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">KRA PIN</label>
              <input type="text" name="kraPin" value={formData.kraPin} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Default Payment Terms *</label>
              <select required name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="w-full border border-slate-200 rounded-xl p-3.5 text-sm font-medium bg-white focus:ring-2 focus:ring-blue-600 outline-none transition-all">
                <option value="Cash on Delivery">Cash on Delivery</option>
                <option value="Net 15">Net 15 Days</option>
                <option value="Net 30">Net 30 Days</option>
                <option value="Net 60">Net 60 Days</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-slate-100">
            <Link href="/dashboard/suppliers" className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-[0.98]">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {loading ? 'Registering...' : 'Register Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}