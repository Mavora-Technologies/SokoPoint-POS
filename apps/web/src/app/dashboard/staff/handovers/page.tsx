'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import api from '../../../../lib/api';
import { ClipboardList, Plus, RefreshCw, X, AlertCircle } from 'lucide-react';

interface HandoverRow {
  id: string;
  notes: string;
  createdAt: string;
}

export default function ManagerHandoverConsolePage(): JSX.Element {
  const [handovers, setHandovers] = useState<HandoverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  const loadHandovers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/handovers');
      setHandovers(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load shift handovers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHandovers();
  }, [loadHandovers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notesInput.trim()) return;
    try {
      setSaving(true);
      await api.post('/shifts/handovers', { notes: notesInput.trim() });
      setNotesInput('');
      setIsOpen(false);
      await loadHandovers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit handover.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-1">
            Staff Directory &rsaquo; <span className="text-[#041F56]">Shift Handover &amp; Operations Logbook</span>
          </p>
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Manager Shift Handover Console
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Log retail shift changeovers, till float reconciliations, low-stock shelf alerts, and wholesale dispatch notes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="px-5 py-3 bg-[#0554F4] hover:bg-blue-700 text-white rounded-2xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Submit Handover
          </button>
          <button
            type="button"
            onClick={loadHandovers}
            className="p-3 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-2xl"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">TIMESTAMP</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">HANDOVER NOTES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {handovers.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-14 text-center text-gray-400">
                  No shift handover logs recorded yet.
                </td>
              </tr>
            ) : (
              handovers.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50/60">
                  <td className="px-6 py-4 font-mono font-bold text-[#041F56] whitespace-nowrap">
                    {new Date(h.createdAt).toLocaleString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-gray-700 whitespace-pre-wrap">{h.notes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Submit Shift Handover</h2>
                <p className="text-xs text-gray-500">Document till float, stock alerts, and pending wholesale pickups</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                required
                rows={4}
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                placeholder="e.g., Till 1 balanced, M-Pesa float reconciled, Jogoo 2kg & Kabras Sugar need restocking..."
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0554F4] text-white rounded-xl text-xs font-bold">
                  {saving ? 'Submitting...' : 'Sign & Submit Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}