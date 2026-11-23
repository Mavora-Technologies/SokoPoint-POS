'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Loader2,
  Search,
  CheckCircle2,
  X,
  Mail,
  Phone,
  Award,
  Trash2,
  Eye,
  Pencil,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import api from '../../../lib/api';

interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  customerType?: 'RETAIL' | 'WHOLESALE' | 'CORPORATE';
  creditLimit?: number;
  points: number;
  createdAt?: string;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  customerType: 'RETAIL' as 'RETAIL' | 'WHOLESALE' | 'CORPORATE',
  creditLimit: '0',
  points: '0',
};

export default function CustomersClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formState, setFormState] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal State
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/customers');
      const data = res.data?.data || res.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load customers', error);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) fetchCustomers();
  }, [isMounted, fetchCustomers]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormState(emptyForm);
    setIsFormOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setFormState({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      address: c.address || '',
      customerType: c.customerType || 'RETAIL',
      creditLimit: String(c.creditLimit ?? 0),
      points: String(c.points ?? 0),
    });
    setIsFormOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const payload = {
        name: formState.name.trim(),
        email: formState.email.trim() || null,
        phone: formState.phone.trim() || null,
        address: formState.address.trim() || null,
        customerType: formState.customerType,
        creditLimit: Number(formState.creditLimit) || 0,
        loyaltyPoints: Number(formState.points) || 0,
      };

      if (editingCustomer) {
        const res = await api.put(`/customers/${editingCustomer.id}`, payload);
        const updated = res.data?.data || res.data;
        if (updated) {
          setCustomers((prev) => prev.map((c) => (c.id === editingCustomer.id ? updated : c)));
        } else {
          await fetchCustomers();
        }
      } else {
        const res = await api.post('/customers', payload);
        const created = res.data?.data || res.data;
        if (created) {
          setCustomers((prev) => [created, ...prev]);
        } else {
          await fetchCustomers();
        }
      }

      setIsFormOpen(false);
      setEditingCustomer(null);
      setFormState(emptyForm);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'Failed to save customer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}?`)) return;

    setProcessingId(customer.id);
    try {
      await api.delete(`/customers/${customer.id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      if (viewingCustomer?.id === customer.id) setViewingCustomer(null);
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 409) {
        alert(`Action Denied: Cannot delete "${customer.name}" because they have linked records.`);
      } else {
        alert(error?.response?.data?.message || 'Error: Could not delete customer.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center min-h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c?.name || '').toLowerCase().includes(q) ||
      (c?.phone || '').toLowerCase().includes(q) ||
      (c?.email || '').toLowerCase().includes(q) ||
      (c?.customerType || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3 truncate">
              <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <span className="truncate">Customer Management</span>
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 font-medium">
              Manage retail, wholesale, and corporate accounts, loyalty points, and credit limits.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={fetchCustomers}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh customers"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-500 transition-all"
            >
              <Plus className="mr-2 h-4 w-4 shrink-0" /> Add Customer
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 overflow-hidden flex flex-col w-full">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers by name, phone, email, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 text-sm outline-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[36vh]">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[36vh] text-slate-500 p-6 text-center">
              <Users className="h-12 w-12 text-slate-300 mb-3" />
              <p className="text-base font-bold text-slate-700">No customers found</p>
              <p className="mt-1 text-xs text-slate-400">Try adjusting your search or add a new customer.</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="py-3.5 pl-6 pr-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Type</th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Contact</th>
                    <th className="px-3 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Loyalty Points</th>
                    <th className="px-3 py-3.5 text-right text-xs font-bold text-slate-500 uppercase pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-sm">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 pl-6 pr-3 font-bold text-slate-900">{c.name}</td>
                      <td className="px-3 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700">
                          {c.customerType || 'RETAIL'}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs text-slate-600 space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> {c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" /> {c.phone}
                          </div>
                        )}
                        {!c.email && !c.phone && '—'}
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
                          <Award className="h-3.5 w-3.5" /> {(Number(c.points) || 0).toLocaleString()} pts
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right pr-6 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingCustomer(c)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Customer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Customer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(c)}
                            disabled={processingId === c.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Customer"
                          >
                            {processingId === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* VIEW CUSTOMER MODAL */}
        {viewingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" /> Customer Profile
                </h3>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 space-y-3 text-sm">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Full Name</p>
                  <p className="font-bold text-slate-900 text-base">{viewingCustomer.name}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Account Type</p>
                    <p className="font-semibold text-slate-800">{viewingCustomer.customerType || 'RETAIL'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Loyalty Points</p>
                    <p className="font-bold text-blue-600">{(Number(viewingCustomer.points) || 0).toLocaleString()} pts</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Phone</p>
                    <p className="text-slate-700">{viewingCustomer.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Email</p>
                    <p className="text-slate-700 truncate">{viewingCustomer.email || '—'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase">Credit Limit</p>
                  <p className="font-mono font-bold text-slate-900">
                    KES {Number(viewingCustomer.creditLimit ?? 0).toLocaleString()}
                  </p>
                </div>
                {viewingCustomer.address && (
                  <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{viewingCustomer.address}</span>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                <button
                  onClick={() => {
                    const target = viewingCustomer;
                    setViewingCustomer(null);
                    openEditModal(target);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ADD / EDIT CUSTOMER MODAL */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    required
                    type="text"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., Jane Wanjiku"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="+254 700..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Account Type</label>
                    <select
                      value={formState.customerType}
                      onChange={(e) => setFormState({ ...formState, customerType: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-2.5 text-xs font-bold bg-white"
                    >
                      <option value="RETAIL">RETAIL</option>
                      <option value="WHOLESALE">WHOLESALE</option>
                      <option value="CORPORATE">CORPORATE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (KES)</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.creditLimit}
                      onChange={(e) => setFormState({ ...formState, creditLimit: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loyalty Points</label>
                    <input
                      type="number"
                      min="0"
                      value={formState.points}
                      onChange={(e) => setFormState({ ...formState, points: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-sm font-mono outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address / Location (Optional)</label>
                  <input
                    type="text"
                    value={formState.address}
                    onChange={(e) => setFormState({ ...formState, address: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-sm outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., Kilimani, Nairobi"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {editingCustomer ? 'Update Customer' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}