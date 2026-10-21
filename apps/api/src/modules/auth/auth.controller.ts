import { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, errors: validation.error.format() });
      }

      const { email, password, businessName, firstName, lastName } = validation.data;
      const hashedPassword = await bcrypt.hash(password, 10);
      
      return res.status(201).json({
        success: true,
        message: 'Business registered successfully',
        data: { email, businessName, name: `${firstName} ${lastName}` }
      });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ success: false, errors: validation.error.format() });
      }

      const { email } = validation.data;

      const token = jwt.sign(
        { email, role: 'ADMIN', tenantId: 'demo-tenant' },
        process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: { email, name: 'Admin User', role: 'ADMIN' }
        },
      });
    } catch (error: any) {
      return res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
    }
  }
}