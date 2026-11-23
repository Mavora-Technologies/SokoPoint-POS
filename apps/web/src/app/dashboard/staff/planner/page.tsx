'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import api from '../../../../lib/api';
import { Calendar, Plus, RefreshCw, ChevronLeft, ChevronRight, X, AlertCircle } from 'lucide-react';

function getMondayOfWeek(baseDate: Date): Date {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function ShiftPlannerGridPage(): JSX.Element {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [staff, setStaff] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    userId: '',
    title: 'Morning Checkout Shift',
    date: toIsoDate(new Date()),
    startTime: '08:00',
    endTime: '17:00',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [shiftsRes, staffRes] = await Promise.all([
        api.get('/shifts/planner'),
        api.get('/shifts/employees'),
      ]);
      const sList = Array.isArray(staffRes.data?.data) ? staffRes.data.data : [];
      setStaff(sList);
      setShifts(Array.isArray(shiftsRes.data?.data) ? shiftsRes.data.data : []);
      setForm((prev) => ({ ...prev, userId: prev.userId || sList[0]?.id || '' }));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load shift schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + i);
    return {
      iso: toIsoDate(dt),
      dayLabel: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      dateLabel: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  const weekStartIso = weekDays[0].iso;
  const weekEndIso = weekDays[6].iso;
  const visibleShifts = shifts.filter((s) => s.date >= weekStartIso && s.date <= weekEndIso);

  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/shifts/planner', form);
      setIsAddOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add shift.');
    } finally {
      setSaving(false);
    }
  };

  const shiftWeek = (deltaWeeks: number) => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + deltaWeeks * 7);
    setWeekStart(next);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-1">
            Staff Directory &rsaquo; <span className="text-[#041F56]">Weekly Rota &amp; Scheduling</span>
          </p>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Workforce Shift Schedule &amp; Rota Planner
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Plan checkout lane, retail floor, and wholesale dispatch coverage across your store branches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Add Shift
          </button>
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl"
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

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftWeek(-1)} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(getMondayOfWeek(new Date()))}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50"
          >
            Today
          </button>
          <button type="button" onClick={() => shiftWeek(1)} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-black text-[#041F56] ml-2">
            Week of {weekDays[0].dateLabel} – {weekDays[6].dateLabel}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-[#0554F4]">{visibleShifts.length} Shifts This Week</span>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[960px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase w-56">STAFF MEMBER</th>
              {weekDays.map((wd) => (
                <th key={wd.iso} className="px-3 py-3.5 text-[10px] font-black text-gray-500 uppercase text-center">
                  <div>{wd.dayLabel}</div>
                  <div className="text-gray-400 font-mono">{wd.dateLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {staff.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                  No active staff members found in tenant directory.
                </td>
              </tr>
            ) : (
              staff.map((member) => {
                const fullName = `${member.firstName} ${member.lastName}`;
                const initials = `${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`.toUpperCase();
                const memberShifts = visibleShifts.filter((s) => s.userId === member.id);

                return (
                  <tr key={member.id} className="hover:bg-gray-50/40">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-50 text-[#0554F4] font-black text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </span>
                        <div>
                          <p className="font-bold text-[#041F56]">{fullName}</p>
                          <p className="text-[10px] text-gray-400">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((wd) => {
                      const dayHits = memberShifts.filter((s) => s.date === wd.iso);
                      return (
                        <td
                          key={wd.iso}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, userId: member.id, date: wd.iso }));
                            setIsAddOpen(true);
                          }}
                          className="px-2 py-3 text-center cursor-pointer hover:bg-blue-50/40 align-top"
                        >
                          {dayHits.map((sh) => (
                            <div
                              key={sh.id}
                              className="p-1.5 rounded-lg bg-[#F5F8FE] border border-blue-200 text-[10px] font-mono font-bold text-[#041F56] mb-1"
                            >
                              {sh.startTime}–{sh.endTime}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#041F56]">Add Shift Allocation</h2>
              <button type="button" onClick={() => setIsAddOpen(false)} className="text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddShift} className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Staff Member *</label>
                <select
                  required
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                >
                  {staff.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Shift Title *</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Date *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Start</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">End</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#0554F4] text-white rounded-xl text-xs font-bold">
                  {saving ? 'Saving...' : 'Save Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}