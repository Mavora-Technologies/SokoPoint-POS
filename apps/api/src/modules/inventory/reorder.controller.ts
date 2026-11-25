import { Request, Response } from 'express';
import { db } from '../../db';
import { products, branches } from '../../db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class ReorderController {
  // GET /api/v1/inventory/reorder
  static async getSuggestions(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const [productRows, branchRows] = await Promise.all([
        db
          .select()
          .from(products)
          .where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)))
          .orderBy(asc(products.name)),
        db
          .select({ id: branches.id, name: branches.name })
          .from(branches)
          .where(eq(branches.tenantId, tenantId))
          .orderBy(asc(branches.name)),
      ]);

      // Load tenant suppliers safely regardless of optional columns
      let supplierRows: { id: string; name: string; paymentTerms?: string }[] = [];
      try {
        const supRes = await db.execute(sql`
          SELECT id, name, COALESCE(payment_terms, 'NET_30') AS "paymentTerms"
          FROM suppliers
          WHERE tenant_id = ${tenantId}
          ORDER BY name ASC
        `);
        supplierRows = rowsOf(supRes);
      } catch {
        try {
          const supRes = await db.execute(sql`
            SELECT id, name FROM suppliers WHERE tenant_id = ${tenantId} ORDER BY name ASC
          `);
          supplierRows = rowsOf(supRes).map((s: any) => ({ ...s, paymentTerms: 'NET_30' }));
        } catch {
          supplierRows = [];
        }
      }

      const defaultSupplier = supplierRows[0] || null;

      const items = productRows.map((p: any) => {
        const stockOnHand = Number(p.stock ?? p.reorderLevel ?? 0);
        const safetyBuffer = Number(p.minimumStock ?? p.reorderLevel ?? 10);
        const unitCost = Number(p.costPrice ?? p.sellingPrice ?? 0);

        let urgency: 'CRITICAL' | 'LOW_STOCK' | 'HEALTHY' = 'HEALTHY';
        if (stockOnHand <= 0) {
          urgency = 'CRITICAL';
        } else if (stockOnHand <= safetyBuffer) {
          urgency = 'LOW_STOCK';
        }

        const suggestedQty =
          urgency !== 'HEALTHY'
            ? Math.max(safetyBuffer * 3 - Math.max(stockOnHand, 0), safetyBuffer, 1)
            : 0;

        return {
          productId: p.id,
          name: p.name,
          sku: p.sku || 'SKU-UNASSIGNED',
          stockOnHand,
          safetyBuffer,
          suggestedQty,
          unitCost,
          supplierId: p.supplierId || defaultSupplier?.id || null,
          supplierName: defaultSupplier?.name || 'Unassigned Supplier',
          urgency,
        };
      });

      const outOfStockCount = items.filter((i) => i.urgency === 'CRITICAL').length;
      const lowStockCount = items.filter((i) => i.urgency === 'LOW_STOCK').length;
      const actionable = items.filter((i) => i.urgency !== 'HEALTHY');
      const estRestockCommitment = actionable.reduce(
        (sum, i) => sum + i.suggestedQty * i.unitCost,
        0
      );

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            outOfStockCount,
            lowStockCount,
            estRestockCommitment,
            vendorCount: supplierRows.length,
          },
          items,
          suppliers: supplierRows,
          branches: branchRows,
        },
      });
    } catch (error: any) {
      console.error('[REORDER GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load reorder engine data',
      });
    }
  }

  // POST /api/v1/inventory/reorder/pr (Send Internal Purchase Requisition)
  static async createRequisition(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { branchName = 'Main Branch', priority = 'URGENT', notes = '', items = [] } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one product to submit a requisition.' });
      }

      const submittedBy = req.auth?.email || req.user?.email || 'Admin';
      const ref = `PR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const totalCommitment = items.reduce(
        (sum: number, i: any) => sum + Math.max(1, Number(i.quantity || 0)) * Number(i.unitCost || 0),
        0
      );

      const created = await db.transaction(async (tx) => {
        const prRes = await tx.execute(sql`
          INSERT INTO purchase_requisitions (
            tenant_id, reference, branch_name, department, priority,
            estimated_commitment, status, submitted_by, notes
          )
          VALUES (
            ${tenantId}, ${ref}, ${branchName}, 'RETAIL_FLOOR', ${priority},
            ${totalCommitment.toFixed(2)}, 'PENDING_REVIEW', ${submittedBy}, ${notes}
          )
          RETURNING id, reference, status, estimated_commitment::float AS "estimatedCommitment"
        `);

        const pr = rowsOf(prRes)[0];

        for (const line of items) {
          const qty = Math.max(1, Number(line.quantity || 1));
          const cost = Number(line.unitCost || 0);
          await tx.execute(sql`
            INSERT INTO purchase_requisition_items (tenant_id, requisition_id, product_id, quantity, unit_cost, subtotal)
            VALUES (${tenantId}, ${pr.id}, ${line.productId}, ${qty}, ${cost.toFixed(2)}, ${(qty * cost).toFixed(2)})
          `);
        }

        return pr;
      });

      return res.status(201).json({
        success: true,
        message: `Internal Purchase Requisition ${created.reference} submitted for review.`,
        data: created,
      });
    } catch (error: any) {
      console.error('[REORDER PR CREATE ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to submit requisition' });
    }
  }

  // POST /api/v1/inventory/reorder/generate-pos (One PO per selected supplier)
  static async generatePurchaseOrders(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { branchName = 'Main Branch', items = [] } = req.body || {};
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Select at least one product to generate POs.' });
      }

      const submittedBy = req.auth?.email || req.user?.email || 'Admin';

      // Group items by supplier
      const grouped = new Map<string, { supplierId: string | null; supplierName: string; lines: any[] }>();
      for (const item of items) {
        const key = item.supplierId || 'UNASSIGNED';
        if (!grouped.has(key)) {
          grouped.set(key, {
            supplierId: item.supplierId || null,
            supplierName: item.supplierName || 'General Supplier',
            lines: [],
          });
        }
        grouped.get(key)!.lines.push(item);
      }

      const createdOrders: any[] = [];

      await db.transaction(async (tx) => {
        for (const group of grouped.values()) {
          const ref = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          const total = group.lines.reduce(
            (sum, l) => sum + Math.max(1, Number(l.quantity || 1)) * Number(l.unitCost || 0),
            0
          );

          const poRes = await tx.execute(sql`
            INSERT INTO purchase_requisitions (
              tenant_id, reference, branch_name, department, supplier_id, supplier_name,
              priority, estimated_commitment, status, submitted_by, notes
            )
            VALUES (
              ${tenantId}, ${ref}, ${branchName}, 'PROCUREMENT', ${group.supplierId}, ${group.supplierName},
              'URGENT', ${total.toFixed(2)}, 'CONVERTED_TO_PO', ${submittedBy},
              ${`Auto-generated PO for ${group.supplierName} (${group.lines.length} SKUs)`}
            )
            RETURNING id, reference, supplier_name AS "supplierName", estimated_commitment::float AS "total"
          `);

          const po = rowsOf(poRes)[0];
          createdOrders.push(po);

          for (const line of group.lines) {
            const qty = Math.max(1, Number(line.quantity || 1));
            const cost = Number(line.unitCost || 0);
            await tx.execute(sql`
              INSERT INTO purchase_requisition_items (tenant_id, requisition_id, product_id, quantity, unit_cost, subtotal)
              VALUES (${tenantId}, ${po.id}, ${line.productId}, ${qty}, ${cost.toFixed(2)}, ${(qty * cost).toFixed(2)})
            `);
          }
        }
      });

      return res.status(201).json({
        success: true,
        message: `Generated ${createdOrders.length} Purchase Order(s) grouped by supplier.`,
        data: createdOrders,
      });
    } catch (error: any) {
      console.error('[REORDER GENERATE PO ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to generate Purchase Orders' });
    }
  }
}