'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from './Sidebar';
import { 
  Menu, Bell, ShoppingBag, Store, ChevronDown, 
  UserCog, KeyRound, HelpCircle, LogOut, X, Building2 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sokopoint.vercel.app';

if (typeof window !== 'undefined' && !(window as any).__sokoFetchIntercepted) {
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
  (window as any).__sokoFetchIntercepted = true;
}

interface SokoProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
  role?: string;
  branchName?: string;
  tenantId?: string;
  businessName?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<SokoProfile | null>(null);
  const [userInitials, setUserInitials] = useState<string>('--');
  
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const [pwdData, setPwdData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [nameData, setNameData] = useState({ firstName: '', lastName: '' });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isSidebarOpen]);

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { handleLogout(); return; }

        document.cookie = `token=${token}; path=/; max-age=604800; SameSite=Lax; ${window.location.protocol === 'https:' ? 'Secure' : ''}`;

        const cachedUserStr = localStorage.getItem('user');
        let userData: SokoProfile | null = null;

        if (cachedUserStr) {
          try { userData = JSON.parse(cachedUserStr); } catch (e) {}
        }

        try {
          const res = await fetch(`${API_URL}/api/v1/auth/me`);
          if (res.ok) {
            const freshData = await res.json();
            userData = { ...userData, ...freshData.data };
            localStorage.setItem('user', JSON.stringify(userData));
          } else if (res.status === 401 || res.status === 403) {
            handleLogout(); 
            return;
          }
        } catch (fetchErr) {
          console.warn("Network error verifying session, relying on cache.");
        }

        if (!userData) {
          setAuthError("Session expired. Please sign in again.");
          setTimeout(handleLogout, 2000);
          return;
        }
        
        if (isMounted) {
          setProfile(userData);
          const fName = userData.firstName || (userData.name ? userData.name.split(' ')[0] : 'User');
          const lName = userData.lastName || (userData.name ? userData.name.split(' ').slice(1).join(' ') : '');
          setUserInitials(`${fName.charAt(0)}${lName ? lName.charAt(0) : ''}`.toUpperCase());
        }
      } catch (error) {
        handleLogout();
      } finally {
        if (isMounted) setLoadingAuth(false);
      }
    };

    verifySession();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenantId');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.replace('/login');
  };

  const getPageTitle = () => {
    if (!pathname || pathname === '/dashboard') return 'Executive Overview';
    const segments = pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    return last ? last.replace(/-/g, ' ') : 'Dashboard';
  };

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
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      
      setModalSuccess('Password securely updated!');
      setTimeout(() => setIsPasswordModalOpen(false), 2000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');
      
      const fName = nameData.firstName.trim();
      const lName = nameData.lastName.trim();
      
      if (profile) {
        const updatedProfile = { ...profile, firstName: fName, lastName: lName, name: `${fName} ${lName}` };
        setProfile(updatedProfile);
        localStorage.setItem('user', JSON.stringify(updatedProfile));
        setUserInitials(`${fName.charAt(0)}${lName ? lName.charAt(0) : ''}`.toUpperCase());
      }

      setModalSuccess('Profile successfully updated!');
      setTimeout(() => setIsProfileModalOpen(false), 2000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  };

  if (loadingAuth || authError) {
    return (
      <div className="h-screen w-full bg-[#f8fafc] flex items-center justify-center flex-col gap-4">
        {!authError ? (
          <>
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
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

  const safeRole = profile?.role ? String(profile.role).toLowerCase() : 'cashier';
  const displayRole = profile?.role ? String(profile.role).toUpperCase().replace(/_/g, ' ') : 'CASHIER';
  const displayName = profile?.firstName || (profile?.name ? profile.name.split(' ')[0] : 'User');
  const displayFullName = profile?.name || `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || 'User';
  const displayBranch = profile?.businessName 
    ? `${profile.businessName} - ${profile?.branchName || 'Main Branch'}` 
    : (profile?.branchName || 'Main Branch');

  return (
    <div className="h-screen w-full bg-[#f8fafc] flex overflow-hidden selection:bg-blue-900 selection:text-white font-sans text-slate-900">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}

      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        pathname={pathname} 
        logout={handleLogout} 
        userRole={safeRole}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0 transition-all duration-300">
        
        {/* Dynamic Header */}
        <header className="flex h-16 xl:h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="hidden md:block text-lg xl:text-xl font-extrabold text-slate-900 capitalize truncate">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex flex-1 justify-end items-center gap-4 sm:gap-5">
            
            <Link href="/dashboard/pos" className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-md shadow-blue-500/20">
              <ShoppingBag className="w-4 h-4" /> Open POS
            </Link>

            <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-default shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Store className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold truncate max-w-[250px]">{displayBranch}</span>
              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
            </div>

            <button className="relative p-2 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            <div className="hidden lg:block h-8 w-px bg-slate-200 mx-1" aria-hidden="true" />
            
            <div className="relative" ref={userMenuRef}>
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)} 
                className="flex items-center gap-3 pl-1 pr-2 py-1.5 border-2 border-transparent hover:border-slate-100 rounded-xl transition-all focus:outline-none"
              >
                <div className="h-10 w-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                  {userInitials}
                </div>
                <div className="hidden sm:flex flex-col items-start mr-1">
                  <span className="text-sm font-extrabold text-slate-900 leading-none">{displayName}</span>
                  <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{displayRole}</span>
                </div>
                <ChevronDown className="hidden sm:block w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-sm font-extrabold text-slate-900 truncate">{displayFullName}</p>
                    <p className="text-xs font-medium text-slate-500 mt-1 truncate">{profile?.email}</p>
                    <div className="mt-3 inline-flex">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded uppercase tracking-wider">
                        {displayRole}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-3 flex flex-col gap-1">
                    {safeRole !== 'cashier' && (
                      <>
                        <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                          <Building2 className="w-4 h-4 text-slate-400" /> Business Profile
                        </Link>
                        <Link href="/dashboard/settings/branches" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                          <Store className="w-4 h-4 text-slate-400" /> Locations & Outlets
                        </Link>
                        <div className="h-px bg-slate-100 my-1"></div>
                      </>
                    )}
                    
                    <button 
                      onClick={() => { 
                        setIsPasswordModalOpen(true); 
                        setUserMenuOpen(false);
                        setModalError(''); setModalSuccess('');
                        setPwdData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      }} 
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-slate-400" /> Change Password
                    </button>
                    
                    <button 
                      onClick={() => { 
                        setIsProfileModalOpen(true); 
                        setUserMenuOpen(false);
                        setModalError(''); setModalSuccess('');
                        setNameData({ 
                          firstName: profile?.firstName || (profile?.name ? profile.name.split(' ')[0] : ''), 
                          lastName: profile?.lastName || (profile?.name ? profile.name.split(' ').slice(1).join(' ') : '') 
                        });
                      }} 
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <UserCog className="w-4 h-4 text-slate-400" /> Change Name & Username
                    </button>
                    
                    <Link href="/dashboard/support" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                      <HelpCircle className="w-4 h-4 text-slate-400" /> Documentation & Support
                    </Link>
                  </div>
                  
                  <div className="p-3 border-t border-slate-100 bg-red-50/30">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                      <LogOut className="w-4 h-4 text-red-500" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 sm:p-6 lg:p-8 relative w-full scroll-smooth">
          <div className="mx-auto w-full h-full max-w-[1920px]">
            {children}
          </div>
        </main>
      </div>

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <form onSubmit={handleProfileUpdate} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden slide-in-from-bottom-4 animate-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Change Name & Username</h3>
                <p className="text-xs text-slate-500 mt-0.5">Update how you appear across the system.</p>
              </div>
              <button type="button" onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-200 transition-colors">
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
                <input type="email" value={profile?.email || ''} disabled className="w-full border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed px-4 py-2.5 rounded-xl text-sm font-medium outline-none" />
                <p className="text-[10px] text-slate-400 mt-1.5">Email addresses are locked to your enterprise directory.</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" disabled={modalLoading || !!modalSuccess} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50">
                {modalLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden slide-in-from-bottom-4 animate-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Secure your SokoPoint account credentials.</p>
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
                <input required type="password" value={pwdData.currentPassword} onChange={e => setPwdData({...pwdData, currentPassword: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" placeholder="Enter current password" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                <input required type="password" value={pwdData.newPassword} onChange={e => setPwdData({...pwdData, newPassword: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" placeholder="Min 6 characters" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input required type="password" value={pwdData.confirmPassword} onChange={e => setPwdData({...pwdData, confirmPassword: e.target.value})} className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600" placeholder="Retype new password" />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition-colors">Cancel</button>
              <button type="submit" disabled={modalLoading || !!modalSuccess} className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50">
                {modalLoading ? 'Updating...' : 'Save Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}