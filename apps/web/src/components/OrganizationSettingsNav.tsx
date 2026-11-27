'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  GitBranch,
  Percent,
  Store,
  ReceiptText,
  MonitorSmartphone,
  CreditCard,
  ShieldCheck,
  Settings,
} from 'lucide-react';

const SETTINGS_NAV_ITEMS = [
  {
    href: '/dashboard/settings/business',
    label: 'Business Profile & Legal Entity',
    icon: Building2,
  },
  {
    href: '/dashboard/branches',
    label: 'Multi-Location Branch Topology',
    icon: GitBranch,
  },
  {
    href: '/dashboard/settings/business#tax-compliance',
    label: 'Tax Configurations & eTIMS',
    icon: Percent,
  },
  {
    href: '/dashboard/settings/business#retail-wholesale',
    label: 'Retail & Wholesale Channels',
    icon: Store,
  },
  {
    href: '/dashboard/settings/business#receipt-invoice',
    label: 'Receipt & Invoice Customization',
    icon: ReceiptText,
  },
  {
    href: '/dashboard/tills',
    label: 'Registered POS Tills & Drawers',
    icon: MonitorSmartphone,
  },
  {
    href: '/dashboard/payments',
    label: 'Payment Gateways & M-Pesa',
    icon: CreditCard,
  },
  {
    href: '/dashboard/finance/journal',
    label: 'Audit Trail & Maker-Checker GL',
    icon: ShieldCheck,
  },
];

export default function OrganizationSettingsNav() {
  const pathname = usePathname();

  return (
    <aside className="bg-[#041F56] text-white rounded-2xl p-4 shadow-sm space-y-3 h-fit">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-extrabold tracking-wide text-white flex items-center gap-2">
          <Settings className="h-4 w-4 text-[#0554F4]" />
          Organization &amp; Settings
        </span>
      </div>

      <nav className="space-y-1">
        {SETTINGS_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const baseHref = item.href.split('#')[0];
          const isActive = pathname === baseHref && !item.href.includes('#');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#0554F4] text-white shadow-xs font-bold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}