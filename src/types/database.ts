export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string; // e.g. "250g", "500g", "1 kg"
  weight_grams: number;
  price: number;
  mrp: number;
  sku: string | null;
  stock_status: StockStatus;
  stock_quantity: number;
  display_order: number;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  is_primary: boolean;
  display_order: number;
}

export interface Product {
  id: string;
  category_id: string | null;
  category?: Category;
  name: string;
  slug: string;
  description: string;
  ingredients: string | null;
  shelf_life_days: number;
  is_eggless: boolean;
  is_pure_ghee: boolean;
  is_bestseller: boolean;
  is_featured: boolean;
  is_active: boolean;
  badge_label: string | null;
  created_at?: string;
  variants: ProductVariant[];
  images: ProductImage[];
}

export interface GiftHamperItem {
  id: string;
  hamper_id: string;
  item_name: string;
  item_quantity: string;
  display_order: number;
}

export interface GiftHamper {
  id: string;
  name: string;
  slug: string;
  description: string;
  hamper_price: number;
  mrp: number;
  image_url: string;
  box_type: string;
  is_featured: boolean;
  is_active: boolean;
  items?: GiftHamperItem[];
}

export interface Offer {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  code: string | null;
  discount_text: string | null;
  bg_color: string | null;
  is_active: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_text: string;
  cta_link: string;
  badge: string | null;
  display_order: number;
  is_active: boolean;
}

export interface DeliverySlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  cutoff_at: string;
  is_active: boolean;
}

export interface StoreSettings {
  id: number;
  store_name: string;
  tagline: string;
  store_phone: string;
  whatsapp: string;
  store_email: string;
  address_text: string;
  allowed_pincodes: string[];
  delivery_charge_flat: number;
  free_delivery_above: number;
  cod_limit_amount: number;
  tax_rate_percent: number;
  opening_time: string;
  closing_time: string;
  is_store_open: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface BulkOrderEnquiry {
  id?: string;
  contact_name: string;
  phone: string;
  email?: string;
  event_type: string;
  event_date: string;
  estimated_guests?: number;
  estimated_quantity_kg?: number;
  requested_sweets?: string;
  notes?: string;
  status?: 'NEW' | 'CONTACTED' | 'QUOTED' | 'WON' | 'LOST';
}
