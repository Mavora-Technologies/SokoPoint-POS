import { Request, Response } from 'express';
import { db } from '../../db';
import { users, roles, userRoles } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createEmployeeSchema } from './shifts.schema';

type AuthRequest = Request & {
  auth?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
  user?: { tenantId?: string; userId?: string; branchId?: string | null; role?: string };
};

export class StaffWorkforceController {
  // GET /api/v1/shifts/employees
  static async getEmployees(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const staff = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          phone: users.phone,
          branchId: users.branchId,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId))
        .orderBy(desc(users.createdAt));

      return res.status(200).json({ success: true, data: staff });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || 'Failed to load staff' });
    }
  }

  // POST /api/v1/shifts/employees
  static async createEmployee(req: AuthRequest, res: Response) {
    try {
      const tenantId = req.auth?.tenantId || req.user?.tenantId;
      if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const parsed = createEmployeeSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, errors: parsed.error.format() });

      const { firstName, lastName, email, phone, password, role, branchId } = parsed.data;
      const passwordHash = await bcrypt.hash(password, 12);

      const created = await db.transaction(async (tx) => {
        const [newUser] = await tx
          .insert(users)
          .values({
            tenantId,
            branchId: branchId || req.auth?.branchId || req.user?.branchId || null,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            phone: phone || null,
            passwordHash,
            isActive: true,
          })
          .returning({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            branchId: users.branchId,
            isActive: users.isActive,
          });

        let [roleRow] = await tx.select().from(roles).where(eq(roles.name, role)).limit(1);
        if (!roleRow) {
          [roleRow] = await tx.insert(roles).values({ name: role }).returning();
        }
        await tx.insert(userRoles).values({ userId: newUser.id, roleId: roleRow.id });

        return { ...newUser, role: roleRow.name };
      });

      return res.status(201).json({ success: true, data: created });
    } catch (error: any) {
      if (error.code === '23505') return res.status(409).json({ success: false, message: 'Email already exists' });
      return res.status(500).json({ success: false, message: error.message || 'Failed to create staff' });
    }
  }

  // GET /api/v1/shifts/roles
  static async getRoles(_req: AuthRequest, res: Response) {
    try {
      const allRoles = await db.select().from(roles);
      return res.status(200).json({ success: true, data: allRoles });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Failed to load roles' });
    }
  }
}