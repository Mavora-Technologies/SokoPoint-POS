'use client';

import { useState, useEffect } from 'react';
import { Receipt, Plus, Loader2, Search, CheckCircle2, X, DollarSign, Tag, Calendar, CreditCard } from 'lucide-react';
import api from '../../../lib/api';

interface Expense {
  id: string;
  title?: string;
  notes?: string;
  amount: number;
  category?: string;
  categoryName?: string;
  date?: string;
  createdAt?: string;
  paymentMethod?: string;
}

export default function ExpensesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState({ notes: '', amount: '', categoryName: 'Utilities', paymentMethod: 'Cash' });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/expenses');
        const data = res.data?.data || res.data || [];
        setExpenses(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load expenses', error);
        setExpenses([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchExpenses();
  }, [isMounted]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        notes: newExpense.notes,
        amount: Number(newExpense.amount),
        categoryName: newExpense.categoryName,
        paymentMethod: newExpense.paymentMethod,
        userName: 'Admin'
      };
      
      const res = await api.post('/expenses', payload);
      const created = res.data?.data || res.data;
      if (created) {
        setExpenses([created, ...expenses]);
      } else {
        // Fallback reload if API doesn't return the created object
        const refresh = await api.get('/expenses');
        setExpenses(refresh.data?.data || refresh.data || []);
      }
      
      setIsModalOpen(false);
      setNewExpense({ notes: '', amount: '', categoryName: 'Utilities', paymentMethod: 'Cash' });
    } catch (error) {
      console.error('Failed to add expense', error);
      alert('Failed to save expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = expenses.filter(e => {
    const title = e?.notes || e?.title || '';
    const cat = e?.categoryName || e?.category || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           cat.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const totalExpenses = expenses.reduce((sum, item) => sum + (Number(item?.amount) || 0), 0);

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Receipt className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Expense Management</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Track and categorize store operational costs and expenditures.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5 shrink-0" /> Add Expense
            </button>
          </div>
        </div>

        {/* Total Expenses Summary Card */}
        <div className="bg-white p-5 sm:p-6 lg:p-8 rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 flex items-center gap-4 sm:gap-6 w-full overflow-hidden">
          <div className="p-3 sm:p-4 bg-red-50 text-red-600 rounded-xl lg:rounded-2xl shrink-0">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-semibold text-slate-500 truncate mb-1">Total Recorded Expenses</p>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight whitespace-nowrap">
              KES {totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search expenses by title or category..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm sm:text-base outline-none transition-all shadow-sm placeholder:text-slate-400"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[40vh] w-full">
              <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-slate-500 p-6 text-center">
              <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
                <Receipt className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No expenses found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">Try adjusting your search or add a new expense.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(item => {
                  const title = item.notes || item.title || 'Unnamed Expense';
                  const category = item.categoryName || item.category || 'Uncategorized';
                  const dateVal = item.createdAt || item.date;
                  const displayDate = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';
                  
                  return (
                    <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base font-bold text-slate-900 leading-snug truncate">{title}</h4>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700">
                              <Tag className="h-3 w-3" /> {category}
                            </span>
                            {item.paymentMethod && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                                <CreditCard className="h-3 w-3" /> {item.paymentMethod}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-base sm:text-lg font-black text-red-600 shrink-0">
                          KES {(Number(item.amount) || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="inline-flex items-center text-xs font-medium text-slate-400">
                          <Calendar className="mr-1.5 h-3.5 w-3.5" /> {displayDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider w-1/3">
                      Description
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(item => {
                    const title = item.notes || item.title || 'Unnamed Expense';
                    const category = item.categoryName || item.category || 'Uncategorized';
                    const dateVal = item.createdAt || item.date;
                    const displayDate = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-bold text-slate-900 align-middle">
                          {title}
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                            <Tag className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> {category}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-slate-500 align-middle whitespace-nowrap">
                          {displayDate}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-slate-500 align-middle">
                          {item.paymentMethod || '-'}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-black text-red-600 text-right pr-6 lg:pr-8 align-middle whitespace-nowrap">
                          KES {(Number(item.amount) || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Responsive Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-lg lg:max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Receipt className="h-6 w-6 text-blue-600" /> Add New Expense
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Description / Title</label>
                  <input 
                    required 
                    type="text" 
                    value={newExpense.notes} 
                    onChange={e => setNewExpense({...newExpense, notes: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="e.g., Monthly Electricity Bill" 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Amount (KES)</label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0"
                      value={newExpense.amount} 
                      onChange={e => setNewExpense({...newExpense, amount: e.target.value})} 
                      disabled={isSubmitting}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Payment Method</label>
                    <select 
                      value={newExpense.paymentMethod} 
                      onChange={e => setNewExpense({...newExpense, paymentMethod: e.target.value})} 
                      disabled={isSubmitting}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm appearance-none bg-white disabled:opacity-50 disabled:bg-slate-50"
                    >
                      <option value="Cash">Cash</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Card">Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Category</label>
                  <select 
                    value={newExpense.categoryName} 
                    onChange={e => setNewExpense({...newExpense, categoryName: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm appearance-none bg-white disabled:opacity-50 disabled:bg-slate-50"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Operations">Operations</option>
                    <option value="Inventory Restock">Inventory Restock</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Rent">Rent</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>
                
                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-blue-600/20 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />} 
                    Save Expense
                  </button>
                </div>
              </form>
              
            </div>
          </div>
        )}

      </div>
    </div>
  );
}