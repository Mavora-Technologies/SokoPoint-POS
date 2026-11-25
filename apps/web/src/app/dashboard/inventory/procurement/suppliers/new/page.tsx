'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, X, Loader2, AlertCircle } from 'lucide-react';
import api from '../../../../../../lib/api';

export default function NewSupplierPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Supplier Business Name is required.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await api.post('/inventory/suppliers', {
        ...form,
        leadTimeDays: Math.max(0, Number(form.leadTimeDays) || 2),
      });
      router.push('/dashboard/inventory/procurement/suppliers');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create supplier profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] flex items-center justify-center px-4 py-8 font-sans">
      <div className="bg-white rounded-3xl max-w-[540px] w-full p-6 sm:p-7 shadow-xl border border-slate-200/70">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#041F56]">New Supplier Profile</h1>
              <p className="text-xs text-[#176E84]">Wholesale vendor details and payment credentials</p>
            </div>
          </div>
          <Link
            href="/dashboard/inventory/procurement/suppliers"
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-[#041F56] mb-1.5">Supplier Business Name *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Unga & Millers Wholesale Distributors Ltd"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0554F4] focus:ring-1 focus:ring-[#0554F4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1.5">Contact Representative</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g. Jane Kariuki"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1.5">KRA Tax PIN</label>
              <input
                type="text"
                value={form.kraPin}
                onChange={(e) => setForm({ ...form, kraPin: e.target.value })}
                placeholder="P051234567Z"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1.5">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+254 700 000000"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1.5">Orders Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="orders@vendor.co.ke"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1.5">Payment Terms *</label>
              <select
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white outline-none focus:border-[#0554F4]"
              >
                <option value="NET_30">Net 30 Days Credit</option>
                <option value="NET_14">Net 14 Days Credit</option>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="PREPAID">Prepaid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1.5">Lead Time (Days)</label>
              <input
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56] outline-none focus:border-[#0554F4]"
              />
            </div>
          </div>

          {/* Disbursement Credentials */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              DISBURSEMENT CREDENTIALS (B2B &amp; BANKING)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">M-Pesa Paybill / Till</label>
                <input
                  type="text"
                  value={form.mpesaPaybill}
                  onChange={(e) => setForm({ ...form, mpesaPaybill: e.target.value })}
                  placeholder="e.g. 522522"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-white placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name &amp; Branch</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. KCB Bank Kipande"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
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
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-white placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#041F56] mb-1.5">Physical Warehouse / Depot</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Enterprise Road, Industrial Area, Nairobi"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs font-bold text-[#041F56] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-[#0554F4] h-4 w-4 rounded"
            />
            <span>Active Supplier (Available for PO requisitions)</span>
          </label>

          <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100">
            <Link
              href="/dashboard/inventory/procurement/suppliers"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Vendor Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}