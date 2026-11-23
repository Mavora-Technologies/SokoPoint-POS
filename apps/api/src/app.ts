import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { authRoutes } from './modules/auth/auth.routes';
import productRoutes from './modules/products/products.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import categoryRoutes from './modules/inventory/categories.routes';
import { customerRoutes } from './modules/customers/customers.routes';
import { supplierRoutes } from './modules/purchasing/suppliers.routes';
import { purchasingRoutes } from './modules/purchasing/purchasing.routes';
import { expenseRoutes } from './modules/finance/expenses.routes';
import branchRoutes from './modules/branches/branches.routes';
import { tillRoutes } from './modules/tills/tills.routes';
import shiftsRoutes from './modules/shifts/shifts.routes';
import reportRoutes from './modules/reports/reports.routes';
import creditRoutes from './modules/finance/credit.routes';
import refundRoutes from './modules/refunds/refunds.routes';
import supportRoutes from './modules/support/support.routes';
import wholesaleRoutes from './modules/wholesale/wholesale.routes';
import quotationsRoutes from './modules/quotations/quotations.routes';
import loyaltyRoutes from './modules/loyalty/loyalty.routes';
export const createApp = () => {
  const app = express();

  app.set('trust proxy', 1);

  // ==========================================
  // BULLETPROOF CORS CONFIGURATION
  // ==========================================
  app.use(
    cors({
      origin: function (_origin, callback) {
        callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-tenant-id',
        'tenantid',
      ],
    })
  );

  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, status: 'healthy', service: 'sokopoint-pos-api' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/products', productRoutes);
  app.use('/api/v1/orders', ordersRoutes);
  app.use('/api/v1/inventory', inventoryRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/suppliers', supplierRoutes);
  app.use('/api/v1/purchase-orders', purchasingRoutes);
  app.use('/api/v1/expenses', expenseRoutes);
  app.use('/api/v1/branches', branchRoutes);
  app.use('/api/v1/tills', tillRoutes);
  app.use('/api/v1/shifts', shiftsRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/credit', creditRoutes);
  app.use('/api/v1/refunds', refundRoutes);
  app.use('/api/v1/support', supportRoutes);
  app.use('/api/v1/wholesale', wholesaleRoutes);
  app.use('/api/v1/quotations', quotationsRoutes);
  app.use('/api/v1/loyalty', loyaltyRoutes);
  
  

  // Aliases
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ==========================================
  // CENTRALIZED ERROR HANDLER
  // ==========================================
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected server error occurred.',
    });
  });

  return app;
};