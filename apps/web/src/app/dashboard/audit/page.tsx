'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  Download,
  FileJson,
  RefreshCw,
  Database,
  Clock,
  UserCheck,
  Layers,
  Search,
  Eye,
  X,
  Lock,
  Loader2,
} from 'lucide-react';
import api from '../../../lib/api';

interface AuditDiff {
  attribute: string;
  previousValue: unknown;
  newValue: unknown;
}

interface AuditEntry {
  id: string;
  auditSeq: number;
  module: string;
  action: string;
  entityTable: string;
  entityId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  branchName: string;
  ipAddress: string;
  endpointNarrative: string;
  changes: AuditDiff[];
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [kpis, setKpis] = useState({
    totalEvents: 0,
    events24h: 0,
    activeOperators: 0,
    primaryModule: 'POS',
  });
  const [loading, setLoading] = useState(true);
  const [exportingFmt, setExportingFmt] = useState<'csv' | 'json' | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Inspect Modal
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/audit/logs');
      const d = res.data?.data || {};
      setLogs(Array.isArray(d.logs) ? d.logs : []);
      if (d.kpis) setKpis(d.kpis);
    } catch (err) {
      console.error('Failed to load audit logs', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const distinctModules = useMemo(
    () => Array.from(new Set(logs.map((l) => l.module).filter(Boolean))).sort(),
    [logs]
  );
  const distinctActions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action).filter(Boolean))).sort(),
    [logs]
  );
  const distinctEntities = useMemo(
    () => Array.from(new Set(logs.map((l) => l.entityTable).filter(Boolean))).sort(),
    [logs]
  );
  const distinctOperators = useMemo(
    () => Array.from(new Set(logs.map((l) => l.actorName).filter(Boolean))).sort(),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      if (moduleFilter !== 'ALL' && item.module !== moduleFilter) return false;
      if (actionFilter !== 'ALL' && item.action !== actionFilter) return false;
      if (entityFilter !== 'ALL' && item.entityTable !== entityFilter) return false;
      if (operatorFilter !== 'ALL' && item.actorName !== operatorFilter) return false;

      if (dateFrom && new Date(item.createdAt) < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && new Date(item.createdAt) > new Date(`${dateTo}T23:59:59`)) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (item.action || '').toLowerCase().includes(q) ||
        (item.entityTable || '').toLowerCase().includes(q) ||
        (item.entityId || '').toLowerCase().includes(q) ||
        (item.actorName || '').toLowerCase().includes(q) ||
        (item.actorEmail || '').toLowerCase().includes(q) ||
        (item.ipAddress || '').toLowerCase().includes(q) ||
        (item.endpointNarrative || '').toLowerCase().includes(q)
      );
    });
  }, [logs, moduleFilter, actionFilter, entityFilter, operatorFilter, dateFrom, dateTo, search]);

  const handleExport = async (fmt: 'csv' | 'json') => {
    try {
      setExportingFmt(fmt);
      const res = await api.get('/audit/export', {
        params: { format: fmt },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `SokoPoint-Audit-Log-${new Date().toISOString().slice(0, 10)}.${fmt}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.message || `Failed to export ${fmt.toUpperCase()} audit log.`);
    } finally {
      setExportingFmt(null);
    }
  };

  const formatTimestamp = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const datePart = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timePart = d.toLocaleTimeString('en-GB', { hour12: false });
    return `${datePart}, ${timePart}`;
  };

  const renderModuleBadge = (mod: string) => {
    const m = (mod || 'POS').toUpperCase();
    if (m === 'FINANCE' || m === 'PAYMENTS') {
      return (
        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] font-bold">
          {m}
        </span>
      );
    }
    if (m === 'INVENTORY') {
      return (
        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px] font-bold">
          {m}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-blue-50 text-[#0554F4] border border-blue-200 font-mono text-[10px] font-bold">
        {m}
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Security &amp; Compliance
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-[#0554F4]" />
            Enterprise Audit Logs &amp; Compliance Ledger
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Immutable, append-only verification trail capturing operator sessions and system mutations across retail POS, inventory, finance, and settings[cite: 46].
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exportingFmt !== null}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {exportingFmt === 'csv' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => handleExport('json')}
            disabled={exportingFmt !== null}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-[#041F56] text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {exportingFmt === 'json' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileJson className="h-3.5 w-3.5" />
            )}
            JSON
          </button>

          <button
            type="button"
            onClick={loadAuditLogs}
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL AUDIT EVENTS</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.totalEvents.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EVENTS (24 HOURS)</p>
            <p className="text-xl font-black text-emerald-600 mt-1">{kpis.events24h.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTIVE OPERATORS</p>
            <p className="text-xl font-black text-purple-600 mt-1">{kpis.activeOperators.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PRIMARY MODULE</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.primaryModule}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex flex-col xl:flex-row items-stretch xl:items-center gap-2.5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity ID, actor, IP, or endpoint..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
        >
          <option value="ALL">All Modules</option>
          {distinctModules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
        >
          <option value="ALL">All Actions</option>
          {distinctActions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
        >
          <option value="ALL">All Entities</option>
          {distinctEntities.map((ent) => (
            <option key={ent} value={ent}>
              {ent}
            </option>
          ))}
        </select>

        <select
          value={operatorFilter}
          onChange={(e) => setOperatorFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-[#041F56] bg-white"
        >
          <option value="ALL">All Operators</option>
          {distinctOperators.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-2.5 py-2 border border-slate-200 rounded-xl text-[11px] font-mono"
          />
          <span className="text-slate-400 text-xs">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-2.5 py-2 border border-slate-200 rounded-xl text-[11px] font-mono"
          />
        </div>

        <button
          type="button"
          onClick={loadAuditLogs}
          className="px-4 py-2 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl cursor-pointer shrink-0"
        >
          Search
        </button>
      </div>

      {/* Audit Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[1040px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">TIMESTAMP</th>
              <th className="px-3 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">MODULE</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">ACTION</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">ENTITY TARGET</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">ACTOR / OPERATOR</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">BRANCH LOCATION</th>
              <th className="px-4 py-3.5 text-[10px] font-bold text-[#176E84] uppercase">IP ADDRESS</th>
              <th className="px-5 py-3.5 text-[10px] font-bold text-[#176E84] uppercase text-right">DETAILS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-16 text-center">
                  <Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-16 text-center text-slate-400 font-semibold">
                  No audit events recorded for this tenant yet. System mutations across POS, inventory, finance, and settings will appear here automatically.
                </td>
              </tr>
            ) : (
              filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {formatTimestamp(entry.createdAt)}
                  </td>
                  <td className="px-3 py-3.5">{renderModuleBadge(entry.module)}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[#041F56] whitespace-nowrap">
                    {entry.action}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {entry.entityTable}: <strong className="text-[#041F56]">{entry.entityId}</strong>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-[#041F56]">{entry.actorName}</p>
                    <p className="text-[10px] font-mono text-slate-400">
                      {entry.actorEmail ? `${entry.actorEmail} • ` : ''}
                      {entry.actorRole}
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{entry.branchName || '—'}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                    {entry.ipAddress || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedEntry(entry)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#0554F4] hover:text-[#0554F4] text-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer bg-white"
                    >
                      <Eye className="h-3 w-3" /> Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* AUDIT RECORD INSPECT MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {renderModuleBadge(selectedEntry.module)}
                  <h2 className="text-base font-extrabold text-[#041F56] font-mono">
                    {selectedEntry.action}
                  </h2>
                </div>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Audit Record #{selectedEntry.auditSeq} &bull; {new Date(selectedEntry.createdAt).toISOString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metadata Box */}
            <div className="rounded-2xl border border-slate-200/80 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/40">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTOR</p>
                <p className="text-xs font-extrabold text-[#041F56] mt-0.5">{selectedEntry.actorName}</p>
                <p className="text-[11px] font-mono text-slate-400">
                  {selectedEntry.actorEmail || 'Authenticated Operator'} ({selectedEntry.actorRole})
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TARGET ENTITY</p>
                <p className="text-xs font-mono font-extrabold text-[#041F56] mt-0.5">
                  {selectedEntry.entityTable}
                </p>
                <p className="text-[11px] font-mono text-slate-400">ID: {selectedEntry.entityId}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">BRANCH LOCATION</p>
                <p className="text-xs font-extrabold text-[#041F56] mt-0.5">
                  {selectedEntry.branchName || 'Global / Tenant-Wide'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CLIENT IP ADDRESS</p>
                <p className="text-xs font-mono font-extrabold text-[#041F56] mt-0.5">
                  {selectedEntry.ipAddress || '—'}
                </p>
              </div>
            </div>

            {/* Operator Audit Narrative / Endpoint */}
            <div className="rounded-2xl bg-blue-50/60 border border-blue-200/70 px-4 py-3 space-y-1">
              <p className="text-xs font-extrabold text-[#041F56]">Operator Audit Narrative / Endpoint:</p>
              <p className="text-xs font-mono text-slate-700">
                {selectedEntry.endpointNarrative ||
                  `${selectedEntry.action} executed on ${selectedEntry.entityTable} (${selectedEntry.entityId})`}
              </p>
            </div>

            {/* Mutation Differential (State Changes) */}
            <div className="space-y-2.5">
              <p className="text-xs font-extrabold text-[#041F56] inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#0554F4]" /> Mutation Differential (State Changes)
              </p>

              <div className="rounded-2xl border border-slate-200/80 overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">ATTRIBUTE</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">PREVIOUS VALUE</th>
                      <th className="px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase">NEW VALUE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Array.isArray(selectedEntry.changes) && selectedEntry.changes.length > 0 ? (
                      selectedEntry.changes.map((c, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2.5 font-mono font-bold text-[#041F56]">{c.attribute}</td>
                          <td className="px-4 py-2.5 font-mono text-rose-600">
                            {c.previousValue === null || c.previousValue === undefined || c.previousValue === ''
                              ? '—'
                              : JSON.stringify(c.previousValue)}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-emerald-600">
                            {c.newValue === null || c.newValue === undefined || c.newValue === ''
                              ? '—'
                              : JSON.stringify(c.newValue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-5 text-center text-slate-400">
                          No field-level state diffs recorded for this event.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}