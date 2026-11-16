'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from './Sidebar';
import { ShoppingBag, ChevronDown, Bell, Store, HelpCircle, LogOut, KeyRound, UserCog, X, Building2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sokopoint.vercel.app';

// --- GLOBAL FETCH INTERCEPTOR (Restored from your logic) ---
if (typeof window !== 'undefined' && !(window as any).__fetchIntercepted) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    const urlString = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
    
    if (urlString.includes('/api/') || urlString.includes(API_URL.replace('https://', '').replace('http://', ''))) {
      const token = localStorage.getItem('token');
      const tenantId = localStorage.getItem('tenantId') || '1';

      config = config || {};
      const newHeaders = new Headers(config.headers || {});
      
      if (token && !newHeaders.has('Authorization')) {
        newHeaders.set('Authorization', `Bearer ${token}`);
      }
      if (!newHeaders.has('x-tenant-id')) {
        newHeaders.set('x-tenant-id', tenantId);
      }
      config.headers = newHeaders;
    }
    return originalFetch(resource, config);
  };
  (window as any).__fetchIntercepted = true;
}

interface AuthProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  branchName: string;
  branchId?: string;
  tenantId?: string;
  businessName?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // Layout State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Dynamic Auth State
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthProfile | null>(null);
  const [userInitials, setUserInitials] = useState<string>('--');

  // Dynamic Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [nameData, setNameData] = useState({ firstName: '', lastName: '' });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.replace('/login');
  };

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen || mobileMenuOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen, mobileMenuOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- DYNAMIC SESSION HYDRATION ---
  useEffect(() => {
    const fetchActiveSession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { handleLogout(); return; }

        const cachedUserStr = localStorage.getItem('user');
        let userData: AuthProfile | null = null;

        if (cachedUserStr) {
          try { 
            const parsed = JSON.parse(cachedUserStr);
            userData = {
              id: parsed.id,
              firstName: parsed.firstName || parsed.name?.split(' ')[0] || 'User',
              lastName: parsed.lastName || parsed.name?.split(' ').slice(1).join(' ') || '',
              email: parsed.email || '',
              role: parsed.role || 'ADMIN',
              branchName: parsed.branchName || 'Main Branch',
              businessName: parsed.businessName || 'SokoPoint POS',
              tenantId: parsed.tenantId,
              branchId: parsed.branchId
            };
          } catch (e) {}
        }

        if (!userData) {
          setAuthError("Unable to verify secure session. Please sign in again.");
          setTimeout(handleLogout, 2000);
          return;
        }
        
        setUser(userData);
        setUserInitials(`${userData.firstName.charAt(0)}${userData.lastName ? userData.lastName.charAt(0) : ''}`.toUpperCase());
      } catch (error: any) {
        handleLogout();
      } finally {
        setLoadingAuth(false);
      }
    };

    fetchActiveSession();
  }, [router]);

  // --- DYNAMIC MUTATIONS ---
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(''); setModalSuccess('');
    
    if (pwdData.newPassword !== pwdData.confirmPassword) {
      setModalError('New passwords do not match.');
      return;
    }
    if (pwdData.newPassword.length < 6) {
      setModalError('New password must be at least 6 characters long.');
      return;
    }

    setModalLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdData.currentPassword, newPassword: pwdData.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update password');
      
      setModalSuccess('Password successfully updated!');
      setTimeout(() => { setIsPasswordModalOpen(false); }, 2000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(''); setModalSuccess('');
    setModalLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/update-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: nameData.firstName, lastName: nameData.lastName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to update profile');
      
      const fName = nameData.firstName.trim();
      const lName = nameData.lastName.trim();
      setUserInitials(`${fName.charAt(0)}${lName ? lName.charAt(0) : ''}`.toUpperCase());

      if (user) {
        const updatedProfile = { ...user, firstName: fName, lastName: lName };
        setUser(updatedProfile);
        localStorage.setItem('user', JSON.stringify(updatedProfile));
      }

      setModalSuccess('Profile name successfully updated!');
      setTimeout(() => { setIsNameModalOpen(false); }, 2000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Executive Dashboard';
    const segments = pathname.split('/');
    const lastSegment = segments[segments.length - 1];
    return lastSegment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loadingAuth || authError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-5 w-full">
        {!authError ? (
          <>
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin shadow-sm"></div>
            <p className="text-slate-600 font-bold text-sm tracking-wide">Securing Workspace...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl font-bold">!</div>
            <p className="text-red-600 font-bold text-sm tracking-wide">{authError}</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden selection:bg-blue-900 selection:text-white font-sans text-slate-900">
      
      <Sidebar 
        isSidebarOpen={isSidebarOpen || mobileMenuOpen} 
        setSidebarOpen={mobileMenuOpen ? setMobileMenuOpen : setSidebarOpen} 
        pathname={pathname} 
        logout={handleLogout} 
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0 transition-all duration-300">
        <header className="flex h-16 xl:h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 xl:px-10 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button type="button" className="text-slate-500 hover:text-blue-600 lg:hidden p-2 -ml-2 rounded-xl hover:bg-blue-50 transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="hidden md:block text-lg xl:text-xl font-extrabold text-slate-900 truncate">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex flex-1 justify-end items-center gap-3 sm:gap-5 xl:gap-6">
            <Link href="/dashboard/pos" className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 xl:px-5 xl:py-2.5 rounded-full font-bold text-sm xl:text-base transition-colors shadow-sm">
              <ShoppingBag className="w-4 h-4 xl:w-5 xl:h-5" /> Open POS
            </Link>

            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-slate-50 text-slate-700 cursor-default">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Store className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold truncate max-w-[120px] xl:max-w-[200px]">{user?.branchName}</span>
            </div>

            <button className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors relative">
              <Bell className="h-5 w-5 xl:h-6 xl:w-6" />
              <span className="absolute top-1.5 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="hidden lg:block h-6 w-px bg-slate-200" aria-hidden="true" />
            
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-3 pl-1 pr-2 py-1 border-2 border-transparent hover:border-slate-100 rounded-full transition-all focus:outline-none">
                <div className="h-9 w-9 xl:h-10 xl:w-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm xl:text-base shadow-sm ring-2 ring-white shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col items-start mr-1">
                  <span className="text-sm font-bold text-slate-900 leading-none">{user?.firstName}</span>
                  <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{user?.role}</span>
                </div>
                <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5 truncate">{user?.email}</p>
                    <div className="mt-2 inline-flex">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded uppercase tracking-wider">
                        {user?.role}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-2 flex flex-col gap-1">
                    <button onClick={() => { setIsNameModalOpen(true); setUserMenuOpen(false); setNameData({ firstName: user?.firstName || '', lastName: user?.lastName || '' }); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                      <UserCog className="w-4 h-4 text-slate-400" /> Edit Profile
                    </button>
                    <button onClick={() => { setIsPasswordModalOpen(true); setUserMenuOpen(false); setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setModalError(''); setModalSuccess(''); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                      <KeyRound className="w-4 h-4 text-slate-400" /> Change Password
                    </button>
                    <Link href="/dashboard/support" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                      <HelpCircle className="w-4 h-4 text-slate-400" /> Support & Docs
                    </Link>
                  </div>
                  
                  <div className="p-2 border-t border-slate-100 bg-red-50/30">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 xl:p-10 relative w-full scroll-smooth">
          <div className="mx-auto w-full h-full max-w-[1920px]">
            {children}
          </div>
        </main>
      </div>

      {/* --- REAL DYNAMIC EDIT PROFILE MODAL --- */}
      {isNameModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <form onSubmit={handleNameChange} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden slide-in-from-bottom-4 animate-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Update Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage your personal details.</p>
              </div>
              <button type="button" onClick={() => setIsNameModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100">{modalError}</div>}
              {modalSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">{modalSuccess}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name</label>
                  <input required type="text" value={nameData.firstName} onChange={e => setNameData({...nameData, firstName: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
                  <input required type="text" value={nameData.lastName} onChange={e => setNameData({...nameData, lastName: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex justify-between">
                  <span>Work Email</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase bg-slate-100 px-2 py-0.5 rounded">Locked</span>
                </label>
                <input type="email" value={user?.email} disabled className="w-full border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-medium outline-none" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsNameModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" disabled={modalLoading || !!modalSuccess} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-colors">
                {modalLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- REAL DYNAMIC CHANGE PASSWORD MODAL --- */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden slide-in-from-bottom-4 animate-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Secure your SokoPoint account.</p>
              </div>
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {modalError && <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100">{modalError}</div>}
              {modalSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100">{modalSuccess}</div>}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                <input required type="password" value={pwdData.currentPassword} onChange={e => setPwdData({...pwdData, currentPassword: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <input required type="password" value={pwdData.newPassword} onChange={e => setPwdData({...pwdData, newPassword: e.target.value})} placeholder="Min 6 characters" className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input required type="password" value={pwdData.confirmPassword} onChange={e => setPwdData({...pwdData, confirmPassword: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" disabled={modalLoading || !!modalSuccess} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-colors">
                {modalLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}