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
      
      // 1. Check if user already exists
      const existingUser = await (prisma as any).user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 2. Save the user to the database
      const newUser = await (prisma as any).user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          businessName,
          role: 'ADMIN', // Default role for the first user
        }
      });

      // 3. Generate token for instant auto-login
      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, role: newUser.role || 'ADMIN' },
        process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026',
        { expiresIn: '7d' }
      );

      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(201).json({
        success: true,
        message: 'Business registered successfully',
        data: { 
          token,
          user: {
            id: newUser.id,
            email: newUser.email,
            name: `${newUser.firstName} ${newUser.lastName}`.trim(),
            businessName,
            role: newUser.role
          }
        }
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

      const user = await (prisma as any).user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role || 'ADMIN' },
        process.env.AUTH_SECRET || 'super_secret_auth_key_vora_pos_2026',
        { expiresIn: '7d' }
      );

      const isProduction = process.env.NODE_ENV === 'production';
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

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

  static async logout(req: Request, res: Response) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  }
}