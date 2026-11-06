'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Loader2, CheckCircle2, Banknote, Smartphone, Printer, X, Image as ImageIcon } from 'lucide-react';
import api from '../../../lib/api';

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: string | number;
  price?: string | number;
  stock: number;
  minimumStock?: number;
  imageUrl?: string;
}

interface CartItem extends Product {
  cartId: string;
  quantity: number;
}

interface ReceiptData {
  receiptNumber: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  taxableBase: number;
  tax: number; // 16% VAT
  cateringLevy: number; // 2% Levy
  method: string;
  amountTendered?: number;
  change?: number;
  date: string;
  time: string;
  cashierName: string;
  customerName: string;
  isRefund: boolean;
}

export default function POSClient() {
  const [isMounted, setIsMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'card'>('cash');
  
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState<string>('');
  const [isRefundMode, setIsRefundMode] = useState<boolean>(false);
  
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [cashierName, setCashierName] = useState<string>('Mavora Technologies');
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('vora_user') || localStorage.getItem('smartcare_user') : null;
    if (storedUser) {
      try {
        const userObj = JSON.parse(storedUser);
        if (userObj.name) setCashierName(userObj.name);
      } catch (e) {}
    }
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
    if (Number(product.stock) <= 0 && !isRefundMode) {
      alert('This product is out of stock!');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.stock) && !isRefundMode) {
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

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery) {
      const match = filteredProducts.find(p => 
        p.sku?.toLowerCase() === searchQuery.toLowerCase() ||
        p.id.toString() === searchQuery
      );
      if (match) {
        addToCart(match);
        setSearchQuery('');
      }
    }
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return null;
          if (newQuantity > Number(item.stock) && !isRefundMode) {
            alert(`Only ${item.stock} items available in stock!`);
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  // Calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + (Number(item.sellingPrice || item.price || 0) * item.quantity), 0);
  const cartSubtotal = isRefundMode ? -Math.abs(rawSubtotal) : rawSubtotal;
  
  const taxRate = 0.16;
  const levyRate = 0.02;
  const combinedRate = taxRate + levyRate;
  
  const taxableBaseNet = cartSubtotal / (1 + combinedRate);
  const cartTax = taxableBaseNet * taxRate;
  const cartLevy = taxableBaseNet * levyRate;
  const cartTotal = cartSubtotal; 
  
  const tendered = parseFloat(amountTendered) || 0;
  const changeDue = paymentMethod === 'cash' && tendered > cartTotal && !isRefundMode ? tendered - cartTotal : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'cash' && tendered < cartTotal && !isRefundMode) {
      alert('Amount tendered cannot be less than the total amount.');
      return;
    }

    setIsProcessing(true);

    try {
      const receiptNum = `SOKO-${Math.floor(Math.random() * 900000) + 100000}`;
      const orderItems = cart.map(item => ({
        productId: item.id,
        quantity: isRefundMode ? -item.quantity : item.quantity,
        price: Number(item.sellingPrice || item.price || 0)
      }));

      await api.post('/orders', {
        orderNum: receiptNum,
        customer: customerName,
        total: cartTotal,
        method: paymentMethod,
        items: orderItems
      });

      const now = new Date();
      setReceipt({
        receiptNumber: receiptNum,
        items: [...cart],
        total: Math.abs(cartTotal),
        subtotal: Math.abs(cartSubtotal),
        taxableBase: Math.abs(taxableBaseNet),
        tax: Math.abs(cartTax),
        cateringLevy: Math.abs(cartLevy),
        method: paymentMethod,
        amountTendered: tendered,
        change: changeDue,
        date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        cashierName,
        customerName,
        isRefund: isRefundMode
      });

      setCart([]);
      setAmountTendered('');
      setMpesaPhone('');
      setIsRefundMode(false);
      await loadProducts();
    } catch (error) {
      console.error('Failed to complete sale:', error);
      alert('Failed to complete checkout. Please try again.');
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
        `
      }} />

      <div id="pos-layout" className="flex flex-col lg:flex-row w-full bg-slate-50 relative print:hidden lg:h-[calc(100vh-4rem)]">
        
        {/* LEFT PANEL: Product Grid */}
        <div className="flex flex-col w-full lg:flex-1 h-[55vh] lg:h-full overflow-hidden bg-white border-b-8 border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-200 shrink-0">
          
          <div className="p-3 sm:p-4 lg:p-5 xl:p-6 border-b border-slate-200 bg-white z-10 shrink-0 shadow-sm flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan Barcode, SKU, or Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleBarcodeScan}
                className="w-full pl-12 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600 focus:border-green-600 focus:bg-white transition-all text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            <button 
              onClick={() => setIsRefundMode(!isRefundMode)}
              className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${isRefundMode ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`}
            >
              {isRefundMode ? '🔴 Refund Mode' : 'Return / Refund'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 xl:p-6 custom-scrollbar bg-slate-50/50">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-green-600" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <ShoppingCart className="h-16 w-16 mb-4 text-slate-300" />
                <p className="text-base sm:text-lg font-medium">No products found</p>
                <p className="text-sm mt-1 text-slate-400">Try adjusting your search query</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
                {filteredProducts.map((product) => {
                  const hasRealImageInDB = product.imageUrl && !product.imageUrl.includes('placehold.co');
                  const displayImage = hasRealImageInDB ? product.imageUrl : `/products/${product.name}.png`;
                  const isOutOfStock = Number(product.stock) <= 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      disabled={isOutOfStock && !isRefundMode}
                      className={`group flex flex-col text-left rounded-2xl border transition-all bg-white overflow-hidden ${
                        isOutOfStock && !isRefundMode
                          ? 'border-red-100 opacity-60 cursor-not-allowed' 
                          : `border-slate-200 hover:shadow-xl active:scale-[0.98] ${isRefundMode ? 'hover:border-red-500' : 'hover:border-green-600'}`
                      }`}
                    >
                      <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden flex items-center justify-center shrink-0">
                        <img 
                          src={displayImage} 
                          alt={product.name}
                          className="object-cover w-full h-full bg-white transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src.endsWith('.png')) {
                              target.src = target.src.replace('.png', '.jpg');
                            } else {
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }
                          }}
                        />
                        <div className="absolute inset-0 text-slate-300 hidden items-center justify-center">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                        {isOutOfStock && !isRefundMode && (
                          <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center z-10">
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">Out of Stock</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 sm:p-4 flex flex-col flex-1 w-full min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight mb-2 w-full">{product.name}</h3>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-400 font-medium truncate mr-2">{product.sku || 'NO SKU'}</span>
                          <span className={`text-[11px] font-bold shrink-0 ${Number(product.stock) <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                            Stock: {product.stock}
                          </span>
                        </div>
                        <div className="w-full flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                          <span className="font-extrabold text-sm text-slate-900 truncate">
                            KES {Number(product.sellingPrice || product.price || 0).toLocaleString('en-US')}
                          </span>
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${isRefundMode ? 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white' : 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white'}`}>
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

        {/* RIGHT PANEL: Cart & Checkout */}
        <div className="flex flex-col w-full lg:w-[400px] xl:w-[440px] h-auto lg:h-full bg-white lg:shadow-2xl z-20 shrink-0">
          
          <div className={`p-4 lg:p-5 text-white flex justify-between items-center shrink-0 ${isRefundMode ? 'bg-red-950' : 'bg-green-950'}`}>
            <h2 className="font-bold text-lg flex items-center gap-3">
              <ShoppingCart className={`h-5 w-5 ${isRefundMode ? 'text-red-400' : 'text-green-400'}`} /> 
              {isRefundMode ? 'Refund Order' : 'Current Order'}
            </h2>
            <span className="bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider">{cart.length} items</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 custom-scrollbar bg-slate-50/50 space-y-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <ShoppingCart className="h-16 w-16 mb-4 text-slate-300" />
                <p className="font-bold text-lg text-slate-500">Cart is empty</p>
                <p className="mt-1 text-slate-400 text-sm">Select products to add them to the order</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartId} className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3 transition-all hover:border-slate-300">
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.cartId)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-auto border-t border-slate-50 pt-3">
                    <span className={`font-extrabold text-sm ${isRefundMode ? 'text-red-600' : 'text-slate-900'}`}>
                      {isRefundMode ? '-' : ''}KES {(Number(item.sellingPrice || item.price || 0) * item.quantity).toLocaleString('en-US')}
                    </span>
                    <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1.5 border border-slate-100">
                      <button onClick={() => updateQuantity(item.cartId, -1)} className="h-8 w-8 flex items-center justify-center bg-white shadow-sm rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95"><Minus className="h-4 w-4" /></button>
                      <span className="text-sm font-bold w-8 text-center text-slate-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartId, 1)} className="h-8 w-8 flex items-center justify-center bg-white shadow-sm rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-10">
            {!isRefundMode && (
              <div className="mb-5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'mpesa', 'card'] as const).map(method => (
                    <button key={method} onClick={() => setPaymentMethod(method)}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border-2 transition-all capitalize ${paymentMethod === method ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-100 text-slate-500 hover:bg-slate-50'}`}
                    >
                      {method === 'cash' ? <Banknote className="h-5 w-5 mb-1.5" /> : method === 'mpesa' ? <Smartphone className="h-5 w-5 mb-1.5" /> : <CreditCard className="h-5 w-5 mb-1.5" />}
                      <span className="text-xs font-bold">{method}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isRefundMode && paymentMethod === 'cash' && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-2 text-[10px] font-bold text-slate-400 uppercase">Tendered</span>
                  <input type="number" value={amountTendered} onChange={e => setAmountTendered(e.target.value)} placeholder="0.00" className="w-full pl-20 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-1 focus:ring-green-600 outline-none" />
                </div>
                {tendered > cartTotal && (
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 flex flex-col justify-center text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Change Due</span>
                    <span className="text-sm font-black text-green-600">KES {changeDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 mb-5 text-sm">
              <div className="flex justify-between text-slate-500 font-medium"><span>Taxable Base Net</span><span>KES {taxableBaseNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-slate-500 font-medium"><span>KRA VAT (16%)</span><span>KES {cartTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-slate-500 font-medium"><span>Catering Levy (2%)</span><span>KES {cartLevy.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-xl font-black text-slate-900 pt-3 border-t border-slate-200 mt-3">
                <span>Total Paid</span>
                <span className={isRefundMode ? 'text-red-600' : 'text-green-600'}>KES {cartTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing || (!isRefundMode && paymentMethod === 'cash' && tendered < cartTotal)}
              className={`w-full py-4 text-white text-base font-bold rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isRefundMode ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {isProcessing ? 'Processing Transaction...' : isRefundMode ? 'Process Refund' : 'Complete Checkout'}
            </button>
          </div>
        </div>
      </div>

      {/* RECEIPT MODAL */}
      {receipt && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 print:static print:bg-transparent print:p-0">
          <div className="bg-slate-100 border border-slate-300 rounded-3xl p-6 shadow-2xl w-full max-w-sm flex flex-col relative print:border-none print:shadow-none print:p-0 print:bg-white print:max-w-none print:w-auto">
            
            <div className="flex justify-between items-center mb-6 print:hidden">
              <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setPaperSize('80mm')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${paperSize === '80mm' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>80mm Roll</button>
                <button onClick={() => setPaperSize('58mm')} className={`text-[10px] font-bold px-3 py-1.5 rounded-md transition-colors ${paperSize === '58mm' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>58mm Roll</button>
              </div>
              <button onClick={() => setReceipt(null)} className="text-slate-400 hover:text-slate-700 bg-white rounded-full p-1.5 shadow-sm border border-slate-200"><X className="h-5 w-5" /></button>
            </div>

            <div id="print-receipt-container" className="bg-white rounded-sm border border-slate-200 p-4 font-mono text-[11px] leading-tight text-black mx-auto overflow-hidden shadow-inner print:border-none print:shadow-none print:p-0" style={{ width: paperSize }}>
              
              <div className="text-center space-y-1 mb-4">
                <h1 className="font-extrabold text-[13px] uppercase tracking-wide">SOKOPOINT RETAIL</h1>
                <p className="font-bold text-[10px]">Mavora Technologies Ltd</p>
                <p className="font-medium text-[10px]">Kilimani, Nairobi, Kenya</p>
                <p className="font-medium text-[10px] mt-1">VAT PIN: P051234567Z</p>
                <p className="font-medium text-[10px]">eTIMS CU Serial: KRA-ETIMS-0082914-2026</p>
                
                <p className="font-bold text-[11px] mt-3">{receipt.receiptNumber}</p>
                <p className="font-medium text-[10px]">{receipt.date} - {receipt.time} | Terminal 1</p>
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

              {receipt.isRefund && <div className="text-center font-bold text-red-600 mb-2 uppercase tracking-widest text-[12px]">*** REFUND ORDER ***</div>}

              <div className="space-y-1.5 mb-3 border-b border-dashed border-black pb-3">
                {receipt.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-start font-medium text-[10px]">
                    <div className="pr-2">
                      <p>{Math.abs(item.quantity)}x {item.name}</p>
                    </div>
                    <div className="whitespace-nowrap text-right">
                      {item.sellingPrice ? Number(item.sellingPrice) * item.quantity < 0 ? '-' : '' : ''}
                      {Math.abs((Number(item.sellingPrice || item.price || 0)) * item.quantity).toLocaleString('en-US')}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 font-medium text-[10px] border-b border-dashed border-black pb-2 mb-2">
                <div className="flex justify-between"><span>Taxable Base Net:</span> <span>KES {receipt.taxableBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span>KRA VAT (16%):</span> <span>KES {receipt.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span>Catering Levy (2%):</span> <span>KES {receipt.cateringLevy.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span>Total Discount:</span> <span>-KES 0.00</span></div>
              </div>

              <div className="flex justify-between font-extrabold text-[12px] pb-2 border-b border-dashed border-black mb-2 uppercase">
                <span>TOTAL PAID:</span>
                <span>KES {receipt.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="space-y-1 font-medium text-[10px] border-b border-dashed border-black pb-3 mb-4">
                <div className="flex justify-between"><span>Tender Type:</span> <span className="uppercase font-bold">{receipt.method}</span></div>
                {receipt.method === 'cash' && !receipt.isRefund && (
                  <>
                    <div className="flex justify-between"><span>Cash Tendered:</span> <span>KES {(receipt.amountTendered || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex justify-between"><span>Change Returned:</span> <span>KES {(receipt.change || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                  </>
                )}
              </div>

              <div className="text-center font-medium text-[10px] space-y-2 mb-4">
                <p className="font-bold">Thank you for shopping at SokoPoint!</p>
                <p>Karibu tena!</p>
              </div>

              <div className="text-center font-bold text-[10px] space-y-2 pb-2">
                <p>NON-FISCAL RECEIPT</p>
                <p>FINAL FISCAL RECEIPT PROVIDED UPON CHECK-OUT</p>
                <p className="mt-2">*** END OF TAX INVOICE ***</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 print:hidden">
              <button onClick={() => window.print()} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                <Printer className="h-4 w-4" /> Print ({paperSize})
              </button>
              <button onClick={() => setReceipt(null)} className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}