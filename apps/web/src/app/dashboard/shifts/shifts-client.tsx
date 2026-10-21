'use client';

import { useState, useEffect } from 'react';
import { Clock, Plus, Loader2, CheckCircle2, User, ShieldCheck, X } from 'lucide-react';
import api from '../../../lib/api';

interface Shift {
  id: string;
  cashierName: string;
  tillName: string;
  status: string;
  startTime: string;
  endTime?: string;
  totalSales: number;
}

export default function ShiftsClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShift, setNewShift] = useState({ cashierName: 'Valary', tillName: 'Main Register 1' });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchShifts = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/shifts');
        setShifts(res.data.data);
      } catch (error) {
        console.error('Failed to load shifts', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchShifts();
  }, [isMounted]);

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/shifts', newShift);
      setShifts([res.data.data, ...shifts]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to start shift', error);
    }
  };

  const handleEndShift = async (id: string) => {
    try {
      const res = await api.patch(`/shifts/${id}/end`);
      setShifts(shifts.map(s => s.id === id ? res.data.data : s));
    } catch (error) {
      console.error('Failed to end shift', error);
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
                <Clock className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Shift Management</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Track cashier shift schedules, active hours, and reconciliation summaries.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5" /> Start New Shift
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh] w-full bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
          </div>
        ) : shifts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 text-slate-500 p-6 text-center">
            <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner border border-slate-100">
              <Clock className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
            </div>
            <p className="text-lg lg:text-xl font-bold text-slate-700">No shifts recorded yet</p>
            <p className="mt-2 text-sm lg:text-base text-slate-400">Start a new shift using the button above!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 w-full">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden hover:shadow-lg transition-all flex flex-col h-full">
                <div className="p-5 sm:p-6 lg:p-8 flex-1">
                  <div className="flex justify-between items-start mb-5 sm:mb-6">
                    <div className="p-3 sm:p-4 bg-blue-50 text-blue-600 rounded-xl lg:rounded-2xl shrink-0">
                      <User className="h-6 w-6 lg:h-7 lg:w-7" />
                    </div>
                    <span className={`inline-flex items-center rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold ring-1 ring-inset ${
                      shift.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-slate-100 text-slate-600 ring-slate-500/20'
                    }`}>
                      {shift.status}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 truncate">{shift.cashierName}</h3>
                  <p className="text-xs sm:text-sm font-mono text-slate-400 mb-5 truncate">{shift.tillName}</p>
                  
                  <div className="space-y-3 sm:space-y-4 text-sm sm:text-base text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Started:</span>
                      <span className="font-bold text-slate-900">
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Sales:</span>
                      <span className="font-black text-blue-600">KES {shift.totalSales.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 shrink-0">
                  {shift.status === 'Active' ? (
                    <button 
                      onClick={() => handleEndShift(shift.id)} 
                      className="w-full py-3 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-xl text-sm sm:text-base transition-colors shadow-sm"
                    >
                      End Shift
                    </button>
                  ) : (
                    <div className="text-center text-xs sm:text-sm text-slate-400 font-bold py-2">Shift Completed</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Start Shift Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-md lg:max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Clock className="h-6 w-6 text-blue-600" /> Start New Shift
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleStartShift} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Cashier Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newShift.cashierName} 
                    onChange={e => setNewShift({...newShift, cashierName: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Register / Till</label>
                  <input 
                    required 
                    type="text" 
                    value={newShift.tillName} 
                    onChange={e => setNewShift({...newShift, tillName: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm placeholder:text-slate-400" 
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
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Start Shift
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