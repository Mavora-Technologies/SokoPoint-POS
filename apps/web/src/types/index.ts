// Shared TypeScript definitions for your Vora-POS frontend
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string | number;
  minimumStock: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}