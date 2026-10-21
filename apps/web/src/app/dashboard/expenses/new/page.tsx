'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import api from '../../../../lib/api';

export default function NewExpensePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Utilities',
    paymentMethod: 'Cash',
    reference: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await api.post('/expenses', {
        title: formData.title,
        amount: Number(formData.amount) || 0,
        category: formData.category,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference || null,
        notes: formData.notes || null,
      });
      router.push('/dashboard/expenses');
    } catch (error) {
      console.error('Failed to create expense', error);
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
            href="/dashboard/expenses"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Receipt className="h-6 w-6 text-blue-600" /> Record New Expense
            </h2>
            <p className="text-sm text-gray-500">Log store operational costs and expenditures into the system.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-900/5 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Title / Description</label>
            <input 
              required
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
              placeholder="e.g., Monthly Electricity Bill" 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
              <input 
                required
                type="number" 
                step="0.01"
                value={formData.amount} 
                onChange={e => setFormData({...formData, amount: e.target.value})} 
                className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
                placeholder="5000" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select 
                value={formData.category} 
                onChange={e => setFormData({...formData, category: e.target.value})} 
                className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none bg-white"
              >
                <option value="Utilities">Utilities</option>
                <option value="Inventory Restock">Inventory Restock</option>
                <option value="Salaries">Salaries</option>
                <option value="Rent">Rent</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select 
                value={formData.paymentMethod} 
                onChange={e => setFormData({...formData, paymentMethod: e.target.value})} 
                className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none bg-white"
              >
                <option value="Cash">Cash</option>
                <option value="M-Pesa">M-Pesa</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Receipt No. (Optional)</label>
              <input 
                type="text" 
                value={formData.reference} 
                onChange={e => setFormData({...formData, reference: e.target.value})} 
                className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none" 
                placeholder="e.g., MPESA-TX-9842" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea 
              rows={3}
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              className="w-full rounded-xl border-0 py-2.5 px-3.5 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm outline-none resize-none" 
              placeholder="Additional details about this expense..." 
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <Link 
              href="/dashboard/expenses"
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
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Save Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}