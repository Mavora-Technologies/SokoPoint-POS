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
  await prisma.supplier.deleteMany();
  await (prisma as any).creditAccount.deleteMany();
  await (prisma as any).customer?.deleteMany?.().catch(() => {}); 
  await prisma.user.deleteMany(); 

  console.log('Seeding categories...');
  await prisma.category.createMany({
    data: [
      { name: 'General', description: 'Uncategorized items' },
      { name: 'Bakery', description: 'Bread and pastries' },
      { name: 'Beverages', description: 'Coffee, tea, water, sodas and juices' },
      { name: 'Dairy & Eggs', description: 'Milk, yogurt, butter, and farm eggs' },
      { name: 'Grains & Flour', description: 'Maize flour, wheat flour, and rice' },
      { name: 'Household & Essentials', description: 'Cleaning supplies and paper products' },
      { name: 'Pantry & Oils', description: 'Cooking oil, sugar, salt, and spices' },
      { name: 'Clothes (Male)', description: 'Men apparel' },
      { name: 'Clothes (Female)', description: 'Women apparel' },
      { name: 'Shoes', description: 'Footwear' },
      { name: 'Utensils', description: 'Kitchen and dining tools' },
      { name: 'Farm Tools', description: 'Agricultural equipment' },
      { name: 'Machines', description: 'Heavy machinery and pumps' },
    ],
  });

  console.log('Seeding suppliers...');
  await prisma.supplier.createMany({
    data: [
      { name: 'Highland Dairies Ltd', contactPerson: 'John Kamau', email: 'info@highlanddairies.co.ke', phone: '+254711223344', category: 'Dairy & Eggs' },
      { name: 'Nairobi Coffee Roasters', contactPerson: 'Amina Mohamed', email: 'sales@nairobicoffee.co.ke', phone: '+254722334455', category: 'Beverages' },
      { name: 'Jogoo Millers Ltd', contactPerson: 'Peter Otieno', email: 'support@jogoomillers.co.ke', phone: '+254733445566', category: 'Grains & Flour' },
    ],
  });

  console.log('Seeding customer credit accounts...');
  await (prisma as any).creditAccount.createMany({
    data: [
      { customerName: 'Valary Mwangi', phone: '+254700112233', balance: 3500.00, status: 'Active' },
      { customerName: 'Brian Kiprop', phone: '+254711998877', balance: 0.00, status: 'Settled' },
      { customerName: 'Grace Achieng', phone: '+254722554433', balance: 1200.50, status: 'Active' },
    ],
  });

  console.log('Seeding customers...');
  await (prisma as any).customer.createMany({
    data: [
      { name: 'Valary Mwangi', email: 'valary@mavora.ac.ke', phone: '+254700112233', points: 150 },
      { name: 'Brian Kiprop', email: 'brian@mavora.ac.ke', phone: '+254711998877', points: 320 },
      { name: 'Grace Achieng', email: 'grace@mavora.ac.ke', phone: '+254722554433', points: 50 },
    ],
  }).catch(() => {
    console.log('Customer model might not be migrated yet; skipping customer seed.');
  });

  console.log('Seeding products with exact local public .jpg filenames...');
  const getImg = (filename: string) => `/products/${filename}`;
  
  await prisma.product.createMany({
    data: [
      { name: 'Crocodile Heavy Duty Jembe (Hoe)', sku: 'FRM-001', sellingPrice: 850, stock: 25, minimumStock: 10, category: 'Farm Tools', imageUrl: getImg('Crocodile Heavy Duty Jembe (Hoe).jpg') },
      { name: 'Heavy Duty Ceramic Dinner Plates (6pcs)', sku: 'UTN-001', sellingPrice: 1500, stock: 40, minimumStock: 15, category: 'Utensils', imageUrl: getImg('Heavy Duty Ceramic Dinner Plates (6pcs).jpg') },
      { name: 'Honda Petrol Water Pump Machine', sku: 'MCH-001', sellingPrice: 28000, stock: 5, minimumStock: 2, category: 'Machines', imageUrl: getImg('Honda Petrol Water Pump Machine.jpg') },
      { name: 'Jogoo Premium Maize Flour 2kg', sku: 'GRN-001', sellingPrice: 220, stock: 100, minimumStock: 50, category: 'Grains & Flour', imageUrl: getImg('Jogoo Premium Maize Flour 2kg.jpg') },
      { name: 'Kabras White Sugar 1kg', sku: 'PNT-001', sellingPrice: 165, stock: 80, minimumStock: 30, category: 'Pantry & Oils', imageUrl: getImg('Kabras White Sugar 1kg.jpg') },
      { name: "Men's Classic Denim Jacket", sku: 'CLM-001', sellingPrice: 1800, stock: 15, minimumStock: 5, category: 'Clothes (Male)', imageUrl: getImg("Men's Classic Denim Jacket.jpg") },
      { name: "Men's Cotton Polo Shirt", sku: 'CLM-002', sellingPrice: 850, stock: 35, minimumStock: 10, category: 'Clothes (Male)', imageUrl: getImg("Men's Cotton Polo Shirt.jpg") },
      { name: 'Mwea Pishori Rice 5kg', sku: 'GRN-002', sellingPrice: 1400, stock: 45, minimumStock: 20, category: 'Grains & Flour', imageUrl: getImg('Mwea Pishori Rice 5kg.jpg') },
      { name: 'Omo Fast Action Laundry Detergent', sku: 'HSH-001', sellingPrice: 250, stock: 60, minimumStock: 20, category: 'Household & Essentials', imageUrl: getImg('Omo Fast Action Laundry Detergent.jpg') },
      { name: 'Philips Energy Saving LED Bulb 9W', sku: 'HSH-002', sellingPrice: 350, stock: 120, minimumStock: 40, category: 'Household & Essentials', imageUrl: getImg('Philips Energy Saving LED Bulb 9W.jpg') },
      { name: 'Stainless Steel Cooking Pot Set (6pcs)', sku: 'UTN-002', sellingPrice: 4500, stock: 12, minimumStock: 5, category: 'Utensils', imageUrl: getImg('Stainless Steel Cooking Pot Set (6pcs).jpg') },
      { name: 'Stainless Steel Cooking Pot Set', sku: 'UTN-003', sellingPrice: 3200, stock: 18, minimumStock: 5, category: 'Utensils', imageUrl: getImg('Stainless Steel Cooking Pot Set.jpg') },
      { name: 'Toilet Tissue (10 Pack)', sku: 'HSH-003', sellingPrice: 450, stock: 85, minimumStock: 30, category: 'Household & Essentials', imageUrl: getImg('Toilet Tissue (10 Pack).jpg') },
      { name: 'Whole Wheat Bread 400g', sku: 'BAK-001', sellingPrice: 65, stock: 30, minimumStock: 10, category: 'Bakery', imageUrl: getImg('Whole Wheat Bread 400g.jpg') },
      { name: "Women's Athletic Running Shoes", sku: 'SHO-001', sellingPrice: 2500, stock: 20, minimumStock: 5, category: 'Shoes', imageUrl: getImg("Women's Athletic Running Shoes.jpg") },
      { name: "Women's Floral Summer Dress", sku: 'CLF-001', sellingPrice: 1500, stock: 25, minimumStock: 8, category: 'Clothes (Female)', imageUrl: getImg("Women's Floral Summer Dress.jpg") },
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
  
  await prisma.user.create({
    data: {
      email: 'admin@mavora.ac.ke',
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