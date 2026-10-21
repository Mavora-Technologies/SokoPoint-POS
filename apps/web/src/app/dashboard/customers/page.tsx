import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore
import CustomersClient from './customers-client';

export const instant = false;

export default function CustomersPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <CustomersClient />
    </Suspense>
  );
}