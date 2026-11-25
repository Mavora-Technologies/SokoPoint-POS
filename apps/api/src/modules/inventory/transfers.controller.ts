import { Request, Response } from 'express';
import { db } from '../../db';
import { products } from '../../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class TransfersController {
  // GET /api/v1/inventory/transfers
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const transfersRes = await db.execute(sql`
        SELECT t.id, t.reference, t.source_branch AS "sourceBranch",
               t.destination_branch AS "destinationBranch", t.status,
               t.vehicle_id AS "vehicleId", t.vehicle_plate AS "vehiclePlate",
               t.driver_name AS "driverName", t.driver_phone AS "driverPhone",
               t.total_valuation::float AS "totalValuation",
               t.shrinkage_value::float AS "shrinkageValue",
               t.requested_by AS "requestedBy", t.remarks,
               t.created_at AS "createdAt", t.dispatched_at AS "dispatchedAt",
               t.received_at AS "receivedAt"
        FROM branch_transfers t
        WHERE t.tenant_id = ${tenantId}
        ORDER BY t.created_at DESC
      `);

      const transfers = rowsOf(transfersRes);

      const itemsRes = await db.execute(sql`
        SELECT i.id, i.transfer_id AS "transferId", i.product_id AS "productId",
               i.quantity_requested AS "quantityRequested",
               i.quantity_received AS "quantityReceived",
               i.unit_cost::float AS "unitCost",
               i.line_valuation::float AS "lineValuation",
               i.shrinkage_qty AS "shrinkageQty",
               i.shrinkage_value::float AS "shrinkageValue",
               p.name AS "productName", COALESCE(p.sku, 'N/A') AS "sku"
        FROM branch_transfer_items i
        JOIN products p ON p.id = i.product_id
        WHERE i.tenant_id = ${tenantId}
      `);

      const itemsByTransfer = new Map<string, any[]>();
      for (const item of rowsOf(itemsRes)) {
        const list = itemsByTransfer.get(item.transferId) || [];
        list.push(item);
        itemsByTransfer.set(item.transferId, list);
      }

      const enriched = transfers.map((t: any) => ({
        ...t,
        items: itemsByTransfer.get(t.id) || [],
      }));

      const inTransit = enriched.filter((t: any) => t.status === 'IN_TRANSIT' || t.status === 'DISPATCHED');
      const pending = enriched.filter((t: any) => t.status === 'PENDING');
      const inTransitValuation = inTransit.reduce((sum: number, t: any) => sum + Number(t.totalValuation || 0), 0);

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            inTransitValuation,
            activeShipments: inTransit.length,
            pendingCount: pending.length,
            totalConsignments: enriched.length,
          },
          transfers: enriched,
        },
      });
    } catch (error: any) {
      console.error('[TRANSFERS GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load stock transport orders' });
    }
  }

  // POST /api/v1/inventory/transfers (Create multi-item STO)
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { sourceBranch, destinationBranch, remarks = '', items = [] } = req.body || {};
      if (!sourceBranch || !destinationBranch || sourceBranch === destinationBranch) {
        return res.status(400).json({ success: false, message: 'Select distinct source and destination branches.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Add at least one product to the transfer order.' });
      }

      const productIds = Array.from(new Set(items.map((i: any) => String(i.productId))));
      const dbProducts = await db
        .select()
        .from(products)
        .where(and(eq(products.tenantId, tenantId), inArray(products.id, productIds)));

      const prodMap = new Map(dbProducts.map((p) => [p.id, p]));
      const operator = req.auth?.email || req.user?.email || 'Admin';
      const ref = `STO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      let totalValuation = 0;
      const pricedItems = items.map((line: any) => {
        const prod = prodMap.get(String(line.productId));
        if (!prod) throw new Error(`Product ${line.productId} not found in tenant catalog`);
        const qty = Math.max(1, parseInt(String(line.quantity), 10) || 1);
        const unitCost = Number(prod.costPrice ?? prod.sellingPrice ?? 0);
        const lineValuation = unitCost * qty;
        totalValuation += lineValuation;
        return { productId: prod.id, qty, unitCost, lineValuation };
      });

      const created = await db.transaction(async (tx) => {
        const insertRes = await tx.execute(sql`
          INSERT INTO branch_transfers (
            tenant_id, reference, source_branch, destination_branch,
            status, total_valuation, shrinkage_value, requested_by, remarks
          )
          VALUES (
            ${tenantId}, ${ref}, ${sourceBranch}, ${destinationBranch},
            'PENDING', ${totalValuation.toFixed(2)}, 0.00, ${operator}, ${remarks}
          )
          RETURNING id, reference, status, total_valuation::float AS "totalValuation"
        `);

        const sto = rowsOf(insertRes)[0];

        for (const line of pricedItems) {
          await tx.execute(sql`
            INSERT INTO branch_transfer_items (
              tenant_id, transfer_id, product_id, quantity_requested,
              quantity_received, unit_cost, line_valuation
            )
            VALUES (
              ${tenantId}, ${sto.id}, ${line.productId}, ${line.qty},
              0, ${line.unitCost.toFixed(2)}, ${line.lineValuation.toFixed(2)}
            )
          `);

          await tx.execute(sql`
            INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
            VALUES (${tenantId}, ${line.productId}, ${ref}, 'TRANSFER', ${-line.qty}, ${operator}, ${`STO ${sourceBranch} -> ${destinationBranch}`})
          `);
        }

        return sto;
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      console.error('[TRANSFERS CREATE ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to create transfer order' });
    }
  }

  // PATCH /api/v1/inventory/transfers/:id/dispatch
  static async dispatch(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const transferId = String(req.params.id);
      const { vehicleId = null } = req.body || {};

      let vehiclePlate: string | null = null;
      let driverName: string | null = null;
      let driverPhone: string | null = null;

      if (vehicleId) {
        const vRes = await db.execute(sql`
          SELECT id, plate_number AS "plateNumber", driver_name AS "driverName", driver_phone AS "driverPhone"
          FROM fleet_vehicles
          WHERE id = ${vehicleId} AND tenant_id = ${tenantId}
          LIMIT 1
        `);
        const vehicle = rowsOf(vRes)[0];
        if (vehicle) {
          vehiclePlate = vehicle.plateNumber;
          driverName = vehicle.driverName;
          driverPhone = vehicle.driverPhone;

          await db.execute(sql`
            UPDATE fleet_vehicles SET status = 'EN_ROUTE', updated_at = NOW()
            WHERE id = ${vehicle.id} AND tenant_id = ${tenantId}
          `);
        }
      }

      const updateRes = await db.execute(sql`
        UPDATE branch_transfers
        SET status = 'IN_TRANSIT',
            vehicle_id = ${vehicleId},
            vehicle_plate = ${vehiclePlate},
            driver_name = ${driverName},
            driver_phone = ${driverPhone},
            dispatched_at = NOW()
        WHERE id = ${transferId} AND tenant_id = ${tenantId}
        RETURNING id, reference, status
      `);

      const updated = rowsOf(updateRes)[0];
      if (!updated) return res.status(404).json({ success: false, message: 'Transfer order not found' });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[TRANSFERS DISPATCH ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to dispatch consignment' });
    }
  }

  // PATCH /api/v1/inventory/transfers/:id/receive
  static async receive(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const transferId = String(req.params.id);
      const { items = [] } = req.body || {};
      const operator = req.auth?.email || req.user?.email || 'Admin';

      const tRes = await db.execute(sql`
        SELECT id, reference, vehicle_id AS "vehicleId"
        FROM branch_transfers
        WHERE id = ${transferId} AND tenant_id = ${tenantId}
        LIMIT 1
      `);
      const transfer = rowsOf(tRes)[0];
      if (!transfer) return res.status(404).json({ success: false, message: 'Transfer order not found' });

      const dbItemsRes = await db.execute(sql`
        SELECT id, product_id AS "productId", quantity_requested AS "quantityRequested", unit_cost::float AS "unitCost"
        FROM branch_transfer_items
        WHERE transfer_id = ${transferId} AND tenant_id = ${tenantId}
      `);
      const dbItems = rowsOf(dbItemsRes);
      const receivedMap = new Map(items.map((i: any) => [String(i.id), Math.max(0, Number(i.quantityReceived ?? 0))]));

      let totalShrinkage = 0;

      await db.transaction(async (tx) => {
        for (const line of dbItems) {
          const qtyReq = Number(line.quantityRequested);
          const qtyRec = receivedMap.has(line.id) ? Number(receivedMap.get(line.id)) : qtyReq;
          const shrinkQty = Math.max(0, qtyReq - qtyRec);
          const shrinkVal = shrinkQty * Number(line.unitCost);
          totalShrinkage += shrinkVal;

          await tx.execute(sql`
            UPDATE branch_transfer_items
            SET quantity_received = ${qtyRec},
                shrinkage_qty = ${shrinkQty},
                shrinkage_value = ${shrinkVal.toFixed(2)}
            WHERE id = ${line.id} AND tenant_id = ${tenantId}
          `);

          if (shrinkQty > 0) {
            await tx.execute(sql`
              INSERT INTO stock_movements (tenant_id, product_id, reference, type, quantity_change, operator_name, notes)
              VALUES (${tenantId}, ${line.productId}, ${transfer.reference}, 'WASTAGE', ${-shrinkQty}, ${operator}, 'In-transit shrinkage write-off')
            `);
          }
        }

        const finalStatus = totalShrinkage > 0 ? 'SHRINKAGE_CLAIM' : 'RECEIVED';

        await tx.execute(sql`
          UPDATE branch_transfers
          SET status = ${finalStatus},
              shrinkage_value = ${totalShrinkage.toFixed(2)},
              received_at = NOW()
          WHERE id = ${transferId} AND tenant_id = ${tenantId}
        `);

        if (transfer.vehicleId) {
          await tx.execute(sql`
            UPDATE fleet_vehicles SET status = 'STANDBY', updated_at = NOW()
            WHERE id = ${transfer.vehicleId} AND tenant_id = ${tenantId}
          `);
        }
      });

      return res.status(200).json({ success: true, message: 'Consignment received & stored.' });
    } catch (error: any) {
      console.error('[TRANSFERS RECEIVE ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to confirm receipt' });
    }
  }

  // GET /api/v1/inventory/transfers/fleet
  static async getFleet(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const [vehiclesRes, activeRes] = await Promise.all([
        db.execute(sql`
          SELECT id, plate_number AS "plateNumber", make_model AS "makeModel",
                 category, base_depot AS "baseDepot", driver_name AS "driverName",
                 driver_phone AS "driverPhone", max_payload_kg AS "maxPayloadKg",
                 is_reefer AS "isReefer", status, created_at AS "createdAt"
          FROM fleet_vehicles
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `),
        db.execute(sql`
          SELECT id, reference, source_branch AS "sourceBranch",
                 destination_branch AS "destinationBranch",
                 vehicle_plate AS "vehiclePlate", driver_name AS "driverName",
                 driver_phone AS "driverPhone", status
          FROM branch_transfers
          WHERE tenant_id = ${tenantId} AND status IN ('IN_TRANSIT', 'DISPATCHED')
          ORDER BY dispatched_at DESC
        `),
      ]);

      const vehicles = rowsOf(vehiclesRes);
      const activeConsignments = rowsOf(activeRes);

      return res.status(200).json({
        success: true,
        data: {
          kpis: {
            totalAssets: vehicles.length,
            standbyCount: vehicles.filter((v: any) => v.status === 'STANDBY').length,
            enRouteCount: activeConsignments.length,
            reeferCount: vehicles.filter((v: any) => v.isReefer).length,
            workshopCount: vehicles.filter((v: any) => v.status === 'WORKSHOP').length,
          },
          vehicles,
          activeConsignments,
        },
      });
    } catch (error: any) {
      console.error('[FLEET GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load fleet console' });
    }
  }

  // POST /api/v1/inventory/transfers/fleet
  static async createVehicle(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const {
        plateNumber,
        makeModel,
        category = 'BOX_TRUCK',
        baseDepot = 'Main Branch',
        driverName,
        driverPhone,
        maxPayloadKg = 1500,
        isReefer = false,
      } = req.body || {};

      if (!plateNumber || !makeModel || !driverName || !driverPhone) {
        return res.status(400).json({ success: false, message: 'Plate number, make/model, driver name, and phone are required.' });
      }

      const insertRes = await db.execute(sql`
        INSERT INTO fleet_vehicles (
          tenant_id, plate_number, make_model, category, base_depot,
          driver_name, driver_phone, max_payload_kg, is_reefer, status
        )
        VALUES (
          ${tenantId}, ${String(plateNumber).trim().toUpperCase()}, ${String(makeModel).trim()},
          ${category}, ${baseDepot}, ${String(driverName).trim()}, ${String(driverPhone).trim()},
          ${Number(maxPayloadKg) || 1500}, ${Boolean(isReefer)}, 'STANDBY'
        )
        RETURNING id, plate_number AS "plateNumber", status
      `);

      return res.status(201).json({ success: true, data: rowsOf(insertRes)[0] });
    } catch (error: any) {
      console.error('[FLEET CREATE ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to register fleet vehicle' });
    }
  }
}