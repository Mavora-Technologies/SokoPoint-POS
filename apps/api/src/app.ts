import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { authRoutes } from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import { orderRoutes } from './modules/orders/orders.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import categoryRoutes from './modules/inventory/categories.routes';
import { customerRoutes } from './modules/customers/customers.routes';
import { supplierRoutes } from './modules/purchasing/suppliers.routes';
import { purchasingRoutes } from './modules/purchasing/purchasing.routes';
import { expenseRoutes } from './modules/finance/expenses.routes';
import { branchRoutes } from './modules/branches/branches.routes';
import { tillRoutes } from './modules/tills/tills.routes';
import { shiftRoutes } from './modules/shifts/shifts.routes';
import reportRoutes from './modules/reports/reports.routes';
import creditRoutes from './modules/finance/credit.routes';
import refundRoutes from './modules/refunds/refunds.routes';

export const createApp = () => {
  const app = express();

  // Trust proxy for Vercel environments (essential for secure cookies)
  app.set('trust proxy', 1);

  // ==========================================
  // BULLETPROOF CORS CONFIGURATION
  // ==========================================
  const corsOptions = {
    origin: [
      'https://sokopoint.mavoratechnologies.com',
      'https://sokopoint.pages.dev',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Tenant-ID',
      'tenantid',
      'tenant-id',
    ],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
  };

  // Register CORS first, before ANY other middleware or routes
  app.use(cors(corsOptions));
  
  // Explicitly handle preflight requests for all routes (Crucial for Vercel)
  app.options('*', cors(corsOptions));

  // Security headers
  app.use(helmet());

  // ==========================================
  // BODY PARSING
  // ==========================================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================
  // HEALTH CHECK
  // ==========================================
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      service: 'vora-pos-api',
      timestamp: new Date().toISOString(),
    });
  });

  // ==========================================
  // API ROUTES
  // ==========================================
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/suppliers', supplierRoutes);
  app.use('/api/v1/purchase-orders', purchasingRoutes);
  app.use('/api/v1/expenses', expenseRoutes);
  app.use('/api/v1/branches', branchRoutes);
  app.use('/api/v1/tills', tillRoutes);
  app.use('/api/v1/shifts', shiftRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/credit', creditRoutes);
  app.use('/api/v1/refunds', refundRoutes);

  // Backward-compatible route aliases
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/products', productRoutes);
  app.use('/orders', orderRoutes);
  app.use('/inventory', inventoryRoutes);
  app.use('/categories', categoryRoutes);
  app.use('/customers', customerRoutes);
  app.use('/suppliers', supplierRoutes);
  app.use('/purchase-orders', purchasingRoutes);
  app.use('/expenses', expenseRoutes);
  app.use('/branches', branchRoutes);
  app.use('/tills', tillRoutes);
  app.use('/shifts', shiftRoutes);
  app.use('/reports', reportRoutes);
  app.use('/credit', creditRoutes);
  app.use('/refunds', refundRoutes);
  app.use('/api/refunds', refundRoutes);

  // API Root
  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Vora-POS API v1',
    });
  });

  // ==========================================
  // 404 HANDLER
  // ==========================================
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'The requested API endpoint does not exist on this server.',
    });
  });

  // ==========================================
  // CENTRALIZED ERROR HANDLER
  // ==========================================
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err.stack || err.message);

    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred.',
    });
  });

  return app;
};