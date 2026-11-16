import { Request, Response } from 'express';
import { loginSchema, registerSchema } from './auth.validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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
      email = email.toLowerCase().trim();
      
      const existingUser = await (prisma as any).user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await (prisma as any).user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          businessName,
          role: 'ADMIN',
        }
      });

      console.log(`[AUTH] Successfully registered new user: ${email}`);

      const token = jwt.sign(
        { 
          userId: newUser.id, 
          email: newUser.email, 
          role: newUser.role || 'ADMIN',
          businessName: newUser.businessName 
        },
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
            businessName: newUser.businessName,
            role: newUser.role
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
      
      // SANITIZE: Match the format saved during registration
      email = email.toLowerCase().trim();

      const user = await (prisma as any).user.findUnique({ where: { email } });
      
      if (!user) {
        console.log(`[AUTH-LOGIN] Failed: User not found for email -> ${email}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log(`[AUTH-LOGIN] Failed: Invalid password for email -> ${email}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      console.log(`[AUTH-LOGIN] Success: Logged in -> ${email}`);

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role || 'ADMIN',
          businessName: user.businessName 
        },
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
            businessName: user.businessName,
            role: user.role || 'ADMIN' 
          }
        },
      });
    } catch (error: any) {
      console.error("[AUTH-LOGIN] Server Error:", error);
      return res.status(500).json({ success: false, message: error.message || 'Authentication failed due to server error' });
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