'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X, ShieldAlert } from 'lucide-react';
import api from '../lib/api'; // Or '../../../lib/api' depending on your exact folder structure

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: { id: string; orderNum: string; total: number } | null;
  onSuccess: () => void;
  currentUserId: string; 
}

export default function RefundOrderModal({ isOpen, onClose, order, onSuccess, currentUserId }: RefundModalProps) {
  const [reason, setReason] = useState('');
  const [approverId, setApproverId] = useState('');
  const [managers, setManagers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Try to fetch managers, but handle failures gracefully
      api.get('/users?role=ADMIN')
        .then((res) => {
          const fetchedData = res.data?.data || res.data || [];
          setManagers(Array.isArray(fetchedData) ? fetchedData : []);
        })
        .catch((err) => {
          console.warn('Could not fetch managers, using fallback', err);
          setManagers([]); // Fallback to empty to trigger the dummy option
        });
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/refunds', {
        orderId: order.id,
        initiatorId: currentUserId,
        approverId,
        amount: order.total,
        reason,
      });
      
      onSuccess();
      onClose();
      setReason('');
      setApproverId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process refund');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-red-50/50">
          <h3 className="text-xl font-extrabold text-red-700 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" /> Process Refund
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:bg-slate-200 p-2 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" /> <span className="break-words">{error}</span>
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
            <span className="text-slate-500 font-bold">Order {order.orderNum}</span>
            <span className="text-slate-900 font-black text-lg">Ksh {order.total.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Approving Manager</label>
            <select
              required
              value={approverId}
              onChange={(e) => setApproverId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-red-600 outline-none"
            >
              <option value="">Select Manager...</option>
              {managers.length > 0 ? (
                managers.map(m => (
                  <option key={m.id} value={m.id}>{m.firstName || 'Manager'} {m.lastName || ''}</option>
                ))
              ) : (
                // Fallback option so you can test right now
                <option value="demo-manager-id">System Administrator (Demo)</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Refund</label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer returned damaged item..."
              className="w-full rounded-xl border border-slate-200 py-3 px-4 text-slate-900 focus:ring-2 focus:ring-red-600 outline-none resize-none"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-slate-700 font-bold hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              Confirm Refund
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}