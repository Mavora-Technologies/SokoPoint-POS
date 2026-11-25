'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  Clock,
  FileCheck2,
  X,
  XCircle,
  CheckCircle2,
  User,
  Trash2,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface RequisitionLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  currentOnHand: number;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

interface PurchaseRequisition {
  id: string;
  reference: string;
  branchName: string;
  department: string;
  priority: 'URGENT' | 'NORMAL' | string;
  estimatedCommitment: number;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'CONVERTED_TO_PO' | 'REJECTED' | string;
  submittedBy: string;
  notes?: string | null;
  createdAt: string;
  items: RequisitionLine[];
}

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequisition[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; stock?: number; costPrice?: number }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'URGENT' | 'NORMAL'>('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'ORDERED' | 'REJECTED'>('ALL');

  // Inspect Modal
  const [inspecting, setInspecting] = useState<PurchaseRequisition | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Submit Requisition Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [branchName, setBranchName] = useState('Main Branch');
  const [department, setDepartment] = useState('RETAIL_FLOOR');
  const [priority, setPriority] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; quantity: number }[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [reqRes, prodRes, brRes] = await Promise.all([
        api.get('/inventory/requisitions'),
        api.get('/products').catch(() => ({ data: { data: [] } })),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
      ]);

      setRequests(Array.isArray(reqRes.data?.data) ? reqRes.data.data : []);
      setProducts(Array.isArray(prodRes.data?.data) ? prodRes.data.data : []);
      const bList = Array.isArray(brRes.data?.data) ? brRes.data.data : [];
      setBranches(bList);
      if (bList[0]?.name) setBranchName(bList[0].name);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load purchase requisitions.');
      }
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (reqId: string, nextStatus: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoading(true);
      await api.patch(`/inventory/requisitions/${reqId}/status`, { status: nextStatus });
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update requisition status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (draftItems.length === 0) {
      alert('Add at least one SKU to submit a requisition.');
      return;
    }
    try {
      setCreating(true);
      await api.post('/inventory/requisitions', {
        branchName,
        department,
        priority,
        notes: notes.trim(),
        items: draftItems,
      });
      setIsCreateOpen(false);
      setNotes('');
      setDraftItems([]);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit requisition.');
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
      if (statusTab === 'PENDING' && r.status !== 'PENDING_REVIEW') return false;
      if (statusTab === 'APPROVED' && r.status !== 'APPROVED') return false;
      if (statusTab === 'ORDERED' && r.status !== 'CONVERTED_TO_PO') return false;
      if (statusTab === 'REJECTED' && r.status !== 'REJECTED') return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        r.reference.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.branchName.toLowerCase().includes(q) ||
        r.submittedBy.toLowerCase().includes(q)
      );
    });
  }, [requests, priorityFilter, statusTab, search]);

  const renderStatusBadge = (status: string) => {
    if (status === 'PENDING_REVIEW') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="h-3 w-3" /> PENDING REVIEW
        </span>
      );
    }
    if (status === 'CONVERTED_TO_PO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#0554F4] border border-blue-200">
          <FileCheck2 className="h-3 w-3" /> CONVERTED TO PO
        </span>
      );
    }
    if (status === 'APPROVED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" /> APPROVED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle className="h-3 w-3" /> REJECTED
      </span>
    );
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Purchasing &rsaquo; Internal Requisitions
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Purchase Requests &amp; Store Orders
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Internal stock requisitions submitted by store sections, cashiers, and floor supervisors for managerial sign-off.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setDraftItems(products[0] ? [{ productId: products[0].id, quantity: 10 }] : []);
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Submit Requisition
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

      {/* Search, Priority & Status Tabs Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by PR #, department, or requester..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="NORMAL">Normal</option>
          </select>

          <div className="inline-flex items-center bg-slate-100/80 p-1 rounded-xl">
            {[
              { key: 'ALL', label: 'All' },
              { key: 'PENDING', label: 'PENDING' },
              { key: 'APPROVED', label: 'APPROVED' },
              { key: 'ORDERED', label: 'Ordered' },
              { key: 'REJECTED', label: 'REJECTED' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                  statusTab === tab.key
                    ? 'bg-white text-[#041F56] font-bold shadow-xs'
                    : 'text-slate-500 font-medium hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requisitions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[920px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">REQUISITION #</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">DEPARTMENT / OUTLET</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">PRIORITY</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ESTIMATED COMMITMENT</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">APPROVAL STATUS</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">SUBMITTED BY</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">CREATED DATE</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center text-slate-400 font-bold">
                  No purchase requisitions found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{r.reference}</td>
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900 uppercase">{r.department}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{r.branchName}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        r.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-blue-50 text-[#0554F4]'
                      }`}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-[#041F56]">
                    KES {Number(r.estimatedCommitment || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4">{renderStatusBadge(r.status)}</td>
                  <td className="px-5 py-4 text-[#0554F4]">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{r.submittedBy}</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {new Date(r.createdAt).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setInspecting(r)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0554F4] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      Inspect &rarr;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INSPECT REQUISITION MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">
                  Requisition Details &bull; {inspecting.reference}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {inspecting.department} &bull; {inspecting.branchName} &bull; Submitted by {inspecting.submittedBy}
                </p>
              </div>
              <button
                onClick={() => setInspecting(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                REQUISITIONED INVENTORY ITEMS ({inspecting.items.length})
              </p>

              <div className="rounded-2xl border border-slate-200/80 overflow-x-auto">
                <table className="w-full min-w-[540px] divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">PRODUCT &amp; SKU</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">CURRENT ON-HAND</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">REQUESTED QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">EST. UNIT COST</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspecting.items.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#041F56]">{line.productName}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{line.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {line.currentOnHand} pcs
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#0554F4]">
                          {line.quantity} pcs
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          KES {Number(line.unitCost || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-[#041F56]">
                          KES {Number(line.subtotal || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Estimated Total Commitment Strip */}
            <div className="rounded-2xl bg-slate-50/80 border border-slate-200/70 px-5 py-3.5 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600">Estimated Total Commitment:</span>
              <span className="text-base font-mono font-black text-[#041F56]">
                KES {Number(inspecting.estimatedCommitment || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Requester Notes Strip */}
            <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-xs">
              <span className="font-bold text-slate-500">Requester Notes: </span>
              <span className="text-slate-700">{inspecting.notes || 'No notes provided.'}</span>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer"
              >
                Close
              </button>

              {inspecting.status === 'PENDING_REVIEW' && (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(inspecting.id, 'REJECTED')}
                    className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-600 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4" /> Decline
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStatusUpdate(inspecting.id, 'APPROVED')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Approve Requisition
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT REQUISITION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">Submit Purchase Requisition</h2>
                <p className="text-xs text-[#176E84]">Request store restock items for managerial sign-off</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequisition} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Branch / Outlet</label>
                  <select
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    {branches.length > 0 ? (
                      branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)
                    ) : (
                      <option value="Main Branch">Main Branch</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="RETAIL_FLOOR">Retail Floor</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="SUPERMARKET">Supermarket</option>
                    <option value="WAREHOUSE">Warehouse</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-[#041F56]">Requisitioned SKUs</label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftItems((prev) => [...prev, { productId: products[0]?.id || '', quantity: 10 }])
                    }
                    className="text-xs font-bold text-[#0554F4] hover:underline cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>
                {draftItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      required
                      value={line.productId}
                      onChange={(e) =>
                        setDraftItems((prev) =>
                          prev.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it))
                        )
                      }
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku || 'NO-SKU'})
                        </option>
                      ))}
                    </select>
                    <input
                      required
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) =>
                        setDraftItems((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value) || 1) } : it
                          )
                        )
                      }
                      className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1">Requester Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Fast-moving weekend stock replenishment"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs font-bold text-slate-500 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}