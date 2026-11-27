import {
  ChevronLeft,
  ChevronRight,
  Footprints,
  Maximize2,
  MessageSquarePlus,
  ShoppingBag,
  Star,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { CATEGORY_LABELS } from '../data/defaultProducts';
import type { Product, Review } from '../types';

interface QuickViewModalProps {
  product: Product | null;
  reviews?: Review[];
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onSubmitReview?: (payload: {
    productId: string;
    author: string;
    location?: string;
    rating: number;
    comment: string;
  }) => Promise<void>;
}

export function QuickViewModal({
  product,
  reviews,
  onClose,
  onAddToCart,
  onSubmitReview,
}: QuickViewModalProps) {
  const images =
    product?.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product?.imageUrl
        ? [product.imageUrl]
        : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);

  const [writeReviewOpen, setWriteReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewLocation, setReviewLocation] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIndex(0);
    setFullScreenOpen(false);
    setWriteReviewOpen(false);
    setReviewRating(5);
    setReviewAuthor('');
    setReviewLocation('');
    setReviewComment('');
    setReviewError(null);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (fullScreenOpen) {
          setFullScreenOpen(false);
        } else {
          onClose();
        }
      } else if (images.length > 1 && e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev + 1) % images.length);
      } else if (images.length > 1 && e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, fullScreenOpen, images.length, onClose]);

  if (!product) return null;

  const activeImage = images[selectedIndex];
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

  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!onSubmitReview) return;

    const author = reviewAuthor.trim();
    const comment = reviewComment.trim();
    if (author.length < 2) {
      setReviewError('Please enter your name (at least 2 characters).');
      return;
    }
    if (comment.length < 5) {
      setReviewError('Please write a short review (at least 5 characters).');
      return;
    }

    setReviewError(null);
    setReviewSubmitting(true);
    try {
      await onSubmitReview({
        productId: product.id,
        author,
        location: reviewLocation.trim() || undefined,
        rating: reviewRating,
        comment,
      });
      setWriteReviewOpen(false);
      setReviewRating(5);
      setReviewAuthor('');
      setReviewLocation('');
      setReviewComment('');
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : 'Unable to submit review right now. Please try again.',
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handlePrev = () => {
    if (images.length <= 1) return;
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    if (images.length <= 1) return;
    setSelectedIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product preview"
            className="absolute top-4 right-4 z-10 text-slate-400 hover:text-[#07152B] p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="space-y-4">
            {/* Full Uncropped Picture Viewport */}
            <div className="relative w-full min-h-[240px] max-h-[55vh] bg-[#EFECE6] rounded-xl flex items-center justify-center overflow-hidden p-2">
              {activeImage ? (
                <button
                  type="button"
                  onClick={() => setFullScreenOpen(true)}
                  aria-label={`View full-screen picture of ${product.name}`}
                  className="w-full h-full flex items-center justify-center cursor-zoom-in group"
                >
                  <img
                    src={activeImage}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[50vh] w-auto h-auto object-contain rounded-lg transition-transform duration-200 group-hover:scale-[1.01]"
                  />
                </button>
              ) : (
                <Footprints className="w-12 h-12 text-[#0F2C59]/60" />
              )}

              {activeImage && (
                <button
                  type="button"
                  onClick={() => setFullScreenOpen(true)}
                  aria-label="Expand full picture"
                  title="View full-screen picture"
                  className="absolute bottom-3 right-3 bg-[#07152B]/85 hover:bg-[#07152B] text-white p-2 rounded-lg shadow-md inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full Picture</span>
                </button>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous product image"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#07152B] flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Next product image"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-[#07152B] flex items-center justify-center shadow-sm cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                {images.map((img, idx) => (
                  <button
                    key={`${product.id}-thumb-${idx}`}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 bg-[#EFECE6] cursor-pointer ${
                      idx === selectedIndex ? 'border-[#D4AF37]' : 'border-slate-200'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span>{categoryLabel}</span>
                {product.tag && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#A38038]">{product.tag}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span
                  className={`font-semibold ${
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

              <h3 className="font-display text-xl font-bold text-[#07152B]">{product.name}</h3>
              {reviewCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-0.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= filledStars ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="font-mono font-bold text-[#07152B] tabular-nums">
                    {avgRating.toFixed(1)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {reviewCount} customer review{reviewCount === 1 ? '' : 's'}
                  </span>
                </div>
              )}
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.description ||
                  'Inspected for maximum durability, comfort, and standard sizing in Ghana.'}
              </p>
              <p className="font-mono text-xl font-bold text-[#07152B] tabular-nums pt-1">
                GH₵ {Number(product.price || 0).toFixed(2)}
              </p>
            </div>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className={`w-full font-bold py-3 rounded-lg text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 transition-opacity ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'gold-bg-gradient text-[#07152B] hover:opacity-95 cursor-pointer'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>
                {isOutOfStock
                  ? 'Currently Out of Stock'
                  : isPreOrder
                    ? 'Pre-Order Item'
                    : 'Add to Order Bag'}
              </span>
            </button>

            {/* Customer Ratings & Written Reviews Section */}
            <section
              aria-label="Customer ratings and reviews"
              className="border-t border-slate-200 pt-5 mt-2 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-display text-base font-bold text-[#07152B]">
                    Customer Reviews
                  </h4>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                    <div className="flex items-center gap-0.5" aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            reviewCount > 0 && star <= filledStars
                              ? 'fill-[#D4AF37] text-[#D4AF37]'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-mono font-bold text-[#07152B] tabular-nums">
                      {reviewCount > 0 ? avgRating.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums">/ 5.0</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {reviewCount} review{reviewCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {onSubmitReview && (
                  <button
                    type="button"
                    onClick={() => {
                      setWriteReviewOpen((prev) => !prev);
                      setReviewError(null);
                    }}
                    className="border border-slate-300 hover:border-[#07152B] text-[#07152B] text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>{writeReviewOpen ? 'Close Form' : 'Write a Review'}</span>
                  </button>
                )}
              </div>

              {writeReviewOpen && onSubmitReview && (
                <form
                  onSubmit={handleReviewSubmit}
                  className="bg-[#F8F7F4] border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                      Your Rating
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                          className="p-0.5 cursor-pointer"
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              star <= reviewRating
                                ? 'fill-[#D4AF37] text-[#D4AF37]'
                                : 'text-slate-300 hover:text-[#D4AF37]'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-mono font-semibold text-[#07152B] tabular-nums">
                        {reviewRating} / 5
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        Your Name
                      </label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={80}
                        value={reviewAuthor}
                        onChange={(e) => setReviewAuthor(e.target.value)}
                        placeholder="e.g. Kwame Mensah"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#07152B]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                        City / Area (Optional)
                      </label>
                      <input
                        type="text"
                        maxLength={80}
                        value={reviewLocation}
                        onChange={(e) => setReviewLocation(e.target.value)}
                        placeholder="e.g. Accra, Kumasi"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#07152B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
                      Written Review
                    </label>
                    <textarea
                      rows={3}
                      required
                      minLength={5}
                      maxLength={800}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Share sizing fit, material durability, or delivery experience..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#07152B]"
                    />
                  </div>

                  {reviewError && (
                    <p className="text-xs font-medium text-rose-600">{reviewError}</p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="gold-bg-gradient text-[#07152B] font-bold text-xs px-4 py-2 rounded-lg hover:opacity-95 disabled:opacity-50 cursor-pointer"
                    >
                      {reviewSubmitting ? 'Publishing...' : 'Publish Review'}
                    </button>
                  </div>
                </form>
              )}

              {activeReviews.length === 0 ? (
                <p className="bg-[#F8F7F4] border border-slate-200/80 rounded-xl p-4 text-xs text-slate-500">
                  No customer reviews yet. Be the first to share your experience with this item.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {activeReviews.map((review) => (
                    <article
                      key={review.id}
                      className="bg-[#F8F7F4] border border-slate-200/80 rounded-xl p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-0.5" aria-label={`Rated ${review.rating} out of 5`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-3.5 h-3.5 ${
                                star <= review.rating
                                  ? 'fill-[#D4AF37] text-[#D4AF37]'
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500">
                          {review.createdAtText}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-[#07152B]">
                        {review.author}
                        {review.location && (
                          <span className="font-normal text-slate-500"> · {review.location}</span>
                        )}
                        {review.verifiedBuyer && (
                          <span className="font-semibold text-emerald-700"> · Verified Buyer</span>
                        )}
                      </p>

                      <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                        {review.comment}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Full-Screen Image Lightbox */}
      {fullScreenOpen && activeImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Full picture view of ${product.name}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFullScreenOpen(false);
          }}
        >
          <div className="w-full max-w-6xl flex items-center justify-between text-white pb-3">
            <div className="min-w-0 pr-4">
              <p className="font-display text-sm sm:text-base font-bold truncate">
                {product.name}
              </p>
              {images.length > 1 && (
                <p className="text-xs text-slate-400 font-mono tabular-nums">
                  Photo {selectedIndex + 1} of {images.length}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFullScreenOpen(false)}
              aria-label="Close full-screen picture"
              className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="relative flex-1 w-full flex items-center justify-center min-h-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) setFullScreenOpen(false);
            }}
          >
            {images.length > 1 && (
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous photo"
                className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={activeImage}
              alt={`${product.name} full picture`}
              referrerPolicy="no-referrer"
              className="max-w-[94vw] max-h-[84vh] w-auto h-auto object-contain rounded-lg select-none"
            />

            {images.length > 1 && (
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next photo"
                className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
