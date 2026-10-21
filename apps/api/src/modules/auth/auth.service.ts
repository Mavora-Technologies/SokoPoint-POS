import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../../db';
import { tenants, businesses, branches, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { env } from '../../config/env';

export class AuthService {
  static async registerTenant(data: {
    businessName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
    if (existingUser.length > 0) {
      throw new Error('User with this email already exists');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    const slug = data.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

    // Execute transactional multi-step creation
    return await db.transaction(async (tx) => {
      // 1. Create Tenant
      const [tenant] = await tx.insert(tenants).values({
        name: data.businessName,
        slug,
      }).returning();

      // 2. Create Business Profile
      const [business] = await tx.insert(businesses).values({
        tenantId: tenant.id,
        name: data.businessName,
        legalName: data.businessName,
      }).returning();

      // 3. Create Default Branch
      const [branch] = await tx.insert(branches).values({
        tenantId: tenant.id,
        businessId: business.id,
        name: 'Main Branch',
        location: 'HQ',
      }).returning();

      // 4. Create Owner User
      const [user] = await tx.insert(users).values({
        tenantId: tenant.id,
        branchId: branch.id,
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      }).returning();

      return {
        tenantId: tenant.id,
        businessId: business.id,
        branchId: branch.id,
        userId: user.id,
        email: user.email,
      };
    });
  }

  static async login(email: string, password: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token containing tenant and user context
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        branchId: user.branchId,
        email: user.email,
      },
      env.AUTH_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        branchId: user.branchId,
      },
    };
  }
}
