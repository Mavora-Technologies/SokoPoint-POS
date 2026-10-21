import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { suppliers } from '../../db/schema/purchasing';

export class SupplierService {
  static async createSupplier(tenantId: string, data: any) {
    const [supplier] = await db.insert(suppliers).values({
      tenantId,
      name: data.name,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxPin: data.taxPin,
      paymentTerms: data.paymentTerms,
    }).returning();

    return supplier;
  }

  static async getSuppliers(tenantId: string) {
    return await db.select()
      .from(suppliers)
      .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.active, true)))
      .orderBy(desc(suppliers.createdAt));
  }
}