'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowRight, ShieldCheck, Mail, Lock, Building2, User, Home, Eye, EyeOff } from 'lucide-react';
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
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      const nameParts = formData.fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';

      const response = await api.post('/auth/register', { 
        businessName: formData.businessName.trim(),
        firstName,
        lastName,
        email: formData.email.toLowerCase().trim(), 
        password: formData.password 
      });
      
      const responseBody = response.data;
      const token = responseBody?.data?.token || responseBody?.token;
      const user = responseBody?.data?.user || responseBody?.user;

      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        router.push('/dashboard');
      } else {
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
    <div className="min-h-screen w-full flex bg-white font-sans selection:bg-[#366498] selection:text-white overflow-x-hidden">
      
      {/* LEFT PANEL */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#071321] overflow-hidden flex-col justify-between p-12 lg:p-16">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-85" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=1600')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#071321]/95 via-[#071321]/50 to-transparent"></div>

        <div className="relative z-10 flex items-center justify-between w-full">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="bg-white rounded-xl shadow-lg border border-white/20 p-1.5 flex items-center justify-center transition-transform group-hover:scale-105">
              <img src="/SokoPoint POS Logo.png" alt="Logo" className="h-10 w-auto object-contain mix-blend-multiply contrast-125" />
            </div>
            <span className="text-white text-2xl font-black tracking-tight drop-shadow-md">SokoPoint-POS</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-xl space-y-4 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#62C02A]/20 border border-[#62C02A]/40 text-[#62C02A] text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="h-4 w-4" /> Multi-Branch Architecture
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-md">
            Scale your retail business with precision.
          </h2>
          <p className="text-[#8BCBF0] text-sm leading-relaxed drop-shadow-md font-medium">
            Join the modern commerce ecosystem. Centralize your inventory, automate procurement, and empower your cashiers today.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative bg-white overflow-y-auto">
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
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create an Account</h1>
            <p className="text-sm text-gray-500 font-medium">Register to access your enterprise workspace.</p>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-xs font-semibold">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="text" required name="businessName" value={formData.businessName} onChange={handleChange} 
                    className="w-full pl-10 pr-4 py-3 bg-[#8BCBF0]/10 border border-[#8BCBF0]/30 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#366498] focus:border-[#366498] outline-none transition-all shadow-sm" 
                    placeholder="e.g. SokoPoint Mart" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Admin Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="text" required name="fullName" value={formData.fullName} onChange={handleChange} 
                    className="w-full pl-10 pr-4 py-3 bg-[#8BCBF0]/10 border border-[#8BCBF0]/30 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#366498] focus:border-[#366498] outline-none transition-all shadow-sm" 
                    placeholder="Jane Doe" 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="email" required name="email" value={formData.email} onChange={handleChange} 
                  className="w-full pl-10 pr-4 py-3 bg-[#8BCBF0]/10 border border-[#8BCBF0]/30 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#366498] focus:border-[#366498] outline-none transition-all shadow-sm" 
                  placeholder="admin@business.com" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required name="password" value={formData.password} onChange={handleChange} 
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

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  required name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} 
                  className="w-full pl-10 pr-12 py-3 bg-[#8BCBF0]/10 border border-[#8BCBF0]/30 rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#366498] focus:border-[#366498] outline-none transition-all shadow-sm tracking-widest" 
                  placeholder="••••••••••••" 
                />
                <button 
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-[13px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !!successMessage}
              className="w-full bg-[#366498] hover:bg-[#2a4d75] text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-[#366498]/20 transition-all disabled:opacity-70 mt-2 flex justify-center items-center gap-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 text-white" />
                  Creating Account...
                </>
              ) : (
                <>
                  Register Workspace <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6 text-sm text-gray-600 font-medium border-t border-gray-100 pt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#62C02A] font-bold hover:underline transition-colors">
              Sign in to your workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}