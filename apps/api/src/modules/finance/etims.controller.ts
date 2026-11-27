import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

export class EtimsController {
  // GET /api/v1/finance/etims?branchId=ALL&periodType=MONTHLY&month=11&year=2026
  static async getDashboard(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const branchId = String(req.query.branchId || 'ALL');
      const periodType = String(req.query.periodType || 'MONTHLY').toUpperCase();
      const month = Math.min(12, Math.max(1, Number(req.query.month) || new Date().getMonth() + 1));
      const year = Number(req.query.year) || new Date().getFullYear();

      let startMonth = month;
      let endMonth = month;
      if (periodType === 'QUARTERLY') {
        const q = Math.floor((month - 1) / 3);
        startMonth = q * 3 + 1;
        endMonth = startMonth + 2;
      } else if (periodType === 'ANNUAL') {
        startMonth = 1;
        endMonth = 12;
      }

      const startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
      const endDateObj = new Date(year, endMonth, 0);
      const endDate = `${year}-${String(endMonth).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')} 23:59:59`;

      const [branchesRes, settingsRes, invRes, feedRes] = await Promise.all([
        db.execute(sql`SELECT id, name FROM branches WHERE tenant_id = ${tenantId} ORDER BY name ASC`),
        db.execute(sql`
          SELECT kra_pin AS "kraPin", device_serial AS "deviceSerial", scu_type AS "scuType",
                 branch_code AS "branchCode", vat_rate::float AS "vatRate", auto_transmit AS "autoTransmit"
          FROM etims_settings WHERE tenant_id = ${tenantId} LIMIT 1
        `),
        db.execute(sql`
          SELECT COUNT(*)::int AS "docCount",
                 COALESCE(SUM(invoice_total), 0)::float AS "totalPurchases",
                 COALESCE(SUM(vat_amount), 0)::float AS "inputVat"
          FROM supplier_invoices
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${startDate}::timestamp
            AND created_at <= ${endDate}::timestamp
        `),
        db.execute(sql`
          SELECT id, receipt_no AS "receiptNo", cu_invoice_no AS "cuInvoiceNo",
                 customer_pin AS "customerPin", gross_amount::float AS "grossAmount",
                 taxable_amount::float AS "taxableAmount", exempt_amount::float AS "exemptAmount",
                 vat_amount::float AS "vatAmount", status, transmitted_at AS "transmittedAt"
          FROM etims_transmissions
          WHERE tenant_id = ${tenantId}
            AND transmitted_at >= ${startDate}::timestamp
            AND transmitted_at <= ${endDate}::timestamp
            ${branchId !== 'ALL' ? sql`AND branch_id = ${branchId}` : sql``}
          ORDER BY transmitted_at DESC
        `),
      ]);

      // Safely read gross sales from orders (auto-detect amount column)
      const colRes = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name IN ('total_amount', 'total', 'grand_total', 'amount')
        LIMIT 1
      `);
      const amtCol = rowsOf(colRes)[0]?.column_name;

      let settledSalesCount = 0;
      let grossSales = 0;
      if (amtCol) {
        const salesQuery =
          branchId !== 'ALL'
            ? sql`
                SELECT COUNT(*)::int AS cnt, COALESCE(SUM(${sql.raw(amtCol)}), 0)::float AS gross
                FROM orders
                WHERE tenant_id = ${tenantId}
                  AND branch_id = ${branchId}
                  AND created_at >= ${startDate}::timestamp
                  AND created_at <= ${endDate}::timestamp
              `
            : sql`
                SELECT COUNT(*)::int AS cnt, COALESCE(SUM(${sql.raw(amtCol)}), 0)::float AS gross
                FROM orders
                WHERE tenant_id = ${tenantId}
                  AND created_at >= ${startDate}::timestamp
                  AND created_at <= ${endDate}::timestamp
              `;
        const sRes = await db.execute(salesQuery);
        settledSalesCount = rowsOf(sRes)[0]?.cnt || 0;
        grossSales = Number(rowsOf(sRes)[0]?.gross || 0);
      }

      const settings = rowsOf(settingsRes)[0] || {
        kraPin: 'NOT-CONFIGURED',
        deviceSerial: '',
        scuType: 'VSCU',
        branchCode: '00',
        vatRate: 16,
        autoTransmit: true,
      };

      const feed = rowsOf(feedRes);
      const exemptSales = feed.reduce((acc, f) => acc + Number(f.exemptAmount || 0), 0);
      const vatRate = Number(settings.vatRate || 16);
      const taxableInclusive = Math.max(0, grossSales - exemptSales);
      const netTaxableBase = Number((taxableInclusive / (1 + vatRate / 100)).toFixed(2));
      const outputVat = Number((taxableInclusive - netTaxableBase).toFixed(2));

      const invStats = rowsOf(invRes)[0] || { docCount: 0, totalPurchases: 0, inputVat: 0 };
      const inputVat = Number(invStats.inputVat || 0);
      const netPayableVat = Number((outputVat - inputVat).toFixed(2));

      const dueMonth = endMonth === 12 ? 1 : endMonth + 1;
      const dueYear = endMonth === 12 ? year + 1 : year;
      const dueDate = `${dueYear}-${String(dueMonth).padStart(2, '0')}-20`;

      return res.status(200).json({
        success: true,
        data: {
          branches: rowsOf(branchesRes),
          settings,
          periodLabel: `${String(month).padStart(2, '0')}/${year}`,
          dueDate,
          summary: {
            settledSalesCount,
            grossSales,
            exemptSales,
            netTaxableBase,
            outputVat,
            purchaseDocCount: invStats.docCount || 0,
            totalPurchases: Number(invStats.totalPurchases || 0),
            inputVat,
            netPayableVat,
          },
          transmissions: feed,
        },
      });
    } catch (error: any) {
      console.error('[ETIMS GET ERROR]', error);
      return res.status(500).json({ success: false, message: error?.message || 'Failed to load eTIMS ledger' });
    }
  }

  // PUT /api/v1/finance/etims/settings
  static async saveSettings(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { kraPin = '', deviceSerial = '', scuType = 'VSCU', branchCode = '00', vatRate = 16, autoTransmit = true } =
        req.body || {};

      const saved = await db.execute(sql`
        INSERT INTO etims_settings (tenant_id, kra_pin, device_serial, scu_type, branch_code, vat_rate, auto_transmit, updated_at)
        VALUES (${tenantId}, ${String(kraPin).trim().toUpperCase()}, ${String(deviceSerial).trim()},
                ${String(scuType)}, ${String(branchCode).trim()}, ${Number(vatRate) || 16}, ${Boolean(autoTransmit)}, NOW())
        ON CONFLICT (tenant_id)
        DO UPDATE SET
          kra_pin = EXCLUDED.kra_pin,
          device_serial = EXCLUDED.device_serial,
          scu_type = EXCLUDED.scu_type,
          branch_code = EXCLUDED.branch_code,
          vat_rate = EXCLUDED.vat_rate,
          auto_transmit = EXCLUDED.auto_transmit,
          updated_at = NOW()
        RETURNING kra_pin AS "kraPin", device_serial AS "deviceSerial", scu_type AS "scuType",
                  branch_code AS "branchCode", vat_rate::float AS "vatRate", auto_transmit AS "autoTransmit"
      `);

      return res.status(200).json({ success: true, data: rowsOf(saved)[0] });
    } catch (error: any) {
      console.error('[ETIMS SETTINGS ERROR]', error);
      return res.status(400).json({ success: false, message: error?.message || 'Failed to save eTIMS settings' });
    }
  }
}