import { Heart, ShoppingBag, Trash2, X } from 'lucide-react';
import type { Product } from '../types';

interface WishlistModalProps {
  open: boolean;
  items: Product[];
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onRemoveWishlist: (id: string) => void;
}

export function WishlistModal({
  open,
  items,
  onClose,
  onAddToCart,
  onRemoveWishlist,
}: WishlistModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Saved Wishlist"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close wishlist"
          className="absolute top-4 right-4 text-slate-400 hover:text-[#07152B] p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
          <h3 className="font-display text-base font-bold text-[#07152B]">
            Your Saved Wishlist
          </h3>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              No saved items yet. Tap the heart icon on any item to save it here.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 p-3 bg-[#F8F7F4] rounded-xl border border-slate-200"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#07152B] truncate">{item.name}</p>
                  <p className="text-xs font-mono text-[#A38038] tabular-nums">
                    GH₵ {Number(item.price).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAddToCart(item)}
                    className="gold-bg-gradient text-[#07152B] font-bold px-2.5 py-1.5 rounded-lg text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ShoppingBag className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveWishlist(item.id)}
                    aria-label={`Remove ${item.name} from wishlist`}
                    className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
