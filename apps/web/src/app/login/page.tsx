'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, Home, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.trim() === '') {
      setErrorMessage('Password cannot be empty.');
      return;
    }

    setIsLoading(true);

    try {
      const sanitizedEmail = email.toLowerCase().trim();
      const response = await api.post('/auth/login', { email: sanitizedEmail, password });
      
      const responseBody = response.data;
      const token = responseBody?.data?.token || responseBody?.token;
      const user = responseBody?.data?.user || responseBody?.user;

      if (!token) {
        setErrorMessage('Authentication failed: Missing token.');
        setIsLoading(false);
        return;
      }

      // 1. Save to LocalStorage for Client-Side Retrieval
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // 2. VERY IMPORTANT: Securely Bake the Cookie for Cloudflare Edge Middleware!
      const isSecure = window.location.protocol === 'https:' ? 'Secure;' : '';
      document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax; ${isSecure}`;

      // 3. Strict Role-Based Redirection matching user specifications
      const userRole = (user?.role || '').toLowerCase();
      let defaultRedirect = '/dashboard';

      if (userRole === 'cashier') {
        defaultRedirect = '/dashboard/pos'; // Cashier lands on POS
      } else if (userRole === 'manager') {
        defaultRedirect = '/dashboard/inventory'; // Managers land on Inventory
      } else {
        // Admins and others see the full Dashboard
        defaultRedirect = '/dashboard';
      }

      const redirectTo = searchParams?.get('redirect_to') || defaultRedirect;
      router.push(redirectTo);
      
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
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-[#366498] selection:text-white overflow-x-hidden relative">
      
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#071321] overflow-hidden flex-col justify-between p-12 lg:p-16 pt-24">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-85" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1600')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071321]/95 via-[#071321]/50 to-transparent"></div>

        <div className="relative z-10 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="bg-white rounded-xl shadow-lg border border-white/20 p-1.5 flex items-center justify-center transition-transform group-hover:scale-105">
              <img 
                src="/SokoPoint POS Logo.png" 
                alt="SokoPoint-POS Logo" 
                className="h-10 w-auto object-contain mix-blend-multiply contrast-125"
              />
            </div>
            <span className="text-white text-2xl font-black tracking-tight drop-shadow-md">
              SokoPoint-POS
            </span>
          </Link>
        </div>

        <div className="relative z-10 max-w-xl space-y-4 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#62C02A]/20 border border-[#62C02A]/40 text-[#62C02A] text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="h-4 w-4" /> Enterprise-Grade Security
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-md">
            The intelligent operating system for modern retail.
          </h2>
          <p className="text-gray-200 text-sm lg:text-base leading-relaxed font-normal drop-shadow-sm">
            Manage your branches, sync inventory in real-time, and process transactions lightning-fast with strict role-based access.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-white pt-24">
        <div className="w-full max-w-md space-y-8 relative z-10 my-auto">
          
          <div className="flex justify-between items-start">
            <div className="flex lg:hidden h-14 w-14 bg-white rounded-xl border border-gray-100 items-center justify-center shadow-sm">
              <img src="/SokoPoint POS Logo.png" alt="SokoPoint-POS Logo" className="h-8 w-auto object-contain" />
            </div>
            <Link href="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg text-xs font-bold transition-all border border-gray-100 ml-auto lg:ml-0">
              <Home className="h-3.5 w-3.5" /> Back to Homepage
            </Link>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sign in to SokoPoint-POS</h1>
            <p className="text-sm text-gray-500 font-medium">Enter your secure credentials to access your workspace.</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold shadow-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full pl-10 pr-4 py-3 bg-[#8BCBF0]/10 border border-[#8BCBF0]/30 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#366498] focus:border-[#366498] outline-none transition-all shadow-sm" 
                  placeholder="admin@business.com" 
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-bold text-[#62C02A] hover:text-[#57ad25] hover:underline transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full pl-10 pr-12 py-3 bg-[#8BCBF0]/10 border border-[#8BCBF0]/30 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#366498] focus:border-[#366498] outline-none transition-all shadow-sm tracking-widest" 
                  placeholder="••••••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-[13px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full bg-[#366498] hover:bg-[#2a4d75] text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-[#366498]/20 transition-all disabled:opacity-70 mt-4 flex justify-center items-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 text-white" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign in to Workspace <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-600 font-medium border-t border-gray-100 pt-6">
            Need to register a new business?{' '}
            <Link href="/register" className="text-[#62C02A] font-bold hover:underline transition-colors">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}