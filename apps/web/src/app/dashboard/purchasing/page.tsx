import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Forcing VS Code to ignore its ghost error, the file exists!
import PurchasingClient from './purchasing-client';

// This flag safely shuts up the Next.js 16 Turbopack error


export default function PurchasingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    }>
      <PurchasingClient />
    </Suspense>
  );
}
