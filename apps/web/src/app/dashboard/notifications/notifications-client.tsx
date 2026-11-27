'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  RefreshCw,
  Zap,
  ShieldAlert,
  AlertTriangle,
  Layers,
  Search,
  ExternalLink,
  Clock,
  Loader2,
  CheckCircle2,
  Package,
  ShieldCheck,
} from 'lucide-react';
import api from '../../../lib/api';

interface OperationalAlert {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  module: string;
  category: 'ACTION_ITEMS' | 'POS_FEED' | 'COMPLIANCE';
  title: string;
  refTag: string;
  message: string;
  branchName: string;
  createdAt: string;
  actionRequired: boolean;
  actionLabel: string;
  actionHref: string;
  detailsHref: string;
  isRead: boolean;
}

export default function NotificationsClient() {
  const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
  const [kpis, setKpis] = useState({
    actionRequired: 0,
    criticalAlerts: 0,
    warnings: 0,
    totalUnread: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [acking, setAcking] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'POS_FEED' | 'ACTION_ITEMS' | 'COMPLIANCE'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      const d = res.data?.data || {};
      setAlerts(Array.isArray(d.alerts) ? d.alerts : []);
      if (d.kpis) setKpis(d.kpis);
    } catch (err) {
      console.error('Failed to load operational alerts', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const distinctModules = useMemo(
    () => Array.from(new Set(alerts.map((a) => a.module).filter(Boolean))).sort(),
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (activeTab !== 'ALL' && a.category !== activeTab) return false;
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (moduleFilter !== 'ALL' && a.module !== moduleFilter) return false;
      if (unreadOnly && a.isRead) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.refTag.toLowerCase().includes(q) ||
        a.branchName.toLowerCase().includes(q)
      );
    });
  }, [alerts, activeTab, severityFilter, moduleFilter, unreadOnly, search]);

  const handleAcknowledge = async (keys: string[]) => {
    if (keys.length === 0) return;
    try {
      setAcking(true);
      await api.post('/notifications/acknowledge', { alertKeys: keys });
      await loadAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alerts', err);
    } finally {
      setAcking(false);
    }
  };

  const unreadIds = useMemo(() => alerts.filter((a) => !a.isRead).map((a) => a.id), [alerts]);
  const actionCount = useMemo(() => alerts.filter((a) => a.category === 'ACTION_ITEMS').length, [alerts]);

  const renderSeverityBadge = (sev: OperationalAlert['severity']) => {
    if (sev === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-extrabold uppercase">
          <ShieldAlert className="h-3 w-3" /> CRITICAL
        </span>
      );
    }
    if (sev === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold uppercase">
          <AlertTriangle className="h-3 w-3" /> WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-[#0554F4] border border-blue-200 text-[10px] font-extrabold uppercase">
        <CheckCircle2 className="h-3 w-3" /> INFO
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#176E84] mb-1">
            Operations &nbsp;&rsaquo;&nbsp; <span className="text-[#041F56]">Action &amp; Escalation Bus</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <Bell className="h-6 w-6 text-[#0554F4]" />
            Operational Alert Inbox
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Role-scoped real-time notifications filtered strictly to your tenant, branches, and operational clearances.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={unreadIds.length === 0 || acking}
            onClick={() => handleAcknowledge(unreadIds)}
            className="px-4 py-2.5 bg-[#041F56] hover:bg-[#072c75] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            {acking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Acknowledge All ({kpis.totalUnread})
          </button>

          <button
            type="button"
            onClick={loadAlerts}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
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
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACTION REQUIRED</p>
            <p className="text-xl font-black text-[#0554F4] mt-1">{kpis.actionRequired} Tasks</p>
            <p className="text-[11px] text-[#0554F4] mt-0.5">Pending Decisions</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CRITICAL ALERTS</p>
            <p className="text-xl font-black text-rose-600 mt-1">{kpis.criticalAlerts} Urgent</p>
            <p className="text-[11px] text-rose-600 mt-0.5">Immediate Attention</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WARNINGS</p>
            <p className="text-xl font-black text-amber-600 mt-1">{kpis.warnings} Active</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Operational Tolerances</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL UNREAD</p>
            <p className="text-xl font-black text-[#041F56] mt-1">{kpis.totalUnread}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">In your scope</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#041F56] flex items-center justify-center shrink-0">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                activeTab === 'ALL' ? 'bg-white text-[#041F56] shadow-xs' : 'text-slate-600'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('POS_FEED')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'POS_FEED' ? 'bg-white text-[#041F56] shadow-xs' : 'text-slate-600'
              }`}
            >
              <Package className="h-3.5 w-3.5 text-emerald-600" /> POS &amp; Stock Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ACTION_ITEMS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'ACTION_ITEMS' ? 'bg-white text-[#041F56] shadow-xs' : 'text-slate-600'
              }`}
            >
              <Zap className="h-3.5 w-3.5 text-[#0554F4]" /> Action Items ({actionCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('COMPLIANCE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'COMPLIANCE' ? 'bg-white text-[#041F56] shadow-xs' : 'text-slate-600'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Compliance &amp; Audit
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-bold text-[#041F56] cursor-pointer">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0554F4]"
            />
            Show Unread Only
          </label>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warnings Only</option>
              <option value="INFO">Info Only</option>
            </select>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
            >
              <option value="ALL">All Authorized Modules</option>
              {distinctModules.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications, SKU, or order #..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
            />
          </div>
        </div>
      </div>

      {/* Alert Cards List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center space-y-2">
          <Bell className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-[#041F56]">All Caught Up!</p>
          <p className="text-xs text-slate-400">No active operational alerts match your current filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 transition-all ${
                !alert.isRead ? 'border-blue-300/90 ring-1 ring-blue-100' : 'border-slate-200/70 opacity-85'
              }`}
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {renderSeverityBadge(alert.severity)}
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[#041F56] font-mono text-[10px] font-bold">
                    {alert.module}
                  </span>
                  <span className="text-slate-400">Outlet: {alert.branchName}</span>
                  <span className="text-slate-400 inline-flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {new Date(alert.createdAt).toLocaleString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="text-sm font-extrabold text-[#041F56] flex items-center gap-2 flex-wrap">
                  <span>{alert.title}</span>
                  {alert.refTag && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[10px] font-bold">
                      {alert.refTag}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!alert.isRead && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge([alert.id])}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold cursor-pointer"
                  >
                    Acknowledge
                  </button>
                )}

                <Link
                  href={alert.detailsHref}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-[#041F56] text-xs font-bold inline-flex items-center gap-1.5"
                >
                  Review Details <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                <Link
                  href={alert.actionHref}
                  onClick={() => {
                    if (!alert.isRead) void handleAcknowledge([alert.id]);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                >
                  <Zap className="h-3.5 w-3.5" /> {alert.actionLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}