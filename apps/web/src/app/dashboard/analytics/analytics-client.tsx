'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  RefreshCw,
  Cpu,
  Database,
  Play,
  Search,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Loader2,
  X,
  Trash2,
  Activity,
} from 'lucide-react';
import api from '../../../lib/api';

interface ReportTemplate {
  key: string;
  identifier: string;
  name: string;
  description: string;
  category: string;
  badge: string;
}

interface ReportRun {
  id: string;
  executionRef: string;
  templateKey: string;
  reportName: string;
  category: string;
  branchScope: string;
  exportFormat: string;
  operatorName: string;
  rowCount: number;
  durationMs: number;
  status: string;
  createdAt: string;
}

interface ReportSchedule {
  id: string;
  templateKey: string;
  reportName: string;
  category: string;
  branchName: string;
  frequency: string;
  exportFormat: string;
  recipientEmail: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export default function AnalyticsClient() {
  const [catalog, setCatalog] = useState<ReportTemplate[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [kpis, setKpis] = useState({
    totalExecutions: 0,
    completedExecutions: 0,
    activeSchedules: 0,
    avgLatencyMs: 0,
    totalRecordsExported: 0,
  });
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'LEDGER' | 'SCHEDULES'>('CATALOG');

  // Catalog filters & selected template
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [selectedKey, setSelectedKey] = useState('SALES_ORDERS_REVENUE');

  // Runner parameters
  const [branchScope, setBranchScope] = useState('ALL');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportFormat, setExportFormat] = useState<'CSV' | 'JSON' | 'PDF' | 'XLSX'>('CSV');

  // Execution result state
  const [running, setRunning] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    executionRef: string;
    reportName: string;
    columns: string[];
    rows: any[];
  } | null>(null);

  // Schedule Modal
  const [isSchedOpen, setIsSchedOpen] = useState(false);
  const [schedTemplate, setSchedTemplate] = useState('SALES_ORDERS_REVENUE');
  const [schedBranch, setSchedBranch] = useState('ALL');
  const [schedFrequency, setSchedFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [schedFormat, setSchedFormat] = useState<'CSV' | 'JSON' | 'XLSX'>('CSV');
  const [schedEmail, setSchedEmail] = useState('');
  const [savingSched, setSavingSched] = useState(false);

  const loadHub = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/hub');
      const d = res.data?.data || {};
      const cat = Array.isArray(d.catalog) ? d.catalog : [];
      setCatalog(cat);
      setBranches(Array.isArray(d.branches) ? d.branches : []);
      if (d.kpis) setKpis(d.kpis);
      setRuns(Array.isArray(d.runs) ? d.runs : []);
      setSchedules(Array.isArray(d.schedules) ? d.schedules : []);
    } catch (err) {
      console.error('Failed to load analytics hub', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHub();
  }, [loadHub]);

  const selectedTemplate = useMemo(
    () => catalog.find((c) => c.key === selectedKey) || catalog[0] || null,
    [catalog, selectedKey]
  );

  const filteredCatalog = useMemo(() => {
    return catalog.filter((t) => {
      if (moduleFilter !== 'ALL' && t.category !== moduleFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [catalog, moduleFilter, search]);

  const triggerDownload = (cols: string[], rows: any[], ref: string, format: string) => {
    if (format === 'PDF') {
      window.print();
      return;
    }
    if (format === 'JSON') {
      const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ref}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // CSV / XLSX-compatible CSV
    const csvLines = [
      cols.join(','),
      ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ref}.${format === 'XLSX' ? 'csv' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunQuery = async () => {
    if (!selectedTemplate) return;
    try {
      setRunning(true);
      setBannerMsg(null);
      const res = await api.post('/analytics/run', {
        templateKey: selectedTemplate.key,
        branchId: branchScope,
        startDate,
        endDate,
        exportFormat,
      });
      const d = res.data?.data;
      if (d) {
        setPreview({
          executionRef: d.executionRef,
          reportName: d.reportName,
          columns: d.columns || [],
          rows: d.rows || [],
        });
        setBannerMsg(`Report ${d.reportName} generated (${d.rowCount} records processed).`);
      }
      await loadHub();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to run report query.');
    } finally {
      setRunning(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSched(true);
      await api.post('/analytics/schedules', {
        templateKey: schedTemplate,
        branchId: schedBranch,
        frequency: schedFrequency,
        exportFormat: schedFormat,
        recipientEmail: schedEmail.trim(),
      });
      setIsSchedOpen(false);
      setSchedEmail('');
      await loadHub();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to schedule automated report.');
    } finally {
      setSavingSched(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await api.delete(`/analytics/schedules/${id}`);
      await loadHub();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to remove schedule.');
    }
  };

  const categories = ['Sales & Revenue', 'Inventory & Stock', 'Treasury & Audit', 'Workforce & Shifts'];

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; SuiteAnalytics Hub
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-[#0554F4]" />
            Enterprise Reports &amp; Analytics Engine
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Query across retail &amp; wholesale revenue velocity, inventory valuation, cashier shift custody, and statutory audit ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSchedOpen(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Clock className="h-4 w-4 text-[#0554F4]" /> Schedule Automated Report
          </button>
          <button
            onClick={loadHub}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live Execution Toast Banner */}
      {bannerMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> {bannerMsg}
          </span>
          <button onClick={() => setBannerMsg(null)} className="text-emerald-600 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL EXECUTIONS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.totalExecutions}</p>
            <p className="text-[11px] text-emerald-600 mt-0.5">{kpis.completedExecutions} Completed</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE SCHEDULES</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{kpis.activeSchedules} Jobs</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Autonomous Push</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AVG COMPUTE LATENCY</p>
            <p className="text-xl font-black text-purple-600 font-mono mt-1">{kpis.avgLatencyMs} ms</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Query Engine Speed</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Cpu className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL RECORDS EXPORTED</p>
            <p className="text-xl font-black text-amber-600 font-mono mt-1">
              {kpis.totalRecordsExported.toLocaleString('en-KE')}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Data Pipeline Volume</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Navigation Pills */}
      <div className="inline-flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('CATALOG')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'CATALOG'
              ? 'bg-[#041F56] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Report Catalog &amp; Runner ({catalog.length})
        </button>
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'LEDGER'
              ? 'bg-[#041F56] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> Execution Ledger ({runs.length})
        </button>
        <button
          onClick={() => setActiveTab('SCHEDULES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all ${
            activeTab === 'SCHEDULES'
              ? 'bg-[#041F56] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Automated Schedules ({schedules.length})
        </button>
      </div>

      {/* TAB 1: REPORT CATALOG & RUNNER */}
      {activeTab === 'CATALOG' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Report Catalog */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[11px] font-extrabold text-[#041F56] uppercase tracking-wider">
                REPORT CATALOG ({filteredCatalog.length})
              </p>
              <span className="text-[10px] text-slate-400">SuiteAnalytics Model</span>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates or metrics..."
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setModuleFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                  moduleFilter === 'ALL' ? 'bg-[#0554F4] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                All Modules ({catalog.length})
              </button>
              {categories.map((cat) => {
                const count = catalog.filter((c) => c.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setModuleFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                      moduleFilter === cat ? 'bg-[#0554F4] text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              {filteredCatalog.map((t) => {
                const isSelected = selectedKey === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSelectedKey(t.key)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-[#0554F4] bg-blue-50/40 ring-1 ring-[#0554F4]'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0 mt-0.5">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#041F56] truncate">{t.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{t.description}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-extrabold text-[#0554F4] uppercase shrink-0">
                      {t.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Runner & Data Grid Preview */}
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-[#041F56]">
                    {selectedTemplate?.name || 'Select a Report'}
                  </h2>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    Identifier: {selectedTemplate?.identifier || '—'}
                  </p>
                </div>

                <button
                  onClick={handleRunQuery}
                  disabled={running || !selectedTemplate}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Run Query
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Scope</label>
                  <select
                    value={branchScope}
                    onChange={(e) => setBranchScope(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="ALL">All Locations</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Export Format</label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="CSV">CSV</option>
                    <option value="JSON">JSON</option>
                    <option value="PDF">PDF</option>
                    <option value="XLSX">XLSX</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Data Grid Preview */}
            <div className="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <p className="text-[11px] font-extrabold text-[#041F56] uppercase tracking-wider">
                    DATA GRID PREVIEW
                  </p>
                  {preview && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold">
                      Ref: {preview.executionRef}
                    </span>
                  )}
                </div>

                {preview && preview.rows.length > 0 && (
                  <button
                    onClick={() =>
                      triggerDownload(preview.columns, preview.rows, preview.executionRef, exportFormat)
                    }
                    className="px-3.5 py-1.5 bg-[#041F56] hover:bg-[#062d7a] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" /> Download {exportFormat}
                  </button>
                )}
              </div>

              {!preview ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                  <FileSpreadsheet className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-[#041F56]">No Report Generated Yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Select your operational parameters above and click <strong>Run Query</strong> to execute.
                  </p>
                </div>
              ) : preview.rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-14 text-center text-xs text-slate-400 italic">
                  Query returned zero records matching your active filters.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200/70 rounded-xl">
                  <table className="w-full text-left text-xs divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr>
                        {preview.columns.map((col) => (
                          <th key={col} className="px-4 py-3 text-[10px] font-bold text-[#176E84] uppercase whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          {preview.columns.map((col) => (
                            <td key={col} className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                              {typeof row[col] === 'number'
                                ? row[col].toLocaleString('en-KE')
                                : String(row[col] ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-xs font-extrabold text-[#041F56] uppercase tracking-wider">
                EXECUTION HISTORY &amp; BACKGROUND RUNS
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Detailed audit log of generated query runs</p>
            </div>
            <span className="text-xs font-bold text-[#0554F4]">{runs.length} Total Runs</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50/70">
                <tr>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">EXECUTION ID</th>
                  <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">REPORT NAME</th>
                  <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">CATEGORY</th>
                  <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">OPERATOR</th>
                  <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">ROWS</th>
                  <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">DURATION</th>
                  <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">TIMESTAMP</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      No report executions recorded yet.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-6 py-3.5 font-mono font-bold text-[#0554F4]">{r.executionRef}</td>
                      <td className="px-4 py-3.5 font-bold text-[#041F56]">{r.reportName}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0554F4] text-[10px] font-bold uppercase">
                          {r.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{r.operatorName}</td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-[#041F56]">{r.rowCount}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-slate-600">{r.durationMs} ms</td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        {new Date(r.createdAt).toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATED SCHEDULES */}
      {activeTab === 'SCHEDULES' && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
          <table className="w-full min-w-[780px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">REPORT TEMPLATE</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">BRANCH SCOPE</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">FREQUENCY</th>
                <th className="px-4 py-4 text-[10px] font-bold text-[#176E84] uppercase">RECIPIENT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    No automated report schedules configured yet. Click <strong>Schedule Automated Report</strong> above.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 font-bold text-[#041F56]">{s.reportName}</td>
                    <td className="px-4 py-4 text-slate-600">{s.branchName}</td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0554F4] text-[10px] font-bold">
                        {s.frequency} ({s.exportFormat})
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600">{s.recipientEmail}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg cursor-pointer"
                        title="Remove Schedule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULE AUTOMATED REPORT MODAL */}
      {isSchedOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <h2 className="text-lg font-extrabold text-[#041F56]">Schedule Automated Report</h2>
              <button onClick={() => setIsSchedOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Report Template *</label>
                <select
                  value={schedTemplate}
                  onChange={(e) => setSchedTemplate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  {catalog.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Frequency</label>
                  <select
                    value={schedFrequency}
                    onChange={(e) => setSchedFrequency(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Format</label>
                  <select
                    value={schedFormat}
                    onChange={(e) => setSchedFormat(e.target.value as any)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                  >
                    <option value="CSV">CSV</option>
                    <option value="JSON">JSON</option>
                    <option value="XLSX">XLSX</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Branch Scope</label>
                <select
                  value={schedBranch}
                  onChange={(e) => setSchedBranch(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="ALL">All Locations</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Recipient Email *</label>
                <input
                  required
                  type="email"
                  value={schedEmail}
                  onChange={(e) => setSchedEmail(e.target.value)}
                  placeholder="director@business.com"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSchedOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSched}
                  className="px-5 py-2.5 bg-[#0554F4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {savingSched && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}