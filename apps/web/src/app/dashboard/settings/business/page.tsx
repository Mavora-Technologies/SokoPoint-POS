'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Mail,
  Globe,
  Image as ImageIcon,
  GitBranch,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import api from '../../../../lib/api';
import OrganizationSettingsNav from '../../../../components/OrganizationSettingsNav';

interface BranchNode {
  id: string;
  name: string;
  branchCode: string;
  etimsBhfId: string;
  isHeadquarters: boolean;
  isActive: boolean;
}

export default function BusinessEntityProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [planStatus, setPlanStatus] = useState({ plan: 'ENTERPRISE', status: 'ACTIVE' });
  const [branches, setBranches] = useState<BranchNode[]>([]);

  const [form, setForm] = useState({
    tradingName: '',
    legalName: '',
    webSlug: '',
    kraPin: '',
    etimsEnabled: true,
    logoUrl: '',
    corporateEmail: '',
    phoneContact: '',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    taxRate: '16',
    receiptFooter: '',
    lowStockAlerts: true,
    wholesaleEnabled: true,
  });

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/settings/business');
      const d = res.data?.data || {};
      if (d.profile) {
        setForm({
          tradingName: d.profile.tradingName || '',
          legalName: d.profile.legalName || '',
          webSlug: d.profile.webSlug || '',
          kraPin: d.profile.kraPin || '',
          etimsEnabled: Boolean(d.profile.etimsEnabled ?? true),
          logoUrl: d.profile.logoUrl || '',
          corporateEmail: d.profile.corporateEmail || '',
          phoneContact: d.profile.phoneContact || '',
          currency: d.profile.currency || 'KES',
          timezone: d.profile.timezone || 'Africa/Nairobi',
          taxRate: String(d.profile.taxRate ?? 16),
          receiptFooter: d.profile.receiptFooter || '',
          lowStockAlerts: Boolean(d.profile.lowStockAlerts ?? true),
          wholesaleEnabled: Boolean(d.profile.wholesaleEnabled ?? true),
        });
      }
      if (d.subscription) setPlanStatus(d.subscription);
      setBranches(Array.isArray(d.branches) ? d.branches : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load business profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      await api.put('/settings/business', {
        ...form,
        taxRate: Number(form.taxRate),
      });
      setSuccess('Business entity profile & store preferences saved to database.');
      await loadProfile();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 mb-1">
            Settings &nbsp;&rsaquo;&nbsp; <span className="text-[#041F56]">Corporate Entity</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Business Profile &amp; Entity Identity
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Configure legal trading identity, KRA eTIMS PIN compliance, retail &amp; wholesale billing currency, and storefront branding.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0554F4] border border-blue-200 text-[11px] font-extrabold uppercase">
            Plan: {planStatus.plan}
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-extrabold uppercase">
            {planStatus.status}
          </span>
        </div>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Settings Menu */}
          <div className="lg:col-span-3">
            <OrganizationSettingsNav />
          </div>

          {/* Right Form & Branch Nodes */}
          <form onSubmit={handleSave} className="lg:col-span-9 space-y-5">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              {/* Left 8 Cols: Trading, Contact & Regional */}
              <div className="xl:col-span-8 space-y-5">
                {/* Trading & Legal Entity Details */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-extrabold text-[#041F56] inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#0554F4]" /> Trading &amp; Legal Entity Details
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">
                        Trading Name (Displays on POS &amp; Receipts) *
                      </label>
                      <input
                        required
                        type="text"
                        value={form.tradingName}
                        onChange={(e) => setForm({ ...form, tradingName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] outline-none focus:border-[#0554F4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">
                        Registered Legal Corporate Name
                      </label>
                      <input
                        type="text"
                        value={form.legalName}
                        onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] outline-none focus:border-[#0554F4]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">
                        Business Web Slug / URL Identifier
                      </label>
                      <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50/60">
                        <span className="px-3 py-2.5 text-xs font-mono text-slate-400 border-r border-slate-200">
                          sokopoint.app/
                        </span>
                        <input
                          type="text"
                          value={form.webSlug}
                          onChange={(e) => setForm({ ...form, webSlug: e.target.value })}
                          className="w-full px-3 py-2.5 bg-white text-xs font-mono text-[#041F56] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">
                        KRA Tax PIN (TIMS / eTIMS Compliance)
                      </label>
                      <input
                        type="text"
                        value={form.kraPin}
                        onChange={(e) => setForm({ ...form, kraPin: e.target.value.toUpperCase() })}
                        placeholder="P051234567Z"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56] uppercase outline-none focus:border-[#0554F4]"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Used for fiscal tax invoices (bhfId / VSCU) and statutory VAT exports.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Official Communications & Contact */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-extrabold text-[#041F56] inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#0554F4]" /> Official Communications &amp; Contact
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">Primary Corporate Email</label>
                      <input
                        type="email"
                        value={form.corporateEmail}
                        onChange={(e) => setForm({ ...form, corporateEmail: e.target.value })}
                        placeholder="finance@mavoratechnologies.com"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">Headquarters Phone Contact</label>
                      <input
                        type="text"
                        value={form.phoneContact}
                        onChange={(e) => setForm({ ...form, phoneContact: e.target.value })}
                        placeholder="+254 700 000 000"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#0554F4]"
                      />
                    </div>
                  </div>
                </div>

                {/* Fiscal Currency, Tax & Retail/Wholesale Settings */}
                <div id="tax-compliance" className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-extrabold text-[#041F56] inline-flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#0554F4]" /> Fiscal Currency, Tax &amp; Retail Operations
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">Base Ledger Currency *</label>
                      <select
                        value={form.currency}
                        onChange={(e) => setForm({ ...form, currency: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="KES">KES - Kenyan Shilling (KES)</option>
                        <option value="USD">USD - US Dollar (USD)</option>
                        <option value="UGX">UGX - Ugandan Shilling (UGX)</option>
                        <option value="TZS">TZS - Tanzanian Shilling (TZS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">Operating Timezone *</label>
                      <select
                        value={form.timezone}
                        onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                      >
                        <option value="Africa/Nairobi">Africa/Nairobi (EAT - UTC+3)</option>
                        <option value="Africa/Kampala">Africa/Kampala (EAT - UTC+3)</option>
                        <option value="Africa/Dar_es_Salaam">Africa/Dar_es_Salaam (EAT - UTC+3)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#041F56] mb-1">Standard VAT Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.5"
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div id="receipt-invoice" className="pt-2">
                    <label className="block text-xs font-bold text-[#041F56] mb-1">
                      POS Receipt &amp; Wholesale Invoice Footer
                    </label>
                    <textarea
                      rows={2}
                      value={form.receiptFooter}
                      onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                    />
                  </div>

                  <div id="retail-wholesale" className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#041F56] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.wholesaleEnabled}
                        onChange={(e) => setForm({ ...form, wholesaleEnabled: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-[#0554F4]"
                      />
                      Enable Wholesale / B2B Tier Billing
                    </label>

                    <label className="inline-flex items-center gap-2 text-xs font-bold text-[#041F56] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.lowStockAlerts}
                        onChange={(e) => setForm({ ...form, lowStockAlerts: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-[#0554F4]"
                      />
                      Enable Low-Stock Par Alerts
                    </label>
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Brand Asset & Active Branch Nodes */}
              <div className="xl:col-span-4 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-4">
                  <h2 className="text-sm font-extrabold text-[#041F56]">Corporate Brand Asset</h2>

                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 flex flex-col items-center justify-center min-h-[140px]">
                    {form.logoUrl ? (
                      <>
                        <img
                          src={form.logoUrl}
                          alt={form.tradingName || 'Brand Logo'}
                          className="max-h-20 object-contain mb-2"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, logoUrl: '' })}
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove Logo
                        </button>
                      </>
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="h-7 w-7 mx-auto mb-1.5 opacity-60" />
                        <p className="text-[11px] font-medium">No logo URL configured</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#041F56] mb-1">Hosted Logo URL</label>
                    <input
                      type="text"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-[#0554F4]"
                    />
                  </div>
                </div>

                {/* Active Branch Nodes */}
                <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-extrabold text-[#041F56] inline-flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-[#0554F4]" /> Active Branch Nodes
                    </h2>
                    <Link
                      href="/dashboard/branches"
                      className="text-xs font-bold text-[#0554F4] hover:underline"
                    >
                      Manage &rarr;
                    </Link>
                  </div>

                  {branches.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">No branches configured yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {branches.map((b) => (
                        <div
                          key={b.id}
                          className="rounded-xl border border-slate-200/70 bg-slate-50/50 px-3.5 py-2.5 flex justify-between items-center gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#041F56] truncate">{b.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">
                              {b.branchCode || 'OUTLET'} &bull;{' '}
                              {b.isHeadquarters ? 'Central Hub' : `eTIMS BHF: ${b.etimsBhfId || '00'}`}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                              b.isActive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {b.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Save Bar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Corporate Entity
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}