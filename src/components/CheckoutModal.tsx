import { CheckCircle2, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { OrderReceipt, PaymentMethod } from '../types';

interface CheckoutModalProps {
  open: boolean;
  totalAmount: number;
  itemCount: number;
  onClose: () => void;
  onTrackOrder?: (orderNumber: string) => void;
  onConfirmOrder: (payload: {
    customerName: string;
    phone: string;
    region: string;
    address: string;
    paymentMethod: PaymentMethod;
  }) => Promise<OrderReceipt>;
}

const REGIONS = [
  'Greater Accra',
  'Ashanti (Kumasi)',
  'Western (Takoradi)',
  'Central (Cape Coast)',
  'Eastern (Koforidua)',
  'Northern (Tamale)',
  'Other Region in Ghana',
];

export function CheckoutModal({
  open,
  totalAmount,
  itemCount,
  onClose,
  onTrackOrder,
  onConfirmOrder,
}: CheckoutModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('Greater Accra');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const confirmed = await onConfirmOrder({
        customerName,
        phone,
        region,
        address,
        paymentMethod,
      });
      setReceipt(confirmed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReceipt(null);
    setCustomerName('');
    setPhone('');
    setAddress('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Money Checkout"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close checkout"
          className="absolute top-4 right-4 text-slate-400 hover:text-[#07152B] p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {receipt ? (
          <div className="py-4 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Order #{receipt.orderNumber} Confirmed
              </p>
              <h3 className="font-display text-xl font-bold text-[#07152B] mt-1">
                Preparing Your Dispatch
              </h3>
              <p className="text-xs text-slate-600 mt-1.5">
                Thank you, {receipt.customerName}. Our team will contact {receipt.phone} to confirm
                delivery to {receipt.region}.
              </p>
            </div>

            <div className="bg-[#F8F7F4] rounded-xl p-4 text-left text-xs space-y-2 border border-slate-200">
              {receipt.itemsSummary && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 shrink-0">Order Items</span>
                  <span className="font-medium text-slate-900 text-right">
                    {receipt.itemsSummary}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Items</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {receipt.itemCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel</span>
                <span className="font-semibold text-slate-900 uppercase">
                  {receipt.paymentMethod === 'mtn'
                    ? 'MTN MoMo'
                    : receipt.paymentMethod === 'telecel'
                      ? 'Telecel Cash'
                      : 'Visa / Mastercard'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Delivery Address</span>
                <span className="font-medium text-slate-900 text-right max-w-[60%]">
                  {receipt.address}, {receipt.region}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-[#07152B]">Total Payable</span>
                <span className="font-mono font-bold text-[#A38038] tabular-nums">
                  GH₵ {receipt.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <a
                href={`https://wa.me/233535434921?text=${encodeURIComponent(
                  [
                    `Hello June 24 Enterprise, I just placed Order #${receipt.orderNumber}.`,
                    `Name: ${receipt.customerName}`,
                    `Phone: ${receipt.phone}`,
                    receipt.itemsSummary ? `Items: ${receipt.itemsSummary}` : `Item count: ${receipt.itemCount}`,
                    `Total: GH₵ ${receipt.totalAmount.toFixed(2)} (${
                      receipt.paymentMethod === 'mtn'
                        ? 'MTN MoMo'
                        : receipt.paymentMethod === 'telecel'
                          ? 'Telecel Cash'
                          : 'Visa / Mastercard'
                    })`,
                    `Delivery: ${receipt.address}, ${receipt.region}`,
                  ].join('\n'),
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Order Receipt to WhatsApp</span>
              </a>

              <div className="flex flex-col sm:flex-row gap-2.5">
                {onTrackOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      const orderNum = receipt.orderNumber;
                      handleClose();
                      onTrackOrder(orderNum);
                    }}
                    className="flex-1 bg-[#07152B] text-[#F3E5AB] font-bold text-xs uppercase tracking-wider py-3 rounded-lg hover:bg-[#0B1E3D] transition-colors cursor-pointer"
                  >
                    Track Order Status
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-[#A38038]" />
              <h3 className="font-display text-lg font-bold text-[#07152B]">
                Complete Your Order
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Select your delivery location and Mobile Money provider in Ghana ({itemCount} items).
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="w-full bg-[#F8F7F4] border border-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number (MoMo) *
                  </label>
                  <input
                    type="tel"
                    required
                    minLength={7}
                    maxLength={30}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="055 123 4567"
                    className="w-full bg-[#F8F7F4] border border-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Region *
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-[#F8F7F4] border border-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
                  >
                    {REGIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Delivery Address / Landmark *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={240}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Madina Market / East Legon near Shell"
                  className="w-full bg-[#F8F7F4] border border-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Payment Option *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'mtn', label: 'MTN MoMo' },
                      { id: 'telecel', label: 'Telecel Cash' },
                      { id: 'card', label: 'Visa / Mastercard' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.id}
                      className={`border p-2.5 rounded-lg flex flex-col items-center justify-center cursor-pointer text-center transition-colors ${
                        paymentMethod === opt.id
                          ? 'border-[#D4AF37] bg-[#F3E5AB]/20'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={opt.id}
                        checked={paymentMethod === opt.id}
                        onChange={() => setPaymentMethod(opt.id)}
                        className="mb-1 accent-[#07152B]"
                      />
                      <span className="text-[11px] font-bold text-[#07152B]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-[#07152B] text-white p-3.5 rounded-lg text-xs flex justify-between items-center">
                <span>Payable Total:</span>
                <span className="font-mono font-bold text-[#F3E5AB] text-sm tabular-nums">
                  GH₵ {totalAmount.toFixed(2)}
                </span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider py-3 rounded-lg hover:opacity-95 disabled:opacity-60 cursor-pointer"
              >
                {submitting ? 'Confirming Order...' : 'Confirm & Pay via MoMo'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
