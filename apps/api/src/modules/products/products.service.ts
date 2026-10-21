import { db } from '../../db';
import { products } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class ProductService {
  static async createProduct(tenantId: string, data: any) {
    const [product] = await db.insert(products).values({
      tenantId,
      ...data,
      // Safely convert to string ONLY if they exist, otherwise default to "0"
      costPrice: data.costPrice ? data.costPrice.toString() : "0",
      sellingPrice: data.sellingPrice ? data.sellingPrice.toString() : "0",
      taxRate: data.taxRate ? data.taxRate.toString() : "0",
      // Provide a safe default for minimumStock if the frontend doesn't send it
      minimumStock: data.minimumStock || 10, 
    }).returning();
    
    return product;
  }

  static async getProductsByTenant(tenantId: string) {
    // Strict tenant isolation enforced here
    return await db.select().from(products).where(eq(products.tenantId, tenantId));
  }
}