'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Loader2, EyeOff } from 'lucide-react';
import api from '../../../../../lib/api';

interface AuditLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  systemQty: number;
  physicalCount: number;
  unitCost: number;
  variance: number;
  varianceValue: number;
  remarks: string;
}

export default function AuditSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<any>(null);
  const [items, setItems] = useState<AuditLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    api
      .get(`/inventory/audits/${id}`)
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          setSession(data);
          setItems(
            (data.items || []).map((i: any) => ({
              ...i,
              remarks: i.remarks || '',
            }))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isReconciled = session?.status === 'RECONCILED';
  const hideSystemQty = Boolean(session?.blindMode && !isReconciled);

  const updateItem = (lineId: string, field: 'physicalCount' | 'remarks', value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== lineId) return item;
        if (field === 'physicalCount') {
          const count = Math.max(0, Number(value) || 0);
          const variance = count - item.systemQty;
          return { ...item, physicalCount: count, variance, varianceValue: variance * item.unitCost };
        }
        return { ...item, remarks: value };
      })
    );
  };

  const netFinancialVariance = useMemo(
    () => items.reduce((sum, i) => sum + (i.physicalCount - i.systemQty) * i.unitCost, 0),
    [items]
  );

  const handleReconcile = async () => {
    if (!window.confirm('Finalize this stocktake, calculate financial variances, and update Inventory Central?')) {
      return;
    }
    try {
      setReconciling(true);
      await api.patch(`/inventory/audits/${id}/reconcile`, {
        items: items.map((i) => ({
          id: i.id,
          physicalCount: i.physicalCount,
          remarks: i.remarks,
        })),
      });
      router.push('/dashboard/inventory/audits');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to reconcile stocktake.');
    } finally {
      setReconciling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#0554F4]" />
      </div>
    );
  }

  if (!session) {
    return <div className="p-8 text-center text-slate-500 font-bold">Audit session not found.</div>;
  }

  return (
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <Link href="/dashboard/inventory/audits" className="text-xs font-bold text-[#0554F4] inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Audits
          </Link>
          <h1 className="text-2xl font-black text-[#041F56]">
            Audit Sheet: {session.reference}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {session.auditType} &bull; {session.branch} &bull; Auditor: {session.auditor}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {!hideSystemQty && (
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase">Net Financial Variance</p>
              <p className={`text-lg font-mono font-black ${netFinancialVariance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {netFinancialVariance >= 0 ? '+' : ''}KES {netFinancialVariance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {!isReconciled && (
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-2 disabled:opacity-50"
            >
              {reconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Reconcile &amp; Finalize
            </button>
          )}
        </div>
      </div>

      {hideSystemQty && (
        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl text-xs font-bold text-purple-800 flex items-center gap-2">
          <EyeOff className="h-4 w-4 shrink-0" />
          Blind Counting Mode is active. System quantities and financial variances are hidden until you click Reconcile &amp; Finalize.
        </div>
      )}

      {/* Sheet Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-x-auto">
        <table className="w-full min-w-[900px] divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Product &amp; SKU</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Unit Cost</th>
              {!hideSystemQty && <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">System Qty</th>}
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Physical Count *</th>
              {!hideSystemQty && <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Unit Variance</th>}
              {!hideSystemQty && <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Financial Variance</th>}
              <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map((item) => {
              const unitVar = item.physicalCount - item.systemQty;
              const finVar = unitVar * item.unitCost;
              return (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{item.productName}</p>
                    <p className="text-xs font-mono text-slate-400">
                      SKU: {item.sku} {item.barcode ? `• ${item.barcode}` : ''}
                    </p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                    KES {item.unitCost.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  {!hideSystemQty && (
                    <td className="px-6 py-4 font-mono font-black text-slate-900">{item.systemQty}</td>
                  )}
                  <td className="px-6 py-4">
                    {isReconciled ? (
                      <span className="font-mono font-black text-slate-900">{item.physicalCount}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={item.physicalCount}
                        onChange={(e) => updateItem(item.id, 'physicalCount', e.target.value)}
                        className="w-28 px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
                      />
                    )}
                  </td>
                  {!hideSystemQty && (
                    <td className="px-6 py-4 font-mono font-black">
                      <span className={unitVar < 0 ? 'text-rose-600' : unitVar > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                        {unitVar > 0 ? `+${unitVar}` : unitVar}
                      </span>
                    </td>
                  )}
                  {!hideSystemQty && (
                    <td className="px-6 py-4 font-mono font-black">
                      <span className={finVar < 0 ? 'text-rose-600' : finVar > 0 ? 'text-emerald-600' : 'text-slate-500'}>
                        {finVar >= 0 ? '+' : ''}KES {finVar.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4">
                    {isReconciled ? (
                      <span className="text-xs text-slate-500">{item.remarks || '—'}</span>
                    ) : (
                      <input
                        type="text"
                        value={item.remarks}
                        onChange={(e) => updateItem(item.id, 'remarks', e.target.value)}
                        placeholder="Optional discrepancy note"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#0554F4]"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}