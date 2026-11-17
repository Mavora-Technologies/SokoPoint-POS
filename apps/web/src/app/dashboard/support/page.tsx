'use client';

import { useState, useEffect } from 'react';
import { 
  LifeBuoy, Mail, MessageSquare, Plus, Clock, 
  CheckCircle, AlertCircle, Search, Loader2, X 
} from 'lucide-react';
import api from '../../../lib/api';

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  createdAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM'
  });

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/support/tickets');
      setTickets(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await api.post('/support/tickets', formData);
      if (res.data?.success) {
        setSuccess('Support ticket submitted successfully. Our team will review it shortly.');
        setFormData({ subject: '', description: '', priority: 'MEDIUM' });
        fetchTickets();
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccess('');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit support ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100"><Clock className="w-3 h-3" /> In Progress</span>;
      default: return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100"><AlertCircle className="w-3 h-3" /> Pending</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return <span className="text-xs font-bold text-red-600">Urgent</span>;
      case 'HIGH': return <span className="text-xs font-bold text-orange-500">High</span>;
      case 'LOW': return <span className="text-xs font-bold text-slate-400">Low</span>;
      default: return <span className="text-xs font-bold text-blue-500">Medium</span>;
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col space-y-5 font-sans text-slate-800 pb-12">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            Workspace <span className="text-slate-300">/</span> Help Center
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><LifeBuoy className="w-6 h-6" /></div>
            Documentation & Support
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Manage your support requests, report system issues, and track resolutions.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> Open New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Main Content - Tickets Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg font-extrabold text-slate-900">Support History</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search tickets..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-sm font-bold text-slate-500">Syncing support tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-lg font-extrabold text-slate-900">No tickets found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm">You haven't submitted any support requests yet. If you need help, open a new ticket.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Submitted</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-sm mb-0.5">{ticket.subject}</div>
                        <div className="text-[11px] font-medium text-slate-500">#{ticket.ticketNumber}</div>
                      </td>
                      <td className="px-6 py-4">{getPriorityBadge(ticket.priority)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {new Date(ticket.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">{getStatusBadge(ticket.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sidebar - Contact & Resources */}
        <div className="space-y-5">
          <div className="bg-slate-900 rounded-3xl p-6 shadow-sm text-white flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            <h3 className="text-lg font-extrabold mb-2">Need Immediate Help?</h3>
            <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed">Our enterprise support team is available during standard business hours to assist with POS operations.</p>
            
            <div className="space-y-4 mt-auto relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-blue-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Support</p>
                  <p className="text-sm font-bold">support@mavoratechnologies.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0"><Clock className="w-4 h-4 text-emerald-400" /></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Hours</p>
                  <p className="text-sm font-bold">Mon-Fri, 8:00 AM - 5:00 PM (EAT)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wide">Quick Resources</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">POS Operations Guide</span>
                <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">Inventory Management</span>
                <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors text-left group">
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600">Hardware Setup (Printers)</span>
                <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* New Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <form onSubmit={handleSubmitTicket} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden slide-in-from-bottom-4 animate-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Open Support Ticket</h3>
                <p className="text-xs text-slate-500 mt-0.5">Describe your issue in detail for faster resolution.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> {success}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Subject <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" 
                  placeholder="e.g., Receipt printer not connecting" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Priority Level</label>
                <select 
                  value={formData.priority}
                  onChange={e => setFormData({...formData, priority: e.target.value})} 
                  className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="LOW">Low - General inquiry</option>
                  <option value="MEDIUM">Medium - Non-critical issue</option>
                  <option value="HIGH">High - Core feature broken</option>
                  <option value="URGENT">Urgent - System down</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Description <span className="text-red-500">*</span></label>
                <textarea 
                  required 
                  rows={4}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full border border-slate-200 px-4 py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600 resize-none" 
                  placeholder="Provide steps to reproduce, error codes, or physical hardware details..." 
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting || !!success} 
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}