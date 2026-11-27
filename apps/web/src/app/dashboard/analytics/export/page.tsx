'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  HardDriveDownload,
  Plus,
  RefreshCw,
  Download,
  Loader2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../../../../lib/api';

interface ExportPackage {
  id: string;
  executionRef: string;
  templateKey: string;
  packageDescription: string;
  format: string;
  rows: number;
  fileSizeBytes: number;
  operator: string;
  branchScope: string;
  generatedAt: string;
  isExpired: boolean;
}

interface DomainOption {
  key: string;
  name: string;
}

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes < 1024) return `~${Math.max(1, Math.round((bytes || 512) / 1024))} KB`;
  if (bytes < 1024 * 1024) return `~${Math.round(bytes / 1024)} KB`;
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DataExportsCenterPage() {
  const [exportsList, setExportsList] = useState<ExportPackage[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Request Export Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainKey, setDomainKey] = useState('SALES_ORDERS_REVENUE');
  const [format, setFormat] = useState<'CSV' | 'JSON'>('CSV');
  const [branchId, setBranchId] = useState('ALL');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [includeEtimsHeader, setIncludeEtimsHeader] = useState(true);
  const [queueing, setQueueing] = useState(false);

  const loadExports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/exports');
      const d = res.data?.data || {};
      setExportsList(Array.isArray(d.exports) ? d.exports : []);
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      setDomains(Array.isArray(d.domains) ? d.domains : []);
    } catch (err) {
      console.error('Failed to load export queue', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  const handleQueueExport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setQueueing(true);
      await api.post('/analytics/exports', {
        domainKey,
        format,
        branchId,
        startDate,
        endDate,
        includeEtimsHeader,
      });
      setIsModalOpen(false);
      await loadExports();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to queue bulk export.');
    } finally {
      setQueueing(false);
    }
  };

  const handleDownload = async (pkg: ExportPackage) => {
    try {
      setDownloadingId(pkg.id);
      const res = await api.get(`/analytics/exports/${pkg.id}/download`, {
        responseType: 'blob',
      });
      const ext = pkg.format.toLowerCase() === 'json' ? 'json' : 'csv';
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pkg.executionRef}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to download export package.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Reporting Hub &rsaquo; Data Exports Center
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <HardDriveDownload className="h-6 w-6 text-[#0554F4]" />
            Enterprise Data Exports &amp; File Center
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Request asynchronous bulk data packages, monitor storage retention policies (7-day window), and stream CSV/JSON files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Request Bulk Export
          </button>
          <button
            onClick={loadExports}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Asynchronous Export Queue Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-xs font-extrabold text-[#041F56] uppercase tracking-wider">
              ASYNCHRONOUS EXPORT QUEUE ({exportsList.length} PACKAGES)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Secure files available for 7 days post-generation
            </p>
          </div>
          <span className="text-xs font-bold text-[#0554F4]">Retention Policy: 7 Days</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">EXPORT REFERENCE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">PACKAGE DESCRIPTION</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">FORMAT</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ROWS</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">SIZE</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">OPERATOR</th>
                <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">GENERATED AT</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">DOWNLOAD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                  </td>
                </tr>
              ) : exportsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-16 text-center">
                    <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-bold text-[#041F56]">No Export Packages Queued Yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click <strong>Request Bulk Export</strong> to generate a downloadable CSV or JSON dataset.
                    </p>
                  </td>
                </tr>
              ) : (
                exportsList.map((pkg) => {
                  const hasRows = Number(pkg.rows || 0) > 0;
                  return (
                    <tr key={pkg.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4 font-mono font-bold text-[#0554F4]">{pkg.executionRef}</td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-[#041F56]">{pkg.packageDescription}</p>
                        <p className="text-[10px] text-slate-400">{pkg.branchScope}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0554F4] font-mono text-[10px] font-bold uppercase">
                          {pkg.format}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-[#041F56]">
                        {Number(pkg.rows || 0).toLocaleString('en-KE')}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-slate-500">
                        {formatFileSize(pkg.fileSizeBytes)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">{pkg.operator}</td>
                      <td className="px-4 py-4 font-mono text-slate-500">
                        {new Date(pkg.generatedAt).toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDownload(pkg)}
                          disabled={downloadingId === pkg.id}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 ${
                            hasRows
                              ? 'bg-[#0554F4] hover:bg-[#0441c4] text-white shadow-xs'
                              : 'bg-blue-100 hover:bg-blue-200 text-[#0554F4]'
                          }`}
                        >
                          {downloadingId === pkg.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          Download
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REQUEST ASYNCHRONOUS DATA EXPORT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Request Asynchronous Data Export</h2>
                <p className="text-xs text-slate-400 mt-0.5">Generate downloadable enterprise data packages</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleQueueExport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Target Domain *</label>
                <select
                  value={domainKey}
                  onChange={(e) => setDomainKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                >
                  {domains.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Format *</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="CSV">CSV Spreadsheet</option>
                    <option value="JSON">JSON Data Package</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Scope</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="ALL">All Branch Locations</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-bold text-[#041F56] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={includeEtimsHeader}
                  onChange={(e) => setIncludeEtimsHeader(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#0554F4]"
                />
                Include KRA eTIMS &amp; Audit Metadata Header
              </label>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={queueing}
                  className="py-2.5 rounded-xl bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {queueing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Queue Export
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}