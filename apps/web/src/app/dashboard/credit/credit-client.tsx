'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Plus, Loader2, Search, CheckCircle2, X, Phone, AlertCircle } from 'lucide-react';
import api from '../../../lib/api';

interface CreditAccount {
  id: string;
  customerName: string;
  phone: string;
  balance: number;
  status: string;
  lastTxDate?: string;
  createdAt?: string;
}

export default function CreditClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAccount, setNewAccount] = useState({ customerName: '', phone: '', balance: '' });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/credit');
        const data = res.data?.data || res.data || [];
        setAccounts(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load credit accounts', error);
        setAccounts([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchAccounts();
  }, [isMounted]);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const payload = {
        customerName: newAccount.customerName,
        phone: newAccount.phone,
        balance: Number(newAccount.balance) || 0,
        status: Number(newAccount.balance) > 0 ? 'Active' : 'Settled'
      };

      const res = await api.post('/credit', payload);
      const created = res.data?.data || res.data;
      
      if (created) {
        setAccounts([created, ...accounts]);
      } else {
        const refresh = await api.get('/credit');
        setAccounts(refresh.data?.data || refresh.data || []);
      }
      
      setIsModalOpen(false);
      setNewAccount({ customerName: '', phone: '', balance: '' });
    } catch (error) {
      console.error('Failed to add credit tab', error);
      alert('Failed to add credit account. Please try again.');
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

  const filtered = accounts.filter(acc => 
    (acc?.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (acc?.phone || '').includes(searchQuery)
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <CreditCard className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Customer Credit & Tabs</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Track customer store credit, outstanding balances, and active tabs.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5 shrink-0" /> Open Tab / Credit
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          
          {/* Edge-to-edge Search Bar */}
          <div className="p-4 sm:p-5 lg:p-6 border-b border-slate-100 bg-slate-50/50 w-full">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer name or phone..."
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
                <CreditCard className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No credit accounts found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">Try adjusting your search or open a new customer tab.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW: Card Layout to completely eliminate horizontal scrolling */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(acc => {
                  const balanceVal = Number(acc.balance || 0);
                  const displayDate = acc.lastTxDate || acc.createdAt;
                  
                  return (
                    <div key={acc.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-base font-bold text-slate-900 truncate">{acc.customerName}</h4>
                          <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-1.5 mt-1 truncate">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {acc.phone}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${balanceVal > 0 ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20' : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'}`}>
                          {balanceVal > 0 ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          {balanceVal > 0 ? 'Active Tab' : 'Settled'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Outstanding Balance</span>
                          <span className="text-base font-black text-slate-900">KES {balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        {displayDate && (
                          <div className="text-right">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Last Updated</span>
                            <span className="text-xs font-medium text-slate-500">{new Date(displayDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-3 py-4 text-right text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">
                      Outstanding Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(acc => {
                    const balanceVal = Number(acc.balance || 0);
                    const displayDate = acc.lastTxDate || acc.createdAt;

                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-bold text-slate-900 align-middle">
                          {acc.customerName}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-slate-500 align-middle">
                          <span className="inline-flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400 shrink-0" /> {acc.phone}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm align-middle">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs lg:text-sm font-bold whitespace-nowrap ${balanceVal > 0 ? 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20' : 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'}`}>
                            {balanceVal > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            {balanceVal > 0 ? 'Active Tab' : 'Settled'}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base text-slate-500 font-medium align-middle whitespace-nowrap">
                          {displayDate ? new Date(displayDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-3 py-4 text-sm lg:text-base font-black text-slate-900 text-right pr-6 lg:pr-8 align-middle whitespace-nowrap">
                          KES {balanceVal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                  <CreditCard className="h-6 w-6 text-blue-600" /> Open Customer Tab
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddAccount} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Customer Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newAccount.customerName} 
                    onChange={e => setNewAccount({...newAccount, customerName: e.target.value})}
                    disabled={isSubmitting} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="e.g., John Doe" 
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Phone Number</label>
                  <input 
                    required 
                    type="text" 
                    value={newAccount.phone} 
                    onChange={e => setNewAccount({...newAccount, phone: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="+254 700..." 
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Initial Credit Balance (KES)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    value={newAccount.balance} 
                    onChange={e => setNewAccount({...newAccount, balance: e.target.value})} 
                    disabled={isSubmitting}
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-50" 
                    placeholder="0.00" 
                  />
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
                    Save Account
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