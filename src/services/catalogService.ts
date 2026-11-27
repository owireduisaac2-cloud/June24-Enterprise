import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { DEFAULT_PRODUCTS } from '../data/defaultProducts';
import { ADMIN_BOOTSTRAP_EMAIL, auth, db, handleFirestoreError, OperationType } from '../firebase';
import type {
  CategorySlug,
  OrderReceipt,
  OrderStatus,
  OrderTrackingInfo,
  PaymentMethod,
  Product,
  Review,
  StockStatus,
  StoreOrder,
} from '../types';

const IDB_NAME = 'june24_enterprise_store';
const IDB_VERSION = 1;
const STORE_PRODUCTS = 'catalog_items';
const STORE_META = 'catalog_meta';
const LOCAL_STORAGE_KEY = 'june24_local_catalog';
const DELETED_IDS_KEY = 'june24_deleted_product_ids';
const HIDDEN_IDS_KEY = 'june24_hidden_product_ids';
const STOCK_STATUS_MAP_KEY = 'june24_product_stock_statuses';
const DELETED_HISTORY_KEY = 'june24_deleted_history';
const UNDO_MIGRATION_KEY = 'june24_undo_migration_v1';
const LOCAL_ORDERS_KEY = 'june24_local_orders';
const LOCAL_FULL_ORDERS_KEY = 'june24_local_full_orders';
const LOCAL_REVIEWS_KEY = 'june24_local_reviews';

const VALID_CATEGORIES: CategorySlug[] = ['footwear', 'cadet', 'ghana', 'clothing'];
const VALID_STOCK_STATUSES: StockStatus[] = ['in_stock', 'out_of_stock', 'pre_order'];

export function normalizeStockStatus(value: unknown): StockStatus {
  return VALID_STOCK_STATUSES.includes(value as StockStatus)
    ? (value as StockStatus)
    : 'in_stock';
}

function openCatalogDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_PRODUCTS)) {
        database.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(STORE_META)) {
        database.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

async function readLocalItemsFromIDB(): Promise<Product[]> {
  try {
    const database = await openCatalogDB();
    return await new Promise<Product[]>((resolve, reject) => {
      const tx = database.transaction(STORE_PRODUCTS, 'readonly');
      const store = tx.objectStore(STORE_PRODUCTS);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as Product[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function writeLocalItemsToIDB(items: Product[]): Promise<void> {
  try {
    const database = await openCatalogDB();
    await new Promise<void>((resolve, reject) => {
      const tx = database.transaction(STORE_PRODUCTS, 'readwrite');
      const store = tx.objectStore(STORE_PRODUCTS);
      store.clear();
      for (const item of items) {
        store.put({ ...item, id: String(item.id) });
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Fallback handled by localStorage mirror when size permits
  }
}

function readLegacyLocalStorageItems(): Product[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...item,
      id: String(item.id),
      price: Number(item.price) || 0,
    }));
  } catch {
    return [];
  }
}

function mirrorToLocalStorage(items: Product[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // IndexedDB retains unlimited items even if localStorage reaches its 5MB quota
  }
}

export function readDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeDeletedProductIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

function readDeletedHistory(): Product[] {
  try {
    const raw = localStorage.getItem(DELETED_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Product[]) : [];
  } catch {
    return [];
  }
}

function writeDeletedHistory(items: Product[]): void {
  try {
    localStorage.setItem(DELETED_HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    // ignore
  }
}

function applyPendingDefaultRestoreOnce(): void {
  try {
    if (!localStorage.getItem(UNDO_MIGRATION_KEY)) {
      localStorage.removeItem(DELETED_IDS_KEY);
      localStorage.setItem(UNDO_MIGRATION_KEY, '1');
    }
  } catch {
    // ignore
  }
}

export function readHiddenProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HIDDEN_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeHiddenProductIds(ids: Set<string>): void {
  try {
    localStorage.setItem(HIDDEN_IDS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function readStockStatusMap(): Record<string, StockStatus> {
  try {
    const raw = localStorage.getItem(STOCK_STATUS_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: Record<string, StockStatus> = {};
    for (const [k, v] of Object.entries(parsed)) {
      clean[String(k)] = normalizeStockStatus(v);
    }
    return clean;
  } catch {
    return {};
  }
}

function writeStockStatusMap(map: Record<string, StockStatus>): void {
  try {
    localStorage.setItem(STOCK_STATUS_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function readAllLocalItems(): Promise<Product[]> {
  const [idbItems, legacyItems] = await Promise.all([
    readLocalItemsFromIDB(),
    Promise.resolve(readLegacyLocalStorageItems()),
  ]);

  const byId = new Map<string, Product>();
  for (const item of idbItems) {
    byId.set(String(item.id), { ...item, id: String(item.id) });
  }
  for (const item of legacyItems) {
    const id = String(item.id);
    if (!byId.has(id)) {
      byId.set(id, { ...item, id });
    }
  }
  return Array.from(byId.values());
}

export function isProductPendingCloudSync(p: Product): boolean {
  if (p.source === 'cloud') return false;
  return (
    p.source === 'local' ||
    p.id.startsWith('prod_') ||
    Boolean(p.hidden) ||
    (p.stockStatus !== undefined && p.stockStatus !== 'in_stock')
  );
}

function extractProductTimestamp(product: Product): number {
  if (typeof product.createdAtMs === 'number' && Number.isFinite(product.createdAtMs)) {
    return product.createdAtMs;
  }
  const match = /^prod_(\d+)_/.exec(String(product.id));
  return match ? Number(match[1]) || 0 : 0;
}

/**
 * Combines cloud items, locally accumulated items, and default catalog items
 * without overwriting any layer, allowing unlimited new items to accumulate persistently.
 */
export function mergeCatalogLayers(
  cloudItems: Product[],
  localItems: Product[],
  defaultItems: Product[],
  deletedIds: Set<string>,
  hiddenIds: Set<string> = readHiddenProductIds(),
  stockStatusMap: Record<string, StockStatus> = readStockStatusMap(),
): Product[] {
  const merged = new Map<string, Product>();

  // 1. Add cloud items first (most authoritative for shared records)
  for (const item of cloudItems) {
    const id = String(item.id);
    if (!deletedIds.has(id)) {
      merged.set(id, {
        ...item,
        id,
        hidden: Boolean(item.hidden),
        stockStatus: normalizeStockStatus(item.stockStatus),
        createdAtMs: extractProductTimestamp(item) || undefined,
        source: 'cloud',
      });
    }
  }

  // 2. Combine locally saved items without overwriting existing cloud items
  for (const item of localItems) {
    const id = String(item.id);
    if (deletedIds.has(id)) continue;
    const existing = merged.get(id);
    if (!existing) {
      merged.set(id, {
        ...item,
        id,
        hidden: Boolean(item.hidden) || hiddenIds.has(id),
        stockStatus: normalizeStockStatus(item.stockStatus ?? stockStatusMap[id]),
        source: item.source ?? 'local',
      });
    } else if (
      existing.source !== 'cloud' &&
      (item.createdAtMs ?? 0) > (existing.createdAtMs ?? 0)
    ) {
      merged.set(id, { ...existing, ...item, id });
    } else if (existing.source === 'cloud' && !existing.createdAtMs && item.createdAtMs) {
      merged.set(id, { ...existing, createdAtMs: item.createdAtMs });
    }
  }

  // 3. Combine default catalog items so base inventory is never lost
  for (const item of defaultItems) {
    const id = String(item.id);
    if (!deletedIds.has(id) && !merged.has(id)) {
      merged.set(id, {
        ...item,
        id,
        hidden: Boolean(item.hidden) || hiddenIds.has(id),
        stockStatus: normalizeStockStatus(item.stockStatus ?? stockStatusMap[id]),
        source: 'default',
      });
    }
  }

  const combined = Array.from(merged.values());

  // Keep newly created items (prod_...) at the front, sorted newest-first, followed by curated defaults
  return combined.sort((a, b) => {
    const aIsCustom = a.id.startsWith('prod_');
    const bIsCustom = b.id.startsWith('prod_');
    if (aIsCustom && !bIsCustom) return -1;
    if (!aIsCustom && bIsCustom) return 1;
    if (aIsCustom && bIsCustom) {
      return extractProductTimestamp(b) - extractProductTimestamp(a);
    }
    return Number(a.id) - Number(b.id);
  });
}

/**
 * Loads the store catalog by combining local items, live Firestore cloud items,
 * and default catalog items, ensuring unlimited persistent accumulation.
 */
export function loadStoreCatalog(
  onUpdate: (items: Product[]) => void,
  onSyncError?: (err: unknown) => void,
): () => void {
  let active = true;
  let latestCloudItems: Product[] = [];
  let latestLocalItems: Product[] = [];

  const emitMerged = () => {
    if (!active) return;
    const deletedIds = readDeletedProductIds();
    const combined = mergeCatalogLayers(
      latestCloudItems,
      latestLocalItems,
      DEFAULT_PRODUCTS,
      deletedIds,
    );
    onUpdate(combined);
  };

  // One-time restore of any previously deleted default catalog items
  applyPendingDefaultRestoreOnce();

  // Immediate local + default load
  void readAllLocalItems().then((localItems) => {
    latestLocalItems = localItems;
    emitMerged();
  });

  // Live Firestore cloud catalog listener
  const catalogRef = collection(db, 'catalog');
  const catalogQuery = query(catalogRef, where('category', 'in', VALID_CATEGORIES));

  const unsubscribe = onSnapshot(
    catalogQuery,
    async (snapshot) => {
      const cloudItems: Product[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        cloudItems.push({
          id: docSnap.id,
          name: String(data.name ?? ''),
          category: VALID_CATEGORIES.includes(data.category) ? data.category : 'footwear',
          price: Number(data.price) || 0,
          icon: typeof data.icon === 'string' ? data.icon : 'fa-box',
          tag: typeof data.tag === 'string' ? data.tag : 'Available',
          description: typeof data.description === 'string' ? data.description : '',
          imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls : [],
          hidden: Boolean(data.hidden),
          stockStatus: normalizeStockStatus(data.stockStatus),
          ownerId: typeof data.ownerId === 'string' ? data.ownerId : undefined,
          source: 'cloud',
        });
      });

      latestCloudItems = cloudItems;
      latestLocalItems = await readAllLocalItems();

      const deletedIds = readDeletedProductIds();
      const combined = mergeCatalogLayers(
        latestCloudItems,
        latestLocalItems,
        DEFAULT_PRODUCTS,
        deletedIds,
      );

      // Persist combined items locally without losing existing local entries
      await writeLocalItemsToIDB(combined);
      mirrorToLocalStorage(combined);

      if (active) {
        onUpdate(combined);
      }
    },
    (error) => {
      // Keep local + default catalog operational, while logging structured error
      if (onSyncError) {
        onSyncError(error);
      }
      emitMerged();
    },
  );

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function compressImageFile(file: File, maxWidth = 720, quality = 0.72): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function downscaleDataUrl(
  dataUrl: string,
  maxWidth = 640,
  quality = 0.68,
): Promise<string> {
  if (!dataUrl.startsWith('data:image/') || typeof document === 'undefined') {
    return dataUrl;
  }
  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = img.width > maxWidth ? maxWidth / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function fitImageUrlsForFirestoreAsync(urls: string[]): Promise<string[]> {
  const result: string[] = [];
  let totalChars = 0;

  for (const raw of urls.slice(0, 8)) {
    if (typeof raw !== 'string' || !raw) continue;
    let candidate = raw;

    if (candidate.length > 380000 && candidate.startsWith('data:image/')) {
      candidate = await downscaleDataUrl(candidate, 640, 0.65);
      if (candidate.length > 380000) {
        candidate = await downscaleDataUrl(candidate, 480, 0.55);
      }
    }

    if (result.length === 0 && candidate.length > 440000) continue;
    if (totalChars + candidate.length > 820000) break;
    result.push(candidate);
    totalChars += candidate.length;
  }

  return result;
}

async function upsertCatalogDocument(
  product: Product,
  userUid: string,
  operationForError: OperationType,
): Promise<string[]> {
  const id = String(product.id);
  const path = `catalog/${id}`;
  const docRef = doc(db, 'catalog', id);
  const cloudImageUrls = await fitImageUrlsForFirestoreAsync(product.imageUrls ?? []);

  const commonFields = {
    name: product.name.trim().slice(0, 160) || 'Product',
    category: VALID_CATEGORIES.includes(product.category) ? product.category : 'footwear',
    price: Number.isFinite(product.price) && product.price >= 0 ? Math.min(product.price, 1000000) : 0,
    tag: (product.tag ?? '').trim().slice(0, 48),
    icon: (product.icon ?? 'fa-box').slice(0, 64),
    description: (product.description ?? '').trim().slice(0, 2000),
    imageUrls: cloudImageUrls,
    hidden: Boolean(product.hidden),
    stockStatus: normalizeStockStatus(product.stockStatus),
  };

  try {
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      await updateDoc(docRef, {
        ...commonFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        id,
        ...commonFields,
        ownerId: userUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, operationForError, path);
  }

  return cloudImageUrls;
}

export interface ProductInput {
  name: string;
  category: CategorySlug;
  price: number;
  tag: string;
  icon: string;
  description: string;
  imageUrls: string[];
  stockStatus?: StockStatus;
}

export async function saveProductToCatalog(
  input: ProductInput,
  currentProducts: Product[],
  editId?: string | null,
): Promise<{ updatedProducts: Product[]; savedProduct: Product; syncedToCloud: boolean }> {
  const isEditing = Boolean(editId);
  const id = editId
    ? String(editId)
    : `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const existingItem = currentProducts.find((p) => String(p.id) === id);
  const nowMs = Date.now();
  const nextStockStatus = normalizeStockStatus(input.stockStatus ?? existingItem?.stockStatus);

  const savedProduct: Product = {
    id,
    name: input.name.trim().slice(0, 160),
    category: input.category,
    price: Number.isFinite(input.price) && input.price >= 0 ? input.price : 0,
    tag: input.tag.trim().slice(0, 48) || 'Available',
    icon: input.icon || 'fa-shoe-prints',
    description: input.description.trim().slice(0, 2000),
    imageUrls: input.imageUrls.slice(0, 8),
    hidden: Boolean(existingItem?.hidden),
    stockStatus: nextStockStatus,
    createdAtMs: existingItem?.createdAtMs ?? nowMs,
    source: 'local',
  };

  const stockMap = readStockStatusMap();
  stockMap[id] = nextStockStatus;
  writeStockStatusMap(stockMap);

  // Ensure product is not marked deleted
  const deletedIds = readDeletedProductIds();
  if (deletedIds.has(id)) {
    deletedIds.delete(id);
    writeDeletedProductIds(deletedIds);
  }

  // Persist locally in IndexedDB + mirror
  const localItems = await readAllLocalItems();
  const nextLocal = isEditing
    ? localItems.some((p) => String(p.id) === id)
      ? localItems.map((p) => (String(p.id) === id ? savedProduct : p))
      : [savedProduct, ...localItems]
    : [savedProduct, ...localItems];

  await writeLocalItemsToIDB(nextLocal);
  mirrorToLocalStorage(nextLocal);

  let syncedToCloud = false;
  const user = auth.currentUser;
  if (user && user.emailVerified) {
    const cloudImageUrls = await upsertCatalogDocument(
      savedProduct,
      user.uid,
      isEditing ? OperationType.UPDATE : OperationType.CREATE,
    );
    savedProduct.imageUrls = cloudImageUrls;
    savedProduct.ownerId = existingItem?.ownerId ?? user.uid;
    savedProduct.source = 'cloud';
    syncedToCloud = true;
  }

  const updatedProducts = mergeCatalogLayers(
    syncedToCloud ? [savedProduct] : [],
    nextLocal,
    currentProducts,
    deletedIds,
  );

  return { updatedProducts, savedProduct, syncedToCloud };
}

let activeCloudSyncPromise: Promise<{
  syncedCount: number;
  updatedProducts: Product[];
}> | null = null;

export async function syncLocalCatalogToCloud(currentProducts: Product[]): Promise<{
  syncedCount: number;
  updatedProducts: Product[];
}> {
  if (activeCloudSyncPromise) {
    return activeCloudSyncPromise;
  }

  activeCloudSyncPromise = (async () => {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
      return { syncedCount: 0, updatedProducts: currentProducts };
    }

    const localItems = await readAllLocalItems();
    const byId = new Map<string, Product>();
    for (const item of [...currentProducts, ...localItems]) {
      const id = String(item.id);
      if (!byId.has(id)) {
        byId.set(id, item);
      }
    }

    const candidates = Array.from(byId.values()).filter(isProductPendingCloudSync);

    if (candidates.length === 0) {
      return { syncedCount: 0, updatedProducts: currentProducts };
    }

    const syncedItems: Product[] = [];
    for (const item of candidates) {
      const id = String(item.id);
      const cloudImageUrls = await upsertCatalogDocument(item, user.uid, OperationType.CREATE);
      syncedItems.push({
        ...item,
        id,
        imageUrls: cloudImageUrls,
        ownerId: item.ownerId ?? user.uid,
        source: 'cloud',
      });
    }

    const deletedIds = readDeletedProductIds();
    const hiddenIds = readHiddenProductIds();
    const stockMap = readStockStatusMap();
    const existingCloud = currentProducts.filter((p) => p.source === 'cloud');
    const updatedProducts = mergeCatalogLayers(
      [...syncedItems, ...existingCloud],
      localItems,
      DEFAULT_PRODUCTS,
      deletedIds,
      hiddenIds,
      stockMap,
    );

    await writeLocalItemsToIDB(updatedProducts);
    mirrorToLocalStorage(updatedProducts);

    return { syncedCount: syncedItems.length, updatedProducts };
  })().finally(() => {
    activeCloudSyncPromise = null;
  });

  return activeCloudSyncPromise;
}

export async function toggleProductVisibility(
  product: Product,
  currentProducts: Product[],
): Promise<{ updatedProducts: Product[]; nextHidden: boolean; syncedToCloud: boolean }> {
  const id = String(product.id);
  const nextHidden = !Boolean(product.hidden);

  const hiddenIds = readHiddenProductIds();
  if (nextHidden) {
    hiddenIds.add(id);
  } else {
    hiddenIds.delete(id);
  }
  writeHiddenProductIds(hiddenIds);

  const updatedItem: Product = {
    ...product,
    id,
    hidden: nextHidden,
    createdAtMs: product.createdAtMs ?? Date.now(),
    source: product.source === 'cloud' ? 'cloud' : 'local',
  };

  const localItems = await readAllLocalItems();
  const nextLocal = localItems.some((p) => String(p.id) === id)
    ? localItems.map((p) => (String(p.id) === id ? { ...p, hidden: nextHidden } : p))
    : [updatedItem, ...localItems];
  await writeLocalItemsToIDB(nextLocal);
  mirrorToLocalStorage(nextLocal);

  let syncedToCloud = false;
  const user = auth.currentUser;
  if (user && user.emailVerified) {
    await upsertCatalogDocument(updatedItem, user.uid, OperationType.UPDATE);
    updatedItem.source = 'cloud';
    syncedToCloud = true;
  }

  const deletedIds = readDeletedProductIds();
  const existingCloud = currentProducts.filter(
    (p) => p.source === 'cloud' && String(p.id) !== id,
  );
  const updatedProducts = mergeCatalogLayers(
    syncedToCloud ? [updatedItem, ...existingCloud] : existingCloud,
    nextLocal,
    DEFAULT_PRODUCTS,
    deletedIds,
    hiddenIds,
  );

  return { updatedProducts, nextHidden, syncedToCloud };
}

export async function updateProductStockStatus(
  product: Product,
  nextStatus: StockStatus,
  currentProducts: Product[],
): Promise<{ updatedProducts: Product[]; stockStatus: StockStatus; syncedToCloud: boolean }> {
  const id = String(product.id);
  const stockStatus = normalizeStockStatus(nextStatus);

  const stockMap = readStockStatusMap();
  stockMap[id] = stockStatus;
  writeStockStatusMap(stockMap);

  const updatedItem: Product = {
    ...product,
    id,
    stockStatus,
    createdAtMs: product.createdAtMs ?? Date.now(),
    source: product.source === 'cloud' ? 'cloud' : 'local',
  };

  const localItems = await readAllLocalItems();
  const nextLocal = localItems.some((p) => String(p.id) === id)
    ? localItems.map((p) => (String(p.id) === id ? { ...p, stockStatus } : p))
    : [updatedItem, ...localItems];
  await writeLocalItemsToIDB(nextLocal);
  mirrorToLocalStorage(nextLocal);

  let syncedToCloud = false;
  const user = auth.currentUser;
  if (user && user.emailVerified) {
    await upsertCatalogDocument(updatedItem, user.uid, OperationType.UPDATE);
    updatedItem.source = 'cloud';
    syncedToCloud = true;
  }

  const deletedIds = readDeletedProductIds();
  const hiddenIds = readHiddenProductIds();
  const existingCloud = currentProducts.filter(
    (p) => p.source === 'cloud' && String(p.id) !== id,
  );
  const updatedProducts = mergeCatalogLayers(
    syncedToCloud ? [updatedItem, ...existingCloud] : existingCloud,
    nextLocal,
    DEFAULT_PRODUCTS,
    deletedIds,
    hiddenIds,
    stockMap,
  );

  return { updatedProducts, stockStatus, syncedToCloud };
}

export async function deleteProductFromCatalog(
  productId: string,
  currentProducts: Product[],
): Promise<Product[]> {
  const id = String(productId);
  const deletedSnapshot =
    currentProducts.find((p) => String(p.id) === id) ??
    DEFAULT_PRODUCTS.find((p) => String(p.id) === id);

  if (deletedSnapshot) {
    const history = readDeletedHistory().filter((p) => String(p.id) !== id);
    writeDeletedHistory([{ ...deletedSnapshot, id }, ...history]);
  }

  const deletedIds = readDeletedProductIds();
  deletedIds.add(id);
  writeDeletedProductIds(deletedIds);

  const localItems = await readAllLocalItems();
  const nextLocal = localItems.filter((p) => String(p.id) !== id);
  await writeLocalItemsToIDB(nextLocal);
  mirrorToLocalStorage(nextLocal);

  const user = auth.currentUser;
  if (user && user.emailVerified) {
    const path = `catalog/${id}`;
    try {
      await deleteDoc(doc(db, 'catalog', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  return currentProducts.filter((p) => String(p.id) !== id);
}

export async function undoLastDeletion(currentProducts: Product[]): Promise<{
  updatedProducts: Product[];
  restoredProduct: Product | null;
  syncedToCloud: boolean;
}> {
  const history = readDeletedHistory();
  const deletedIds = readDeletedProductIds();
  let syncedToCloud = false;

  if (history.length > 0) {
    const [restored, ...remainingHistory] = history;
    const id = String(restored.id);
    writeDeletedHistory(remainingHistory);

    deletedIds.delete(id);
    writeDeletedProductIds(deletedIds);

    const restoredItem: Product = { ...restored, id };
    const localItems = await readAllLocalItems();
    const nextLocal = [restoredItem, ...localItems.filter((p) => String(p.id) !== id)];
    await writeLocalItemsToIDB(nextLocal);
    mirrorToLocalStorage(nextLocal);

    const user = auth.currentUser;
    if (user && user.emailVerified && (restoredItem.source === 'cloud' || id.startsWith('prod_'))) {
      const cloudImageUrls = await upsertCatalogDocument(
        restoredItem,
        user.uid,
        OperationType.CREATE,
      );
      restoredItem.imageUrls = cloudImageUrls;
      restoredItem.source = 'cloud';
      syncedToCloud = true;
    }

    const existingCloud = currentProducts.filter((p) => p.source === 'cloud');
    const updatedProducts = mergeCatalogLayers(
      syncedToCloud ? [restoredItem, ...existingCloud] : existingCloud,
      nextLocal,
      DEFAULT_PRODUCTS,
      deletedIds,
    );
    return { updatedProducts, restoredProduct: restoredItem, syncedToCloud };
  }

  // Fallback: if any default items were marked deleted before history tracking
  if (deletedIds.size > 0) {
    const firstRestoredDefault =
      DEFAULT_PRODUCTS.find((p) => deletedIds.has(String(p.id))) ?? null;
    writeDeletedProductIds(new Set());
    const localItems = await readAllLocalItems();
    const updatedProducts = mergeCatalogLayers(
      currentProducts,
      localItems,
      DEFAULT_PRODUCTS,
      new Set(),
    );
    await writeLocalItemsToIDB(updatedProducts);
    mirrorToLocalStorage(updatedProducts);
    return { updatedProducts, restoredProduct: firstRestoredDefault, syncedToCloud: false };
  }

  return { updatedProducts: currentProducts, restoredProduct: null, syncedToCloud: false };
}

export function readLocalFullOrders(): StoreOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_FULL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoreOrder[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFullOrders(orders: StoreOrder[]): void {
  try {
    localStorage.setItem(LOCAL_FULL_ORDERS_KEY, JSON.stringify(orders.slice(0, 50)));
  } catch {
    // ignore storage limits
  }
}

export async function submitStoreOrder(payload: {
  customerName: string;
  phone: string;
  region: string;
  address: string;
  paymentMethod: PaymentMethod;
  itemCount: number;
  itemsSummary?: string;
  totalAmount: number;
}): Promise<OrderReceipt> {
  const orderNumber = `J24-${Math.floor(100000 + Math.random() * 900000)}`;
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const safeItemCount = Math.max(1, Math.round(payload.itemCount));
  const safeRegion = payload.region.trim().slice(0, 80);
  const safeCustomerName = payload.customerName.trim().slice(0, 120);
  const safePhone = payload.phone.trim().slice(0, 30);
  const safeAddress = payload.address.trim().slice(0, 240);
  const safeItemsSummary = (payload.itemsSummary ?? '').trim().slice(0, 500);
  const safeTotal = Number(payload.totalAmount.toFixed(2));
  const createdAtText = new Date().toLocaleDateString('en-GH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  let syncedToCloud = false;

  // Save PII-free tracking record locally as fallback
  try {
    const existingRaw = localStorage.getItem(LOCAL_ORDERS_KEY);
    const existingList: OrderTrackingInfo[] = existingRaw ? JSON.parse(existingRaw) : [];
    const localRecord: OrderTrackingInfo = {
      orderNumber,
      status: 'confirmed',
      region: safeRegion,
      itemCount: safeItemCount,
      updatedAtText: createdAtText,
      source: 'local',
    };
    const nextList: OrderTrackingInfo[] = [
      localRecord,
      ...existingList.filter((o) => o.orderNumber !== orderNumber),
    ].slice(0, 20);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(nextList));
  } catch {
    // ignore storage limits
  }

  // Write PII-free tracking record to Firestore for cross-device Order Tracking lookup
  const trackingPath = `orderTracking/${orderNumber}`;
  try {
    await setDoc(doc(db, 'orderTracking', orderNumber), {
      orderNumber,
      status: 'confirmed',
      region: safeRegion,
      itemCount: safeItemCount,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    syncedToCloud = true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, trackingPath);
  }

  const user = auth.currentUser;
  const customerId = user && user.emailVerified ? user.uid : 'guest';
  let orderSyncedToCloud = false;

  if (!user || user.emailVerified) {
    const path = `orders/${orderId}`;
    try {
      await setDoc(doc(db, 'orders', orderId), {
        orderNumber,
        customerId,
        customerName: safeCustomerName,
        phone: safePhone,
        region: safeRegion,
        address: safeAddress,
        paymentMethod: payload.paymentMethod,
        itemCount: safeItemCount,
        ...(safeItemsSummary ? { itemsSummary: safeItemsSummary } : {}),
        totalAmount: safeTotal,
        status: 'confirmed',
        createdAt: serverTimestamp(),
      });
      orderSyncedToCloud = true;
      syncedToCloud = true;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  const localFullOrder: StoreOrder = {
    id: orderId,
    orderNumber,
    customerId,
    customerName: safeCustomerName,
    phone: safePhone,
    region: safeRegion,
    address: safeAddress,
    paymentMethod: payload.paymentMethod,
    itemCount: safeItemCount,
    itemsSummary: safeItemsSummary || undefined,
    totalAmount: safeTotal,
    status: 'confirmed',
    createdAtMs: Date.now(),
    createdAtText,
    source: orderSyncedToCloud ? 'cloud' : 'local',
  };
  writeLocalFullOrders([
    localFullOrder,
    ...readLocalFullOrders().filter((o) => o.orderNumber !== orderNumber),
  ]);

  return {
    orderNumber,
    customerName: safeCustomerName,
    phone: safePhone,
    region: payload.region,
    address: safeAddress,
    paymentMethod: payload.paymentMethod,
    itemCount: safeItemCount,
    itemsSummary: safeItemsSummary || undefined,
    totalAmount: payload.totalAmount,
    syncedToCloud,
  };
}

const VALID_ORDER_STATUSES: OrderStatus[] = ['confirmed', 'processing', 'dispatched', 'delivered'];

function mergeOrders(cloudOrders: StoreOrder[], localOrders: StoreOrder[]): StoreOrder[] {
  const byOrderNumber = new Map<string, StoreOrder>();
  for (const order of cloudOrders) {
    byOrderNumber.set(order.orderNumber, order);
  }
  for (const order of localOrders) {
    if (!byOrderNumber.has(order.orderNumber)) {
      byOrderNumber.set(order.orderNumber, order);
    }
  }
  return Array.from(byOrderNumber.values()).sort(
    (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
  );
}

export function subscribeToAdminOrders(
  onUpdate: (orders: StoreOrder[]) => void,
  onError?: (err: unknown) => void,
): () => void {
  const localOrders = readLocalFullOrders();
  onUpdate(mergeOrders([], localOrders));

  const user = auth.currentUser;
  if (!user || !user.emailVerified || user.email !== ADMIN_BOOTSTRAP_EMAIL) {
    return () => {};
  }

  const ordersRef = collection(db, 'orders');
  const unsubscribe = onSnapshot(
    ordersRef,
    (snapshot) => {
      const cloudOrders: StoreOrder[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAtDate =
          data.createdAt && typeof data.createdAt.toDate === 'function'
            ? (data.createdAt.toDate() as Date)
            : null;
        const status: OrderStatus = VALID_ORDER_STATUSES.includes(data.status)
          ? data.status
          : 'confirmed';
        const paymentMethod: PaymentMethod =
          data.paymentMethod === 'telecel' || data.paymentMethod === 'card'
            ? data.paymentMethod
            : 'mtn';

        cloudOrders.push({
          id: docSnap.id,
          orderNumber: String(data.orderNumber ?? docSnap.id),
          customerId: String(data.customerId ?? 'guest'),
          customerName: String(data.customerName ?? 'Customer'),
          phone: String(data.phone ?? ''),
          region: String(data.region ?? 'Ghana'),
          address: String(data.address ?? ''),
          paymentMethod,
          itemCount: Number(data.itemCount) || 1,
          itemsSummary: typeof data.itemsSummary === 'string' ? data.itemsSummary : undefined,
          totalAmount: Number(data.totalAmount) || 0,
          status,
          createdAtMs: createdAtDate ? createdAtDate.getTime() : 0,
          createdAtText: createdAtDate
            ? createdAtDate.toLocaleString('en-GH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Recent order',
          source: 'cloud',
        });
      });

      const merged = mergeOrders(cloudOrders, readLocalFullOrders());
      writeLocalFullOrders(merged);
      onUpdate(merged);
    },
    (error) => {
      if (onError) onError(error);
    },
  );

  return unsubscribe;
}

export async function updateStoreOrderStatus(
  order: StoreOrder,
  nextStatus: OrderStatus,
): Promise<void> {
  const status = VALID_ORDER_STATUSES.includes(nextStatus) ? nextStatus : 'confirmed';

  // Update local fallback copy
  const updatedLocal = readLocalFullOrders().map((o) =>
    o.id === order.id || o.orderNumber === order.orderNumber ? { ...o, status } : o,
  );
  writeLocalFullOrders(updatedLocal);

  try {
    const rawTracking = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (rawTracking) {
      const list = JSON.parse(rawTracking) as OrderTrackingInfo[];
      const nextTracking = list.map((o) =>
        o.orderNumber === order.orderNumber ? { ...o, status } : o,
      );
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(nextTracking));
    }
  } catch {
    // ignore
  }

  const user = auth.currentUser;
  if (user && user.emailVerified && order.source === 'cloud') {
    const orderPath = `orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'orders', order.id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, orderPath);
    }
  }

  if (user && user.emailVerified) {
    const trackingPath = `orderTracking/${order.orderNumber}`;
    try {
      const trackingRef = doc(db, 'orderTracking', order.orderNumber);
      const trackingSnap = await getDoc(trackingRef);
      if (trackingSnap.exists()) {
        await updateDoc(trackingRef, {
          status,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, trackingPath);
    }
  }
}

export function getRecentLocalOrderNumbers(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrderTrackingInfo[];
    return Array.isArray(parsed) ? parsed.map((o) => o.orderNumber).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export async function trackOrderByNumber(
  rawOrderNumber: string,
): Promise<OrderTrackingInfo | null> {
  const cleaned = rawOrderNumber.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (!cleaned || cleaned.length < 4 || cleaned.length > 32) {
    return null;
  }

  const normalized = /^\d{6}$/.test(cleaned) ? `J24-${cleaned}` : cleaned;
  const path = `orderTracking/${normalized}`;

  try {
    const snap = await getDoc(doc(db, 'orderTracking', normalized));
    if (snap.exists()) {
      const data = snap.data();
      const status: OrderStatus = VALID_ORDER_STATUSES.includes(data.status)
        ? data.status
        : 'confirmed';
      const updatedDate =
        data.updatedAt && typeof data.updatedAt.toDate === 'function'
          ? (data.updatedAt.toDate() as Date).toLocaleDateString('en-GH', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Recently updated';
      return {
        orderNumber: String(data.orderNumber ?? normalized),
        status,
        region: String(data.region ?? 'Ghana'),
        itemCount: Number(data.itemCount) || 1,
        updatedAtText: updatedDate,
        source: 'cloud',
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  // Fallback to locally stored orders on this device
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (raw) {
      const list = JSON.parse(raw) as OrderTrackingInfo[];
      const match = list.find((o) => o.orderNumber.toUpperCase() === normalized);
      if (match) return match;
    }
  } catch {
    // ignore
  }

  return null;
}

const NEWSLETTER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(
  rawEmail: string,
): Promise<{ email: string; subscriberId: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (email.length < 5 || email.length > 160 || !NEWSLETTER_EMAIL_REGEX.test(email)) {
    throw new Error('Please enter a valid email address between 5 and 160 characters.');
  }

  const subscriberId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `subscribers/${subscriberId}`;

  try {
    await setDoc(doc(db, 'subscribers', subscriberId), {
      email,
      source: 'footer_newsletter',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return { email, subscriberId };
}

function readLocalReviews(): Review[] {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Review[]) : [];
  } catch {
    return [];
  }
}

function writeLocalReviews(reviews: Review[]): void {
  try {
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(reviews.slice(0, 100)));
  } catch {
    // ignore storage limits
  }
}

function groupReviewsByProduct(cloudReviews: Review[], localReviews: Review[]): Record<string, Review[]> {
  const byId = new Map<string, Review>();
  for (const rev of cloudReviews) {
    byId.set(rev.id, rev);
  }
  for (const rev of localReviews) {
    if (!byId.has(rev.id)) {
      byId.set(rev.id, rev);
    }
  }

  const grouped: Record<string, Review[]> = {};
  for (const rev of Array.from(byId.values()).sort(
    (a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0),
  )) {
    const pid = String(rev.productId);
    if (!grouped[pid]) grouped[pid] = [];
    grouped[pid].push(rev);
  }
  return grouped;
}

export function subscribeToProductReviews(
  onUpdate: (reviewsByProduct: Record<string, Review[]>) => void,
  onError?: (err: unknown) => void,
): () => void {
  onUpdate(groupReviewsByProduct([], readLocalReviews()));

  const reviewsRef = collection(db, 'reviews');
  const reviewsQuery = query(reviewsRef, where('rating', '>=', 1));

  const unsubscribe = onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const cloudReviews: Review[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAtDate =
          data.createdAt && typeof data.createdAt.toDate === 'function'
            ? (data.createdAt.toDate() as Date)
            : null;
        const ratingNum = Math.min(5, Math.max(1, Math.round(Number(data.rating) || 5)));

        cloudReviews.push({
          id: docSnap.id,
          productId: String(data.productId ?? ''),
          author: String(data.author ?? 'Customer'),
          location: typeof data.location === 'string' && data.location ? data.location : undefined,
          rating: ratingNum,
          comment: String(data.comment ?? ''),
          createdAtMs: createdAtDate ? createdAtDate.getTime() : 0,
          createdAtText: createdAtDate
            ? createdAtDate.toLocaleDateString('en-GH', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          source: 'cloud',
        });
      });

      const mergedList = Array.from(
        new Map(
          [...cloudReviews, ...readLocalReviews()].map((r) => [r.id, r]),
        ).values(),
      );
      writeLocalReviews(mergedList);
      onUpdate(groupReviewsByProduct(cloudReviews, readLocalReviews()));
    },
    (error) => {
      if (onError) onError(error);
    },
  );

  return unsubscribe;
}

export async function submitProductReview(payload: {
  productId: string;
  author: string;
  location?: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const safeProductId = String(payload.productId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128);
  const safeAuthor = payload.author.trim().slice(0, 80);
  const safeLocation = (payload.location ?? '').trim().slice(0, 80);
  const safeComment = payload.comment.trim().slice(0, 800);
  const safeRating = Math.min(5, Math.max(1, Math.round(payload.rating)));

  if (!safeProductId) {
    throw new Error('Invalid product selected for review.');
  }
  if (safeAuthor.length < 2) {
    throw new Error('Please enter your name (at least 2 characters).');
  }
  if (safeComment.length < 5) {
    throw new Error('Please write a brief review (at least 5 characters).');
  }

  const reviewId = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const createdAtText = new Date().toLocaleDateString('en-GH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const localReview: Review = {
    id: reviewId,
    productId: safeProductId,
    author: safeAuthor,
    location: safeLocation || undefined,
    rating: safeRating,
    comment: safeComment,
    createdAtMs: Date.now(),
    createdAtText,
    source: 'local',
  };

  writeLocalReviews([localReview, ...readLocalReviews()]);

  const path = `reviews/${reviewId}`;
  try {
    await setDoc(doc(db, 'reviews', reviewId), {
      productId: safeProductId,
      author: safeAuthor,
      ...(safeLocation ? { location: safeLocation } : {}),
      rating: safeRating,
      comment: safeComment,
      createdAt: serverTimestamp(),
    });
    localReview.source = 'cloud';
    writeLocalReviews([
      localReview,
      ...readLocalReviews().filter((r) => r.id !== reviewId),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return localReview;
}

