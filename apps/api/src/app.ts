import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './modules/auth/auth.routes';
import  productRoutes  from './modules/products/products.routes';
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
import { reportRoutes } from './modules/reports/reports.routes';
import creditRoutes from './modules/finance/credit.routes';

export const createApp = () => {
  const app = express();

  app.use(helmet());

  const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', service: 'vora-pos-api' });
  });

  // Mount API V1 Routes
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

  app.get('/api/v1', (_req: Request, res: Response) => {
    res.status(200).json({ message: 'Welcome to Vora-POS API v1' });
  });

  // 404 Catch-All Middleware for API Routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'ROUTE_NOT_FOUND',
      message: 'The requested API endpoint does not exist on this server.',
    });
  });

  // Centralized Error Handling Middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Error:', err.stack);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred.',
    });
  });

  return app;
};