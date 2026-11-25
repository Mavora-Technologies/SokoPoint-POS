'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRightLeft, ArrowLeft, Loader2, Send } from 'lucide-react';
import api from '../../../../../lib/api';

export default function NewBranchTransferPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; sku?: string; stock: number }[]>([]);

  const [formData, setFormData] = useState({
    sourceBranch: '',
    destinationBranch: '',
    productId: '',
    quantity: '',
    remarks: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/branches').catch(() => ({ data: { data: [] } })),
      api.get('/products').catch(() => ({ data: { data: [] } })),
    ]).then(([bRes, pRes]) => {
      const bList = Array.isArray(bRes.data?.data) ? bRes.data.data : [];
      const pList = Array.isArray(pRes.data?.data) ? pRes.data.data : [];
      setBranches(bList);
      setProducts(pList);
      if (bList[0]) setFormData((prev) => ({ ...prev, sourceBranch: bList[0].name }));
    });
  }, []);

  const selectedProduct = products.find((p) => p.id === formData.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct && parseInt(formData.quantity, 10) > Number(selectedProduct.stock ?? 0)) {
      alert('Transfer quantity exceeds available stock.');
      return;
    }
    try {
      setLoading(true);
      await api.post('/inventory/transfers', {
        ...formData,
        quantity: parseInt(formData.quantity, 10),
      });
      router.push('/dashboard/inventory/transfers');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit transfer request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-3">
            <ArrowRightLeft className="h-6 w-6 text-blue-600" /> Request Branch Transfer
          </h1>
          <p className="text-sm text-slate-500 mt-1">Transfer live inventory between your tenant branches.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Source Branch *</label>
              <select required value={formData.sourceBranch} onChange={(e) => setFormData({ ...formData, sourceBranch: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white">
                <option value="">-- Select Source --</option>
                {branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Destination Branch *</label>
              <select required value={formData.destinationBranch} onChange={(e) => setFormData({ ...formData, destinationBranch: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white">
                <option value="">-- Select Destination --</option>
                {branches.map((b) => <option key={b.id} value={b.name} disabled={b.name === formData.sourceBranch}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Product *</label>
            <select required value={formData.productId} onChange={(e) => setFormData({ ...formData, productId: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white">
              <option value="">-- Select Product ({products.length}) --</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku || 'N/A'}) - Available: {Number(p.stock ?? 0)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Transfer Quantity *</label>
            <input required type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Remarks</label>
            <textarea rows={3} value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full border border-slate-200 rounded-xl p-3 text-sm" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link href="/dashboard/inventory/transfers" className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl inline-flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button type="submit" disabled={loading} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Transfer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}