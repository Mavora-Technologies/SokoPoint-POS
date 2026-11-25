'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Truck,
  Clock,
  Box,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  X,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import api from '../../../../lib/api';

interface TransferItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantityRequested: number;
  quantityReceived: number;
  unitCost: number;
  lineValuation: number;
  shrinkageQty: number;
  shrinkageValue: number;
}

interface TransferOrder {
  id: string;
  reference: string;
  sourceBranch: string;
  destinationBranch: string;
  status: string;
  vehiclePlate?: string | null;
  driverName?: string | null;
  totalValuation: number;
  shrinkageValue: number;
  remarks?: string | null;
  createdAt: string;
  dispatchedAt?: string | null;
  receivedAt?: string | null;
  items: TransferItem[];
}

export default function StockTransportOrdersPage() {
  const [kpis, setKpis] = useState({ inTransitValuation: 0, activeShipments: 0, pendingCount: 0, totalConsignments: 0 });
  const [transfers, setTransfers] = useState<TransferOrder[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; stock: number; costPrice?: number }[]>([]);
  const [vehicles, setVehicles] = useState<{ id: string; plateNumber: string; driverName: string; status: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'RECEIVED' | 'SHRINKAGE_CLAIM'>('ALL');

  // Create STO Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sourceBranch, setSourceBranch] = useState('');
  const [destinationBranch, setDestinationBranch] = useState('');
  const [remarks, setRemarks] = useState('');
  const [draftItems, setDraftItems] = useState<{ productId: string; quantity: number }[]>([]);

  // Inspect Manifest Modal
  const [inspecting, setInspecting] = useState<TransferOrder | null>(null);
  const [dispatchVehicleId, setDispatchVehicleId] = useState('');
  const [receivedCounts, setReceivedCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stoRes, bRes, pRes, fRes] = await Promise.all([
        api.get('/inventory/transfers'),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
        api.get('/products').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/transfers/fleet').catch(() => ({ data: { data: { vehicles: [] } } })),
      ]);

      const stoPayload = stoRes.data?.data;
      if (stoPayload) {
        if (stoPayload.kpis) setKpis(stoPayload.kpis);
        setTransfers(Array.isArray(stoPayload.transfers) ? stoPayload.transfers : []);
      }

      const bList = Array.isArray(bRes.data?.data) ? bRes.data.data : [];
      setBranches(bList);
      if (bList[0] && !sourceBranch) setSourceBranch(bList[0].name);

      setProducts(Array.isArray(pRes.data?.data) ? pRes.data.data : []);
      setVehicles(Array.isArray(fRes.data?.data?.vehicles) ? fRes.data.data.vehicles : []);
    } catch {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [sourceBranch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addDraftLine = () => {
    setDraftItems((prev) => [...prev, { productId: products[0]?.id || '', quantity: 1 }]);
  };

  const handleCreateSTO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceBranch || !destinationBranch || draftItems.length === 0) {
      alert('Select source, destination, and at least one product.');
      return;
    }
    try {
      setCreating(true);
      await api.post('/inventory/transfers', {
        sourceBranch,
        destinationBranch,
        remarks: remarks.trim(),
        items: draftItems,
      });
      setIsCreateOpen(false);
      setDraftItems([]);
      setRemarks('');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to create Stock Transport Order.');
    } finally {
      setCreating(false);
    }
  };

  const openManifest = (order: TransferOrder) => {
    setInspecting(order);
    setDispatchVehicleId(vehicles.find((v) => v.status === 'STANDBY')?.id || '');
    const initialRec: Record<string, number> = {};
    order.items.forEach((i) => {
      initialRec[i.id] = i.quantityReceived || i.quantityRequested;
    });
    setReceivedCounts(initialRec);
  };

  const handleDispatch = async () => {
    if (!inspecting) return;
    try {
      setActionLoading(true);
      await api.patch(`/inventory/transfers/${inspecting.id}/dispatch`, {
        vehicleId: dispatchVehicleId || null,
      });
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to dispatch consignment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReceive = async () => {
    if (!inspecting) return;
    try {
      setActionLoading(true);
      await api.patch(`/inventory/transfers/${inspecting.id}/receive`, {
        items: inspecting.items.map((i) => ({
          id: i.id,
          quantityReceived: receivedCounts[i.id] ?? i.quantityRequested,
        })),
      });
      setInspecting(null);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to confirm receipt.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return transfers.filter((t) => {
      if (statusTab !== 'ALL' && t.status !== statusTab) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.reference.toLowerCase().includes(q) ||
        t.sourceBranch.toLowerCase().includes(q) ||
        t.destinationBranch.toLowerCase().includes(q) ||
        (t.vehiclePlate || '').toLowerCase().includes(q) ||
        (t.driverName || '').toLowerCase().includes(q)
      );
    });
  }, [transfers, statusTab, search]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            Inventory Ledger &rsaquo; Inter-Branch Logistics
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
            Stock Transport Orders (STO) &amp; Consignments
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Coordinate warehouse bulk replenishment, in-transit fleet custody, waybills, and shrinkage write-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dashboard/inventory/transfers/fleet"
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Truck className="h-4 w-4 text-[#0554F4]" /> Fleet Console
          </Link>
          <button
            onClick={() => {
              setDraftItems(products[0] ? [{ productId: products[0].id, quantity: 1 }] : []);
              setIsCreateOpen(true);
            }}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Raise Stock Transport Order
          </button>
          <button onClick={loadData} className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">IN-TRANSIT FLEET CUSTODY</p>
            <p className="text-2xl font-black text-[#0554F4] font-mono mt-1">
              KES {kpis.inTransitValuation.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#0554F4] font-semibold mt-0.5">Across {kpis.activeShipments} active shipments</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-[#0554F4]"><Truck className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">REQUISITIONS PENDING PICK</p>
            <p className="text-2xl font-black text-amber-600 font-mono mt-1">{kpis.pendingCount} Orders</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Awaiting warehouse dispatch</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><Clock className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">TOTAL CONSIGNMENTS</p>
            <p className="text-2xl font-black text-[#041F56] font-mono mt-1">{kpis.totalConsignments} Records</p>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Audited multi-branch transfers</p>
          </div>
          <div className="p-3 bg-slate-100 rounded-2xl text-slate-600"><Box className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by STO #, branch, vehicle plate, or driver..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ALL', label: 'All Transfers' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'IN_TRANSIT', label: 'In Transit' },
            { key: 'RECEIVED', label: 'Completed' },
            { key: 'SHRINKAGE_CLAIM', label: 'Shrinkage Claim' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                statusTab === tab.key ? 'bg-[#041F56] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* STO Ledger Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[980px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">STO NUMBER</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">ORIGIN &rarr; DESTINATION ROUTE</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">CARRIER &amp; FLEET</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">TRANSFER VALUATION</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">STATUS</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">DISPATCHED</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase">RECEIVED</th>
              <th className="px-6 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium">
            {loading ? (
              <tr><td colSpan={8} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-6 py-16 text-center text-slate-400">No Stock Transport Orders found.</td></tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{t.reference}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">{t.sourceBranch}</span>
                    <span className="mx-1.5 text-slate-400">&rarr;</span>
                    <span className="font-bold text-[#0554F4]">{t.destinationBranch}</span>
                  </td>
                  <td className="px-6 py-4">
                    {t.vehiclePlate ? (
                      <>
                        <p className="font-mono font-bold text-slate-900">{t.vehiclePlate}</p>
                        <p className="text-[10px] text-slate-500">Driver: {t.driverName}</p>
                      </>
                    ) : (
                      <span className="italic text-slate-400">Not Assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    <p className="font-black text-[#041F56]">
                      KES {Number(t.totalValuation || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                    {Number(t.shrinkageValue || 0) > 0 && (
                      <p className="text-[10px] font-bold text-rose-600">
                        -KES {Number(t.shrinkageValue).toLocaleString('en-KE', { minimumFractionDigits: 2 })} (Loss)
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        t.status === 'RECEIVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : t.status === 'SHRINKAGE_CLAIM'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : t.status === 'IN_TRANSIT'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {t.status === 'RECEIVED' ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                      {t.status === 'RECEIVED' ? 'RECEIVED & STORED' : t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">
                    {t.dispatchedAt ? new Date(t.dispatchedAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-500">
                    {t.receivedAt ? new Date(t.receivedAt).toLocaleDateString('en-GB') : '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openManifest(t)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#0554F4] rounded-xl text-[11px] font-bold"
                    >
                      Inspect Manifest <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INITIATE STO MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-[#041F56]">Initiate Stock Transport Order (STO)</h2>
                <p className="text-xs text-[#176E84]">Source replenishment stock from warehouse or retail outlet</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreateSTO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Source (Dispatching Branch) *</label>
                  <select required value={sourceBranch} onChange={(e) => setSourceBranch(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                    <option value="">Select dispatch origin...</option>
                    {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Destination (Receiving Branch) *</label>
                  <select required value={destinationBranch} onChange={(e) => setDestinationBranch(e.target.value)} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white">
                    <option value="">Select receiving outlet...</option>
                    {branches.map((b) => <option key={b.id} value={b.name} disabled={b.name === sourceBranch}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-[#041F56]">Transfer Items</label>
                  <button type="button" onClick={addDraftLine} className="text-xs font-bold text-[#0554F4] hover:underline">
                    + Add Product
                  </button>
                </div>
                {draftItems.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select
                      required
                      value={line.productId}
                      onChange={(e) =>
                        setDraftItems((prev) => prev.map((it, i) => (i === idx ? { ...it, productId: e.target.value } : it)))
                      }
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku || 'N/A'}) - Avail: {Number(p.stock ?? 0)}
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
                          prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, Number(e.target.value) || 1) } : it))
                        )
                      }
                      className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Transfer Notes / Logistics Ref</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Weekend supermarket replenishment via Company Van"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50">
                  {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create Transfer Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT MANIFEST / DISPATCH / RECEIVE MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Manifest: {inspecting.reference}</h2>
                <p className="text-xs text-slate-500">
                  {inspecting.sourceBranch} &rarr; {inspecting.destinationBranch} &bull; Status: <strong>{inspecting.status}</strong>
                </p>
              </div>
              <button onClick={() => setInspecting(null)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
              {inspecting.items.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{item.productName}</p>
                    <p className="text-[10px] font-mono text-slate-400">SKU: {item.sku} &bull; Requested: {item.quantityRequested} units</p>
                  </div>
                  {inspecting.status === 'IN_TRANSIT' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">Received:</span>
                      <input
                        type="number"
                        min="0"
                        max={item.quantityRequested}
                        value={receivedCounts[item.id] ?? item.quantityRequested}
                        onChange={(e) =>
                          setReceivedCounts((prev) => ({ ...prev, [item.id]: Math.max(0, Number(e.target.value) || 0) }))
                        }
                        className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold"
                      />
                    </div>
                  ) : (
                    <div className="text-right font-mono">
                      <p className="font-black text-[#041F56]">KES {item.lineValuation.toLocaleString('en-KE')}</p>
                      {item.shrinkageQty > 0 && <p className="text-[10px] text-rose-600 font-bold">-{item.shrinkageQty} lost</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {inspecting.status === 'PENDING' && (
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                <label className="block text-xs font-black text-[#041F56]">Assign Fleet Vehicle for Dispatch</label>
                <select
                  value={dispatchVehicleId}
                  onChange={(e) => setDispatchVehicleId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white"
                >
                  <option value="">-- Dispatch without Fleet Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber} — {v.driverName} ({v.status})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDispatch}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl"
                >
                  {actionLoading ? 'Dispatching...' : 'Dispatch Consignment'}
                </button>
              </div>
            )}

            {inspecting.status === 'IN_TRANSIT' && (
              <button
                onClick={handleConfirmReceive}
                disabled={actionLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                {actionLoading ? 'Confirming...' : 'Confirm Receipt & Store Inventory'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}