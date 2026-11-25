'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  MonitorSmartphone,
  ShoppingBag,
  Users,
  Settings2,
  LogOut,
  Bell,
  Receipt,
  CreditCard,
  Scale,
  BarChart4,
  PieChart,
  TrendingUp,
  Bot,
  Sparkles,
  BrainCircuit,
  Inbox,
  Store,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  UserCheck,
  ShieldCheck,
  CalendarClock,
  Fingerprint,
  ClipboardList,
  Wallet,
  Boxes,
  Activity,
  FileText,
  FileSpreadsheet,
  Banknote,
  Landmark,
  Calculator,
  RefreshCcw,
  DownloadCloud,
  Tag,
  Barcode,
  Layers,
  Truck,
  ArrowLeftRight,
  AlertTriangle,
  Award,
  Contact2,
  Warehouse,
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setSidebarOpen: (isOpen: boolean) => void;
  pathname: string;
  logout: () => void;
  userRole?: string;
  businessName?: string;
  branchName?: string;
}

interface SubNavItem {
  name: string;
  href: string;
}

interface SubGroup {
  name: string;
  items: SubNavItem[];
}

interface NavModule {
  name: string;
  href?: string;
  subItems?: SubNavItem[];
  subGroups?: SubGroup[];
  allowedRoles?: string[];
}

interface SidebarSegment {
  header: string;
  modules: NavModule[];
}

const SIDEBAR_SEGMENTS: SidebarSegment[] = [
  {
    header: 'RETAIL, SUPERMARKET & WHOLESALE',
    modules: [
      { name: 'Overview Dashboard', href: '/dashboard' },
      { name: 'POS Terminal', href: '/dashboard/pos' },
      {
        name: 'Sales & Wholesale',
        subItems: [
          { name: 'Sales Ledger', href: '/dashboard/sales' },
          { name: 'Retail & POS Orders', href: '/dashboard/orders' },
          { name: 'Wholesale Orders', href: '/dashboard/wholesale' },
          { name: 'Quotations & Invoices', href: '/dashboard/quotations' },
          { name: 'Returns & Refunds', href: '/dashboard/returns' },
        ],
      },
      {
        name: 'Customers & Credit',
        subItems: [
          { name: 'Customer Directory', href: '/dashboard/customers' },
          { name: 'Credit Accounts & Tabs', href: '/dashboard/credit' },
          { name: 'Loyalty & Rewards', href: '/dashboard/loyalty' },
        ],
      },
    ],
  },
  {
    header: 'CATALOGUE, INVENTORY & SUPPLY CHAIN',
    modules: [
      {
        name: 'Product Catalogue',
        allowedRoles: [
          'BUSINESS_OWNER',
          'BUSINESS_ADMIN',
          'ADMIN',
          'BRANCH_MANAGER',
          'MANAGER',
          'INVENTORY_MANAGER',
          'WHOLESALE_MANAGER',
        ],
        subItems: [
          { name: 'Products & SKUs', href: '/dashboard/products' },
          { name: 'Categories & Brands', href: '/dashboard/categories' },
          { name: 'Barcodes & Labels', href: '/dashboard/barcodes' },
          { name: 'Price Lists & Promotions', href: '/dashboard/pricing' },
        ],
      },
      {
        name: 'Inventory & Warehouses',
        allowedRoles: [
          'BUSINESS_OWNER',
          'BUSINESS_ADMIN',
          'ADMIN',
          'BRANCH_MANAGER',
          'MANAGER',
          'INVENTORY_MANAGER',
          'WAREHOUSE_MANAGER',
          'PROCUREMENT_OFFICER',
        ],
        subItems: [
          { name: 'Inventory Central', href: '/dashboard/inventory' },
          { name: 'Stock Movements & Bin Cards', href: '/dashboard/inventory/movements' },
          { name: 'Physical Stock Audits', href: '/dashboard/inventory/audits' },
          { name: 'Inter-Branch Transfers', href: '/dashboard/inventory/transfers' },
          { name: 'Reorder Suggestions', href: '/dashboard/inventory/procurement/reorder' },
          { name: 'Wastage & Write-Offs', href: '/dashboard/inventory/procurement/wastage' },
        ],
        subGroups: [
          {
            name: 'Procurement & Vendors',
            items: [
              { name: 'Supplier Directory', href: '/dashboard/inventory/procurement/suppliers' },
              { name: 'Purchase Requisitions', href: '/dashboard/inventory/procurement/requests' },
              { name: 'Purchase Orders (PO)', href: '/dashboard/inventory/procurement/orders' },
              { name: 'Goods Received (GRN)', href: '/dashboard/inventory/procurement/grn' },
              { name: 'Supplier Invoices', href: '/dashboard/inventory/procurement/invoices' },
              { name: 'Vendor Returns', href: '/dashboard/inventory/procurement/returns' },
            ],
          },
        ],
      },
    ],
  },
  {
    header: 'FINANCE, TREASURY & ANALYTICS',
    modules: [
      {
        name: 'Treasury & Payments',
        allowedRoles: [
          'BUSINESS_OWNER',
          'BUSINESS_ADMIN',
          'ADMIN',
          'BRANCH_MANAGER',
          'MANAGER',
          'ACCOUNTANT',
        ],
        subItems: [
          { name: 'Cash Registers & Tills', href: '/dashboard/tills' },
          { name: 'M-Pesa & Digital Payments', href: '/dashboard/payments/mpesa' },
          { name: 'Bank Reconciliation', href: '/dashboard/payments/reconciliation' },
          { name: 'Operational Expenses', href: '/dashboard/expenses' },
          { name: 'Tax & KRA eTIMS', href: '/dashboard/payments/etims' },
        ],
      },
      {
        name: 'Executive Analytics & BI',
        allowedRoles: [
          'BUSINESS_OWNER',
          'BUSINESS_ADMIN',
          'ADMIN',
          'BRANCH_MANAGER',
          'MANAGER',
          'ACCOUNTANT',
          'AUDITOR',
        ],
        subItems: [
          { name: 'Analytics Control Tower', href: '/dashboard/analytics' },
          { name: 'Sales & Revenue Reports', href: '/dashboard/reports' },
          { name: 'Product Margin Analysis', href: '/dashboard/analytics/margins' },
          { name: 'Inventory Valuation', href: '/dashboard/analytics/inventory' },
          { name: 'Report Exports', href: '/dashboard/analytics/export' },
        ],
      },
    ],
  },
  {
    header: 'SOKOPOINT INTELLIGENCE AI',
    modules: [
      {
        name: 'SokoPoint Intelligence AI',
        allowedRoles: [
          'BUSINESS_OWNER',
          'BUSINESS_ADMIN',
          'ADMIN',
          'BRANCH_MANAGER',
          'MANAGER',
          'INVENTORY_MANAGER',
        ],
        subItems: [
          { name: 'AI Business Copilot', href: '/dashboard/ai' },
          { name: 'Demand & Reorder Forecast', href: '/dashboard/ai/forecasting' },
          { name: 'Slow-Mover & Anomaly Alerts', href: '/dashboard/ai/anomalies' },
        ],
      },
    ],
  },
  {
    header: 'HUMAN CAPITAL & SYSTEM SETTINGS',
    modules: [
      {
        name: 'Staff & Shift Management',
        allowedRoles: ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'MANAGER'],
        subItems: [
          { name: 'Employee Directory & Roster', href: '/dashboard/staff/employees' },
          { name: 'Role-Based Access Control', href: '/dashboard/staff/roles' },
          { name: 'Weekly Shift Schedule', href: '/dashboard/staff/planner' },
          { name: 'Biometric Clock-In', href: '/dashboard/staff/attendance' },
          { name: 'Shift Handover Notes', href: '/dashboard/staff/handovers' },
          { name: 'Cash Drawer Custodians', href: '/dashboard/staff/cash-drawers' },
          { name: 'Cashier Performance Metrics', href: '/dashboard/staff/performance' },
        ],
      },
      {
        name: 'Branches & Warehouses',
        href: '/dashboard/settings/branches',
        allowedRoles: ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'ADMIN'],
      },
      { name: 'Notifications', href: '/dashboard/notifications' },
      {
        name: 'Audit Log & Security',
        href: '/dashboard/audit',
        allowedRoles: ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'ADMIN', 'AUDITOR'],
      },
      {
        name: 'Organization & Settings',
        href: '/dashboard/settings',
        allowedRoles: ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'ADMIN'],
      },
    ],
  },
];

export default function Sidebar({
  isSidebarOpen,
  setSidebarOpen,
  pathname,
  logout,
  userRole = 'CASHIER',
  businessName = 'SokoPoint-POS',
  branchName = 'Enterprise Retail',
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    'Procurement & Vendors': true,
  });

  const toggleModule = (moduleName: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenModules((prev) => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  const toggleGroup = (groupName: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupName]: !(prev[groupName] ?? true) }));
  };

  const getMainIcon = (name: string) => {
    switch (name) {
      case 'Overview Dashboard':
        return <LayoutDashboard className="w-5 h-5 shrink-0" />;
      case 'POS Terminal':
        return <MonitorSmartphone className="w-5 h-5 shrink-0" />;
      case 'Sales & Wholesale':
        return <ShoppingBag className="w-5 h-5 shrink-0" />;
      case 'Customers & Credit':
        return <Users className="w-5 h-5 shrink-0" />;
      case 'Product Catalogue':
        return <Tag className="w-5 h-5 shrink-0" />;
      case 'Inventory & Warehouses':
        return <Boxes className="w-5 h-5 shrink-0" />;
      case 'Treasury & Payments':
        return <Wallet className="w-5 h-5 shrink-0" />;
      case 'Executive Analytics & BI':
        return <TrendingUp className="w-5 h-5 shrink-0" />;
      case 'SokoPoint Intelligence AI':
        return <BrainCircuit className="w-5 h-5 shrink-0" />;
      case 'Staff & Shift Management':
        return <UserCheck className="w-5 h-5 shrink-0" />;
      case 'Branches & Warehouses':
        return <Store className="w-5 h-5 shrink-0" />;
      case 'Notifications':
        return <Bell className="w-5 h-5 shrink-0" />;
      case 'Audit Log & Security':
        return <ShieldCheck className="w-5 h-5 shrink-0" />;
      case 'Organization & Settings':
        return <Settings2 className="w-5 h-5 shrink-0" />;
      default:
        return <Settings2 className="w-5 h-5 shrink-0" />;
    }
  };

  const getSubIcon = (name: string) => {
    switch (name) {
      // Sales & Wholesale
      case 'Sales Ledger':
        return <CreditCard className="w-4 h-4 shrink-0" />;
      case 'Retail & POS Orders':
        return <ShoppingBag className="w-4 h-4 shrink-0" />;
      case 'Wholesale Orders':
        return <Truck className="w-4 h-4 shrink-0" />;
      case 'Quotations & Invoices':
        return <FileText className="w-4 h-4 shrink-0" />;
      case 'Returns & Refunds':
        return <RefreshCcw className="w-4 h-4 shrink-0" />;

      // Customers & Credit
      case 'Customer Directory':
        return <Users className="w-4 h-4 shrink-0" />;
      case 'Credit Accounts & Tabs':
        return <Scale className="w-4 h-4 shrink-0" />;
      case 'Loyalty & Rewards':
        return <Award className="w-4 h-4 shrink-0" />;

      // Product Catalogue
      case 'Products & SKUs':
        return <Boxes className="w-4 h-4 shrink-0" />;
      case 'Categories & Brands':
        return <Layers className="w-4 h-4 shrink-0" />;
      case 'Barcodes & Labels':
        return <Barcode className="w-4 h-4 shrink-0" />;
      case 'Price Lists & Promotions':
        return <Tag className="w-4 h-4 shrink-0" />;

      // Inventory, Warehouses & Procurement
      case 'Inventory Central':
        return <Boxes className="w-4 h-4 shrink-0" />;
      case 'Stock Movements & Bin Cards':
        return <Activity className="w-4 h-4 shrink-0" />;
      case 'Physical Stock Audits':
        return <ClipboardList className="w-4 h-4 shrink-0" />;
      case 'Inter-Branch Transfers':
        return <ArrowLeftRight className="w-4 h-4 shrink-0" />;
      case 'Reorder Suggestions':
        return <TrendingUp className="w-4 h-4 shrink-0" />;
      case 'Wastage & Write-Offs':
        return <AlertTriangle className="w-4 h-4 shrink-0" />;
      case 'Supplier Directory':
        return <Contact2 className="w-4 h-4 shrink-0" />;
      case 'Purchase Requisitions':
        return <ClipboardList className="w-4 h-4 shrink-0" />;
      case 'Purchase Orders (PO)':
        return <FileSpreadsheet className="w-4 h-4 shrink-0" />;
      case 'Goods Received (GRN)':
        return <Warehouse className="w-4 h-4 shrink-0" />;
      case 'Supplier Invoices':
        return <Receipt className="w-4 h-4 shrink-0" />;
      case 'Vendor Returns':
        return <RefreshCcw className="w-4 h-4 shrink-0" />;

      // Treasury & Payments
      case 'Cash Registers & Tills':
        return <Inbox className="w-4 h-4 shrink-0" />;
      case 'M-Pesa & Digital Payments':
        return <Banknote className="w-4 h-4 shrink-0" />;
      case 'Bank Reconciliation':
        return <Landmark className="w-4 h-4 shrink-0" />;
      case 'Operational Expenses':
        return <Calculator className="w-4 h-4 shrink-0" />;
      case 'Tax & KRA eTIMS':
        return <ShieldCheck className="w-4 h-4 shrink-0" />;

      // Analytics & BI
      case 'Analytics Control Tower':
        return <BarChart4 className="w-4 h-4 shrink-0" />;
      case 'Sales & Revenue Reports':
        return <TrendingUp className="w-4 h-4 shrink-0" />;
      case 'Product Margin Analysis':
        return <PieChart className="w-4 h-4 shrink-0" />;
      case 'Inventory Valuation':
        return <Boxes className="w-4 h-4 shrink-0" />;
      case 'Report Exports':
        return <DownloadCloud className="w-4 h-4 shrink-0" />;

      // AI Copilot
      case 'AI Business Copilot':
        return <Sparkles className="w-4 h-4 shrink-0" />;
      case 'Demand & Reorder Forecast':
        return <TrendingUp className="w-4 h-4 shrink-0" />;
      case 'Slow-Mover & Anomaly Alerts':
        return <Bot className="w-4 h-4 shrink-0" />;

      // Staff & Shift Management
      case 'Employee Directory & Roster':
        return <Users className="w-4 h-4 shrink-0" />;
      case 'Role-Based Access Control':
        return <ShieldCheck className="w-4 h-4 shrink-0" />;
      case 'Weekly Shift Schedule':
        return <CalendarClock className="w-4 h-4 shrink-0" />;
      case 'Biometric Clock-In':
        return <Fingerprint className="w-4 h-4 shrink-0" />;
      case 'Shift Handover Notes':
        return <ClipboardList className="w-4 h-4 shrink-0" />;
      case 'Cash Drawer Custodians':
        return <Wallet className="w-4 h-4 shrink-0" />;
      case 'Cashier Performance Metrics':
        return <BarChart4 className="w-4 h-4 shrink-0" />;

      default:
        return <ChevronRight className="w-4 h-4 shrink-0" />;
    }
  };

  const isHrefActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && !!pathname?.startsWith(`${href}/`));

  // Auto-open the parent module and nested sub-group matching the active route
  useEffect(() => {
    if (!pathname) return;
    SIDEBAR_SEGMENTS.forEach((segment) => {
      segment.modules.forEach((mod) => {
        const matchesSub = mod.subItems?.some((sub) => isHrefActive(sub.href));
        const matchesGroup = mod.subGroups?.some((grp) => grp.items.some((it) => isHrefActive(it.href)));
        if (matchesSub || matchesGroup) {
          setOpenModules((prev) => ({ ...prev, [mod.name]: true }));
        }
        mod.subGroups?.forEach((grp) => {
          if (grp.items.some((it) => isHrefActive(it.href))) {
            setOpenGroups((prev) => ({ ...prev, [grp.name]: true }));
          }
        });
      });
    });
  }, [pathname]);

  // Multi-tenant RBAC visibility filter (backend still enforces true authorization)
  const normalizedRole = (userRole || 'CASHIER').toUpperCase();
  const isFullAccess = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'ADMIN'].includes(normalizedRole);

  const filteredSegments = SIDEBAR_SEGMENTS.map((segment) => ({
    ...segment,
    modules: segment.modules.filter((mod) => {
      if (isFullAccess || !mod.allowedRoles) return true;
      return mod.allowedRoles.includes(normalizedRole);
    }),
  })).filter((segment) => segment.modules.length > 0);

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 bg-[#041F56] text-white flex flex-col shadow-2xl transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[80px]' : 'w-[280px]'}
          lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header & Collapse Toggle */}
        <div
          className={`p-4 border-b border-[#176E84]/30 flex items-center gap-3 shrink-0 ${
            isCollapsed ? 'justify-center flex-col relative' : 'justify-between'
          }`}
        >
          <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="bg-white rounded-lg shadow-md p-1 flex items-center justify-center shrink-0 h-9 w-9 overflow-hidden">
              <img
                src="/SokoPoint POS Logo.png"
                alt="SokoPoint-POS Logo"
                className="h-full w-full object-contain"
                suppressHydrationWarning
              />
            </div>

            <div
              className={`min-w-0 transition-opacity duration-200 ${
                isCollapsed ? 'hidden opacity-0' : 'block opacity-100'
              }`}
            >
              <h1 className="text-[15px] font-bold text-white tracking-tight leading-tight truncate">
                {businessName}
              </h1>
              <p className="text-[11px] text-[#05BBBB] font-medium tracking-wide truncate">
                ● {branchName}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex text-[#8BCBF0] hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all ${
              isCollapsed
                ? 'absolute -right-3 top-6 bg-[#041F56] border border-[#176E84] z-50 rounded-full shadow-md'
                : ''
            }`}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Segmented Navigation List */}
        <nav className={`flex-1 py-4 space-y-4 overflow-y-auto custom-scrollbar ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {filteredSegments.map((segment, segmentIndex) => (
            <div key={`segment-${segmentIndex}`} className="mb-2">
              {!isCollapsed && (
                <div className="pt-2 pb-2.5 px-3 text-[10px] font-extrabold text-[#05BBBB] tracking-widest uppercase">
                  {segment.header}
                </div>
              )}

              <div className="space-y-1">
                {segment.modules.map((mod, moduleIndex) => {
                  const hasChildren = !!(mod.subItems?.length || mod.subGroups?.length);
                  const isModuleOpen = !!openModules[mod.name];

                  const isActive = mod.href
                    ? isHrefActive(mod.href)
                    : mod.subItems?.some((sub) => isHrefActive(sub.href)) ||
                      mod.subGroups?.some((grp) => grp.items.some((it) => isHrefActive(it.href)));

                  return (
                    <div key={`module-${moduleIndex}`} className="relative group">
                      <Link
                        href={mod.href || '#'}
                        onClick={(e) => {
                          if (hasChildren) {
                            e.preventDefault();
                            toggleModule(mod.name);
                          } else {
                            setSidebarOpen(false);
                          }
                        }}
                        className={`flex items-center px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                          isActive && !hasChildren
                            ? 'bg-[#0554F4] text-white shadow-md font-bold'
                            : isActive && hasChildren
                            ? 'bg-[#0554F4]/25 text-white font-semibold ring-1 ring-[#0554F4]/70'
                            : 'text-[#8BCBF0] hover:bg-white/10 hover:text-white'
                        } ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                        title={isCollapsed ? mod.name : undefined}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getMainIcon(mod.name)}
                          {!isCollapsed && <span className="truncate">{mod.name}</span>}
                        </div>

                        {!isCollapsed && hasChildren && (
                          <span className="text-[#8BCBF0] shrink-0">
                            {isModuleOpen ? (
                              <ChevronUp className="w-4 h-4 text-white" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </span>
                        )}
                      </Link>

                      {/* Expandable Sub-Items & Nested Sub-Groups */}
                      {!isCollapsed && hasChildren && isModuleOpen && (
                        <div className="pl-5 py-1 space-y-1 border-l border-[#176E84]/50 ml-[1.125rem] mt-1 mb-2">
                          {mod.subItems?.map((sub, subIndex) => {
                            const isSubActive = isHrefActive(sub.href);
                            return (
                              <Link
                                key={`sub-${subIndex}`}
                                href={sub.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                                  isSubActive
                                    ? 'text-white bg-[#0554F4] font-bold shadow-xs'
                                    : 'text-gray-300 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                {getSubIcon(sub.name)}
                                <span className="truncate">{sub.name}</span>
                              </Link>
                            );
                          })}

                          {mod.subGroups?.map((grp, grpIndex) => {
                            const isGroupOpen = openGroups[grp.name] ?? true;
                            return (
                              <div key={`grp-${grpIndex}`} className="pt-1 space-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(grp.name)}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[12px] font-semibold text-[#8BCBF0] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                  <span className="flex items-center gap-2.5 min-w-0">
                                    <Warehouse className="w-4 h-4 shrink-0 text-[#05BBBB]" />
                                    <span className="truncate">{grp.name}</span>
                                  </span>
                                  {isGroupOpen ? (
                                    <ChevronUp className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                                  )}
                                </button>

                                {isGroupOpen && (
                                  <div className="pl-4 space-y-0.5 border-l border-[#176E84]/40 ml-4">
                                    {grp.items.map((item, itemIndex) => {
                                      const isItemActive = isHrefActive(item.href);
                                      return (
                                        <Link
                                          key={`grp-item-${itemIndex}`}
                                          href={item.href}
                                          onClick={() => setSidebarOpen(false)}
                                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-colors ${
                                            isItemActive
                                              ? 'text-white bg-[#0554F4] font-bold shadow-xs'
                                              : 'text-gray-300 hover:text-white hover:bg-white/5'
                                          }`}
                                        >
                                          {getSubIcon(item.name)}
                                          <span className="truncate">{item.name}</span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / Sign Out */}
        <div className={`p-4 border-t border-[#176E84]/30 bg-[#02143A] shrink-0 flex ${isCollapsed ? 'justify-center' : ''}`}>
          <button
            onClick={logout}
            title={isCollapsed ? 'Sign Out' : undefined}
            className={`flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors ${
              isCollapsed ? 'p-2' : 'w-full px-4 py-2.5'
            }`}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}