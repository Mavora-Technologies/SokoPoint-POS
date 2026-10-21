import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore - Pre-emptively ignoring VS Code's ghost error until the client file is saved
import ProductsClient from './products-client';

// Opt out of Turbopack's strict instant-navigation validation for this dynamic route
export const instant = false;

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <ProductsClient />
    </Suspense>
  );
}