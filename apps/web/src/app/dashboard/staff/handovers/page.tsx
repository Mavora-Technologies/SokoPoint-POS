'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Send, Loader2 } from 'lucide-react';
import api from '../../../../lib/api';

interface HandoverNote {
  id: string;
  notes: string;
  createdAt: string;
}

export default function HandoversPage() {
  const [notesList, setNotesList] = useState<HandoverNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesInput, setNotesInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadHandovers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/handovers');
      setNotesList(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load handovers:', err);
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
      setSubmitting(true);
      await api.post('/shifts/handovers', { notes: notesInput.trim() });
      setNotesInput('');
      await loadHandovers();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save handover note.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <ClipboardList className="h-6 w-6 text-[#0554F4]" />
          Shift Handover Notes
        </h1>
        <p className="text-sm text-slate-500 mt-1">Log till observations, stock shortages, or customer follow-ups for the incoming shift.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <textarea
          rows={3}
          required
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Write shift handover summary (e.g., M-Pesa float balanced, Jogoo 2kg restock needed)..."
          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Handover Note
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4]" /></div>
        ) : notesList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
            <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold">No handover notes logged yet</p>
          </div>
        ) : (
          notesList.map((note) => (
            <div key={note.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.notes}</p>
              <p className="text-[11px] text-slate-400 mt-2.5">
                Logged: {new Date(note.createdAt).toLocaleString('en-GB')}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}