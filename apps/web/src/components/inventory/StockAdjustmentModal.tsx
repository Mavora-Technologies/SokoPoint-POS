'use client';

import { useState } from 'react';
// FIX: Swapped to the correct global API client
import api from '@/lib/api'; 
import { Button } from '@/components/ui/button';

interface StockAdjustmentModalProps {
  productId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StockAdjustmentModal({
  productId,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [form, setForm] = useState({
    productId: productId || '',
    branchId: '',
    quantityChange: 0,
    movementType: 'ADJUSTMENT',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/inventory/adjust', form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-slate-900">Adjust Stock Level</h2>

        {error && (
          <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!productId && (
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700">Product ID</label>
              <input
                type="text"
                required
                className="w-full border rounded px-3 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Branch ID</label>
            <input
              type="text"
              required
              className="w-full border rounded px-3 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              Quantity Change (+/-)
            </label>
            <input
              type="number"
              required
              className="w-full border rounded px-3 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={form.quantityChange}
              onChange={(e) =>
                setForm({ ...form, quantityChange: parseInt(e.target.value, 10) || 0 })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">Movement Type</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm bg-white border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={form.movementType}
              onChange={(e) => setForm({ ...form, movementType: e.target.value })}
            >
              <option value="ADJUSTMENT">ADJUSTMENT</option>
              <option value="WASTAGE">WASTAGE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="SALE_CORRECTION">SALE_CORRECTION</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700">
              Reason / Notes
            </label>
            <textarea
              required
              rows={3}
              className="w-full border rounded px-3 py-2 text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Confirm Adjustment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}