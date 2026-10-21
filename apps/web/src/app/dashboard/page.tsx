import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Forcing VS Code to ignore its ghost error
import DashboardClient from './dashboard-client';

// Opt out of Turbopack's strict instant-navigation validation
export const instant = false;

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <DashboardClient />
    </Suspense>
  );
}