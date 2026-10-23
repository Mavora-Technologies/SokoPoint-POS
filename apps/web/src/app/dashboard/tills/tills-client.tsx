'use client';

import { useState, useEffect } from 'react';
import { Inbox, Plus, Loader2, MoreVertical, Banknote, User, Lock, Unlock, X, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

interface Till {
  id: string;
  name: string;
  branch: string;
  status: 'Open' | 'Closed';
  floatAmount: number;
  cashier: string | null;
  lastOpened: string | null;
}

export default function TillsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tills, setTills] = useState<Till[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTill, setSelectedTill] = useState<Till | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchTills = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/tills');
        setTills(response.data.data);
      } catch (error) {
        console.error('Failed to fetch tills', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchTills();
  }, [isMounted]);

  const handleAddTill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: `New Register ${tills.length + 1}`,
        branch: 'Nairobi CBD Flagship',
        status: 'Closed',
        floatAmount: 0
      };
      const response = await api.post('/tills', payload);
      setTills([...tills, response.data.data]);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create till', error);
    }
  };

  const toggleTillStatus = async (till: Till) => {
    const isOpening = till.status === 'Closed';
    const payload = {
      status: isOpening ? 'Open' : 'Closed',
      cashier: isOpening ? 'Valary' : null,
      floatAmount: isOpening ? 5000 : 0,
      lastOpened: isOpening ? new Date().toISOString() : null
    };

    try {
      const response = await api.patch(`/tills/${till.id}/status`, payload);
      setTills(tills.map(t => t.id === till.id ? response.data.data : t));
      setSelectedTill(null); 
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8 lg:space-y-10">
        
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl sm:rounded-2xl text-blue-600 shrink-0">
                <Inbox className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Cash Registers (Tills)</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Manage daily cash floats, assign cashiers, and monitor register sessions.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5" /> Add Register
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh] w-full bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
          </div>
        ) : tills.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 text-slate-500 p-6 text-center">
            <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
              <Inbox className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
            </div>
            <p className="text-lg lg:text-xl font-bold text-slate-700">No registers found</p>
            <p className="mt-2 text-sm lg:text-base text-slate-400">Click the button above to add your first till!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 w-full">
            {tills.map((till) => (
              <div key={till.id} className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col h-full group">
                <div className="p-5 sm:p-6 lg:p-8 flex-1">
                  <div className="flex justify-between items-start mb-5 sm:mb-6">
                    <div className={`p-3 sm:p-4 rounded-xl lg:rounded-2xl transition-colors shrink-0 ${
                      till.status === 'Open' ? 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-600 group-hover:text-white'
                    }`}>
                      {till.status === 'Open' ? <Unlock className="h-6 w-6 lg:h-7 lg:w-7" /> : <Lock className="h-6 w-6 lg:h-7 lg:w-7" />}
                    </div>
                    <span className={`inline-flex items-center rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold ring-1 ring-inset ${
                      till.status === 'Open' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'
                    }`}>
                      {till.status}
                    </span>
                  </div>
                  
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5 truncate">{till.name}</h3>
                  <div className="text-xs sm:text-sm font-mono text-slate-400 mb-5 line-clamp-2">
                    {till.id}
                    <span className="block mt-0.5 text-slate-500 font-sans">{till.branch}</span>
                  </div>
                  
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <span className="flex items-center text-slate-500">
                        <Banknote className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" /> Float
                      </span>
                      <span className="font-black text-slate-900 truncate pl-2">KES {till.floatAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm sm:text-base">
                      <span className="flex items-center text-slate-500">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" /> Cashier
                      </span>
                      <span className="font-bold text-slate-900 truncate pl-2">{till.cashier || 'None'}</span>
                    </div>
                    {till.lastOpened && (
                      <div className="flex items-center justify-between text-sm sm:text-base">
                        <span className="flex items-center text-slate-500">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" /> Opened
                        </span>
                        <span className="font-medium text-slate-900 truncate pl-2">
                          {new Date(till.lastOpened).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex justify-between items-center shrink-0">
                  <button 
                    onClick={() => setSelectedTill(till)} 
                    className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-800 transition-colors p-1 -ml-1"
                  >
                    Manage Till
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors -mr-2">
                    <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manage Till Modal */}
        {selectedTill && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-md lg:max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Inbox className="h-6 w-6 text-blue-600" /> Till Management
                </h3>
                <button 
                  onClick={() => setSelectedTill(null)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-5 sm:p-6 lg:p-8">
                <div className="text-center mb-8 sm:mb-10">
                  <div className={`h-20 w-20 sm:h-24 sm:w-24 rounded-3xl mx-auto flex items-center justify-center mb-4 sm:mb-5 shadow-inner border ${
                    selectedTill.status === 'Open' ? 'bg-green-50 text-green-600 border-green-100/50' : 'bg-slate-100 text-slate-500 border-slate-200/50'
                  }`}>
                    {selectedTill.status === 'Open' ? <Unlock className="h-10 w-10 sm:h-12 sm:w-12" /> : <Lock className="h-10 w-10 sm:h-12 sm:w-12" />}
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-slate-900">{selectedTill.name}</h4>
                  <p className="text-xs sm:text-sm font-mono text-slate-400 mt-2 truncate">ID: {selectedTill.id}</p>
                  <span className={`mt-4 inline-flex items-center rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold ring-1 ring-inset ${
                    selectedTill.status === 'Open' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-slate-100 text-slate-700 ring-slate-400/20'
                  }`}>
                    Status: {selectedTill.status}
                  </span>
                </div>

                <div className="space-y-4 sm:space-y-5 bg-slate-50 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl ring-1 ring-slate-200/60 mb-8 sm:mb-10">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-200 pb-4 gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-slate-500">Current Float</span>
                    <span className="text-base sm:text-lg font-black text-slate-900">KES {selectedTill.floatAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-slate-500">Active Cashier</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900">{selectedTill.cashier || 'None'}</span>
                  </div>
                </div>

                <div className="mt-auto">
                  {selectedTill.status === 'Closed' ? (
                    <button 
                      onClick={() => toggleTillStatus(selectedTill)} 
                      className="w-full py-4 sm:py-5 bg-blue-600 text-white font-bold rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 text-sm sm:text-base active:scale-[0.98] touch-manipulation"
                    >
                      <Unlock className="mr-2.5 h-5 w-5 sm:h-6 sm:w-6" /> Open Register (Set Float: KES 5,000)
                    </button>
                  ) : (
                    <button 
                      onClick={() => toggleTillStatus(selectedTill)} 
                      className="w-full py-4 sm:py-5 bg-red-600 text-white font-bold rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 text-sm sm:text-base active:scale-[0.98] touch-manipulation"
                    >
                      <Lock className="mr-2.5 h-5 w-5 sm:h-6 sm:w-6" /> Close Register & Z-Read
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Till Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 text-center my-auto">
              <div className="mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-blue-50 mb-5 sm:mb-6 shadow-inner border border-blue-100/50">
                <Inbox className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">Create New Register</h3>
              <p className="text-sm sm:text-base text-slate-500 mb-8 sm:mb-10 leading-relaxed px-2">
                Instantly provision a new digital till for the Nairobi CBD Flagship branch.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="flex-1 py-3.5 sm:py-4 bg-slate-100 text-slate-700 text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <form onSubmit={handleAddTill} className="flex-1">
                  <button 
                    type="submit" 
                    className="w-full py-3.5 sm:py-4 bg-blue-600 text-white text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl hover:bg-blue-700 transition-colors flex items-center justify-center shadow-md shadow-blue-600/20 active:scale-[0.98] touch-manipulation"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Create
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
