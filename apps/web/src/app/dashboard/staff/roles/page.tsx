'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import api from '../../../../lib/api';

interface RoleRecord {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/roles');
      setRoles(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load RBAC roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
          <ShieldCheck className="h-6 w-6 text-[#0554F4]" />
          Role-Based Access Control (RBAC)
        </h1>
        <p className="text-sm text-slate-500 mt-1">Active system roles configured in your PostgreSQL database.</p>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-2xl">{error}</div>}

      {loading ? (
        <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0554F4]" /></div>
      ) : roles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <ShieldCheck className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <p className="font-bold">No roles configured yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="inline-block px-3 py-1 bg-[#041F56] text-white text-xs font-bold rounded-lg tracking-wide">
                  {role.name}
                </span>
                <p className="text-sm text-slate-600 mt-3">
                  {role.description || 'System-enforced access role for POS & inventory operations.'}
                </p>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
                Created: {new Date(role.createdAt).toLocaleDateString('en-GB')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}