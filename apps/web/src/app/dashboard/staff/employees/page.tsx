'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import Link from 'next/link';
import api from '../../../../lib/api';
import { Shield, Plus, RefreshCw, Search, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface EmployeeRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  branchId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function EmployeesDirectoryPage(): JSX.Element {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'CASHIER',
  });

  const loadDirectory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/employees');
      setEmployees(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load workforce directory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post('/shifts/employees', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
      });
      setIsProvisionOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'CASHIER' });
      setFeedback('Staff member provisioned successfully.');
      await loadDirectory();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to provision staff member.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = employees.filter((e) => e.isActive).length;
  const deactivatedCount = employees.filter((e) => !e.isActive).length;

  const filtered = employees.filter((e) => {
    if (statusFilter === 'ACTIVE' && !e.isActive) return false;
    if (statusFilter === 'DEACTIVATED' && e.isActive) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    return fullName.includes(q) || e.email.toLowerCase().includes(q) || (e.phone || '').toLowerCase().includes(q);
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 w-full">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] uppercase tracking-wider mb-1">
            HUMAN CAPITAL &amp; ORGANIZATION &rsaquo; EMPLOYEE MASTER ROSTER &amp; ACCESS CONTROLS
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
            Workforce &amp; Employee Directory
          </h1>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Administer retail cashiers, supermarket floor staff, wholesale managers, and branch access profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <Link
            href="/dashboard/staff/roles"
            className="px-4 py-2.5 bg-white hover:bg-gray-50 text-[#041F56] border border-gray-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Shield className="w-4 h-4 text-[#0554F4]" /> RBAC Clearances
          </Link>
          <button
            type="button"
            onClick={() => setIsProvisionOpen(true)}
            className="px-5 py-2.5 bg-[#0554F4] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Provision Employee
          </button>
          <button
            type="button"
            onClick={loadDirectory}
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

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {feedback}
          </span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">TOTAL WORKFORCE</span>
          <h2 className="text-2xl font-black text-[#041F56] font-mono mt-1.5">{employees.length}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-emerald-600 uppercase">ACTIVE ACCOUNTS</span>
          <h2 className="text-2xl font-black text-emerald-600 font-mono mt-1.5">{activeCount}</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-[#0554F4] uppercase">TENANT ISOLATED</span>
          <h2 className="text-2xl font-black text-[#0554F4] font-mono mt-1.5">100%</h2>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
          <span className="text-[10px] font-black text-gray-400 uppercase">DEACTIVATED</span>
          <h2 className="text-2xl font-black text-gray-700 font-mono mt-1.5">{deactivatedCount}</h2>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between gap-3">
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name, email, or phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 bg-gray-50/50 outline-none focus:ring-2 focus:ring-[#0554F4]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xs font-black text-[#041F56] uppercase tracking-wider">
            MASTER EMPLOYEE LEDGER ({filtered.length} RECORDS)
          </h2>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[820px] divide-y divide-gray-100 text-left">
            <thead className="bg-gray-50/70">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">EMPLOYEE DETAILS</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">CONTACT</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase">EMPLOYMENT STATE</th>
                <th className="px-6 py-3.5 text-[10px] font-black text-gray-400 uppercase text-right">JOINED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center text-gray-400 animate-pulse">
                    Loading retail &amp; wholesale staff roster...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center text-gray-400">
                    No employee records found. Click <strong>Provision Employee</strong> to add staff.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/60">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#041F56]">{emp.firstName} {emp.lastName}</p>
                      <p className="text-[10px] font-mono text-gray-400">ID: {emp.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <p>{emp.email}</p>
                      {emp.phone && <p className="text-[11px] text-gray-400">{emp.phone}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {emp.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-500">
                      {new Date(emp.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-[#041F56]">Provision Store Staff</h2>
                <p className="text-xs text-gray-500">Adds a staff profile with login credentials under your tenant</p>
              </div>
              <button type="button" onClick={() => setIsProvisionOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleProvision} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">First Name *</label>
                  <input
                    required
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Work Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-[#041F56] mb-1">Login Password *</label>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-[#041F56] bg-white"
                  >
                    <option value="CASHIER">Cashier / POS Operator</option>
                    <option value="BRANCH_MANAGER">Branch Manager</option>
                    <option value="STORE_MANAGER">Store Manager</option>
                    <option value="WHOLESALE_MANAGER">Wholesale Manager</option>
                    <option value="INVENTORY_MANAGER">Inventory Manager</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="BUSINESS_ADMIN">Business Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-[#041F56] mb-1">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setIsProvisionOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-bold">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="px-5 py-2 bg-[#0554F4] text-white rounded-xl text-xs font-bold">
                  {submitting ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}