'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Plus, Truck, Loader2 } from 'lucide-react';

interface Supplier {
  id: number;
  code: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  kraPin: string;
  paymentTerms: string;
  approvalStatus: 'APPROVED' | 'PENDING' | 'SUSPENDED';
}

export default function ApprovedSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setSuppliers([
        { id: 1, code: 'SUP-001', companyName: 'Bidco Africa Ltd', contactPerson: 'David Ochieng', phone: '+254 712 345 678', email: 'sales@bidco.co.ke', kraPin: 'P012345678X', paymentTerms: 'Net 30', approvalStatus: 'APPROVED' },
        { id: 2, code: 'SUP-002', companyName: 'Brookside Dairies', contactPerson: 'Mary Wanjiku', phone: '+254 722 987 654', email: 'orders@brookside.co.ke', kraPin: 'P098765432Y', paymentTerms: 'Net 15', approvalStatus: 'APPROVED' },
        { id: 3, code: 'SUP-003', companyName: 'Kapa Oil Refineries', contactPerson: 'Peter Kamau', phone: '+254 733 112 233', email: 'info@kapa.co.ke', kraPin: 'P055555555Z', paymentTerms: 'Cash on Delivery', approvalStatus: 'PENDING' },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const filteredSuppliers = suppliers.filter(s => 
    s.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Truck className="h-7 w-7 text-blue-600 hidden sm:block" /> Approved Suppliers
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium sm:ml-10">Manage wholesale vendors, contact details, and procurement compliance status.</p>
          </div>
          <Link 
            href="/dashboard/suppliers/new"
            className="w-full lg:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5" /> Register New Supplier
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by supplier name, code, or contact..." className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50/50 transition-all" />
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1000px] divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier & Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">KRA PIN</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Terms</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-16 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900">{supplier.companyName}</p>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{supplier.code}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{supplier.contactPerson}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{supplier.phone} • {supplier.email}</p>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600 text-xs font-medium">{supplier.kraPin}</td>
                      <td className="px-6 py-4 text-slate-700 font-bold">{supplier.paymentTerms}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${
                          supplier.approvalStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          supplier.approvalStatus === 'SUSPENDED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {supplier.approvalStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}