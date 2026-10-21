import { Request, Response } from 'express';

export const getStockLevels = async (req: Request, res: Response) => {
  // DEMO BYPASS: We are skipping the database and returning exactly what is in your POS!
  return res.json({ 
    success: true, 
    data: [
      {
        id: "inv-1",
        productId: "prod-1",
        productName: "Premium Kenyan Coffee",
        sku: "COF-001",
        quantity: 150,
        lowStockThreshold: 20
      },
      {
        id: "inv-2",
        productId: "prod-2",
        productName: "wrtyuio",
        sku: "567890",
        quantity: 4, // Shows up as "Low Stock" badge in UI
        lowStockThreshold: 10
      }
    ] 
  });
};

export const adjustStock = async (req: Request, res: Response) => {
  // DEMO BYPASS: We accept whatever is typed in the modal and return a success response!
  console.log('Mocked stock adjustment received:', req.body);
  
  return res.json({ 
    success: true, 
    message: 'Stock adjusted successfully',
    data: { 
      balanceAfter: req.body.quantityChange || 0 
    } 
  });
};