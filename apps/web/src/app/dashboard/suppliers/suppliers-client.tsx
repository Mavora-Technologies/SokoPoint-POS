'use client';

import { useState, useEffect } from 'react';
import { Truck, Plus, Loader2, Search, CheckCircle2, X, Phone, Mail, User } from 'lucide-react';
import api from '../../../lib/api';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email?: string;
  phone: string;
  category: string;
}

export default function SuppliersClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: '', contactPerson: '', email: '', phone: '', category: 'Beverages' });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/suppliers');
        setSuppliers(res.data.data);
      } catch (error) {
        console.error('Failed to load suppliers', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchSuppliers();
  }, [isMounted]);

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/suppliers', newSupplier);
      setSuppliers([res.data.data, ...suppliers]);
      setIsModalOpen(false);
      setNewSupplier({ name: '', contactPerson: '', email: '', phone: '', category: 'Beverages' });
    } catch (error) {
      console.error('Failed to add supplier', error);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Truck className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Supplier Directory</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Manage vendor contact details, categories, and supply chains.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Supplier
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
                placeholder="Search suppliers by name or contact..."
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
                <Truck className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
              </div>
              <p className="text-lg lg:text-xl font-bold text-slate-700">No suppliers found</p>
              <p className="mt-2 text-sm lg:text-base text-slate-400">Try adjusting your search or add a new supplier.</p>
            </div>
          ) : (
            <div className="w-full">
              {/* MOBILE/TABLET VIEW: Card Layout to completely eliminate horizontal scrolling */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filtered.map(sup => (
                  <div key={sup.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{sup.name}</h4>
                        <p className="text-sm text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {sup.contactPerson}
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                        {sup.category}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-sm text-slate-500">
                      <p className="flex items-center gap-2 truncate">
                        <Phone className="h-4 w-4 text-slate-400 shrink-0" /> {sup.phone}
                      </p>
                      <p className="flex items-center gap-2 truncate">
                        <Mail className="h-4 w-4 text-slate-400 shrink-0" /> {sup.email || '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Table Layout for larger screens */}
              <table className="hidden md:table min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-4 pl-6 lg:pl-8 pr-3 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Supplier Name
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Contact Person
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-3 py-4 text-left text-xs lg:text-sm font-bold text-slate-500 uppercase tracking-wider pr-6 lg:pr-8">
                      Email
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map(sup => (
                    <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-4 pl-6 lg:pl-8 pr-3 text-sm lg:text-base font-bold text-slate-900 align-middle">
                        {sup.name}
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base text-slate-600 font-medium align-middle">
                        {sup.contactPerson}
                      </td>
                      <td className="px-3 py-4 text-sm align-middle">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs lg:text-sm font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          {sup.category}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base text-slate-500 align-middle">
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" /> {sup.phone}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-sm lg:text-base text-slate-500 pr-6 lg:pr-8 align-middle">
                        {sup.email ? (
                          <span className="inline-flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400 shrink-0" /> {sup.email}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
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
                  <Truck className="h-6 w-6 text-blue-600" /> Add New Supplier
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddSupplier} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Company Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newSupplier.name} 
                    onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
                    placeholder="e.g., Coca-Cola Beverages" 
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Contact Person</label>
                  <input 
                    required 
                    type="text" 
                    value={newSupplier.contactPerson} 
                    onChange={e => setNewSupplier({...newSupplier, contactPerson: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
                    placeholder="e.g., James Mwangi" 
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Phone</label>
                    <input 
                      required 
                      type="text" 
                      value={newSupplier.phone} 
                      onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} 
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
                      placeholder="+254 700..." 
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Category</label>
                    <input 
                      type="text" 
                      value={newSupplier.category} 
                      onChange={e => setNewSupplier({...newSupplier, category: e.target.value})} 
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
                      placeholder="Beverages" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    value={newSupplier.email} 
                    onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
                    placeholder="supplier@example.com" 
                  />
                </div>
                
                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)} 
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-blue-600/20"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Save Supplier
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
