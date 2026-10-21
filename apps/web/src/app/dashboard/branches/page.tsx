import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Pre-emptively ignoring VS Code's ghost error
import BranchesClient from './branches-client';

// Opt out of Turbopack's strict instant-navigation validation
export const instant = false;

export default function BranchesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <BranchesClient />
    </Suspense>
  );
}