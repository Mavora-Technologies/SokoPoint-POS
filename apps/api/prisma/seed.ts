import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import * as schema from '../src/db/schema';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is missing in environment variables.');

async function seed() {
  console.log('🌱 Starting Drizzle database seed for SokoPoint Retail...');

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  });

  await client.connect();
  const db = drizzle(client, { schema });

  try {
    console.log('🧹 Clearing old data to prevent duplicate key errors...');
    await db.delete(schema.products).catch(() => {});
    await db.delete(schema.categories).catch(() => {});
    await db.delete(schema.suppliers).catch(() => {});
    await db.delete(schema.users).catch(() => {});
    await db.delete(schema.branches).catch(() => {});
    await db.delete(schema.businesses).catch(() => {});
    await db.delete(schema.tenants).catch(() => {});

    // 1. Create Default Tenant
    const [tenant] = await db.insert(schema.tenants).values({
      name: 'Mavora Technologies Ltd',
      slug: 'mavora-technologies-ltd-2026',
    }).returning();
    console.log(`✅ Tenant created: ${tenant.id}`);

    // 2. Create Business Profile
    const [business] = await db.insert(schema.businesses).values({
      tenantId: tenant.id,
      name: 'SokoPoint POS',
      legalName: 'Mavora Technologies Ltd',
    }).returning();
    console.log(`✅ Business profile created: ${business.id}`);

    // 3. Create Default Branch
    const [branch] = await db.insert(schema.branches).values({
      tenantId: tenant.id,
      businessId: business.id,
      name: 'Main Supermarket Branch',
      location: 'Wood Garden Road, Kilimani',
    }).returning();
    console.log(`✅ Branch created: ${branch.id}`);

    // 4. Create Admin Users
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash('123456', saltRounds);
    const valaryPasswordHash = await bcrypt.hash('12345678', saltRounds);

    await db.insert(schema.users).values([
      {
        tenantId: tenant.id,
        branchId: branch.id,
        email: 'admin@mavora.ac.ke',
        passwordHash: adminPasswordHash,
        firstName: 'Admin',
        lastName: 'User',
      },
      {
        tenantId: tenant.id,
        branchId: branch.id,
        email: 'valary@gmail.com',
        passwordHash: valaryPasswordHash,
        firstName: 'Valary',
        lastName: 'Mwangi',
      }
    ]);
    console.log(`✅ Admin Users created.`);

    // 5. Create a Supplier
    const [supplier] = await db.insert(schema.suppliers).values({
      tenantId: tenant.id,
      name: 'Highland Dairies Ltd', 
      contactPerson: 'John Kamau',
      phone: '+254711223344',
      email: 'info@highlanddairies.co.ke',
      isActive: true,
    } as any).returning();
    console.log(`✅ Supplier created: ${supplier.id}`);

    // 6. Create Product Categories
    const categories = await db.insert(schema.categories).values([
      { tenantId: tenant.id, name: 'Grains & Flour', description: 'Maize flour, wheat flour, and rice' },
      { tenantId: tenant.id, name: 'Dairy & Eggs', description: 'Milk, yogurt, butter, and farm eggs' },
      { tenantId: tenant.id, name: 'Household & Essentials', description: 'Cleaning supplies and paper products' },
      { tenantId: tenant.id, name: 'Farm Tools', description: 'Agricultural equipment' },
    ] as any).returning();
    
    const catId = (catName: string) => categories.find((c: any) => c.name === catName)!.id;
    console.log(`✅ Categories seeded.`);

    // 7. Seed Retail Products with costPrice included
    const getImg = (filename: string) => `/products/${filename}`;
    
    const productsData = [
      { category: 'Farm Tools', name: 'Crocodile Heavy Duty Jembe (Hoe)', sku: 'FRM-001', sellingPrice: 850, stock: 25, imageUrl: getImg('Crocodile Heavy Duty Jembe (Hoe).jpg') },
      { category: 'Grains & Flour', name: 'Jogoo Premium Maize Flour 2kg', sku: 'GRN-001', sellingPrice: 220, stock: 100, imageUrl: getImg('Jogoo Premium Maize Flour 2kg.jpg') },
      { category: 'Grains & Flour', name: 'Mwea Pishori Rice 5kg', sku: 'GRN-002', sellingPrice: 1400, stock: 45, imageUrl: getImg('Mwea Pishori Rice 5kg.jpg') },
      { category: 'Household & Essentials', name: 'Omo Fast Action Laundry Detergent', sku: 'HSH-001', sellingPrice: 250, stock: 60, imageUrl: getImg('Omo Fast Action Laundry Detergent.jpg') },
      { category: 'Household & Essentials', name: 'Toilet Tissue (10 Pack)', sku: 'HSH-003', sellingPrice: 450, stock: 85, imageUrl: getImg('Toilet Tissue (10 Pack).jpg') },
    ];

    await db.insert(schema.products).values(
      productsData.map(p => ({
        tenantId: tenant.id,
        categoryId: catId(p.category),
        name: p.name,
        sku: p.sku,
        sellingPrice: p.sellingPrice.toString(),
        costPrice: (p.sellingPrice * 0.7).toFixed(2), // Added missing costPrice
        stock: p.stock,
        minimumStock: 10,
        imageUrl: p.imageUrl
      } as any))
    );
    console.log(`✅ Retail product catalog populated.`);

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

seed();