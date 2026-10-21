import { db } from '../../db';
import { inventory, stockMovements } from '../../db/schema/inventory';
import { products } from '../../db/schema';
import { eq, and } from 'drizzle-orm';

export class InventoryService {
  static async adjustStock(tenantId: string, userId: string | null, data: any) {
    // 1. Check if stock record exists
    const existingStock = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.tenantId, tenantId),
          eq(inventory.branchId, data.branchId),
          eq(inventory.productId, data.productId)
        )
      )
      .limit(1);

    let newQuantity = data.quantityChange;
    let inventoryId = '';

    // 2. Update or Insert
    if (existingStock.length > 0) {
      newQuantity += existingStock[0].quantity;
      inventoryId = existingStock[0].id;
      
      await db.update(inventory)
        .set({ quantity: newQuantity, updatedAt: new Date() })
        .where(eq(inventory.id, inventoryId));
    } else {
      const [newRecord] = await db.insert(inventory)
        .values({
          tenantId,
          branchId: data.branchId,
          productId: data.productId,
          quantity: newQuantity,
        })
        .returning();
      inventoryId = newRecord.id;
    }

    // 3. Log the movement safely
    await db.insert(stockMovements).values({
      tenantId,
      branchId: data.branchId,
      productId: data.productId,
      userId: userId as any, 
      movementType: data.movementType,
      quantity: data.quantityChange,
      notes: data.notes,
    });

    return { balanceAfter: newQuantity };
  }

  static async getInventory(tenantId: string, branchId?: string) {
    const conditions = [eq(inventory.tenantId, tenantId)];
    if (branchId) conditions.push(eq(inventory.branchId, branchId));

    const records = await db
      .select()
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(and(...conditions));

    return records.map((record) => ({
      id: record.inventory.id,
      productId: record.products.id,
      productName: record.products.name,
      sku: record.products.sku,
      quantity: record.inventory.quantity,
      lowStockThreshold: 10,
    }));
  }
}