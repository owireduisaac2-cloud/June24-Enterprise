import { Footprints, Heart, Shield, Shirt, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { CATEGORY_LABELS } from '../data/defaultProducts';
import type { Product, Review } from '../types';

interface ProductCardProps {
  product: Product;
  reviews?: Review[];
  isWishlisted: boolean;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (id: string) => void;
  onQuickView: (product: Product) => void;
}

function ProductFallbackArtwork({ product }: { product: Product }) {
  const renderIcon = () => {
    switch (product.icon) {
      case 'fa-shirt':
        return <Shirt className="w-10 h-10 text-[#0F2C59]/70" strokeWidth={1.5} />;
      case 'fa-shield-halved':
      case 'fa-person-military-rifle':
        return <Shield className="w-10 h-10 text-[#0F2C59]/70" strokeWidth={1.5} />;
      default:
        return <Footprints className="w-10 h-10 text-[#0F2C59]/70" strokeWidth={1.5} />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#EFECE6] text-center p-4">
      {renderIcon()}
      <span className="mt-2 text-[11px] font-medium text-slate-500 line-clamp-1 max-w-[85%]">
        {product.name}
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  reviews,
  isWishlisted,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
}: ProductCardProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const images =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];
  const primaryImage = images[0];
  const categoryLabel = CATEGORY_LABELS[product.category] ?? product.category;
  const stockStatus = product.stockStatus ?? 'in_stock';
  const isOutOfStock = stockStatus === 'out_of_stock';
  const isPreOrder = stockStatus === 'pre_order';

  const activeReviews = reviews ?? product.reviews ?? [];
  const reviewCount = activeReviews.length;
  const avgRating =
    reviewCount > 0
      ? activeReviews.reduce((sum, item) => sum + item.rating, 0) / reviewCount
      : 0;
  const filledStars = Math.round(avgRating);
  const latestReview = activeReviews[0];

  return (
    <article className="group bg-white rounded-xl border border-slate-200/90 p-3.5 flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
      <div>
        {/* 4:3 Media Container */}
        <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#EFECE6] mb-3">
          <button
            type="button"
            onClick={() => onQuickView(product)}
            className="w-full h-full block text-left cursor-pointer"
            aria-label={`View full picture and details for ${product.name}`}
          >
            {primaryImage && !imageFailed ? (
              <img
                src={primaryImage}
                alt={product.name}
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
                  isOutOfStock ? 'opacity-65 grayscale-[30%]' : ''
                }`}
              />
            ) : (
              <ProductFallbackArtwork product={product} />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm transition-colors cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 ${
                isWishlisted ? 'fill-rose-600 text-rose-600' : 'text-slate-600'
              }`}
            />
          </button>
        </div>

        {/* Clean Unboxed Metadata */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
          <span className="truncate">{categoryLabel}</span>
          {product.tag && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#A38038] truncate">{product.tag}</span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onQuickView(product)}
          className="text-left block w-full cursor-pointer"
        >
          <h3 className="font-display font-semibold text-sm sm:text-[15px] text-[#07152B] leading-snug line-clamp-2 mb-1.5 group-hover:text-[#0F2C59]">
            {product.name}
          </h3>
        </button>

        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <p className="font-mono text-sm font-bold text-[#07152B] tabular-nums">
            GH₵ {Number(product.price || 0).toFixed(2)}
          </p>
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider ${
              isOutOfStock
                ? 'text-rose-600'
                : isPreOrder
                  ? 'text-amber-700'
                  : 'text-emerald-700'
            }`}
          >
            {isOutOfStock ? 'Out of Stock' : isPreOrder ? 'Pre-Order' : 'In Stock'}
          </span>
        </div>

        {/* Customer Ratings & Written Review Preview */}
        <button
          type="button"
          onClick={() => onQuickView(product)}
          aria-label={`Read customer reviews for ${product.name}`}
          className="w-full text-left border-t border-slate-100 pt-2 pb-2.5 cursor-pointer group/reviews"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    reviewCount > 0 && star <= filledStars
                      ? 'fill-[#D4AF37] text-[#D4AF37]'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            {reviewCount > 0 ? (
              <span className="text-[11px] text-slate-600 group-hover/reviews:text-[#07152B]">
                <span className="font-mono font-bold text-[#07152B] tabular-nums">
                  {avgRating.toFixed(1)}
                </span>{' '}
                <span aria-hidden="true">·</span>{' '}
                <span className="tabular-nums">
                  {reviewCount} review{reviewCount === 1 ? '' : 's'}
                </span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 group-hover/reviews:text-[#07152B]">
                No reviews yet · Be first
              </span>
            )}
          </div>
          {latestReview && (
            <p className="mt-1 text-[11px] text-slate-600 line-clamp-1 leading-snug">
              “{latestReview.comment}” —{' '}
              <span className="font-medium text-slate-800">{latestReview.author}</span>
            </p>
          )}
        </button>
      </div>

      <button
        type="button"
        disabled={isOutOfStock}
        onClick={() => onAddToCart(product)}
        className={`w-full font-bold text-xs py-2.5 px-4 rounded-lg inline-flex items-center justify-center gap-2 transition-opacity ${
          isOutOfStock
            ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
            : 'gold-bg-gradient text-[#07152B] hover:opacity-95 cursor-pointer'
        }`}
      >
        <ShoppingBag className="w-3.5 h-3.5" />
        <span>
          {isOutOfStock ? 'Out of Stock' : isPreOrder ? 'Pre-Order Now' : 'Add to Bag'}
        </span>
      </button>
    </article>
  );
}

