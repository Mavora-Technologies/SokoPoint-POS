import { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.validator';
import { db } from '../../db'; 
import { tenants, businesses, branches, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Helper for consistent cookie setting across the app
const setAuthCookies = (res: Response, token: string) => {
  const cookieOptions = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: (IS_PRODUCTION ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  res.cookie('token', token, cookieOptions);
};

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      console.log("[AUTH] Incoming register request:", req.body);
      
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        console.log("[AUTH] Validation failed:", validation.error.format());
        return res.status(400).json({ success: false, errors: validation.error.format() });
      }

      let { email, password, businessName, firstName, lastName } = validation.data;
      
      // SANITIZE: Force email to lowercase and remove accidental spaces
      const resolvedEmail = email.toLowerCase().trim();
      
      const existingUser = await db.select().from(users).where(eq(users.email, resolvedEmail)).limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      
      // Execute multi-tenant setup in a single, safe transaction
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
          // FIX: Removed 'role' property since it doesn't exist on the users table
        }).returning();

        return { user: newUser, business: newBusiness };
      });

      console.log(`[AUTH] Successfully registered new workspace for: ${resolvedEmail}`);

      const token = jwt.sign(
        { 
          userId: result.user.id, 
          tenantId: result.user.tenantId,
          branchId: result.user.branchId,
          email: result.user.email, 
          role: 'ADMIN', // Passed explicitly to the token
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

      const userRecords = await db.select().from(users).where(eq(users.email, resolvedEmail)).limit(1);
      
      if (userRecords.length === 0) {
        console.log(`[AUTH-LOGIN] Failed: User not found for email -> ${resolvedEmail}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const user = userRecords[0];

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        console.log(`[AUTH-LOGIN] Failed: Invalid password for email -> ${resolvedEmail}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // Fetch the business name for the frontend context
      const businessRecords = await db.select().from(businesses).where(eq(businesses.tenantId, user.tenantId)).limit(1);
      const businessName = businessRecords.length > 0 ? businessRecords[0].name : 'SokoPoint POS';

      console.log(`[AUTH-LOGIN] Success: Logged in -> ${resolvedEmail}`);

      const token = jwt.sign(
        { 
          userId: user.id, 
          tenantId: user.tenantId,
          branchId: user.branchId,
          email: user.email, 
          role: 'ADMIN', // Passed explicitly to the token
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
      return res.status(500).json({ success: false, message: error.message || 'Authentication failed due to server error' });
    }
  }

  static async logout(req: Request, res: Response) {
    res.clearCookie('token', { path: '/' });
    
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || req.body?.userId;
      const { firstName, lastName } = req.body;
  
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized session' });
      if (!firstName || !lastName) return res.status(400).json({ success: false, message: 'First and last names are required.' });
  
      const updatedUser = await db.update(users)
        .set({ firstName: firstName.trim(), lastName: lastName.trim() })
        .where(eq(users.id, userId))
        .returning();
  
      return res.status(200).json({ success: true, data: updatedUser[0] });
    } catch (error: any) {
      console.error('Update profile error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to update profile details' });
    }
  }
  
  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId || req.body?.userId;
      const { currentPassword, newPassword } = req.body;
  
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized session' });
      if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both current and new passwords are required.' });
  
      const userRecords = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userRecords.length === 0) return res.status(404).json({ success: false, message: 'User not found.' });
  
      const user = userRecords[0];
      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Incorrect current password.' });
      }
  
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      await db.update(users)
        .set({ passwordHash: hashedNewPassword })
        .where(eq(users.id, userId));
  
      return res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error: any) {
      console.error('Change password error:', error.message);
      return res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }
}