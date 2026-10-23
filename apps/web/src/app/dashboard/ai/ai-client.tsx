'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react';

export default function AIClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello Valary! I am your SokoPoint-POS AI Copilot. I can help you analyze sales trends, predict inventory needs, or generate reports. What would you like to know today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center h-[100dvh] w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  const handleSend = () => {
    if (!input.trim()) return;
    
    const newMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I am currently running in demo mode. Once fully connected to the backend, I will query your PostgreSQL database to provide real-time insights on those metrics!' 
      }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `
      }} />

      {/* Flush edge-to-edge application layout using dynamic viewport height */}
      <div className="flex flex-col h-[100dvh] w-full bg-slate-50 overflow-hidden relative">
        
        {/* Edge-to-Edge Header */}
        <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-5 lg:py-6 shrink-0 z-20 shadow-sm transition-all">
          <div className="max-w-7xl mx-auto flex items-center gap-3 sm:gap-4 lg:gap-5">
            <div className="p-2.5 sm:p-3 lg:p-3.5 bg-green-50 rounded-xl lg:rounded-2xl text-green-600 shrink-0 shadow-inner border border-green-100/50">
              <Bot className="h-6 w-6 sm:h-8 sm:w-8 lg:h-9 lg:w-9" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2 lg:gap-3 truncate">
                SokoPoint AI Copilot <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-amber-500 shrink-0" />
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-slate-500 font-medium truncate mt-0.5 lg:mt-1">
                Your intelligent assistant for retail analytics and store management
              </p>
            </div>
          </div>
        </div>

        {/* Fluid Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto w-full bg-slate-50/80 custom-scrollbar scroll-smooth">
          {/* Constrained readable width for chat bubbles, adapting to ultra-wide */}
          <div className="max-w-5xl xl:max-w-6xl mx-auto w-full p-4 sm:p-6 lg:p-8 xl:p-10 space-y-6 lg:space-y-8 pb-8">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 sm:gap-4 lg:gap-5 w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {/* Assistant Avatar */}
                {msg.role === 'assistant' && (
                  <div className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-white shadow-sm border border-slate-200 text-green-600 flex items-center justify-center">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`relative max-w-[85%] sm:max-w-[80%] lg:max-w-[70%] p-4 sm:p-5 lg:p-6 text-[15px] sm:text-base lg:text-lg leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-green-600 text-white rounded-2xl rounded-tr-sm shadow-green-600/20' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-sm shadow-slate-200/50'
                }`}>
                  {msg.content}
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-slate-900 shadow-md text-white flex items-center justify-center">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3 sm:gap-4 lg:gap-5 w-full justify-start animate-in fade-in duration-300">
                <div className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-full bg-white shadow-sm border border-slate-200 text-green-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                </div>
                <div className="p-4 sm:p-5 lg:p-6 rounded-2xl bg-white border border-slate-200 rounded-tl-sm flex items-center gap-1.5 sm:gap-2 shadow-sm h-[52px] sm:h-[60px] lg:h-[72px]">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 lg:w-3 lg:h-3 bg-green-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            
            {/* Invisible div to target for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Edge-to-Edge Sticky Input Area */}
        <div className="w-full bg-white border-t border-slate-200 p-4 sm:p-6 lg:p-8 shrink-0 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-safe transition-all">
          <div className="max-w-5xl xl:max-w-6xl mx-auto relative flex items-center group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask SokoPoint AI about sales, inventory, or daily reports..."
              className="w-full pl-6 sm:pl-8 lg:pl-10 pr-16 sm:pr-20 lg:pr-24 py-4 sm:py-5 lg:py-6 bg-slate-50 border border-slate-200 rounded-full focus:ring-4 focus:ring-green-600/10 focus:border-green-600 focus:bg-white transition-all text-base sm:text-lg lg:text-xl outline-none placeholder:text-slate-400 shadow-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="absolute right-2 sm:right-3 lg:right-4 p-3 sm:p-3.5 lg:p-4 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-full transition-all active:scale-95 shadow-md shadow-green-600/20 disabled:shadow-none flex items-center justify-center touch-manipulation"
            >
              <Send className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 ml-0.5 sm:ml-1 lg:ml-1.5" />
            </button>
          </div>
          <div className="max-w-5xl xl:max-w-6xl mx-auto mt-3 sm:mt-4 lg:mt-5 text-center">
            <p className="text-[11px] sm:text-xs lg:text-sm text-slate-400 font-medium tracking-wide">
              AI Copilot can make mistakes. Verify important financial data against your ledger.
            </p>
          </div>
        </div>
        
      </div>
    </>
  );
}
