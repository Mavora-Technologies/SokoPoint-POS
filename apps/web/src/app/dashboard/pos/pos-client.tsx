'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Loader2, CheckCircle2, Banknote, Smartphone, Printer, X, Image as ImageIcon } from 'lucide-react';
import api from '../../../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string | number;
  stock: number;
  minimumStock?: number;
  imageUrl?: string;
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

export default function POSClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'cash'>('mpesa');
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const response = await api.get('/products');
      const rawList = Array.isArray(response.data?.data) 
        ? response.data.data 
        : Array.isArray(response.data) 
          ? response.data 
          : [];

      setProducts(rawList);
    } catch (error) {
      console.error('Failed to load products in POS:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      setIsLoading(true);
      loadProducts();
    }
  }, [isMounted, loadProducts]);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  const filteredProducts = products.filter((p) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addToCart = (product: Product) => {
    if (Number(product.stock) <= 0) {
      alert('This product is out of stock!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.stock)) {
          alert(`Only ${product.stock} items available in stock!`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartId: crypto.randomUUID(), quantity: 1 }];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          if (newQuantity > Number(item.stock)) {
            alert(`Only ${item.stock} items available in stock!`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (Number(item.sellingPrice) * item.quantity), 0);
  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      await Promise.all(
        cart.map(async (item) => {
          if (!item.id) {
            console.error('Cart item missing ID:', item);
            return;
          }

          const freshProduct = products.find((p) => p.id === item.id);
          const currentStock = freshProduct ? Number(freshProduct.stock) : Number(item.stock);
          const remainingStock = Math.max(0, currentStock - item.quantity);

          await api.put(`/products/${item.id}`, {
            stock: remainingStock,
          });
        })
      );

      const mockOrderNumber = `SOKO-${Math.floor(Math.random() * 1000000000)}`;
      setReceiptData({
        orderNumber: mockOrderNumber,
        date: new Date().toLocaleString(),
        items: [...cart],
        subtotal,
        tax,
        total,
        method: paymentMethod
      });

      setCart([]);
      await loadProducts();
    } catch (error) {
      console.error('Failed to complete sale and deduct stock:', error);
      alert('Checkout completed, but failed to deduct some stock in the database.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page { margin: 0; }
            html, body { background: white; height: auto !important; overflow: visible !important; }
            header { display: none !important; }
            #pos-layout { display: none !important; }
            #print-receipt-container { display: block !important; padding-top: 1cm; padding-bottom: 1cm; margin: 0 auto !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
          }
          .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `
      }} />

      {/* FLUID APPLICATION LAYOUT */}
      <div id="pos-layout" className="flex flex-col lg:flex-row w-full bg-slate-50 relative print:hidden lg:h-[calc(100vh-4rem)]">
        
        {/* LEFT PANEL: Product Grid */}
        <div className="flex flex-col w-full lg:flex-1 h-[55vh] lg:h-full overflow-hidden bg-white border-b-8 border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-200 shrink-0">
          
          {/* Flush Header */}
          <div className="p-3 sm:p-4 lg:p-5 xl:p-6 border-b border-slate-200 bg-white z-10 shrink-0 shadow-sm">
            <div className="relative max-w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 lg:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all text-sm sm:text-base lg:text-lg outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Fluid Scrolling Grid */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 xl:p-6 custom-scrollbar bg-slate-50/50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <ShoppingCart className="h-16 w-16 mb-4 text-slate-300" />
                <p className="text-base sm:text-lg lg:text-xl font-medium">No products found</p>
                <p className="text-sm mt-1 text-slate-400">Try adjusting your search query</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-7 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
                {filteredProducts.map((product) => {
                  const rawImageUrl = product.imageUrl?.trim();
                  let displayImage = null;
                  
                  if (rawImageUrl) {
                    displayImage = rawImageUrl.startsWith('http') || rawImageUrl.startsWith('/') 
                      ? rawImageUrl 
                      : `/products/${rawImageUrl}`;
                  } else if (product.name) {
                    displayImage = `/products/${product.name}.jpg`;
                  }

                  const isOutOfStock = Number(product.stock) <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock}
                      className={`group flex flex-col text-left rounded-2xl border transition-all bg-white overflow-hidden ${
                        isOutOfStock 
                          ? 'border-red-100 opacity-60 cursor-not-allowed' 
                          : 'border-slate-200 hover:border-green-500 hover:shadow-xl hover:shadow-green-600/10 active:scale-[0.98] touch-manipulation'
                      }`}
                    >
                      <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden flex items-center justify-center shrink-0">
                        {displayImage ? (
                          <img 
                            src={displayImage} 
                            alt={product.name}
                            className={`object-cover w-full h-full bg-white transition-transform duration-500 ${!isOutOfStock ? 'group-hover:scale-105' : ''}`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (!target.dataset.fallback) {
                                target.dataset.fallback = 'name';
                                target.src = `/products/${product.name}.jpg`;
                              } else if (target.dataset.fallback === 'name') {
                                target.dataset.fallback = 'sku';
                                target.src = `/products/${product.sku}.jpg`;
                              } else {
                                target.style.display = 'none';
                                if (target.nextElementSibling) {
                                  target.nextElementSibling.classList.remove('hidden');
                                }
                              }
                            }}
                          />
                        ) : null}
                        <div className={`absolute inset-0 text-slate-300 flex items-center justify-center ${displayImage ? 'hidden' : ''}`}>
                          <ImageIcon className="h-10 w-10 lg:h-12 lg:w-12" />
                        </div>
                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="bg-red-600 text-white text-xs lg:text-sm font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 sm:p-4 lg:p-5 flex flex-col flex-1 w-full min-w-0">
                        <div className="flex-1 mb-2">
                          <h3 className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 line-clamp-2 leading-tight group-hover:text-green-700 transition-colors w-full">
                            {product.name}
                          </h3>
                          <div className="flex justify-between items-center mt-1.5 lg:mt-2">
                            <p className="text-[11px] sm:text-xs lg:text-sm text-slate-400 font-medium tracking-wider truncate mr-2">
                              {product.sku || 'NO SKU'}
                            </p>
                            <span className={`text-[11px] sm:text-xs lg:text-sm font-bold shrink-0 ${Number(product.stock) <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>
                        <div className="w-full flex items-center justify-between mt-auto pt-3 border-t border-slate-100 group-hover:border-slate-200 transition-colors">
                          <span className="font-extrabold text-sm sm:text-base lg:text-lg text-slate-900 truncate">
                            KES {Number(product.sellingPrice || 0).toLocaleString('en-US')}
                          </span>
                          <div className={`h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 shrink-0 rounded-full flex items-center justify-center transition-all ${
                            isOutOfStock ? 'bg-slate-100 text-slate-400' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'
                          }`}>
                            <Plus className="h-4 w-4 lg:h-5 lg:w-5" />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Live Cart */}
        <div className="flex flex-col w-full lg:w-[400px] xl:w-[440px] 2xl:w-[480px] h-auto lg:h-full bg-white lg:shadow-2xl z-20 shrink-0">
          
          <div className="p-4 lg:p-5 xl:p-6 bg-green-950 text-white flex justify-between items-center shrink-0">
            <h2 className="font-bold text-base sm:text-lg lg:text-xl flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 lg:h-6 lg:w-6 text-green-400" /> Current Order
            </h2>
            <span className="bg-white/10 px-3 py-1.5 rounded-lg text-xs lg:text-sm font-bold tracking-wider">
              {cart.length} items
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 xl:p-6 custom-scrollbar bg-slate-50/50">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 lg:py-0">
                <div className="h-20 w-20 lg:h-24 lg:w-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                  <ShoppingCart className="h-10 w-10 lg:h-12 lg:w-12 text-slate-300" />
                </div>
                <p className="font-bold text-base lg:text-lg text-slate-500">Cart is empty</p>
                <p className="mt-1.5 text-slate-400 text-sm lg:text-base text-center px-4">Select products to add them to the order</p>
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                {cart.map((item) => (
                  <div key={item.cartId} className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 lg:gap-4 transition-all hover:border-slate-300 hover:shadow-md">
                    <div className="flex justify-between items-start gap-3">
                      <h4 className="font-bold text-sm sm:text-base lg:text-lg text-slate-900 leading-snug">{item.name}</h4>
                      <button 
                        onClick={() => removeFromCart(item.cartId)} 
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4 lg:h-5 lg:w-5" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-auto border-t border-slate-50 pt-3">
                      <span className="font-extrabold text-sm sm:text-base lg:text-lg text-slate-900">
                        KES {Number(item.sellingPrice || 0).toLocaleString('en-US')}
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                        <button onClick={() => updateQuantity(item.cartId, -1)} className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center bg-white shadow-sm rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95 touch-manipulation">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-sm lg:text-base font-bold w-8 lg:w-10 text-center text-slate-900">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.cartId, 1)} className="h-8 w-8 lg:h-10 lg:w-10 flex items-center justify-center bg-white shadow-sm rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95 touch-manipulation">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checkout Footer */}
          <div className="p-4 sm:p-5 lg:p-6 xl:p-8 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10 pb-8 lg:pb-6">
            <div className="mb-5 lg:mb-6">
              <p className="text-[11px] lg:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Method</p>
              <div className="grid grid-cols-3 gap-2 lg:gap-3">
                <button 
                  onClick={() => setPaymentMethod('cash')} 
                  className={`flex flex-col items-center justify-center py-2.5 lg:py-3 px-2 rounded-xl border-2 transition-all ${paymentMethod === 'cash' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'}`}
                >
                  <Banknote className="h-5 w-5 lg:h-6 lg:w-6 mb-1.5" />
                  <span className="text-xs lg:text-sm font-bold">Cash</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('mpesa')} 
                  className={`flex flex-col items-center justify-center py-2.5 lg:py-3 px-2 rounded-xl border-2 transition-all ${paymentMethod === 'mpesa' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'}`}
                >
                  <Smartphone className="h-5 w-5 lg:h-6 lg:w-6 mb-1.5" />
                  <span className="text-xs lg:text-sm font-bold">M-Pesa</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('card')} 
                  className={`flex flex-col items-center justify-center py-2.5 lg:py-3 px-2 rounded-xl border-2 transition-all ${paymentMethod === 'card' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200'}`}
                >
                  <CreditCard className="h-5 w-5 lg:h-6 lg:w-6 mb-1.5" />
                  <span className="text-xs lg:text-sm font-bold">Card</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5 lg:space-y-3 mb-5 lg:mb-6 text-sm lg:text-base">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Subtotal</span>
                <span className="text-slate-900 font-semibold">KES {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Tax (16%)</span>
                <span className="text-slate-900 font-semibold">KES {tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xl lg:text-2xl font-black text-slate-900 pt-4 border-t border-slate-200 mt-4">
                <span>Total</span>
                <span className="text-green-600">
                  KES {total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="w-full py-4 lg:py-5 text-white text-base lg:text-lg font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-xl disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 shadow-green-600/30 touch-manipulation"
            >
              {isProcessing ? <Loader2 className="h-5 w-5 lg:h-6 lg:w-6 animate-spin" /> : <CheckCircle2 className="h-5 w-5 lg:h-6 lg:w-6" />}
              {isProcessing ? 'Processing Transaction...' : 'Complete Checkout'}
            </button>
          </div>
        </div>
      </div>

      {/* FIXED RECEIPT MODAL - Now perfectly scrollable on any device and formatted for print */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar print:static print:bg-transparent print:overflow-visible">
          <div className="min-h-full flex items-center justify-center p-4 sm:p-6 lg:p-8 text-center print:p-0 print:block">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl text-left overflow-hidden my-auto relative print:shadow-none print:w-full print:max-w-full print:rounded-none" id="print-receipt-container">
              
              <div className="flex justify-end p-4 print:hidden border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                <button onClick={() => setReceiptData(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-2 shadow-sm border border-slate-200 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-8 lg:p-10 text-slate-900 bg-white">
                <div className="text-center mb-6 lg:mb-8">
                  <h2 className="font-extrabold text-2xl lg:text-3xl uppercase tracking-widest text-black">SOKOPOINT</h2>
                  <p className="text-sm lg:text-base font-medium mt-2 text-slate-600">123 Business Avenue, Nairobi</p>
                  <p className="text-sm lg:text-base font-medium text-slate-600">Tel: +254 700 000 000</p>
                  <div className="mt-6 text-xs lg:text-sm font-semibold border-y border-dashed border-slate-300 py-3 flex justify-between text-slate-500">
                    <span>Order: {receiptData.orderNumber}</span>
                    <span>{receiptData.date}</span>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-xs lg:text-sm font-bold uppercase tracking-widest border-b border-slate-200 pb-3 text-slate-400">
                    <span>Item</span>
                    <span>Amount</span>
                  </div>
                  {receiptData.items.map((item: CartItem) => (
                    <div key={item.cartId} className="flex justify-between text-sm lg:text-base font-medium">
                      <div className="flex flex-col pr-4">
                        <span className="font-bold">{item.name}</span>
                        <span className="text-xs lg:text-sm text-slate-500 mt-0.5">{item.quantity} x KES {Number(item.sellingPrice || 0).toLocaleString()}</span>
                      </div>
                      <span className="font-bold text-slate-700">{(Number(item.sellingPrice || 0) * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 pt-5 space-y-3 mb-8">
                  <div className="flex justify-between text-sm lg:text-base font-medium text-slate-600">
                    <span>Subtotal</span>
                    <span>{receiptData.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm lg:text-base font-medium text-slate-600">
                    <span>Tax (16%)</span>
                    <span>{receiptData.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xl lg:text-2xl font-black border-t border-slate-200 pt-4 mt-4 text-black">
                    <span>TOTAL</span>
                    <span>KES {receiptData.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs lg:text-sm font-bold pt-4 text-slate-400 uppercase tracking-wider">
                    <span>Paid via:</span>
                    <span>{receiptData.method}</span>
                  </div>
                </div>

                <div className="text-center mt-10">
                  <p className="font-bold text-sm lg:text-base text-slate-800">Thank you for your business!</p>
                </div>

                <div className="flex gap-3 mt-10 pt-6 border-t border-slate-100 print:hidden">
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 py-3.5 lg:py-4 bg-slate-900 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                  >
                    <Printer className="h-5 w-5" /> Print Receipt
                  </button>
                  <button 
                    onClick={() => setReceiptData(null)}
                    className="flex-1 py-3.5 lg:py-4 bg-green-50 text-green-700 font-bold rounded-2xl hover:bg-green-100 transition-colors border border-green-100"
                  >
                    New Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
