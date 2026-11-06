'use client';

import { useState, useEffect } from 'react';
import { Search, Receipt, Loader2 } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  relatedPO: string;
  relatedGRN: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  outstandingBalance: number;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'REJECTED';
}

export default function SupplierInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setTimeout(() => {
      setInvoices([
        { id: 'INV-1001', invoiceNumber: 'BID-2026-981', supplier: 'Bidco Africa Ltd', relatedPO: 'PO-2026-448', relatedGRN: 'GRN-2026-112', invoiceDate: '2026-11-01', dueDate: '2026-12-01', totalAmount: 45000, outstandingBalance: 45000, status: 'VERIFIED' },
        { id: 'INV-1002', invoiceNumber: 'BRK-INV-554', supplier: 'Brookside Dairies', relatedPO: 'PO-2026-440', relatedGRN: 'GRN-2026-105', invoiceDate: '2026-10-15', dueDate: '2026-11-15', totalAmount: 120000, outstandingBalance: 60000, status: 'PARTIALLY_PAID' },
        { id: 'INV-1003', invoiceNumber: 'KAP-7781', supplier: 'Kapa Oil Refineries', relatedPO: 'PO-2026-401', relatedGRN: 'GRN-2026-098', invoiceDate: '2026-09-01', dueDate: '2026-10-01', totalAmount: 25000, outstandingBalance: 25000, status: 'OVERDUE' },
      ]);
      setLoading(false);
    }, 600);
  }, []);

  const filteredInvoices = invoices.filter(i => 
    i.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.relatedPO.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 overflow-x-hidden">
      <div className="max-w-[1920px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 sm:p-8 rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Receipt className="h-7 w-7 text-blue-600 hidden sm:block" /> Supplier Invoices
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium sm:ml-10">
              Verify invoices against Purchase Orders and GRNs, and track payment statuses.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by invoice #, supplier, or PO..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 outline-none bg-slate-50/50 transition-all"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1100px] divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice & Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Related PO / GRN</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Balance Due</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" /></td></tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-500 font-bold">No invoices found.</td></tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    let statusBadge = "bg-slate-100 text-slate-800 border-slate-200";
                    if (inv.status === 'PAID') statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    if (inv.status === 'VERIFIED') statusBadge = "bg-blue-50 text-blue-700 border-blue-200";
                    if (inv.status === 'PARTIALLY_PAID') statusBadge = "bg-purple-50 text-purple-700 border-purple-200";
                    if (inv.status === 'PENDING_VERIFICATION') statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                    if (inv.status === 'OVERDUE' || inv.status === 'REJECTED') statusBadge = "bg-red-50 text-red-700 border-red-200";

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold font-mono text-slate-900">{inv.invoiceNumber}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{inv.supplier}</td>
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs font-bold text-blue-600">{inv.relatedPO}</p>
                          <p className="font-mono text-xs font-bold text-emerald-600 mt-0.5">{inv.relatedGRN}</p>
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">
                          {inv.totalAmount.toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
                        </td>
                        <td className="px-6 py-4 font-black text-red-600">
                          {inv.outstandingBalance > 0 ? inv.outstandingBalance.toLocaleString('en-KE', { style: 'currency', currency: 'KES' }) : '0.00'}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 inline-flex text-[10px] font-black tracking-wider uppercase rounded-lg border ${statusBadge}`}>
                            {inv.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm border border-slate-200">
                            {inv.status === 'PENDING_VERIFICATION' ? 'Verify Invoice' : 'View Details'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}