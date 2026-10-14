import * as crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
import { getAdminRecipientEmail } from './config/emailConfig';
import { BUSINESS_INFO } from './config/businessInfo';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isLiveSupabase = Boolean(
  process.env.UNIT_TEST !== 'true' &&
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
  { id: 'v-kaju-kalash-250', productId: 'prod-kaju-kalash', productName: 'Kaju Kalash', label: '250g', weightGrams: 250, price: 375, mrp: 375, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-kalash-500', productId: 'prod-kaju-kalash', productName: 'Kaju Kalash', label: '500g', weightGrams: 500, price: 750, mrp: 750, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-kalash-1kg', productId: 'prod-kaju-kalash', productName: 'Kaju Kalash', label: '1kg', weightGrams: 1000, price: 1500, mrp: 1500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-kesar-250', productId: 'prod-kaju-kesar', productName: 'Kaju Kesar', label: '250g', weightGrams: 250, price: 375, mrp: 375, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-kesar-500', productId: 'prod-kaju-kesar', productName: 'Kaju Kesar', label: '500g', weightGrams: 500, price: 750, mrp: 750, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-kesar-1kg', productId: 'prod-kaju-kesar', productName: 'Kaju Kesar', label: '1kg', weightGrams: 1000, price: 1500, mrp: 1500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pista-roll-250', productId: 'prod-pista-roll', productName: 'Pista Roll', label: '250g', weightGrams: 250, price: 500, mrp: 500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pista-roll-500', productId: 'prod-pista-roll', productName: 'Pista Roll', label: '500g', weightGrams: 500, price: 1000, mrp: 1000, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pista-roll-1kg', productId: 'prod-pista-roll', productName: 'Pista Roll', label: '1kg', weightGrams: 1000, price: 2000, mrp: 2000, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-dry-fruit-laddoo-250', productId: 'prod-dry-fruit-laddoo', productName: 'Dry Fruit Laddoo', label: '250g', weightGrams: 250, price: 375, mrp: 375, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-dry-fruit-laddoo-500', productId: 'prod-dry-fruit-laddoo', productName: 'Dry Fruit Laddoo', label: '500g', weightGrams: 500, price: 750, mrp: 750, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-dry-fruit-laddoo-1kg', productId: 'prod-dry-fruit-laddoo', productName: 'Dry Fruit Laddoo', label: '1kg', weightGrams: 1000, price: 1500, mrp: 1500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-badam-sugarfree-250', productId: 'prod-badam-sugarfree', productName: 'Badam Sugarfree', label: '250g', weightGrams: 250, price: 375, mrp: 375, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-badam-sugarfree-500', productId: 'prod-badam-sugarfree', productName: 'Badam Sugarfree', label: '500g', weightGrams: 500, price: 750, mrp: 750, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-badam-sugarfree-1kg', productId: 'prod-badam-sugarfree', productName: 'Badam Sugarfree', label: '1kg', weightGrams: 1000, price: 1500, mrp: 1500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-anjeer-sugarfree-250', productId: 'prod-anjeer-sugarfree', productName: 'Anjeer Sugarfree', label: '250g', weightGrams: 250, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-anjeer-sugarfree-500', productId: 'prod-anjeer-sugarfree', productName: 'Anjeer Sugarfree', label: '500g', weightGrams: 500, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-anjeer-sugarfree-1kg', productId: 'prod-anjeer-sugarfree', productName: 'Anjeer Sugarfree', label: '1kg', weightGrams: 1000, price: 1600, mrp: 1600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-anjeer-king-250', productId: 'prod-anjeer-king', productName: 'Anjeer King', label: '250g', weightGrams: 250, price: 450, mrp: 450, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-anjeer-king-500', productId: 'prod-anjeer-king', productName: 'Anjeer King', label: '500g', weightGrams: 500, price: 900, mrp: 900, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-anjeer-king-1kg', productId: 'prod-anjeer-king', productName: 'Anjeer King', label: '1kg', weightGrams: 1000, price: 1800, mrp: 1800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-bite-250', productId: 'prod-mewa-bite', productName: 'Mewa Bite', label: '250g', weightGrams: 250, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-bite-500', productId: 'prod-mewa-bite', productName: 'Mewa Bite', label: '500g', weightGrams: 500, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-bite-1kg', productId: 'prod-mewa-bite', productName: 'Mewa Bite', label: '1kg', weightGrams: 1000, price: 1600, mrp: 1600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-gujiya-250', productId: 'prod-kaju-gujiya', productName: 'Kaju Gujiya', label: '250g', weightGrams: 250, price: 375, mrp: 375, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-gujiya-500', productId: 'prod-kaju-gujiya', productName: 'Kaju Gujiya', label: '500g', weightGrams: 500, price: 750, mrp: 750, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-gujiya-1kg', productId: 'prod-kaju-gujiya', productName: 'Kaju Gujiya', label: '1kg', weightGrams: 1000, price: 1500, mrp: 1500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-peda-250', productId: 'prod-kaju-peda', productName: 'Kaju Peda', label: '250g', weightGrams: 250, price: 350, mrp: 350, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-peda-500', productId: 'prod-kaju-peda', productName: 'Kaju Peda', label: '500g', weightGrams: 500, price: 700, mrp: 700, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-peda-1kg', productId: 'prod-kaju-peda', productName: 'Kaju Peda', label: '1kg', weightGrams: 1000, price: 1400, mrp: 1400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-barfi-without-silver-leaf-250', productId: 'prod-kaju-barfi-without-silver-leaf', productName: 'Kaju Barfi (without Silver Leaf)', label: '250g', weightGrams: 250, price: 350, mrp: 350, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-barfi-without-silver-leaf-500', productId: 'prod-kaju-barfi-without-silver-leaf', productName: 'Kaju Barfi (without Silver Leaf)', label: '500g', weightGrams: 500, price: 700, mrp: 700, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kaju-barfi-without-silver-leaf-1kg', productId: 'prod-kaju-barfi-without-silver-leaf', productName: 'Kaju Barfi (without Silver Leaf)', label: '1kg', weightGrams: 1000, price: 1400, mrp: 1400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-choco-white-250', productId: 'prod-choco-white', productName: 'Choco White', label: '250g', weightGrams: 250, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-choco-white-500', productId: 'prod-choco-white', productName: 'Choco White', label: '500g', weightGrams: 500, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-choco-white-1kg', productId: 'prod-choco-white', productName: 'Choco White', label: '1kg', weightGrams: 1000, price: 1600, mrp: 1600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-orange-white-250', productId: 'prod-orange-white', productName: 'Orange White', label: '250g', weightGrams: 250, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-orange-white-500', productId: 'prod-orange-white', productName: 'Orange White', label: '500g', weightGrams: 500, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-orange-white-1kg', productId: 'prod-orange-white', productName: 'Orange White', label: '1kg', weightGrams: 1000, price: 1600, mrp: 1600, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-baklava-250', productId: 'prod-baklava', productName: 'Baklava', label: '250g', weightGrams: 250, price: 500, mrp: 500, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-baklava-500', productId: 'prod-baklava', productName: 'Baklava', label: '500g', weightGrams: 500, price: 1000, mrp: 1000, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-baklava-1kg', productId: 'prod-baklava', productName: 'Baklava', label: '1kg', weightGrams: 1000, price: 2000, mrp: 2000, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-chandrakala-250', productId: 'prod-chandrakala', productName: 'Chandrakala', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-chandrakala-500', productId: 'prod-chandrakala', productName: 'Chandrakala', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-chandrakala-1kg', productId: 'prod-chandrakala', productName: 'Chandrakala', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-batisa-barfi-250', productId: 'prod-batisa-barfi', productName: 'Batisa Barfi', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-batisa-barfi-500', productId: 'prod-batisa-barfi', productName: 'Batisa Barfi', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-batisa-barfi-1kg', productId: 'prod-batisa-barfi', productName: 'Batisa Barfi', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-gol-batisa-250', productId: 'prod-gol-batisa', productName: 'Gol Batisa', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-gol-batisa-500', productId: 'prod-gol-batisa', productName: 'Gol Batisa', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-gol-batisa-1kg', productId: 'prod-gol-batisa', productName: 'Gol Batisa', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-lal-peda-250', productId: 'prod-lal-peda', productName: 'Lal Peda', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-lal-peda-500', productId: 'prod-lal-peda', productName: 'Lal Peda', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-lal-peda-1kg', productId: 'prod-lal-peda', productName: 'Lal Peda', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kesariya-peda-250', productId: 'prod-kesariya-peda', productName: 'Kesariya Peda', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kesariya-peda-500', productId: 'prod-kesariya-peda', productName: 'Kesariya Peda', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kesariya-peda-1kg', productId: 'prod-kesariya-peda', productName: 'Kesariya Peda', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-katli-250', productId: 'prod-khoya-katli', productName: 'Khoya Katli', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-katli-500', productId: 'prod-khoya-katli', productName: 'Khoya Katli', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-katli-1kg', productId: 'prod-khoya-katli', productName: 'Khoya Katli', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-balushahi-250', productId: 'prod-mini-balushahi', productName: 'Mini Balushahi', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-balushahi-500', productId: 'prod-mini-balushahi', productName: 'Mini Balushahi', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mini-balushahi-1kg', productId: 'prod-mini-balushahi', productName: 'Mini Balushahi', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-laddu-250', productId: 'prod-mewa-laddu', productName: 'Mewa Laddu', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-laddu-500', productId: 'prod-mewa-laddu', productName: 'Mewa Laddu', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-laddu-1kg', productId: 'prod-mewa-laddu', productName: 'Mewa Laddu', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-gilori-250', productId: 'prod-khoya-gilori', productName: 'Khoya Gilori', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-gilori-500', productId: 'prod-khoya-gilori', productName: 'Khoya Gilori', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-gilori-1kg', productId: 'prod-khoya-gilori', productName: 'Khoya Gilori', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-doda-barfi-250', productId: 'prod-doda-barfi', productName: 'Doda Barfi', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-doda-barfi-500', productId: 'prod-doda-barfi', productName: 'Doda Barfi', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-doda-barfi-1kg', productId: 'prod-doda-barfi', productName: 'Doda Barfi', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-magdal-250', productId: 'prod-magdal', productName: 'Magdal', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-magdal-500', productId: 'prod-magdal', productName: 'Magdal', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-magdal-1kg', productId: 'prod-magdal', productName: 'Magdal', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-milk-barfi-250', productId: 'prod-milk-barfi', productName: 'Milk Barfi', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-milk-barfi-500', productId: 'prod-milk-barfi', productName: 'Milk Barfi', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-milk-barfi-1kg', productId: 'prod-milk-barfi', productName: 'Milk Barfi', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-motichur-laddu-250', productId: 'prod-mewa-motichur-laddu', productName: 'Mewa Motichur Laddu', label: '250g', weightGrams: 250, price: 225, mrp: 225, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-motichur-laddu-500', productId: 'prod-mewa-motichur-laddu', productName: 'Mewa Motichur Laddu', label: '500g', weightGrams: 500, price: 450, mrp: 450, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-mewa-motichur-laddu-1kg', productId: 'prod-mewa-motichur-laddu', productName: 'Mewa Motichur Laddu', label: '1kg', weightGrams: 1000, price: 900, mrp: 900, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-soonth-laddu-250', productId: 'prod-soonth-laddu', productName: 'Soonth Laddu', label: '250g', weightGrams: 250, price: 225, mrp: 225, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-soonth-laddu-500', productId: 'prod-soonth-laddu', productName: 'Soonth Laddu', label: '500g', weightGrams: 500, price: 450, mrp: 450, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-soonth-laddu-1kg', productId: 'prod-soonth-laddu', productName: 'Soonth Laddu', label: '1kg', weightGrams: 1000, price: 900, mrp: 900, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-churma-laddu-250', productId: 'prod-churma-laddu', productName: 'Churma Laddu', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-churma-laddu-500', productId: 'prod-churma-laddu', productName: 'Churma Laddu', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-churma-laddu-1kg', productId: 'prod-churma-laddu', productName: 'Churma Laddu', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-chocolate-biscuit-250', productId: 'prod-chocolate-biscuit', productName: 'Chocolate Biscuit', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-chocolate-biscuit-500', productId: 'prod-chocolate-biscuit', productName: 'Chocolate Biscuit', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-chocolate-biscuit-1kg', productId: 'prod-chocolate-biscuit', productName: 'Chocolate Biscuit', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-batisa-laddu-250', productId: 'prod-batisa-laddu', productName: 'Batisa Laddu', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-batisa-laddu-500', productId: 'prod-batisa-laddu', productName: 'Batisa Laddu', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-batisa-laddu-1kg', productId: 'prod-batisa-laddu', productName: 'Batisa Laddu', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-karachi-halwa-250', productId: 'prod-karachi-halwa', productName: 'Karachi Halwa', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-karachi-halwa-500', productId: 'prod-karachi-halwa', productName: 'Karachi Halwa', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-karachi-halwa-1kg', productId: 'prod-karachi-halwa', productName: 'Karachi Halwa', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pinni-250', productId: 'prod-pinni', productName: 'Pinni', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pinni-500', productId: 'prod-pinni', productName: 'Pinni', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-pinni-1kg', productId: 'prod-pinni', productName: 'Pinni', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kala-jam-250', productId: 'prod-kala-jam', productName: 'Kala Jam', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kala-jam-500', productId: 'prod-kala-jam', productName: 'Kala Jam', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-kala-jam-1kg', productId: 'prod-kala-jam', productName: 'Kala Jam', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-milk-cake-250', productId: 'prod-milk-cake', productName: 'Milk Cake', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-milk-cake-500', productId: 'prod-milk-cake', productName: 'Milk Cake', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-milk-cake-1kg', productId: 'prod-milk-cake', productName: 'Milk Cake', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-nariyal-barfi-coconut-barfi-250', productId: 'prod-nariyal-barfi-coconut-barfi', productName: 'Nariyal Barfi (Coconut Barfi)', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-nariyal-barfi-coconut-barfi-500', productId: 'prod-nariyal-barfi-coconut-barfi', productName: 'Nariyal Barfi (Coconut Barfi)', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-nariyal-barfi-coconut-barfi-1kg', productId: 'prod-nariyal-barfi-coconut-barfi', productName: 'Nariyal Barfi (Coconut Barfi)', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-kalakand-250', productId: 'prod-khoya-kalakand', productName: 'Khoya Kalakand', label: '250g', weightGrams: 250, price: 200, mrp: 200, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-kalakand-500', productId: 'prod-khoya-kalakand', productName: 'Khoya Kalakand', label: '500g', weightGrams: 500, price: 400, mrp: 400, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-khoya-kalakand-1kg', productId: 'prod-khoya-kalakand', productName: 'Khoya Kalakand', label: '1kg', weightGrams: 1000, price: 800, mrp: 800, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
];

export const SERVICEABLE_PINCODES = ['225001', '225002', '225003', '225122'];
export const STORE_SETTINGS = {
  store_name: BUSINESS_INFO.name,
  tagline: BUSINESS_INFO.tagline,
  store_phone: BUSINESS_INFO.phone,
  whatsapp: BUSINESS_INFO.phone,
  store_email: getAdminRecipientEmail(),
  address_text: BUSINESS_INFO.address,
  delivery_charge: 50,
  free_delivery_above: 0, // Flat ₹50 fee across all orders; free delivery tier disabled
  cod_limit_amount: 2000,
  tax_rate_percent: 5,
  serviceable_pincodes: SERVICEABLE_PINCODES,
  delivery_enabled: true,
  takeaway_enabled: true,
  closure_message: null,
  pickup_opening_time: '08:00',
  pickup_closing_time: '21:30',
  pickup_slot_duration_minutes: 30,
  pickup_max_orders_per_slot: 10,
  pickup_advance_days: 2,
  auto_reopen_at: null,
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
  usage_limit?: number; // Total redemptions across store
  per_user_limit?: number; // Redemptions per user/phone
  usage_count: number;
  // Database schema column aliases for compatibility
  type?: 'PERCENTAGE' | 'FLAT';
  value?: number;
  min_order_value?: number;
  usage_limit_total?: number | null;
  usage_limit_per_user?: number | null;
  valid_from?: string;
  valid_until?: string;
}

/**
 * Maps a raw database row or coupon payload to ServerCoupon.
 * Ensures bidirectional compatibility between Supabase physical column names (type, value, min_order_value, etc.)
 * and in-memory application properties (discount_type, discount_value, min_order_amount, etc.).
 */
export function mapDbCouponToStore(row: any): ServerCoupon {
  const code = String(row.code || '').toUpperCase().trim();
  const rawType = (row.discount_type || row.type || 'FLAT').toUpperCase();
  const type: 'PERCENTAGE' | 'FLAT' = rawType === 'PERCENTAGE' ? 'PERCENTAGE' : 'FLAT';
  const value = Number(row.discount_value ?? row.value ?? 0);
  const minOrder = Number(row.min_order_amount ?? row.min_order_value ?? 0);
  const maxDiscount = (row.max_discount_amount !== undefined && row.max_discount_amount !== null && row.max_discount_amount !== '')
    ? Number(row.max_discount_amount)
    : undefined;
  const usageLimit = (row.usage_limit ?? row.usage_limit_total) != null && (row.usage_limit ?? row.usage_limit_total) !== ''
    ? Number(row.usage_limit ?? row.usage_limit_total)
    : undefined;
  const perUserLimit = (row.per_user_limit ?? row.usage_limit_per_user) != null && (row.per_user_limit ?? row.usage_limit_per_user) !== ''
    ? Number(row.per_user_limit ?? row.usage_limit_per_user)
    : 1;
  const startDate = row.start_date || row.valid_from || new Date().toISOString();
  const endDate = row.end_date || row.valid_until || new Date(Date.now() + 180 * 86400000).toISOString();

  const autoDesc = type === 'PERCENTAGE'
    ? `${value}% off on orders over ₹${minOrder}${maxDiscount ? ` (max ₹${maxDiscount})` : ''}`
    : `Flat ₹${value} off on orders over ₹${minOrder}`;
  const description = row.description ? String(row.description).trim() : autoDesc;

  return {
    id: row.id,
    code,
    description,
    discount_type: type,
    discount_value: value,
    min_order_amount: minOrder,
    max_discount_amount: maxDiscount,
    usage_limit: usageLimit,
    per_user_limit: perUserLimit,
    usage_count: Number(row.usage_count || 0),
    is_active: typeof row.is_active === 'boolean' ? row.is_active : true,
    start_date: startDate,
    end_date: endDate,
    type,
    value,
    min_order_value: minOrder,
    usage_limit_total: usageLimit ?? null,
    usage_limit_per_user: perUserLimit,
    valid_from: startDate,
    valid_until: endDate,
  };
}

export interface ServerCouponUsage {
  id: string;
  coupon_id: string;
  coupon_code: string;
  order_id: string;
  user_id?: string;
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
  provider_order_id: string;
  provider_payment_id?: string;
  amount: number; // in rupees (consistent with database payments.amount NUMERIC(10, 2))
  currency: string;
  status: 'CREATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  method?: string;
  error_code?: string;
  error_description?: string;
  refund_id?: string;
  refund_amount?: number; // in rupees
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
  user_id?: string;
  guest_phone?: string;
  guest_email?: string;
  address_snapshot: ServerAddress;
  delivery_slot_id?: string | null;
  slot_snapshot?: any;
  fulfilment_type?: 'DELIVERY' | 'TAKEAWAY';
  subtotal: number;
  discount_amount: number;
  coupon_code?: string;
  delivery_charge: number;
  tax_amount: number;
  total_amount: number;
  status: OrderStatus;
  payment_method: 'COD' | 'ONLINE';
  payment_status: 'PENDING' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'REFUND_PENDING' | 'REFUND_FAILED';
  provider_order_id?: string;
  provider_payment_id?: string;
  provider_refund_id?: string;
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
  cancel_reason?: string;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
  items: ServerOrderItem[];
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  delivery_partner_phone?: string;
  assigned_at?: string;
  needs_review?: boolean;
  review_reason?: string;
}

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PLACED', 'PAYMENT_FAILED', 'CANCELLED'],
  PLACED: ['CONFIRMED', 'CANCELLED', 'REFUNDED'],
  CONFIRMED: ['OUT_FOR_DELIVERY', 'PREPARING', 'CANCELLED', 'REFUNDED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'CANCELLED', 'REFUNDED'],
  READY_FOR_PICKUP: ['OUT_FOR_DELIVERY', 'CANCELLED', 'REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED', 'REFUNDED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  PAYMENT_FAILED: [],
  REFUNDED: [],
};

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
  is_bestseller?: boolean;
  is_featured?: boolean;
  badge_label?: string;
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

export interface ServerRefund {
  id: string;
  order_id: string;
  payment_id?: string;
  refund_id: string;
  cf_refund_id?: string;
  refund_amount: number;
  refund_status: 'PENDING' | 'SUCCESS' | 'FAILED';
  refund_note?: string;
  refund_arn?: string;
  raw_response?: any;
  processed_at?: string;
  created_at: string;
  updated_at: string;
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
  store_phone: string;
  whatsapp: string;
  store_email: string;
  address_text: string;
  delivery_charge_flat: number;
  free_delivery_above: number;
  cod_limit_amount: number;
  tax_rate_percent: number;
  opening_time: string;
  closing_time: string;
  is_store_open: boolean;
  serviceable_pincodes: string[];
  delivery_enabled: boolean;
  takeaway_enabled: boolean;
  closure_message?: string | null;
  pickup_opening_time: string;
  pickup_closing_time: string;
  pickup_slot_duration_minutes: number;
  pickup_max_orders_per_slot: number;
  pickup_advance_days: number;
  auto_reopen_at?: string | null;
}


// ==========================================================
// SUPABASE SYNC MAP (Write-Through Cache)
// ==========================================================
export function toUUID(str: string): string {
  if (!str || typeof str !== 'string') return str;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str; 
  }
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(12, 15)}-a${hash.slice(15, 18)}-${hash.slice(18, 30)}`;
}

export const inMemoryStore = {
  profiles: new Map<string, ServerProfile>(),
  addresses: new Map<string, ServerAddress>(),
  userCarts: new Map<string, Map<string, number>>(), // profileId -> (variantId -> quantity)
  orders: new Map<string, ServerOrder>(),
  ordersByIdempotency: new Map<string, ServerOrder>(),
  payments: new Map<string, ServerPayment>(), // provider_payment_id or provider_order_id -> payment
  refunds: new Map<string, ServerRefund>(),
  processedWebhookEvents: new Set<string>(), // event_id -> deduplication
  categories: new Map<string, ServerCategory>([
    [
      '687913b9-108c-49e3-94e1-c255718415a5',
      {
        id: '687913b9-108c-49e3-94e1-c255718415a5',
        name: 'Desi Ghee Sweets',
        slug: 'desi-ghee-sweets',
        description: 'Handcrafted in 100% pure cow desi ghee with heritage Awadhi recipes.',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80',
        display_order: 1,
        is_active: true,
      },
    ],
    [
      'c1000000-0000-0000-0000-000000000002',
      {
        id: 'c1000000-0000-0000-0000-000000000002',
        name: 'Kaju & Dry Fruit Specials',
        slug: 'kaju-dry-fruits',
        description: 'Finest Mangalore cashews and dry-fruit confections adorned with silver foil.',
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
        display_order: 2,
        is_active: true,
      },
    ],
    [
      'c1000000-0000-0000-0000-000000000003',
      {
        id: 'c1000000-0000-0000-0000-000000000003',
        name: 'Chhena & Syrupy Delights',
        slug: 'chhena-syrupy',
        description: 'Fresh cow milk chhena sweets steeped in fragrant rose and saffron nectars.',
        image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=600&q=80',
        display_order: 3,
        is_active: true,
      },
    ],
    [
      '284272ed-691e-4720-ba2b-11a711478638',
      {
        id: '284272ed-691e-4720-ba2b-11a711478638',
        name: 'Khoya & Mawa Specials',
        slug: 'khoya-mawa',
        description: 'Slow-roasted condensed buffalo milk peda and burfis from Barabanki.',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=600&q=80',
        display_order: 4,
        is_active: true,
      },
    ],
    [
      'c1000000-0000-0000-0000-000000000005',
      {
        id: 'c1000000-0000-0000-0000-000000000005',
        name: 'Artisanal Namkeen & Savories',
        slug: 'namkeen-savories',
        description: 'Crispy mathri, spicy dalmoth, and salted treats roasted in pure oils.',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
        display_order: 5,
        is_active: true,
      },
    ],
    [
      'c1000000-0000-0000-0000-000000000004',
      {
        id: 'c1000000-0000-0000-0000-000000000004',
        name: 'Festive Hampers & Gift Trunks',
        slug: 'gift-hampers',
        description: 'Royal velvet and gold-embossed gift boxes curated for Diwali, Weddings, and Celebrations.',
        image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
        display_order: 6,
        is_active: true,
      },
    ],
    ['c1000000-0000-0000-0000-000000000005', { id: 'c1000000-0000-0000-0000-000000000005', name: 'Namkeen & Snacks', slug: 'namkeen-snacks', description: 'A crisp, savory selection of traditional namkeen and snacks.', image_url: '', display_order: 7, is_active: true }],
    ['c1000000-0000-0000-0000-000000000002', { id: 'c1000000-0000-0000-0000-000000000002', name: 'Dry Fruit Sweets', slug: 'dry-fruit-sweets', description: 'Premium dry fruit sweets.', image_url: '', display_order: 4, is_active: true }],
    ['883ae551-dee9-47e0-84e3-651883073ccb', { id: '883ae551-dee9-47e0-84e3-651883073ccb', name: 'Specialty Sweets', slug: 'specialty-sweets', description: 'Specialty sweets.', image_url: '', display_order: 5, is_active: true }],
    ['c1000000-0000-0000-0000-000000000001', { id: 'c1000000-0000-0000-0000-000000000001', name: 'Traditional Mithai', slug: 'traditional-mithai', description: 'Traditional mithai.', image_url: '', display_order: 6, is_active: true }],
  ]),
  products: new Map<string, ServerProduct>([
    [
      'prod-kaju-katli',
      {
        id: 'prod-kaju-katli',
        name: 'Signature Silver Leaf Kaju Katli',
        slug: 'signature-kaju-katli',
        description: 'Velvety smooth cashew diamond fudge crafted from first-grade Goan cashews.',
        category_id: 'c1000000-0000-0000-0000-000000000002',
        image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 20,
        is_active: true,
        ingredients: 'Cashew nuts, Sugar, Edible Silver Leaf (Vark), Cardamom',
        is_bestseller: true,
        is_featured: true,
        badge_label: 'Shop Pride',
      },
    ],
    [
      'prod-motichoor-ladoo',
      {
        id: 'prod-motichoor-ladoo',
        name: 'Pure Shuddh Ghee Motichoor Ladoo',
        slug: 'shuddh-ghee-motichoor-ladoo',
        description: 'Melt-in-mouth tiny gram flour pearls fried in 100% cow desi ghee.',
        category_id: '687913b9-108c-49e3-94e1-c255718415a5',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 7,
        is_active: true,
        ingredients: 'Besan (Gram Flour), Pure Desi Ghee, Sugar, Saffron, Magaz Seeds',
        is_bestseller: true,
        is_featured: true,
        badge_label: 'Bestseller',
      },
    ],
    [
      'prod-malai-peda',
      {
        id: 'prod-malai-peda',
        name: 'Kesar Malai Peda',
        slug: 'kesar-malai-peda',
        description: 'Traditional slow-reduced milk khoya infused with Kashmiri saffron and pistachios.',
        category_id: '284272ed-691e-4720-ba2b-11a711478638',
        image_url: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 5,
        is_active: true,
        ingredients: 'Pure Khoya, Milk, Sugar, Kashmiri Kesar, Pistachio Slivers',
        is_bestseller: false,
        is_featured: true,
        badge_label: 'Royal Treat',
      },
    ],
    [
      'prod-besan-ladoo',
      {
        id: 'prod-besan-ladoo',
        name: 'Awadhi Desi Ghee Besan Ladoo',
        slug: 'desi-ghee-besan-ladoo',
        description: 'Coarsely milled organic gram flour roasted slowly until golden aromatic perfection.',
        category_id: '687913b9-108c-49e3-94e1-c255718415a5',
        image_url: 'https://images.unsplash.com/photo-1505253758473-96b7015fcd40?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 21,
        is_active: true,
        ingredients: 'Chana Besan, Cow Desi Ghee, Bura Sugar, Almonds, Cardamom',
        is_bestseller: true,
        is_featured: false,
        badge_label: 'Heritage Recipe',
      },
    ],
    [
      'prod-mathura-peda',
      {
        id: 'prod-mathura-peda',
        name: 'Mathura Style Roasted Peda',
        slug: 'mathura-roasted-peda',
        description: 'Deep carmelized roasted mawa pedas coated with fine boora sugar.',
        category_id: '284272ed-691e-4720-ba2b-11a711478638',
        image_url: 'https://images.unsplash.com/photo-1601050690113-1ec941ea624b?auto=format&fit=crop&w=800&q=80',
        pure_ghee: true,
        shelf_life_days: 14,
        is_active: true,
        ingredients: 'Roasted Mawa, Desi Ghee, Boora, Jaiphal, Cardamom',
        is_bestseller: false,
        is_featured: true,
        badge_label: 'Vintage Awadh',
      },
    ],
    [
      'prod-rasgulla',
      {
        id: 'prod-rasgulla',
        name: 'Kolkata Style Spongy Rasgulla',
        slug: 'kolkata-spongy-rasgulla',
        description: 'Feather-soft fresh chhena balls simmered in light fragrant syrup.',
        category_id: 'c1000000-0000-0000-0000-000000000003',
        image_url: 'https://images.unsplash.com/photo-1616031037011-087000171abe?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 3,
        is_active: true,
        ingredients: 'Fresh Cow Milk Chhena, Purified Water, Sugar, Rose Water',
        is_bestseller: true,
        is_featured: false,
        badge_label: 'Chhena Special',
      },
    ],
    [
      'prod-dalmoth',
      {
        id: 'prod-dalmoth',
        name: 'Awadhi Shahi Dalmoth Mixture',
        slug: 'awadhi-shahi-dalmoth',
        description: 'Crisp whole masoor lentils blended with sev, cashews, and secret royal spice mix.',
        category_id: 'c1000000-0000-0000-0000-000000000005',
        image_url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 60,
        is_active: true,
        ingredients: 'Whole Masoor, Gram Flour Sev, Fried Cashews, Amchoor, Black Salt',
        is_bestseller: true,
        is_featured: true,
        badge_label: 'Savory Hit',
      },
    ],
    [
      'prod-mathri',
      {
        id: 'prod-mathri',
        name: 'Crispy Ajwain Khasta Mathri',
        slug: 'crispy-ajwain-mathri',
        description: 'Flaky layered savory flour crisps seasoned with hand-rubbed carom seeds.',
        category_id: 'c1000000-0000-0000-0000-000000000005',
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        pure_ghee: false,
        shelf_life_days: 45,
        is_active: true,
        ingredients: 'Wheat Flour, Carom Seeds (Ajwain), Ground Spices, Edible Oil, Sea Salt',
        is_bestseller: false,
        is_featured: false,
        badge_label: 'Tea Time Classic',
      },
    ],
    ['prod-mini-samosa', { id: 'prod-mini-samosa', name: 'Mini Samosa', slug: 'mini-samosa', description: 'A crispy savory snack – mini samosa.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-mini-khasta', { id: 'prod-mini-khasta', name: 'Mini Khasta', slug: 'mini-khasta', description: 'A crispy savory snack – mini khasta.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-plain-mathri', { id: 'prod-plain-mathri', name: 'Plain Mathri', slug: 'plain-mathri', description: 'A crispy savory snack – plain mathri.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-achari-mathri', { id: 'prod-achari-mathri', name: 'Achari Mathri', slug: 'achari-mathri', description: 'A crispy savory snack – achari mathri.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-achari-samosa', { id: 'prod-achari-samosa', name: 'Achari Samosa', slug: 'achari-samosa', description: 'A crispy savory snack – achari samosa.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-mewa-samosa', { id: 'prod-mewa-samosa', name: 'Mewa Samosa', slug: 'mewa-samosa', description: 'A crispy savory snack – mewa samosa.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-masoor-dalmoth', { id: 'prod-masoor-dalmoth', name: 'Masoor Dalmoth', slug: 'masoor-dalmoth', description: 'A crispy savory snack – masoor dalmoth.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-pudina-mixture', { id: 'prod-pudina-mixture', name: 'Pudina Mixture', slug: 'pudina-mixture', description: 'A crispy savory snack – pudina mixture.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-kaju-dalmoth', { id: 'prod-kaju-dalmoth', name: 'Kaju Dalmoth', slug: 'kaju-dalmoth', description: 'A crispy savory snack – kaju dalmoth.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-sev-besan', { id: 'prod-sev-besan', name: 'Sev (Besan)', slug: 'sev-besan', description: 'A crispy savory snack – sev (besan).', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-ganthe', { id: 'prod-ganthe', name: 'Ganthe', slug: 'ganthe', description: 'A crispy savory snack – ganthe.', category_id: 'c1000000-0000-0000-0000-000000000005', image_url: '', pure_ghee: false, shelf_life_days: 30, is_active: true, ingredients: '' }],
    ['prod-kaju-kalash', { id: 'prod-kaju-kalash', name: 'Kaju Kalash', slug: 'kaju-kalash', description: 'A delicious traditional sweet – kaju kalash.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-kaju-kesar', { id: 'prod-kaju-kesar', name: 'Kaju Kesar', slug: 'kaju-kesar', description: 'A delicious traditional sweet – kaju kesar.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-pista-roll', { id: 'prod-pista-roll', name: 'Pista Roll', slug: 'pista-roll', description: 'A delicious traditional sweet – pista roll.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-dry-fruit-laddoo', { id: 'prod-dry-fruit-laddoo', name: 'Dry Fruit Laddoo', slug: 'dry-fruit-laddoo', description: 'A delicious traditional sweet – dry fruit laddoo.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-badam-sugarfree', { id: 'prod-badam-sugarfree', name: 'Badam Sugarfree', slug: 'badam-sugarfree', description: 'A delicious traditional sweet – badam sugarfree.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-anjeer-sugarfree', { id: 'prod-anjeer-sugarfree', name: 'Anjeer Sugarfree', slug: 'anjeer-sugarfree', description: 'A delicious traditional sweet – anjeer sugarfree.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-anjeer-king', { id: 'prod-anjeer-king', name: 'Anjeer King', slug: 'anjeer-king', description: 'A delicious traditional sweet – anjeer king.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-mewa-bite', { id: 'prod-mewa-bite', name: 'Mewa Bite', slug: 'mewa-bite', description: 'A delicious traditional sweet – mewa bite.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-kaju-gujiya', { id: 'prod-kaju-gujiya', name: 'Kaju Gujiya', slug: 'kaju-gujiya', description: 'A delicious traditional sweet – kaju gujiya.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-kaju-peda', { id: 'prod-kaju-peda', name: 'Kaju Peda', slug: 'kaju-peda', description: 'A delicious traditional sweet – kaju peda.', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-kaju-barfi-without-silver-leaf', { id: 'prod-kaju-barfi-without-silver-leaf', name: 'Kaju Barfi (without Silver Leaf)', slug: 'kaju-barfi-without-silver-leaf', description: 'A delicious traditional sweet – kaju barfi (without silver leaf).', category_id: 'c1000000-0000-0000-0000-000000000002', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-choco-white', { id: 'prod-choco-white', name: 'Choco White', slug: 'choco-white', description: 'A delicious traditional sweet – choco white.', category_id: '883ae551-dee9-47e0-84e3-651883073ccb', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-orange-white', { id: 'prod-orange-white', name: 'Orange White', slug: 'orange-white', description: 'A delicious traditional sweet – orange white.', category_id: '883ae551-dee9-47e0-84e3-651883073ccb', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-baklava', { id: 'prod-baklava', name: 'Baklava', slug: 'baklava', description: 'A delicious traditional sweet – baklava.', category_id: '883ae551-dee9-47e0-84e3-651883073ccb', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-chandrakala', { id: 'prod-chandrakala', name: 'Chandrakala', slug: 'chandrakala', description: 'A delicious traditional sweet – chandrakala.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-batisa-barfi', { id: 'prod-batisa-barfi', name: 'Batisa Barfi', slug: 'batisa-barfi', description: 'A delicious traditional sweet – batisa barfi.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-gol-batisa', { id: 'prod-gol-batisa', name: 'Gol Batisa', slug: 'gol-batisa', description: 'A delicious traditional sweet – gol batisa.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-lal-peda', { id: 'prod-lal-peda', name: 'Lal Peda', slug: 'lal-peda', description: 'A delicious traditional sweet – lal peda.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-kesariya-peda', { id: 'prod-kesariya-peda', name: 'Kesariya Peda', slug: 'kesariya-peda', description: 'A delicious traditional sweet – kesariya peda.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-khoya-katli', { id: 'prod-khoya-katli', name: 'Khoya Katli', slug: 'khoya-katli', description: 'A delicious traditional sweet – khoya katli.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-mini-balushahi', { id: 'prod-mini-balushahi', name: 'Mini Balushahi', slug: 'mini-balushahi', description: 'A delicious traditional sweet – mini balushahi.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-mewa-laddu', { id: 'prod-mewa-laddu', name: 'Mewa Laddu', slug: 'mewa-laddu', description: 'A delicious traditional sweet – mewa laddu.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-khoya-gilori', { id: 'prod-khoya-gilori', name: 'Khoya Gilori', slug: 'khoya-gilori', description: 'A delicious traditional sweet – khoya gilori.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-doda-barfi', { id: 'prod-doda-barfi', name: 'Doda Barfi', slug: 'doda-barfi', description: 'A delicious traditional sweet – doda barfi.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-magdal', { id: 'prod-magdal', name: 'Magdal', slug: 'magdal', description: 'A delicious traditional sweet – magdal.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-milk-barfi', { id: 'prod-milk-barfi', name: 'Milk Barfi', slug: 'milk-barfi', description: 'A delicious traditional sweet – milk barfi.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-mewa-motichur-laddu', { id: 'prod-mewa-motichur-laddu', name: 'Mewa Motichur Laddu', slug: 'mewa-motichur-laddu', description: 'A delicious traditional sweet – mewa motichur laddu.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-soonth-laddu', { id: 'prod-soonth-laddu', name: 'Soonth Laddu', slug: 'soonth-laddu', description: 'A delicious traditional sweet – soonth laddu.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-churma-laddu', { id: 'prod-churma-laddu', name: 'Churma Laddu', slug: 'churma-laddu', description: 'A delicious traditional sweet – churma laddu.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-chocolate-biscuit', { id: 'prod-chocolate-biscuit', name: 'Chocolate Biscuit', slug: 'chocolate-biscuit', description: 'A delicious traditional sweet – chocolate biscuit.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-batisa-laddu', { id: 'prod-batisa-laddu', name: 'Batisa Laddu', slug: 'batisa-laddu', description: 'A delicious traditional sweet – batisa laddu.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-karachi-halwa', { id: 'prod-karachi-halwa', name: 'Karachi Halwa', slug: 'karachi-halwa', description: 'A delicious traditional sweet – karachi halwa.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-pinni', { id: 'prod-pinni', name: 'Pinni', slug: 'pinni', description: 'A delicious traditional sweet – pinni.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-kala-jam', { id: 'prod-kala-jam', name: 'Kala Jam', slug: 'kala-jam', description: 'A delicious traditional sweet – kala jam.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-milk-cake', { id: 'prod-milk-cake', name: 'Milk Cake', slug: 'milk-cake', description: 'A delicious traditional sweet – milk cake.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-nariyal-barfi-coconut-barfi', { id: 'prod-nariyal-barfi-coconut-barfi', name: 'Nariyal Barfi (Coconut Barfi)', slug: 'nariyal-barfi-coconut-barfi', description: 'A delicious traditional sweet – nariyal barfi (coconut barfi).', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
    ['prod-khoya-kalakand', { id: 'prod-khoya-kalakand', name: 'Khoya Kalakand', slug: 'khoya-kalakand', description: 'A delicious traditional sweet – khoya kalakand.', category_id: 'c1000000-0000-0000-0000-000000000001', image_url: '', pure_ghee: true, shelf_life_days: 15, is_active: true, ingredients: '' }],
  ]),
  variants: new Map<string, MasterVariant>(MASTER_VARIANTS.map((v) => [v.id, v])),
  deliveryPartners: new Map<any, any>(),
  auditLogs: [] as ServerAuditLog[],
  storeSettings: {
    store_name: BUSINESS_INFO.name,
    tagline: BUSINESS_INFO.tagline,
    store_phone: BUSINESS_INFO.phone,
    whatsapp: BUSINESS_INFO.phone,
    store_email: getAdminRecipientEmail(),
    address_text: BUSINESS_INFO.address,
    serviceable_pincodes: ['225001', '225002', '225003', '225122'],
    delivery_charge_flat: 50,
    free_delivery_above: 0,
    cod_limit_amount: 2000,
    tax_rate_percent: 5,
    opening_time: '06:30',
    closing_time: '22:00',
    is_store_open: true,
    delivery_enabled: true,
    takeaway_enabled: true,
    closure_message: null,
    pickup_opening_time: '08:00',
    pickup_closing_time: '21:30',
    pickup_slot_duration_minutes: 30,
    pickup_max_orders_per_slot: 10,
    pickup_advance_days: 2,
    auto_reopen_at: null,
  } as ServerStoreSettings,
  coupons: new Map<any, any>(),
  couponUsage: [] as ServerCouponUsage[],
  offers: new Map<any, any>(),
  banners: new Map<any, any>(),
  reviews: new Map<any, any>(),
  giftHampers: new Map<any, any>(),
  bulkEnquiries: new Map<any, any>(),
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
  discount_amount: number;
  error?: string;
  errorCode?: string;
} {
  if (!couponCode) {
    return { valid: false, discount_amount: 0, error: 'Coupon code required', errorCode: 'COUPON_REQUIRED' };
  }

  const cleanCode = couponCode.trim().toUpperCase();
  const coupon = inMemoryStore.coupons.get(cleanCode);

  if (!coupon) {
    return { valid: false, discount_amount: 0, error: `Coupon code '${cleanCode}' is invalid`, errorCode: 'COUPON_NOT_FOUND' };
  }

  if (!coupon.is_active) {
    return { valid: false, discount_amount: 0, error: `Coupon '${cleanCode}' is currently inactive`, errorCode: 'COUPON_INACTIVE' };
  }

  const now = new Date().getTime();
  const startDate = coupon.start_date || coupon.valid_from;
  if (startDate && now < new Date(startDate).getTime()) {
    return { valid: false, discount_amount: 0, error: `Coupon '${cleanCode}' has not started yet`, errorCode: 'COUPON_NOT_STARTED' };
  }

  const endDate = coupon.end_date || coupon.valid_until;
  if (endDate && now > new Date(endDate).getTime()) {
    return { valid: false, discount_amount: 0, error: `Coupon '${cleanCode}' has expired`, errorCode: 'COUPON_EXPIRED' };
  }

  const minOrder = Number(coupon.min_order_amount ?? coupon.min_order_value ?? 0);
  if (subtotal < minOrder) {
    return {
      valid: false,
      discount_amount: 0,
      error: `Minimum order amount of ₹${minOrder} required to use coupon '${cleanCode}' (current subtotal ₹${subtotal})`,
      errorCode: 'MIN_ORDER_NOT_MET',
    };
  }

  // Check store-wide total usage limit
  const totalLimit = coupon.usage_limit ?? coupon.usage_limit_total;
  if (totalLimit && (coupon.usage_count || 0) >= totalLimit) {
    return {
      valid: false,
      discount_amount: 0,
      error: `Coupon '${cleanCode}' has reached maximum total redemptions`,
      errorCode: 'TOTAL_LIMIT_REACHED',
    };
  }

  // Check per-user limit
  const perUserLimit = coupon.per_user_limit ?? coupon.usage_limit_per_user;
  if (perUserLimit) {
    const userUsageCount = inMemoryStore.couponUsage.filter((usage) => {
      if (usage.coupon_code !== cleanCode) return false;
      const matchUser = userId && usage.user_id === userId;
      const matchPhone = userPhone && usage.phone === userPhone;
      return Boolean(matchUser || matchPhone);
    }).length;

    if (userUsageCount >= perUserLimit) {
      return {
        valid: false,
        discount_amount: 0,
        error: `You have reached the maximum allowed uses (${perUserLimit}) for coupon '${cleanCode}'`,
        errorCode: 'PER_USER_LIMIT_REACHED',
      };
    }
  }

  // Calculate discount
  let discount = 0;
  const discountType = (coupon.discount_type || coupon.type || 'FLAT').toUpperCase();
  const discountVal = Number(coupon.discount_value ?? coupon.value ?? 0);
  const maxDiscount = (coupon.max_discount_amount !== undefined && coupon.max_discount_amount !== null) ? Number(coupon.max_discount_amount) : null;

  if (discountType === 'FLAT') {
    discount = Math.min(discountVal, subtotal);
  } else if (discountType === 'PERCENTAGE') {
    const calculated = (subtotal * discountVal) / 100;
    discount = maxDiscount ? Math.min(maxDiscount, calculated) : calculated;
  }

  return {
    valid: true,
    coupon,
    discount_amount: Math.round(discount),
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(val: string): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Robust order lookup in Supabase executing separate .eq() queries instead of .or().
 * Validates UUID format before querying the 'id' column to prevent 22P02 Postgres errors.
 * Preserves database query errors so callers never confuse DB failures with "order not found".
 */
export async function findOrderInSupabase(
  identifier: string,
  client = supabaseServer
): Promise<{ order?: ServerOrder; error?: any }> {
  if (!client || !identifier) return { order: undefined };
  const target = identifier.trim();

  // 1. If valid UUID, look up strictly by primary key 'id'
  if (isUuid(target)) {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('id', target)
      .maybeSingle();
    if (error) {
      return { error };
    }
    if (data) return { order: data };
  }

  // 2. Query strictly by 'order_number'
  const { data: byOrderNum, error: errOrderNum } = await client
    .from('orders')
    .select('*')
    .eq('order_number', target)
    .maybeSingle();
  if (errOrderNum) {
    return { error: errOrderNum };
  }
  if (byOrderNum) return { order: byOrderNum };

  return { order: undefined };
}

export interface OrderCleanupScheduleState {
  orderId: string;
  orderNumber: string;
  firstCheckedAt: number;
  lastCheckedAt: number;
  nextCheckAt: number;
  checkCount: number;
  failedCancelAttempts: number;
  lastStatus: string;
  lastDecision: 'cancel' | 'confirm' | 'defer' | 'skip';
  lastReason: string;
  needsReview: boolean;
  reviewReason?: string;
}

export type OrderCleanupBackoffState = OrderCleanupScheduleState;

export const orderCleanupTracker = new Map<string, OrderCleanupScheduleState>();
export const deferredOrderCheckTracker = orderCleanupTracker as any;

export function clearOrderCleanupTracker(): void {
  orderCleanupTracker.clear();
}

export function clearDeferredOrderCheckTracker(): void {
  orderCleanupTracker.clear();
}

/**
 * Backoff schedule progression:
 * Checks at 25 min, then +2 min, +10 min, +30 min, +2 h, then once a day.
 */
export function getNextBackoffDelay(checkCount: number): number {
  if (checkCount === 1) return 2 * 60 * 1000;         // +2 min
  if (checkCount === 2) return 10 * 60 * 1000;        // +10 min
  if (checkCount === 3) return 30 * 60 * 1000;        // +30 min
  if (checkCount === 4) return 2 * 60 * 60 * 1000;    // +2 hours
  return 24 * 60 * 60 * 1000;                         // once a day (24h)
}

/**
 * Concurrency worker pool: processes items with bounded concurrency limit.
 */
export async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (index < items.length) {
      const current = items[index++];
      await fn(current);
    }
  });
  await Promise.all(workers);
}

/**
 * Permanent structured log line (one line per order per cycle).
 */
export function logOrderCleanupDecision(params: {
  orderId: string;
  orderNumber: string;
  paymentMethod: string;
  hasProviderOrderId: boolean;
  cashfreeStatus: string;
  decision: 'cancel' | 'confirm' | 'defer' | 'skip';
  reason: string;
}): void {
  console.log(
    `[OrderCleanup] order_id=${params.orderId} order_number=${params.orderNumber} payment_method=${params.paymentMethod} has_provider_order_id=${params.hasProviderOrderId} cashfree_status=${params.cashfreeStatus} decision=${params.decision} reason="${params.reason}"`
  );
}

/**
 * Environment flag for running cleanup job.
 * Default: true strictly in production (NODE_ENV === 'production'), false otherwise.
 * Overridable explicitly via ENABLE_ORDER_CLEANUP='true' | 'false'.
 */
export function isOrderCleanupEnabled(): boolean {
  if (process.env.ENABLE_ORDER_CLEANUP !== undefined) {
    return process.env.ENABLE_ORDER_CLEANUP === 'true' || process.env.ENABLE_ORDER_CLEANUP === '1';
  }
  return process.env.NODE_ENV === 'production';
}

// Single-flight guard: ensure only one run executes at a time
let isCleanupInProgress = false;

export function isOrderCleanupRunning(): boolean {
  return isCleanupInProgress;
}

export function resetCleanupInProgressGuard(): void {
  isCleanupInProgress = false;
}

// Postgres error 42703 (undefined_column on orders.needs_review) log-once guard
let hasLoggedNeedsReviewColumnMissing = false;

export function resetNeedsReviewColumnMissingGuard(): void {
  hasLoggedNeedsReviewColumnMissing = false;
}

export function hasNeedsReviewColumnWarningLogged(): boolean {
  return hasLoggedNeedsReviewColumnMissing;
}

export async function persistOrderNeedsReview(
  client: SupabaseClient | null,
  orderId: string,
  reviewReason: string
): Promise<boolean> {
  if (!client) return false;
  try {
    const { error } = await client
      .from('orders')
      .update({
        needs_review: true,
        review_reason: reviewReason,
      })
      .eq('id', orderId);

    if (error) {
      const isMissingColumn =
        error.code === '42703' ||
        error.message?.includes('needs_review') ||
        error.message?.includes('42703');

      if (isMissingColumn) {
        if (!hasLoggedNeedsReviewColumnMissing) {
          hasLoggedNeedsReviewColumnMissing = true;
          console.warn(
            '[OrderCleanup] Notice: Column orders.needs_review not present in database schema (Postgres 42703). Keeping manual review flag in-memory only.'
          );
        }
        return false;
      }
      console.warn(`[OrderCleanup] Could not persist needs_review for order ${orderId}: ${error.message}`);
      return false;
    }
    return true;
  } catch (err: any) {
    const isMissingColumn =
      err?.code === '42703' ||
      err?.message?.includes('needs_review') ||
      err?.message?.includes('42703');

    if (isMissingColumn) {
      if (!hasLoggedNeedsReviewColumnMissing) {
        hasLoggedNeedsReviewColumnMissing = true;
        console.warn(
          '[OrderCleanup] Notice: Column orders.needs_review not present in database schema (Postgres 42703). Keeping manual review flag in-memory only.'
        );
      }
    }
    return false;
  }
}

// Auto-expire unpaid PENDING_PAYMENT orders after 25 min: verifies with Cashfree, confirms paid orders, cancels definitively failed ones
export async function expireUnpaidOrders(client?: SupabaseClient | null): Promise<number> {
  // Single-flight guard: ensure only one cleanup run executes concurrently
  if (isCleanupInProgress) {
    console.log('[OrderCleanup] Cleanup run skipped: another run is already in progress.');
    return 0;
  }
  isCleanupInProgress = true;

  try {
    const isTestMode = process.env.UNIT_TEST === 'true' || process.env.NODE_ENV === 'test';
    const activeClient = client !== undefined ? client : (isTestMode ? null : (isLiveSupabase ? supabaseServer : null));

    // If disabled and not explicitly running with a custom client or in test mode, skip
    if (!isOrderCleanupEnabled() && !client && !isTestMode) {
      return 0;
    }

    const now = Date.now();
    const EXPIRY_MS = 25 * 60 * 1000; // 25 minutes
    let expiredCount = 0;

    const { fetchCashfreeOrderDetails } = await import('./services/cashfreeService');
    const { confirmOrderPayment } = await import('./services/paymentPersistenceService');

    const pendingOrdersMap = new Map<string, ServerOrder>();

    // 1. In-memory candidate orders
    for (const order of inMemoryStore.orders.values()) {
      if (order.status === 'PENDING_PAYMENT' && now - new Date(order.created_at).getTime() > EXPIRY_MS) {
        pendingOrdersMap.set(order.id, order);
      }
    }

    // 2. Discover persistent pending orders from Supabase (vital after server restart)
    if (activeClient) {
      const expiryIso = new Date(now - EXPIRY_MS).toISOString();
      const queryCols = 'id, order_number, status, payment_status, payment_method, total_amount, delivery_slot_id, created_at, updated_at';
      const eqQuery: any = activeClient
        .from('orders')
        .select(queryCols)
        .eq('status', 'PENDING_PAYMENT');

      let listQuery: any = typeof eqQuery?.lt === 'function'
        ? eqQuery.lt('created_at', expiryIso)
        : eqQuery;

      if (typeof listQuery?.order === 'function') {
        listQuery = listQuery.order('created_at', { ascending: true });
      }
      if (typeof listQuery?.limit === 'function') {
        listQuery = listQuery.limit(200);
      }

      const { data: dbOrders, error: dbQueryErr } = await listQuery;

      if (dbQueryErr) {
        const isMissingColumn =
          dbQueryErr.code === '42703' ||
          dbQueryErr.message?.includes('42703') ||
          dbQueryErr.message?.includes('does not exist');

        if (isMissingColumn) {
          const colMatch =
            dbQueryErr.message?.match(/column\s+(?:orders\.)?["']?([a-zA-Z0-9_]+)["']?\s+does not exist/i) ||
            dbQueryErr.message?.match(/column\s+["']?([a-zA-Z0-9_]+)["']?/i);
          const missingColName = colMatch?.[1] || 'unknown_column';

          console.error(
            `[OrderCleanup] Database schema error: Column '${missingColName}' does not exist on table public.orders (Postgres error 42703). Skipping cleanup cycle. Error: ${dbQueryErr.message}`
          );
          return 0; // Skip cycle: do NOT treat as "no orders found"
        }

        console.error(
          `[OrderCleanup] Error discovering pending orders from Supabase: ${dbQueryErr.message}. Aborting cleanup run to prevent inconsistent state.`
        );
        return 0; // Abort cleanup run safely on query error
      }

      if (dbOrders && Array.isArray(dbOrders)) {
        for (const dbo of dbOrders) {
          if (!pendingOrdersMap.has(dbo.id)) {
            if (!dbo.provider_order_id && dbo.payment_method === 'ONLINE' && dbo.order_number) {
              dbo.provider_order_id = dbo.order_number;
            }
            pendingOrdersMap.set(dbo.id, dbo);
          }
        }
      }
    }

    const pendingOrders = Array.from(pendingOrdersMap.values());

    // Process candidate orders with a bounded concurrency limit of 5
    await processWithConcurrency(pendingOrders, 5, async (order) => {
      // Re-check in-memory status in case concurrent webhook confirmed it
      if (order.status !== 'PENDING_PAYMENT') {
        orderCleanupTracker.delete(order.id);
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: order.payment_method,
          hasProviderOrderId: Boolean(order.provider_order_id),
          cashfreeStatus: 'N/A',
          decision: 'skip',
          reason: `Order is no longer PENDING_PAYMENT (${order.status})`,
        });
        return;
      }

      // COD pending orders are NEVER touched by this job
      if (order.payment_method === 'COD') {
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: 'COD',
          hasProviderOrderId: Boolean(order.provider_order_id),
          cashfreeStatus: 'N/A',
          decision: 'skip',
          reason: 'COD pending orders are never touched by this job',
        });
        return;
      }

      let tracking = orderCleanupTracker.get(order.id);

      // If order was already flagged for manual review, stop re-checking every cycle
      if (tracking?.needsReview) {
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: order.payment_method,
          hasProviderOrderId: Boolean(order.provider_order_id),
          cashfreeStatus: tracking.lastStatus || 'N/A',
          decision: 'skip',
          reason: `Flagged for manual review: ${tracking.reviewReason}`,
        });
        return;
      }

      // Respect backoff schedule cooldown: do not check early!
      if (tracking && now < tracking.nextCheckAt) {
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: order.payment_method,
          hasProviderOrderId: Boolean(order.provider_order_id),
          cashfreeStatus: tracking.lastStatus || 'N/A',
          decision: 'skip',
          reason: `In backoff cooldown (next check in ${Math.round((tracking.nextCheckAt - now) / 1000)}s)`,
        });
        return;
      }

      // Online order without provider_order_id: check DB state first if connected
      if (order.payment_method === 'ONLINE' && !order.provider_order_id) {
        if (activeClient) {
          try {
            const selectQuery: any = activeClient
              .from('orders')
              .select('id, status, payment_status, total_amount, order_number');
            const eqQuery: any = typeof selectQuery?.eq === 'function' ? selectQuery.eq('id', order.id) : null;

            if (eqQuery && typeof eqQuery?.maybeSingle === 'function') {
              const { data: dbOrder, error: checkErr } = await eqQuery.maybeSingle();

              if (checkErr) {
                console.warn(
                  `[OrderCleanup] Error checking order ${order.id} status in Supabase: ${checkErr.message}. Skipping order.`
                );
                return;
              }

              if (dbOrder && dbOrder.status !== 'PENDING_PAYMENT') {
                console.log(
                  `[OrderCleanup] Order #${order.order_number} is already marked ${dbOrder.status}/${dbOrder.payment_status} in DB. Syncing memory and skipping cancel.`
                );
                order.status = dbOrder.status;
                order.payment_status = dbOrder.payment_status;
                inMemoryStore.orders.set(order.id, order);
                orderCleanupTracker.delete(order.id);
                return;
              }
            }
          } catch (checkErr: any) {
            console.warn(`[OrderCleanup] Non-fatal check error for order ${order.id}:`, checkErr?.message);
          }
        }

        const reviewReason = 'Online order missing provider_order_id';
        orderCleanupTracker.set(order.id, {
          orderId: order.id,
          orderNumber: order.order_number,
          firstCheckedAt: tracking?.firstCheckedAt || now,
          lastCheckedAt: now,
          nextCheckAt: Number.MAX_SAFE_INTEGER,
          checkCount: (tracking?.checkCount || 0) + 1,
          failedCancelAttempts: tracking?.failedCancelAttempts || 0,
          lastStatus: 'N/A',
          lastDecision: 'defer',
          lastReason: reviewReason,
          needsReview: true,
          reviewReason,
        });
        order.needs_review = true;
        order.review_reason = reviewReason;
        inMemoryStore.orders.set(order.id, order);
        await persistOrderNeedsReview(activeClient, order.id, reviewReason);

        console.warn(
          `[OrderCleanup] [MANUAL REVIEW REQUIRED] Order #${order.order_number} (${order.id}) missing provider_order_id. Flagging for manual review.`
        );
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: 'ONLINE',
          hasProviderOrderId: false,
          cashfreeStatus: 'N/A',
          decision: 'defer',
          reason: reviewReason,
        });
        return;
      }

      const checkCount = (tracking?.checkCount || 0) + 1;
      const firstCheckedAt = tracking?.firstCheckedAt || now;

      // Check if order has been stuck in repeated non-terminal status for > 24 hours
      if (tracking && now - firstCheckedAt >= 24 * 60 * 60 * 1000) {
        const reviewReason = 'Repeated non-terminal Cashfree status for over 24 hours';
        tracking.needsReview = true;
        tracking.reviewReason = reviewReason;
        tracking.nextCheckAt = Number.MAX_SAFE_INTEGER;
        tracking.lastCheckedAt = now;
        tracking.lastDecision = 'defer';
        tracking.lastReason = reviewReason;
        orderCleanupTracker.set(order.id, tracking);

        order.needs_review = true;
        order.review_reason = reviewReason;
        inMemoryStore.orders.set(order.id, order);
        await persistOrderNeedsReview(activeClient, order.id, reviewReason);

        console.warn(
          `[OrderCleanup] [STUCK ORDER ALERT] Order #${order.order_number} (${order.id}) requires manual review! Reason: ${reviewReason}`
        );
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: order.payment_method,
          hasProviderOrderId: true,
          cashfreeStatus: tracking.lastStatus || 'N/A',
          decision: 'defer',
          reason: reviewReason,
        });
        return;
      }

      // Authoritative gateway verification with Cashfree
      let cashfreeDetails: any;
      try {
        cashfreeDetails = await fetchCashfreeOrderDetails(order.provider_order_id!);
      } catch (err: any) {
        cashfreeDetails = { status: 'UNKNOWN', reason: 'transient', isNetworkError: true };
      }

      // 1. If Cashfree confirms payment was PAID, reconcile via confirmOrderPayment and do NOT cancel!
      if (cashfreeDetails.status === 'PAID') {
        orderCleanupTracker.delete(order.id);
        await confirmOrderPayment({
          orderIdOrProviderId: order.id,
          providerOrderId: order.provider_order_id!,
          paymentAmount: cashfreeDetails.orderAmount,
          currency: cashfreeDetails.orderCurrency || 'INR',
          source: 'CLEANUP_RECONCILE',
        });
        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: order.payment_method,
          hasProviderOrderId: true,
          cashfreeStatus: 'PAID',
          decision: 'confirm',
          reason: 'Order confirmed PAID by Cashfree API; reconciled',
        });
        return;
      }

      // 2. Non-terminal states: UNKNOWN, ACTIVE, TERMINATION_REQUESTED, configError, transient ALWAYS defer
      const isTerminalStatus =
        cashfreeDetails.status === 'EXPIRED' ||
        cashfreeDetails.status === 'TERMINATED' ||
        cashfreeDetails.status === 'FAILED';

      if (!isTerminalStatus) {
        const delay = getNextBackoffDelay(checkCount);
        const deferReason =
          cashfreeDetails.reason === 'configError'
            ? 'Cashfree config or credentials error; deferring cancellation'
            : cashfreeDetails.reason === 'transient'
            ? 'Transient network or gateway outage; deferring cancellation'
            : `Order in non-terminal gateway state '${cashfreeDetails.status}'; deferring cancellation`;

        orderCleanupTracker.set(order.id, {
          orderId: order.id,
          orderNumber: order.order_number,
          firstCheckedAt,
          lastCheckedAt: now,
          nextCheckAt: now + delay,
          checkCount,
          failedCancelAttempts: tracking?.failedCancelAttempts || 0,
          lastStatus: cashfreeDetails.status,
          lastDecision: 'defer',
          lastReason: deferReason,
          needsReview: false,
        });

        logOrderCleanupDecision({
          orderId: order.id,
          orderNumber: order.order_number,
          paymentMethod: order.payment_method,
          hasProviderOrderId: true,
          cashfreeStatus: cashfreeDetails.status,
          decision: 'defer',
          reason: `${deferReason} (next check in ${Math.round(delay / 60000)}m)`,
        });
        return;
      }

      // 3. Definitive terminal state (EXPIRED, TERMINATED, FAILED / 404): attempt cancellation
      const nowIso = new Date().toISOString();

      if (activeClient) {
        let cancelDbErr: any = null;
        let updatedRows: any = null;

        try {
          const fromOrders = activeClient.from('orders');
          if (typeof fromOrders?.update !== 'function') {
            throw new Error('Database client does not support update method');
          }
          const res = await fromOrders
            .update({
              status: 'CANCELLED',
              payment_status: 'FAILED',
              cancelled_at: nowIso,
              cancel_reason: 'Auto-expired unpaid order after gateway terminal status',
              updated_at: nowIso,
            })
            .eq('id', order.id)
            .eq('status', 'PENDING_PAYMENT') // Concurrency CAS guard
            .select('id, delivery_slot_id');
          cancelDbErr = res.error;
          updatedRows = res.data;
        } catch (ex: any) {
          cancelDbErr = { message: ex.message || 'Database error during cancellation update' };
        }

        const failedCancel = cancelDbErr || !updatedRows || updatedRows.length === 0;

        if (failedCancel) {
          const failAttempts = (tracking?.failedCancelAttempts || 0) + 1;
          const failMessage = cancelDbErr
            ? `DB update error: ${cancelDbErr.message}`
            : 'Zero rows updated during conditional cancellation (status concurrently changed)';

          if (failAttempts >= 5) {
            const reviewReason = `Exceeded 5 failed cancel attempts: ${failMessage}`;
            console.warn(
              `[OrderCleanup] [STUCK ORDER ALERT] Order #${order.order_number} (${order.id}) requires manual review! Reason: ${reviewReason}`
            );
            orderCleanupTracker.set(order.id, {
              orderId: order.id,
              orderNumber: order.order_number,
              firstCheckedAt,
              lastCheckedAt: now,
              nextCheckAt: Number.MAX_SAFE_INTEGER,
              checkCount,
              failedCancelAttempts: failAttempts,
              lastStatus: cashfreeDetails.status,
              lastDecision: 'defer',
              lastReason: reviewReason,
              needsReview: true,
              reviewReason,
            });
            order.needs_review = true;
            order.review_reason = reviewReason;
            inMemoryStore.orders.set(order.id, order);
            await persistOrderNeedsReview(activeClient, order.id, reviewReason);
          } else {
            const delay = getNextBackoffDelay(checkCount);
            orderCleanupTracker.set(order.id, {
              orderId: order.id,
              orderNumber: order.order_number,
              firstCheckedAt,
              lastCheckedAt: now,
              nextCheckAt: now + delay,
              checkCount,
              failedCancelAttempts: failAttempts,
              lastStatus: cashfreeDetails.status,
              lastDecision: 'defer',
              lastReason: `Cancel attempt failed (${failAttempts}/5): ${failMessage}`,
              needsReview: false,
            });
          }

          logOrderCleanupDecision({
            orderId: order.id,
            orderNumber: order.order_number,
            paymentMethod: order.payment_method,
            hasProviderOrderId: true,
            cashfreeStatus: cashfreeDetails.status,
            decision: 'defer',
            reason: failAttempts >= 5 ? `Exceeded 5 failed cancel attempts: ${failMessage}` : `Cancel attempt failed (${failAttempts}/5): ${failMessage}`,
          });
          return;
        }

        // Safely release delivery slot capacity in Supabase if attached
        const targetSlotId = updatedRows[0]?.delivery_slot_id || order.delivery_slot_id;
        if (targetSlotId) {
          try {
            const { data: slotData } = await activeClient
              .from('delivery_slots')
              .select('booked_count')
              .eq('id', targetSlotId)
              .maybeSingle();

            if (slotData && slotData.booked_count > 0) {
              await activeClient
                .from('delivery_slots')
                .update({
                  booked_count: Math.max(0, slotData.booked_count - 1),
                  updated_at: nowIso,
                })
                .eq('id', targetSlotId);
            }
          } catch (slotEx: any) {
            // Non-fatal if delivery_slots table does not exist
          }
        }
      }

      // Update in-memory order
      order.status = 'CANCELLED';
      order.payment_status = 'FAILED';
      order.cancelled_at = nowIso;
      order.cancel_reason = 'Auto-expired unpaid order after gateway terminal status';
      order.updated_at = nowIso;
      inMemoryStore.orders.set(order.id, order);

      // Release delivery slot capacity safely in-memory if present (legacy compatibility)
      if (order.delivery_slot_id && (inMemoryStore as any).deliverySlots) {
        const slotsMap = (inMemoryStore as any).deliverySlots;
        const slot = slotsMap.get(order.delivery_slot_id);
        if (slot && slot.booked_count > 0) {
          slot.booked_count = Math.max(0, slot.booked_count - 1);
          slotsMap.set(slot.id, slot);
        }
      }

      orderCleanupTracker.delete(order.id);
      expiredCount++;

      logOrderCleanupDecision({
        orderId: order.id,
        orderNumber: order.order_number,
        paymentMethod: order.payment_method,
        hasProviderOrderId: true,
        cashfreeStatus: cashfreeDetails.status,
        decision: 'cancel',
        reason: `Order cancelled after Cashfree confirmed terminal status ${cashfreeDetails.status}`,
      });
    });

    return expiredCount;
  } finally {
    isCleanupInProgress = false;
  }
}

// Function to fetch stale pending orders and their cleanup tracking data for admin review
export async function getStalePendingOrdersForReview(
  client?: SupabaseClient | null
) {
  const isTestMode = process.env.UNIT_TEST === 'true' || process.env.NODE_ENV === 'test';
  const activeClient = client !== undefined ? client : (isTestMode ? null : (isLiveSupabase ? supabaseServer : null));
  const staleOrders: any[] = [];
  const now = Date.now();
  const EXPIRY_MS = 25 * 60 * 1000;

  for (const order of inMemoryStore.orders.values()) {
    const isStale = order.status === 'PENDING_PAYMENT' && (now - new Date(order.created_at).getTime() > EXPIRY_MS);
    const tracking = orderCleanupTracker.get(order.id);
    if (isStale || tracking?.needsReview) {
      staleOrders.push({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total_amount: order.total_amount,
        provider_order_id: order.provider_order_id,
        created_at: order.created_at,
        needs_review: order.needs_review || tracking?.needsReview || false,
        review_reason: order.review_reason || tracking?.reviewReason || null,
        tracking: tracking || null,
      });
    }
  }

  if (activeClient) {
    const expiryIso = new Date(now - EXPIRY_MS).toISOString();
    const { data: dbOrders } = await activeClient
      .from('orders')
      .select('id, order_number, status, payment_status, payment_method, total_amount, delivery_slot_id, created_at, updated_at')
      .eq('status', 'PENDING_PAYMENT')
      .lt('created_at', expiryIso)
      .order('created_at', { ascending: true })
      .limit(200);

    if (dbOrders && Array.isArray(dbOrders)) {
      for (const dbo of dbOrders) {
        if (!staleOrders.some((o) => o.id === dbo.id)) {
          const tracking = orderCleanupTracker.get(dbo.id);
          staleOrders.push({
            id: dbo.id,
            order_number: dbo.order_number,
            status: dbo.status,
            payment_status: dbo.payment_status,
            payment_method: dbo.payment_method,
            total_amount: dbo.total_amount,
            provider_order_id: (dbo as any).provider_order_id || (dbo.payment_method === 'ONLINE' ? dbo.order_number : undefined),
            created_at: dbo.created_at,
            needs_review: tracking?.needsReview || false,
            review_reason: tracking?.reviewReason || null,
            tracking: tracking || null,
          });
        }
      }
    }
  }

  return staleOrders;
}

// Startup log & scheduler initialization
const supabaseHost = supabaseUrl
  ? (() => {
      try {
        return new URL(supabaseUrl).host;
      } catch {
        return 'invalid-url';
      }
    })()
  : 'none (in-memory)';
const cashfreeEnv = process.env.CASHFREE_ENVIRONMENT || 'SANDBOX';

console.log(
  `[OrderCleanup] Scheduler initialized. Interval: 2m. Supabase host: ${supabaseHost}. Cashfree env: ${cashfreeEnv}. Enabled: ${isOrderCleanupEnabled()}`
);

if (!isOrderCleanupEnabled()) {
  console.warn(
    `[OrderCleanup] WARNING: Order cleanup background job is DISABLED by default (requires NODE_ENV=production or ENABLE_ORDER_CLEANUP=true). Local and test environments will not auto-expire unpaid orders.`
  );
}

// Run periodic cleanup every 2 minutes
setInterval(async () => {
  try {
    await expireUnpaidOrders();
  } catch (err) {
    console.error('[OrderCleanup] Error during auto-expire cleanup:', err);
  }
}, 120000); // 2 minutes

// Seed admin profile
inMemoryStore.profiles.set('admin-default', {
  id: 'admin-default',
  email: 'admin@saraswatisweetsbarabanki.com',
  phone: '+919161110030',
  full_name: 'Shop Owner (Admin)',
  role: 'ADMIN',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

inMemoryStore.profiles.set('staff-default', {
  id: 'staff-default',
  email: 'staff@saraswatisweetsbarabanki.com',
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

// ==========================================================
// STORE OPERATIONS & PICKUP SCHEDULING (ASIA/KOLKATA)
// ==========================================================

export function checkAutoReopen(settings?: ServerStoreSettings): boolean {
  const targetSettings = settings || inMemoryStore.storeSettings;
  if (!targetSettings) return false;
  if (targetSettings.auto_reopen_at) {
    const reopenTime = new Date(targetSettings.auto_reopen_at).getTime();
    if (!isNaN(reopenTime) && Date.now() >= reopenTime) {
      console.log(`[Store] Automatic reopening triggered at ${new Date().toISOString()}. Re-enabling delivery & takeaway.`);
      targetSettings.delivery_enabled = true;
      targetSettings.takeaway_enabled = true;
      targetSettings.auto_reopen_at = null;
      targetSettings.closure_message = null;
      syncStoreSettingsToSupabase(targetSettings).catch(() => {});
      return true;
    }
  }
  return false;
}

export async function syncStoreSettingsToSupabase(settings: ServerStoreSettings): Promise<void> {
  if (!isLiveSupabase || !supabaseServer) return;
  try {
    const updates: Record<string, any> = {
      delivery_enabled: settings.delivery_enabled,
      takeaway_enabled: settings.takeaway_enabled,
      closure_message: settings.closure_message,
      pickup_opening_time: settings.pickup_opening_time,
      pickup_closing_time: settings.pickup_closing_time,
      pickup_slot_duration_minutes: settings.pickup_slot_duration_minutes,
      pickup_max_orders_per_slot: settings.pickup_max_orders_per_slot,
      pickup_advance_days: settings.pickup_advance_days,
      auto_reopen_at: settings.auto_reopen_at,
      is_store_open: settings.is_store_open,
      business_hours: {
        open: settings.opening_time || '08:00',
        close: settings.closing_time || '22:00',
        delivery_enabled: settings.delivery_enabled,
        takeaway_enabled: settings.takeaway_enabled,
        closure_message: settings.closure_message,
        pickup_opening_time: settings.pickup_opening_time,
        pickup_closing_time: settings.pickup_closing_time,
        pickup_slot_duration_minutes: settings.pickup_slot_duration_minutes,
        pickup_max_orders_per_slot: settings.pickup_max_orders_per_slot,
        pickup_advance_days: settings.pickup_advance_days,
        auto_reopen_at: settings.auto_reopen_at,
      },
    };

    const { error } = await supabaseServer.from('store_settings').update(updates).eq('id', 1);
    if (error) {
      // Fallback: update business_hours and is_store_open if dedicated columns are pending migration
      await supabaseServer.from('store_settings').update({
        is_store_open: settings.is_store_open,
        business_hours: updates.business_hours,
      }).eq('id', 1);
    }
  } catch (err: any) {
    console.warn('[Store] syncStoreSettingsToSupabase failed:', err?.message);
  }
}

export function getKolkataDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const p of parts) partMap[p.type] = p.value;
  return {
    year: partMap.year,
    month: partMap.month,
    day: partMap.day,
    hour: parseInt(partMap.hour || '0', 10),
    minute: parseInt(partMap.minute || '0', 10),
    second: parseInt(partMap.second || '0', 10),
    dateStr: `${partMap.year}-${partMap.month}-${partMap.day}`,
  };
}

export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr || '0', 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
}

export interface PickupSlotOption {
  slot_date: string;
  start_time: string;
  end_time: string;
  time_12h: string;
  formatted_slot: string;
  available: boolean;
  is_available: boolean;
  remaining_capacity: number;
  available_capacity: number;
  capacity: number;
  max_capacity: number;
  booked_count: number;
}

export type PickupSlot = PickupSlotOption;

export interface PickupDaySchedule {
  date: string;
  date_label: string;
  day_name: string;
  is_today: boolean;
  slots: PickupSlotOption[];
}

export function generateAvailablePickupSlots(
  targetDate: string,
  settings?: ServerStoreSettings
): PickupSlotOption[];
export function generateAvailablePickupSlots(
  settings?: ServerStoreSettings
): PickupDaySchedule[];
export function generateAvailablePickupSlots(
  targetDateOrSettings?: string | ServerStoreSettings,
  maybeSettings?: ServerStoreSettings
): PickupSlotOption[] | PickupDaySchedule[] {
  let targetDateStr: string | undefined;
  let settings: ServerStoreSettings;

  if (typeof targetDateOrSettings === 'string') {
    targetDateStr = targetDateOrSettings;
    settings = maybeSettings || inMemoryStore.storeSettings;
  } else {
    settings = targetDateOrSettings || inMemoryStore.storeSettings;
  }

  checkAutoReopen(settings);
  if (!settings.takeaway_enabled || !settings.is_store_open) {
    return [];
  }

  const durationMin = settings.pickup_slot_duration_minutes || 30;
  const maxCap = settings.pickup_max_orders_per_slot || 10;
  const advanceDays = Math.max(1, Math.min(30, settings.pickup_advance_days ?? 3));
  const openTime = settings.pickup_opening_time || '08:00';
  const closeTime = settings.pickup_closing_time || '21:30';

  const [openHour, openMin] = openTime.split(':').map((x) => parseInt(x, 10));
  const [closeHour, closeMin] = closeTime.split(':').map((x) => parseInt(x, 10));
  const openMinutesTotal = openHour * 60 + (openMin || 0);
  const closeMinutesTotal = closeHour * 60 + (closeMin || 0);

  const now = new Date();
  const currentKolkata = getKolkataDateParts(now);
  const currentMinutesKolkata = currentKolkata.hour * 60 + currentKolkata.minute;

  const generateSlotsForDate = (dateStr: string, isToday: boolean): PickupSlotOption[] => {
    const slots: PickupSlotOption[] = [];
    for (let m = openMinutesTotal; m + durationMin <= closeMinutesTotal; m += durationMin) {
      const startH = Math.floor(m / 60);
      const startM = m % 60;
      const endH = Math.floor((m + durationMin) / 60);
      const endM = (m + durationMin) % 60;

      const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      // If today, buffer by 30 minutes from now to allow sweet preparation
      const isPast = isToday && (m < currentMinutesKolkata + 30);
      if (isPast) {
        continue; // Do not offer past slots
      }

      // Count active booked orders for this slot
      let bookedCount = 0;
      for (const order of inMemoryStore.orders.values()) {
        if (order.fulfilment_type === 'TAKEAWAY' || order.slot_snapshot?.fulfilment_type === 'TAKEAWAY') {
          if (
            order.slot_snapshot?.slot_date === dateStr &&
            order.slot_snapshot?.start_time === startTimeStr &&
            order.status !== 'CANCELLED' &&
            order.status !== 'REFUNDED' &&
            order.status !== 'PAYMENT_FAILED'
          ) {
            if (order.status !== 'PENDING_PAYMENT' || !order.expires_at || new Date(order.expires_at).getTime() > Date.now()) {
              bookedCount++;
            }
          }
        }
      }

      const available = bookedCount < maxCap;
      const remaining_capacity = Math.max(0, maxCap - bookedCount);
      const timeFormatted = `${formatTime12h(startTimeStr)} - ${formatTime12h(endTimeStr)}`;

      slots.push({
        slot_date: dateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        time_12h: timeFormatted,
        formatted_slot: timeFormatted,
        available,
        is_available: available,
        remaining_capacity,
        available_capacity: remaining_capacity,
        capacity: maxCap,
        max_capacity: maxCap,
        booked_count: bookedCount,
      });
    }
    return slots;
  };

  if (targetDateStr) {
    // Validate target date is within advance days bounds
    const [todayY, todayM, todayD] = [
      parseInt(currentKolkata.year, 10),
      parseInt(currentKolkata.month, 10) - 1,
      parseInt(currentKolkata.day, 10),
    ];
    const todayMidnight = new Date(Date.UTC(todayY, todayM, todayD));

    const [tY, tM, tD] = targetDateStr.split('-').map(Number);
    if (!tY || !tM || !tD) return [];
    const targetMidnight = new Date(Date.UTC(tY, tM - 1, tD));

    const diffDays = Math.round((targetMidnight.getTime() - todayMidnight.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays < 0 || diffDays > advanceDays) {
      return [];
    }

    return generateSlotsForDate(targetDateStr, diffDays === 0);
  }

  // Otherwise return schedules for all days
  const schedules: PickupDaySchedule[] = [];
  for (let dayOffset = 0; dayOffset <= advanceDays; dayOffset++) {
    const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const kp = getKolkataDateParts(targetDate);
    const dateStr = kp.dateStr;
    const isToday = dayOffset === 0;

    const dayName = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
    }).format(targetDate);

    const monthName = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
    }).format(targetDate);

    const dateLabel = isToday
      ? `Today (${kp.day} ${monthName})`
      : dayOffset === 1
      ? `Tomorrow (${kp.day} ${monthName})`
      : `${dayName}, ${kp.day} ${monthName}`;

    const slots = generateSlotsForDate(dateStr, isToday);
    if (slots.length > 0) {
      schedules.push({
        date: dateStr,
        date_label: dateLabel,
        day_name: dayName,
        is_today: isToday,
        slots,
      });
    }
  }

  return schedules;
}

const slotBookingMutex = new Map<string, Promise<any>>();

export async function checkAndReserveSlotCapacity(
  slotDate: string,
  startTime: string,
  endTimeOrMaxCapacity?: string | number,
  optionalMaxCapacity?: number
): Promise<{ allowed: boolean; activeCount: number; message?: string }> {
  let endTime: string;
  let maxCapacity: number;

  if (typeof endTimeOrMaxCapacity === 'number') {
    maxCapacity = endTimeOrMaxCapacity;
    const durationMin = inMemoryStore.storeSettings.pickup_slot_duration_minutes || 30;
    const [sH, sM] = startTime.split(':').map((x) => parseInt(x, 10));
    const endMinutes = (sH || 0) * 60 + (sM || 0) + durationMin;
    const eH = Math.floor(endMinutes / 60);
    const eM = endMinutes % 60;
    endTime = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
  } else {
    endTime = endTimeOrMaxCapacity || '';
    maxCapacity = typeof optionalMaxCapacity === 'number'
      ? optionalMaxCapacity
      : (inMemoryStore.storeSettings.pickup_max_orders_per_slot || 10);
  }

  const lockKey = `${slotDate.trim()}_${startTime.trim()}`;

  while (slotBookingMutex.has(lockKey)) {
    await slotBookingMutex.get(lockKey);
  }

  let resolveLock!: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  slotBookingMutex.set(lockKey, lockPromise);

  try {
    const now = Date.now();
    let activeCount = 0;

    for (const order of inMemoryStore.orders.values()) {
      if (order.fulfilment_type === 'TAKEAWAY' || order.slot_snapshot?.fulfilment_type === 'TAKEAWAY') {
        const sDate = order.slot_snapshot?.slot_date;
        const sTime = order.slot_snapshot?.start_time;
        if (sDate === slotDate && sTime === startTime) {
          if (order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && order.status !== 'PAYMENT_FAILED') {
            if (order.status !== 'PENDING_PAYMENT' || !order.expires_at || new Date(order.expires_at).getTime() > now) {
              activeCount++;
            }
          }
        }
      }
    }

    if (activeCount >= maxCapacity) {
      return {
        allowed: false,
        activeCount,
        message: 'This pickup slot is currently at maximum capacity. Please choose another time slot.',
      };
    }

    if (isLiveSupabase && supabaseServer) {
      try {
        const { data: rpcRes, error: rpcErr } = await supabaseServer.rpc('check_and_reserve_pickup_slot', {
          p_slot_date: slotDate,
          p_start_time: startTime,
          p_end_time: endTime,
          p_max_capacity: maxCapacity,
        });

        if (!rpcErr && rpcRes && typeof rpcRes.allowed === 'boolean') {
          if (!rpcRes.allowed) {
            return {
              allowed: false,
              activeCount: rpcRes.active_count ?? activeCount,
              message: rpcRes.message || 'Selected pickup slot is at full capacity. Please choose another slot.',
            };
          }
          activeCount = Math.max(activeCount, rpcRes.active_count || 0);
        }
      } catch (err: any) {
        console.warn('[SlotReservation] RPC call failed, using in-memory capacity check:', err?.message);
      }
    }

    if (activeCount >= maxCapacity) {
      return {
        allowed: false,
        activeCount,
        message: 'This pickup slot is currently at maximum capacity. Please choose another time slot.',
      };
    }

    return {
      allowed: true,
      activeCount,
    };
  } finally {
    slotBookingMutex.delete(lockKey);
    resolveLock();
  }
}



// ==========================================================
// PERSISTENCE ENGINE (Supabase Postgres)
// ==========================================================
export async function loadStoreState(): Promise<void> {
  if (!isLiveSupabase || !supabaseServer) {
    console.warn('[Store] Supabase not configured. Using empty memory state.');
    return;
  }

  try {
    console.log('[Store] Fetching all data from Supabase Postgres...');
    
    // Fetch critical tables
    const [
      cats, prods, vars, offs, bans, hampers, 
      ords, profs, addrs, pays, revs, 
      coups, bulks, prodImgs, ordItems, settingsRes
    ] = await Promise.all([
      supabaseServer.from('categories').select('*'),
      supabaseServer.from('products').select('*'),
      supabaseServer.from('product_variants').select('*'),
      supabaseServer.from('offers').select('*'),
      supabaseServer.from('banners').select('*'),
      supabaseServer.from('gift_hampers').select('*'),
      supabaseServer.from('orders').select('*'),
      supabaseServer.from('profiles').select('*'),
      supabaseServer.from('addresses').select('*'),
      supabaseServer.from('payments').select('*'),
      supabaseServer.from('reviews').select('*'),
      supabaseServer.from('coupons').select('*'),
      supabaseServer.from('bulk_enquiries').select('*'),
      supabaseServer.from('product_images').select('*'),
      supabaseServer.from('order_items').select('*'),
      supabaseServer.from('store_settings').select('*').eq('id', 1).maybeSingle()
    ]);

    // Populate SyncMaps (bypassing the custom .set to avoid re-upserting)
    if (cats.data) { inMemoryStore.categories.clear(); cats.data.forEach(x => inMemoryStore.categories.set(x.id, x)); }
    if (offs.data) { inMemoryStore.offers.clear(); offs.data.forEach(x => inMemoryStore.offers.set(x.id, x)); }
    if (bans.data) { inMemoryStore.banners.clear(); bans.data.forEach(x => inMemoryStore.banners.set(x.id, x)); }
    if (hampers.data) { inMemoryStore.giftHampers.clear(); hampers.data.forEach(x => inMemoryStore.giftHampers.set(x.id, x)); }

    if (prods.data) {
      inMemoryStore.products.clear();
      const imgMap = new Map();
      if (typeof prodImgs !== 'undefined' && prodImgs.data) {
        prodImgs.data.forEach((img: any) => {
            if (img.is_primary) imgMap.set(img.product_id, img.url || img.image_url);
        });
      }
      prods.data.forEach((x: any) => {
          x.pure_ghee = x.is_pure_ghee;
          x.image_url = imgMap.get(x.id) || x.image_url;
          inMemoryStore.products.set(x.id, x);
      });
    }

    if (ords.data) {
       inMemoryStore.orders.clear();
       const ordMap = new Map();
       if (typeof ordItems !== 'undefined' && ordItems.data) {
         ordItems.data.forEach((it: any) => {
             if (!ordMap.has(it.order_id)) ordMap.set(it.order_id, []);
             
             // MAP Supabase columns to ServerOrderItem interface
             const mappedItem = {
               id: it.id,
               order_id: it.order_id,
               product_id: it.item_type === 'HAMPER' ? it.gift_hamper_id : null,
               variant_id: it.product_variant_id,
               product_name: it.product_name_snapshot,
               variant_label: it.variant_label_snapshot,
               unit_price: it.unit_price,
               quantity: it.quantity,
               total_price: it.line_total,
               item_type: it.item_type
             };
             
             ordMap.get(it.order_id).push(mappedItem);
         });
       }
       ords.data.forEach((x: any) => {
           x.items = ordMap.get(x.id) || [];
           x.fulfilment_type = x.fulfilment_type || x.slot_snapshot?.fulfilment_type || (Number(x.delivery_charge) === 0 && x.slot_snapshot ? 'TAKEAWAY' : 'DELIVERY');
           if (!x.provider_order_id && x.payment_method === 'ONLINE' && x.order_number) {
             x.provider_order_id = x.order_number;
           }
           inMemoryStore.orders.set(x.id, x);
       });
    }

    if (vars.data) {
      inMemoryStore.variants.clear();
      vars.data.forEach((x: any) => {
        x.productId = x.product_id;
        x.weightGrams = x.weight_grams;
        x.stockStatus = x.stock_status;
        x.stockQuantity = x.stock_quantity;
        inMemoryStore.variants.set(x.id, x);
      });
    }
    
    if (profs.data) {
      inMemoryStore.profiles.clear();
      profs.data.forEach(x => inMemoryStore.profiles.set(x.id, x));
    }
    // Always preserve default admin and staff operational profiles
    inMemoryStore.profiles.set('admin-default', {
      id: 'admin-default',
      email: 'admin@saraswatisweetsbarabanki.com',
      phone: '+919161110030',
      full_name: 'Shop Owner (Admin)',
      role: 'ADMIN',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    inMemoryStore.profiles.set('staff-default', {
      id: 'staff-default',
      email: 'staff@saraswatisweetsbarabanki.com',
      phone: '+919450012346',
      full_name: 'Store Counter Staff',
      role: 'STAFF',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (addrs.data) { inMemoryStore.addresses.clear(); addrs.data.forEach(x => inMemoryStore.addresses.set(x.id, x)); }
    if (pays.data) { inMemoryStore.payments.clear(); pays.data.forEach(x => inMemoryStore.payments.set(x.id, x)); }
    if (revs.data) { inMemoryStore.reviews.clear(); revs.data.forEach(x => inMemoryStore.reviews.set(x.id, x)); }
    if (coups.data) {
      inMemoryStore.coupons.clear();
      coups.data.forEach((x: any) => {
        const mapped = mapDbCouponToStore(x);
        inMemoryStore.coupons.set(mapped.code, mapped);
      });
    }

    // Hydrate couponUsage from persisted orders so total redemptions and per-user limits survive server restarts
    inMemoryStore.couponUsage = [];
    if (ords.data) {
      ords.data.forEach((ord: any) => {
        const rawCode = ord.coupon_code;
        if (rawCode && String(rawCode).trim() && ord.status !== 'EXPIRED' && ord.status !== 'CANCELLED') {
          const cleanCode = String(rawCode).toUpperCase().trim();
          const coupon = inMemoryStore.coupons.get(cleanCode);
          inMemoryStore.couponUsage.push({
            id: `cu-${ord.id}`,
            coupon_id: coupon?.id || cleanCode,
            coupon_code: cleanCode,
            order_id: ord.id,
            user_id: ord.user_id || undefined,
            phone: ord.address_snapshot?.recipient_phone || ord.guest_phone || undefined,
            discount_amount: Number(ord.discount_amount || 0),
            created_at: ord.created_at || ord.placed_at || new Date().toISOString(),
          });
        }
      });
    }

    // Derive actual usage_count for each coupon from persisted historical usages
    const usageCounts = new Map<string, number>();
    inMemoryStore.couponUsage.forEach((u) => {
      const code = u.coupon_code.toUpperCase();
      usageCounts.set(code, (usageCounts.get(code) || 0) + 1);
    });
    inMemoryStore.coupons.forEach((c) => {
      c.usage_count = usageCounts.get(c.code.toUpperCase()) || 0;
    });

    if (bulks.data) { inMemoryStore.bulkEnquiries.clear(); bulks.data.forEach(x => inMemoryStore.bulkEnquiries.set(x.id, x)); }

    if (settingsRes && settingsRes.data) {
      const row = settingsRes.data;
      const bh = (row.business_hours && typeof row.business_hours === 'object') ? row.business_hours : {};
      inMemoryStore.storeSettings = {
        store_name: row.store_name || inMemoryStore.storeSettings.store_name,
        tagline: row.tagline || inMemoryStore.storeSettings.tagline,
        store_phone: row.store_phone || row.phone || inMemoryStore.storeSettings.store_phone,
        whatsapp: row.whatsapp || inMemoryStore.storeSettings.whatsapp,
        store_email: row.store_email || row.email || inMemoryStore.storeSettings.store_email,
        address_text: row.address_text || row.address || inMemoryStore.storeSettings.address_text,
        serviceable_pincodes: row.serviceable_pincodes || row.allowed_pincodes || inMemoryStore.storeSettings.serviceable_pincodes,
        delivery_charge_flat: typeof row.delivery_charge_flat === 'number' ? row.delivery_charge_flat : (typeof row.delivery_charge === 'number' ? row.delivery_charge : 50),
        free_delivery_above: typeof row.free_delivery_above === 'number' ? row.free_delivery_above : 0,
        cod_limit_amount: typeof row.cod_limit_amount === 'number' ? row.cod_limit_amount : 2000,
        tax_rate_percent: typeof row.tax_rate_percent === 'number' ? row.tax_rate_percent : 5,
        opening_time: row.opening_time || bh.open || '08:00',
        closing_time: row.closing_time || bh.close || '22:00',
        is_store_open: typeof row.is_store_open === 'boolean' ? row.is_store_open : true,
        delivery_enabled: typeof row.delivery_enabled === 'boolean' ? row.delivery_enabled : (typeof bh.delivery_enabled === 'boolean' ? bh.delivery_enabled : true),
        takeaway_enabled: typeof row.takeaway_enabled === 'boolean' ? row.takeaway_enabled : (typeof bh.takeaway_enabled === 'boolean' ? bh.takeaway_enabled : true),
        closure_message: row.closure_message ?? bh.closure_message ?? null,
        pickup_opening_time: row.pickup_opening_time || bh.pickup_opening_time || '08:00',
        pickup_closing_time: row.pickup_closing_time || bh.pickup_closing_time || '21:30',
        pickup_slot_duration_minutes: row.pickup_slot_duration_minutes || bh.pickup_slot_duration_minutes || 30,
        pickup_max_orders_per_slot: row.pickup_max_orders_per_slot || bh.pickup_max_orders_per_slot || 10,
        pickup_advance_days: row.pickup_advance_days || bh.pickup_advance_days || 2,
        auto_reopen_at: row.auto_reopen_at || bh.auto_reopen_at || null,
      };
      checkAutoReopen(inMemoryStore.storeSettings);
      console.log(`[Store] Loaded persistent store_settings from Postgres (Delivery: ${inMemoryStore.storeSettings.delivery_enabled ? 'ON' : 'OFF'}, Takeaway: ${inMemoryStore.storeSettings.takeaway_enabled ? 'ON' : 'OFF'}).`);
    }

    console.log(`[Store] Loaded persistent state from Postgres (${inMemoryStore.products.size} products, ${inMemoryStore.orders.size} orders).`);
  } catch (err) {
    console.error('Failed to load store state from Postgres:', err);
  }
}

export function saveStoreState(): void {
  // No-op. SyncMap automatically writes to Supabase on every mutation.
  // The local store_state.json file has been eliminated.
}
