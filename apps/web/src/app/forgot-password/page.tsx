'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowRight, ShieldCheck, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);

    try {
      // Secure call to Express backend forgot-password endpoint
      await api.post('/auth/forgot-password', { email });
      
      // Show success state regardless of whether the email exists (security best practice)
      setIsSubmitted(true);
    } catch (error: any) {
      console.error('Password reset request failed:', error);
      // Even on failure, it's often best practice to show the success message to prevent email enumeration,
      // but if your API returns specific rate-limit errors, catch them here.
      setErrorMessage(
        error.response?.data?.message || 'Something went wrong. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white selection:bg-green-900 selection:text-white font-sans">
      
      {/* LEFT PANEL: Branding & Visuals */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1600" 
            alt="Retail Store Customer Service" 
            className="object-cover w-full h-full opacity-50" 
          />
          <div className="absolute inset-0 bg-slate-900/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>
        </div>

        <div className="relative z-10 p-12 xl:p-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <img src="/SokoPoint POS Logo.png" alt="SokoPoint-POS Logo" className="h-8 w-auto object-contain" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">SokoPoint-POS</span>
          </Link>
        </div>

        <div className="relative z-10 p-12 xl:p-16 text-white max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-400/30 text-green-300 text-sm font-semibold mb-6 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4" /> Secure Account Recovery
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Regain access to your workspace securely.
          </h1>
          <p className="text-green-50 text-lg leading-relaxed drop-shadow-md">
            Enterprise-grade security protocols ensure your retail data remains protected even during account recovery.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Recovery Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative bg-slate-50 lg:bg-white overflow-y-auto custom-scrollbar">
        <div className="absolute inset-0 z-0 lg:hidden bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="w-full max-w-md relative z-10 bg-white lg:bg-transparent p-8 lg:p-0 rounded-3xl shadow-xl lg:shadow-none ring-1 ring-slate-900/5 lg:ring-0 my-auto">
          
          <div className="flex lg:hidden justify-center mb-8">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-md ring-1 ring-slate-100">
              <img src="/SokoPoint POS Logo.png" alt="SokoPoint-POS Logo" className="h-10 w-auto object-contain" />
            </div>
          </div>

          {!isSubmitted ? (
            <>
              <div className="text-center lg:text-left mb-8">
                <Link href="/login" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors mb-6">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back to Login
                </Link>
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Reset Password</h2>
                <p className="text-slate-500">Enter the email associated with your business account and we'll send you a recovery link.</p>
              </div>

              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleResetRequest} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Registered Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white"
                      placeholder="admin@business.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-green-600/25 text-base font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                      Sending Instructions...
                    </>
                  ) : (
                    <>
                      Send Reset Link <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50 mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Check your email</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                We've sent a secure password reset link to <strong className="text-slate-900">{email}</strong>. 
                Please check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="w-full flex items-center justify-center py-4 px-4 border border-slate-200 rounded-xl shadow-sm text-base font-bold text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all"
              >
                Return to Login
              </Link>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100 text-center lg:text-left">
            <p className="text-sm text-slate-500">
              Need help?{' '}
              <a href="#" className="font-bold text-green-600 hover:text-green-500 transition-colors">
                Contact Mavora Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}