import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isLiveSupabase = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('placeholder')
);

export const supabaseServer: SupabaseClient | null = isLiveSupabase
  ? createClient(supabaseUrl as string, supabaseServiceKey as string, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Product variants master list with official prices from Barabanki store (matches seed.sql)
export interface MasterVariant {
  id: string;
  productId: string;
  productName: string;
  label: string;
  weightGrams: number;
  price: number;
  mrp: number;
  imageUrl: string;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  stockQuantity: number;
}

export const MASTER_VARIANTS: MasterVariant[] = [
  // Signature Kaju Katli
  {
    id: 'v-kk-250',
    productId: 'prod-kaju-katli',
    productName: 'Signature Silver Leaf Kaju Katli',
    label: '250g',
    weightGrams: 250,
    price: 260,
    mrp: 280,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 100,
  },
  {
    id: 'v-kk-500',
    productId: 'prod-kaju-katli',
    productName: 'Signature Silver Leaf Kaju Katli',
    label: '500g',
    weightGrams: 500,
    price: 510,
    mrp: 550,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 75,
  },
  {
    id: 'v-kk-1kg',
    productId: 'prod-kaju-katli',
    productName: 'Signature Silver Leaf Kaju Katli',
    label: '1 kg Box',
    weightGrams: 1000,
    price: 990,
    mrp: 1080,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 40,
  },

  // Pure Shuddh Ghee Motichoor Ladoo
  {
    id: 'v-ml-250',
    productId: 'prod-motichoor-ladoo',
    productName: 'Pure Shuddh Ghee Motichoor Ladoo',
    label: '250g',
    weightGrams: 250,
    price: 175,
    mrp: 190,
    imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 120,
  },
  {
    id: 'v-ml-500',
    productId: 'prod-motichoor-ladoo',
    productName: 'Pure Shuddh Ghee Motichoor Ladoo',
    label: '500g',
    weightGrams: 500,
    price: 340,
    mrp: 370,
    imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 85,
  },
  {
    id: 'v-ml-1kg',
    productId: 'prod-motichoor-ladoo',
    productName: 'Pure Shuddh Ghee Motichoor Ladoo',
    label: '1 kg Box',
    weightGrams: 1000,
    price: 660,
    mrp: 720,
    imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 50,
  },

  // Royal Saffron Gulab Jamun
  {
    id: 'v-gj-500',
    productId: 'prod-gulab-jamun',
    productName: 'Royal Saffron Gulab Jamun',
    label: '500g (Approx 8 pcs)',
    weightGrams: 500,
    price: 240,
    mrp: 260,
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 60,
  },
  {
    id: 'v-gj-1kg',
    productId: 'prod-gulab-jamun',
    productName: 'Royal Saffron Gulab Jamun',
    label: '1 kg (Approx 16 pcs)',
    weightGrams: 1000,
    price: 460,
    mrp: 500,
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 40,
  },

  // Awadhi Desi Ghee Besan Ladoo
  {
    id: 'v-bl-250',
    productId: 'prod-besan-ladoo',
    productName: 'Awadhi Desi Ghee Besan Ladoo',
    label: '250g',
    weightGrams: 250,
    price: 180,
    mrp: 200,
    imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 90,
  },
  {
    id: 'v-bl-500',
    productId: 'prod-besan-ladoo',
    productName: 'Awadhi Desi Ghee Besan Ladoo',
    label: '500g',
    weightGrams: 500,
    price: 350,
    mrp: 390,
    imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 60,
  },
  {
    id: 'v-bl-1kg',
    productId: 'prod-besan-ladoo',
    productName: 'Awadhi Desi Ghee Besan Ladoo',
    label: '1 kg Box',
    weightGrams: 1000,
    price: 680,
    mrp: 750,
    imageUrl: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 35,
  },

  // Mathura Style Roasted Peda
  {
    id: 'v-mp-250',
    productId: 'prod-mathura-peda',
    productName: 'Mathura Style Roasted Peda',
    label: '250g',
    weightGrams: 250,
    price: 160,
    mrp: 180,
    imageUrl: 'https://images.unsplash.com/photo-1601050690113-1ec941ea624b?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 80,
  },
  {
    id: 'v-mp-500',
    productId: 'prod-mathura-peda',
    productName: 'Mathura Style Roasted Peda',
    label: '500g',
    weightGrams: 500,
    price: 310,
    mrp: 350,
    imageUrl: 'https://images.unsplash.com/photo-1601050690113-1ec941ea624b?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 55,
  },

  // Kolkata Style Spongy Rasgulla
  {
    id: 'v-rg-500',
    productId: 'prod-rasgulla',
    productName: 'Kolkata Style Spongy Rasgulla',
    label: '500g (Approx 6 pcs)',
    weightGrams: 500,
    price: 190,
    mrp: 210,
    imageUrl: 'https://images.unsplash.com/photo-1616031037011-087000171abe?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 50,
  },
  {
    id: 'v-rg-1kg',
    productId: 'prod-rasgulla',
    productName: 'Kolkata Style Spongy Rasgulla',
    label: '1 kg (Approx 12 pcs)',
    weightGrams: 1000,
    price: 360,
    mrp: 400,
    imageUrl: 'https://images.unsplash.com/photo-1616031037011-087000171abe?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 30,
  },

  // Awadhi Shahi Dalmoth
  {
    id: 'v-dm-250',
    productId: 'prod-dalmoth',
    productName: 'Awadhi Shahi Dalmoth Mixture',
    label: '250g Pouch',
    weightGrams: 250,
    price: 130,
    mrp: 145,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 120,
  },
  {
    id: 'v-dm-500',
    productId: 'prod-dalmoth',
    productName: 'Awadhi Shahi Dalmoth Mixture',
    label: '500g Pouch',
    weightGrams: 500,
    price: 250,
    mrp: 280,
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 90,
  },

  // Crispy Ajwain Mathri
  {
    id: 'v-mt-400',
    productId: 'prod-mathri',
    productName: 'Crispy Ajwain Khasta Mathri',
    label: '400g Box',
    weightGrams: 400,
    price: 150,
    mrp: 170,
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 80,
  },

  // Royal Gift Hampers
  {
    id: 'hamper-var-hamper-awadh-darbar',
    productId: 'hamper-awadh-darbar',
    productName: 'The Awadh Darbar Royal Hamper',
    label: 'Embossed Silk Gold Trunk Box',
    weightGrams: 1000,
    price: 1450,
    mrp: 1650,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 25,
  },
  {
    id: 'hamper-var-hamper-utsav-casket',
    productId: 'hamper-utsav-casket',
    productName: 'Utsav Mithai & Dry Fruits Casket',
    label: 'Maroon & Gold Velvet Box',
    weightGrams: 1000,
    price: 1150,
    mrp: 1300,
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    stockStatus: 'IN_STOCK',
    stockQuantity: 30,
  },
  { id: 'v-mini-samosa-250', productId: 'prod-mini-samosa', productName: 'Mini Samosa', label: '250g', weightGrams: 250, price: 170, mrp: 170, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-samosa-500', productId: 'prod-mini-samosa', productName: 'Mini Samosa', label: '500g', weightGrams: 500, price: 340, mrp: 340, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-samosa-1kg', productId: 'prod-mini-samosa', productName: 'Mini Samosa', label: '1kg', weightGrams: 1000, price: 680, mrp: 680, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-khasta-250', productId: 'prod-mini-khasta', productName: 'Mini Khasta', label: '250g', weightGrams: 250, price: 170, mrp: 170, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-khasta-500', productId: 'prod-mini-khasta', productName: 'Mini Khasta', label: '500g', weightGrams: 500, price: 340, mrp: 340, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-khasta-1kg', productId: 'prod-mini-khasta', productName: 'Mini Khasta', label: '1kg', weightGrams: 1000, price: 680, mrp: 680, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-plain-mathri-250', productId: 'prod-plain-mathri', productName: 'Plain Mathri', label: '250g', weightGrams: 250, price: 170, mrp: 170, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-plain-mathri-500', productId: 'prod-plain-mathri', productName: 'Plain Mathri', label: '500g', weightGrams: 500, price: 340, mrp: 340, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-plain-mathri-1kg', productId: 'prod-plain-mathri', productName: 'Plain Mathri', label: '1kg', weightGrams: 1000, price: 680, mrp: 680, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-achari-mathri-250', productId: 'prod-achari-mathri', productName: 'Achari Mathri', label: '250g', weightGrams: 250, price: 180, mrp: 180, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-achari-mathri-500', productId: 'prod-achari-mathri', productName: 'Achari Mathri', label: '500g', weightGrams: 500, price: 360, mrp: 360, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-achari-mathri-1kg', productId: 'prod-achari-mathri', productName: 'Achari Mathri', label: '1kg', weightGrams: 1000, price: 720, mrp: 720, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-achari-samosa-250', productId: 'prod-achari-samosa', productName: 'Achari Samosa', label: '250g', weightGrams: 250, price: 190, mrp: 190, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-achari-samosa-500', productId: 'prod-achari-samosa', productName: 'Achari Samosa', label: '500g', weightGrams: 500, price: 380, mrp: 380, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-achari-samosa-1kg', productId: 'prod-achari-samosa', productName: 'Achari Samosa', label: '1kg', weightGrams: 1000, price: 760, mrp: 760, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-samosa-250', productId: 'prod-mewa-samosa', productName: 'Mewa Samosa', label: '250g', weightGrams: 250, price: 190, mrp: 190, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-samosa-500', productId: 'prod-mewa-samosa', productName: 'Mewa Samosa', label: '500g', weightGrams: 500, price: 380, mrp: 380, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-samosa-1kg', productId: 'prod-mewa-samosa', productName: 'Mewa Samosa', label: '1kg', weightGrams: 1000, price: 760, mrp: 760, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-masoor-dalmoth-250', productId: 'prod-masoor-dalmoth', productName: 'Masoor Dalmoth', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-masoor-dalmoth-500', productId: 'prod-masoor-dalmoth', productName: 'Masoor Dalmoth', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-masoor-dalmoth-1kg', productId: 'prod-masoor-dalmoth', productName: 'Masoor Dalmoth', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pudina-mixture-250', productId: 'prod-pudina-mixture', productName: 'Pudina Mixture', label: '250g', weightGrams: 250, price: 225, mrp: 225, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pudina-mixture-500', productId: 'prod-pudina-mixture', productName: 'Pudina Mixture', label: '500g', weightGrams: 500, price: 450, mrp: 450, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pudina-mixture-1kg', productId: 'prod-pudina-mixture', productName: 'Pudina Mixture', label: '1kg', weightGrams: 1000, price: 900, mrp: 900, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-dalmoth-250', productId: 'prod-kaju-dalmoth', productName: 'Kaju Dalmoth', label: '250g', weightGrams: 250, price: 300, mrp: 300, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-dalmoth-500', productId: 'prod-kaju-dalmoth', productName: 'Kaju Dalmoth', label: '500g', weightGrams: 500, price: 600, mrp: 600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-dalmoth-1kg', productId: 'prod-kaju-dalmoth', productName: 'Kaju Dalmoth', label: '1kg', weightGrams: 1000, price: 1200, mrp: 1200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-sev-besan-250', productId: 'prod-sev-besan', productName: 'Sev (Besan)', label: '250g', weightGrams: 250, price: 150, mrp: 150, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-sev-besan-500', productId: 'prod-sev-besan', productName: 'Sev (Besan)', label: '500g', weightGrams: 500, price: 300, mrp: 300, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-sev-besan-1kg', productId: 'prod-sev-besan', productName: 'Sev (Besan)', label: '1kg', weightGrams: 1000, price: 600, mrp: 600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-ganthe-250', productId: 'prod-ganthe', productName: 'Ganthe', label: '250g', weightGrams: 250, price: 150, mrp: 150, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-ganthe-500', productId: 'prod-ganthe', productName: 'Ganthe', label: '500g', weightGrams: 500, price: 300, mrp: 300, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-ganthe-1kg', productId: 'prod-ganthe', productName: 'Ganthe', label: '1kg', weightGrams: 1000, price: 600, mrp: 600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
];

export const SERVICEABLE_PINCODES = ['225001', '225002', '225003', '225122'];
export const STORE_SETTINGS = {
  store_name: 'Saraswati Sweets',
  tagline: 'Pure Desi Ghee Mithai & Artisanal Namkeen Since 1978',
  phone: '+91 94500 12345',
  whatsapp: '+91 94500 12345',
  email: 'order@saraswatisweets.in',
  address: 'Main Market Road, Near Ghantaghar, Barabanki, Uttar Pradesh 225001',
  delivery_charge: 40,
  free_delivery_threshold: 499,
  cod_max_limit: 2000,
  tax_percent: 5,
  allowed_pincodes: SERVICEABLE_PINCODES,
};

// In-Memory store for fast fallback & local development sync
export interface ServerProfile {
  id: string;
  phone?: string;
  email?: string;
  full_name?: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  promotional_emails_opt_in?: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServerAddress {
  id: string;
  profile_id: string;
  label: string; // 'Home', 'Office', 'Other'
  recipient_name: string;
  recipient_phone: string;
  street_address: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServerDeliverySlot {
  id: string;
  slot_date: string; // YYYY-MM-DD
  start_time: string; // e.g. "10:00"
  end_time: string; // e.g. "13:00"
  capacity: number;
  booked_count: number;
  cutoff_at: string; // ISO string
  is_active: boolean;
}

export interface ServerCoupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FLAT';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  total_limit?: number; // Total redemptions across store
  per_user_limit?: number; // Redemptions per user/phone
  used_count: number;
}

export interface ServerCouponUsage {
  id: string;
  coupon_id: string;
  coupon_code: string;
  order_id: string;
  profile_id?: string;
  phone?: string;
  discount_amount: number;
  created_at: string;
}

export interface ServerOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_label: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  image_url?: string;
  item_type?: 'PRODUCT' | 'HAMPER';
  hamper_details?: {
    box_type?: string;
    items_included?: Array<{ product_name: string; variant_label: string; quantity: number }>;
  };
}

export interface ServerOffer {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  coupon_code?: string;
  discount_text: string;
  badge?: string;
  bg_color?: string;
  image_url?: string;
  is_active: boolean;
  valid_until?: string;
  display_order: number;
  created_at: string;
}

export interface ServerBanner {
  id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  cta_text: string;
  cta_link: string;
  badge?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ServerReview {
  id: string;
  product_id: string;
  product_name: string;
  order_id: string;
  user_id?: string;
  user_name: string;
  rating: number; // 1 to 5
  comment: string;
  is_approved: boolean; // unpublished until admin approves
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

export interface ServerHamperItem {
  id: string;
  product_id: string;
  product_name: string;
  variant_id?: string;
  variant_label: string;
  quantity: number;
}

export interface ServerGiftHamper {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  box_type: string;
  price: number;
  mrp: number;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  items_included: ServerHamperItem[];
  created_at: string;
  updated_at: string;
}

export type BulkEnquiryStatus = 'NEW' | 'CONTACTED' | 'QUOTED' | 'CONFIRMED' | 'FULFILLED' | 'CANCELLED';

export interface ServerBulkEnquiry {
  id: string;
  enquiry_number: string;
  contact_name: string;
  organization_name?: string;
  phone: string;
  email?: string;
  event_type: 'WEDDING' | 'CORPORATE' | 'FESTIVE_BULK' | 'CUSTOM_EVENT';
  event_date: string;
  estimated_guests?: number;
  estimated_quantity_kg?: number;
  budget_range?: string;
  delivery_address?: string;
  requested_sweets?: string;
  notes?: string;
  admin_notes?: string;
  status: BulkEnquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface ServerNotification {
  id: string;
  user_id: string; // 'ADMIN', 'STORE_OWNER', or profile_id
  title: string;
  message: string;
  type: 'ORDER_PLACED' | 'ORDER_STATUS' | 'PAYMENT_FAILED' | 'ENQUIRY_RECEIVED' | 'PROMOTIONAL';
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ServerPayment {
  id: string;
  order_id: string;
  order_number: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  amount: number; // in paise
  currency: string;
  status: 'CREATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  method?: string;
  error_code?: string;
  error_description?: string;
  refund_id?: string;
  refund_amount?: number;
  created_at: string;
  updated_at: string;
}

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PLACED'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED'
  | 'REFUNDED';

export interface ServerOrder {
  id: string;
  order_number: string;
  profile_id?: string;
  user_id?: string;
  guest_phone?: string;
  guest_email?: string;
  address_snapshot: ServerAddress;
  slot_id: string;
  slot_snapshot: {
    slot_date: string;
    start_time: string;
    end_time: string;
  };
  subtotal: number;
  discount: number;
  coupon_code?: string;
  delivery_charge: number;
  tax: number;
  total: number;
  status: OrderStatus;
  payment_method: 'COD' | 'ONLINE';
  payment_status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_refund_id?: string;
  refund_reason?: string;
  special_instructions?: string;
  packaging_notes?: string;
  idempotency_key: string;
  placed_at: string;
  paid_at?: string;
  expires_at?: string;
  confirmed_at?: string;
  preparing_at?: string;
  ready_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
  items: ServerOrderItem[];
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  assigned_at?: string;
}

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PLACED', 'PAYMENT_FAILED', 'CANCELLED'],
  PLACED: ['CONFIRMED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['PREPARING', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED', 'REFUNDED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED', 'REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  PAYMENT_FAILED: [],
  REFUNDED: [],
};

// Generate initial delivery slots for today and next 7 days
function generateInitialSlots(): Map<string, ServerDeliverySlot> {
  const map = new Map<string, ServerDeliverySlot>();
  const templates = [
    { start: '10:00', end: '13:00', label: 'Morning Slot (10 AM - 1 PM)', cutoffHours: 2 },
    { start: '14:00', end: '17:00', label: 'Afternoon Slot (2 PM - 5 PM)', cutoffHours: 2 },
    { start: '18:00', end: '21:00', label: 'Evening Slot (6 PM - 9 PM)', cutoffHours: 2 },
  ];

  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    templates.forEach((tmpl, idx) => {
      const slotId = `slot-${dateStr}-${tmpl.start.replace(':', '')}`;
      // Cutoff time: slot date at start_time minus cutoffHours
      const cutoffDate = new Date(`${dateStr}T${tmpl.start}:00Z`);
      cutoffDate.setHours(cutoffDate.getHours() - tmpl.cutoffHours);

      map.set(slotId, {
        id: slotId,
        slot_date: dateStr,
        start_time: tmpl.start,
        end_time: tmpl.end,
        capacity: 30,
        booked_count: i === 0 && idx === 0 ? 30 : (i * 3 + idx) % 7, // Demo slot 1 full to test disabled UI
        cutoff_at: cutoffDate.toISOString(),
        is_active: true,
      });
    });
  }
  return map;
}

export interface ServerCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export interface ServerProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  image_url: string;
  pure_ghee: boolean;
  shelf_life_days: number;
  is_active: boolean;
  ingredients: string;
}

export interface ServerDeliveryPartner {
  id: string;
  name: string;
  phone: string;
  vehicle_number: string;
  status: 'AVAILABLE' | 'ON_DELIVERY' | 'OFF_DUTY';
  current_assigned_orders: number;
  created_at: string;
}

export interface ServerAuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
}

export interface ServerStoreSettings {
  store_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  delivery_charge: number;
  free_delivery_threshold: number;
  cod_max_limit: number;
  tax_percent: number;
  opening_time: string;
  closing_time: string;
  is_store_open: boolean;
  allowed_pincodes: string[];
}

export const inMemoryStore = {
  profiles: new Map<string, ServerProfile>(),
  addresses: new Map<string, ServerAddress>(),
  userCarts: new Map<string, Map<string, number>>(), // profileId -> (variantId -> quantity)
  deliverySlots: generateInitialSlots(),
  orders: new Map<string, ServerOrder>(),
  ordersByIdempotency: new Map<string, ServerOrder>(),
  payments: new Map<string, ServerPayment>(), // razorpay_payment_id or razorpay_order_id -> payment
  processedWebhookEvents: new Set<string>(), // event_id -> deduplication
  categories: new Map<string, ServerCategory>([
    [
      'cat-desi-ghee',
      {
        id: 'cat-desi-ghee',
        name: 'Desi Ghee Sweets',
        slug: 'desi-ghee-sweets',
        description: 'Handcrafted in 100% pure cow desi ghee with heritage Awadhi recipes.',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80',
        display_order: 1,
        is_active: true,
      },
    ],
    [
      'cat-kaju-dry-fruits',
      {
        id: 'cat-kaju-dry-fruits',
        name: 'Kaju & Dry Fruit Specials',
        slug: 'kaju-dry-fruits',
        description: 'Finest Mangalore cashews and dry-fruit confections adorned with silver foil.',
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        display_order: 2,
        is_active: true,
      },
    ],
    [
      'cat-chhena-syrupy',
      {
        id: 'cat-chhena-syrupy',
        name: 'Chhena & Syrupy Delights',
        slug: 'chhena-syrupy',
        description: 'Fresh cow milk chhena sweets steeped in fragrant rose and saffron nectars.',
        image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
        display_order: 3,
        is_active: true,
      },
    ],
    [
      'cat-khoya-mawa',
      {
        id: 'cat-khoya-mawa',
        name: 'Khoya & Mawa Specials',
        slug: 'khoya-mawa',
        description: 'Slow-roasted condensed buffalo milk peda and burfis from Barabanki.',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80',
        display_order: 4,
        is_active: true,
      },
    ],
    [
      'cat-namkeen-savories',
      {
        id: 'cat-namkeen-savories',
        name: 'Artisanal Namkeen & Savories',
        slug: 'namkeen-savories',
        description: 'Crispy mathri, spicy dalmoth, and salted treats roasted in pure oils.',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        display_order: 5,
        is_active: true,
      },
    ],
    [
      'cat-gift-boxes',
      {
        id: 'cat-gift-boxes',
        name: 'Festive Hampers & Gift Trunks',
        slug: 'gift-hampers',
        description: 'Royal velvet and gold-embossed gift boxes curated for Diwali, Weddings, and Celebrations.',
        image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
        display_order: 6,
        is_active: true,
      },
    ],
    ['cat-namkeen-snacks', { id: 'cat-namkeen-snacks', name: 'Namkeen & Snacks', slug: 'namkeen-snacks', description: 'A crisp, savory selection of traditional namkeen and snacks.', image_url: '', display_order: 7, is_active: true }],
  ]),
  products: new Map<string, ServerProduct>([
    [
      'prod-kaju-katli',
      {
        id: 'prod-kaju-katli',
        name: 'Signature Silver Leaf Kaju Katli',
        slug: 'signature-kaju-katli',
        description: 'Velvety smooth cashew diamond fudge crafted from first-grade Goan cashews.',
        category_id: 'cat-kaju-dry-fruits',
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 20,
        is_active: true,
        ingredients: 'Cashew nuts, Sugar, Edible Silver Leaf (Vark), Cardamom',
      },
    ],
    [
      'prod-motichoor-ladoo',
      {
        id: 'prod-motichoor-ladoo',
        name: 'Pure Shuddh Ghee Motichoor Ladoo',
        slug: 'shuddh-ghee-motichoor-ladoo',
        description: 'Melt-in-mouth tiny gram flour pearls fried in 100% cow desi ghee.',
        category_id: 'cat-desi-ghee',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 7,
        is_active: true,
        ingredients: 'Besan (Gram Flour), Pure Desi Ghee, Sugar, Saffron, Magaz Seeds',
      },
    ],
    [
      'prod-malai-peda',
      {
        id: 'prod-malai-peda',
        name: 'Kesar Malai Peda',
        slug: 'kesar-malai-peda',
        description: 'Traditional slow-reduced milk khoya infused with Kashmiri saffron and pistachios.',
        category_id: 'cat-khoya-mawa',
        image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 5,
        is_active: true,
        ingredients: 'Pure Khoya, Milk, Sugar, Kashmiri Kesar, Pistachio Slivers',
      },
    ],
    [
      'prod-besan-ladoo',
      {
        id: 'prod-besan-ladoo',
        name: 'Awadhi Desi Ghee Besan Ladoo',
        slug: 'desi-ghee-besan-ladoo',
        description: 'Coarsely milled organic gram flour roasted slowly until golden aromatic perfection.',
        category_id: 'cat-desi-ghee',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 21,
        is_active: true,
        ingredients: 'Chana Besan, Cow Desi Ghee, Bura Sugar, Almonds, Cardamom',
      },
    ],
    [
      'prod-mathura-peda',
      {
        id: 'prod-mathura-peda',
        name: 'Mathura Style Roasted Peda',
        slug: 'mathura-roasted-peda',
        description: 'Deep carmelized roasted mawa pedas coated with fine boora sugar.',
        category_id: 'cat-khoya-mawa',
        image_url: 'https://images.unsplash.com/photo-1601050690113-1ec941ea624b?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 14,
        is_active: true,
        ingredients: 'Roasted Mawa, Desi Ghee, Boora, Jaiphal, Cardamom',
      },
    ],
    [
      'prod-rasgulla',
      {
        id: 'prod-rasgulla',
        name: 'Kolkata Style Spongy Rasgulla',
        slug: 'kolkata-spongy-rasgulla',
        description: 'Feather-soft fresh chhena balls simmered in light fragrant syrup.',
        category_id: 'cat-chhena-syrupy',
        image_url: 'https://images.unsplash.com/photo-1616031037011-087000171abe?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 3,
        is_active: true,
        ingredients: 'Fresh Cow Milk Chhena, Purified Water, Sugar, Rose Water',
      },
    ],
    [
      'prod-dalmoth',
      {
        id: 'prod-dalmoth',
        name: 'Awadhi Shahi Dalmoth Mixture',
        slug: 'awadhi-shahi-dalmoth',
        description: 'Crisp whole masoor lentils blended with sev, cashews, and secret royal spice mix.',
        category_id: 'cat-namkeen-savories',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 60,
        is_active: true,
        ingredients: 'Whole Masoor, Gram Flour Sev, Fried Cashews, Amchoor, Black Salt',
      },
    ],
    [
      'prod-mathri',
      {
        id: 'prod-mathri',
        name: 'Crispy Ajwain Khasta Mathri',
        slug: 'crispy-ajwain-mathri',
        description: 'Flaky layered savory flour crisps seasoned with hand-rubbed carom seeds.',
        category_id: 'cat-namkeen-savories',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 45,
        is_active: true,
        ingredients: 'Wheat Flour, Carom Seeds (Ajwain), Ground Spices, Edible Oil, Sea Salt',
      },
    ],
    ['prod-mini-samosa', { id: 'prod-mini-samosa', name: 'Mini Samosa', slug: 'mini-samosa', description: 'A crispy savory snack – mini samosa.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-mini-khasta', { id: 'prod-mini-khasta', name: 'Mini Khasta', slug: 'mini-khasta', description: 'A crispy savory snack – mini khasta.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-plain-mathri', { id: 'prod-plain-mathri', name: 'Plain Mathri', slug: 'plain-mathri', description: 'A crispy savory snack – plain mathri.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-achari-mathri', { id: 'prod-achari-mathri', name: 'Achari Mathri', slug: 'achari-mathri', description: 'A crispy savory snack – achari mathri.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-achari-samosa', { id: 'prod-achari-samosa', name: 'Achari Samosa', slug: 'achari-samosa', description: 'A crispy savory snack – achari samosa.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-mewa-samosa', { id: 'prod-mewa-samosa', name: 'Mewa Samosa', slug: 'mewa-samosa', description: 'A crispy savory snack – mewa samosa.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-masoor-dalmoth', { id: 'prod-masoor-dalmoth', name: 'Masoor Dalmoth', slug: 'masoor-dalmoth', description: 'A crispy savory snack – masoor dalmoth.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-pudina-mixture', { id: 'prod-pudina-mixture', name: 'Pudina Mixture', slug: 'pudina-mixture', description: 'A crispy savory snack – pudina mixture.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-kaju-dalmoth', { id: 'prod-kaju-dalmoth', name: 'Kaju Dalmoth', slug: 'kaju-dalmoth', description: 'A crispy savory snack – kaju dalmoth.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-sev-besan', { id: 'prod-sev-besan', name: 'Sev (Besan)', slug: 'sev-besan', description: 'A crispy savory snack – sev (besan).', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-ganthe', { id: 'prod-ganthe', name: 'Ganthe', slug: 'ganthe', description: 'A crispy savory snack – ganthe.', category_id: 'cat-namkeen-snacks', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
  ]),
  variants: new Map<string, MasterVariant>(MASTER_VARIANTS.map((v) => [v.id, v])),
  deliveryPartners: new Map<string, ServerDeliveryPartner>([
    [
      'dp-1',
      {
        id: 'dp-1',
        name: 'Mohd. Arif',
        phone: '+91 94500 55101',
        vehicle_number: 'UP-32-AB-4021',
        status: 'AVAILABLE',
        current_assigned_orders: 0,
        created_at: new Date().toISOString(),
      },
    ],
    [
      'dp-2',
      {
        id: 'dp-2',
        name: 'Rakesh Yadav',
        phone: '+91 94500 55102',
        vehicle_number: 'UP-32-CD-8910',
        status: 'AVAILABLE',
        current_assigned_orders: 0,
        created_at: new Date().toISOString(),
      },
    ],
    [
      'dp-3',
      {
        id: 'dp-3',
        name: 'Sanjay Verma',
        phone: '+91 94500 55103',
        vehicle_number: 'UP-32-EF-3342',
        status: 'AVAILABLE',
        current_assigned_orders: 0,
        created_at: new Date().toISOString(),
      },
    ],
  ]),
  auditLogs: [] as ServerAuditLog[],
  storeSettings: {
    store_name: 'Saraswati Sweets',
    tagline: 'Pure Desi Ghee Mithai & Artisanal Namkeen Since 1978',
    phone: '+91 94500 12345',
    whatsapp: '+91 94500 12345',
    email: 'order@saraswatisweets.in',
    address: 'Main Market Road, Near Ghantaghar, Barabanki, Uttar Pradesh 225001',
    allowed_pincodes: ['225001', '225002', '225003', '225122'],
    delivery_charge: 40,
    free_delivery_threshold: 499,
    cod_max_limit: 2000,
    tax_percent: 5,
    opening_time: '08:00',
    closing_time: '22:00',
    is_store_open: true,
  } as ServerStoreSettings,
  coupons: new Map<string, ServerCoupon>([
    [
      'SWAD100',
      {
        id: 'coup-1',
        code: 'SWAD100',
        description: 'Flat ₹100 off on orders over ₹599',
        discount_type: 'FLAT',
        discount_value: 100,
        min_order_amount: 599,
        is_active: true,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 180 * 86400000).toISOString(),
        total_limit: 500,
        per_user_limit: 3,
        used_count: 8,
      },
    ],
    [
      'FESTIVE10',
      {
        id: 'coup-2',
        code: 'FESTIVE10',
        description: '10% off up to ₹150 on orders over ₹799',
        discount_type: 'PERCENTAGE',
        discount_value: 10,
        min_order_amount: 799,
        max_discount_amount: 150,
        is_active: true,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 90 * 86400000).toISOString(),
        total_limit: 1000,
        per_user_limit: 5,
        used_count: 14,
      },
    ],
    [
      'BARABANKI50',
      {
        id: 'coup-3',
        code: 'BARABANKI50',
        description: 'Flat ₹50 off on orders over ₹350 for local delivery',
        discount_type: 'FLAT',
        discount_value: 50,
        min_order_amount: 350,
        is_active: true,
        start_date: new Date(Date.now() - 86400000).toISOString(),
        end_date: new Date(Date.now() + 365 * 86400000).toISOString(),
        total_limit: 2000,
        per_user_limit: 10,
        used_count: 22,
      },
    ],
  ]),
  couponUsage: [] as ServerCouponUsage[],
  offers: new Map<string, ServerOffer>([
    [
      'off-1',
      {
        id: 'off-1',
        title: 'Festival Delight Offer',
        tagline: 'Pure Desi Ghee Celebrations',
        description: 'Enjoy flat ₹100 instant discount on all orders over ₹599 using code SWAD100.',
        coupon_code: 'SWAD100',
        discount_text: 'FLAT ₹100 OFF',
        badge: 'Limited Period',
        bg_color: '#8A1538',
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        is_active: true,
        display_order: 1,
        created_at: new Date().toISOString(),
      },
    ],
    [
      'off-2',
      {
        id: 'off-2',
        title: 'Royal Gifting Special',
        tagline: 'Festive Luxury Hampers',
        description: 'Get 10% off up to ₹150 on grand sweet boxes and festive hampers over ₹799.',
        coupon_code: 'FESTIVE10',
        discount_text: '10% OFF UP TO ₹150',
        badge: 'Festive Favorite',
        bg_color: '#C9A227',
        image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
        is_active: true,
        display_order: 2,
        created_at: new Date().toISOString(),
      },
    ],
    [
      'off-3',
      {
        id: 'off-3',
        title: 'Barabanki Local Privilege',
        tagline: 'Neighborhood Love',
        description: 'Flat ₹50 off on fresh morning and evening sweet deliveries over ₹350.',
        coupon_code: 'BARABANKI50',
        discount_text: 'FLAT ₹50 OFF',
        badge: 'Everyday Saver',
        bg_color: '#2E7D4F',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80',
        is_active: true,
        display_order: 3,
        created_at: new Date().toISOString(),
      },
    ],
  ]),
  banners: new Map<string, ServerBanner>([
    [
      'ban-1',
      {
        id: 'ban-1',
        title: 'Awadhi Shahi Diwali & Wedding Gifting',
        subtitle: 'Handcrafted in 100% pure cow desi ghee. Luxury velvet hampers with royal packaging.',
        image_url: '/images/3.png',
        cta_text: 'Order Royal Hampers',
        cta_link: '/hampers',
        badge: 'Heritage Since 1989',
        display_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
    [
      'ban-2',
      {
        id: 'ban-2',
        title: 'Fresh Morning Motichoor & Besan Ladoo',
        subtitle: 'Hot batches prepared at 6 AM daily in Barabanki. Free express doorstep delivery over ₹499.',
        image_url: '/images/2.png',
        cta_text: 'Explore Fresh Sweets',
        cta_link: '/catalog',
        badge: 'Pure Desi Ghee',
        display_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
      },
    ],
  ]),
  reviews: new Map<string, ServerReview>([
    [
      'rev-1',
      {
        id: 'rev-1',
        product_id: 'prod-kaju-katli',
        product_name: 'Signature Silver Leaf Kaju Katli',
        order_id: 'ord-seed-001',
        user_id: 'cust-demo-1',
        user_name: 'Pooja Srivastava',
        rating: 5,
        comment: 'The kaju katli was extraordinarily smooth and melt-in-mouth! Authentic silver vark and fresh aroma. Ordered for my daughter’s wedding in Barabanki.',
        is_approved: true,
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        approved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        approved_by: 'admin-default',
      },
    ],
    [
      'rev-2',
      {
        id: 'rev-2',
        product_id: 'prod-motichoor-ladoo',
        product_name: 'Pure Shuddh Ghee Motichoor Ladoo',
        order_id: 'ord-seed-002',
        user_id: 'cust-demo-2',
        user_name: 'Amitabh Mishra',
        rating: 5,
        comment: 'Genuine cow desi ghee taste! Just like what my grandfather used to buy from Saraswati Sweets near Ghantaghar 30 years ago.',
        is_approved: true,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        approved_at: new Date(Date.now() - 1 * 86400000).toISOString(),
        approved_by: 'admin-default',
      },
    ],
    [
      'rev-3',
      {
        id: 'rev-3',
        product_id: 'prod-mathura-peda',
        product_name: 'Mathura Style Roasted Peda',
        order_id: 'ord-seed-003',
        user_id: 'cust-demo-3',
        user_name: 'Rajendra Prasad',
        rating: 5,
        comment: 'Rich caramelized khoya flavor, perfect balance of sugar. Outstanding quality.',
        is_approved: false, // Pending admin approval test
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  ]),
  giftHampers: new Map<string, ServerGiftHamper>([
    [
      'hamper-shahi-nawabi',
      {
        id: 'hamper-shahi-nawabi',
        name: 'The Shahi Nawabi Gifting Trunk',
        slug: 'shahi-nawabi-gifting-trunk',
        description: 'Velvet-lined royal gift box with brass clasp. Curated with our premier cashew diamond fudges, saffron pedas, and artisanal Awadhi dalmoth.',
        image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80',
        box_type: 'Royal Velvet Trunk',
        price: 1850,
        mrp: 2100,
        is_featured: true,
        is_active: true,
        display_order: 1,
        items_included: [
          {
            id: 'hi-1',
            product_id: 'prod-kaju-katli',
            product_name: 'Signature Silver Leaf Kaju Katli',
            variant_label: '500g',
            quantity: 1,
          },
          {
            id: 'hi-2',
            product_id: 'prod-malai-peda',
            product_name: 'Kesar Malai Peda',
            variant_label: '250g',
            quantity: 1,
          },
          {
            id: 'hi-3',
            product_id: 'prod-dalmoth',
            product_name: 'Awadhi Shahi Dalmoth Mixture',
            variant_label: '250g',
            quantity: 1,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    [
      'hamper-utsav-celebration',
      {
        id: 'hamper-utsav-celebration',
        name: 'Utsav Celebration Sweet Box',
        slug: 'utsav-celebration-sweet-box',
        description: 'Embossed gold foil celebratory box featuring pure cow desi ghee motichoor ladoo, crispy ajwain mathri, and silver cashew delights.',
        image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
        box_type: 'Gold Embossed Box',
        price: 1250,
        mrp: 1400,
        is_featured: true,
        is_active: true,
        display_order: 2,
        items_included: [
          {
            id: 'hi-4',
            product_id: 'prod-motichoor-ladoo',
            product_name: 'Pure Shuddh Ghee Motichoor Ladoo',
            variant_label: '500g',
            quantity: 1,
          },
          {
            id: 'hi-5',
            product_id: 'prod-kaju-katli',
            product_name: 'Signature Silver Leaf Kaju Katli',
            variant_label: '250g',
            quantity: 1,
          },
          {
            id: 'hi-6',
            product_id: 'prod-mathri',
            product_name: 'Crispy Ajwain Khasta Mathri',
            variant_label: '250g',
            quantity: 1,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    [
      'hamper-anand-potli',
      {
        id: 'hamper-anand-potli',
        name: 'Awadh Anand Raw Silk Potli',
        slug: 'awadh-anand-raw-silk-potli',
        description: 'Traditional Banarasi raw silk potli filled with roasted peda and roasted salted nuts.',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
        box_type: 'Raw Silk Potli',
        price: 850,
        mrp: 950,
        is_featured: false,
        is_active: true,
        display_order: 3,
        items_included: [
          {
            id: 'hi-7',
            product_id: 'prod-mathura-peda',
            product_name: 'Mathura Style Roasted Peda',
            variant_label: '250g',
            quantity: 1,
          },
          {
            id: 'hi-8',
            product_id: 'prod-besan-ladoo',
            product_name: 'Awadhi Desi Ghee Besan Ladoo',
            variant_label: '250g',
            quantity: 1,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  ]),
  bulkEnquiries: new Map<string, ServerBulkEnquiry>([
    [
      'enq-101',
      {
        id: 'enq-101',
        enquiry_number: 'ENQ-8821',
        contact_name: 'Dr. Alok Srivastava',
        organization_name: 'Srivastava Hospital Barabanki',
        phone: '+91 94150 77881',
        email: 'alok@srivastavahospital.in',
        event_type: 'WEDDING',
        event_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
        estimated_guests: 450,
        estimated_quantity_kg: 85,
        budget_range: '₹50,000 - ₹80,000',
        delivery_address: 'Civil Lines, Near DM Residence, Barabanki',
        requested_sweets: 'Kaju Katli (30kg), Motichoor Ladoo (35kg), Shahi Dalmoth (20kg)',
        notes: 'Wedding reception sweet distribution boxes. Need customized printed tags on 300 boxes.',
        admin_notes: 'Spoke on 28th Sep. Sent sample tasting box to residence. Follow-up scheduled.',
        status: 'QUOTED',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    [
      'enq-102',
      {
        id: 'enq-102',
        enquiry_number: 'ENQ-8822',
        contact_name: 'Meera Rastogi',
        organization_name: 'Awadh Agro Traders',
        phone: '+91 94150 99223',
        email: 'meera@awadhagro.com',
        event_type: 'CORPORATE',
        event_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        estimated_guests: 150,
        estimated_quantity_kg: 40,
        budget_range: '₹25,000 - ₹35,000',
        delivery_address: 'Industrial Area Phase 2, Kursi Road, Barabanki',
        requested_sweets: 'Festive Luxury Hampers (75 units)',
        notes: 'Diwali staff gifting hampers.',
        admin_notes: '',
        status: 'NEW',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
  ]),
  notifications: [] as ServerNotification[],
};

/**
 * Validates a coupon server-side against validity dates, min order amount,
 * store-wide total limit, and per-user redemption limits.
 */
export function validateCouponServer(
  couponCode: string,
  subtotal: number,
  userId?: string,
  userPhone?: string
): {
  valid: boolean;
  coupon?: ServerCoupon;
  discount: number;
  error?: string;
  errorCode?: string;
} {
  if (!couponCode) {
    return { valid: false, discount: 0, error: 'Coupon code required', errorCode: 'COUPON_REQUIRED' };
  }

  const cleanCode = couponCode.trim().toUpperCase();
  const coupon = inMemoryStore.coupons.get(cleanCode);

  if (!coupon) {
    return { valid: false, discount: 0, error: `Coupon code '${cleanCode}' is invalid`, errorCode: 'COUPON_NOT_FOUND' };
  }

  if (!coupon.is_active) {
    return { valid: false, discount: 0, error: `Coupon '${cleanCode}' is currently inactive`, errorCode: 'COUPON_INACTIVE' };
  }

  const now = new Date().getTime();
  if (coupon.start_date && now < new Date(coupon.start_date).getTime()) {
    return { valid: false, discount: 0, error: `Coupon '${cleanCode}' has not started yet`, errorCode: 'COUPON_NOT_STARTED' };
  }

  if (coupon.end_date && now > new Date(coupon.end_date).getTime()) {
    return { valid: false, discount: 0, error: `Coupon '${cleanCode}' has expired`, errorCode: 'COUPON_EXPIRED' };
  }

  if (subtotal < coupon.min_order_amount) {
    return {
      valid: false,
      discount: 0,
      error: `Minimum order amount of ₹${coupon.min_order_amount} required to use coupon '${cleanCode}' (current subtotal ₹${subtotal})`,
      errorCode: 'MIN_ORDER_NOT_MET',
    };
  }

  // Check store-wide total usage limit
  if (coupon.total_limit && (coupon.used_count || 0) >= coupon.total_limit) {
    return {
      valid: false,
      discount: 0,
      error: `Coupon '${cleanCode}' has reached maximum total redemptions`,
      errorCode: 'TOTAL_LIMIT_REACHED',
    };
  }

  // Check per-user limit
  if (coupon.per_user_limit) {
    const userUsageCount = inMemoryStore.couponUsage.filter((usage) => {
      if (usage.coupon_code !== cleanCode) return false;
      const matchUser = userId && usage.profile_id === userId;
      const matchPhone = userPhone && usage.phone === userPhone;
      return Boolean(matchUser || matchPhone);
    }).length;

    if (userUsageCount >= coupon.per_user_limit) {
      return {
        valid: false,
        discount: 0,
        error: `You have reached the maximum allowed uses (${coupon.per_user_limit}) for coupon '${cleanCode}'`,
        errorCode: 'PER_USER_LIMIT_REACHED',
      };
    }
  }

  // Calculate discount
  let discount = 0;
  if (coupon.discount_type === 'FLAT') {
    discount = Math.min(coupon.discount_value, subtotal);
  } else if (coupon.discount_type === 'PERCENTAGE') {
    const calculated = (subtotal * coupon.discount_value) / 100;
    discount = coupon.max_discount_amount ? Math.min(coupon.max_discount_amount, calculated) : calculated;
  }

  return {
    valid: true,
    coupon,
    discount: Math.round(discount),
  };
}

// Auto-expire unpaid PENDING_PAYMENT orders after 15 min: releases slot capacity and cancels order
export function expireUnpaidOrders(): number {
  const now = Date.now();
  const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  let expiredCount = 0;

  for (const [id, order] of inMemoryStore.orders.entries()) {
    if (order.status === 'PENDING_PAYMENT') {
      const orderCreatedAt = new Date(order.created_at).getTime();
      const isExpired = now - orderCreatedAt > EXPIRY_MS;

      if (isExpired) {
        order.status = 'CANCELLED';
        order.payment_status = 'FAILED';
        order.cancelled_at = new Date().toISOString();
        order.updated_at = new Date().toISOString();

        // Release slot capacity
        const slot = inMemoryStore.deliverySlots.get(order.slot_id);
        if (slot && slot.booked_count > 0) {
          slot.booked_count -= 1;
          inMemoryStore.deliverySlots.set(slot.id, slot);
        }

        inMemoryStore.orders.set(id, order);
        expiredCount++;
      }
    }
  }

  return expiredCount;
}

// Run periodic cleanup every 30 seconds
setInterval(() => {
  try {
    expireUnpaidOrders();
  } catch (err) {
    console.error('Error during auto-expire cleanup:', err);
  }
}, 30000);

// Seed admin profile
inMemoryStore.profiles.set('admin-default', {
  id: 'admin-default',
  email: 'admin@saraswatisweets.in',
  phone: '+919450012345',
  full_name: 'Shop Owner (Admin)',
  role: 'ADMIN',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

inMemoryStore.profiles.set('staff-default', {
  id: 'staff-default',
  email: 'staff@saraswatisweets.in',
  phone: '+919450012346',
  full_name: 'Store Counter Staff',
  role: 'STAFF',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export function logAuditEvent(
  user: { id?: string; full_name?: string; role?: string } | undefined,
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, any> = {}
): ServerAuditLog {
  const log: ServerAuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: user?.id || 'system',
    user_name: user?.full_name || 'System / Automated',
    user_role: user?.role || 'SYSTEM',
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date().toISOString(),
  };

  inMemoryStore.auditLogs.unshift(log);
  if (inMemoryStore.auditLogs.length > 500) {
    inMemoryStore.auditLogs.length = 500;
  }
  return log;
}

