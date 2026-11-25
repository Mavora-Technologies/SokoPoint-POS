import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class AuditsController {
  // GET /api/v1/inventory/audits
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT id, reference, audit_type AS "auditType", blind_mode AS "blindMode",
               branch_name AS "branch", auditor_name AS "auditor", status,
               total_items_counted AS "totalItemsCounted",
               variance_value::float AS "varianceValue",
               notes, created_at AS "createdAt", reconciled_at AS "reconciledAt"
        FROM stock_audits
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[AUDITS GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load audit sessions' });
    }
  }

  // POST /api/v1/inventory/audits (Snapshots live balances & creates IN_PROGRESS session)
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        auditType = 'FULL',
        blindMode = true,
        branch = 'Main Branch',
        notes = '',
        productIds = [],
      } = req.body || {};

      const auditor = req.auth?.email || req.user?.email || 'Admin';
      const prefix = auditType === 'SPOT_CHECK' ? 'PI' : 'STK';
      const ref = `${prefix}-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // Load tenant products to snapshot
      const targetProducts =
        auditType === 'SPOT_CHECK' && Array.isArray(productIds) && productIds.length > 0
          ? await db
              .select()
              .from(products)
              .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true), inArray(products.id, productIds)))
          : await db
              .select()
              .from(products)
              .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));

      if (targetProducts.length === 0) {
        return res.status(400).json({ success: false, message: 'No active products found to audit.' });
      }

      const created = await db.transaction(async (tx) => {
        const auditRes = await tx.execute(sql`
          INSERT INTO stock_audits (tenant_id, reference, audit_type, blind_mode, branch_name, auditor_name, status, total_items_counted, variance_value, notes)
          VALUES (${tenantId}, ${ref}, ${auditType}, ${Boolean(blindMode)}, ${branch}, ${auditor}, 'IN_PROGRESS', ${targetProducts.length}, 0.00, ${notes})
          RETURNING id, reference, audit_type AS "auditType", blind_mode AS "blindMode", status
        `);

        const audit = rowsOf(auditRes)[0];

        for (const p of targetProducts) {
          const systemQty = Number((p as any).stock ?? p.reorderLevel ?? 0);
          const unitCost = Number(p.costPrice ?? p.sellingPrice ?? 0);

          await tx.execute(sql`
            INSERT INTO stock_audit_items (tenant_id, audit_id, product_id, system_qty, physical_count, variance, unit_cost, variance_value, remarks)
            VALUES (${tenantId}, ${audit.id}, ${p.id}, ${systemQty}, ${systemQty}, 0, ${unitCost.toFixed(2)}, 0.00, NULL)
          `);
        }

        return audit;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[AUDITS CREATE ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to initiate audit session' });
    }
  }

  // GET /api/v1/inventory/audits/:id
  static async getById(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const auditId = String(req.params.id);
      const auditRes = await db.execute(sql`
        SELECT id, reference, audit_type AS "auditType", blind_mode AS "blindMode",
               branch_name AS "branch", auditor_name AS "auditor", status,
               total_items_counted AS "totalItemsCounted",
               variance_value::float AS "varianceValue", notes,
               created_at AS "createdAt", reconciled_at AS "reconciledAt"
        FROM stock_audits
        WHERE id = ${auditId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);

      const audit = rowsOf(auditRes)[0];
      if (!audit) return res.status(404).json({ success: false, message: 'Audit session not found' });

      const itemsRes = await db.execute(sql`
        SELECT i.id, i.product_id AS "productId", i.system_qty AS "systemQty",
               i.physical_count AS "physicalCount", i.variance,
               i.unit_cost::float AS "unitCost", i.variance_value::float AS "varianceValue",
               i.remarks, p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku",
               COALESCE(p.barcode, '') AS "barcode"
        FROM stock_audit_items i
        JOIN products p ON p.id = i.product_id
        WHERE i.audit_id = ${auditId} AND i.tenant_id = ${tenantId}
        ORDER BY p.name ASC
      `);

      return res.status(200).json({
        success: true,
        data: { ...audit, items: rowsOf(itemsRes) },
      });
    } catch (error: any) {
      console.error('[AUDITS GET BY ID ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load audit sheet' });
    }
  }

  // PATCH /api/v1/inventory/audits/:id/reconcile
  static async reconcile(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const auditId = String(req.params.id);
      const { items = [] } = req.body || {};
      const auditor = req.auth?.email || req.user?.email || 'Admin';

      const auditRes = await db.execute(sql`
        SELECT id, reference, branch_name AS "branch", status
        FROM stock_audits
        WHERE id = ${auditId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);
      const audit = rowsOf(auditRes)[0];
      if (!audit) return res.status(404).json({ success: false, message: 'Audit session not found' });
      if (audit.status === 'RECONCILED') {
        return res.status(400).json({ success: false, message: 'This audit session is already reconciled.' });
      }

      const existingItemsRes = await db.execute(sql`
        SELECT id, product_id AS "productId", system_qty AS "systemQty", unit_cost::float AS "unitCost"
        FROM stock_audit_items
        WHERE audit_id = ${auditId} AND tenant_id = ${tenantId}
      `);
      const existingMap = new Map(rowsOf(existingItemsRes).map((row: any) => [row.id, row]));

      let netFinancialVariance = 0;

      await db.transaction(async (tx) => {
        for (const entry of items) {
          const dbLine = existingMap.get(entry.id);
          if (!dbLine) continue;

          const physicalCount = Math.max(0, Number(entry.physicalCount ?? 0));
          const variance = physicalCount - Number(dbLine.systemQty);
          const varianceValue = variance * Number(dbLine.unitCost);
          netFinancialVariance += varianceValue;

          await tx.execute(sql`
            UPDATE stock_audit_items
            SET physical_count = ${physicalCount},
                variance = ${variance},
                variance_value = ${varianceValue.toFixed(2)},
                remarks = ${entry.remarks ? String(entry.remarks).trim() : null}
            WHERE id = ${dbLine.id} AND tenant_id = ${tenantId}
          `);

          if (variance !== 0) {
            await tx
              .update(products)
              .set({
                reorderLevel: physicalCount,
                minimumStock: physicalCount,
                updatedAt: new Date(),
              })
              .where(and(eq(products.id, dbLine.productId), eq(products.tenantId, tenantId)));

            await tx.execute(sql`
              INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
              VALUES (${tenantId}, ${dbLine.productId}, ${audit.reference}, 'ADJUSTMENT', ${variance}, ${auditor}, ${entry.remarks || `Stocktake reconciliation (${audit.branch})`})
            `);
          }
        }

        await tx.execute(sql`
          UPDATE stock_audits
          SET status = 'RECONCILED',
              variance_value = ${netFinancialVariance.toFixed(2)},
              reconciled_at = NOW()
          WHERE id = ${auditId} AND tenant_id = ${tenantId}
        `);
      });

      return res.status(200).json({
        success: true,
        message: 'Stocktake reconciled successfully.',
        data: { netFinancialVariance },
      });
    } catch (error: any) {
      console.error('[AUDITS RECONCILE ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to reconcile audit' });
    }
  }
}