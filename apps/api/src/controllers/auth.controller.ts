import { Request, Response } from 'express';
import { db } from '../db';
import { tenants, businesses, branches, users } from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  businessName: z.string().min(2),
  firstName: z.string().min(2),
  lastName: z.string().min(2)
});

const setAuthCookies = (res: Response, token: string) => {
  const cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: (IS_PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
  res.cookie('token', token, cookieOptions);
};

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, errors: validation.error.format() });
      }

      let { email, password, businessName, firstName, lastName } = validation.data;
      const resolvedEmail = email.toLowerCase().trim();
      
      const existingUser = await db.select().from(users).where(eq(users.email, resolvedEmail)).limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      const result = await db.transaction(async (tx) => {
        const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

        const [newTenant] = await tx.insert(tenants).values({
          name: businessName,
          slug,
        }).returning();

        const [newBusiness] = await tx.insert(businesses).values({
          tenantId: newTenant.id,
          name: businessName,
          legalName: businessName,
        }).returning();

        const [newBranch] = await tx.insert(branches).values({
          tenantId: newTenant.id,
          businessId: newBusiness.id,
          name: 'Main Branch',
          location: 'HQ',
        }).returning();

        const [newUser] = await tx.insert(users).values({
          tenantId: newTenant.id,
          branchId: newBranch.id,
          email: resolvedEmail,
          passwordHash,
          firstName,
          lastName,
        }).returning();

        return { user: newUser, business: newBusiness };
      });

      const token = jwt.sign(
        { 
          userId: result.user.id, 
          tenantId: result.user.tenantId,
          branchId: result.user.branchId,
          email: result.user.email, 
          role: 'ADMIN',
          businessName: result.business.name 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      setAuthCookies(res, token);

      return res.status(201).json({
        success: true,
        message: 'Business registered successfully',
        data: { 
          token,
          user: {
            id: result.user.id,
            email: result.user.email,
            name: `${result.user.firstName} ${result.user.lastName}`.trim(),
            businessName: result.business.name,
            role: 'ADMIN',
            tenantId: result.user.tenantId,
            branchId: result.user.branchId
          }
        }
      });
    } catch (error: any) {
      console.error("[AUTH] Registration error:", error);
      return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, errors: validation.error.format() });
      }

      let { email, password } = validation.data;
      const resolvedEmail = email.toLowerCase().trim();

      // GUARANTEED ADMIN BYPASS & AUTO-PROVISIONING
      if (resolvedEmail === 'admin@mavora.ac.ke' && password === 'password123') {
        let tenantRes = await db.select().from(tenants).limit(1);
        let tenantId = tenantRes.length > 0 ? tenantRes[0].id : null;
        if (!tenantId) {
          const [newT] = await db.insert(tenants).values({ name: 'Mavora Technologies', slug: 'mavora-hq' }).returning();
          tenantId = newT.id;
        }

        let businessRes = await db.select().from(businesses).where(eq(businesses.tenantId, tenantId)).limit(1);
        let businessId = businessRes.length > 0 ? businessRes[0].id : null;
        if (!businessId) {
          const [newB] = await db.insert(businesses).values({ tenantId, name: 'Mavora Technologies', legalName: 'Mavora Technologies Ltd' }).returning();
          businessId = newB.id;
        }

        let branchRes = await db.select().from(branches).where(eq(branches.tenantId, tenantId)).limit(1);
        let branchId = branchRes.length > 0 ? branchRes[0].id : null;
        if (!branchId) {
          const [newB] = await db.insert(branches).values({ tenantId, businessId, name: 'Main Branch', location: 'HQ' }).returning();
          branchId = newB.id;
        }

        let userRes = await db.select().from(users).where(eq(users.email, resolvedEmail)).limit(1);
        let user;
        const passwordHash = await bcrypt.hash('password123', 10);

        if (userRes.length === 0) {
          const [newUser] = await db.insert(users).values({
            tenantId,
            branchId,
            email: resolvedEmail,
            passwordHash,
            firstName: 'Admin',
            lastName: 'User'
          }).returning();
          user = newUser;
        } else {
          user = userRes[0];
          await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
        }

        const businessName = businessRes.length > 0 ? businessRes[0].name : 'SokoPoint POS';

        const token = jwt.sign(
          { 
            userId: user.id, 
            tenantId: user.tenantId,
            branchId: user.branchId,
            email: user.email, 
            role: 'ADMIN',
            businessName 
          },
          JWT_SECRET,
          { expiresIn: '7d' }
        );

        setAuthCookies(res, token);

        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: {
            token,
            user: { 
              id: user.id, 
              email: user.email, 
              name: `${user.firstName || 'Admin'} ${user.lastName || 'User'}`.trim(), 
              businessName,
              role: 'ADMIN',
              tenantId: user.tenantId,
              branchId: user.branchId
            }
          }
        });
      }

      // Standard login flow for other users
      let userRecords = await db.select().from(users).where(eq(users.email, resolvedEmail)).limit(1);
      if (userRecords.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = userRecords[0];
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const businessRecords = await db.select().from(businesses).where(eq(businesses.tenantId, user.tenantId)).limit(1);
      const businessName = businessRecords.length > 0 ? businessRecords[0].name : 'SokoPoint POS';

      const token = jwt.sign(
        { 
          userId: user.id, 
          tenantId: user.tenantId,
          branchId: user.branchId,
          email: user.email, 
          role: 'ADMIN',
          businessName 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      setAuthCookies(res, token);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: { 
            id: user.id, 
            email: user.email, 
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User', 
            businessName,
            role: 'ADMIN',
            tenantId: user.tenantId,
            branchId: user.branchId
          }
        },
      });
    } catch (error: any) {
      console.error("[AUTH-LOGIN] Server Error:", error);
      return res.status(500).json({ success: false, message: error.message || 'Authentication failed' });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('token', { path: '/' });
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  }
}