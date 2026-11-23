'use client';

import { useState, useEffect, useCallback, JSX } from 'react';
import api from '../../../../lib/api';
import { Shield, RefreshCw, Search, AlertCircle } from 'lucide-react';

interface RoleRecord {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

export default function StaffRolesMatrixPage(): JSX.Element {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [selectedRoleName, setSelectedRoleName] = useState<string>('');
  const [roleSearch, setRoleSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/shifts/roles');
      const rList: RoleRecord[] = Array.isArray(res.data?.data) ? res.data.data : [];
      setRoles(rList);
      setSelectedRoleName((prev) => prev || rList[0]?.name || '');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load RBAC roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const activeRole = roles.find((r) => r.name === selectedRoleName) || roles[0] || null;
  const filteredRoles = roles.filter((r) =>
    !roleSearch.trim()
      ? true
      : r.name.toLowerCase().includes(roleSearch.trim().toLowerCase()) ||
        (r.description || '').toLowerCase().includes(roleSearch.trim().toLowerCase())
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 bg-[#f8fafc] min-h-screen font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <p className="text-[11px] font-bold text-gray-400 mb-1">
            Staff Directory &rsaquo; <span className="text-[#041F56]">Security Clearances &amp; RBAC</span>
          </p>
          <div className="flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-[#0554F4]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#041F56] tracking-tight">
              Role Clearances &amp; Access Authority Matrix
            </h1>
          </div>
          <p className="text-[#176E84] text-xs sm:text-sm mt-1">
            Review retail POS checkout boundaries, wholesale pricing clearances, and cash drawer authority across your tenant.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRoles}
          className="p-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-xl"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-14 rounded-3xl text-center text-xs text-gray-400 animate-pulse">
          Loading retail &amp; wholesale role matrix...
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white p-14 rounded-3xl shadow-sm border border-gray-100 text-center space-y-2">
          <p className="text-sm font-black text-[#041F56]">No roles found in database yet</p>
          <p className="text-xs text-gray-500">Provision a staff member to automatically seed role records.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-4 bg-white p-5 rounded-3xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-black text-[#041F56]">Security Roles ({roles.length})</h2>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="Search roles..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none"
              />
            </div>
            <div className="space-y-2.5">
              {filteredRoles.map((r) => {
                const selected = activeRole?.name === r.name;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleName(r.name)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all space-y-1 ${
                      selected ? 'bg-[#F5F8FE] border-[#0554F4]' : 'bg-white border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-xs font-black text-[#041F56] block">{r.name}</span>
                    <p className="text-[11px] text-gray-500 line-clamp-2">
                      {r.description || 'Retail, supermarket & wholesale operational role'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {activeRole && (
            <div className="xl:col-span-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
              <div className="border-b border-gray-100 pb-4">
                <span className="inline-block px-3 py-1 rounded-lg bg-[#041F56] text-white text-xs font-black tracking-wide">
                  {activeRole.name}
                </span>
                <p className="text-xs text-gray-500 mt-2">
                  {activeRole.description || 'Enforced by backend JWT role middleware (requireRole) across all tenant endpoints.'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F5F8FE] border border-blue-100 text-xs text-[#041F56] space-y-1">
                <p className="font-black">Database Role ID</p>
                <p className="font-mono text-[11px] text-[#0554F4]">{activeRole.id}</p>
                <p className="text-[11px] text-gray-500 pt-1">
                  Created: {new Date(activeRole.createdAt).toLocaleString('en-GB')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}