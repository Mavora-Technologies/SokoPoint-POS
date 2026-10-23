'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../lib/api';

export default function NewCustomerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    points: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await api.post('/customers', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        points: Number(formData.points) || 0,
      });
      router.push('/dashboard/customers');
    } catch (error) {
      console.error('Failed to create customer', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/customers"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" /> Add New Customer
            </h2>
            <p className="text-sm text-gray-500">Register a new client profile into the POS system.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Full Name</label>
            <input 
              required
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
              placeholder="e.g., Brenda Chebet" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
              placeholder="e.g., brenda@gmail.com" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input 
              required
              type="text" 
              value={formData.phone} 
              onChange={e => setFormData({...formData, phone: e.target.value})} 
              className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
              placeholder="e.g., +254711998877" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Initial Loyalty Points</label>
            <input 
              type="number" 
              value={formData.points} 
              onChange={e => setFormData({...formData, points: Number(e.target.value)})} 
              className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
              placeholder="0" 
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Link 
              href="/dashboard/customers"
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm flex items-center shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save Customer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
