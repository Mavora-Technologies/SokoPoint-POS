import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing old data to prevent duplicates...');
  await prisma.product.deleteMany();
  await prisma.order.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.category.deleteMany();

  console.log('Seeding categories...');
  await prisma.category.createMany({
    data: [
      { name: 'Beverages', description: 'Coffee, tea, water, sodas and juices' },
      { name: 'Dairy & Eggs', description: 'Milk, yogurt, butter, and farm eggs' },
      { name: 'Bakery', description: 'Bread and pastries' },
      { name: 'Grains & Flour', description: 'Maize flour, wheat flour, and rice' },
      { name: 'Pantry & Oils', description: 'Cooking oil, sugar, salt, and spices' },
      { name: 'Household & Essentials', description: 'Cleaning supplies and paper products' },
    ],
  });

  console.log('Seeding 30 products...');
  
  await prisma.product.createMany({
    data: [
      { name: 'Premium Kenyan Coffee (AA)', sku: 'COF-001', sellingPrice: 850, stock: 25, minimumStock: 15, category: 'Beverages' },
      { name: 'Fresh Milk (1L)', sku: 'MLK-001', sellingPrice: 120, stock: 45, minimumStock: 30, category: 'Dairy & Eggs' },
      { name: 'Whole Wheat Bread', sku: 'BRD-002', sellingPrice: 80, stock: 18, minimumStock: 20, category: 'Bakery' },
      { name: 'Kericho Gold Tea (500g)', sku: 'TEA-045', sellingPrice: 250, stock: 35, minimumStock: 10, category: 'Beverages' },
      { name: 'White Sugar (1kg)', sku: 'SGR-001', sellingPrice: 150, stock: 60, minimumStock: 50, category: 'Pantry & Oils' },
      { name: 'Brown Sugar (1kg)', sku: 'SGR-002', sellingPrice: 170, stock: 40, minimumStock: 50, category: 'Pantry & Oils' },
      { name: 'Maize Flour (2kg)', sku: 'MZF-001', sellingPrice: 200, stock: 55, minimumStock: 40, category: 'Grains & Flour' },
      { name: 'Wheat Flour (2kg)', sku: 'WHF-001', sellingPrice: 220, stock: 50, minimumStock: 40, category: 'Grains & Flour' },
      { name: 'Vegetable Cooking Oil (1L)', sku: 'OIL-001', sellingPrice: 350, stock: 30, minimumStock: 25, category: 'Pantry & Oils' },
      { name: 'Vegetable Cooking Oil (3L)', sku: 'OIL-003', sellingPrice: 1000, stock: 12, minimumStock: 15, category: 'Pantry & Oils' },
      { name: 'Table Salt (500g)', sku: 'SLT-001', sellingPrice: 40, stock: 75, minimumStock: 60, category: 'Pantry & Oils' },
      { name: 'Basmati Rice (1kg)', sku: 'RCE-001', sellingPrice: 300, stock: 40, minimumStock: 30, category: 'Grains & Flour' },
      { name: 'Pishori Rice (1kg)', sku: 'RCE-002', sellingPrice: 350, stock: 25, minimumStock: 20, category: 'Grains & Flour' },
      { name: 'Green Grams (1kg)', sku: 'GRM-001', sellingPrice: 280, stock: 22, minimumStock: 20, category: 'Grains & Flour' },
      { name: 'Red Kidney Beans (1kg)', sku: 'BNS-001', sellingPrice: 250, stock: 28, minimumStock: 20, category: 'Grains & Flour' },
      { name: 'Spaghetti (500g)', sku: 'SPG-001', sellingPrice: 100, stock: 45, minimumStock: 40, category: 'Pantry & Oils' },
      { name: 'Macaroni (500g)', sku: 'MAC-001', sellingPrice: 110, stock: 35, minimumStock: 30, category: 'Pantry & Oils' },
      { name: 'Tomato Paste (400g)', sku: 'TMP-001', sellingPrice: 150, stock: 30, minimumStock: 25, category: 'Pantry & Oils' },
      { name: 'Baked Beans (415g)', sku: 'BKB-001', sellingPrice: 180, stock: 24, minimumStock: 20, category: 'Pantry & Oils' },
      { name: 'Mineral Water (500ml)', sku: 'WTR-500', sellingPrice: 50, stock: 120, minimumStock: 100, category: 'Beverages' },
      { name: 'Mineral Water (1L)', sku: 'WTR-1000', sellingPrice: 90, stock: 95, minimumStock: 80, category: 'Beverages' },
      { name: 'Assorted Soda (500ml)', sku: 'SDA-500', sellingPrice: 70, stock: 110, minimumStock: 100, category: 'Beverages' },
      { name: 'Mango Juice (1L)', sku: 'JCE-001', sellingPrice: 250, stock: 25, minimumStock: 20, category: 'Beverages' },
      { name: 'Vanilla Yogurt (500ml)', sku: 'YGT-001', sellingPrice: 150, stock: 28, minimumStock: 25, category: 'Dairy & Eggs' },
      { name: 'Salted Butter (250g)', sku: 'BTR-001', sellingPrice: 350, stock: 20, minimumStock: 15, category: 'Dairy & Eggs' },
      { name: 'Margarine (500g)', sku: 'MRG-001', sellingPrice: 250, stock: 22, minimumStock: 20, category: 'Dairy & Eggs' },
      { name: 'Cheddar Cheese (250g)', sku: 'CHS-001', sellingPrice: 450, stock: 15, minimumStock: 10, category: 'Dairy & Eggs' },
      { name: 'Farm Eggs (Tray of 30)', sku: 'EGG-030', sellingPrice: 450, stock: 25, minimumStock: 20, category: 'Dairy & Eggs' },
      { name: 'Beef Sausages (500g)', sku: 'SAU-001', sellingPrice: 350, stock: 18, minimumStock: 15, category: 'Dairy & Eggs' },
      { name: 'Premium Toilet Paper (10 Pack)', sku: 'TLP-010', sellingPrice: 400, stock: 40, minimumStock: 30, category: 'Household & Essentials' },
    ],
  });

  console.log('Seeding orders, expenses, and POs...');

  await prisma.order.createMany({
    data: [
      { orderNum: 'VORA-847291', customer: 'Valary', total: 2450.00, method: 'mpesa' },
      { orderNum: 'VORA-847292', customer: 'Valary', total: 850.00, method: 'card' },
      { orderNum: 'VORA-847293', customer: 'Walk-in Customer', total: 120.00, method: 'cash' },
    ],
  });

  await prisma.expense.createMany({
    data: [
      { amount: 4500, paymentMethod: 'M-Pesa', categoryName: 'Utilities', userName: 'Admin', notes: 'Monthly Internet Bill' },
      { amount: 1200, paymentMethod: 'Cash', categoryName: 'Operations', userName: 'Admin', notes: 'Store cleaning supplies' },
    ],
  });

  await prisma.purchaseOrder.createMany({
    data: [
      { poNumber: 'PO-2026-001', supplierName: 'Highland Dairies Ltd', itemsSummary: 'Fresh Milk 500ml', totalCost: 45000, status: 'RECEIVED' },
      { poNumber: 'PO-2026-002', supplierName: 'Nairobi Coffee Roasters', itemsSummary: 'Premium Kenyan Coffee', totalCost: 125000, status: 'PENDING' },
    ],
  });

  console.log('Seeding Admin User...');
  const hashedPassword = await bcrypt.hash('123456', 10);
  
  await (prisma as any).user.upsert({
    where: { email: 'admin@sokopoint.com' },
    update: {},
    create: {
      email: 'admin@sokopoint.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      businessName: 'SokoPoint POS',
      role: 'ADMIN'
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });