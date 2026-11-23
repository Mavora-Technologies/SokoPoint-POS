import jwt, { SignOptions } from 'jsonwebtoken';

const FALLBACK_SECRET = 'super_secret_auth_key_vora_pos_2026';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  branchId?: string | null;
  email: string;
  role: string;
  businessName?: string;
}

export const getJwtSecret = (): string => {
  return (process.env.AUTH_SECRET || process.env.JWT_SECRET || FALLBACK_SECRET).trim();
};

export const signToken = (payload: JwtPayload, expiresIn: SignOptions['expiresIn'] = '7d'): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
};