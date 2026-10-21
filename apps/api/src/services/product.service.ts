//apps/api/src/services/product.service.ts
import { prisma } from '../db/client';

export class ProductService {
  static async getAllProducts() {
    // This pulls from the new SQLite database
    return await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }
}