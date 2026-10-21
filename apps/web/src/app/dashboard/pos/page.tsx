import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Forcing VS Code to ignore its ghost error until you save the next file
import POSClient from './pos-client';

// Opt out of Turbopack's strict instant-navigation validation for this dynamic route
export const instant = false;

export default function POSPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <POSClient />
    </Suspense>
  );
}