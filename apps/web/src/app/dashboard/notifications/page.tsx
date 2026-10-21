import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Pre-emptively ignoring VS Code's ghost error until the client file is saved
import NotificationsClient from './notifications-client';

// Opt out of Turbopack's strict instant-navigation validation for this dynamic route
export const instant = false;

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    }>
      <NotificationsClient />
    </Suspense>
  );
}