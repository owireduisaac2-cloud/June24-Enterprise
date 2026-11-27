import {
  CheckCircle2,
  CloudUpload,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MessageCircle,
  PackageCheck,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { signOut, type User } from 'firebase/auth';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { auth, signInWithGooglePopup } from '../firebase';
import {
  compressImageFile,
  isProductPendingCloudSync,
  type ProductInput,
} from '../services/catalogService';
import type {
  AdminCredentials,
  CategorySlug,
  OrderStatus,
  Product,
  StockStatus,
  StoreOrder,
} from '../types';

interface AdminModalProps {
  open: boolean;
  products: Product[];
  orders: StoreOrder[];
  firebaseUser: User | null;
  adminCredentials: AdminCredentials;
  onClose: () => void;
  onUpdateCredentials: (nextCreds: AdminCredentials) => void;
  onSaveProduct: (input: ProductInput, editId: string | null) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onToggleHide: (product: Product) => Promise<void>;
  onChangeStockStatus: (product: Product, stockStatus: StockStatus) => Promise<void>;
  onUpdateOrderStatus: (order: StoreOrder, status: OrderStatus) => Promise<void>;
  onUndoDeletion: () => Promise<void>;
  onSyncLocalToCloud: (silentIfNone?: boolean) => Promise<void>;
  onNotify: (title: string, message: string, tone?: 'success' | 'info' | 'error') => void;
}

function formatGhanaWhatsAppUrl(phone: string, orderNumber: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const normalized = digits.startsWith('0') ? `233${digits.slice(1)}` : digits;
  const text = encodeURIComponent(
    `Hello! Regarding your June 24 Enterprise order #${orderNumber}, we are confirming your delivery details.`,
  );
  return `https://wa.me/${normalized}?text=${text}`;
}

export function AdminModal({
  open,
  products,
  orders,
  firebaseUser,
  adminCredentials,
  onClose,
  onUpdateCredentials,
  onSaveProduct,
  onDeleteProduct,
  onToggleHide,
  onChangeStockStatus,
  onUpdateOrderStatus,
  onUndoDeletion,
  onSyncLocalToCloud,
  onNotify,
}: AdminModalProps) {
  const [isLocalAdminLoggedIn, setIsLocalAdminLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'orders' | 'settings'>('upload');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('admin@june24.com');
  const [loginPassword, setLoginPassword] = useState('');

  // Credentials update state
  const [newEmail, setNewEmail] = useState(adminCredentials.email);
  const [newPassword, setNewPassword] = useState(adminCredentials.password);

  // Product upload / edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategorySlug>('footwear');
  const [price, setPrice] = useState('');
  const [tag, setTag] = useState('');
  const [icon, setIcon] = useState('fa-shoe-prints');
  const [description, setDescription] = useState('');
  const [stockStatus, setStockStatus] = useState<StockStatus>('in_stock');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  if (!open) return null;

  const isAuthenticated = isLocalAdminLoggedIn || Boolean(firebaseUser);
  const pendingSyncItems = products.filter(isProductPendingCloudSync);
  const pendingOrderCount = orders.filter((o) => o.status !== 'delivered').length;

  const resetForm = () => {
    setEditId(null);
    setName('');
    setCategory('footwear');
    setPrice('');
    setTag('');
    setIcon('fa-shoe-prints');
    setDescription('');
    setStockStatus('in_stock');
    setUploadedImages([]);
  };

  const handleLocalLogin = (e: FormEvent) => {
    e.preventDefault();
    if (
      loginEmail.trim() === adminCredentials.email &&
      loginPassword === adminCredentials.password
    ) {
      setIsLocalAdminLoggedIn(true);
      onNotify('Admin Authenticated', 'Welcome to June 24 Control Panel.');
    } else {
      onNotify('Login Failed', 'Invalid email or password.', 'error');
    }
  };

  const handleSyncClick = async () => {
    if (syncingCloud) return;
    setSyncingCloud(true);
    try {
      await onSyncLocalToCloud(false);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unable to push local items to Firestore.';
      onNotify('Cloud Sync Error', msg, 'error');
    } finally {
      setSyncingCloud(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleSigningIn) return;
    setGoogleSigningIn(true);
    try {
      await signInWithGooglePopup();
      setIsLocalAdminLoggedIn(true);
      onNotify('Cloud Admin Connected', 'Google account signed in. Syncing catalog...');
      await onSyncLocalToCloud(true);
    } catch (error) {
      const rawMsg = error instanceof Error ? error.message : 'Unable to sign in with Google.';
      const friendlyMsg =
        rawMsg.includes('Pending promise') || rawMsg.includes('popup')
          ? 'Google sign-in popup was interrupted or blocked. Please allow popups for this site (or try again once) to complete sign-in.'
          : rawMsg;
      onNotify('Google Sign-In Notice', friendlyMsg, 'error');
    } finally {
      setGoogleSigningIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLocalAdminLoggedIn(false);
    if (firebaseUser) {
      await signOut(auth);
    }
    onNotify('Logged Out', 'Admin session ended.', 'info');
    onClose();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const compressed = await Promise.all(
      Array.from(files)
        .slice(0, 8)
        .map((file) => compressImageFile(file)),
    );
    setUploadedImages(compressed);
  };

  const handleSetCover = (idx: number) => {
    if (idx <= 0 || idx >= uploadedImages.length) return;
    const next = [...uploadedImages];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    setUploadedImages(next);
    onNotify('Cover Updated', 'Selected image set as primary catalog cover.', 'info');
  };

  const handleEditClick = (product: Product) => {
    setEditId(String(product.id));
    setName(product.name);
    setCategory(product.category || 'footwear');
    setPrice(String(product.price));
    setTag(product.tag || '');
    setIcon(product.icon || 'fa-shoe-prints');
    setDescription(product.description || '');
    setStockStatus(product.stockStatus ?? 'in_stock');
    const imgs =
      product.imageUrls && product.imageUrls.length > 0
        ? product.imageUrls
        : product.imageUrl
          ? [product.imageUrl]
          : [];
    setUploadedImages(imgs);
    setActiveTab('upload');
  };

  const handleProductSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSaveProduct(
        {
          name,
          category,
          price: parseFloat(price) || 0,
          tag,
          icon,
          description,
          imageUrls: uploadedImages,
          stockStatus,
        },
        editId,
      );
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCreds = (e: FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      onNotify('Error', 'Please fill in all credential fields.', 'error');
      return;
    }
    onUpdateCredentials({ email: newEmail.trim(), password: newPassword.trim() });
    onNotify('Credentials Updated', 'Your new admin email and password have been saved.');
    setActiveTab('upload');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Store Admin Portal"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto text-slate-800">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close admin portal"
          className="absolute top-4 right-4 text-slate-400 hover:text-[#07152B] p-1 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {!isAuthenticated ? (
          <div className="space-y-5 py-4">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 bg-[#07152B] text-[#F3E5AB] rounded-xl flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#07152B]">Store Admin Login</h3>
              <p className="text-xs text-slate-500">
                Sign in to publish unlimited products, upload images, and manage inventory.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-3">
              <button
                type="button"
                disabled={googleSigningIn}
                onClick={() => void handleGoogleSignIn()}
                className="w-full bg-[#07152B] hover:bg-[#0F2C59] disabled:opacity-60 text-white font-semibold text-xs py-3 px-4 rounded-lg transition-colors cursor-pointer"
              >
                {googleSigningIn
                  ? 'Completing Google Sign-In...'
                  : 'Sign in with Google (Cloud Sync)'}
              </button>

              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex-1 h-px bg-slate-200" />
                <span>or local store login</span>
                <span className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleLocalLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-[#F8F7F4] border border-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full bg-[#F8F7F4] border border-slate-300 text-xs rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#07152B]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer"
                >
                  Sign In To Admin Portal
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 pr-8">
              <div className="flex items-center gap-2.5">
                <CloudUpload className="w-5 h-5 text-[#A38038]" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#07152B]">
                    Upload &amp; Manage Store Products
                  </h3>
                  <p className="text-xs text-slate-500">
                    {firebaseUser
                      ? `Cloud synced as ${firebaseUser.email}`
                      : 'Local browser mode only · Connect Google to publish to all devices'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {firebaseUser && pendingSyncItems.length > 0 ? (
                  <button
                    type="button"
                    disabled={syncingCloud}
                    onClick={() => void handleSyncClick()}
                    className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {syncingCloud
                      ? 'Syncing...'
                      : `Push ${pendingSyncItems.length} Local Item${pendingSyncItems.length === 1 ? '' : 's'}`}
                  </button>
                ) : null}
                {!firebaseUser && (
                  <button
                    type="button"
                    disabled={googleSigningIn}
                    onClick={() => void handleGoogleSignIn()}
                    className="text-xs font-semibold text-[#0F2C59] hover:underline disabled:opacity-60 cursor-pointer"
                  >
                    {googleSigningIn ? 'Connecting...' : 'Connect Cloud'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {!firebaseUser ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900">
                <span>
                  Products uploaded without Google Sign-In only stay on this browser. Connect Google
                  Cloud Sync to make your uploads visible to customers on every browser.
                </span>
                <button
                  type="button"
                  disabled={googleSigningIn}
                  onClick={() => void handleGoogleSignIn()}
                  className="bg-[#07152B] disabled:opacity-60 text-[#F3E5AB] font-bold px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {googleSigningIn ? 'Signing In...' : 'Connect Google Sync'}
                </button>
              </div>
            ) : pendingSyncItems.length > 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-950">
                <span>
                  {pendingSyncItems.length} item{pendingSyncItems.length === 1 ? ' is' : 's are'}{' '}
                  currently saved only on this browser. Push them to Firestore so they appear on
                  all browsers and devices.
                </span>
                <button
                  type="button"
                  disabled={syncingCloud}
                  onClick={() => void handleSyncClick()}
                  className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {syncingCloud ? 'Syncing to Cloud...' : 'Push Local Items to Cloud'}
                </button>
              </div>
            ) : null}

            {/* Admin Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold gap-6 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'upload'
                    ? 'border-[#07152B] text-[#07152B]'
                    : 'border-transparent text-slate-500 hover:text-[#07152B]'
                }`}
              >
                {editId ? 'Edit Product' : 'Upload Product'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`pb-2 border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'border-[#07152B] text-[#07152B]'
                    : 'border-transparent text-slate-500 hover:text-[#07152B]'
                }`}
              >
                <span>Orders</span>
                {orders.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                      pendingOrderCount > 0
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {pendingOrderCount > 0 ? pendingOrderCount : orders.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewEmail(adminCredentials.email);
                  setNewPassword(adminCredentials.password);
                  setActiveTab('settings');
                }}
                className={`pb-2 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-[#07152B] text-[#07152B]'
                    : 'border-transparent text-slate-500 hover:text-[#07152B]'
                }`}
              >
                Change Admin Logins
              </button>
            </div>

            {activeTab === 'upload' ? (
              <>
              <form
                onSubmit={handleProductSubmit}
                className="space-y-4 bg-[#F8F7F4] p-4 rounded-xl border border-slate-200"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#07152B] uppercase tracking-wider">
                    {editId ? 'Edit Product Details' : 'Publish New Product'}
                  </h4>
                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Cancel Editing
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Product Title *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. ASICS Gel-Picteer Sneakers"
                      className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CategorySlug)}
                      className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                    >
                      <option value="footwear">Boots &amp; Footwear</option>
                      <option value="cadet">Uniforms &amp; Tactical</option>
                      <option value="ghana">Made In Ghana</option>
                      <option value="clothing">Sneakers &amp; More</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Price in GH₵ *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="420.00"
                      className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-[#07152B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Availability *
                    </label>
                    <select
                      value={stockStatus}
                      onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                      className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                    >
                      <option value="in_stock">In Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="pre_order">Pre-Order</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Highlight Tag
                    </label>
                    <input
                      type="text"
                      maxLength={48}
                      value={tag}
                      onChange={(e) => setTag(e.target.value)}
                      placeholder="e.g. Hot Release"
                      className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fallback Icon
                    </label>
                    <select
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                    >
                      <option value="fa-shoe-prints">Shoes / Sneakers</option>
                      <option value="fa-person-military-rifle">Tactical Boots</option>
                      <option value="fa-shirt">Shirt / Jersey</option>
                      <option value="fa-shield-halved">Gear / Accessories</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Product Description
                  </label>
                  <textarea
                    rows={2}
                    maxLength={2000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter material, sizing options, or usage details..."
                    className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Upload Product Images (.png / .jpg) — Select up to 8
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="w-full bg-white border border-slate-300 text-xs rounded-lg p-1.5 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#07152B] file:text-[#F3E5AB] hover:file:bg-[#0F2C59]"
                  />

                  {uploadedImages.length > 0 && (
                    <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#07152B]">
                        <span>
                          Gallery ({uploadedImages.length} images) — Click any photo to set as Cover
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready
                        </span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {uploadedImages.map((imgUrl, idx) => (
                          <button
                            key={`preview-${idx}`}
                            type="button"
                            onClick={() => handleSetCover(idx)}
                            className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden shrink-0 cursor-pointer ${
                              idx === 0 ? 'border-[#D4AF37]' : 'border-slate-200'
                            }`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 0 && (
                              <span className="absolute top-0 left-0 bg-[#D4AF37] text-[#07152B] font-bold text-[9px] px-1">
                                Cover
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider py-3 rounded-lg hover:opacity-95 disabled:opacity-60 cursor-pointer"
                >
                  {submitting
                    ? 'Saving Product...'
                    : editId
                      ? 'Update Product Details'
                      : 'Publish Product To Live Store Catalog'}
                </button>
              </form>
              </>
            ) : activeTab === 'orders' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#07152B] uppercase tracking-wider">
                      Customer Orders ({orders.length})
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {firebaseUser
                        ? 'Live synced from Firestore. Updating status also updates customer Order Tracking.'
                        : 'Connect Google Sync to view orders placed by customers on other browsers and phones.'}
                    </p>
                  </div>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-[#F8F7F4] border border-slate-200 rounded-xl p-8 text-center space-y-2">
                    <PackageCheck className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-[#07152B]">No orders received yet</p>
                    <p className="text-[11px] text-slate-500">
                      New customer checkouts will appear here automatically with their phone number,
                      delivery landmark, and order total.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                    {orders.map((order) => {
                      const waUrl = formatGhanaWhatsAppUrl(order.phone, order.orderNumber);
                      return (
                        <div
                          key={order.id}
                          className="bg-[#F8F7F4] border border-slate-200 rounded-xl p-3.5 text-xs space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-[#07152B]">
                                #{order.orderNumber}
                              </span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                                {order.paymentMethod === 'mtn'
                                  ? 'MTN MoMo'
                                  : order.paymentMethod === 'telecel'
                                    ? 'Telecel Cash'
                                    : 'Card'}
                              </span>
                              <span className="text-[11px] text-slate-500">{order.createdAtText}</span>
                            </div>

                            <select
                              aria-label={`Order status for ${order.orderNumber}`}
                              value={order.status}
                              onChange={(e) =>
                                void onUpdateOrderStatus(order, e.target.value as OrderStatus)
                              }
                              className={`text-[11px] font-bold px-2.5 py-1 rounded border cursor-pointer focus:outline-none ${
                                order.status === 'delivered'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : order.status === 'dispatched'
                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                    : order.status === 'processing'
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-white text-[#07152B] border-slate-300'
                              }`}
                            >
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="dispatched">Dispatched</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-500">Customer:</span>{' '}
                              <span className="font-bold text-[#07152B]">{order.customerName}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Total:</span>{' '}
                              <span className="font-mono font-bold text-[#A38038] tabular-nums">
                                GH₵ {order.totalAmount.toFixed(2)}
                              </span>{' '}
                              <span className="text-slate-500">
                                ({order.itemCount} item{order.itemCount === 1 ? '' : 's'})
                              </span>
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-slate-500">Delivery:</span>{' '}
                              <span className="font-medium text-slate-800">
                                {order.address}, {order.region}
                              </span>
                            </div>
                            {order.itemsSummary && (
                              <div className="sm:col-span-2">
                                <span className="text-slate-500">Items:</span>{' '}
                                <span className="font-medium text-slate-800">
                                  {order.itemsSummary}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 pt-1 flex-wrap">
                            {order.phone && (
                              <a
                                href={`tel:${order.phone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white border border-slate-300 text-[#07152B] font-semibold text-[11px] hover:bg-slate-50"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Call {order.phone}</span>
                              </a>
                            )}
                            {waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp Customer</span>
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleUpdateCreds}
                className="space-y-4 bg-[#F8F7F4] p-4 rounded-xl border border-slate-200"
              >
                <h4 className="text-xs font-bold text-[#07152B] uppercase tracking-wider">
                  Change Admin Login Credentials
                </h4>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    New Admin Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-[#07152B]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full gold-bg-gradient text-[#07152B] font-bold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer"
                >
                  Update &amp; Save New Logins
                </button>
              </form>
            )}

            {/* Live Inventory List */}
            {activeTab === 'upload' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#07152B] uppercase tracking-wider tabular-nums">
                  Live Store Inventory ({products.length} items
                  {products.some((p) => p.hidden)
                    ? ` · ${products.filter((p) => p.hidden).length} hidden`
                    : ''}
                  )
                </h4>
                <button
                  type="button"
                  onClick={() => void onUndoDeletion()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F2C59] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo Deletion</span>
                </button>
              </div>
              {products.some((p) => p.hidden) && (
                <p className="text-[11px] text-slate-500 mb-2">
                  Items marked <span className="font-semibold">Hidden</span> are saved in your
                  catalog but will not appear on the public storefront until you click{' '}
                  <span className="font-semibold text-emerald-700">Show</span>.
                </p>
              )}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs gap-2 ${
                      p.hidden
                        ? 'bg-slate-50 border-slate-200/80 opacity-80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`font-bold truncate ${
                          p.hidden ? 'text-slate-500 line-through' : 'text-[#07152B]'
                        }`}
                      >
                        {p.name}
                      </span>
                      <span className="font-mono text-[#A38038] font-semibold shrink-0 tabular-nums">
                        GH₵ {Number(p.price).toFixed(2)}
                      </span>
                      {isProductPendingCloudSync(p) && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 shrink-0">
                          · Local Only
                        </span>
                      )}
                      {p.hidden && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 shrink-0">
                          · Hidden
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      <select
                        aria-label={`Availability status for ${p.name}`}
                        value={p.stockStatus ?? 'in_stock'}
                        onChange={(e) => void onChangeStockStatus(p, e.target.value as StockStatus)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded border cursor-pointer focus:outline-none ${
                          p.stockStatus === 'out_of_stock'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : p.stockStatus === 'pre_order'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        <option value="in_stock">In Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                        <option value="pre_order">Pre-Order</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void onToggleHide(p)}
                        title={
                          p.hidden
                            ? 'Show item on public storefront'
                            : 'Hide item from public storefront'
                        }
                        className={`inline-flex items-center gap-1 font-semibold px-2.5 py-1 rounded text-[11px] border cursor-pointer ${
                          p.hidden
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            : 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {p.hidden ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Show</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Hide</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditClick(p)}
                        className="inline-flex items-center gap-1 text-[#07152B] font-semibold px-2.5 py-1 rounded text-[11px] gold-bg-gradient hover:opacity-90 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDeleteProduct(p.id)}
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold px-2.5 py-1 rounded text-[11px] bg-rose-50 border border-rose-200 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
