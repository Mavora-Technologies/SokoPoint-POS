import { useState, useCallback } from 'react';

// Demo-friendly hook for showing temporary success/error messages
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, duration);
  }, []);

  return { toast, showToast, clearToast: () => setToast(null) };
}