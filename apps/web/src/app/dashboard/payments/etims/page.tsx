'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Landmark,
  Download,
  RefreshCw,
  Receipt,
  FileText,
  ShieldCheck,
  Settings,
  Cpu,
  Calendar,
  Loader2,
  AlertCircle,
  LogIn,
  CheckCircle2,
} from 'lucide-react';
import api from '../../../../lib/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const YEARS = [2024, 2025, 2026, 2027];

export default function EtimsCompliancePage() {
  const [branchId, setBranchId] = useState('ALL');
  const [periodType, setPeriodType] = useState<'MONTHLY' | 'QUARTERLY' | 'ANNUAL'>('MONTHLY');
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'VAT' | 'FEED' | 'SETTINGS'>('VAT');

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState({
    kraPin: '',
    deviceSerial: '',
    scuType: 'VSCU',
    branchCode: '00',
    vatRate: 16,
    autoTransmit: true,
  });
  const [periodLabel, setPeriodLabel] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [summary, setSummary] = useState({
    settledSalesCount: 0,
    grossSales: 0,
    exemptSales: 0,
    netTaxableBase: 0,
    outputVat: 0,
    purchaseDocCount: 0,
    totalPurchases: 0,
    inputVat: 0,
    netPayableVat: 0,
  });
  const [transmissions, setTransmissions] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);
    try {
      const res = await api.get('/finance/etims', {
        params: { branchId, periodType, month, year },
      });
      const d = res.data?.data || {};
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      if (d.settings) setSettings(d.settings);
      setPeriodLabel(d.periodLabel || `${String(month).padStart(2, '0')}/${year}`);
      setDueDate(d.dueDate || '');
      if (d.summary) setSummary(d.summary);
      setTransmissions(Array.isArray(d.transmissions) ? d.transmissions : []);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load KRA eTIMS fiscal ledger.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, periodType, month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      await api.put('/finance/etims/settings', settings);
      alert('KRA eTIMS device settings saved.');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save eTIMS settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportItaxCsv = () => {
    const rows = [
      ['Metric', 'Amount (KES)'],
      ['Period', periodLabel],
      ['Business KRA PIN', settings.kraPin || 'NOT-CONFIGURED'],
      ['Gross Sales Billed', summary.grossSales.toFixed(2)],
      ['Zero-Rated / Exempt Goods', summary.exemptSales.toFixed(2)],
      ['Net Taxable Retail Base', summary.netTaxableBase.toFixed(2)],
      ['Output VAT (16%)', summary.outputVat.toFixed(2)],
      ['B2B Purchases & Expenses', summary.totalPurchases.toFixed(2)],
      ['Deductible Input VAT', summary.inputVat.toFixed(2)],
      ['Net VAT Payable to KRA', summary.netPayableVat.toFixed(2)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SokoPoint-iTax-VAT3-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0 mt-1">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-[#0554F4] mb-0.5">
              Enterprise Control &rsaquo; Statutory Fiscal Compliance
            </p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
              Statutory Tax Ledger &amp; KRA eTIMS Fiscal Compliance
            </h1>
            <p className="text-xs text-[#176E84] mt-1">
              Multi-period retail &amp; wholesale Output VAT, Zero-Rated/Exempt goods accounting, B2B Input Tax deductions, iTax VAT-3 export, and eTIMS OSCU/VSCU receipts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
          >
            <option value="ALL">All Branch Locations ({branches.length})</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={periodType}
            onChange={(e) => setPeriodType(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
          >
            <option value="MONTHLY">Monthly Return</option>
            <option value="QUARTERLY">Quarterly Return</option>
            <option value="ANNUAL">Annual Return</option>
          </select>

          {periodType !== 'ANNUAL' && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56] bg-white"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportItaxCsv}
            className="px-4 py-2 bg-[#041F56] hover:bg-[#062d7a] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export iTax CSV
          </button>

          <button
            onClick={loadData}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OUTPUT VAT (SALES)</p>
            <p className="text-xl font-black text-[#041F56] font-mono mt-1">
              KES {summary.outputVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">From {summary.settledSalesCount} Settled Sales</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">INPUT VAT (DEDUCTIONS)</p>
            <p className="text-xl font-black text-purple-600 font-mono mt-1">
              KES {summary.inputVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-purple-600 mt-0.5">From {summary.purchaseDocCount} Vendor &amp; ETR Bills</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NET PAYABLE VAT</p>
            <p className="text-xl font-black text-rose-600 font-mono mt-1">
              KES {summary.netPayableVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Statutory KRA Liability</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ZERO-RATED / EXEMPT GOODS</p>
            <p className="text-xl font-black text-emerald-600 font-mono mt-1">
              KES {summary.exemptSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 mt-0.5">Exempt basic commodities</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
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

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-2 shadow-xs inline-flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveTab('VAT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'VAT' ? 'bg-blue-50 text-[#0554F4] border border-blue-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" /> Statutory VAT Return Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('FEED')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'FEED' ? 'bg-blue-50 text-[#0554F4] border border-blue-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" /> eTIMS Electronic Transmission Feed ({transmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'SETTINGS' ? 'bg-blue-50 text-[#0554F4] border border-blue-200' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="h-3.5 w-3.5" /> Tax Codes &amp; KRA Device Settings
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : activeTab === 'VAT' ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-extrabold text-[#041F56] uppercase tracking-wide">
                KRA STATUTORY RETURN AUDIT &amp; BALANCING COMPUTATION
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Period: <strong className="text-[#041F56]">{periodLabel}</strong> &bull; Business PIN:{' '}
                <strong className="font-mono text-[#041F56]">{settings.kraPin || 'NOT-CONFIGURED'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dueDate && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                  <Calendar className="h-3 w-3" /> Due: {dueDate}
                </span>
              )}
              <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[#0554F4] text-[11px] font-bold">
                Kenya VAT Act 2013 &amp; eTIMS
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs">
              <p className="font-extrabold text-[#041F56] uppercase tracking-wide">
                1. OUTPUT TAX LIABILITY (RETAIL &amp; WHOLESALE SALES)
              </p>
              <div className="flex justify-between text-slate-600">
                <span>Gross Sales Billed:</span>
                <span className="font-mono font-bold text-[#041F56]">
                  KES {summary.grossSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Exempt / Zero-Rated Goods:</span>
                <span className="font-mono font-bold text-emerald-600">
                  KES {summary.exemptSales.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-100">
                <span>Net Taxable Retail Base:</span>
                <span className="font-mono font-bold text-slate-800">
                  KES {summary.netTaxableBase.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-[#041F56] pt-1">
                <span>Net Output VAT Payable:</span>
                <span className="font-mono text-[#0554F4]">
                  KES {summary.outputVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 p-5 space-y-3 text-xs">
              <p className="font-extrabold text-[#041F56] uppercase tracking-wide">
                2. INPUT TAX DEDUCTIONS (B2B PURCHASES &amp; ETR EXPENSES)
              </p>
              <div className="flex justify-between text-slate-600">
                <span>Total B2B Purchases &amp; Bills ({summary.purchaseDocCount} Docs):</span>
                <span className="font-mono font-bold text-[#041F56]">
                  KES {summary.totalPurchases.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 pb-2 border-b border-slate-100">
                <span>Deductible Input VAT:</span>
                <span className="font-mono font-bold text-purple-600">
                  - KES {summary.inputVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-[#041F56] pt-1">
                <span>Net VAT Payable to KRA:</span>
                <span className="font-mono text-rose-600">
                  KES {summary.netPayableVat.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'FEED' ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
          <table className="w-full min-w-[820px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">RECEIPT #</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">CU INVOICE #</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">GROSS (KES)</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">VAT (16%)</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">STATUS</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">TRANSMITTED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">
                    No eTIMS fiscal transmissions recorded for this period.
                  </td>
                </tr>
              ) : (
                transmissions.map((t) => (
                  <tr key={t.id}>
                    <td className="px-6 py-3.5 font-mono font-bold text-[#041F56]">{t.receiptNo}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">{t.cuInvoiceNo || '—'}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-[#041F56]">
                      KES {Number(t.grossAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-[#0554F4]">
                      KES {Number(t.vatAmount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-500">
                      {new Date(t.transmittedAt).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs max-w-2xl space-y-4">
          <h2 className="text-sm font-extrabold text-[#041F56]">KRA eTIMS OSCU / VSCU Device Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1">Business KRA PIN *</label>
              <input
                required
                type="text"
                value={settings.kraPin}
                onChange={(e) => setSettings({ ...settings, kraPin: e.target.value })}
                placeholder="e.g. P051234567Z"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1">eTIMS Device Serial #</label>
              <input
                type="text"
                value={settings.deviceSerial}
                onChange={(e) => setSettings({ ...settings, deviceSerial: e.target.value })}
                placeholder="e.g. KRA-VSCU-001928"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1">SCU Mode</label>
              <select
                value={settings.scuType}
                onChange={(e) => setSettings({ ...settings, scuType: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
              >
                <option value="VSCU">VSCU (Virtual Sales Control Unit)</option>
                <option value="OSCU">OSCU (Online Sales Control Unit)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#041F56] mb-1">Standard VAT Rate (%)</label>
              <input
                type="number"
                step="any"
                value={settings.vatRate}
                onChange={(e) => setSettings({ ...settings, vatRate: Number(e.target.value) || 16 })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />} Save KRA eTIMS Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}