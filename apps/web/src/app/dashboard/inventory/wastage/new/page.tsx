'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import api from '../../../../../lib/api';

export default function LogWastagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; stock: number; costPrice?: number; sellingPrice?: number }[]>([]);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    reason: 'DAMAGED',
    remarks: '',
  });

  useEffect(() => {
    api.get('/products').then((res) => {
      setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
    }).catch(() => setProducts([]));
  }, []);

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const unitCost = Number(selectedProduct?.costPrice ?? selectedProduct?.sellingPrice ?? 0);
  const estimatedValue = (parseInt(formData.quantity, 10) || 0) * unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/inventory/wastage', {
        productId: formData.productId,
        quantity: parseInt(formData.quantity, 10),
        reason: formData.reason,
        remarks: formData.remarks.trim(),
      });
      router.push('/dashboard/inventory/wastage');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to log stock wastage.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-red-500">
          <h1 className="text-2xl font-extrabold text-slate-900">Log Stock Wastage</h1>
          <p className="text-sm text-slate-500 mt-1">Record compromised items and automatically deduct them from Inventory Central.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Product *</label>
            <select required value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white">
              <option value="">-- Select Product ({products.length}) --</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'}) - Stock: {Number(p.stock ?? 0)}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Quantity Lost *</label>
              <input required type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Reason *</label>
              <select required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white">
                {['EXPIRED', 'DAMAGED', 'SPILLAGE', 'THEFT', 'OTHER'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-700">Estimated Value Lost:</span>
            <span className="text-xl font-black text-red-600 font-mono">KES {estimatedValue.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Explanation *</label>
            <textarea required rows={3} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/dashboard/inventory/wastage" className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl inline-flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Confirm Write-Off
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}