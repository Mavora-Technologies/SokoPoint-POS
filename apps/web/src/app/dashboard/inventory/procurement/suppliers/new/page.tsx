'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 rounded-2xl text-[#0554F4] shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#041F56]">New Supplier Profile</h1>
              <p className="text-xs text-[#176E84] mt-0.5">
                Wholesale vendor details and payment credentials
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/inventory/procurement/suppliers"
            className="text-xs font-bold text-slate-500 hover:text-[#041F56] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5"
        >
          <div>
            <label className="block text-xs font-black text-[#041F56] mb-1.5">
              Supplier Business Name *
            </label>
            <input
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Unga & Millers Wholesale Distributors Ltd"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[#041F56] mb-1.5">Contact Representative</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g. Jane Kariuki"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#041F56] mb-1.5">KRA Tax PIN</label>
              <input
                type="text"
                value={form.kraPin}
                onChange={(e) => setForm({ ...form, kraPin: e.target.value })}
                placeholder="P051234567Z"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[#041F56] mb-1.5">Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+254 700 000000"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-[#041F56] mb-1.5">Orders Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="orders@vendor.co.ke"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[#041F56] mb-1.5">Payment Terms *</label>
              <select
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
              >
                <option value="NET_30">Net 30 Days Credit</option>
                <option value="NET_14">Net 14 Days Credit</option>
                <option value="COD">Cash on Delivery (COD)</option>
                <option value="PREPAID">Prepaid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-[#041F56] mb-1.5">Lead Time (Days)</label>
              <input
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
            </div>
          </div>

          {/* Disbursement Credentials Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
              DISBURSEMENT CREDENTIALS (B2B &amp; BANKING)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">M-Pesa Paybill / Till</label>
                <input
                  type="text"
                  value={form.mpesaPaybill}
                  onChange={(e) => setForm({ ...form, mpesaPaybill: e.target.value })}
                  placeholder="e.g. 522522"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name &amp; Branch</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="e.g. KCB Bank Industrial Area"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={form.bankAccount}
                onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
                placeholder="e.g. 1100223344"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-mono bg-white outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-[#041F56] mb-1.5">Physical Warehouse / Depot</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="e.g. Enterprise Road, Industrial Area, Nairobi"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
            />
          </div>

          <label className="flex items-center gap-2.5 text-xs font-bold text-[#041F56] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-[#0554F4] h-4 w-4"
            />
            <span>Active Supplier (Available for PO requisitions)</span>
          </label>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/dashboard/inventory/procurement/suppliers"
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Create Vendor Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}