'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, Search } from 'lucide-react';
import api from '../../../../../lib/api';

interface StocktakeRow {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  systemQty: number;
  physicalCount: number;
  unitCost: number;
  remarks: string;
}

export default function NewStocktakeSessionPage() {
  const router = useRouter();
  const [rows, setRows] = useState<StocktakeRow[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('Main Branch');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/products').catch(() => ({ data: { data: [] } })),
      api.get('/branches').catch(() => ({ data: { data: [] } })),
    ])
      .then(([prodRes, branchRes]) => {
        const prodList = Array.isArray(prodRes.data?.data) ? prodRes.data.data : [];
        const branchList = Array.isArray(branchRes.data?.data) ? branchRes.data.data : [];

        setBranches(branchList);
        if (branchList[0]?.name) setSelectedBranch(branchList[0].name);

        setRows(
          prodList.map((p: any) => {
            const qty = Number(p.stock ?? p.reorderLevel ?? 0);
            return {
              productId: p.id,
              name: p.name,
              sku: p.sku || 'N/A',
              barcode: p.barcode || '',
              systemQty: qty,
              physicalCount: qty,
              unitCost: Number(p.costPrice ?? p.sellingPrice ?? 0),
              remarks: '',
            };
          })
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const updateRow = (productId: string, field: 'physicalCount' | 'remarks', value: string | number) => {
    setRows((prev) =>
      prev.map((r) =>
        r.productId === productId
          ? { ...r, [field]: field === 'physicalCount' ? Math.max(0, Number(value) || 0) : String(value) }
          : r
      )
    );
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.barcode.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalVarianceValue = useMemo(
    () => rows.reduce((sum, r) => sum + (r.physicalCount - r.systemQty) * r.unitCost, 0),
    [rows]
  );

  const discrepancyCount = useMemo(
    () => rows.filter((r) => r.physicalCount !== r.systemQty).length,
    [rows]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;

    if (
      !window.confirm(
        `Submit stocktake for ${rows.length} product(s) (${discrepancyCount} variance(s)) and reconcile Inventory Central?`
      )
    ) {
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/inventory/audits', {
        branch: selectedBranch,
        status: 'APPROVED',
        items: rows.map((r) => ({
          productId: r.productId,
          systemQty: r.systemQty,
          physicalCount: r.physicalCount,
          remarks: r.remarks,
        })),
      });
      router.push('/dashboard/inventory/audits');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit stocktake session.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6">
      <form onSubmit={handleSubmit} className="max-w-[1920px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Active Stocktake Session</h1>
            <p className="text-sm text-slate-500 mt-1">
              Count physical retail/wholesale stock, identify discrepancies, and submit for automatic reconciliation.
            </p>
          </div>
          <Link
            href="/dashboard/inventory/audits"
            className="text-sm font-bold text-[#0554F4] hover:underline inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Audits
          </Link>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by product name, SKU, or barcode..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {branches.length > 0 && (
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 bg-white"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Net Variance Value</p>
              <p
                className={`text-sm font-mono font-black ${
                  totalVarianceValue < 0 ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {totalVarianceValue >= 0 ? '+' : ''}KES{' '}
                {totalVarianceValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <button
              type="submit"
              disabled={submitting || rows.length === 0}
              className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit &amp; Reconcile ({rows.length})
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[860px] divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product &amp; SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">System Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Physical Count *</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Variance</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Remarks / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400 font-bold">
                    No active products found in your tenant catalog.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const variance = row.physicalCount - row.systemQty;
                  return (
                    <tr key={row.productId} className="hover:bg-slate-50/60">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{row.name}</p>
                        <p className="text-xs font-mono text-slate-400">
                          SKU: {row.sku} {row.barcode ? `• ${row.barcode}` : ''}
                        </p>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-slate-900">{row.systemQty}</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          min="0"
                          value={row.physicalCount}
                          onChange={(e) => updateRow(row.productId, 'physicalCount', e.target.value)}
                          className="w-28 px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
                        />
                      </td>
                      <td className="px-6 py-4 font-mono font-black">
                        <span
                          className={
                            variance < 0
                              ? 'text-red-600'
                              : variance > 0
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {variance > 0 ? `+${variance}` : variance}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={row.remarks}
                          onChange={(e) => updateRow(row.productId, 'remarks', e.target.value)}
                          placeholder="Optional discrepancy note"
                          className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-[#0554F4]"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
}