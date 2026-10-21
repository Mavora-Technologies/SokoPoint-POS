import { db } from '../../db';
import { customers, loyaltyTransactions } from '../../db/schema/customers';
import { eq, and } from 'drizzle-orm';
import { CreateCustomerInput, AddLoyaltyPointsInput } from './customers.schema';
import { auditLogger } from '../audit';

export class CustomerService {
  static async createCustomer(tenantId: string, userId: string, data: CreateCustomerInput) {
    const [customer] = await db
      .insert(customers)
      .values({
        tenantId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        birthday: data.birthday,
        customerType: data.customerType,
        creditLimit: data.creditLimit.toString(),
      })
      .returning();

    await auditLogger.log({
      tenantId,
      userId,
      action: 'CREATE_CUSTOMER',
      entity: 'customers',
      entityId: customer.id,
      details: `Created new customer: ${data.name}`, // <-- Added missing required property
    });

    return customer;
  }

  static async getCustomers(tenantId: string) {
    return await db
      .select()
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.active, true)))
      .orderBy(customers.name);
  }

  static async processLoyaltyPoints(tenantId: string, userId: string, data: AddLoyaltyPointsInput) {
    return await db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId)))
        .limit(1);

      if (!customer) throw new Error('Customer not found');

      const transactionType = data.points >= 0 
        ? (data.orderId ? 'EARN' : 'ADJUSTMENT') 
        : 'REDEEM';

      await tx.insert(loyaltyTransactions).values({
        tenantId,
        customerId: data.customerId,
        orderId: data.orderId,
        transactionType,
        points: data.points.toString(),
        notes: data.notes,
      });

      const newBalance = parseFloat(customer.loyaltyPoints || '0') + data.points;

      const [updated] = await tx
        .update(customers)
        .set({ 
          loyaltyPoints: newBalance.toString(),
          updatedAt: new Date()
        })
        .where(eq(customers.id, customer.id))
        .returning();

      await auditLogger.log({
        tenantId,
        userId,
        action: 'LOYALTY_POINTS_UPDATED',
        entity: 'customers',
        entityId: customer.id,
        details: `Points changed by ${data.points}. New balance: ${newBalance}`,
      });

      return updated;
    });
  }
}