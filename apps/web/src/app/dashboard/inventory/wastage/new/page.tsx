'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import api from '../../../../../lib/api';

interface ProductStock {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  stock?: number;
  reorderLevel?: number;
  costPrice?: number;
  sellingPrice?: number;
}

export default function LogWastagePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    reason: 'DAMAGED',
    costCenter: 'Retail Floor',
    storageLocation: 'Main Store',
    disposalMethod: 'DISPOSED',
    remarks: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/products').catch(() => ({ data: { data: [] } })),
      api.get('/branches').catch(() => ({ data: { data: [] } })),
    ]).then(([pRes, bRes]) => {
      setProducts(Array.isArray(pRes.data?.data) ? pRes.data.data : []);
      const bList = Array.isArray(bRes.data?.data) ? bRes.data.data : [];
      setBranches(bList);
      if (bList[0]?.name) {
        setFormData((prev) => ({ ...prev, storageLocation: bList[0].name }));
      }
    });
  }, []);

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const availableStock = Number(selectedProduct?.stock ?? selectedProduct?.reorderLevel ?? 0);
  const unitCost = Number(selectedProduct?.costPrice ?? selectedProduct?.sellingPrice ?? 0);
  const qtyNum = parseInt(formData.quantity, 10) || 0;
  const estimatedLoss = qtyNum * unitCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || qtyNum <= 0) return;

    try {
      setLoading(true);
      await api.post('/inventory/wastage', {
        productId: formData.productId,
        quantity: qtyNum,
        reason: formData.reason,
        costCenter: formData.costCenter,
        storageLocation: formData.storageLocation,
        disposalMethod: formData.disposalMethod,
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
    <div className="w-full min-h-[100dvh] bg-[#f8fafc] px-4 sm:px-6 lg:px-8 py-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 border-l-4 border-l-rose-600">
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56]">Log Stock Wastage</h1>
          <p className="text-sm text-slate-500 mt-1">
            Record damaged, expired, or lost items to safely deduct them from active inventory ledger balances.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-5">
          {/* Product & Stock Dropdown */}
          <div>
            <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">
              Product &amp; Active Stock *
            </label>
            <select
              required
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-900 bg-white outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Select Compromised Product ({products.length} in catalog) --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku || 'NO-SKU'}) — Stock: {Number(p.stock ?? p.reorderLevel ?? 0)} pcs • Cost: KES{' '}
                  {Number(p.costPrice ?? p.sellingPrice ?? 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">Quantity Lost *</label>
              <input
                required
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="e.g. 5"
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">Loss Classification *</label>
              <select
                required
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm font-bold bg-white outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="DAMAGED">Damaged / Broken</option>
                <option value="SHELF_EXPIRED">Shelf Expired</option>
                <option value="COLD_CHAIN_SPOILAGE">Chiller / Cold-Chain Spoilage</option>
                <option value="SPILLAGE">Spillage / Leak</option>
                <option value="THEFT_SHRINKAGE">Theft / Shrinkage</option>
                <option value="SUPPLIER_RECALL">Supplier Recall</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">Cost Center</label>
              <select
                value={formData.costCenter}
                onChange={(e) => setFormData({ ...formData, costCenter: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-white"
              >
                <option value="Retail Floor">Retail Floor</option>
                <option value="Main Warehouse">Main Warehouse</option>
                <option value="Cold Chain / Chiller">Cold Chain / Chiller</option>
                <option value="Receiving Bay">Receiving Bay</option>
                <option value="Wholesale Dispatch">Wholesale Dispatch</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">Branch / Location</label>
              <select
                value={formData.storageLocation}
                onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-white"
              >
                {branches.length > 0 ? (
                  branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)
                ) : (
                  <option value="Main Store">Main Store</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">Disposal Action</label>
              <select
                value={formData.disposalMethod}
                onChange={(e) => setFormData({ ...formData, disposalMethod: e.target.value })}
                className="w-full border border-slate-200 rounded-xl p-3 text-xs font-bold bg-white"
              >
                <option value="DISPOSED">Trash / Landfill</option>
                <option value="SUPPLIER_RETURN">Return to Supplier</option>
                <option value="QUARANTINED">Isolated in Quarantine</option>
                <option value="DESTROYED">Destroyed / Scrapped</option>
              </select>
            </div>
          </div>

          {/* Live Stock & Valuation Strip */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-xs font-bold text-slate-600">Selected Product Availability: </span>
              <span className="text-xs font-mono font-black text-[#041F56]">
                {selectedProduct ? `${availableStock} pcs` : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-600">Estimated Loss: </span>
              <span className="text-base font-mono font-black text-rose-600">
                KES {estimatedLoss.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-[#041F56] uppercase mb-1.5">
              Detailed Remarks / Auditor Notes *
            </label>
            <textarea
              required
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Explain how the damage, expiry, or spoilage occurred..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/dashboard/inventory/wastage"
              className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Submit Write-Off Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}