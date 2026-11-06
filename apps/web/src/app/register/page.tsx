'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, Building2, User } from 'lucide-react';
import api from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    businessName: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Secure call to Express backend registration endpoint
      const response = await api.post('/auth/register', { 
        businessName: formData.businessName,
        fullName: formData.fullName,
        email: formData.email, 
        password: formData.password 
      });
      
      const responseBody = response.data;
      const token = responseBody?.data?.token || responseBody?.token;
      const user = responseBody?.data?.user || responseBody?.user;

      if (token && user) {
        // Automatically log the user in if the API returns auth credentials
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        router.push('/dashboard');
      } else {
        // Otherwise, show success and route to login
        setSuccessMessage('Business account created successfully! Redirecting to login...');
        setTimeout(() => router.push('/login'), 2000);
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      setErrorMessage(
        error.response?.data?.message || 'Failed to create business account. Please try again.'
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
            src="https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1600" 
            alt="Retail Store Warehouse" 
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
            <ShieldCheck className="h-4 w-4" /> Multi-Branch Architecture
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-6 leading-tight">
            Scale your retail business with precision.
          </h1>
          <p className="text-green-50 text-lg leading-relaxed drop-shadow-md">
            Join the modern commerce ecosystem. Centralize your inventory, automate procurement, and empower your cashiers today.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: Secure Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative bg-slate-50 lg:bg-white overflow-y-auto custom-scrollbar">
        <div className="absolute inset-0 z-0 lg:hidden bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="w-full max-w-md relative z-10 bg-white lg:bg-transparent p-8 lg:p-0 rounded-3xl shadow-xl lg:shadow-none ring-1 ring-slate-900/5 lg:ring-0 my-auto">
          
          <div className="flex lg:hidden justify-center mb-8">
            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-md ring-1 ring-slate-100">
              <img src="/SokoPoint POS Logo.png" alt="SokoPoint-POS Logo" className="h-10 w-auto object-contain" />
            </div>
          </div>

          <div className="text-center lg:text-left mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">Create an Account</h2>
            <p className="text-slate-500">Register your business to access the workspace.</p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white"
                    placeholder="e.g. SokoPoint Mart"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Admin Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white"
                    placeholder="Jane Doe"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white"
                  placeholder="admin@business.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white tracking-widest"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-green-600 focus:border-green-600 outline-none transition-all hover:bg-slate-100 focus:bg-white tracking-widest"
                  placeholder="••••••••••••"
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
                  Creating Account...
                </>
              ) : (
                <>
                  Register Workspace <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center lg:text-left">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-bold text-green-600 hover:text-green-500 transition-colors">
                Sign in to your workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}