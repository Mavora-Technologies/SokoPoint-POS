import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class WastageController {
  // GET /api/v1/inventory/wastage
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT w.id, w.reference, w.product_id AS "productId", w.quantity, w.reason,
               w.cost_center AS "costCenter", w.storage_location AS "storageLocation",
               w.disposal_method AS "disposalMethod",
               COALESCE(w.unit_cost::float, 0) AS "unitCost",
               w.value_lost::float AS "valueLost",
               w.reported_by AS "reportedBy", w.status, w.remarks,
               w.created_at AS "date",
               p.name AS "productName", COALESCE(p.sku, 'NO-SKU') AS "sku",
               COALESCE(p.barcode, '') AS "barcode"
        FROM stock_wastage w
        JOIN products p ON p.id = w.product_id
        WHERE w.tenant_id = ${tenantId}
        ORDER BY w.created_at DESC
      `);

      const records = rowsOf(result);

      // Compute live tenant KPIs
      const totalFinancialLoss = records.reduce((sum, r) => sum + Number(r.valueLost || 0), 0);

      const lossByReason = new Map<string, number>();
      const lossByCostCenter = new Map<string, number>();

      for (const r of records) {
        const val = Number(r.valueLost || 0);
        const reason = String(r.reason || 'OTHER');
        const center = String(r.costCenter || 'Retail Floor');
        lossByReason.set(reason, (lossByReason.get(reason) || 0) + val);
        lossByCostCenter.set(center, (lossByCostCenter.get(center) || 0) + val);
      }

      let topLossVector = { label: 'None', amount: 0 };
      for (const [label, amount] of lossByReason.entries()) {
        if (amount > topLossVector.amount) topLossVector = { label, amount };
      }

      let topCostCenter = { label: 'Retail Floor', amount: 0 };
      for (const [label, amount] of lossByCostCenter.entries()) {
        if (amount > topCostCenter.amount) topCostCenter = { label, amount };
      }

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalFinancialLoss,
            loggedIncidents: records.length,
            topLossVector,
            topCostCenter,
          },
          records,
        },
      });
    } catch (error: any) {
      console.error('[WASTAGE GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load wastage ledger',
      });
    }
  }

  // POST /api/v1/inventory/wastage
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        productId,
        quantity,
        reason = 'DAMAGED',
        costCenter = 'Retail Floor',
        storageLocation = 'Main Store',
        disposalMethod = 'DISPOSED',
        remarks = '',
      } = req.body || {};

      const qty = Math.max(1, parseInt(String(quantity), 10) || 0);
      if (!productId || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Product and valid quantity are required.' });
      }

      const [prod] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, String(productId)), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!prod) {
        return res.status(404).json({ success: false, message: 'Product not found in tenant catalog.' });
      }

      const unitCost = Number(prod.costPrice ?? prod.sellingPrice ?? 0);
      const valueLost = unitCost * qty;
      const ref = `WST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const operator = req.auth?.email || req.user?.email || 'Admin';

      const created = await db.transaction(async (tx) => {
        const insertRes = await tx.execute(sql`
          INSERT INTO stock_wastage (
            tenant_id, reference, product_id, quantity, reason,
            cost_center, storage_location, disposal_method,
            unit_cost, value_lost, reported_by, status, remarks
          )
          VALUES (
            ${tenantId}, ${ref}, ${prod.id}, ${qty}, ${reason},
            ${costCenter}, ${storageLocation}, ${disposalMethod},
            ${unitCost.toFixed(2)}, ${valueLost.toFixed(2)}, ${operator}, 'APPROVED', ${remarks}
          )
          RETURNING id, reference, value_lost::float AS "valueLost"
        `);

        // Deduct from tenant product stock
        await tx
          .update(products)
          .set({
            reorderLevel: sql`GREATEST(0, COALESCE(${products.reorderLevel}, 0) - ${qty})`,
            minimumStock: sql`GREATEST(0, COALESCE(${products.minimumStock}, 0) - ${qty})`,
            updatedAt: new Date(),
          })
          .where(and(eq(products.id, prod.id), eq(products.tenantId, tenantId)));

        // Log immutable audit trail in stock_movements
        await tx.execute(sql`
          INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
          VALUES (${tenantId}, ${prod.id}, ${ref}, 'WASTAGE', ${-qty}, ${operator}, ${`${reason} (${costCenter}): ${remarks}`})
        `);

        return rowsOf(insertRes)[0];
      });

      return res.status(201).json({
        success: true,
        message: `Write-off ${created.reference} logged and stock ledger updated.`,
        data: created,
      });
    } catch (error: any) {
      console.error('[WASTAGE CREATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to log stock wastage',
      });
    }
  }
}