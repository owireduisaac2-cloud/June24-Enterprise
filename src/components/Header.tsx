import { Heart, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import type { CategorySlug } from '../types';

interface HeaderProps {
  cartCount: number;
  wishlistCount: number;
  onSelectCategory: (cat: 'all' | CategorySlug) => void;
  onOpenCart: () => void;
  onOpenWishlist: () => void;
  onFocusSearch: () => void;
  onOpenTracking: () => void;
}

export function Header({
  cartCount,
  wishlistCount,
  onSelectCategory,
  onOpenCart,
  onOpenWishlist,
  onFocusSearch,
  onOpenTracking,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (cat: 'all' | CategorySlug) => {
    onSelectCategory(cat);
    setMobileMenuOpen(false);
    const catalogEl = document.getElementById('catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#07152B] text-white border-b border-white/10">
      {/* Slim announcement strip */}
      <div className="bg-[#050E1E] text-slate-300 text-xs py-1.5 px-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <p className="truncate">
            Made in Ghana · Fast Delivery: Accra 24hrs, Kumasi &amp; Regions 48hrs
          </p>
          <p className="hidden sm:block whitespace-nowrap shrink-0 text-[#F3E5AB] font-medium tabular-nums">
            +233 (0) 53 543 4921 · MoMo Accepted
          </p>
        </div>
      </div>

      {/* Main 3-Zone Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          className="flex items-center gap-3 whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <span className="w-9 h-9 rounded-lg gold-bg-gradient flex items-center justify-center font-display font-extrabold text-[#07152B] text-base tracking-tight">
            24
          </span>
          <span className="font-display font-bold text-lg tracking-tight text-white">
            JUNE 24 ENTERPRISE
          </span>
        </a>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => handleNavClick('all')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('footwear')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Boots &amp; Shoes
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('cadet')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Uniforms &amp; Tactical
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('ghana')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Made in Ghana
          </button>
          <button
            type="button"
            onClick={onOpenTracking}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Track Order
          </button>
        </nav>

        {/* Zone 3: Primary Action Group */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onFocusSearch}
            aria-label="Search catalog"
            className="p-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenWishlist}
            aria-label="Open saved wishlist"
            className="relative p-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5 cursor-pointer"
          >
            <Heart className="w-4 h-4" />
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-rose-600 text-white font-mono text-[10px] font-bold rounded-full flex items-center justify-center tabular-nums">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCart}
            className="flex items-center gap-2 gold-bg-gradient text-[#07152B] px-3.5 py-2 rounded-lg font-bold text-xs tracking-wide whitespace-nowrap shrink-0 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Bag</span>
            <span className="bg-[#07152B] text-[#F3E5AB] font-mono text-[11px] font-bold px-1.5 py-0.5 rounded tabular-nums">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 text-slate-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0B1E3D] border-t border-white/10 px-4 py-3 space-y-1 text-sm">
          <button
            type="button"
            onClick={() => handleNavClick('all')}
            className="block w-full text-left py-2.5 text-[#F3E5AB] font-semibold border-b border-white/10"
          >
            All Products
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('footwear')}
            className="block w-full text-left py-2.5 text-slate-200 border-b border-white/10"
          >
            Boots &amp; Footwear
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('cadet')}
            className="block w-full text-left py-2.5 text-slate-200 border-b border-white/10"
          >
            Uniforms &amp; Tactical
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('ghana')}
            className="block w-full text-left py-2.5 text-slate-200 border-b border-white/10"
          >
            Made In Ghana
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('clothing')}
            className="block w-full text-left py-2.5 text-slate-200 border-b border-white/10"
          >
            Sneakers &amp; More
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenTracking();
            }}
            className="block w-full text-left py-2.5 text-[#F3E5AB] font-semibold"
          >
            Track Order
          </button>
        </div>
      )}
    </header>
  );
}
