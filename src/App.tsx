import { onAuthStateChanged, type User } from 'firebase/auth';
import { Award, MessageCircle, PackageOpen, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdminModal } from './components/AdminModal';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { HeroSlider } from './components/HeroSlider';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { ProductCard } from './components/ProductCard';
import { QuickViewModal } from './components/QuickViewModal';
import { Toast } from './components/Toast';
import { WishlistModal } from './components/WishlistModal';
import { CATEGORY_LABELS, DEFAULT_PRODUCTS } from './data/defaultProducts';
import { ADMIN_BOOTSTRAP_EMAIL, auth } from './firebase';
import {
  deleteProductFromCatalog,
  isProductPendingCloudSync,
  loadStoreCatalog,
  readLocalFullOrders,
  saveProductToCatalog,
  submitProductReview,
  submitStoreOrder,
  subscribeToAdminOrders,
  subscribeToNewsletter,
  subscribeToProductReviews,
  syncLocalCatalogToCloud,
  toggleProductVisibility,
  undoLastDeletion,
  updateProductStockStatus,
  updateStoreOrderStatus,
  type ProductInput,
} from './services/catalogService';
import type {
  AdminCredentials,
  CartItem,
  CategorySlug,
  OrderStatus,
  PaymentMethod,
  Product,
  Review,
  StockStatus,
  StoreOrder,
  ToastState,
} from './types';

const ADMIN_CREDS_KEY = 'june24_admin_creds';

function Storefront() {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<'all' | CategorySlug>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [discountRate, setDiscountRate] = useState(0);

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | undefined>(undefined);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>(() => readLocalFullOrders());
  const [reviewsByProduct, setReviewsByProduct] = useState<Record<string, Review[]>>({});

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_CREDS_KEY);
      if (saved) return JSON.parse(saved) as AdminCredentials;
    } catch {
      // ignore
    }
    return { email: 'admin@june24.com', password: 'password123' };
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const autoSyncInFlightRef = useRef(false);

  const notify = useCallback(
    (title: string, message: string, tone: 'success' | 'info' | 'error' = 'success') => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      setToast({ id: Date.now(), title, message, tone });
      toastTimerRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4000);
    },
    [],
  );

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    const unsubCatalog = loadStoreCatalog(
      (combinedItems) => {
        setProducts(combinedItems);
      },
      (err) => {
        console.warn('Firestore sync notice:', err);
      },
    );

    const unsubReviews = subscribeToProductReviews(
      (grouped) => {
        setReviewsByProduct(grouped);
      },
      (err) => {
        console.warn('Reviews sync notice:', err);
      },
    );

    return () => {
      unsubAuth();
      unsubCatalog();
      unsubReviews();
    };
  }, []);

  useEffect(() => {
    const unsubOrders = subscribeToAdminOrders(
      (liveOrders) => {
        setOrders(liveOrders);
      },
      (err) => {
        console.warn('Orders sync notice:', err);
      },
    );

    return () => {
      unsubOrders();
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified) return;
    if (firebaseUser.email !== ADMIN_BOOTSTRAP_EMAIL) return;
    const hasUnsynced = products.some(isProductPendingCloudSync);
    if (!hasUnsynced || autoSyncInFlightRef.current) return;

    autoSyncInFlightRef.current = true;
    void syncLocalCatalogToCloud(products)
      .then(({ syncedCount, updatedProducts }) => {
        if (syncedCount > 0) {
          setProducts(updatedProducts);
          notify(
            'Cloud Sync Complete',
            `${syncedCount} local item${syncedCount === 1 ? '' : 's'} synced to live cloud catalog.`,
          );
        }
      })
      .catch((err) => {
        console.warn('Auto-sync notice:', err);
      })
      .finally(() => {
        autoSyncInFlightRef.current = false;
      });
  }, [firebaseUser, products, notify]);

  const visibleProducts = useMemo(() => products.filter((p) => !p.hidden), [products]);

  const filteredProducts = useMemo(() => {
    const cleanQuery = searchQuery.trim().toLowerCase();
    return visibleProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!cleanQuery) return true;
      return (
        product.name.toLowerCase().includes(cleanQuery) ||
        (product.category && product.category.toLowerCase().includes(cleanQuery)) ||
        (product.tag && product.tag.toLowerCase().includes(cleanQuery)) ||
        (product.description && product.description.toLowerCase().includes(cleanQuery))
      );
    });
  }, [visibleProducts, selectedCategory, searchQuery]);

  const wishlistProducts = useMemo(
    () => visibleProducts.filter((p) => wishlistIds.includes(String(p.id))),
    [visibleProducts, wishlistIds],
  );

  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart],
  );

  const cartGrandTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.qty, 0);
    const delivery = subtotal > 0 ? 25 : 0;
    const discount = subtotal * discountRate;
    return Math.max(0, subtotal + delivery - discount);
  }, [cart, discountRate]);

  const getReviewsForProduct = useCallback(
    (product: Product): Review[] => {
      const pid = String(product.id);
      const live = reviewsByProduct[pid] ?? [];
      const productSeeded = product.reviews ?? [];
      const defaultSeeded =
        DEFAULT_PRODUCTS.find((item) => String(item.id) === pid)?.reviews ?? [];

      const byId = new Map<string, Review>();
      for (const rev of [...live, ...productSeeded, ...defaultSeeded]) {
        if (!byId.has(rev.id)) {
          byId.set(rev.id, rev);
        }
      }
      return Array.from(byId.values()).sort(
        (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
      );
    },
    [reviewsByProduct],
  );

  const handleSubmitReview = useCallback(
    async (payload: {
      productId: string;
      author: string;
      location?: string;
      rating: number;
      comment: string;
    }) => {
      const created = await submitProductReview(payload);
      setReviewsByProduct((prev) => {
        const pid = String(created.productId);
        const existing = (prev[pid] ?? []).filter((r) => r.id !== created.id);
        return {
          ...prev,
          [pid]: [created, ...existing],
        };
      });
      notify('Review Published', 'Thank you for sharing your customer feedback.');
    },
    [notify],
  );

  const handleAddToCart = (product: Product) => {
    if (product.stockStatus === 'out_of_stock') {
      notify('Out of Stock', `${product.name} is currently unavailable.`, 'info');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => String(item.id) === String(product.id));
      if (existing) {
        return prev.map((item) =>
          String(item.id) === String(product.id) ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    notify(
      product.stockStatus === 'pre_order' ? 'Added Pre-Order' : 'Added to Bag',
      `${product.name} added to your shopping bag.`,
    );
  };

  const handleUpdateCartQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          String(item.id) === String(id) ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const handleToggleWishlist = (id: string) => {
    const strId = String(id);
    setWishlistIds((prev) => {
      if (prev.includes(strId)) {
        notify('Removed from Wishlist', 'Item removed from saved list.', 'info');
        return prev.filter((item) => item !== strId);
      }
      notify('Saved to Wishlist', 'Item saved for later.');
      return [...prev, strId];
    });
  };

  const handleApplyCoupon = (code: string) => {
    if (code.trim().toUpperCase() === 'JUNE24') {
      setDiscountRate(0.1);
      return true;
    }
    setDiscountRate(0);
    return false;
  };

  const handleProceedCheckout = () => {
    if (cart.length === 0) {
      notify('Bag Empty', 'Please add items to your bag before checking out.', 'info');
      return;
    }
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const handleConfirmOrder = async (payload: {
    customerName: string;
    phone: string;
    region: string;
    address: string;
    paymentMethod: PaymentMethod;
  }) => {
    const itemsSummary = cart
      .map((item) => `${item.qty}x ${item.name}`)
      .join(', ')
      .slice(0, 500);
    const receipt = await submitStoreOrder({
      ...payload,
      itemCount: totalCartItems,
      itemsSummary,
      totalAmount: cartGrandTotal,
    });
    setOrders(readLocalFullOrders());
    setCart([]);
    setDiscountRate(0);
    notify(
      'Order Confirmed',
      `Order #${receipt.orderNumber} placed. Our agent will contact ${receipt.phone}.`,
    );
    return receipt;
  };

  const handleUpdateOrderStatus = async (order: StoreOrder, nextStatus: OrderStatus) => {
    await updateStoreOrderStatus(order, nextStatus);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id || o.orderNumber === order.orderNumber ? { ...o, status: nextStatus } : o,
      ),
    );
    notify(
      'Order Status Updated',
      `Order #${order.orderNumber} marked as ${nextStatus.toUpperCase()}.`,
    );
  };

  const handleSaveProduct = async (input: ProductInput, editId: string | null) => {
    const { updatedProducts, savedProduct, syncedToCloud } = await saveProductToCatalog(
      input,
      products,
      editId,
    );
    setProducts(updatedProducts);
    notify(
      editId ? 'Product Updated' : 'Product Published',
      syncedToCloud
        ? `${savedProduct.name} saved and synced to live cloud catalog.`
        : `${savedProduct.name} saved to this browser only. Connect Google Sync to show on other browsers.`,
      syncedToCloud ? 'success' : 'info',
    );
  };

  const handleSyncLocalToCloud = useCallback(
    async (silentIfNone = false) => {
      const { syncedCount, updatedProducts } = await syncLocalCatalogToCloud(products);
      setProducts(updatedProducts);
      if (syncedCount > 0) {
        notify(
          'Cloud Sync Complete',
          `${syncedCount} local item${syncedCount === 1 ? '' : 's'} published to Firestore for all visitors.`,
        );
      } else if (!silentIfNone) {
        notify('Already Synced', 'All custom products are already synced to Firestore.', 'info');
      }
    },
    [products, notify],
  );

  const handleDeleteProduct = async (id: string) => {
    const removed = products.find((p) => String(p.id) === String(id));
    const next = await deleteProductFromCatalog(id, products);
    setProducts(next);
    notify(
      'Item Removed',
      removed
        ? `"${removed.name}" removed. Click Undo Deletion in Inventory to restore.`
        : 'Product removed from store inventory.',
      'info',
    );
  };

  const handleUndoDeletion = async () => {
    const { updatedProducts, restoredProduct, syncedToCloud } = await undoLastDeletion(products);
    setProducts(updatedProducts);
    if (!restoredProduct) {
      notify('Nothing to Undo', 'No recently deleted items found.', 'info');
      return;
    }
    notify(
      'Deletion Undone',
      syncedToCloud
        ? `"${restoredProduct.name}" restored locally and synced to cloud catalog.`
        : `"${restoredProduct.name}" restored to catalog.`,
    );
  };

  const handleToggleHideProduct = async (product: Product) => {
    const { updatedProducts, nextHidden, syncedToCloud } = await toggleProductVisibility(
      product,
      products,
    );
    setProducts(updatedProducts);
    notify(
      nextHidden ? 'Item Hidden' : 'Item Visible',
      nextHidden
        ? `"${product.name}" is now hidden from the storefront${syncedToCloud ? ' (synced to cloud).' : '.'}`
        : `"${product.name}" is now visible on the storefront${syncedToCloud ? ' (synced to cloud).' : '.'}`,
      nextHidden ? 'info' : 'success',
    );
  };

  const handleChangeStockStatus = async (product: Product, nextStatus: StockStatus) => {
    const { updatedProducts, stockStatus, syncedToCloud } = await updateProductStockStatus(
      product,
      nextStatus,
      products,
    );
    setProducts(updatedProducts);
    const label =
      stockStatus === 'out_of_stock'
        ? 'Out of Stock'
        : stockStatus === 'pre_order'
          ? 'Pre-Order'
          : 'In Stock';
    notify(
      'Availability Updated',
      `"${product.name}" marked as ${label}${syncedToCloud ? ' (synced to cloud).' : '.'}`,
      stockStatus === 'out_of_stock' ? 'info' : 'success',
    );
  };

  const handleUpdateCredentials = (nextCreds: AdminCredentials) => {
    setAdminCredentials(nextCreds);
    try {
      localStorage.setItem(ADMIN_CREDS_KEY, JSON.stringify(nextCreds));
    } catch {
      // ignore
    }
  };

  const handleFocusSearch = () => {
    const catalogEl = document.getElementById('catalog');
    if (catalogEl) {
      catalogEl.scrollIntoView({ behavior: 'smooth' });
    }
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 250);
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8F7F4] text-slate-900">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Header
        cartCount={totalCartItems}
        wishlistCount={wishlistIds.length}
        onSelectCategory={setSelectedCategory}
        onOpenCart={() => setCartOpen(true)}
        onOpenWishlist={() => setWishlistOpen(true)}
        onFocusSearch={handleFocusSearch}
        onOpenTracking={() => {
          setTrackingOrderNumber(undefined);
          setTrackingOpen(true);
        }}
      />

      <main className="flex-1">
        <HeroSlider onShopCategory={(cat) => setSelectedCategory(cat)} />

        {/* Featured Catalog Section */}
        <section id="catalog" className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#07152B] tracking-tight">
                  Featured Catalog
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Top-rated footwear, cadet gear, and Ghanaian craftsmanship in GH₵ (
                  {visibleProducts.length} items)
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Input */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search boots, cadet, sneakers..."
                    className="w-full bg-white border border-slate-300 text-xs rounded-lg pl-9 pr-8 py-2.5 focus:outline-none focus:border-[#07152B]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Segmented Filter Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto hide-scrollbar">
                  {(['all', 'footwear', 'cadet', 'ghana', 'clothing'] as const).map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#07152B] text-[#F3E5AB]'
                            : 'text-slate-700 hover:text-[#07152B]'
                        }`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl text-center py-16 px-4">
                <PackageOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="font-display text-base font-bold text-[#07152B]">No items found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try resetting your search query or switching categories.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-4 gold-bg-gradient text-[#07152B] text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  View All Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    reviews={getReviewsForProduct(product)}
                    isWishlisted={wishlistIds.includes(String(product.id))}
                    onAddToCart={handleAddToCart}
                    onToggleWishlist={handleToggleWishlist}
                    onQuickView={setQuickViewProduct}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Custom Bulk Orders Banner */}
        <section id="bulk-orders" className="bg-[#0B1E3D] text-white py-14 border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="space-y-3 max-w-xl">
                <p className="text-xs font-bold uppercase tracking-widest text-[#F3E5AB]">
                  Local Craftsmanship &amp; Wholesale
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-balance">
                  Custom Bulk Orders for Schools &amp; Cadet Units
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Need customized military boots, brass accessories, belts, or school cadet uniforms
                  in large volumes? June 24 Enterprise manufactures and supplies directly at
                  wholesale prices.
                </p>
                <div className="pt-2">
                  <a
                    href="https://wa.me/233535434921?text=Hello%20June24%20Enterprise,%20I%20want%20to%20inquire%20about%20a%20bulk%20order."
                    target="_blank"
                    rel="noreferrer"
                    className="gold-bg-gradient text-[#07152B] font-bold px-6 py-3 rounded-lg text-xs uppercase tracking-wider inline-flex items-center gap-2 hover:opacity-95 transition-opacity"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Inquire via WhatsApp</span>
                  </a>
                </div>
              </div>

              <div className="bg-[#07152B] rounded-xl border border-white/15 p-6 flex items-center gap-4 shrink-0">
                <Award className="w-10 h-10 text-[#D4AF37] shrink-0" />
                <div>
                  <h3 className="font-display font-bold text-sm text-white">Quality Inspected</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Direct Factory Pricing in Ghana</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer
        onSelectCategory={(cat) => setSelectedCategory(cat)}
        onOpenAdmin={() => setAdminOpen(true)}
        onOpenTracking={() => {
          setTrackingOrderNumber(undefined);
          setTrackingOpen(true);
        }}
        onSubscribe={async (email) => {
          const { email: savedEmail } = await subscribeToNewsletter(email);
          notify('Subscribed', `Discount code JUNE24 ready for ${savedEmail}.`);
        }}
      />

      <CartDrawer
        open={cartOpen}
        items={cart}
        discountRate={discountRate}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onApplyCoupon={handleApplyCoupon}
        onProceedCheckout={handleProceedCheckout}
      />

      <CheckoutModal
        open={checkoutOpen}
        totalAmount={cartGrandTotal}
        itemCount={totalCartItems}
        onClose={() => setCheckoutOpen(false)}
        onTrackOrder={(orderNumber) => {
          setTrackingOrderNumber(orderNumber);
          setTrackingOpen(true);
        }}
        onConfirmOrder={handleConfirmOrder}
      />

      <QuickViewModal
        product={quickViewProduct}
        reviews={quickViewProduct ? getReviewsForProduct(quickViewProduct) : []}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onSubmitReview={handleSubmitReview}
      />

      <WishlistModal
        open={wishlistOpen}
        items={wishlistProducts}
        onClose={() => setWishlistOpen(false)}
        onAddToCart={handleAddToCart}
        onRemoveWishlist={handleToggleWishlist}
      />

      <AdminModal
        open={adminOpen}
        products={products}
        orders={orders}
        firebaseUser={firebaseUser}
        adminCredentials={adminCredentials}
        onClose={() => setAdminOpen(false)}
        onUpdateCredentials={handleUpdateCredentials}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onToggleHide={handleToggleHideProduct}
        onChangeStockStatus={handleChangeStockStatus}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onUndoDeletion={handleUndoDeletion}
        onSyncLocalToCloud={handleSyncLocalToCloud}
        onNotify={notify}
      />

      <OrderTrackingModal
        open={trackingOpen}
        initialOrderNumber={trackingOrderNumber}
        onClose={() => {
          setTrackingOpen(false);
          setTrackingOrderNumber(undefined);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Storefront />
    </ErrorBoundary>
  );
}
