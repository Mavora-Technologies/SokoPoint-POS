import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class SuppliersController {
  // GET /api/v1/inventory/suppliers
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const result = await db.execute(sql`
        SELECT s.id,
               s.name,
               s.contact_person AS "contactPerson",
               s.kra_pin AS "kraPin",
               s.phone,
               s.email,
               COALESCE(s.payment_terms, 'NET_30') AS "paymentTerms",
               COALESCE(s.lead_time_days, 2) AS "leadTimeDays",
               s.mpesa_paybill AS "mpesaPaybill",
               s.bank_name AS "bankName",
               s.bank_account AS "bankAccount",
               s.address,
               COALESCE(s.is_active, TRUE) AS "isActive",
               s.created_at AS "createdAt",
               COUNT(p.id)::int AS "skuCount"
        FROM suppliers s
        LEFT JOIN products p
          ON p.supplier_id = s.id
         AND p.tenant_id = s.tenant_id
         AND p.is_active = TRUE
        WHERE s.tenant_id = ${tenantId}
        GROUP BY s.id
        ORDER BY s.is_active DESC, s.name ASC
      `);

      return res.status(200).json({ success: true, data: rowsOf(result) });
    } catch (error: any) {
      console.error('[SUPPLIERS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to load suppliers directory',
      });
    }
  }

  // POST /api/v1/inventory/suppliers
  static async create(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const {
        name,
        contactPerson = null,
        kraPin = null,
        phone = null,
        email = null,
        paymentTerms = 'NET_30',
        leadTimeDays = 2,
        mpesaPaybill = null,
        bankName = null,
        bankAccount = null,
        address = null,
        isActive = true,
      } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Supplier Business Name is required.' });
      }

      const result = await db.execute(sql`
        INSERT INTO suppliers (
          tenant_id, name, contact_person, kra_pin, phone, email,
          payment_terms, lead_time_days, mpesa_paybill, bank_name,
          bank_account, address, is_active
        )
        VALUES (
          ${tenantId},
          ${String(name).trim()},
          ${contactPerson ? String(contactPerson).trim() : null},
          ${kraPin ? String(kraPin).trim().toUpperCase() : null},
          ${phone ? String(phone).trim() : null},
          ${email ? String(email).trim().toLowerCase() : null},
          ${String(paymentTerms)},
          ${Math.max(0, parseInt(String(leadTimeDays), 10) || 2)},
          ${mpesaPaybill ? String(mpesaPaybill).trim() : null},
          ${bankName ? String(bankName).trim() : null},
          ${bankAccount ? String(bankAccount).trim() : null},
          ${address ? String(address).trim() : null},
          ${Boolean(isActive)}
        )
        RETURNING id, name, is_active AS "isActive"
      `);

      return res.status(201).json({ success: true, data: rowsOf(result)[0] });
    } catch (error: any) {
      console.error('[SUPPLIERS CREATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to create supplier profile',
      });
    }
  }

  // PUT /api/v1/inventory/suppliers/:id
  static async update(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const supplierId = String(req.params.id);
      const {
        name,
        contactPerson = null,
        kraPin = null,
        phone = null,
        email = null,
        paymentTerms = 'NET_30',
        leadTimeDays = 2,
        mpesaPaybill = null,
        bankName = null,
        bankAccount = null,
        address = null,
        isActive = true,
      } = req.body || {};

      if (!name || !String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Supplier Business Name is required.' });
      }

      const result = await db.execute(sql`
        UPDATE suppliers
        SET name = ${String(name).trim()},
            contact_person = ${contactPerson ? String(contactPerson).trim() : null},
            kra_pin = ${kraPin ? String(kraPin).trim().toUpperCase() : null},
            phone = ${phone ? String(phone).trim() : null},
            email = ${email ? String(email).trim().toLowerCase() : null},
            payment_terms = ${String(paymentTerms)},
            lead_time_days = ${Math.max(0, parseInt(String(leadTimeDays), 10) || 2)},
            mpesa_paybill = ${mpesaPaybill ? String(mpesaPaybill).trim() : null},
            bank_name = ${bankName ? String(bankName).trim() : null},
            bank_account = ${bankAccount ? String(bankAccount).trim() : null},
            address = ${address ? String(address).trim() : null},
            is_active = ${Boolean(isActive)},
            updated_at = NOW()
        WHERE id = ${supplierId} AND tenant_id = ${tenantId}
        RETURNING id, name, is_active AS "isActive"
      `);

      const updated = rowsOf(result)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Supplier not found in tenant registry.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[SUPPLIERS UPDATE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to update supplier profile',
      });
    }
  }

  // PATCH /api/v1/inventory/suppliers/:id/toggle
  static async toggleStatus(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const supplierId = String(req.params.id);
      const result = await db.execute(sql`
        UPDATE suppliers
        SET is_active = NOT COALESCE(is_active, TRUE),
            updated_at = NOW()
        WHERE id = ${supplierId} AND tenant_id = ${tenantId}
        RETURNING id, name, is_active AS "isActive"
      `);

      const updated = rowsOf(result)[0];
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('[SUPPLIERS TOGGLE ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Failed to toggle supplier status',
      });
    }
  }
}