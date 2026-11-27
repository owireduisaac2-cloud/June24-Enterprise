import { AlertCircle, CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CategorySlug } from '../types';

interface FooterProps {
  onSelectCategory: (cat: CategorySlug) => void;
  onOpenAdmin: () => void;
  onOpenTracking: () => void;
  onSubscribe: (email: string) => Promise<void>;
}

export function Footer({
  onSelectCategory,
  onOpenAdmin,
  onOpenTracking,
  onSubscribe,
}: FooterProps) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = email.trim();
    if (!cleaned || submitting) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      await onSubscribe(cleaned);
      setFeedback({
        type: 'success',
        text: `Subscribed (${cleaned}). Use code JUNE24 at checkout.`,
      });
      setEmail('');
    } catch (error) {
      const msg =
        error instanceof Error && !error.message.startsWith('{')
          ? error.message
          : 'Could not complete signup right now. Please try again.';
      setFeedback({
        type: 'error',
        text: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const jumpToCategory = (cat: CategorySlug) => {
    onSelectCategory(cat);
    const el = document.getElementById('catalog');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#07152B] text-slate-400 text-xs border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-md gold-bg-gradient flex items-center justify-center font-display font-extrabold text-[#07152B] text-sm">
                24
              </span>
              <span className="font-display font-bold text-white text-sm tracking-wide">
                JUNE 24 ENTERPRISE
              </span>
            </div>
            <p className="leading-relaxed text-slate-400">
              Ghana&apos;s trusted general trading company specializing in security and cadet
              footwear, tactical gear, custom uniforms, and handcrafted footwear.
            </p>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Popular Categories</h4>
            <ul className="space-y-2">
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('cadet')}
                  className="hover:text-[#F3E5AB] transition-colors cursor-pointer"
                >
                  Uniforms &amp; Tactical
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('ghana')}
                  className="hover:text-[#F3E5AB] transition-colors cursor-pointer"
                >
                  Made In Ghana Footwear
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('clothing')}
                  className="hover:text-[#F3E5AB] transition-colors cursor-pointer"
                >
                  Sneakers &amp; More
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => jumpToCategory('footwear')}
                  className="hover:text-[#F3E5AB] transition-colors cursor-pointer"
                >
                  Formal &amp; Trail Shoes
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Delivery */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Store Location &amp; Contact</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>Accra, Greater Accra Region, Ghana</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span className="tabular-nums">+233 (0) 53 543 4921</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>sales@june24enterprise.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>Mon - Sat: 8:00 AM - 6:00 PM</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3">Newsletter · 10% Off First Order</h4>
            <p className="text-slate-400 mb-3">
              Subscribe to receive seasonal drops and discount codes such as JUNE24.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex mb-2.5">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                required
                minLength={5}
                maxLength={160}
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="bg-[#0B1E3D] border border-white/15 text-white px-3 py-2 rounded-l-lg w-full text-xs focus:outline-none focus:border-[#D4AF37] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={submitting}
                aria-label="Subscribe to newsletter"
                className="gold-bg-gradient text-[#07152B] px-3.5 font-bold rounded-r-lg hover:opacity-95 disabled:opacity-60 inline-flex items-center justify-center cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            {feedback && (
              <p
                role="status"
                className={`mb-2.5 text-[11px] font-medium flex items-start gap-1.5 ${
                  feedback.type === 'success' ? 'text-[#F3E5AB]' : 'text-rose-400'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </p>
            )}
            <p className="text-[11px] text-slate-400">
              Accepted Payments: MTN MoMo · Telecel Cash · Visa · Mastercard
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>&copy; 2026 June 24 Enterprise Ghana. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onOpenTracking}
              className="hover:text-[#F3E5AB] transition-colors cursor-pointer"
            >
              Track Order
            </button>
            <a
              href="https://wa.me/233535434921"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F3E5AB] transition-colors"
            >
              WhatsApp Support
            </a>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="hover:text-[#F3E5AB] transition-colors cursor-pointer"
            >
              Store Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
