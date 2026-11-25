import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class InventoryController {
  // GET /api/v1/inventory/movements
  static async getMovements(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT m.id, m.reference, m.type, m.quantity_change AS "quantityChange",
               m.operator_name AS "user", m.created_at AS "timestamp",
               p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku"
        FROM stock_movements m
        JOIN products p ON p.id = m.product_id
        WHERE m.tenant_id = ${tenantId}
        ORDER BY m.created_at DESC
        LIMIT 200
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load stock movements' });
    }
  }

  // GET /api/v1/inventory/audits
  static async getAudits(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT id, reference, branch_name AS "branch", auditor_name AS "auditor",
               status, total_items_counted AS "totalItemsCounted",
               variance_value::float AS "varianceValue", created_at AS "date"
        FROM stock_audits
        WHERE tenant_id = ${tenantId}
        ORDER BY created_at DESC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load stock audits' });
    }
  }

  // POST /api/v1/inventory/audits
  static async createAudit(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { branch = 'Main Branch', totalItemsCounted = 0, varianceValue = 0, status = 'DRAFT', notes = '' } = req.body || {};
      const auditor = req.auth?.email || req.user?.email || 'Admin';
      const ref = `AUD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const result = await db.execute(sql`
        INSERT INTO stock_audits (tenant_id, reference, branch_name, auditor_name, status, total_items_counted, variance_value, notes)
        VALUES (${tenantId}, ${ref}, ${branch}, ${auditor}, ${status}, ${Number(totalItemsCounted)}, ${Number(varianceValue)}, ${notes})
        RETURNING id, reference, branch_name AS "branch", auditor_name AS "auditor", status,
                  total_items_counted AS "totalItemsCounted", variance_value::float AS "varianceValue", created_at AS "date"
      `);

      return res.status(201).json({ success: true, data: rowsOf(result)[0] });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to create audit session' });
    }
  }

  // GET /api/v1/inventory/batches
  static async getBatches(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT b.id, b.product_id AS "productId", b.batch_number AS "batchNumber",
               b.expiry_date AS "expiryDate", b.current_quantity AS "currentQuantity",
               b.is_quarantined AS "isQuarantined", p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku"
        FROM product_batches b
        JOIN products p ON p.id = b.product_id
        WHERE b.tenant_id = ${tenantId}
        ORDER BY b.expiry_date ASC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load batches' });
    }
  }

  // PATCH /api/v1/inventory/batches/:id/quarantine
  static async quarantineBatch(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const batchId = String(req.params.id);
      const result = await db.execute(sql`
        UPDATE product_batches
        SET is_quarantined = TRUE
        WHERE id = ${batchId} AND tenant_id = ${tenantId}
        RETURNING id, is_quarantined AS "isQuarantined"
      `);

      const updated = rowsOf(result)[0];
      if (!updated) return res.status(404).json({ success: false, message: 'Batch not found' });
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to quarantine batch' });
    }
  }

  // GET /api/v1/inventory/transfers
  static async getTransfers(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT t.id, t.reference, t.source_branch AS "sourceBranch",
               t.destination_branch AS "destinationBranch", t.quantity, t.status,
               t.requested_by AS "requestedBy", t.remarks, t.created_at AS "date",
               p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku"
        FROM branch_transfers t
        JOIN products p ON p.id = t.product_id
        WHERE t.tenant_id = ${tenantId}
        ORDER BY t.created_at DESC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load branch transfers' });
    }
  }

  // POST /api/v1/inventory/transfers
  static async createTransfer(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { sourceBranch, destinationBranch, productId, quantity, remarks = '' } = req.body || {};
      const qty = Math.max(1, parseInt(String(quantity), 10) || 0);
      if (!sourceBranch || !destinationBranch || !productId || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Source, destination, product, and quantity are required.' });
      }

      const ref = `TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const operator = req.auth?.email || req.user?.email || 'Staff';

      const result = await db.execute(sql`
        INSERT INTO branch_transfers (tenant_id, reference, source_branch, destination_branch, product_id, quantity, status, requested_by, remarks)
        VALUES (${tenantId}, ${ref}, ${sourceBranch}, ${destinationBranch}, ${productId}, ${qty}, 'PENDING', ${operator}, ${remarks})
        RETURNING id, reference, status
      `);

      await db.execute(sql`
        INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
        VALUES (${tenantId}, ${productId}, ${ref}, 'TRANSFER', ${-qty}, ${operator}, ${`Transfer ${sourceBranch} -> ${destinationBranch}`})
      `);

      return res.status(201).json({ success: true, data: rowsOf(result)[0] });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to create branch transfer' });
    }
  }

  // PATCH /api/v1/inventory/transfers/:id/status
  static async updateTransferStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const transferId = String(req.params.id);
      const { status } = req.body || {};
      if (!['APPROVED', 'DISPATCHED', 'RECEIVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid transfer status' });
      }

      const result = await db.execute(sql`
        UPDATE branch_transfers
        SET status = ${status}
        WHERE id = ${transferId} AND tenant_id = ${tenantId}
        RETURNING id, reference, status
      `);

      const updated = rowsOf(result)[0];
      if (!updated) return res.status(404).json({ success: false, message: 'Transfer not found' });
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to update transfer status' });
    }
  }

  // GET /api/v1/inventory/wastage
  static async getWastage(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const result = await db.execute(sql`
        SELECT w.id, w.reference, w.quantity, w.reason, w.value_lost::float AS "valueLost",
               w.reported_by AS "reportedBy", w.status, w.remarks, w.created_at AS "date",
               p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku"
        FROM stock_wastage w
        JOIN products p ON p.id = w.product_id
        WHERE w.tenant_id = ${tenantId}
        ORDER BY w.created_at DESC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load wastage records' });
    }
  }

  // POST /api/v1/inventory/wastage (Deducts stock + logs movement atomically)
  static async createWastage(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { productId, quantity, reason = 'DAMAGED', remarks = '' } = req.body || {};
      const qty = Math.max(1, parseInt(String(quantity), 10) || 0);
      if (!productId || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Product and quantity are required.' });
      }

      const [prod] = await db
        .select()
        .from(products)
        .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
        .limit(1);

      if (!prod) return res.status(404).json({ success: false, message: 'Product not found in tenant catalog' });

      const unitCost = Number(prod.costPrice ?? prod.sellingPrice ?? 0);
      const valueLost = unitCost * qty;
      const ref = `WST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const operator = req.auth?.email || req.user?.email || 'Staff';

      await db.transaction(async (tx) => {
        await tx.execute(sql`
          INSERT INTO stock_wastage (tenant_id, reference, product_id, quantity, reason, value_lost, reported_by, status, remarks)
          VALUES (${tenantId}, ${ref}, ${productId}, ${qty}, ${reason}, ${valueLost.toFixed(2)}, ${operator}, 'APPROVED', ${remarks})
        `);

        await tx
          .update(products)
          .set({
            reorderLevel: sql`GREATEST(0, COALESCE(${products.reorderLevel}, 0) - ${qty})`,
            minimumStock: sql`GREATEST(0, COALESCE(${products.minimumStock}, 0) - ${qty})`,
            updatedAt: new Date(),
          })
          .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)));

        await tx.execute(sql`
          INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
          VALUES (${tenantId}, ${productId}, ${ref}, 'WASTAGE', ${-qty}, ${operator}, ${`${reason}: ${remarks}`})
        `);
      });

      return res.status(201).json({ success: true, message: `Wastage ${ref} logged and inventory updated.` });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message || 'Failed to log wastage' });
    }
  }
}