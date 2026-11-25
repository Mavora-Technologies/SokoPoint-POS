'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ArrowRight, AlertTriangle, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '../../../../lib/api';

interface ReorderItem {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minThreshold: number;
  suggestedQty: number;
}

export default function ReorderSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<ReorderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const low = list
        .map((p: any) => {
          const stock = Number(p.stock ?? 0);
          const minThreshold = Number(p.reorderLevel ?? p.minimumStock ?? 10);
          return {
            id: p.id,
            name: p.name,
            sku: p.sku || 'N/A',
            stock,
            minThreshold,
            suggestedQty: Math.max(minThreshold * 3 - stock, minThreshold),
          };
        })
        .filter((item: ReorderItem) => item.stock <= item.minThreshold);
      setSuggestions(low);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-blue-600" /> Reorder Suggestions
          </h1>
          <p className="text-sm text-slate-500 mt-1">Live products below minimum stock thresholds in your tenant catalog.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadSuggestions} className="p-2.5 bg-white border border-slate-200 rounded-xl"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <Link href="/dashboard/procurement/requests" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
            Purchase Requests <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[780px] text-left">
          <thead className="bg-slate-50/80">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product &amp; SKU</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Current Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Min Threshold</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Suggested Reorder</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" /></td></tr>
            ) : suggestions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">All products are above reorder thresholds</p>
                </td>
              </tr>
            ) : (
              suggestions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-6 py-4"><p className="font-bold text-slate-900">{s.name}</p><p className="font-mono text-xs text-slate-400">{s.sku}</p></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black bg-red-50 text-red-600 border border-red-200"><AlertTriangle className="h-3 w-3" /> {s.stock} units</span></td>
                  <td className="px-6 py-4 text-slate-600">{s.minThreshold} units</td>
                  <td className="px-6 py-4 text-emerald-600 font-black">{s.suggestedQty} units</td>
                  <td className="px-6 py-4 text-right">
                    <Link href="/dashboard/procurement/requests" className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold">Create Request</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}