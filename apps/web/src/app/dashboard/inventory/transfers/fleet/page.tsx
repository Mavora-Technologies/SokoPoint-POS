'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Truck, Plus, RefreshCw, Search, X, Loader2, Snowflake, CheckCircle2 } from 'lucide-react';
import api from '../../../../../lib/api';

interface FleetVehicle {
  id: string;
  plateNumber: string;
  makeModel: string;
  category: string;
  baseDepot: string;
  driverName: string;
  driverPhone: string;
  maxPayloadKg: number;
  isReefer: boolean;
  status: string;
}

export default function FleetConsolePage() {
  const [kpis, setKpis] = useState({ totalAssets: 0, standbyCount: 0, enRouteCount: 0, reeferCount: 0, workshopCount: 0 });
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [activeConsignments, setActiveConsignments] = useState<any[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Vehicle Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    plateNumber: '',
    makeModel: '',
    category: 'BOX_TRUCK',
    baseDepot: 'Main Branch',
    driverName: '',
    driverPhone: '',
    maxPayloadKg: '1500',
    isReefer: false,
  });

  const loadFleet = useCallback(async () => {
    try {
      setLoading(true);
      const [fleetRes, bRes] = await Promise.all([
        api.get('/inventory/transfers/fleet'),
        api.get('/branches').catch(() => ({ data: { data: [] } })),
      ]);
      const data = fleetRes.data?.data;
      if (data) {
        if (data.kpis) setKpis(data.kpis);
        setVehicles(Array.isArray(data.vehicles) ? data.vehicles : []);
        setActiveConsignments(Array.isArray(data.activeConsignments) ? data.activeConsignments : []);
      }
      const bList = Array.isArray(bRes.data?.data) ? bRes.data.data : [];
      setBranches(bList);
      if (bList[0]) setForm((prev) => ({ ...prev, baseDepot: bList[0].name }));
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFleet();
  }, [loadFleet]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/inventory/transfers/fleet', {
        ...form,
        maxPayloadKg: Number(form.maxPayloadKg) || 1500,
      });
      setIsModalOpen(false);
      setForm({
        plateNumber: '',
        makeModel: '',
        category: 'BOX_TRUCK',
        baseDepot: branches[0]?.name || 'Main Branch',
        driverName: '',
        driverPhone: '',
        maxPayloadKg: '1500',
        isReefer: false,
      });
      await loadFleet();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to register vehicle asset.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = vehicles.filter((v) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      v.plateNumber.toLowerCase().includes(q) ||
      v.driverName.toLowerCase().includes(q) ||
      v.baseDepot.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            Inter-Branch Logistics &amp; Fleet Telemetry
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56]">
            Logistics Fleet Management &amp; Dispatch Console
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Real-time track-and-trace for internal transfer trucks, cold-chain vans, and driver manifests.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/inventory/transfers" className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
            Transfer Orders &nearr;
          </Link>
          <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add Vehicle Asset
          </button>
          <button onClick={loadFleet} className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase">TOTAL FLEET ASSETS</p><p className="text-2xl font-black text-[#041F56] font-mono mt-1">{kpis.totalAssets}</p></div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-emerald-600 uppercase">AVAILABLE STANDBY</p><p className="text-2xl font-black text-emerald-600 font-mono mt-1">{kpis.standbyCount}</p></div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-[#0554F4] uppercase">EN ROUTE CONSIGNMENTS</p><p className="text-2xl font-black text-[#0554F4] font-mono mt-1">{kpis.enRouteCount}</p></div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-purple-600 uppercase">COLD CHAIN REEFER</p><p className="text-2xl font-black text-purple-600 font-mono mt-1">{kpis.reeferCount}</p></div>
        <div className="bg-white p-5 rounded-3xl border border-slate-100"><p className="text-[10px] font-black text-amber-600 uppercase">WORKSHOP &amp; SERVICE</p><p className="text-2xl font-black text-amber-600 font-mono mt-1">{kpis.workshopCount}</p></div>
      </div>

      {/* Active In-Transit Strip */}
      {activeConsignments.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-100 space-y-3">
          <h2 className="text-sm font-black text-[#041F56]">Active In-Transit Inter-Branch Consignments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeConsignments.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono font-black text-[#0554F4]">{c.reference}</span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold">IN_TRANSIT</span>
                </div>
                <p className="font-mono font-bold text-slate-900">{c.vehiclePlate || 'Unassigned'}</p>
                <p className="text-slate-600">{c.sourceBranch} &rarr; {c.destinationBranch}</p>
                <p className="text-[11px] text-slate-500">Driver: {c.driverName || '—'} ({c.driverPhone || '—'})</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Vehicle Ledger */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          <h2 className="text-sm font-black text-[#041F56]">Master Vehicle &amp; Carrier Ledger ({vehicles.length} Assets)</h2>
          <div className="relative w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plate, driver, depot..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase">VEHICLE PLATE &amp; MAKE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase">CATEGORY &amp; PAYLOAD</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase">THERMAL SPEC</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase">DRIVER</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase">BASE DEPOT</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-slate-400 uppercase">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-14 text-center"><Loader2 className="h-7 w-7 animate-spin text-[#0554F4] mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-14 text-center text-slate-400">No fleet vehicles registered yet.</td></tr>
              ) : (
                filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4"><p className="font-mono font-black text-slate-900">{v.plateNumber}</p><p className="text-[11px] text-slate-500">{v.makeModel}</p></td>
                    <td className="px-6 py-4"><p className="font-bold text-slate-800">{v.category.replace('_', ' ')}</p><p className="text-[10px] text-slate-400">Payload: {v.maxPayloadKg.toLocaleString()} KG</p></td>
                    <td className="px-6 py-4">
                      {v.isReefer ? (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-bold"><Snowflake className="h-3.5 w-3.5" /> Cold Chain Reefer</span>
                      ) : (
                        <span className="italic text-slate-500">Dry Cargo Ambient</span>
                      )}
                    </td>
                    <td className="px-6 py-4"><p className="font-bold text-slate-900">{v.driverName}</p><p className="text-[11px] font-mono text-slate-500">{v.driverPhone}</p></td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{v.baseDepot}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" /> {v.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD VEHICLE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Add Fleet Vehicle Asset</h2>
                <p className="text-xs text-slate-500">Register a delivery truck, van, or motorbike to your logistics pool</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Registration Plate *</label>
                  <input required type="text" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value })} placeholder="E.G. KDE 321B" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Make &amp; Model *</label>
                  <input required type="text" value={form.makeModel} onChange={(e) => setForm({ ...form, makeModel: e.target.value })} placeholder="e.g. Isuzu FRR / HiAce" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Asset Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold">
                    <option value="BOX_TRUCK">Box Truck</option>
                    <option value="PICKUP">Pickup</option>
                    <option value="REEFER_VAN">Refrigerated Reefer Van</option>
                    <option value="MOTORBIKE">Delivery Motorbike</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Assigned Base Depot</label>
                  <select value={form.baseDepot} onChange={(e) => setForm({ ...form, baseDepot: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold">
                    {branches.length > 0 ? branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>) : <option value="Main Branch">Main Branch</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Driver Name *</label>
                  <input required type="text" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Driver Full Name" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Driver Phone *</label>
                  <input required type="text" value={form.driverPhone} onChange={(e) => setForm({ ...form, driverPhone: e.target.value })} placeholder="2547XXXXXXXX" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Max Payload Rating (KG)</label>
                  <input type="number" min="50" value={form.maxPayloadKg} onChange={(e) => setForm({ ...form, maxPayloadKg: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono" />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-[#041F56] pt-4 cursor-pointer">
                  <input type="checkbox" checked={form.isReefer} onChange={(e) => setForm({ ...form, isReefer: e.target.checked })} />
                  <span>Reefer Cold-Chain Unit</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0554F4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Register Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}