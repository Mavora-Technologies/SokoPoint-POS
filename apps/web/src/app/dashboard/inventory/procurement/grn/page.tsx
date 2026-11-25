'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  PackageCheck,
  RefreshCw,
  Loader2,
  CheckCircle2,
  User,
  X,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import api from '../../../../../lib/api';

interface GrnLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  acceptedQty: number;
  rejectedQty: number;
  unitPrice: number;
  rejectionReason?: string | null;
}

interface GrnRecord {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string;
  deliveryNoteRef: string;
  inspectionNotes?: string | null;
  status: string;
  verifiedBy: string;
  intakeDate: string;
  items: GrnLine[];
}

interface OpenPoItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unitPrice: number;
}

interface OpenPo {
  id: string;
  poNumber: string;
  supplierName: string;
  status: string;
  items: OpenPoItem[];
}

interface IntakeLineDraft {
  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  remainingQty: number;
  unitPrice: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason: string;
}

export default function GoodsReceivedNotesPage() {
  const [grns, setGrns] = useState<GrnRecord[]>([]);
  const [openPos, setOpenPos] = useState<OpenPo[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [search, setSearch] = useState('');

  // Inspect Manifest Modal
  const [inspecting, setInspecting] = useState<GrnRecord | null>(null);

  // Process Dock Delivery Modal
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState('');
  const [deliveryNoteRef, setDeliveryNoteRef] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [intakeLines, setIntakeLines] = useState<IntakeLineDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnauthorized(false);

    const [grnResult, poResult] = await Promise.allSettled([
      api.get('/inventory/grn'),
      api.get('/inventory/orders'),
    ]);

    if (grnResult.status === 'fulfilled') {
      const data = grnResult.value.data?.data ?? grnResult.value.data;
      setGrns(Array.isArray(data) ? data : []);
    } else {
      const err: any = grnResult.reason;
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load Goods Received Notes.');
      }
      setGrns([]);
    }

    if (poResult.status === 'fulfilled') {
      const poData = poResult.value.data?.data ?? poResult.value.data;
      const list: OpenPo[] = Array.isArray(poData) ? poData : [];
      const receivable = list.filter(
        (po) => !['CANCELLED', 'FULLY_RECEIVED', 'COMPLETED'].includes((po.status || '').toUpperCase())
      );
      setOpenPos(receivable);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const populateLinesForPo = (poId: string, poList: OpenPo[]) => {
    setSelectedPoId(poId);
    const po = poList.find((p) => p.id === poId);
    if (!po) {
      setIntakeLines([]);
      return;
    }
    setIntakeLines(
      (po.items || []).map((item) => {
        const remaining = Math.max(0, Number(item.orderedQty || 0) - Number(item.receivedQty || 0));
        return {
          purchaseOrderItemId: item.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          orderedQty: Number(item.orderedQty || 0),
          remainingQty: remaining,
          unitPrice: Number(item.unitPrice || 0),
          acceptedQty: remaining,
          rejectedQty: 0,
          rejectionReason: '',
        };
      })
    );
  };

  const openReceiveModal = () => {
    setDeliveryNoteRef('');
    setInspectionNotes('');
    if (openPos.length > 0) {
      populateLinesForPo(openPos[0].id, openPos);
    } else {
      setSelectedPoId('');
      setIntakeLines([]);
    }
    setIsReceiveOpen(true);
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId) {
      alert('Select a Purchase Order first.');
      return;
    }
    if (intakeLines.length === 0) {
      alert('No line items available on this Purchase Order.');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/inventory/grn', {
        purchaseOrderId: selectedPoId,
        deliveryNoteRef: deliveryNoteRef.trim(),
        inspectionNotes: inspectionNotes.trim(),
        items: intakeLines.map((l) => ({
          purchaseOrderItemId: l.purchaseOrderItemId,
          productId: l.productId,
          acceptedQty: l.acceptedQty,
          rejectedQty: l.rejectedQty,
          unitPrice: l.unitPrice,
          rejectionReason: l.rejectionReason.trim() || null,
        })),
      });
      setIsReceiveOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to confirm goods delivery.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grns;
    return grns.filter(
      (g) =>
        (g.grnNumber || '').toLowerCase().includes(q) ||
        (g.poNumber || '').toLowerCase().includes(q) ||
        (g.deliveryNoteRef || '').toLowerCase().includes(q) ||
        (g.supplierName || '').toLowerCase().includes(q)
    );
  }, [grns, search]);

  const activePo = useMemo(() => openPos.find((p) => p.id === selectedPoId) || null, [openPos, selectedPoId]);

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Purchasing &rsaquo; Goods Inward
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight">
            Goods Inward &amp; Receiving (GRN)
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Warehouse dock receipt verification, supplier delivery note matching, rejection logging, and automatic stock credits.
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
            onClick={openReceiveModal}
            className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <PackageCheck className="h-4 w-4" /> Process Dock Delivery
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

      {/* Search & Count Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-4 py-3 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search GRN #, PO #, delivery note, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0554F4]"
          />
        </div>

        <p className="text-xs font-bold text-[#176E84] self-end sm:self-auto">
          {filtered.length} Verified Goods Receipt{filtered.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* GRN Table */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-xs overflow-x-auto">
        <table className="w-full min-w-[900px] divide-y divide-slate-100 text-left text-xs">
          <thead className="bg-slate-50/70">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase">GRN NUMBER</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">ORIGIN PO #</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">VENDOR DELIVERY NOTE #</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">SUPPLIER</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">INTAKE DATE</th>
              <th className="px-5 py-4 text-[10px] font-bold text-[#176E84] uppercase">VERIFIED BY</th>
              <th className="px-6 py-4 text-[10px] font-bold text-[#176E84] uppercase text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-[#0554F4] mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center text-slate-400 font-bold">
                  No goods received notes recorded yet.
                </td>
              </tr>
            ) : (
              filtered.map((g) => (
                <tr key={g.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-mono font-bold text-[#041F56]">{g.grnNumber}</td>
                  <td className="px-5 py-4 font-mono font-bold text-[#0554F4]">{g.poNumber}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">{g.deliveryNoteRef}</td>
                  <td className="px-5 py-4 font-bold text-slate-900">{g.supplierName}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {new Date(g.intakeDate).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-5 py-4 text-[#0554F4]">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{g.verifiedBy}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setInspecting(g)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0554F4] font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                    >
                      Inspect Manifest &rarr;
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* INSPECT MANIFEST MODAL */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg font-extrabold text-[#041F56] font-mono">{inspecting.grnNumber}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> STOCK CREDITED
                  </span>
                </div>
                <p className="text-xs text-[#176E84] mt-1">
                  PO: <strong className="font-mono text-[#041F56]">{inspecting.poNumber}</strong> | Supplier:{' '}
                  <strong className="text-[#041F56]">{inspecting.supplierName}</strong>
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
                RECEIVED LINE MANIFEST ({inspecting.items.length})
              </p>

              <div className="rounded-2xl border border-slate-200/80 overflow-x-auto">
                <table className="w-full min-w-[520px] divide-y divide-slate-100 text-left text-xs">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">PRODUCT / SKU</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">ACCEPTED QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">REJECTED QTY</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">UNIT PRICE</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">REJECTION REASON</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspecting.items.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#041F56]">{line.productName}</p>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{line.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                          {line.acceptedQty} pcs
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600">
                          {line.rejectedQty} pcs
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          KES {Number(line.unitPrice || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{line.rejectionReason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {inspecting.inspectionNotes && (
              <div className="rounded-xl bg-slate-50 border border-slate-200/70 px-4 py-3 text-xs text-slate-600">
                <strong className="text-slate-700">Dock Inspection Notes:</strong> {inspecting.inspectionNotes}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setInspecting(null)}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 cursor-pointer"
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE GOODS DELIVERY (DOCK VERIFICATION) MODAL */}
      {isReceiveOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-extrabold text-[#041F56]">
                  Receive Goods Delivery (Dock Verification)
                </h2>
                <p className="text-xs text-[#176E84] mt-0.5">
                  {activePo
                    ? `Matching Purchase Order ${activePo.poNumber} (${activePo.supplierName})`
                    : 'Select an open Purchase Order to verify delivery intake'}
                </p>
              </div>
              <button
                onClick={() => setIsReceiveOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#041F56] mb-1.5">
                  Purchase Order to Receive *
                </label>
                <select
                  required
                  value={selectedPoId}
                  onChange={(e) => populateLinesForPo(e.target.value, openPos)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold bg-white outline-none focus:border-[#0554F4]"
                >
                  <option value="">-- Select Open Purchase Order --</option>
                  {openPos.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber} — {po.supplierName} ({po.status.replaceAll('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1.5">
                    Supplier Delivery Note / Invoice Ref #
                  </label>
                  <input
                    type="text"
                    value={deliveryNoteRef}
                    onChange={(e) => setDeliveryNoteRef(e.target.value)}
                    placeholder="e.g. DN-998812 / INV-771"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#041F56] mb-1.5">
                    Dock Inspection Notes
                  </label>
                  <input
                    type="text"
                    value={inspectionNotes}
                    onChange={(e) => setInspectionNotes(e.target.value)}
                    placeholder="e.g. Seals intact, expiry dates verified"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0554F4]"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-[#041F56] mb-2">Line Intake &amp; Rejections</p>
                <div className="rounded-2xl border border-slate-200/80 overflow-x-auto">
                  <table className="w-full min-w-[560px] divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50/70">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">ITEM</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">ORDERED</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">ACCEPTED QTY</th>
                        <th className="px-3 py-3 text-[10px] font-bold text-slate-400 uppercase">REJECTED QTY</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">REJECTION REASON</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {intakeLines.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                            No receivable line items found for this Purchase Order.
                          </td>
                        </tr>
                      ) : (
                        intakeLines.map((line, idx) => (
                          <tr key={line.purchaseOrderItemId}>
                            <td className="px-4 py-3">
                              <p className="font-bold text-[#041F56]">{line.productName}</p>
                              <p className="text-[10px] font-mono text-slate-400">
                                KES {line.unitPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}/pc
                              </p>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-600">
                              {line.orderedQty} pcs
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={line.acceptedQty}
                                onChange={(e) =>
                                  setIntakeLines((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? { ...it, acceptedQty: Math.max(0, Number(e.target.value) || 0) }
                                        : it
                                    )
                                  )
                                }
                                className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-[#041F56]"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={line.rejectedQty}
                                onChange={(e) =>
                                  setIntakeLines((prev) =>
                                    prev.map((it, i) =>
                                      i === idx
                                        ? { ...it, rejectedQty: Math.max(0, Number(e.target.value) || 0) }
                                        : it
                                    )
                                  )
                                }
                                className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-rose-600"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={line.rejectionReason}
                                onChange={(e) =>
                                  setIntakeLines((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, rejectionReason: e.target.value } : it
                                    )
                                  )
                                }
                                placeholder="Reason if rejected..."
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedPoId || intakeLines.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Delivery &amp; Credit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}