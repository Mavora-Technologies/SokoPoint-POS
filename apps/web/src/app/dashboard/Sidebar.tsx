'use client';

import Link from 'next/link';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, 
  Menu, Bell, Truck, Receipt, ClipboardList, Boxes,
  Tags, CreditCard, ShoppingCart, Scale, BarChart3, PieChart, 
  Bot, Clock, Inbox, MonitorSmartphone, Store, X
} from 'lucide-react';

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

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  pathname: string;
  logout: () => void;
}

export default function Sidebar({ isSidebarOpen, setSidebarOpen, pathname, logout }: SidebarProps) {
  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 xl:w-72 bg-blue-950 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="flex h-16 xl:h-20 shrink-0 items-center justify-between px-4 xl:px-6 border-b border-blue-900/50 bg-blue-900/20">
          <div className="flex items-center min-w-0">
            <img 
              src="/SokoPoint POS Logo.png" 
              alt="SokoPoint-POS Logo" 
              className="h-6 xl:h-8 w-auto mr-2.5 shrink-0 object-contain"
              suppressHydrationWarning
            />
            <span className="text-lg xl:text-xl font-bold tracking-tight truncate">SokoPoint-POS</span>
          </div>
          
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 text-blue-300 hover:text-white hover:bg-blue-900/50 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain custom-scrollbar">
          <nav className="flex-1 space-y-1.5 px-3 py-6">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center rounded-xl px-3 py-3 lg:py-2.5 text-base font-medium transition-all active:scale-[0.98] ${
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
        
        <div className="border-t border-blue-900/50 p-4 shrink-0 bg-blue-900/10 mb-safe">
          <button
            onClick={logout}
            className="group flex w-full items-center rounded-xl px-3.5 py-3 text-base font-medium text-blue-300 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-[0.98]"
          >
            <LogOut className="mr-3 h-5 w-5 text-blue-400 group-hover:text-red-400 transition-colors shrink-0" />
            <span className="truncate">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}