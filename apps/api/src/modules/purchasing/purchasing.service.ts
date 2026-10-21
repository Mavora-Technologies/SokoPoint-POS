import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { purchaseOrders, purchaseOrderItems, suppliers } from '../../db/schema/purchasing';
import { inventory, stockMovements } from '../../db/schema/inventory';

export class PurchasingService {
  static async createPO(tenantId: string, branchId: string, data: any) {
    const poNumber = `PO-${Math.floor(Date.now() / 1000)}`;
    const totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.unitCost * item.quantity), 0);

    return await db.transaction(async (tx) => {
      const [newPO] = await tx.insert(purchaseOrders).values({
        tenantId,
        branchId,
        supplierId: data.supplierId,
        poNumber,
        status: 'PENDING',
        totalAmount: totalAmount.toString(),
        notes: data.notes,
      }).returning();

      const itemsToInsert = data.items.map((item: any) => ({
        poId: newPO.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost.toString(),
        subtotal: (item.unitCost * item.quantity).toString(),
      }));

      await tx.insert(purchaseOrderItems).values(itemsToInsert);

      return newPO;
    });
  }

  static async getPOs(tenantId: string, branchId: string) {
    return await db.select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      status: purchaseOrders.status,
      totalAmount: purchaseOrders.totalAmount,
      createdAt: purchaseOrders.createdAt,
      supplierName: suppliers.name,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.branchId, branchId)))
    .orderBy(desc(purchaseOrders.createdAt));
  }

  static async receiveGoods(tenantId: string, branchId: string, userId: string, poId: string) {
    return await db.transaction(async (tx) => {
      // 1. Verify PO exists and is still pending
      const [po] = await tx.select().from(purchaseOrders).where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)));
      if (!po || po.status !== 'PENDING') throw new Error('Purchase order not found or already processed');

      // 2. Mark PO as received
      await tx.update(purchaseOrders).set({ status: 'RECEIVED', updatedAt: new Date() }).where(eq(purchaseOrders.id, poId));

      // 3. Get PO Items
      const items = await tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.poId, poId));

      // 4. Update Inventory & Log Movements transactionally
      for (const item of items) {
        // Check if inventory record exists for this branch
        const existingStock = await tx.select().from(inventory)
          .where(and(eq(inventory.tenantId, tenantId), eq(inventory.branchId, branchId), eq(inventory.productId, item.productId)))
          .limit(1);

        if (existingStock.length === 0) {
          await tx.insert(inventory).values({
            tenantId,
            branchId,
            productId: item.productId,
            quantity: item.quantity,
            lastUpdatedBy: userId,
          });
        } else {
          await tx.update(inventory)
            .set({ 
              quantity: sql`${inventory.quantity} + ${item.quantity}`, 
              lastUpdatedBy: userId,
              updatedAt: new Date() 
            })
            .where(eq(inventory.id, existingStock[0].id));
        }

        // Create the immutable audit trail
        await tx.insert(stockMovements).values({
          tenantId,
          branchId,
          productId: item.productId,
          userId,
          movementType: 'RECEIPT',
          quantity: item.quantity,
          referenceId: po.id,
          notes: `Received from PO: ${po.poNumber}`,
        });
      }

      return { success: true, message: 'Goods received and inventory updated' };
    });
  }
}