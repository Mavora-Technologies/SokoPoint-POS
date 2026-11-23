'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import api from '../../../../lib/api';
import { Fingerprint, LogIn, LogOut, RefreshCw, AlertCircle } from 'lucide-react';

interface AttendanceRow {
  id: string;
  userId: string;
  clockInTime: string;
  clockOutTime?: string | null;
  status: string;
}

export default function WorkforceAttendanceLedgerPage(): JSX.Element {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [tab, setTab] = useState<'ALL' | 'ON_DUTY'>('ALL');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/attendance');
      setRecords(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load attendance ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const handleClockIn = async () => {
    try {
      setActing(true);
      await api.post('/shifts/attendance/clock-in', { method: 'TERMINAL' });
      await loadAttendance();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Clock-in failed.');
    } finally {
      setActing(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActing(true);
      await api.post('/shifts/attendance/clock-out');
      await loadAttendance();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Clock-out failed.');
    } finally {
      setActing(false);
    }
  };

  const onDutyRows = records.filter((r) => !r.clockOutTime);
  const completedRows = records.filter((r) => Boolean(r.clockOutTime));
  const rowsToShow = tab === 'ON_DUTY' ? onDutyRows : records;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-1">
            Workforce Directory &rsaquo; <span className="text-[#041F56]">Time &amp; Attendance</span>
          </p>
          <div className="flex items-center gap-2.5">
            <Fingerprint className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Workforce Attendance &amp; Time Card Ledger
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Audit live on-duty retail &amp; wholesale staff, verify shift punctuality, and record clock-in/out actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={acting}
            onClick={handleClockIn}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
          >
            <LogIn className="w-4 h-4" /> Clock In
          </button>
          <button
            type="button"
            disabled={acting}
            onClick={handleClockOut}
            className="px-5 py-2.5 bg-[#041F56] hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" /> Clock Out
          </button>
          <button
            type="button"
            onClick={loadAttendance}
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">ON DUTY RIGHT NOW</span>
          <h2 className="text-2xl font-black text-emerald-600 mt-1.5">{onDutyRows.length} Staff</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-purple-600 uppercase">COMPLETED SHIFTS</span>
          <h2 className="text-2xl font-black text-purple-700 font-mono mt-1.5">{completedRows.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">TOTAL TIME CARDS</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">{records.length}</h2>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${tab === 'ALL' ? 'bg-[#041F56] text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Timesheet Ledger ({records.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('ON_DUTY')}
          className={`px-4 py-2 rounded-xl text-xs font-bold ${
            tab === 'ON_DUTY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'
          }`}
        >
          &bull; Live Duty ({onDutyRows.length})
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-x-auto">
        <table className="w-full min-w-[720px] divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50/70">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CLOCK-IN TIMESTAMP</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CLOCK-OUT TIMESTAMP</th>
              <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">AUDIT STATE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-medium">
            {rowsToShow.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-14 text-center text-gray-400">
                  No time card records found.
                </td>
              </tr>
            ) : (
              rowsToShow.map((s) => {
                const isOnDuty = !s.clockOutTime;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4 font-mono text-emerald-700 font-bold">
                      {new Date(s.clockInTime).toLocaleString('en-GB')}
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {s.clockOutTime ? new Date(s.clockOutTime).toLocaleString('en-GB') : '(Active Shift)'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          isOnDuty ? 'bg-blue-50 text-[#0554F4] border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isOnDuty ? 'On Duty' : s.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}