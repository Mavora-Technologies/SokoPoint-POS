'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  FileText,
  Smartphone,
  Package,
  Power,
  Pencil,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string | null;
  kraPin?: string | null;
  phone?: string | null;
  email?: string | null;
  paymentTerms: string;
  leadTimeDays: number;
  mpesaPaybill?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  address?: string | null;
  isActive: boolean;
  skuCount: number;
}

const EMPTY_FORM = {
  name: '',
  contactPerson: '',
  kraPin: '',
  phone: '',
  email: '',
  paymentTerms: 'NET_30',
  leadTimeDays: '2',
  mpesaPaybill: '',
  bankName: '',
  bankAccount: '',
  address: '',
  isActive: true,
};

export default function SuppliersRegistryPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);
      const res = await api.get('/inventory/suppliers');
      setSuppliers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load suppliers directory.');
      }
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      name: s.name || '',
      contactPerson: s.contactPerson || '',
      kraPin: s.kraPin || '',
      phone: s.phone || '',
      email: s.email || '',
      paymentTerms: s.paymentTerms || 'NET_30',
      leadTimeDays: String(s.leadTimeDays ?? 2),
      mpesaPaybill: s.mpesaPaybill || '',
      bankName: s.bankName || '',
      bankAccount: s.bankAccount || '',
      address: s.address || '',
      isActive: Boolean(s.isActive),
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      const payload = {
        ...form,
        leadTimeDays: Number(form.leadTimeDays) || 2,
      };
      if (editingId) {
        await api.put(`/inventory/suppliers/${editingId}`, payload);
      } else {
        await api.post('/inventory/suppliers', payload);
      }
      setIsModalOpen(false);
      await loadSuppliers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save supplier profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: Supplier) => {
    try {
      setTogglingId(s.id);
      await api.patch(`/inventory/suppliers/${s.id}/toggle`);
      await loadSuppliers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update supplier status.');
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = useMemo(() => {
    return suppliers.filter((s) => {
      if (statusFilter === 'ACTIVE' && !s.isActive) return false;
      if (statusFilter === 'DISABLED' && s.isActive) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.kraPin || '').toLowerCase().includes(q)
      );
    });
  }, [suppliers, statusFilter, search]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
            Approved Suppliers &amp; Vendor Registry
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Configure wholesale distributors, lead times, credit payment terms, KRA fiscal PINs, and M-Pesa B2B channels.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadSuppliers}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Vendor Profile
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex justify-between items-center">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
          {isUnauthorized && (
            <Link href="/login" className="px-3 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1">
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>
      )}

      {/* Search & Status Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, contact person, phone, or KRA PIN..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { key: 'ALL', label: `All (${suppliers.length})` },
            { key: 'ACTIVE', label: 'Active' },
            { key: 'DISABLED', label: 'Disabled' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                statusFilter === tab.key ? 'bg-[#041F56] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="h-9 w-9 animate-spin text-[#0554F4]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-100 text-slate-400">
          <Building2 className="h-10 w-10 mx-auto mb-2 text-slate-300" />
          <p className="font-bold text-slate-700">No supplier profiles found</p>
          <p className="text-xs mt-1">Click Add Vendor Profile to register your first wholesale distributor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-3xl p-5 shadow-sm border transition-all flex flex-col justify-between gap-4 ${
                s.isActive ? 'border-slate-100' : 'border-slate-200 opacity-75'
              }`}
            >
              <div className="space-y-3">
                {/* Top Badges */}
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#0554F4] text-[10px] font-black uppercase">
                    {(s.paymentTerms || 'NET_30').replace('_', ' ')}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      s.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {s.isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>
                </div>

                {/* Title & Contact */}
                <div>
                  <h2 className="text-sm font-black text-[#041F56]">{s.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contact: {s.contactPerson || 'Not specified'}
                  </p>
                </div>

                {/* Details */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                  {s.phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{s.phone}</span>
                    </p>
                  )}
                  {s.email && (
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.email}</span>
                    </p>
                  )}
                  {s.kraPin && (
                    <p className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">PIN: {s.kraPin}</span>
                    </p>
                  )}
                  {s.mpesaPaybill && (
                    <p className="flex items-center gap-2 text-emerald-700 font-semibold">
                      <Smartphone className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono text-[11px]">Paybill / Till: {s.mpesaPaybill}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-slate-500">
                  <span className="inline-flex items-center gap-1 font-bold text-[#041F56]">
                    <Package className="h-3.5 w-3.5 text-[#0554F4]" /> {s.skuCount} SKUs
                  </span>
                  <span>|</span>
                  <span>{s.leadTimeDays}d lead</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(s)}
                    disabled={togglingId === s.id}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                    title={s.isActive ? 'Disable supplier' : 'Activate supplier'}
                  >
                    {togglingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Power className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(s)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0554F4] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW / EDIT SUPPLIER PROFILE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl text-[#0554F4]">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#041F56]">
                    {editingId ? 'Edit Supplier Profile' : 'New Supplier Profile'}
                  </h2>
                  <p className="text-xs text-[#176E84]">Wholesale vendor details and payment credentials</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Supplier Business Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Unga & Millers Wholesale Distributors Ltd"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Contact Representative</label>
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    placeholder="e.g. Jane Kariuki"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">KRA Tax PIN</label>
                  <input
                    type="text"
                    value={form.kraPin}
                    onChange={(e) => setForm({ ...form, kraPin: e.target.value })}
                    placeholder="P051234567Z"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+254 700 000000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Orders Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="orders@vendor.co.ke"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Payment Terms *</label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="NET_30">Net 30 Days Credit</option>
                    <option value="NET_14">Net 14 Days Credit</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="PREPAID">Prepaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Lead Time (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Disbursement Credentials Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  DISBURSEMENT CREDENTIALS (B2B &amp; BANKING)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">M-Pesa Paybill / Till</label>
                    <input
                      type="text"
                      value={form.mpesaPaybill}
                      onChange={(e) => setForm({ ...form, mpesaPaybill: e.target.value })}
                      placeholder="e.g. 522522"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name &amp; Branch</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      placeholder="e.g. KCB Bank Industrial Area"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={form.bankAccount}
                    onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                    placeholder="e.g. 1100223344"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Physical Warehouse / Depot</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Enterprise Road, Industrial Area, Nairobi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-[#041F56] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="accent-[#0554F4] h-4 w-4"
                />
                <span>Active Supplier (Available for PO requisitions)</span>
              </label>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Create Vendor Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}