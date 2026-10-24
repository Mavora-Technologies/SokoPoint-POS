//apps/web/src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import api from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Strict validation: check if email contains '@'
    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address containing "@".');
      return;
    }

    // Strict validation: check if password is provided and not empty
    if (!password || password.trim() === '') {
      setErrorMessage('Password cannot be empty.');
      return;
    }

    setIsLoading(true);

    try {
      // Secure call to your Express backend auth endpoint
      const response = await api.post('/auth/login', { email, password });
      
      // Extract token and user safely supporting both wrapped and direct payloads
      const responseBody = response.data;
      const token = responseBody?.data?.token || responseBody?.token;
      const user = responseBody?.data?.user || responseBody?.user;

      if (!token) {
        setErrorMessage('Invalid authentication response from server: Missing token.');
        setIsLoading(false);
        return;
      }

      // Securely store the token and user data matching your AuthContext layout
      localStorage.setItem('vora_token', token);
      localStorage.setItem('vora_user', JSON.stringify(user));
      
      // Redirect to dashboard on success
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login failed:', error);
      setErrorMessage(
        error.response?.data?.message || 'Invalid email or password. Please try again.'
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
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1600" 
            alt="Retail Supermarket" 
            className="object-cover w-full h-full opacity-60" 
          />
          <div className="absolute inset-0 bg-slate-900/50"></div>
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
            <ShieldCheck className="h-4 w-4" /> Enterprise-Grade Security
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-6 leading-tight">
            The intelligent operating system for modern retail.
          </h1>
          <p className="text-green-50 text-lg leading-relaxed drop-shadow-md">
            Manage your branches, sync inventory in real-time, and process transactions lightning-fast with the ultimate Commerce OS.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Secure Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative bg-slate-50 lg:bg-white">
        <div className="absolute inset-0 z-0 lg:hidden bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="w-full max-w-md relative z-10 bg-white lg:bg-transparent p-8 lg:p-0 rounded-3xl shadow-xl lg:shadow-none ring-1 ring-slate-900/5 lg:ring-0">
          
          <div className="flex lg:hidden justify-center mb-8">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-md ring-1 ring-slate-100">
              <img src="/SokoPoint POS Logo.png" alt="SokoPoint-POS Logo" className="h-10 w-auto object-contain" />
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Sign in to SokoPoint-POS</h2>
            <p className="text-slate-500">Enter your credentials to access your business workspace.</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white"
                  placeholder="admin@sokopoint.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                <a href="#" className="text-sm font-semibold text-green-600 hover:text-green-500">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white tracking-widest"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-green-600/25 text-base font-bold text-white bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in to Workspace <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center lg:text-left">
            <p className="text-sm text-slate-500">
              Need to register a new business?{' '}
              <a href="#" className="font-bold text-green-600 hover:text-green-500 transition-colors">Contact Sales</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}