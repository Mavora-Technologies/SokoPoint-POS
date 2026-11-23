'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Plus, Loader2, X, Clock } from 'lucide-react';
import api from '../../../../lib/api';

interface Shift {
  id: string;
  userId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

export default function PlannerPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    userId: '',
    title: 'Morning Till Shift',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '17:00',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [shiftsRes, empRes] = await Promise.all([
        api.get('/shifts/planner'),
        api.get('/shifts/employees'),
      ]);
      setShifts(Array.isArray(shiftsRes.data?.data) ? shiftsRes.data.data : []);
      setEmployees(Array.isArray(empRes.data?.data) ? empRes.data.data : []);
    } catch (err) {
      console.error('Failed to load planner:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEmployeeName = (userId: string) => {
    const emp = employees.find((e) => e.id === userId);
    return emp ? `${emp.firstName} ${emp.lastName}` : userId.slice(0, 8);
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/shifts/planner', form);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to schedule shift.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <CalendarDays className="h-6 w-6 text-[#0554F4]" />
            Weekly Shift Schedule
          </h1>
          <p className="text-sm text-slate-500 mt-1">Assign cashiers and floor staff to retail or wholesale shifts.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#041F56] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Schedule Shift
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4]" /></div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CalendarDays className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold">No shifts scheduled</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Shift Title</th>
                  <th className="py-3.5 px-4">Assigned Staff</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Hours</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{shift.title}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{getEmployeeName(shift.userId)}</td>
                    <td className="py-3.5 px-4 text-slate-600">{shift.date}</td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {shift.startTime} - {shift.endTime}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#0554F4]">
                        {shift.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-900">Schedule New Shift</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSchedule} className="space-y-4">
              <select
                required
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[#0554F4]"
              >
                <option value="">Select Staff Member...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
              <input
                required
                placeholder="Shift Title (e.g., Morning Till Shift)"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
                <input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0554F4]"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#62C02A] hover:bg-[#57ad25] text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Shift
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}