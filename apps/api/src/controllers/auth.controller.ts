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
      
      // TODO: Save user to database here with prisma.user.create(...)

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

      const { email, password } = validation.data;

      // 1. Find user in the database
      const user = await (prisma as any).user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // 2. Strictly compare the entered password with the stored hash
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      // 3. Generate token only if password matches
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role || 'ADMIN' },
        process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026',
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: { 
            id: user.id, 
            email: user.email, 
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin User', 
            role: user.role || 'ADMIN' 
          }
        },
      });
    } catch (error: any) {
      return res.status(401).json({ success: false, message: error.message || 'Authentication failed' });
    }
  }
}