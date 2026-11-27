import { CheckCircle2, Clock, Package, Search, Truck, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { getRecentLocalOrderNumbers, trackOrderByNumber } from '../services/catalogService';
import type { OrderStatus, OrderTrackingInfo } from '../types';

interface OrderTrackingModalProps {
  open: boolean;
  initialOrderNumber?: string;
  onClose: () => void;
}

const DELIVERY_STEPS: {
  key: OrderStatus;
  label: string;
  detail: string;
}[] = [
  {
    key: 'confirmed',
    label: 'Order Confirmed',
    detail: 'Payment details received and order logged.',
  },
  {
    key: 'processing',
    label: 'Processing & Quality Check',
    detail: 'Items inspected and packed at our Accra hub.',
  },
  {
    key: 'dispatched',
    label: 'Out for Delivery',
    detail: 'Rider or regional courier en route to your region.',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    detail: 'Handed over to recipient.',
  },
];

export function OrderTrackingModal({
  open,
  initialOrderNumber,
  onClose,
}: OrderTrackingModalProps) {
  const [orderInput, setOrderInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<OrderTrackingInfo | null>(null);
  const [errorText, setErrorText] = useState('');
  const [recentOrders, setRecentOrders] = useState<string[]>([]);

  const performLookup = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    setErrorText('');
    setSearched(true);
    try {
      const found = await trackOrderByNumber(trimmed);
      setResult(found);
    } catch {
      setResult(null);
      setErrorText('Unable to look up order status right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setRecentOrders(getRecentLocalOrderNumbers());
    if (initialOrderNumber) {
      setOrderInput(initialOrderNumber);
      void performLookup(initialOrderNumber);
    } else {
      setSearched(false);
      setResult(null);
      setErrorText('');
    }
  }, [open, initialOrderNumber]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void performLookup(orderInput);
  };

  const activeStepIndex = result
    ? Math.max(
        0,
        DELIVERY_STEPS.findIndex((step) => step.key === result.status),
      )
    : -1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Order Tracking"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close order tracking"
          className="absolute top-4 right-4 text-slate-400 hover:text-[#07152B] p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <Truck className="w-5 h-5 text-[#A38038]" />
          <h3 className="font-display text-lg font-bold text-[#07152B]">Track Your Order</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Enter your order number (e.g. J24-123456) to check live delivery status.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
          <label htmlFor="track-order-input" className="sr-only">
            Order Number
          </label>
          <input
            id="track-order-input"
            type="text"
            required
            minLength={4}
            maxLength={32}
            value={orderInput}
            onChange={(e) => setOrderInput(e.target.value)}
            placeholder="J24-123456"
            className="flex-1 bg-[#F8F7F4] border border-slate-300 text-xs font-mono uppercase rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
          />
          <button
            type="submit"
            disabled={loading}
            className="gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg hover:opacity-95 disabled:opacity-60 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{loading ? 'Checking...' : 'Track'}</span>
          </button>
        </form>

        {recentOrders.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>Recent:</span>
            {recentOrders.map((ord) => (
              <button
                key={ord}
                type="button"
                onClick={() => {
                  setOrderInput(ord);
                  void performLookup(ord);
                }}
                className="font-mono font-semibold text-[#0F2C59] hover:underline cursor-pointer"
              >
                {ord}
              </button>
            ))}
          </div>
        )}

        {errorText && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {errorText}
          </p>
        )}

        {!loading && searched && !errorText && !result && (
          <div className="bg-[#F8F7F4] border border-slate-200 rounded-xl p-5 text-center space-y-1.5">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-[#07152B]">Order Not Found</p>
            <p className="text-xs text-slate-500">
              Double-check your order number (for example J24-482910) or contact +233 (0) 53 543
              4921 for assistance.
            </p>
          </div>
        )}

        {!loading && result && (
          <div className="bg-[#F8F7F4] border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Order Number
                </p>
                <p className="font-mono text-sm font-bold text-[#07152B] tabular-nums">
                  {result.orderNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Destination · Items
                </p>
                <p className="text-xs font-semibold text-[#07152B] tabular-nums">
                  {result.region} · {result.itemCount} {result.itemCount === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>

            {/* 4-Step Delivery Timeline */}
            <ol className="space-y-3">
              {DELIVERY_STEPS.map((step, index) => {
                const completed = index <= activeStepIndex;
                const isCurrent = index === activeStepIndex;
                return (
                  <li key={step.key} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 ${
                        completed ? 'text-emerald-700' : 'text-slate-300'
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </span>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-[#07152B]'
                            : completed
                              ? 'text-slate-800'
                              : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                        {isCurrent ? ' (Current Status)' : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">{step.detail}</p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
              Last updated: {result.updatedAtText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
