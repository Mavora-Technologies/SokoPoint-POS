'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BrainCircuit,
  Plus,
  SlidersHorizontal,
  Boxes,
  Users,
  DollarSign,
  Send,
  Loader2,
  Trash2,
  User,
  MessageSquare,
} from 'lucide-react';
import api from '../../../lib/api';

type DomainKey = 'GENERAL_OPS' | 'INVENTORY_STOCK' | 'CUSTOMER_WHOLESALE' | 'TREASURY_MARGINS';

interface AdvisorySession {
  id: string;
  domain: DomainKey;
  title: string;
  updatedAt: string;
}

interface AdvisoryMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

const DOMAINS: Array<{
  key: DomainKey;
  label: string;
  short: string;
  icon: any;
  prompts: string[];
}> = [
  {
    key: 'GENERAL_OPS',
    label: 'Cross-Operational Strategy',
    short: 'GENERAL OPS',
    icon: SlidersHorizontal,
    prompts: [
      'Summarize store operations telemetry',
      'What are my top-selling SKUs over the last 30 days?',
      'Highlight today’s revenue and order velocity',
    ],
  },
  {
    key: 'INVENTORY_STOCK',
    label: 'Inventory & Restock Intelligence',
    short: 'INVENTORY',
    icon: Boxes,
    prompts: [
      'Which SKUs are out of stock or below par level?',
      'Summarize total inventory asset valuation',
      'Recommend immediate restock priorities',
    ],
  },
  {
    key: 'CUSTOMER_WHOLESALE',
    label: 'Customer & Wholesale Retention',
    short: 'WHOLESALE & CRM',
    icon: Users,
    prompts: [
      'Analyze average ticket size and order frequency',
      'Summarize retail vs. wholesale turnover',
      'Identify top revenue-driving products',
    ],
  },
  {
    key: 'TREASURY_MARGINS',
    label: 'Treasury & Margin Analytics',
    short: 'TREASURY & MARGINS',
    icon: DollarSign,
    prompts: [
      'Audit net treasury liquidity and unreconciled payments',
      'Summarize cashier shift drift and open tills',
      'Review cash inflow vs. supplier outflow',
    ],
  },
];

export default function AIClient() {
  const [domain, setDomain] = useState<DomainKey>('GENERAL_OPS');
  const [sessions, setSessions] = useState<AdvisorySession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdvisoryMessage[]>([]);
  const [input, setInput] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sending, setSending] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);

  const currentDomain = DOMAINS.find((d) => d.key === domain) || DOMAINS[0];

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const res = await api.get('/ai/sessions');
      setSessions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load AI sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSelectSession = async (session: AdvisorySession) => {
    setActiveSessionId(session.id);
    setDomain(session.domain || 'GENERAL_OPS');
    try {
      const res = await api.get(`/ai/sessions/${session.id}/messages`);
      setMessages(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setInput('');
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/sessions/${id}`);
      if (activeSessionId === id) {
        setActiveSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const handleAsk = async (promptOverride?: string) => {
    const text = (promptOverride ?? input).trim();
    if (!text || sending) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setSending(true);

    try {
      const res = await api.post('/ai/ask', {
        sessionId: activeSessionId,
        domain,
        prompt: text,
      });
      const d = res.data?.data;
      if (d?.sessionId && !activeSessionId) {
        setActiveSessionId(d.sessionId);
        loadSessions();
      }
      if (d?.message) {
        setMessages((prev) => [...prev, d.message]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err?.response?.data?.message || 'Unable to query live telemetry right now. Please try again.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#f4f7fb] px-4 sm:px-6 lg:px-8 py-6 space-y-5 font-sans flex flex-col">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/70 px-6 py-5 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <p className="text-[11px] font-bold text-[#0554F4] mb-1">
            Enterprise Control &rsaquo; Copilot Strategic AI
          </p>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#041F56] tracking-tight inline-flex items-center gap-2.5">
            <BrainCircuit className="h-6 w-6 text-[#0554F4]" />
            SokoPoint Copilot &amp; Enterprise AI Advisory
          </h1>
          <p className="text-xs text-[#176E84] mt-1">
            Agentic multi-domain reasoning: live inventory restock intelligence, cashier custody audits, and retail/wholesale revenue telemetry.
          </p>
        </div>

        <button
          onClick={handleNewSession}
          className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> New Advisory Session
        </button>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[600px]">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 space-y-5 flex flex-col">
          {/* Strategic Reasoning Domain */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs space-y-2.5">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-1">
              STRATEGIC REASONING DOMAIN
            </p>
            <div className="space-y-1.5">
              {DOMAINS.map((d) => {
                const Icon = d.icon;
                const active = domain === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setDomain(d.key)}
                    className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                      active
                        ? 'bg-[#0554F4] text-white shadow-xs'
                        : 'bg-slate-50/80 text-[#041F56] hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-[#0554F4]'}`} />
                    <span className="truncate">{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advisory Sessions History */}
          <div className="bg-white rounded-2xl border border-slate-200/70 p-4 shadow-xs flex-1 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center px-1 mb-3">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                ADVISORY SESSIONS HISTORY
              </p>
              <span className="text-[11px] font-mono font-bold text-slate-400">{sessions.length}</span>
            </div>

            {loadingSessions ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#0554F4]" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 italic">
                No previous sessions found.
              </div>
            ) : (
              <div className="space-y-1.5 overflow-y-auto max-h-72 pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-colors ${
                      activeSessionId === s.id
                        ? 'bg-blue-50 text-[#0554F4] font-bold border border-blue-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{s.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                      title="Delete Session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Workspace */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/70 shadow-xs flex flex-col overflow-hidden min-h-[560px]">
          {/* Messages or Empty State */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-12 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0554F4] flex items-center justify-center">
                  <BrainCircuit className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#041F56]">
                    SokoPoint Enterprise Copilot Ready
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Ask strategic inquiries regarding inventory depletion, cashier shift custody, treasury liquidity, or branch revenue attribution.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {currentDomain.prompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAsk(p)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#0554F4] hover:bg-blue-50/40 text-xs font-medium text-slate-700 transition-all cursor-pointer"
                    >
                      &ldquo;{p}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={m.id || idx}
                  className={`flex items-start gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0 mt-0.5">
                      <BrainCircuit className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#0554F4] text-white font-medium rounded-tr-sm'
                        : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                  {m.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-[#041F56] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0554F4] flex items-center justify-center shrink-0">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
                  Querying live tenant telemetry...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Bottom Ask Bar */}
          <div className="p-4 border-t border-slate-100 bg-white flex items-center gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder={`Ask Copilot regarding ${currentDomain.short}...`}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-[#0554F4] focus:bg-white"
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              disabled={!input.trim() || sending}
              className="px-4 py-2.5 bg-[#0554F4] hover:bg-[#0441c4] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Send className="h-3.5 w-3.5" /> Ask
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}