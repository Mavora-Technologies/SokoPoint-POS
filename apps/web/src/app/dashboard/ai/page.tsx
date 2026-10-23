import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Pre-emptively ignoring VS Code's ghost error
import AIClient from './ai-client';

// Opt out of Turbopack's strict instant-navigation validation for this dynamic route


export default function AIPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <AIClient />
    </Suspense>
  );
}
