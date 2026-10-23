'use client';

import { useState, useEffect } from 'react';
import { Store, MapPin, Users, Phone, Plus, Loader2, MoreVertical, Building2, X, CheckCircle2 } from 'lucide-react';
import api from '../../../lib/api';

interface Branch {
  id: string;
  name: string;
  location: string;
  manager: string;
  phone: string;
  status: 'Active' | 'Maintenance' | 'Opening Soon';
  staffCount: number;
}

export default function BranchesClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [newBranch, setNewBranch] = useState({
    name: '', location: '', manager: '', phone: '', status: 'Active' as const, staffCount: 0
  });

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/branches');
        setBranches(response.data.data);
      } catch (error) {
        console.error('Failed to fetch branches', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isMounted) fetchBranches();
  }, [isMounted]);

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/branches', newBranch);
      setBranches([...branches, response.data.data]);
      setIsAddModalOpen(false);
      setNewBranch({ name: '', location: '', manager: '', phone: '', status: 'Active', staffCount: 0 });
    } catch (error) {
      console.error('Failed to create branch', error);
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
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </div>
              <span className="truncate">Branch Management</span>
            </h2>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-slate-500 font-medium max-w-3xl">
              Monitor and manage your retail locations, staff distribution, and operational status.
            </p>
          </div>
          <div className="shrink-0 mt-2 sm:mt-0 w-full sm:w-auto">
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="flex items-center justify-center w-full sm:w-auto rounded-xl sm:rounded-2xl bg-blue-600 px-5 sm:px-6 py-3.5 sm:py-4 text-sm sm:text-base font-bold text-white shadow-sm hover:bg-blue-500 hover:shadow-md transition-all active:scale-[0.98] touch-manipulation"
            >
              <Plus className="mr-2 h-5 w-5" /> Add New Branch
            </button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex justify-center items-center h-[50vh] w-full bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200">
            <Loader2 className="h-10 w-10 lg:h-12 lg:w-12 animate-spin text-blue-600" />
          </div>
        ) : branches.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 text-slate-500 p-6 text-center">
            <div className="h-20 w-20 lg:h-24 lg:w-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 lg:mb-6 shadow-inner">
              <Building2 className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
            </div>
            <p className="text-lg lg:text-xl font-bold text-slate-700">No branches found</p>
            <p className="mt-2 text-sm lg:text-base text-slate-400">Click the button above to add your first location!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 lg:gap-8 w-full">
            {branches.map((branch) => (
              <div key={branch.id} className="bg-white rounded-2xl lg:rounded-3xl shadow-sm ring-1 ring-slate-200 overflow-hidden hover:shadow-lg hover:ring-blue-600/20 transition-all group flex flex-col h-full">
                <div className="p-5 sm:p-6 lg:p-8 flex-1">
                  <div className="flex justify-between items-start mb-5 sm:mb-6">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-xl lg:rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                      <Store className="h-6 w-6 lg:h-7 lg:w-7" />
                    </div>
                    <span className={`inline-flex items-center rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold ring-1 ring-inset ${
                      branch.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                      branch.status === 'Maintenance' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' : 
                      'bg-blue-50 text-blue-800 ring-blue-600/20'
                    }`}>
                      {branch.status}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1.5 truncate">{branch.name}</h3>
                  <p className="text-xs sm:text-sm font-mono text-slate-400 mb-5 truncate">ID: {branch.id}</p>
                  <div className="space-y-3.5 sm:space-y-4">
                    <div className="flex items-start gap-3 text-sm sm:text-base text-slate-600">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{branch.location}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm sm:text-base text-slate-600">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{branch.manager} <span className="text-slate-400 font-medium">({branch.staffCount} Staff)</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm sm:text-base text-slate-600">
                      <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 shrink-0" />
                      <span className="truncate">{branch.phone}</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 flex justify-between items-center shrink-0">
                  <button onClick={() => setSelectedBranch(branch)} className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-800 transition-colors p-1 -ml-1">
                    View Details
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors -mr-2">
                    <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Branch Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">Add New Branch</h3>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleAddBranch} className="p-5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Branch Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newBranch.name} 
                    onChange={(e) => setNewBranch({...newBranch, name: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm" 
                    placeholder="e.g., Mombasa Flagship" 
                  />
                </div>
                <div>
                  <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Location Address</label>
                  <input 
                    required 
                    type="text" 
                    value={newBranch.location} 
                    onChange={(e) => setNewBranch({...newBranch, location: e.target.value})} 
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm" 
                    placeholder="e.g., Moi Avenue, Mombasa" 
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Manager Name</label>
                    <input 
                      required 
                      type="text" 
                      value={newBranch.manager} 
                      onChange={(e) => setNewBranch({...newBranch, manager: e.target.value})} 
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm" 
                      placeholder="John Doe" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Phone Number</label>
                    <input 
                      required 
                      type="text" 
                      value={newBranch.phone} 
                      onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})} 
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm" 
                      placeholder="+254 700..." 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Status</label>
                    <select 
                      value={newBranch.status} 
                      onChange={(e) => setNewBranch({...newBranch, status: e.target.value as any})} 
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm appearance-none bg-white"
                    >
                      <option value="Active">Active</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Opening Soon">Opening Soon</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">Staff Count</label>
                    <input 
                      required 
                      type="number" 
                      min="0" 
                      value={newBranch.staffCount} 
                      onChange={(e) => setNewBranch({...newBranch, staffCount: parseInt(e.target.value) || 0})} 
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-200 py-3 sm:py-3.5 px-4 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all text-sm sm:text-base shadow-sm" 
                    />
                  </div>
                </div>
                
                <div className="pt-6 border-t border-slate-100 mt-8 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                  <button 
                    type="button" 
                    onClick={() => setIsAddModalOpen(false)} 
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-slate-700 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="w-full sm:w-auto px-6 py-3.5 sm:py-3 text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shadow-md shadow-blue-600/20"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Save Branch
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {selectedBranch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
              <div className="flex items-center justify-between p-5 sm:p-6 lg:p-8 border-b border-slate-100 bg-white sticky top-0 z-10">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-3">
                  <Store className="h-6 w-6 text-blue-600" /> Branch Profile
                </h3>
                <button 
                  onClick={() => setSelectedBranch(null)} 
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="p-5 sm:p-6 lg:p-8">
                <div className="text-center mb-8 sm:mb-10">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 bg-blue-50 text-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-4 sm:mb-5 shadow-inner border border-blue-100/50">
                    <Building2 className="h-10 w-10 sm:h-12 sm:w-12" />
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-black text-slate-900">{selectedBranch.name}</h4>
                  <p className="text-xs sm:text-sm font-mono text-slate-400 mt-2 truncate">ID: {selectedBranch.id}</p>
                  <span className={`mt-4 inline-flex items-center rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold ring-1 ring-inset ${
                    selectedBranch.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20' : 
                    selectedBranch.status === 'Maintenance' ? 'bg-yellow-50 text-yellow-800 ring-yellow-600/20' : 
                    'bg-blue-50 text-blue-800 ring-blue-600/20'
                  }`}>
                    {selectedBranch.status}
                  </span>
                </div>
                
                <div className="space-y-4 sm:space-y-5 bg-slate-50 p-5 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl ring-1 ring-slate-200/60">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-200 pb-4 gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-slate-500 flex items-center shrink-0">
                      <MapPin className="h-5 w-5 mr-2" /> Location
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900 sm:text-right break-words">{selectedBranch.location}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-200 pb-4 gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-slate-500 flex items-center shrink-0">
                      <Users className="h-5 w-5 mr-2" /> Manager
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900">{selectedBranch.manager}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-b border-slate-200 pb-4 gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-slate-500 flex items-center shrink-0">
                      <Phone className="h-5 w-5 mr-2" /> Phone
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900">{selectedBranch.phone}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
                    <span className="text-sm sm:text-base font-bold text-slate-500 flex items-center shrink-0">
                      <Users className="h-5 w-5 mr-2" /> Total Staff
                    </span>
                    <span className="text-sm sm:text-base font-bold text-slate-900">{selectedBranch.staffCount} Employees</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 sm:p-5 lg:p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setSelectedBranch(null)} 
                  className="w-full py-3.5 sm:py-4 bg-white border border-slate-300 text-slate-700 text-sm sm:text-base font-bold rounded-xl sm:rounded-2xl hover:bg-slate-100 transition-colors shadow-sm"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
