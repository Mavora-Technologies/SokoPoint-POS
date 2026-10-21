import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { orders, orderItems } from '../../db/schema';

export class OrderService {
  static async createOrder(tenantId: string, branchId: string, userId: string, data: any) {
    const subtotal = data.items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;

    // Updated prefix from VORA to SOKO
    const orderNumber = `SOKO-${Math.floor(Date.now() / 1000)}`;

    return await db.transaction(async (tx) => {
      const [newOrder] = await tx.insert(orders).values({
        tenantId,
        branchId,
        userId,
        orderNumber,
        subtotal: subtotal.toString(),
        tax: tax.toString(),
        total: total.toString(),
        paymentMethod: data.paymentMethod,
        status: 'completed',
      }).returning();

      const itemsToInsert = data.items.map((item: any) => ({
        orderId: newOrder.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        subtotal: (item.unitPrice * item.quantity).toString(),
      }));

      await tx.insert(orderItems).values(itemsToInsert);

      return newOrder;
    });
  }

  // --- NEW: Fetch Order History ---
  static async getOrders(tenantId: string, branchId: string) {
    return await db.select()
      .from(orders)
      .where(and(eq(orders.tenantId, tenantId), eq(orders.branchId, branchId)))
      .orderBy(desc(orders.createdAt));
  }
}