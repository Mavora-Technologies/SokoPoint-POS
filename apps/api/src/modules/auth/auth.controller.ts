import { Request, Response } from 'express';
import { db } from '../../db';
import { tenants, businesses, branches, users } from '../../db/schema';
import { eq, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getJwtSecret } from '../../middleware/requireAuth';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

const setAuthCookies = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: (IS_PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export class AuthController {
  // POST /api/v1/auth/register
  static async register(req: Request, res: Response) {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Please check your registration details.',
          errors: validation.error.format(),
        });
      }

      const { businessName, email, password, firstName, lastName } = validation.data;
      const resolvedEmail = email.toLowerCase().trim();
      const trimmedBusiness = businessName.trim();

      const existingUser = await db
        .select({ id: users.id })
        .from(users)
        .where(sql`LOWER(TRIM(${users.email})) = ${resolvedEmail}`)
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      const slugBase = trimmedBusiness.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = `${slugBase || 'tenant'}-${Date.now().toString().slice(-5)}`;
      const passwordHash = await bcrypt.hash(password, 10);

      // Atomic multi-tenant workspace provisioning
      const provisioned = await db.transaction(async (tx) => {
        const [newTenant] = await tx
          .insert(tenants)
          .values({ name: trimmedBusiness, slug, isActive: true })
          .returning();

        const [newBusiness] = await tx
          .insert(businesses)
          .values({
            tenantId: newTenant.id,
            name: trimmedBusiness,
            legalName: `${trimmedBusiness} Ltd`,
            country: 'Kenya',
            currency: 'KES',
          })
          .returning();

        const [newBranch] = await tx
          .insert(branches)
          .values({
            tenantId: newTenant.id,
            businessId: newBusiness.id,
            name: 'Main Branch',
            location: 'HQ',
            isActive: true,
          })
          .returning();

        const [newUser] = await tx
          .insert(users)
          .values({
            tenantId: newTenant.id,
            branchId: newBranch.id,
            email: resolvedEmail,
            passwordHash,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            isActive: true,
          })
          .returning();

        return { newTenant, newBusiness, newBranch, newUser };
      });

      const { newTenant, newBranch, newUser } = provisioned;
      const userRole = (newUser as any).role || 'BUSINESS_OWNER';

      const token = jwt.sign(
        {
          userId: newUser.id,
          tenantId: newTenant.id,
          branchId: newBranch.id,
          email: newUser.email,
          role: userRole,
          businessName: trimmedBusiness,
        },
        getJwtSecret(),
        { expiresIn: '7d' }
      );

      setAuthCookies(res, token);

      return res.status(201).json({
        success: true,
        message: 'Business and account registered successfully',
        data: {
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: `${newUser.firstName} ${newUser.lastName}`,
            role: userRole,
            tenantId: newTenant.id,
            branchId: newBranch.id,
            businessName: trimmedBusiness,
          },
        },
      });
    } catch (error: any) {
      console.error('[AUTH REGISTER ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Registration failed',
      });
    }
  }

  // POST /api/v1/auth/login
  static async login(req: Request, res: Response) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email and password.',
          errors: validation.error.format(),
        });
      }

      const { email, password } = validation.data;
      const resolvedEmail = email.toLowerCase().trim();

      const userRecords = await db
        .select()
        .from(users)
        .where(sql`LOWER(TRIM(${users.email})) = ${resolvedEmail}`)
        .limit(1);

      if (userRecords.length === 0) {
        console.warn(`[AUTH LOGIN] No user found for email: ${resolvedEmail}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = userRecords[0];

      if (user.isActive === false) {
        return res.status(403).json({
          success: false,
          message: 'This user account has been deactivated. Contact your administrator.',
        });
      }

      if (!user.passwordHash) {
        console.error(`[AUTH LOGIN] Missing passwordHash for user: ${user.id}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.warn(`[AUTH LOGIN] Password mismatch for email: ${resolvedEmail}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const [bizRes, branchRes] = await Promise.all([
        db.select().from(businesses).where(eq(businesses.tenantId, user.tenantId)).limit(1),
        user.branchId
          ? db.select().from(branches).where(eq(branches.id, user.branchId)).limit(1)
          : Promise.resolve([]),
      ]);

      const businessName = bizRes.length > 0 ? bizRes[0].name : 'SokoPoint Workspace';
      const branchName = branchRes.length > 0 ? branchRes[0].name : 'Main Branch';
      const userRole = (user as any).role || 'ADMIN';

      const token = jwt.sign(
        {
          userId: user.id,
          tenantId: user.tenantId,
          branchId: user.branchId,
          email: user.email,
          role: userRole,
          businessName,
        },
        getJwtSecret(),
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
            name: `${user.firstName} ${user.lastName}`,
            role: userRole,
            tenantId: user.tenantId,
            branchId: user.branchId,
            businessName,
            branchName,
          },
        },
      });
    } catch (error: any) {
      console.error('[AUTH LOGIN ERROR]', error);
      return res.status(500).json({
        success: false,
        message: error?.message || 'Authentication failed',
      });
    }
  }

  // POST /api/v1/auth/logout
  static async logout(_req: Request, res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: (IS_PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
    });
    return res.status(200).json({ success: true, message: 'Logged out' });
  }

  // GET /api/v1/auth/me
  static async me(req: Request, res: Response) {
    try {
      const authUser = (req as any).auth || (req as any).user;
      if (!authUser?.userId || !authUser?.tenantId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const userRecs = await db
        .select()
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1);

      if (userRecs.length === 0 || userRecs[0].tenantId !== authUser.tenantId) {
        return res.status(404).json({ success: false, message: 'User not found in tenant context' });
      }

      const user = userRecs[0];
      const [bizRes, branchRes] = await Promise.all([
        db.select().from(businesses).where(eq(businesses.tenantId, user.tenantId)).limit(1),
        user.branchId
          ? db.select().from(branches).where(eq(branches.id, user.branchId)).limit(1)
          : Promise.resolve([]),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          role: (user as any).role || authUser.role || 'ADMIN',
          tenantId: user.tenantId,
          branchId: user.branchId,
          businessName: bizRes.length > 0 ? bizRes[0].name : 'SokoPoint Workspace',
          branchName: branchRes.length > 0 ? branchRes[0].name : 'Main Branch',
          currency: bizRes.length > 0 ? bizRes[0].currency : 'KES',
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error?.message });
    }
  }
}