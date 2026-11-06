'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, Bell } from 'lucide-react';
import Sidebar from './Sidebar'; // Fixed: Now uses a relative import

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ firstName: 'User', lastName: '', initials: 'U' });
  
  // SECURITY LOCK
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isSidebarOpen]);

  // STRICT CLIENT-SIDE AUTHENTICATION CHECK
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      logout();
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      const fName = parsed.firstName || 'User';
      const lName = parsed.lastName || '';
      setUser({
        firstName: fName,
        lastName: lName,
        initials: `${fName.charAt(0) || ''}${lName.charAt(0) || ''}`.toUpperCase() || 'U'
      });
      setIsAuthorized(true);
    } catch (e) {
      console.error('Failed to parse user data', e);
      logout();
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; max-age=0';
    router.replace('/login');
  };

  if (!isAuthorized) {
    return null; 
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden selection:bg-blue-900 selection:text-white">
      
      {/* Extracted Sidebar Component */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        pathname={pathname} 
        logout={logout} 
      />

      {/* Main Content & Header */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-16 xl:h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 xl:px-10 z-30 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-slate-500 hover:text-blue-600 lg:hidden p-2 -ml-2 rounded-lg hover:bg-blue-50 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="lg:hidden font-extrabold text-lg text-slate-900 truncate">
              SokoPoint
            </div>
          </div>
          
          <div className="flex flex-1 justify-end items-center gap-x-4 sm:gap-x-6">
            <Link href="/dashboard/notifications" className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors relative">
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-slate-200" aria-hidden="true" />
            <div className="flex items-center gap-x-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="h-9 w-9 xl:h-10 xl:w-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm xl:text-base shadow-sm ring-2 ring-white">
                {user.initials}
              </div>
              <span className="hidden lg:flex lg:items-center text-sm xl:text-base font-bold text-slate-900">
                {user.firstName} {user.lastName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 xl:p-10 relative w-full scroll-smooth">
          <div className="mx-auto w-full h-full max-w-[1920px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}