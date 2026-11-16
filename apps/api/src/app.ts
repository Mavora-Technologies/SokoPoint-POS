import express, { Request, Response, NextFunction } from 'express';
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

  app.set('trust proxy', 1);

  // ==========================================
  // AGGRESSIVE MANUAL CORS INJECTION
  // ==========================================
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers', 
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Tenant-ID, tenantid, tenant-id'
    );
    
    // Instantly return 200 for Preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
       res.status(200).end();
       return;
    }
    
    next();
  });

  app.use(helmet());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ==========================================
  // API ROUTES
  // ==========================================
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ success: true, status: 'healthy', service: 'vora-pos-api' });
  });

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