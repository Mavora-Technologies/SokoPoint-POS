'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  DollarSign,
  ShoppingBasket,
  FileText,
  Sparkles,
  Search,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Building2,
  ArrowRight,
  LogIn,
  X,
} from 'lucide-react';
import api from '../../../../lib/api';

interface ReorderRow {
  productId: string;
  name: string;
  sku: string;
  stockOnHand: number;
  safetyBuffer: number;
  suggestedQty: number;
  unitCost: number;
  supplierId: string | null;
  supplierName: string;
  urgency: 'CRITICAL' | 'LOW_STOCK' | 'HEALTHY';
}

interface SupplierOption {
  id: string;
  name: string;
  paymentTerms?: string;
}

export default function ReorderEnginePage() {
  const [items, setItems] = useState<ReorderRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('Main Branch');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customQty, setCustomQty] = useState<Record<string, number>>({});
  const [customSupplier, setCustomSupplier] = useState<Record<string, string>>({});

  const [filterTab, setFilterTab] = useState<'ACTIONABLE' | 'CRITICAL' | 'LOW_STOCK' | 'ALL'>('ACTIONABLE');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'PR' | 'PO' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadEngine = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const res = await api.get('/inventory/reorder');
      const data = res.data?.data;
      if (data) {
        const loadedItems: ReorderRow[] = Array.isArray(data.items) ? data.items : [];
        const loadedSuppliers: SupplierOption[] = Array.isArray(data.suppliers) ? data.suppliers : [];
        const loadedBranches = Array.isArray(data.branches) ? data.branches : [];

        setItems(loadedItems);
        setSuppliers(loadedSuppliers);
        setBranches(loadedBranches);
        if (loadedBranches[0]?.name) setSelectedBranch(loadedBranches[0].name);

        // Auto-select actionable items & initialize quantities
        const nextSelected = new Set<string>();
        const nextQty: Record<string, number> = {};
        const nextSup: Record<string, string> = {};

        loadedItems.forEach((item) => {
          nextQty[item.productId] = item.suggestedQty > 0 ? item.suggestedQty : Math.max(item.safetyBuffer, 10);
          if (item.supplierId) nextSup[item.productId] = item.supplierId;
          if (item.urgency !== 'HEALTHY') nextSelected.add(item.productId);
        });

        setSelectedIds(nextSelected);
        setCustomQty(nextQty);
        setCustomSupplier(nextSup);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load Smart Reorder Engine.');
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEngine();
  }, [loadEngine]);

  const supplierMap = useMemo(() => {
    const map = new Map<string, SupplierOption>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  const getEffectiveSupplier = useCallback(
    (item: ReorderRow) => {
      const supId = customSupplier[item.productId] || item.supplierId || '';
      const found = supId ? supplierMap.get(supId) : null;
      return {
        id: found?.id || null,
        name: found?.name || item.supplierName || 'Unassigned Supplier',
        paymentTerms: found?.paymentTerms || 'NET_30',
      };
    },
    [customSupplier, supplierMap]
  );

  // Vendor Order Groupings (for actionable/checked items)
  const vendorGroups = useMemo(() => {
    const map = new Map<
      string,
      { supplierId: string | null; name: string; paymentTerms: string; productIds: string[]; names: string[]; total: number }
    >();

    items
      .filter((i) => i.urgency !== 'HEALTHY' || selectedIds.has(i.productId))
      .forEach((item) => {
        const sup = getEffectiveSupplier(item);
        const key = sup.id || 'UNASSIGNED';
        const qty = customQty[item.productId] ?? item.suggestedQty;
        const lineTotal = qty * item.unitCost;

        if (!map.has(key)) {
          map.set(key, {
            supplierId: sup.id,
            name: sup.name,
            paymentTerms: sup.paymentTerms,
            productIds: [],
            names: [],
            total: 0,
          });
        }
        const entry = map.get(key)!;
        entry.productIds.push(item.productId);
        entry.names.push(item.name);
        entry.total += lineTotal;
      });

    return Array.from(map.values());
  }, [items, selectedIds, customQty, getEffectiveSupplier]);

  const kpis = useMemo(() => {
    const outOfStock = items.filter((i) => i.urgency === 'CRITICAL').length;
    const lowStock = items.filter((i) => i.urgency === 'LOW_STOCK').length;
    const estCommitment = items
      .filter((i) => i.urgency !== 'HEALTHY')
      .reduce((sum, i) => sum + (customQty[i.productId] ?? i.suggestedQty) * i.unitCost, 0);
    const selectedCartValue = items
      .filter((i) => selectedIds.has(i.productId))
      .reduce((sum, i) => sum + (customQty[i.productId] ?? i.suggestedQty) * i.unitCost, 0);

    return { outOfStock, lowStock, estCommitment, selectedCartValue };
  }, [items, selectedIds, customQty]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (filterTab === 'ACTIONABLE' && i.urgency === 'HEALTHY') return false;
      if (filterTab === 'CRITICAL' && i.urgency !== 'CRITICAL') return false;
      if (filterTab === 'LOW_STOCK' && i.urgency !== 'LOW_STOCK') return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const sup = getEffectiveSupplier(i);
      return (
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        sup.name.toLowerCase().includes(q)
      );
    });
  }, [items, filterTab, search, getEffectiveSupplier]);

  const toggleSelect = (productId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    const allChecked = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.productId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((i) => {
        if (allChecked) next.delete(i.productId);
        else next.add(i.productId);
      });
      return next;
    });
  };

  const buildSelectedPayload = () => {
    return items
      .filter((i) => selectedIds.has(i.productId))
      .map((i) => {
        const sup = getEffectiveSupplier(i);
        return {
          productId: i.productId,
          quantity: Math.max(1, customQty[i.productId] ?? i.suggestedQty),
          unitCost: i.unitCost,
          supplierId: sup.id,
          supplierName: sup.name,
        };
      });
  };

  const handleSendInternalPR = async () => {
    const payloadItems = buildSelectedPayload();
    if (payloadItems.length === 0) {
      alert('Check at least one product to submit an Internal PR.');
      return;
    }
    try {
      setSubmitting('PR');
      const res = await api.post('/inventory/reorder/pr', {
        branchName: selectedBranch,
        priority: kpis.outOfStock > 0 ? 'URGENT' : 'NORMAL',
        items: payloadItems,
      });
      setFeedback(res.data?.message || 'Internal Purchase Requisition submitted.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit Internal PR.');
    } finally {
      setSubmitting(null);
    }
  };

  const handleGeneratePOs = async () => {
    const payloadItems = buildSelectedPayload();
    if (payloadItems.length === 0) {
      alert('Check at least one product to generate Purchase Orders.');
      return;
    }
    try {
      setSubmitting('PO');
      const res = await api.post('/inventory/reorder/generate-pos', {
        branchName: selectedBranch,
        items: payloadItems,
      });
      setFeedback(res.data?.message || 'Purchase Orders generated successfully.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate Purchase Orders.');
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            Inventory Ledger &rsaquo; Smart Reorder Engine (MRP)
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
            Automated Restock &amp; Order Point Planning
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Replenishment engine evaluating safety buffers, stockouts, and preferred supplier groupings across branches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {branches.length > 0 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#041F56]"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleSendInternalPR}
            disabled={submitting !== null || selectedIds.size === 0}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting === 'PR' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-slate-500" />}
            Send Internal PR
          </button>
          <button
            onClick={handleGeneratePOs}
            disabled={submitting !== null || selectedIds.size === 0}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitting === 'PO' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate POs ({selectedIds.size}) <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button onClick={loadEngine} className="p-2.5 bg-white border border-slate-200 rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex justify-between items-center">
          <span className="inline-flex items-center gap-2"><AlertCircle className="h-4 w-4" /> {error}</span>
          {isUnauthorized && (
            <Link href="/login" className="px-3 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1">
              <LogIn className="h-3.5 w-3.5" /> Sign In
            </Link>
          )}
        </div>
      )}

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex justify-between items-center">
          <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {feedback}</span>
          <button onClick={() => setFeedback(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">OUT OF STOCK ALERT</p>
            <p className="text-2xl font-black text-rose-600 font-mono mt-1">{kpis.outOfStock} SKUs</p>
            <p className="text-[11px] text-rose-500 font-semibold mt-0.5">Critical shelf disruption</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600"><AlertCircle className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">LOW STOCK WATCH</p>
            <p className="text-2xl font-black text-amber-600 font-mono mt-1">{kpis.lowStock} SKUs</p>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Under safety minimums</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600"><AlertTriangle className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">EST. RESTOCK COMMITMENT</p>
            <p className="text-2xl font-black text-[#041F56] font-mono mt-1">
              KES {kpis.estCommitment.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-[#176E84] font-semibold mt-0.5">Across {vendorGroups.length} vendor(s)</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-2xl text-[#0554F4]"><DollarSign className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase">SELECTED CART VALUE</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
              KES {kpis.selectedCartValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{selectedIds.size} items checked</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><ShoppingBasket className="h-5 w-5" /></div>
        </div>
      </div>

      {/* Vendor Order Groupings */}
      {vendorGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-black text-[#041F56] uppercase tracking-wider">
              VENDOR ORDER GROUPINGS (ONE PO PER SUPPLIER)
            </p>
            <p className="text-[11px] text-[#0554F4] font-semibold">
              Click &quot;Select Only&quot; to isolate a single supplier&apos;s order
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {vendorGroups.map((group) => (
              <div key={group.supplierId || group.name} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-[#0554F4] shrink-0" />
                    <p className="text-xs font-black text-[#041F56] truncate">{group.name}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                    {group.productIds.length} SKUS
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{group.names.join(', ')}</p>
                <div className="flex justify-between items-end pt-2 border-t border-slate-100">
                  <div>
                    <p className="text-sm font-mono font-black text-[#041F56]">
                      KES {group.total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] font-mono text-slate-400">{group.paymentTerms}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set(group.productIds))}
                    className="text-xs font-bold text-[#0554F4] hover:underline inline-flex items-center gap-1"
                  >
                    Select Only <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { key: 'ACTIONABLE', label: `Actionable (${kpis.outOfStock + kpis.lowStock})` },
            { key: 'CRITICAL', label: `Depleted (${kpis.outOfStock})` },
            { key: 'LOW_STOCK', label: `Low Stock (${kpis.lowStock})` },
            { key: 'ALL', label: `Full Catalog (${items.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold ${
                filterTab === tab.key ? 'bg-[#041F56] text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reorder Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[960px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-5 py-4 w-10">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.productId))}
                  onChange={toggleAllVisible}
                  className="accent-[#0554F4]"
                />
              </th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">PRODUCT &amp; SKU</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">STOCK ON HAND</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">SAFETY BUFFER</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">REPLENISHMENT QTY</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">UNIT COST</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">SUBTOTAL COMMITMENT</th>
              <th className="px-4 py-4 text-[10px] font-black text-[#176E84] uppercase">PREFERRED SUPPLIER</th>
              <th className="px-5 py-4 text-[10px] font-black text-[#176E84] uppercase text-right">URGENCY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" /></td></tr>
            ) : filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No items match this filter</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const qty = customQty[item.productId] ?? item.suggestedQty;
                const subtotal = qty * item.unitCost;
                const supId = customSupplier[item.productId] || item.supplierId || '';

                return (
                  <tr key={item.productId} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.productId)}
                        onChange={() => toggleSelect(item.productId)}
                        className="accent-[#0554F4]"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-[#041F56]">{item.name}</p>
                      <p className="text-[10px] font-mono text-slate-400">{item.sku}</p>
                    </td>
                    <td className={`px-4 py-4 font-mono font-black ${item.stockOnHand <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                      {item.stockOnHand} pcs
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-500">{item.safetyBuffer} pcs</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          value={qty}
                          onChange={(e) =>
                            setCustomQty((prev) => ({ ...prev, [item.productId]: Math.max(1, Number(e.target.value) || 1) }))
                          }
                          className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono font-bold text-[#0554F4] outline-none focus:ring-2 focus:ring-[#0554F4]"
                        />
                        <span className="text-slate-400">pcs</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-slate-600">
                      KES {item.unitCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4 font-mono font-black text-[#041F56]">
                      KES {subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={supId}
                        onChange={(e) =>
                          setCustomSupplier((prev) => ({ ...prev, [item.productId]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white max-w-[200px]"
                      >
                        <option value="">Unassigned Supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                          item.urgency === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-600 border-rose-200'
                            : item.urgency === 'LOW_STOCK'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {item.urgency === 'CRITICAL' ? 'CRITICAL' : item.urgency === 'LOW_STOCK' ? 'LOW STOCK' : 'HEALTHY'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}