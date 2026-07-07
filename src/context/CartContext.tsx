import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CartItem, Product, ProductVariant } from '../types';

// ── Coupon types ──────────────────────────────────────────────────────────────
type CouponDiscount =
  | { type: 'flat';    value: number }
  | { type: 'percent'; value: number };

const COUPONS: Record<string, CouponDiscount> = {
  'new1k':       { type: 'flat',    value: 1000 },
  'bulk2000':    { type: 'flat',    value: 2000 },
  'welfare1000': { type: 'flat',    value: 1000 },
  'rajath':      { type: 'percent', value: 10   },
  'new500':      { type: 'flat',    value: 500  },
  'goodwill600': { type: 'flat',    value: 600  },
  'bacwater400': { type: 'flat',    value: 400  },
  'bacwater800': { type: 'flat',    value: 800  },
  'student':     { type: 'flat',    value: 500  },
};

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant: ProductVariant) => void;
  removeFromCart: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getSubtotal: () => number;
  getDiscount: () => number;
  getDiscountAmount: () => number;
  // coupon
  couponCode: string | null;
  couponDiscount: CouponDiscount | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
  removeCoupon: () => void;
  getCouponAmount: () => number;
  // drawer
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [couponCode,     setCouponCode]     = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<CouponDiscount | null>(null);
  const [isCartOpen,     setIsCartOpen]     = useState(false);

  const openCart  = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const addToCart = (product: Product, variant: ProductVariant) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.variant.id === variant.id
      );

      if (existingItem) {
        return prevCart.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...prevCart, { product, variant, quantity: 1 }];
    });
  };

  const removeFromCart = (variantId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.variant.id !== variantId));
  };

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.variant.id === variantId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const isBacWater = (name: string) =>
    name.toLowerCase().includes('bacteriostatic water');

  const getSubtotal = () =>
    cart.reduce((total, item) => total + item.variant.price_inr * item.quantity, 0);

  // Subtotal of peptide items only (BAC water excluded from discount)
  const getDiscountableSubtotal = () =>
    cart.reduce((total, item) =>
      isBacWater(item.product.name) ? total : total + item.variant.price_inr * item.quantity
    , 0);

  // Count of distinct peptide products (bac water never counts)
  const getDistinctPeptides = () =>
    new Set(
      cart.filter(item => !isBacWater(item.product.name)).map(item => item.product.id)
    ).size;

  // 5% discount: only when 2+ different peptide products are in the cart.
  // Buying one product in a 3/4/5-vial pack does NOT qualify; bac water is
  // allowed in the cart but doesn't count toward the two-product requirement.
  const getDiscount = (): number => {
    return getDistinctPeptides() >= 2 ? 5 : 0;
  };

  const getDiscountAmount = () => {
    const pct = getDiscount();
    if (pct === 0) return 0;
    return Math.round((getDiscountableSubtotal() * pct) / 100);
  };

  // ── Coupon methods ──────────────────────────────────────────────────────────
  const applyCoupon = (code: string): { success: boolean; message: string } => {
    const found = COUPONS[code.trim().toLowerCase()];
    if (!found) {
      return { success: false, message: 'Invalid coupon code' };
    }
    setCouponCode(code.trim());
    setCouponDiscount(found);
    return { success: true, message: 'Coupon applied!' };
  };

  const removeCoupon = () => {
    setCouponCode(null);
    setCouponDiscount(null);
  };

  const getCouponAmount = (): number => {
    if (!couponDiscount) return 0;
    const base = getSubtotal() - getDiscountAmount(); // post-volume-discount total
    if (couponDiscount.type === 'flat') {
      return Math.min(couponDiscount.value, base); // never make total negative
    }
    return Math.round((base * couponDiscount.value) / 100);
  };

  const getTotal = () => {
    return getSubtotal() - getDiscountAmount() - getCouponAmount();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotal,
        getSubtotal,
        getDiscount,
        getDiscountAmount,
        couponCode,
        couponDiscount,
        applyCoupon,
        removeCoupon,
        getCouponAmount,
        isCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
