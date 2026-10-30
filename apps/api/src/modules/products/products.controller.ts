import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = (fileBuffer: Buffer): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'sokopoint-products' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const getProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Only fetch non-archived products for the active catalog
    const products = await prisma.product.findMany({ 
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' } 
    });
    res.status(200).json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while fetching products' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, sellingPrice, stock, sku } = req.body;
    let imageUrl = req.body.imageUrl;

    const file = (req as any).file;
    if (file && file.buffer) {
      const uploadResult = await uploadToCloudinary(file.buffer);
      imageUrl = uploadResult.secure_url;
    }

    const newProduct = await prisma.product.create({
      data: {
        name: String(name),
        category: category ? String(category) : 'General',
        sellingPrice: Number(sellingPrice) || 0,
        stock: Number(stock) || 0,
        sku: sku ? String(sku) : null,
        imageUrl: imageUrl ? String(imageUrl) : null,
      } as any
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ success: false, message: 'Server error while creating product' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id || req.query.id;
    const productId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required' });
      return;
    }

    const { name, category, sellingPrice, stock, sku, status }  = req.body;
    
    // ENFORCEMENT: Check if the product has historical sales
    const orderCount = await prisma.orderItem.count({ where: { productId: String(productId) } });
    
    if (orderCount > 0) {
      const currentProd = await prisma.product.findUnique({ where: { id: String(productId) } });
      if (currentProd) {
        // Prevent editing core identifiers to protect receipt accuracy
        const isNameChanged = name !== undefined && String(name) !== currentProd.name;
        const isSkuChanged = sku !== undefined && sku !== currentProd.sku && sku !== null;
        
        if (isNameChanged || isSkuChanged) {
          res.status(403).json({ 
            success: false, 
            message: 'Cannot edit the name or SKU of a product with historical sales. Please archive this product and create a new one.' 
          });
          return;
        }
      }
    }

    let imageUrl = req.body.imageUrl;
    const file = (req as any).file;
    if (file && file.buffer) {
      const uploadResult = await uploadToCloudinary(file.buffer);
      imageUrl = uploadResult.secure_url;
    }

    const updatedProduct = await prisma.product.update({
      where: { id: String(productId) },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(category !== undefined && { category: String(category) }),
        ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(sku !== undefined && { sku: String(sku) }),
        ...(status !== undefined && { status: String(status) }),
        ...(imageUrl !== undefined && { imageUrl: String(imageUrl) }),
      },
    });

    res.status(200).json({ success: true, data: updatedProduct });
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ success: false, message: 'Server error while updating product' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id || req.query.id;
    const productId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    
    // ENFORCEMENT: Never delete a product that has been sold
    const orderCount = await prisma.orderItem.count({ where: { productId } });

    if (orderCount > 0) {
      // Soft-delete / Archive instead
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'ARCHIVED' }
      });
      res.status(200).json({ 
        success: true, 
        message: 'Product archived successfully. It was not deleted to preserve historical sales data.' 
      });
      return;
    }

    // Safe to hard delete if no historical sales exist
    await prisma.product.delete({ where: { id: productId } });
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error while deleting product' });
  }
};