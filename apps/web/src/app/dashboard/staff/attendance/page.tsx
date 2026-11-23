'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, LogIn, LogOut, Loader2 } from 'lucide-react';
import api from '../../../../lib/api';

interface AttendanceRecord {
  id: string;
  userId: string;
  clockInTime: string;
  clockOutTime?: string | null;
  status: string;
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/shifts/attendance');
      setRecords(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      await api.post('/shifts/attendance/clock-in', { method: 'TERMINAL' });
      await loadAttendance();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Clock-in failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      await api.post('/shifts/attendance/clock-out');
      await loadAttendance();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Clock-out failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
            <Fingerprint className="h-6 w-6 text-[#0554F4]" />
            Staff Attendance & Clock-In
          </h1>
          <p className="text-sm text-slate-500 mt-1">Real-time shift clock-in and clock-out logs.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleClockIn}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-[#62C02A] hover:bg-[#57ad25] text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> Clock In
          </button>
          <button
            onClick={handleClockOut}
            disabled={actionLoading}
            className="px-4 py-2.5 bg-[#041F56] hover:bg-slate-800 text-white text-sm font-bold rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" /> Clock Out
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4]" /></div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Fingerprint className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-bold">No attendance logs recorded yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Clock In</th>
                  <th className="py-3.5 px-4">Clock Out</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {new Date(rec.clockInTime).toLocaleString('en-GB')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {rec.clockOutTime ? new Date(rec.clockOutTime).toLocaleString('en-GB') : 'Active Shift'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          rec.status === 'CLOCKED_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}