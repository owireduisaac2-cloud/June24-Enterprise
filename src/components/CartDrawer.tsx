import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import type { CartItem } from '../types';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  discountRate: number;
  onClose: () => void;
  onUpdateQty: (id: string, delta: number) => void;
  onApplyCoupon: (code: string) => boolean;
  onProceedCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  discountRate,
  onClose,
  onUpdateQty,
  onApplyCoupon,
  onProceedCheckout,
}: CartDrawerProps) {
  const [couponInput, setCouponInput] = useState('');
  const [couponFeedback, setCouponFeedback] = useState<{
    text: string;
    valid: boolean;
  } | null>(null);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
  const delivery = subtotal > 0 ? 25 : 0;
  const discountAmount = subtotal * discountRate;
  const grandTotal = Math.max(0, subtotal + delivery - discountAmount);

  const handleCouponSubmit = () => {
    const ok = onApplyCoupon(couponInput);
    if (ok) {
      setCouponFeedback({ text: '10% discount applied successfully.', valid: true });
    } else {
      setCouponFeedback({ text: "Invalid coupon code. Try 'JUNE24'.", valid: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 bg-[#07152B] text-white flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-[#D4AF37]" />
              <h3 className="font-display font-bold text-sm uppercase tracking-wider">
                Your Shopping Bag
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close shopping bag"
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-sm font-medium text-slate-500">Your shopping bag is empty</p>
              </div>
            ) : (
              items.map((item) => {
                const thumb =
                  item.imageUrls && item.imageUrls.length > 0
                    ? item.imageUrls[0]
                    : item.imageUrl;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 bg-[#F8F7F4] rounded-xl border border-slate-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-[#EFECE6] overflow-hidden shrink-0 flex items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ShoppingBag className="w-5 h-5 text-[#0F2C59]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#07152B] leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                        <p className="text-xs font-mono font-semibold text-[#A38038] tabular-nums mt-0.5">
                          GH₵ {Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="w-7 h-7 bg-white border border-slate-300 hover:bg-slate-100 rounded-md flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold w-6 text-center tabular-nums">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="w-7 h-7 bg-white border border-slate-300 hover:bg-slate-100 rounded-md flex items-center justify-center text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Coupon & Totals */}
          <div className="p-4 bg-[#F8F7F4] border-t border-slate-200 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Coupon Code (e.g. JUNE24)"
                className="flex-1 bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 uppercase focus:outline-none focus:border-[#07152B]"
              />
              <button
                type="button"
                onClick={handleCouponSubmit}
                className="bg-[#07152B] text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-[#0F2C59] transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>

            {couponFeedback && (
              <p
                className={`text-xs font-medium ${
                  couponFeedback.valid ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {couponFeedback.text}
              </p>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  GH₵ {subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee (Estimated Accra)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  GH₵ {delivery.toFixed(2)}
                </span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount (JUNE24 · 10%)</span>
                  <span className="font-mono tabular-nums">-GH₵ {discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-[#07152B] pt-2 border-t border-slate-200">
                <span>Total Amount</span>
                <span className="font-mono text-base text-[#A38038] tabular-nums">
                  GH₵ {grandTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedCheckout}
              className="w-full gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider py-3 rounded-lg hover:opacity-95 transition-opacity cursor-pointer"
            >
              Proceed to Mobile Money Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
