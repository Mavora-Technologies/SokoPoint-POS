'use client';

import React, { type ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50 selection:bg-blue-600 selection:text-white overflow-x-hidden">
      <div className="w-full max-w-md mx-auto p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}
