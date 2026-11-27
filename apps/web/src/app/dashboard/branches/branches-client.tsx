'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Power,
  Pencil,
  Loader2,
  X,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import api from '../../../lib/api';

interface Branch {
  id: string;
  name: string;
  branchCode: string;
  location: string;
  phone: string;
  email: string;
  isHeadquarters: boolean;
  isActive: boolean;
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

export default function BranchesClient() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Add / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/branches');
      const data = res.data?.data || [];
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch branches', err);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const filteredBranches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.branchCode || '').toLowerCase().includes(q) ||
        (b.location || '').toLowerCase().includes(q)
    );
  }, [branches, search]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setForm({
      name: branch.name || '',
      branchCode: branch.branchCode || '',
      location: branch.location || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isHeadquarters: Boolean(branch.isHeadquarters),
      isActive: Boolean(branch.isActive),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editingBranch) {
        await api.put(`/branches/${editingBranch.id}`, form);
      } else {
        await api.post('/branches', form);
      }
      setIsModalOpen(false);
      setEditingBranch(null);
      setForm(EMPTY_FORM);
      await loadBranches();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save branch. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      setTogglingId(branch.id);
      await api.put(`/branches/${branch.id}`, { isActive: !branch.isActive });
      await loadBranches();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update branch status.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 mb-1">
            Settings &nbsp;/&nbsp; <span className="text-[#041F56]">Multi-Branch Topology</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Retail &amp; Wholesale Branches &amp; Stores
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Configure multi-outlet supermarket locations, central warehouses, and stock transfer hubs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Store Branch
          </button>
          <button
            onClick={loadBranches}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search & Count Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-5 py-3.5 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branch name, code, or address..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4] focus:bg-white"
          />
        </div>
        <span className="text-xs font-bold text-[#041F56]">
          {filteredBranches.length} Registered {filteredBranches.length === 1 ? 'Outlet' : 'Outlets'}
        </span>
      </div>

      {/* Branch Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center space-y-2">
          <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-[#041F56]">No Branches Found</p>
          <p className="text-xs text-slate-400">
            Click <strong>Add Store Branch</strong> above to register your first retail or wholesale outlet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                        branch.isHeadquarters
                          ? 'bg-blue-50 text-[#0554F4]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {branch.isHeadquarters ? 'HEADQUARTERS' : 'OUTLET'}
                    </span>
                    {branch.branchCode && (
                      <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] font-bold text-slate-500">
                        {branch.branchCode}
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                      branch.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {branch.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                {/* Name & Details */}
                <div>
                  <h3 className="text-base font-extrabold text-[#041F56] truncate">{branch.name}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{branch.location || 'Address not configured'}</span>
                  </p>
                  {branch.phone && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 shrink-0" /> {branch.phone}
                    </p>
                  )}
                  {branch.email && (
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Mail className="h-3 w-3 shrink-0" /> {branch.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  disabled={togglingId === branch.id}
                  onClick={() => handleToggleStatus(branch)}
                  className={`inline-flex items-center gap-1.5 text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    branch.isActive
                      ? 'text-rose-600 hover:text-rose-700'
                      : 'text-emerald-600 hover:text-emerald-700'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                  {branch.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(branch)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT STORE BRANCH MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#041F56]">
                    {editingBranch ? 'Edit Store Branch' : 'New Store Branch'}
                  </h2>
                  <p className="text-xs text-slate-400">Outlet specifications and retail identity</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Westlands Supermarket Branch"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Code *</label>
                <input
                  required
                  type="text"
                  value={form.branchCode}
                  onChange={(e) => setForm({ ...form, branchCode: e.target.value.toUpperCase() })}
                  placeholder="WST-01"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono uppercase outline-none focus:border-[#0554F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Physical Street Address</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Waiyaki Way, Block B, Nairobi"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Phone Contact</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+254 700 000000"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="branch@store.co.ke"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#041F56] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isHeadquarters}
                    onChange={(e) => setForm({ ...form, isHeadquarters: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#0554F4]"
                  />
                  Central / Headquarters Store
                </label>

                <label className="inline-flex items-center gap-2 text-xs font-bold text-[#041F56] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-[#0554F4]"
                  />
                  Active Outlet
                </label>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingBranch ? 'Save Changes' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}