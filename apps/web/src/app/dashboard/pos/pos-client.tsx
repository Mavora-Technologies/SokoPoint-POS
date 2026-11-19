'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Loader2,
  CheckCircle2,
  Banknote,
  Smartphone,
  Printer,
  X,
  ChevronUp,
  User,
} from 'lucide-react';
import api from '../../../lib/api';

interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  sellingPrice: string | number;
  wholesalePrice?: string | number;
  price?: string | number;
  stock: number;
  minimumStock?: number;
  reorderLevel?: number;
  imageUrl?: string;
}

interface CartItem {
  cartId: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  maxStock: number;
}

interface ReceiptData {
  receiptNumber: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  taxableBase: number;
  tax: number;
  method: string;
  amountTendered?: number;
  change?: number;
  date: string;
  time: string;
  cashierName: string;
  customerName: string;
  isRefund: boolean;
  businessName: string;
  branchName: string;
  currency: string;
}

export default function POSClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'M-Pesa' | 'Card'>('Cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [isRefundMode, setIsRefundMode] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');

  // Dynamic tenant context resolved from server (/auth/me)
  const [cashierName, setCashierName] = useState('Cashier');
  const [businessName, setBusinessName] = useState('SokoPoint Retail');
  const [branchName, setBranchName] = useState('Main Branch');
  const [currency, setCurrency] = useState('KES');
  const [customerName, setCustomerName] = useState('Walk-in Customer');

  const searchInputRef = useRef<HTMLInputElement>(null);

  const getProductImageUrl = (product: Product): string => {
    if (product.imageUrl && !product.imageUrl.includes('placehold.co')) {
      return product.imageUrl;
    }
    return `/products/${product.name}.jpg`;
  };

  const getPlaceholderImage = (name: string): string =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f1f5f9&color=64748b&size=200`;

  const loadPosContext = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, productsRes] = await Promise.all([
        api.get('/auth/me').catch(() => null),
        api.get('/products'),
      ]);

      const profile = meRes?.data?.data;
      if (profile) {
        if (profile.name) setCashierName(profile.name);
        if (profile.businessName) setBusinessName(profile.businessName);
        if (profile.branchName) setBranchName(profile.branchName);
        if (profile.currency) setCurrency(profile.currency);
      }

      const rawList = Array.isArray(productsRes.data?.data)
        ? productsRes.data.data
        : Array.isArray(productsRes.data)
        ? productsRes.data
        : [];

      setProducts(rawList);
    } catch (error) {
      console.error('Failed to load POS catalog:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      loadPosContext();
    }
  }, [isMounted, loadPosContext]);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center w-full bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#0554F4]" />
      </div>
    );
  }

  const getUnitPrice = (product: Product): number =>
    Number(product.sellingPrice ?? product.price ?? 0);

  const addToCart = (product: Product) => {
    const unitPrice = getUnitPrice(product);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      alert('This product does not have a valid selling price configured.');
      return;
    }

    const availableStock = Number(product.stock ?? 0);
    if (availableStock <= 0 && !isRefundMode) {
      alert('This product is out of stock!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= availableStock && !isRefundMode) {
          alert(`Only ${availableStock} units available in stock!`);
          return prev;
        }
        const nextQty = existing.quantity + 1;
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: nextQty, subtotal: nextQty * unitPrice }
            : item
        );
      }

      return [
        ...prev,
        {
          cartId: crypto.randomUUID(),
          productId: product.id,
          name: product.name,
          sku: product.sku || '',
          quantity: 1,
          unitPrice,
          subtotal: unitPrice,
          maxStock: availableStock,
        },
      ];
    });
  };

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const match = products.find(
        (p) =>
          p.barcode?.toLowerCase() === q ||
          p.sku?.toLowerCase() === q ||
          p.id.toLowerCase() === q
      );
      if (match) {
        addToCart(match);
        setSearchQuery('');
      }
    }
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartId !== cartId) return item;
          const nextQty = item.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > item.maxStock && !isRefundMode) {
            alert(`Only ${item.maxStock} units available in stock!`);
            return item;
          }
          return { ...item, quantity: nextQty, subtotal: nextQty * item.unitPrice };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Totals (Standard 16% KRA VAT — no catering levy)
  const rawSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartSubtotal = isRefundMode ? -Math.abs(rawSubtotal) : rawSubtotal;
  const taxRate = 0.16;
  const taxableBaseNet = cartSubtotal / (1 + taxRate);
  const cartTax = taxableBaseNet * taxRate;
  const cartTotal = cartSubtotal;

  const tendered = parseFloat(amountTendered) || 0;
  const isCashShort = paymentMethod === 'Cash' && !isRefundMode && tendered < cartTotal - 0.01;
  const changeDue =
    paymentMethod === 'Cash' && tendered > cartTotal && !isRefundMode ? tendered - cartTotal : 0;
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (isCashShort) {
      alert('Amount tendered cannot be less than the total amount.');
      return;
    }

    setProcessing(true);

    try {
      const receiptNum = `SOKO-${Math.floor(Math.random() * 900000) + 100000}`;
      const normalizedMethod =
        paymentMethod === 'M-Pesa' ? 'mpesa' : paymentMethod.toLowerCase();

      const payload = {
        orderNum: receiptNum,
        customer: customerName.trim() || 'Walk-in Customer',
        total: cartTotal,
        method: normalizedMethod,
        isRefund: isRefundMode,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: isRefundMode ? -Math.abs(item.quantity) : item.quantity,
          price: item.unitPrice,
        })),
      };

      await api.post('/orders', payload);

      const now = new Date();
      setReceipt({
        receiptNumber: receiptNum,
        items: [...cart],
        total: Math.abs(cartTotal),
        subtotal: Math.abs(cartSubtotal),
        taxableBase: Math.abs(taxableBaseNet),
        tax: Math.abs(cartTax),
        method: paymentMethod,
        amountTendered: tendered,
        change: changeDue,
        date: now.toLocaleDateString('en-GB'),
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        cashierName,
        customerName: customerName.trim() || 'Walk-in Customer',
        isRefund: isRefundMode,
        businessName,
        branchName,
        currency,
      });

      setCart([]);
      setAmountTendered('');
      setIsRefundMode(false);
      setIsMobileCartOpen(false);
      await loadPosContext();
    } catch (error: any) {
      console.error('POS checkout failed:', error);
      alert(error?.response?.data?.message || 'Checkout failed. Server refused transaction.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (Number(p.stock ?? 0) <= 0 && !isRefundMode && !searchQuery) return true;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.barcode || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { margin: 0; }
              html, body { background: white; height: auto !important; overflow: visible !important; }
              header, aside { display: none !important; }
              #pos-layout { display: none !important; }
              #print-receipt-container {
                display: block !important;
                margin: 0 auto !important;
                width: ${paperSize === '80mm' ? '80mm' : '58mm'} !important;
                max-width: ${paperSize === '80mm' ? '80mm' : '58mm'} !important;
                box-shadow: none !important;
                font-family: monospace;
              }
            }
            .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          `,
        }}
      />

      <div
        id="pos-layout"
        className="flex flex-col lg:flex-row w-full bg-slate-50 relative print:hidden h-[calc(100vh-4rem)] overflow-hidden"
      >
        {/* LEFT PANEL: Product Catalog */}
        <div className="flex flex-col w-full lg:flex-1 h-full overflow-hidden bg-white lg:border-r lg:border-slate-200">
          <div className="p-3 sm:p-4 border-b border-slate-200 bg-white z-10 shrink-0 shadow-sm flex flex-col sm:flex-row gap-2.5 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan Barcode, SKU, or Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeScan}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0554F4] focus:border-[#0554F4] focus:bg-white transition-all text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <button
              onClick={() => setIsRefundMode(!isRefundMode)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isRefundMode
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              {isRefundMode ? '🔴 Refund Mode' : 'Return / Refund'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-4 custom-scrollbar bg-slate-50/50">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-[#0554F4]" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <ShoppingCart className="h-16 w-16 mb-4 text-slate-300" />
                <p className="text-lg font-medium">No products found.</p>
                <p className="text-xs text-slate-400 mt-1">
                  Add products in your inventory catalog or adjust your search.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredProducts.map((product) => {
                  const qty = Number(product.stock ?? 0);
                  const itemPrice = getUnitPrice(product);
                  const isOutOfStock = qty <= 0;
                  const lowStockLimit = Number(product.reorderLevel || product.minimumStock || 5);
                  const imgSrc = getProductImageUrl(product);

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock && !isRefundMode}
                      className={`group flex flex-col text-left rounded-2xl border transition-all bg-white overflow-hidden ${
                        isOutOfStock && !isRefundMode
                          ? 'border-red-100 opacity-60 cursor-not-allowed'
                          : `border-slate-200 hover:shadow-xl active:scale-[0.98] ${
                              isRefundMode ? 'hover:border-red-500' : 'hover:border-[#0554F4]'
                            }`
                      }`}
                    >
                      <div className="aspect-[4/3] w-full bg-slate-50 relative overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={imgSrc}
                          alt={product.name}
                          className="object-cover w-full h-full bg-white transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const step = target.dataset.fallbackStep || '0';
                            if (step === '0') {
                              target.dataset.fallbackStep = '1';
                              target.src = `/products/${product.name.replace(/\s+/g, '')}.jpg`;
                            } else if (step === '1') {
                              target.dataset.fallbackStep = '2';
                              target.src = `/products/${product.name}.png`;
                            } else if (!target.src.includes('ui-avatars.com')) {
                              target.src = getPlaceholderImage(product.name);
                            }
                          }}
                        />
                        {isOutOfStock && !isRefundMode && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 flex flex-col flex-1 w-full min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight mb-1.5 w-full">
                          {product.name}
                        </h3>
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="text-slate-400 truncate">{product.sku || 'SKU'}</span>
                          <span
                            className={`font-bold shrink-0 ${
                              qty <= lowStockLimit ? 'text-red-500' : 'text-slate-500'
                            }`}
                          >
                            Stock: {qty}
                          </span>
                        </div>
                        <div className="w-full flex items-center justify-between mt-auto pt-2.5 border-t border-slate-100">
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            {currency} {itemPrice.toLocaleString('en-US')}
                          </span>
                          <div
                            className={`h-7 w-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                              isRefundMode
                                ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
                                : 'bg-[#0554F4]/10 text-[#0554F4] group-hover:bg-[#0554F4] group-hover:text-white'
                            }`}
                          >
                            {isRefundMode ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
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

        {/* Mobile Floating Cart Trigger */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#041F56] text-white p-3.5 flex justify-between items-center shadow-2xl z-40 border-t border-[#176E84]/40">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="flex items-center justify-between w-full gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="bg-[#62C02A] p-2 rounded-xl text-white">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div className="text-left">
                <p className="text-[11px] text-[#8BCBF0] font-medium">{totalItemCount} items in cart</p>
                <p className="text-base font-black">
                  {currency} {cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-white/10 px-3 py-2 rounded-xl text-xs font-bold">
              <span>Checkout</span>
              <ChevronUp className="h-4 w-4" />
            </div>
          </button>
        </div>

        {/* RIGHT PANEL: Cart & Checkout */}
        <div
          className={`
            fixed lg:static inset-x-0 bottom-0 z-50 lg:z-20
            w-full lg:w-[380px] xl:w-[420px]
            h-[85vh] lg:h-full
            bg-white lg:shadow-2xl flex flex-col shrink-0
            transition-transform duration-300 ease-in-out
            ${isMobileCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            rounded-t-3xl lg:rounded-none border-t lg:border-t-0 border-slate-200
          `}
        >
          <div className="lg:hidden flex justify-center pt-2.5 pb-1 bg-slate-100 rounded-t-3xl">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          <div
            className={`p-3 sm:p-4 text-white flex justify-between items-center shrink-0 ${
              isRefundMode ? 'bg-[#4a1c1c]' : 'bg-[#041F56]'
            }`}
          >
            <h2 className="font-bold text-base flex items-center gap-2">
              <ShoppingCart className={`h-4 w-4 ${isRefundMode ? 'text-red-400' : 'text-[#05BBBB]'}`} />
              {isRefundMode ? 'Refund Order' : 'Current Order'}
            </h2>
            <div className="flex items-center gap-2">
              <span className="bg-white/10 px-3 py-1 rounded-lg text-xs font-bold tracking-wider">
                {totalItemCount} items
              </span>
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="lg:hidden text-slate-300 hover:text-white p-1"
                aria-label="Close cart"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Customer Reference Bar */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Walk-in Customer / Account Name"
              className="w-full bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-slate-50/50 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <ShoppingCart className="h-12 w-12 mb-3 text-slate-300" />
                <p className="font-bold text-sm text-slate-500">Cart is empty</p>
                <p className="text-xs text-slate-400 mt-1">Scan a barcode or tap a product to begin</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.cartId}
                  className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 transition-all hover:border-slate-300"
                >
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{item.name}</h4>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-auto border-t border-slate-50 pt-2">
                    <span className={`font-extrabold text-sm ${isRefundMode ? 'text-red-600' : 'text-slate-900'}`}>
                      {isRefundMode ? '-' : ''}
                      {currency} {item.subtotal.toLocaleString('en-US')}
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-100">
                      <button
                        onClick={() => updateQuantity(item.cartId, -1)}
                        className="h-7 w-7 flex items-center justify-center bg-white shadow-sm rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cartId, 1)}
                        className="h-7 w-7 flex items-center justify-center bg-white shadow-sm rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment & Totals Footer */}
          <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
            {!isRefundMode && (
              <div className="mb-3 lg:mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 lg:mb-2">
                  Payment Method
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'M-Pesa', 'Card'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center justify-center py-1.5 lg:py-2 px-2 rounded-xl border-2 transition-all ${
                        paymentMethod === method
                          ? 'border-[#0554F4] bg-[#0554F4]/10 text-[#0554F4]'
                          : 'border-slate-100 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {method === 'Cash' ? (
                        <Banknote className="h-4 w-4 mb-1" />
                      ) : method === 'M-Pesa' ? (
                        <Smartphone className="h-4 w-4 mb-1" />
                      ) : (
                        <CreditCard className="h-4 w-4 mb-1" />
                      )}
                      <span className="text-[11px] font-bold">{method}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isRefundMode && paymentMethod === 'Cash' && (
              <div className="flex gap-2 mb-3 lg:mb-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1.5 text-[9px] font-bold text-slate-400 uppercase">
                    Tendered
                  </span>
                  <input
                    type="number"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-16 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-[#0554F4] outline-none"
                  />
                </div>
                {tendered > cartTotal && (
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 flex flex-col justify-center text-right">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Change Due</span>
                    <span className="text-sm font-black text-[#62C02A]">
                      {currency} {changeDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1 mb-3 lg:mb-4 text-xs lg:text-sm">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Taxable Base Net</span>
                <span>
                  {currency} {taxableBaseNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>KRA VAT (16%)</span>
                <span>
                  {currency} {cartTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-lg lg:text-xl font-black text-slate-900 pt-2 border-t border-slate-200 mt-2">
                <span>Total Paid</span>
                <span className={isRefundMode ? 'text-red-600' : 'text-[#62C02A]'}>
                  {currency} {cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || processing || isCashShort}
              className={`w-full py-3 lg:py-3.5 text-white text-sm font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isRefundMode ? 'bg-red-500 hover:bg-red-600' : 'bg-[#62C02A] hover:bg-[#57ad25]'
              }`}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {processing ? 'Processing...' : isRefundMode ? 'Process Refund' : 'Complete Checkout'}
            </button>
          </div>
        </div>
      </div>

      {/* DYNAMIC TENANT RECEIPT OVERLAY */}
      {receipt && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 print:static print:bg-transparent print:p-0">
          <div className="bg-slate-100 border border-slate-300 rounded-3xl p-6 shadow-2xl w-full max-w-sm flex flex-col relative print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-none print:w-auto">
            <div className="flex justify-between items-center mb-6 print:hidden">
              <div className="flex bg-slate-200 p-1 rounded-lg">
                <button
                  onClick={() => setPaperSize('80mm')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${
                    paperSize === '80mm' ? 'bg-[#041F56] text-white' : 'text-slate-500'
                  }`}
                >
                  80mm Roll
                </button>
                <button
                  onClick={() => setPaperSize('58mm')}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${
                    paperSize === '58mm' ? 'bg-[#041F56] text-white' : 'text-slate-500'
                  }`}
                >
                  58mm Roll
                </button>
              </div>
              <button
                onClick={() => setReceipt(null)}
                className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5 shadow-sm border border-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              id="print-receipt-container"
              className="bg-white rounded-sm border border-slate-200 p-4 font-mono text-[11px] leading-tight text-black mx-auto overflow-hidden shadow-inner print:border-none print:shadow-none print:p-0"
              style={{ width: paperSize }}
            >
              <div className="text-center space-y-1 mb-4">
                <h1 className="font-extrabold text-[13px] uppercase tracking-wide">
                  {receipt.businessName}
                </h1>
                <p className="font-bold text-[10px]">{receipt.branchName}</p>
                <p className="font-bold text-[11px] mt-3">{receipt.receiptNumber}</p>
                <p className="font-medium text-[10px]">
                  {receipt.date} {receipt.time} | POS Terminal
                </p>
              </div>

              <div className="flex justify-between font-medium text-[10px] border-b border-dashed border-black pb-2 mb-2">
                <div className="flex flex-col">
                  <span>Customer:</span>
                  <span>Cashier:</span>
                </div>
                <div className="flex flex-col text-right font-bold">
                  <span>{receipt.customerName}</span>
                  <span>{receipt.cashierName}</span>
                </div>
              </div>

              {receipt.isRefund && (
                <div className="text-center font-bold text-red-600 mb-2 uppercase tracking-widest text-[12px]">
                  *** REFUND ORDER ***
                </div>
              )}

              <div className="space-y-1.5 mb-3 border-b border-dashed border-black pb-3">
                {receipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start font-medium text-[10px]">
                    <div className="pr-2">
                      <p>
                        {Math.abs(item.quantity)}x {item.name}
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      {item.subtotal < 0 ? '-' : ''}
                      {Math.abs(item.subtotal).toLocaleString('en-US')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 font-medium text-[10px] border-b border-dashed border-black pb-2 mb-2">
                <div className="flex justify-between">
                  <span>Taxable Base Net:</span>
                  <span>
                    {receipt.currency}{' '}
                    {receipt.taxableBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>KRA VAT (16%):</span>
                  <span>
                    {receipt.currency}{' '}
                    {receipt.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex justify-between font-extrabold text-[12px] pb-2 border-b border-dashed border-black mb-2 uppercase">
                <span>TOTAL PAID:</span>
                <span>
                  {receipt.currency} {receipt.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1 font-medium text-[10px] border-b border-dashed border-black pb-3 mb-4">
                <div className="flex justify-between">
                  <span>Tender Type:</span>
                  <span className="uppercase font-bold">{receipt.method}</span>
                </div>
                {receipt.method === 'Cash' && !receipt.isRefund && (
                  <>
                    <div className="flex justify-between">
                      <span>Cash Tendered:</span>
                      <span>
                        {receipt.currency}{' '}
                        {(receipt.amountTendered || 0).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change Returned:</span>
                      <span>
                        {receipt.currency}{' '}
                        {(receipt.change || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="text-center font-medium text-[9px] mt-4 opacity-80 leading-relaxed">
                Thank you for shopping with {receipt.businessName}. Please retain this receipt for
                exchanges or returns per store policy.
              </div>
            </div>

            <div className="flex gap-3 mt-6 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#041F56] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Printer className="h-4 w-4" /> Print ({paperSize})
              </button>
              <button
                onClick={() => setReceipt(null)}
                className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}