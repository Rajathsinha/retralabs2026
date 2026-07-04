import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, ShoppingBag, Tag, ChevronRight, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { getProductImageUrl, BAC_WATER_IMAGE_URL } from '../utils/imageUrl';

export default function CartDrawer() {
  const navigate = useNavigate();
  const {
    cart, removeFromCart, updateQuantity, clearCart,
    getSubtotal, getDiscountAmount, getDiscount, getCouponAmount, getTotal,
    couponCode, applyCoupon, removeCoupon, isCartOpen, closeCart,
  } = useCart();
  const { format } = useCurrency();

  const [couponInput,  setCouponInput]  = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [couponMsg,    setCouponMsg]    = useState('');

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    const result = applyCoupon(couponInput);
    setCouponStatus(result.success ? 'success' : 'error');
    setCouponMsg(result.message);
    if (result.success) setCouponInput('');
  }

  function handleCheckout() {
    closeCart();
    navigate('/checkout');
  }

  const drawer = (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9990] bg-slate-950/60 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer panel */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            className="fixed right-0 top-0 bottom-0 z-[9991] w-full sm:max-w-[420px] flex flex-col bg-white shadow-2xl"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-950">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white tracking-tight">Research Cart</h2>
                {totalItems > 0 && (
                  <span className="flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-cyan-500 text-white text-[11px] font-bold leading-none">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Body ── */}
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <p className="text-slate-700 font-semibold text-base">Your cart is empty</p>
                  <p className="text-slate-400 text-sm mt-1">Add a product to get started</p>
                </div>
                <button
                  onClick={closeCart}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
                >
                  Browse catalogue
                </button>
              </div>
            ) : (
              <>
                {/* Items list */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scroll-touch overscroll-contain">
                  {cart.map((item) => {
                    const config = item.variant.vial_configuration;
                    const label = config || `${item.variant.dosage_mg}mg`;
                    return (
                      <div key={item.variant.id} className="flex gap-3 px-4 py-4">
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          <img
                            src={getProductImageUrl(item.product.image_url, item.product.name)}
                            alt={item.product.name}
                            width={56}
                            height={56}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = BAC_WATER_IMAGE_URL; }}
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 leading-tight truncate">{item.product.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{label}</p>

                          {/* Qty controls */}
                          <div className="flex items-center gap-2 mt-2.5">
                            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
                              <button
                                onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-semibold text-slate-900 select-none">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Price + remove */}
                        <div className="flex flex-col items-end justify-between flex-shrink-0">
                          <button
                            onClick={() => removeFromCart(item.variant.id)}
                            className="p-1 text-slate-300 hover:text-red-400 transition-colors"
                            aria-label="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">
                              {format(item.variant.price_inr * item.quantity)}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-[10px] text-slate-400">{format(item.variant.price_inr)} each</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Footer ── */}
                <div className="border-t border-slate-100 bg-white px-4 pt-4 pb-5 space-y-3">

                  {/* 5% discount badge — always shown when peptides in cart */}
                  {getDiscount() > 0 && (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-200">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎉</span>
                        <div>
                          <p className="text-xs font-extrabold text-emerald-700 uppercase tracking-wide">5% Off — Applied!</p>
                          <p className="text-[10px] text-emerald-600">2+ different peptides · ₹9,000+ order</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-600">−{format(getDiscountAmount())}</span>
                    </div>
                  )}

                  {/* Coupon */}
                  {couponCode ? (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200">
                      <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        {couponCode.toUpperCase()} applied
                      </span>
                      <button onClick={removeCoupon} className="text-[10px] text-indigo-500 hover:text-red-500 font-semibold transition-colors">
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={e => { setCouponInput(e.target.value); setCouponStatus('idle'); }}
                          onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Coupon code"
                          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-slate-400 placeholder-slate-300"
                        />
                      </div>
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponInput.trim()}
                        className="px-3 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {couponStatus === 'error' && (
                    <p className="text-[11px] text-red-500 font-medium -mt-1">{couponMsg}</p>
                  )}

                  {/* Pricing breakdown */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span className="font-medium text-slate-700">{format(getSubtotal())}</span>
                    </div>
                    {getDiscountAmount() > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>5% discount</span>
                        <span className="font-semibold">−{format(getDiscountAmount())}</span>
                      </div>
                    )}
                    {getCouponAmount() > 0 && (
                      <div className="flex justify-between text-indigo-600">
                        <span>Coupon ({couponCode?.toUpperCase()})</span>
                        <span className="font-semibold">−{format(getCouponAmount())}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-500">
                      <span>Shipping</span>
                      <span className="font-semibold text-emerald-600">FREE</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-900 text-base">Total</span>
                      <span className="font-bold text-slate-900 text-xl">{format(getTotal())}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    onClick={handleCheckout}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-700 active:scale-[0.98] transition-all"
                  >
                    Proceed to Checkout
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Clear cart */}
                  <button
                    onClick={clearCart}
                    className="w-full text-center text-xs text-slate-400 hover:text-red-400 transition-colors py-1"
                  >
                    Clear cart
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(drawer, document.body);
}
