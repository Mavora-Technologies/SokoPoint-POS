import { db } from '../../db';
import { floors, tables, recipes, recipeIngredients } from '../../db/schema/restaurant';
import { inventory, stockMovements } from '../../db/schema/inventory';
import { eq, and } from 'drizzle-orm';
import { CreateFloorInput, CreateTableInput, UpdateTableStatusInput, CreateRecipeInput } from './restaurant.schema';
import { auditLogger } from '../audit';

export class RestaurantService {
  static async createFloor(tenantId: string, data: CreateFloorInput) {
    const [floor] = await db
      .insert(floors)
      .values({
        tenantId,
        branchId: data.branchId,
        name: data.name,
      })
      .returning();
    return floor;
  }

  static async createTable(tenantId: string, data: CreateTableInput) {
    const [table] = await db
      .insert(tables)
      .values({
        tenantId,
        branchId: data.branchId,
        floorId: data.floorId,
        tableNumber: data.tableNumber,
        capacity: data.capacity,
        status: 'AVAILABLE',
      })
      .returning();
    return table;
  }

  static async getTables(tenantId: string, branchId: string) {
    return await db
      .select({
        id: tables.id,
        tableNumber: tables.tableNumber,
        capacity: tables.capacity,
        status: tables.status,
        currentOrderId: tables.currentOrderId,
        floorName: floors.name,
      })
      .from(tables)
      .innerJoin(floors, eq(tables.floorId, floors.id))
      .where(and(eq(tables.tenantId, tenantId), eq(tables.branchId, branchId)));
  }

  static async updateTableStatus(tenantId: string, userId: string, data: UpdateTableStatusInput) {
    const [updated] = await db
      .update(tables)
      .set({
        status: data.status,
        currentOrderId: data.currentOrderId ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(tables.id, data.tableId), eq(tables.tenantId, tenantId)))
      .returning();

    await auditLogger.log({
      tenantId,
      userId,
      action: 'TABLE_STATUS_UPDATE',
      entity: 'tables',
      entityId: data.tableId,
      details: `Table status changed to ${data.status}`,
    });

    return updated;
  }

  static async createRecipe(tenantId: string, userId: string, data: CreateRecipeInput) {
    return await db.transaction(async (tx) => {
      const [recipe] = await tx
        .insert(recipes)
        .values({
          tenantId,
          productId: data.productId,
          name: data.name,
          instructions: data.instructions || '',
        })
        .returning();

      const ingredientsToInsert = data.ingredients.map((ing) => ({
        recipeId: recipe.id,
        ingredientProductId: ing.ingredientProductId,
        quantityRequired: ing.quantityRequired.toString(),
        unit: ing.unit,
      }));

      await tx.insert(recipeIngredients).values(ingredientsToInsert);

      await auditLogger.log({
        tenantId,
        userId,
        action: 'RECIPE_CREATED',
        entity: 'recipes',
        entityId: recipe.id,
        details: `Created recipe for ${data.name} with ${data.ingredients.length} ingredients`,
      });

      return recipe;
    });
  }

  static async deductRecipeIngredients(
    tenantId: string,
    branchId: string,
    userId: string,
    productId: string,
    orderQuantity: number
  ) {
    return await db.transaction(async (tx) => {
      const [recipe] = await tx
        .select()
        .from(recipes)
        .where(and(eq(recipes.productId, productId), eq(recipes.tenantId, tenantId)))
        .limit(1);

      if (!recipe) return; // Not a recipe item, skip ingredient deduction

      const ingredients = await tx
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, recipe.id));

      for (const ing of ingredients) {
        const totalDeduction = parseFloat(ing.quantityRequired) * orderQuantity;

        const currentStock = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.tenantId, tenantId),
              eq(inventory.branchId, branchId),
              eq(inventory.productId, ing.ingredientProductId)
            )
          )
          .limit(1);

        if (currentStock.length > 0) {
          const newQty = currentStock[0].quantity - totalDeduction;
          await tx
            .update(inventory)
            .set({ quantity: newQty, updatedAt: new Date() })
            .where(eq(inventory.id, currentStock[0].id));

          await tx.insert(stockMovements).values({
            tenantId,
            branchId,
            productId: ing.ingredientProductId,
            movementType: 'RECIPE_CONSUMPTION',
            quantityChange: -totalDeduction,
            balanceAfter: newQty,
            notes: `Auto deduction for dish sale (${orderQuantity}x)`,
            createdBy: userId,
          });
        }
      }
    });
  }
}