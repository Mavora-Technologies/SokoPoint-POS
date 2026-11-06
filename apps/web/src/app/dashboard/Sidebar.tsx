'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, ShoppingBag, Users, Settings, LogOut, 
  Bell, Receipt, CreditCard, Scale, BarChart3, PieChart, 
  Bot, Clock, Inbox, MonitorSmartphone, Store, X, 
  Package
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  pathname: string;
  logout: () => void;
}

export default function Sidebar({ isSidebarOpen, setSidebarOpen, pathname, logout }: SidebarProps) {
  // Default to open if we are currently inside the inventory section
  const [procurementOpen, setProcurementOpen] = useState(pathname?.startsWith('/dashboard/inventory') || pathname?.startsWith('/dashboard/procurement') || pathname?.startsWith('/dashboard/purchas'));

  // Enterprise SVG Icons mapping exactly to the 14 sub-modules[cite: 3]
  const getIcon = (name: string) => {
    switch (name) {
      case 'Inventory Central': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
      case 'Stock Items Directory': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
      case 'Stock Movements': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
      case 'Physical Audits': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>;
      case 'Branch Transfers': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
      case 'Batches & Expirations': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
      case 'Reorder Suggestions': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
      case 'Wastage & Spoilage': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
      case 'Approved Suppliers': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
      case 'Purchase Requests': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
      case 'Purchase Orders': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>;
      case 'Goods Inward (GRN)': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>;
      case 'Supplier Invoices': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>;
      case 'Supplier Returns': return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>;
      default: return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5 mr-3" /> },
    { name: 'POS Terminal', href: '/dashboard/pos', icon: <MonitorSmartphone className="w-5 h-5 mr-3" /> },
    { name: 'SokoPoint AI Copilot', href: '/dashboard/ai', icon: <Bot className="w-5 h-5 mr-3" /> },
    { name: 'Sales Ledger', href: '/dashboard/sales', icon: <CreditCard className="w-5 h-5 mr-3" /> },
    { name: 'Orders', href: '/dashboard/orders', icon: <ShoppingBag className="w-5 h-5 mr-3" /> },
    { name: 'Credit & Tabs', href: '/dashboard/credit', icon: <Scale className="w-5 h-5 mr-3" /> },
    { name: 'Customers', href: '/dashboard/customers', icon: <Users className="w-5 h-5 mr-3" /> },
    { 
      name: 'Inventory & Procurement', 
      href: '/dashboard/inventory',
      icon: <svg className="w-5 h-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
      subItems: [
        { name: 'Inventory Central', href: '/dashboard/inventory' },
        { name: 'Stock Items Directory', href: '/dashboard/products' },
        { name: 'Stock Movements', href: '/dashboard/inventory/movements' },
        { name: 'Physical Audits', href: '/dashboard/inventory/audits' },
        { name: 'Branch Transfers', href: '/dashboard/inventory/transfers' },
        { name: 'Batches & Expirations', href: '/dashboard/inventory/batches' },
        { name: 'Reorder Suggestions', href: '/dashboard/inventory/reorder' },
        { name: 'Wastage & Spoilage', href: '/dashboard/inventory/wastage' },
        { name: 'Approved Suppliers', href: '/dashboard/suppliers' },
        { name: 'Purchase Requests', href: '/dashboard/procurement/requests' },
        { name: 'Purchase Orders', href: '/dashboard/purchasing' },
        { name: 'Goods Inward (GRN)', href: '/dashboard/procurement/grn' },
        { name: 'Supplier Invoices', href: '/dashboard/purchases' },
        { name: 'Supplier Returns', href: '/dashboard/procurement/returns' },
      ]
    },
    { name: 'Expenses', href: '/dashboard/expenses', icon: <Receipt className="w-5 h-5 mr-3" /> },
    { name: 'Analytics', href: '/dashboard/analytics', icon: <PieChart className="w-5 h-5 mr-3" /> },
    { name: 'Reports', href: '/dashboard/reports', icon: <BarChart3 className="w-5 h-5 mr-3" /> },
    { name: 'Shifts & Staff', href: '/dashboard/shifts', icon: <Clock className="w-5 h-5 mr-3" /> },
    { name: 'Cash Registers', href: '/dashboard/tills', icon: <Inbox className="w-5 h-5 mr-3" /> },
    { name: 'Branches', href: '/dashboard/branches', icon: <Store className="w-5 h-5 mr-3" /> },
    { name: 'Notifications', href: '/dashboard/notifications', icon: <Bell className="w-5 h-5 mr-3" /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <Settings className="w-5 h-5 mr-3" /> },
  ];

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 xl:w-72 bg-[#1b2a4a] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col shadow-2xl lg:shadow-none ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        <div className="flex h-16 xl:h-20 shrink-0 items-center justify-between px-4 xl:px-6 border-b border-gray-800/60">
          <div className="flex items-center min-w-0 gap-3">
            <div className="bg-white rounded-xl shadow-md p-1.5 flex items-center justify-center flex-shrink-0">
              <img 
                src="/SokoPoint POS Logo.png" 
                alt="SokoPoint-POS Logo" 
                className="h-6 xl:h-8 w-auto object-contain"
                suppressHydrationWarning
              />
            </div>
            <div>
              <span className="text-lg xl:text-xl font-bold tracking-tight truncate leading-tight block">SokoPoint-POS</span>
              <p className="text-[10px] text-blue-400 font-medium tracking-wide">● Enterprise Retail</p>
            </div>
          </div>
          
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && !item.subItems && pathname?.startsWith(`${item.href}`));
            const isProcurementGroup = item.name === 'Inventory & Procurement';
            const isChildActive = isProcurementGroup && item.subItems?.some(sub => pathname === sub.href);

            return (
              <div key={item.name}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (isProcurementGroup) {
                      e.preventDefault();
                      setProcurementOpen(!procurementOpen);
                    } else {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive || isChildActive
                      ? 'bg-blue-600 text-white shadow-md font-bold'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    {item.icon}
                    <span>{item.name}</span>
                  </div>
                  {item.subItems && (
                    <span className="text-[10px] text-gray-400 font-black">{procurementOpen ? '▼' : '▶'}</span>
                  )}
                </Link>

                {isProcurementGroup && item.subItems && procurementOpen && (
                  <div className="pl-6 py-2 space-y-1 border-l-2 border-gray-700/50 ml-5 mt-1.5 mb-3">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                            isSubActive 
                              ? 'bg-blue-500/20 text-blue-400 font-bold shadow-sm' 
                              : 'text-gray-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {getIcon(sub.name)}
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-800/60 bg-[#152138] shrink-0">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="mr-3 h-4 w-4 text-gray-400" /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}