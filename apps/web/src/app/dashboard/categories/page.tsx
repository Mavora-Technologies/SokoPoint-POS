import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CategoriesClient from './categories-client';

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center h-[60vh] w-full">
          <Loader2 className="h-10 w-10 animate-spin text-[#0554F4]" />
        </div>
      }
    >
      <CategoriesClient />
    </Suspense>
  );
}