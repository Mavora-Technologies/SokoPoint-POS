import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; email?: string; role?: string };
  user?: { tenantId?: string; userId?: string; email?: string; role?: string };
};

const rowsOf = (result: any): any[] => (Array.isArray(result) ? result : result?.rows || []);

const getTenantId = (req: AuthRequest): string | null =>
  req.auth?.tenantId || req.user?.tenantId || (req.headers['x-tenant-id'] as string) || null;

export class SettingsController {
  // GET /api/v1/settings/business
  static async getBusinessProfile(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const [settingsRes, bizRes, branchesRes] = await Promise.all([
        db.execute(sql`
          SELECT id,
                 tenant_id AS "tenantId",
                 trading_name AS "tradingName",
                 legal_name AS "legalName",
                 web_slug AS "webSlug",
                 kra_pin AS "kraPin",
                 etims_enabled AS "etimsEnabled",
                 COALESCE(logo_url, '') AS "logoUrl",
                 COALESCE(corporate_email, '') AS "corporateEmail",
                 COALESCE(phone_contact, '') AS "phoneContact",
                 currency,
                 timezone,
                 tax_rate::float AS "taxRate",
                 COALESCE(receipt_footer, '') AS "receiptFooter",
                 low_stock_alerts AS "lowStockAlerts",
                 wholesale_enabled AS "wholesaleEnabled",
                 updated_at AS "updatedAt"
          FROM tenant_settings
          WHERE tenant_id = ${tenantId}
          LIMIT 1
        `),
        db.execute(sql`
          SELECT id, name, slug, kra_pin AS "kraPin", email, phone, is_active AS "isActive"
          FROM businesses
          WHERE tenant_id = ${tenantId}
          LIMIT 1
        `),
        db.execute(sql`
          SELECT id,
                 name,
                 COALESCE(branch_code, '') AS "branchCode",
                 COALESCE(location, '') AS location,
                 COALESCE(etims_bhf_id, '00') AS "etimsBhfId",
                 COALESCE(is_headquarters, FALSE) AS "isHeadquarters",
                 COALESCE(is_active, TRUE) AS "isActive"
          FROM branches
          WHERE tenant_id = ${tenantId}
          ORDER BY COALESCE(is_headquarters, FALSE) DESC, created_at ASC
        `),
      ]);

      let profile = rowsOf(settingsRes)[0];
      const biz = rowsOf(bizRes)[0];

      // Seed initial tenant_settings from businesses/tenant record if first visit
      if (!profile) {
        const tenantRes = await db.execute(sql`
          SELECT name, slug, kra_pin AS "kraPin", status
          FROM tenants
          WHERE id = ${tenantId}
          LIMIT 1
        `);
        const tRow = rowsOf(tenantRes)[0];
        const defaultTrading = biz?.name || tRow?.name || 'SokoPoint Retail & Wholesale';
        const defaultLegal = biz?.name || tRow?.name || 'Mavora Technologies Ltd';
        const defaultSlug = biz?.slug || tRow?.slug || 'sokopoint-retail';
        const defaultPin = biz?.kraPin || tRow?.kraPin || 'P051234567Z';
        const defaultEmail = biz?.email || req.auth?.email || req.user?.email || '';
        const defaultPhone = biz?.phone || '';

        const inserted = await db.execute(sql`
          INSERT INTO tenant_settings (
            tenant_id, trading_name, legal_name, web_slug, kra_pin,
            corporate_email, phone_contact
          )
          VALUES (
            ${tenantId}, ${defaultTrading}, ${defaultLegal}, ${defaultSlug}, ${defaultPin},
            ${defaultEmail}, ${defaultPhone}
          )
          ON CONFLICT (tenant_id) DO NOTHING
          RETURNING id,
                    tenant_id AS "tenantId",
                    trading_name AS "tradingName",
                    legal_name AS "legalName",
                    web_slug AS "webSlug",
                    kra_pin AS "kraPin",
                    etims_enabled AS "etimsEnabled",
                    COALESCE(logo_url, '') AS "logoUrl",
                    COALESCE(corporate_email, '') AS "corporateEmail",
                    COALESCE(phone_contact, '') AS "phoneContact",
                    currency,
                    timezone,
                    tax_rate::float AS "taxRate",
                    COALESCE(receipt_footer, '') AS "receiptFooter",
                    low_stock_alerts AS "lowStockAlerts",
                    wholesale_enabled AS "wholesaleEnabled",
                    updated_at AS "updatedAt"
        `);
        profile = rowsOf(inserted)[0];
        if (!profile) {
          const reRead = await db.execute(sql`
            SELECT id,
                   tenant_id AS "tenantId",
                   trading_name AS "tradingName",
                   legal_name AS "legalName",
                   web_slug AS "webSlug",
                   kra_pin AS "kraPin",
                   etims_enabled AS "etimsEnabled",
                   COALESCE(logo_url, '') AS "logoUrl",
                   COALESCE(corporate_email, '') AS "corporateEmail",
                   COALESCE(phone_contact, '') AS "phoneContact",
                   currency,
                   timezone,
                   tax_rate::float AS "taxRate",
                   COALESCE(receipt_footer, '') AS "receiptFooter",
                   low_stock_alerts AS "lowStockAlerts",
                   wholesale_enabled AS "wholesaleEnabled",
                   updated_at AS "updatedAt"
            FROM tenant_settings
            WHERE tenant_id = ${tenantId}
            LIMIT 1
          `);
          profile = rowsOf(reRead)[0];
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          profile,
          subscription: {
            plan: biz?.isActive === false ? 'SUSPENDED' : 'ENTERPRISE',
            status: biz?.isActive === false ? 'INACTIVE' : 'ACTIVE',
          },
          branches: rowsOf(branchesRes),
        },
      });
    } catch (error: any) {
      console.error('[SETTINGS GET ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to load business profile',
      });
    }
  }

  // PUT /api/v1/settings/business (Bidirectional Sync with tenant_settings & businesses)
  static async updateBusinessProfile(req: AuthRequest, res: Response) {
    try {
      const tenantId = getTenantId(req);
      if (!tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: missing tenant context' });
      }

      const {
        tradingName,
        legalName,
        webSlug,
        kraPin,
        etimsEnabled,
        logoUrl,
        corporateEmail,
        phoneContact,
        currency,
        timezone,
        taxRate,
        receiptFooter,
        lowStockAlerts,
        wholesaleEnabled,
      } = req.body || {};

      if (!tradingName || !String(tradingName).trim()) {
        return res.status(400).json({ success: false, message: 'Trading name is required.' });
      }

      const safeTrading = String(tradingName).trim();
      const safeLegal = String(legalName || safeTrading).trim();
      const safeSlug = String(webSlug || safeTrading.toLowerCase().replace(/[^a-z0-9]+/g, '-')).trim();
      const safePin = String(kraPin || '').trim().toUpperCase();
      const safeLogo = logoUrl ? String(logoUrl).trim() : null;
      const safeEmail = corporateEmail ? String(corporateEmail).trim().toLowerCase() : null;
      const safePhone = phoneContact ? String(phoneContact).trim() : null;
      const safeCurrency = String(currency || 'KES').trim();
      const safeTimezone = String(timezone || 'Africa/Nairobi').trim();
      const safeTax = Math.max(0, Number(taxRate ?? 16)).toFixed(2);
      const safeFooter = receiptFooter !== undefined ? String(receiptFooter) : null;

      await db.transaction(async (tx) => {
        await tx.execute(sql`
          INSERT INTO tenant_settings (
            tenant_id, trading_name, legal_name, web_slug, kra_pin,
            etims_enabled, logo_url, corporate_email, phone_contact,
            currency, timezone, tax_rate, receipt_footer, low_stock_alerts,
            wholesale_enabled, updated_at
          )
          VALUES (
            ${tenantId}, ${safeTrading}, ${safeLegal}, ${safeSlug}, ${safePin},
            ${etimsEnabled !== undefined ? Boolean(etimsEnabled) : true}, ${safeLogo},
            ${safeEmail}, ${safePhone}, ${safeCurrency}, ${safeTimezone},
            ${safeTax}, ${safeFooter},
            ${lowStockAlerts !== undefined ? Boolean(lowStockAlerts) : true},
            ${wholesaleEnabled !== undefined ? Boolean(wholesaleEnabled) : true},
            NOW()
          )
          ON CONFLICT (tenant_id)
          DO UPDATE SET
            trading_name = EXCLUDED.trading_name,
            legal_name = EXCLUDED.legal_name,
            web_slug = EXCLUDED.web_slug,
            kra_pin = EXCLUDED.kra_pin,
            etims_enabled = EXCLUDED.etims_enabled,
            logo_url = EXCLUDED.logo_url,
            corporate_email = EXCLUDED.corporate_email,
            phone_contact = EXCLUDED.phone_contact,
            currency = EXCLUDED.currency,
            timezone = EXCLUDED.timezone,
            tax_rate = EXCLUDED.tax_rate,
            receipt_footer = COALESCE(EXCLUDED.receipt_footer, tenant_settings.receipt_footer),
            low_stock_alerts = EXCLUDED.low_stock_alerts,
            wholesale_enabled = EXCLUDED.wholesale_enabled,
            updated_at = NOW()
        `);

        // Keep businesses table in sync for the tenant
        await tx.execute(sql`
          UPDATE businesses
          SET name = ${safeTrading},
              kra_pin = COALESCE(NULLIF(${safePin}, ''), kra_pin),
              email = COALESCE(${safeEmail}, email),
              phone = COALESCE(${safePhone}, phone)
          WHERE tenant_id = ${tenantId}
        `);
      });

      return res.status(200).json({
        success: true,
        message: 'Corporate entity & store settings saved and synced.',
      });
    } catch (error: any) {
      console.error('[SETTINGS PUT ERROR]', error);
      return res.status(400).json({
        success: false,
        message: error?.cause?.message || error?.message || 'Failed to save business settings',
      });
    }
  }
}