import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// @ts-ignore
import ExpensesClient from './expenses-client';

export const instant = false;

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-[60vh] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    }>
      <ExpensesClient />
    </Suspense>
  );
}