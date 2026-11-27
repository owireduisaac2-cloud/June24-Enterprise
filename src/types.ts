export type CategorySlug = 'footwear' | 'cadet' | 'ghana' | 'clothing';

export type ProductIconType =
  | 'fa-shoe-prints'
  | 'fa-person-military-rifle'
  | 'fa-user-tie'
  | 'fa-shirt'
  | 'fa-shield-halved'
  | 'fa-box';

export type StockStatus = 'in_stock' | 'out_of_stock' | 'pre_order';

export interface Review {
  id: string;
  productId: string;
  author: string;
  location?: string;
  rating: number;
  comment: string;
  createdAtText: string;
  createdAtMs?: number;
  verifiedBuyer?: boolean;
  source?: 'cloud' | 'local' | 'curated';
}

export interface Product {
  id: string;
  name: string;
  category: CategorySlug;
  price: number;
  icon?: ProductIconType | string;
  tag?: string;
  imageUrls?: string[];
  imageUrl?: string;
  description?: string;
  ownerId?: string;
  source?: 'cloud' | 'local' | 'default';
  createdAtMs?: number;
  hidden?: boolean;
  stockStatus?: StockStatus;
  reviews?: Review[];
}

export interface CartItem extends Product {
  qty: number;
}

export interface ToastState {
  id: number;
  title: string;
  message: string;
  tone?: 'success' | 'info' | 'error';
}

export interface AdminCredentials {
  email: string;
  password: string;
}

export type PaymentMethod = 'mtn' | 'telecel' | 'card';

export type OrderStatus = 'confirmed' | 'processing' | 'dispatched' | 'delivered';

export interface OrderReceipt {
  orderNumber: string;
  customerName: string;
  phone: string;
  region: string;
  address: string;
  paymentMethod: PaymentMethod;
  itemCount: number;
  itemsSummary?: string;
  totalAmount: number;
  syncedToCloud: boolean;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  phone: string;
  region: string;
  address: string;
  paymentMethod: PaymentMethod;
  itemCount: number;
  itemsSummary?: string;
  totalAmount: number;
  status: OrderStatus;
  createdAtMs?: number;
  createdAtText: string;
  source: 'cloud' | 'local';
}

export interface OrderTrackingInfo {
  orderNumber: string;
  status: OrderStatus;
  region: string;
  itemCount: number;
  updatedAtText: string;
  source: 'cloud' | 'local';
}

