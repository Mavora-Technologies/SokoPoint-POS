'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, ShieldCheck, Zap, BarChart3, 
  Store, ShoppingCart, Users, Globe, Mail, Phone,
  Menu, X, Loader2, CheckCircle2
} from 'lucide-react';

export default function HomePage() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Demo-Safe Form States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  // Handle Demo Request Submission
  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate network delay for a realistic demo effect
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 selection:bg-blue-900 selection:text-white flex flex-col font-sans overflow-x-hidden">
      
      {/* 1. FIXED EDGE-TO-EDGE NAVIGATION BAR */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-sm transition-all w-full">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex justify-between items-center h-16 sm:h-20 lg:h-24">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 sm:gap-3 z-50 group outline-none">
              <img 
                src="/SokoPoint POS Logo.png" 
                alt="SokoPoint-POS" 
                className="h-7 sm:h-9 lg:h-10 w-auto object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                SokoPoint-POS
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-8 xl:gap-12">
              <a href="#features" className="text-sm xl:text-base font-bold text-slate-600 hover:text-blue-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-2 py-1">What the POS Covers</a>
              <a href="#about" className="text-sm xl:text-base font-bold text-slate-600 hover:text-blue-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-2 py-1">About Us</a>
              <a href="#contact" className="text-sm xl:text-base font-bold text-slate-600 hover:text-blue-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-2 py-1">Contact Us</a>
            </nav>

            {/* Desktop CTA Buttons */}
            <div className="hidden lg:flex items-center gap-4 xl:gap-6">
              <a 
                href="#contact" 
                className="text-sm xl:text-base font-bold text-slate-700 hover:text-blue-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md px-2 py-1"
              >
                Request a Demo
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl xl:rounded-2xl bg-blue-600 px-6 xl:px-8 py-3 xl:py-3.5 text-sm xl:text-base font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg transition-all active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
              >
                Sign In <ArrowRight className="ml-2 h-4 w-4 xl:h-5 xl:w-5" />
              </Link>
            </div>

            {/* Mobile Menu Toggle Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors z-50 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              aria-expanded={isMenuOpen}
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <X className="h-6 w-6 sm:h-7 sm:w-7" /> : <Menu className="h-6 w-6 sm:h-7 sm:w-7" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        <div 
          className={`fixed inset-0 bg-white/95 backdrop-blur-2xl z-40 transition-all duration-300 ease-in-out lg:hidden ${
            isMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
          }`}
        >
          <div className={`flex flex-col h-full pt-24 sm:pt-32 pb-8 px-6 sm:px-12 overflow-y-auto transition-transform duration-300 ${
            isMenuOpen ? 'translate-y-0' : 'translate-y-8'
          }`}>
            <nav className="flex flex-col gap-6 sm:gap-8 text-xl sm:text-2xl font-black text-slate-900">
              <a href="#features" onClick={() => setIsMenuOpen(false)} className="border-b border-slate-100 pb-4 sm:pb-6 hover:text-blue-600 transition-colors">What the POS Covers</a>
              <a href="#about" onClick={() => setIsMenuOpen(false)} className="border-b border-slate-100 pb-4 sm:pb-6 hover:text-blue-600 transition-colors">About Us</a>
              <a href="#contact" onClick={() => setIsMenuOpen(false)} className="border-b border-slate-100 pb-4 sm:pb-6 hover:text-blue-600 transition-colors">Contact Us</a>
            </nav>
            <div className="mt-auto pt-8 flex flex-col gap-4 sm:gap-5 w-full">
              <a 
                href="#contact" 
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-4 sm:py-5 text-center text-slate-700 text-lg sm:text-xl font-bold border-2 border-slate-200 rounded-2xl active:bg-slate-50 transition-colors"
              >
                Request a Demo
              </a>
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="w-full py-4 sm:py-5 flex justify-center items-center gap-2 rounded-2xl bg-blue-600 text-white text-lg sm:text-xl font-bold shadow-lg shadow-blue-600/30 active:bg-blue-700 transition-all active:scale-[0.98]"
              >
                Sign In <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center">
        
        {/* 2. FULL-VIEWPORT HERO SECTION */}
        <section className="relative w-full min-h-[100dvh] flex items-center justify-center pt-16 sm:pt-20 lg:pt-24 overflow-hidden bg-slate-900">
          {/* Background Image & Overlay */}
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=2500" 
              alt="Retail POS Background" 
              className="object-cover w-full h-full opacity-40 scale-105"
            />
            <div className="absolute inset-0 bg-blue-950/80 mix-blend-multiply"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
          </div>

          <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-center flex flex-col items-center py-12 sm:py-20 lg:py-32">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-white max-w-5xl xl:max-w-7xl leading-[1.1] sm:leading-[1.1] lg:leading-[1.05]">
              Smarter Retail with <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
                SokoPoint Commerce OS
              </span>
            </h1>
            
            <p className="mt-6 sm:mt-8 lg:mt-10 text-base sm:text-lg lg:text-xl xl:text-2xl text-blue-100 font-medium max-w-2xl xl:max-w-4xl leading-relaxed sm:leading-relaxed">
              Our fully integrated solution offers flexibility for single or multi-site capabilities. Connect your Point of Sale, Inventory, Payments, and Analytics in one powerful system.
            </p>
            
            <div className="mt-10 sm:mt-12 lg:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 w-full sm:w-auto px-4 sm:px-0">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-blue-500 px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg lg:text-xl font-bold text-white shadow-xl shadow-blue-500/30 hover:bg-blue-400 transition-all active:scale-[0.98] touch-manipulation"
              >
                Access Workspace
              </Link>
              <a
                href="#contact"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md px-8 sm:px-10 py-4 sm:py-5 text-base sm:text-lg lg:text-xl font-bold text-white border border-white/20 hover:bg-white/20 transition-all active:scale-[0.98] touch-manipulation"
              >
                Request a Demo
              </a>
            </div>
          </div>
        </section>

        {/* 3. WHAT THE POS COVERS (FEATURES) */}
        <section id="features" className="w-full py-20 sm:py-28 lg:py-32 xl:py-40 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          
          <div className="relative z-10 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            <div className="text-center max-w-3xl xl:max-w-5xl mx-auto mb-16 sm:mb-20 lg:mb-24">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                Everything you need to run your business
              </h2>
              <p className="mt-4 sm:mt-6 lg:mt-8 text-lg sm:text-xl xl:text-2xl text-slate-500 font-medium leading-relaxed">
                Modules designed specifically for modern retail and supermarket operations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 xl:gap-10">
              
              <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 group h-full flex flex-col">
                <div className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 sm:mb-8 lg:mb-10 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                  <Store className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 mb-3 sm:mb-4">Point of Sale</h3>
                <p className="text-slate-600 text-base sm:text-lg lg:text-xl leading-relaxed flex-1">
                  Fast, offline-capable terminal. Handle suspended sales, cash-ups, integrated M-Pesa, card payments, and receipt printing seamlessly.
                </p>
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 group h-full flex flex-col">
                <div className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 sm:mb-8 lg:mb-10 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                  <ShoppingCart className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 mb-3 sm:mb-4">Inventory & Procurement</h3>
                <p className="text-slate-600 text-base sm:text-lg lg:text-xl leading-relaxed flex-1">
                  Real-time stock syncing across multiple branches. Automate purchase orders, manage suppliers, and track minimum stock thresholds.
                </p>
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 sm:p-10 lg:p-12 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 hover:border-blue-200 transition-all duration-300 group h-full flex flex-col md:col-span-2 lg:col-span-1">
                <div className="h-14 w-14 sm:h-16 sm:w-16 lg:h-20 lg:w-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 sm:mb-8 lg:mb-10 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                  <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 mb-3 sm:mb-4">AI Analytics & Reports</h3>
                <p className="text-slate-600 text-base sm:text-lg lg:text-xl leading-relaxed flex-1">
                  Make data-driven decisions. Get deep insights into category performance, cashier shifts, and net profit margins instantly.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* 4. CONTACT / DEMO SECTION */}
        <section id="contact" className="w-full py-20 sm:py-28 lg:py-32 xl:py-40 bg-blue-950 text-white relative border-t border-blue-900">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 grid grid-cols-1 xl:grid-cols-2 gap-12 lg:gap-20 items-center">
            
            <div className="max-w-2xl xl:max-w-none">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black mb-6 lg:mb-8 tracking-tight leading-tight text-white">
                Ready to upgrade your retail experience?
              </h2>
              <p className="text-blue-200 text-lg sm:text-xl lg:text-2xl mb-8 lg:mb-12 leading-relaxed font-medium">
                Whether you run a single shop or a multi-branch supermarket network, SokoPoint-POS scales with you. Book a live demo today to see the OS in action.
              </p>
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-4 text-blue-100 text-lg sm:text-xl lg:text-2xl font-medium">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-blue-900/50 border border-blue-800 flex items-center justify-center shrink-0">
                    <Phone className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" />
                  </div>
                  +254 (0) 795 707 823
                </div>
                <div className="flex items-center gap-4 text-blue-100 text-lg sm:text-xl lg:text-2xl font-medium break-all">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-blue-900/50 border border-blue-800 flex items-center justify-center shrink-0">
                    <Mail className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" />
                  </div>
                  info@mavoratechnologies.com
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl w-full max-w-2xl mx-auto xl:mx-0 min-h-[450px] flex flex-col justify-center relative z-10 text-slate-900">
              {isSubmitted ? (
                <div className="text-center py-10 animate-in zoom-in-95 duration-500">
                  <div className="mx-auto h-24 w-24 bg-green-50 rounded-full flex items-center justify-center mb-8 border-8 border-green-100">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">Request Received!</h3>
                  <p className="text-slate-500 text-lg sm:text-xl leading-relaxed mb-8">
                    Thank you for your interest in SokoPoint-POS. Our team at Mavora Technologies will contact you shortly to schedule your personalized demo.
                  </p>
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors text-base sm:text-lg"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 mb-8 sm:mb-10">Request a Demo</h3>
                  <form className="space-y-6 sm:space-y-8" onSubmit={handleDemoSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                      <div>
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest block mb-2 sm:mb-3">First Name *</label>
                        <input 
                          type="text" 
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base sm:text-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" 
                          required 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-widest block mb-2 sm:mb-3">Last Name *</label>
                        <input 
                          type="text" 
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base sm:text-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" 
                          required 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 uppercase tracking-widest block mb-2 sm:mb-3">Business Name</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base sm:text-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all" 
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full mt-4 flex items-center justify-center gap-3 bg-blue-600 text-white font-bold text-lg sm:text-xl py-4 sm:py-5 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed touch-manipulation"
                    >
                      {isSubmitting ? <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin" /> : null}
                      {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 5. FOOTER (Mavora Technologies) */}
      <footer className="w-full bg-slate-900 border-t border-slate-800 pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 shrink-0">
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12 sm:mb-16 lg:mb-20">
            
            <div className="flex items-center gap-3 sm:gap-4">
              <img 
                src="/SokoPoint POS Logo.png" 
                alt="SokoPoint-POS" 
                className="h-8 sm:h-10 lg:h-12 w-auto grayscale opacity-50" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                <Store className="h-6 w-6 text-slate-500" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-slate-500 tracking-tight">SokoPoint-POS</span>
            </div>
            
            {/* Social Links */}
            <div className="flex items-center gap-6 sm:gap-8">
              <a href="https://mavoratechnologies.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors p-2" title="Website">
                <Globe className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
              </a>
              <a href="https://linkedin.com/company/mavoratechnologies" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-500 transition-colors p-2" title="LinkedIn">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a href="https://facebook.com/mavoratechnologies" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-blue-600 transition-colors p-2" title="Facebook">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
              </a>
              <a href="https://instagram.com/mavoratechnologies" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-pink-500 transition-colors p-2" title="Instagram">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a href="https://tiktok.com/@mavoratechnologies" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors p-2" title="TikTok">
                <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>
          
          <div id="about" className="text-center border-t border-slate-800 pt-8 sm:pt-10 flex flex-col lg:flex-row justify-between items-center gap-6">
            <p className="text-slate-500 text-sm sm:text-base font-medium">
              &copy; {currentYear} Developed and maintained by <a href="https://mavoratechnologies.com" className="text-blue-500 hover:text-blue-400 font-bold transition-colors" target="_blank" rel="noopener noreferrer">Mavora Technologies</a>. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8 text-sm sm:text-base text-slate-500 font-medium">
              <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
