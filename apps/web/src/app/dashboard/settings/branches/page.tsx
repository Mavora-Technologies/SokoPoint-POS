'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Edit2,
  Power,
  Store,
  AlertTriangle,
  X,
  Check,
  Loader2,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import api from '../../../../lib/api';

interface Branch {
  id: string;
  name: string;
  branchCode?: string;
  location: string;
  phone?: string;
  email?: string;
  isHeadquarters?: boolean;
  isActive: boolean;
  tenantId?: string;
}

const EMPTY_FORM = {
  name: '',
  branchCode: '',
  location: '',
  phone: '',
  email: '',
  isHeadquarters: false,
  isActive: true,
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/branches');
      const list = res.data?.data ?? res.data ?? [];
      setBranches(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error connecting to server');
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setCurrentBranch(null);
    setFormData(EMPTY_FORM);
    setIsModalOpen(true);
    setError('');
  };

  const handleOpenEdit = (branch: Branch) => {
    setIsEditMode(true);
    setCurrentBranch(branch);
    setFormData({
      name: branch.name || '',
      branchCode: branch.branchCode || '',
      location: branch.location || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isHeadquarters: Boolean(branch.isHeadquarters),
      isActive: Boolean(branch.isActive),
    });
    setIsModalOpen(true);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isEditMode && currentBranch?.id) {
        await api.put(`/branches/${currentBranch.id}`, formData);
      } else {
        await api.post('/branches', formData);
      }

      setSuccess(`Branch successfully ${isEditMode ? 'updated' : 'created'}`);
      setIsModalOpen(false);
      await fetchBranches();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error saving branch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    const newStatus = !branch.isActive;
    try {
      setTogglingId(branch.id);
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, isActive: newStatus } : b))
      );
      await api.put(`/branches/${branch.id}`, { isActive: newStatus });
      await fetchBranches();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to toggle status');
      await fetchBranches();
    } finally {
      setTogglingId(null);
    }
  };

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        (b.name || '').toLowerCase().includes(q) ||
        (b.branchCode || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q)
    );
  }, [branches, searchQuery]);

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col space-y-4 font-sans text-slate-800 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            Settings <span className="text-slate-300">/</span> Multi-Branch Topology
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Retail &amp; Wholesale Branches &amp; Stores
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            Configure retail locations, wholesale depots, and stock transfer hubs.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Retail Branch
          </button>
          <button
            type="button"
            onClick={fetchBranches}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-sm">
          <Check className="w-5 h-5" /> {success}
        </div>
      )}

      {error && !isModalOpen && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* Search Bar Card */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-[400px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search branch name, code, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow placeholder:text-slate-400"
          />
        </div>
        <div className="text-sm font-bold text-slate-500 shrink-0 px-2">
          {filteredBranches.length} Registered Outlet{filteredBranches.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-bold text-slate-500">Loading branch topology...</p>
          </div>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 border-dashed flex flex-col items-center justify-center min-h-[300px] text-center p-6 shadow-sm">
          <Store className="w-12 h-12 text-slate-300 mb-4" />
          <h3 className="text-lg font-extrabold text-slate-900">No branches found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            You haven&apos;t configured any retail outlets yet, or no branches match your search criteria.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="mt-5 text-blue-600 font-bold text-sm hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add your first branch
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start gap-2 mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-md">
                    {branch.isHeadquarters ? 'HQ' : 'Outlet'}
                  </span>
                  {branch.branchCode && (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded-md">
                      {branch.branchCode}
                    </span>
                  )}
                </div>

                {branch.isActive ? (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-wider rounded-md">
                    Active
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-100 text-[10px] font-black uppercase tracking-wider rounded-md">
                    Inactive
                  </span>
                )}
              </div>

              <h3 className="text-lg font-black text-slate-900 mb-2 truncate" title={branch.name}>
                {branch.name}
              </h3>

              <div className="space-y-1.5 text-slate-500 mb-6">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                  <span className="text-sm font-medium line-clamp-2 leading-tight">
                    {branch.location || 'No physical address provided'}
                  </span>
                </div>
                {branch.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{branch.email}</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={togglingId === branch.id}
                  onClick={() => handleToggleStatus(branch)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 ${
                    branch.isActive ? 'text-red-500 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  {branch.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEdit(branch)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isEditMode ? 'Edit Retail Branch' : 'Add New Branch'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage location details and status.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., Kilimani Hub"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Branch Code</label>
                <input
                  type="text"
                  value={formData.branchCode}
                  onChange={(e) => setFormData({ ...formData, branchCode: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., KLM-08"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Physical Address / Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="e.g., Wood Garden Road, Kilimani"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="+254 700..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="branch@store.co.ke"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHeadquarters}
                    onChange={(e) => setFormData({ ...formData, isHeadquarters: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600 cursor-pointer"
                  />
                  Headquarters / Depot
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-600 cursor-pointer"
                  />
                  Active &amp; Operational
                </label>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionLoading ? 'Saving...' : 'Save Branch'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}