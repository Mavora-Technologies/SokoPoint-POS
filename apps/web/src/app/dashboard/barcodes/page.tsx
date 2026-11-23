'use client';

import { useState, useEffect, useCallback, useMemo, JSX } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import {
  Barcode,
  RefreshCw,
  Search,
  Printer,
  Wand2,
  Pencil,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react';

interface ProductBarcodeRow {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  sellingPrice: number;
  updatedAt?: string;
}

interface PrintQueueItem {
  product: ProductBarcodeRow;
  copies: number;
}

// --- SCANNABLE SVG BARCODE RENDERER (EAN-13 + CODE 39 FALLBACK) ---
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

const CODE39_MAP: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
};

function encodeBarcodeBits(raw: string): string {
  const clean = raw.trim().toUpperCase();
  if (/^\d{13}$/.test(clean)) {
    const first = Number(clean[0]);
    const parity = EAN_PARITY[first];
    let bits = '101';
    for (let i = 1; i <= 6; i++) {
      const d = Number(clean[i]);
      bits += parity[i - 1] === 'L' ? EAN_L[d] : EAN_G[d];
    }
    bits += '01010';
    for (let i = 7; i <= 12; i++) {
      bits += EAN_R[Number(clean[i])];
    }
    bits += '101';
    return bits;
  }

  // Code 39 fallback for alphanumeric SKUs/barcodes
  const wrapped = `*${clean.replace(/[^0-9A-Z\-. ]/g, '')}*`;
  let bits = '';
  for (let i = 0; i < wrapped.length; i++) {
    const pattern = CODE39_MAP[wrapped[i]] || CODE39_MAP['-'];
    for (let j = 0; j < pattern.length; j++) {
      const isBar = j % 2 === 0;
      const width = pattern[j] === 'w' ? 3 : 1;
      bits += (isBar ? '1' : '0').repeat(width);
    }
    bits += '0';
  }
  return bits;
}

function SvgBarcode({ value, height = 38 }: { value: string; height?: number }) {
  const bits = useMemo(() => encodeBarcodeBits(value), [value]);
  const quiet = 6;
  const totalWidth = bits.length + quiet * 2;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${height}`}
      className="w-full max-w-[190px] h-auto mx-auto"
      preserveAspectRatio="none"
      aria-label={`Barcode ${value}`}
    >
      <rect x="0" y="0" width={totalWidth} height={height} fill="#ffffff" />
      {bits.split('').map((bit, idx) =>
        bit === '1' ? (
          <rect key={idx} x={quiet + idx} y="0" width="1" height={height} fill="#000000" />
        ) : null
      )}
    </svg>
  );
}

export default function BarcodesLabelsPage(): JSX.Element {
  const [kpis, setKpis] = useState({ totalProducts: 0, withBarcode: 0, missingBarcode: 0 });
  const [products, setProducts] = useState<ProductBarcodeRow[]>([]);
  const [businessName, setBusinessName] = useState('SokoPoint Retail');
  const [currency, setCurrency] = useState('KES');

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<'ALL' | 'ASSIGNED' | 'MISSING'>('ALL');
  const [search, setSearch] = useState('');

  // Print Queue & Label Options
  const [printQueue, setPrintQueue] = useState<PrintQueueItem[]>([]);
  const [labelFormat, setLabelFormat] = useState<'THERMAL' | 'A4'>('THERMAL');
  const [showPriceOnLabel, setShowPriceOnLabel] = useState(true);
  const [showBusinessOnLabel, setShowBusinessOnLabel] = useState(true);

  // Edit Barcode Modal
  const [editingProduct, setEditingProduct] = useState<ProductBarcodeRow | null>(null);
  const [editBarcode, setEditBarcode] = useState('');
  const [editSku, setEditSku] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadBarcodes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      const [meRes, barcodesRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/barcodes'),
      ]);

      const profile = meRes?.data?.data;
      if (profile?.businessName) setBusinessName(profile.businessName);
      if (profile?.currency) setCurrency(profile.currency);

      const payload = barcodesRes.data?.data;
      if (payload) {
        if (payload.kpis) setKpis(payload.kpis);
        setProducts(Array.isArray(payload.products) ? payload.products : []);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setIsUnauthorized(true);
        setError('Invalid or expired authentication token. Please sign in again.');
      } else {
        setError(err?.response?.data?.message || 'Failed to load product barcodes.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBarcodes();
  }, [loadBarcodes]);

  const handleBulkGenerateMissing = async () => {
    if (kpis.missingBarcode === 0) return;
    if (!window.confirm(`Generate unique EAN-13 barcodes for all ${kpis.missingBarcode} product(s) missing barcodes?`)) {
      return;
    }
    try {
      setGenerating(true);
      const res = await api.post('/barcodes/generate', { allMissing: true });
      setFeedback(res.data?.message || 'Barcodes generated successfully.');
      await loadBarcodes();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate barcodes.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSingle = async (product: ProductBarcodeRow) => {
    try {
      setGenerating(true);
      const res = await api.post('/barcodes/generate', { productId: product.id });
      setFeedback(res.data?.message || `Barcode generated for ${product.name}.`);
      await loadBarcodes();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to generate barcode.');
    } finally {
      setGenerating(false);
    }
  };

  const openEditModal = (product: ProductBarcodeRow) => {
    setEditingProduct(product);
    setEditBarcode(product.barcode || '');
    setEditSku(product.sku || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      setSavingEdit(true);
      await api.patch(`/barcodes/${editingProduct.id}`, {
        barcode: editBarcode.trim() || null,
        sku: editSku.trim() || null,
      });
      setFeedback(`Updated barcode/SKU for "${editingProduct.name}".`);
      setEditingProduct(null);
      await loadBarcodes();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update barcode.');
    } finally {
      setSavingEdit(false);
    }
  };

  const addToPrintQueue = (product: ProductBarcodeRow) => {
    if (!product.barcode && !product.sku) {
      alert('Assign or auto-generate a barcode first before queuing labels.');
      return;
    }
    setPrintQueue((prev) => {
      const existing = prev.find((q) => q.product.id === product.id);
      if (existing) {
        return prev.map((q) => (q.product.id === product.id ? { ...q, copies: q.copies + 1 } : q));
      }
      return [...prev, { product, copies: 1 }];
    });
  };

  const updateCopies = (productId: string, delta: number) => {
    setPrintQueue((prev) =>
      prev
        .map((q) => (q.product.id === productId ? { ...q, copies: q.copies + delta } : q))
        .filter((q) => q.copies > 0)
    );
  };

  const totalLabelsQueued = printQueue.reduce((sum, item) => sum + item.copies, 0);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const hasCode = Boolean(p.barcode && p.barcode.trim());
      if (filterMode === 'ASSIGNED' && !hasCode) return false;
      if (filterMode === 'MISSING' && hasCode) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
      );
    });
  }, [products, filterMode, search]);

  const flatPrintableLabels = useMemo(() => {
    const out: ProductBarcodeRow[] = [];
    printQueue.forEach((item) => {
      for (let i = 0; i < item.copies; i++) {
        out.push(item.product);
      }
    });
    return out;
  }, [printQueue]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: ${labelFormat === 'THERMAL' ? '2mm' : '8mm'}; }
              html, body { background: white !important; }
              header, aside, #barcodes-workspace { display: none !important; }
              #barcode-print-sheet { display: grid !important; }
            }
          `,
        }}
      />

      {/* PRINT-ONLY LABEL SHEET */}
      <div
        id="barcode-print-sheet"
        className={`hidden ${
          labelFormat === 'THERMAL' ? 'grid-cols-1 gap-2' : 'grid-cols-3 gap-3'
        } bg-white text-black`}
      >
        {flatPrintableLabels.map((item, idx) => {
          const codeValue = (item.barcode || item.sku || '').trim();
          return (
            <div
              key={`${item.id}-${idx}`}
              className="border border-dashed border-gray-400 p-2 text-center break-inside-avoid"
              style={labelFormat === 'THERMAL' ? { width: '50mm', minHeight: '30mm' } : undefined}
            >
              {showBusinessOnLabel && (
                <p className="text-[9px] font-bold uppercase tracking-wider truncate">{businessName}</p>
              )}
              <p className="text-[10px] font-extrabold truncate mb-1">{item.name}</p>
              <SvgBarcode value={codeValue} height={32} />
              <p className="text-[9px] font-mono font-bold tracking-widest mt-0.5">{codeValue}</p>
              {showPriceOnLabel && (
                <p className="text-[11px] font-black mt-0.5">
                  {currency} {item.sellingPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* MAIN INTERACTIVE WORKSPACE */}
      <div id="barcodes-workspace" className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
              PRODUCT CATALOGUE &rsaquo; BARCODE MANAGEMENT &amp; SHELF LABELS
            </p>
            <div className="flex items-center gap-2.5">
              <Barcode className="w-6 h-6 text-[#0554F4]" />
              <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
                Barcodes &amp; Shelf Labels
              </h1>
            </div>
            <p className="text-[#176E84] text-xs sm:text-sm mt-1">
              Assign or auto-generate scannable EAN-13 barcodes synced to PostgreSQL and print thermal or A4 price tags.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={generating || kpis.missingBarcode === 0}
              onClick={handleBulkGenerateMissing}
              className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              Auto-Generate Missing ({kpis.missingBarcode})
            </button>
            <button
              type="button"
              disabled={totalLabelsQueued === 0}
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-[#041F56] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
            >
              <Printer className="w-4 h-4" /> Print Queue ({totalLabelsQueued})
            </button>
            <button
              type="button"
              onClick={loadBarcodes}
              className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl"
              title="Refresh from database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Auth / Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </span>
            {isUnauthorized && (
              <Link href="/login" className="px-3.5 py-1.5 bg-[#0554F4] text-white rounded-lg inline-flex items-center gap-1.5">
                <LogIn className="w-3.5 h-3.5" /> Sign In Again
              </Link>
            )}
          </div>
        )}

        {feedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {feedback}
            </span>
            <button type="button" onClick={() => setFeedback(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-black text-gray-400 uppercase">ACTIVE PRODUCTS</span>
            <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">{kpis.totalProducts}</h2>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-black text-emerald-600 uppercase">BARCODES ASSIGNED</span>
            <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{kpis.withBarcode}</h2>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-black text-amber-600 uppercase">MISSING BARCODES</span>
            <h2 className="text-2xl font-black text-amber-600 font-mono mt-1.5">{kpis.missingBarcode}</h2>
          </div>
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <span className="text-[10px] font-black text-[#0554F4] uppercase">LABELS QUEUED</span>
            <h2 className="text-2xl font-black text-[#0554F4] font-mono mt-1.5">{totalLabelsQueued}</h2>
          </div>
        </div>

        {/* Main Split: Catalog Table (Left) + Print Queue Preview (Right) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left: Product Barcodes Ledger */}
          <div className="xl:col-span-8 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'ASSIGNED', 'MISSING'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFilterMode(m)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
                      filterMode === m ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {m === 'ALL' ? `All (${products.length})` : m === 'ASSIGNED' ? 'Assigned' : `Missing (${kpis.missingBarcode})`}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product, SKU, barcode..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px] divide-y divide-gray-100 text-left">
                <thead className="bg-gray-50/70">
                  <tr>
                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase">PRODUCT &amp; SKU</th>
                    <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase">BARCODE</th>
                    <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase">PRICE</th>
                    <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                        Loading tenant product barcodes...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center text-gray-400">
                        No products match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const hasCode = Boolean(p.barcode && p.barcode.trim());
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/60">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-[#041F56]">{p.name}</p>
                            <p className="text-[10px] font-mono text-gray-400">SKU: {p.sku || '—'}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            {hasCode ? (
                              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#0554F4] font-mono font-bold text-[11px]">
                                {p.barcode}
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold text-[10px]">
                                Missing Barcode
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {currency} {p.sellingPrice.toLocaleString('en-KE')}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                            {!hasCode && (
                              <button
                                type="button"
                                disabled={generating}
                                onClick={() => handleGenerateSingle(p)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                                title="Auto-generate EAN-13 barcode"
                              >
                                <Wand2 className="w-3 h-3" /> Generate
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-[#0554F4] hover:bg-blue-50 rounded-lg inline-flex items-center"
                              title="Edit barcode or SKU"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => addToPrintQueue(p)}
                              disabled={!hasCode && !p.sku}
                              className="px-2.5 py-1.5 bg-[#041F56] hover:bg-[#0554F4] text-white rounded-lg text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-40"
                            >
                              <Plus className="w-3 h-3" /> Queue
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Label Print Queue & Live Preview */}
          <div className="xl:col-span-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-black text-[#041F56]">Label Print Queue</h2>
                <p className="text-[11px] text-gray-500">{totalLabelsQueued} sticker(s) ready to print</p>
              </div>
              {printQueue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPrintQueue([])}
                  className="text-[11px] font-bold text-rose-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Print Settings */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLabelFormat('THERMAL')}
                  className={`py-2 rounded-xl font-bold border ${
                    labelFormat === 'THERMAL'
                      ? 'bg-[#041F56] text-white border-[#041F56]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  Thermal (50&times;30mm)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelFormat('A4')}
                  className={`py-2 rounded-xl font-bold border ${
                    labelFormat === 'A4'
                      ? 'bg-[#041F56] text-white border-[#041F56]'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  A4 Sheet (3-Col)
                </button>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPriceOnLabel}
                    onChange={(e) => setShowPriceOnLabel(e.target.checked)}
                  />
                  <span>Show Price</span>
                </label>
                <label className="inline-flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBusinessOnLabel}
                    onChange={(e) => setShowBusinessOnLabel(e.target.checked)}
                  />
                  <span>Show Store Name</span>
                </label>
              </div>
            </div>

            {/* Queued Items */}
            {printQueue.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-2xl">
                Click <strong>+ Queue</strong> on any product to preview and print scannable labels.
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {printQueue.map(({ product, copies }) => {
                  const codeVal = (product.barcode || product.sku || '').trim();
                  return (
                    <div key={product.id} className="p-3 rounded-2xl border border-gray-200 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#041F56] truncate">{product.name}</p>
                          <p className="text-[10px] font-mono text-gray-500">{codeVal}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPrintQueue((prev) => prev.filter((q) => q.product.id !== product.id))}
                          className="text-gray-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Live Label Preview */}
                      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-2 text-center">
                        {showBusinessOnLabel && (
                          <p className="text-[9px] font-bold uppercase text-gray-500 truncate">{businessName}</p>
                        )}
                        <SvgBarcode value={codeVal} height={30} />
                        <p className="text-[9px] font-mono font-bold tracking-widest mt-0.5 text-black">{codeVal}</p>
                        {showPriceOnLabel && (
                          <p className="text-[11px] font-black text-black">
                            {currency} {product.sellingPrice.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-500 font-semibold">Copies:</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateCopies(product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-black w-6 text-center">{copies}</span>
                          <button
                            type="button"
                            onClick={() => updateCopies(product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              disabled={totalLabelsQueued === 0}
              onClick={() => window.print()}
              className="w-full py-3 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print {totalLabelsQueued} Label(s)
            </button>
          </div>
        </div>

        {/* EDIT BARCODE / SKU MODAL */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
              <div className="flex justify-between items-start pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-black text-[#041F56]">Assign Barcode &amp; SKU</h2>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{editingProduct.name}</p>
                </div>
                <button type="button" onClick={() => setEditingProduct(null)} className="text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Barcode (EAN-13 / UPC / Custom)</label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    placeholder="Scan with USB scanner or enter code"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#0554F4]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">SKU (Optional)</label>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    placeholder="e.g. JOGOO-2KG"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-[#0554F4]"
                  />
                </div>

                {editBarcode.trim() && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <SvgBarcode value={editBarcode.trim()} height={34} />
                    <p className="text-[10px] font-mono font-bold mt-1">{editBarcode.trim()}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save to Database
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}