'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface Supplier {
  id: string;
  companyName: string;
}

interface ItemRow {
  productId: string;
  quantity: number;
  unitCost: number;
}

interface CreatePOModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreatePOModal({ onClose, onSuccess }: CreatePOModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', quantity: 1, unitCost: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/purchasing/suppliers');
      setSuppliers(res.data.data || []);
    } catch (err: any) {
      console.error('Failed to load suppliers:', err);
    }
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/purchasing/orders', {
        branchId,
        supplierId,
        items,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-900">Create Purchase Order</h2>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Branch ID</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Supplier</label>
              <select
                required
                className="w-full border rounded px-3 py-2 text-sm bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-slate-800">Order Items</label>
              <Button type="button" variant="outline" size="sm" onClick={addItemRow}>
                + Add Item
              </Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Product ID"
                  required
                  className="flex-1 border rounded px-3 py-2 text-sm border-slate-300"
                  value={item.productId}
                  onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  required
                  className="w-24 border rounded px-3 py-2 text-sm border-slate-300"
                  value={item.quantity}
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                />
                <input
                  type="number"
                  placeholder="Unit Cost"
                  step="0.01"
                  min="0"
                  required
                  className="w-32 border rounded px-3 py-2 text-sm border-slate-300"
                  value={item.unitCost}
                  onChange={(e) => updateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                />
                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeItemRow(idx)}
                  >
                    X
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}