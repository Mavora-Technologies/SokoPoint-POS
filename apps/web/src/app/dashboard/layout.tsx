'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, 
  Menu, Bell, Truck, Receipt, ClipboardList, Boxes,
  Tags, CreditCard, ShoppingCart, Scale, BarChart3, PieChart, 
  Bot, Clock, Inbox, MonitorSmartphone, Store
} from 'lucide-react';

// Master Navigation Array linking all your modules
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'POS Terminal', href: '/dashboard/pos', icon: MonitorSmartphone },
  { name: 'SokoPoint AI Copilot', href: '/dashboard/ai', icon: Bot },
  { name: 'Sales Ledger', href: '/dashboard/sales', icon: CreditCard },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Credit & Tabs', href: '/dashboard/credit', icon: Scale },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Categories', href: '/dashboard/categories', icon: Tags },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Truck },
  { name: 'Purchase Orders', href: '/dashboard/purchasing', icon: ClipboardList },
  { name: 'Purchase Invoices', href: '/dashboard/purchases', icon: ShoppingCart },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: PieChart },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Shifts & Staff', href: '/dashboard/shifts', icon: Clock },
  { name: 'Cash Registers', href: '/dashboard/tills', icon: Inbox },
  { name: 'Branches', href: '/dashboard/branches', icon: Store },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // DEV OVERRIDE: Force authenticated state so layout never bounces back
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    document.cookie = 'token=; path=/; max-age=0';
    router.push('/login');
  };

  const firstName = 'Valary';
  const lastName = 'Femy';
  const initials = 'VF';

  return (
    <div className="h-screen w-full bg-slate-50 flex overflow-hidden selection:bg-blue-900 selection:text-white">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-blue-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Blue Theme Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 xl:w-72 bg-blue-950 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="flex h-16 xl:h-20 shrink-0 items-center px-4 xl:px-6 border-b border-blue-900/50 bg-blue-900/20">
          <img 
            src="/SokoPoint POS Logo.png" 
            alt="SokoPoint-POS Logo" 
            className="h-6 xl:h-8 w-auto mr-2.5 shrink-0 object-contain"
            suppressHydrationWarning
          />
          <span className="text-lg xl:text-xl font-bold tracking-tight truncate">SokoPoint-POS</span>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar">
          <nav className="flex-1 space-y-1.5 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center rounded-xl px-3 py-2.5 text-sm xl:text-base font-medium transition-all active:scale-[0.98] ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20 ring-1 ring-white/10' 
                      : 'text-blue-200 hover:bg-blue-900/50 hover:text-white'
                  }`}
                >
                  <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-blue-400 group-hover:text-blue-200'}`} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        
        <div className="border-t border-blue-900/50 p-4 shrink-0 bg-blue-900/10">
          <button
            onClick={logout}
            className="group flex w-full items-center rounded-xl px-3.5 py-3 text-sm xl:text-base font-medium text-blue-300 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-[0.98]"
          >
            <LogOut className="mr-3 h-5 w-5 text-blue-400 group-hover:text-red-400 transition-colors shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-16 xl:h-20 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 xl:px-10 z-30 transition-all">
          <button
            type="button"
            className="text-gray-500 hover:text-blue-600 lg:hidden p-2 -ml-2 rounded-lg hover:bg-blue-50 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex flex-1 justify-end items-center gap-x-4 sm:gap-x-6">
            <Link href="/dashboard/notifications" className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors relative">
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </Link>
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />
            <div className="flex items-center gap-x-4 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 sm:h-9 sm:w-9 xl:h-10 xl:w-10 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-bold text-sm xl:text-base shadow-sm ring-2 ring-white">
                {initials}
              </div>
              <span className="hidden lg:flex lg:items-center text-sm xl:text-base font-semibold leading-6 text-gray-900">
                {firstName} {lastName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8 xl:p-10 relative w-full scroll-smooth">
          <div className="mx-auto w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}