import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Category,
  Product,
  GiftHamper,
  Banner,
  Offer,
  StoreSettings,
  Review,
  BulkOrderEnquiry,
} from '../types/database';
import {
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_GIFT_HAMPERS,
  SEED_BANNERS,
  SEED_OFFERS,
  SEED_STORE_SETTINGS,
  SEED_REVIEWS,
} from '../data/seedData';

export interface CatalogFilterOptions {
  categorySlug?: string;
  search?: string;
  sortBy?: 'featured' | 'price-asc' | 'price-desc' | 'name';
  pureGheeOnly?: boolean;
  bestsellerOnly?: boolean;
}

// --- PERFORMANCE OPTIMIZATION: Client-Side Cache ---
const CACHE_TTL_MS = 5 * 60 * 1000;
const memCache: Record<string, { data: any; timestamp: number }> = {};
function getCached<T>(key: string): T | null {
  const entry = memCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) return entry.data as T;
  return null;
}
function setCached<T>(key: string, data: T): void {
  memCache[key] = { data, timestamp: Date.now() };
}
// ----------------------------------------------------

export const catalogService = {
  isLive: () => isSupabaseConfigured(),

  async getCategories(): Promise<Category[]> {
    const cacheKey = 'categories';
    const cached = getCached<Category[]>(cacheKey);
    if (cached) return cached;

    let fetchedFromServer = false;
    let categories: Category[] = [];

    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories && Array.isArray(data.categories)) {
          categories = data.categories;
          fetchedFromServer = true;
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/categories failed:', e);
    }
    
    if (!fetchedFromServer) {
      categories = SEED_CATEGORIES.filter((c) => c.is_active);
    }
    
    setCached(cacheKey, categories);
    return categories;
  },

  async getProducts(options: CatalogFilterOptions = {}): Promise<Product[]> {
    const cacheKey = 'products_' + JSON.stringify(options);
    const cachedFiltered = getCached<Product[]>(cacheKey);
    if (cachedFiltered) return cachedFiltered;

    const rawCacheKey = 'products_raw';
    let products: Product[] = getCached<Product[]>(rawCacheKey) || [];
    let fetchedFromServer = products.length > 0;

    if (!fetchedFromServer) {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          if (data.products && Array.isArray(data.products)) {
            products = data.products;
            fetchedFromServer = true;
            setCached(rawCacheKey, products);
          }
        }
      } catch (e) {
        console.warn('Fetch from /api/products failed:', e);
      }
    }

    if (!fetchedFromServer) {
      products = [...SEED_PRODUCTS];
    }

    // Perform filtering synchronously on the (cached) raw list
    let filtered = [...products];

    // Filter by category slug
    if (options.categorySlug) {
      const category = SEED_CATEGORIES.find((c) => c.slug === options.categorySlug);
      if (category) {
        filtered = filtered.filter(
          (p) => p.category_id === category.id || (p.category && p.category.slug === options.categorySlug)
        );
      }
    }

    // Filter by Pure Ghee
    if (options.pureGheeOnly) {
      filtered = filtered.filter((p) => p.is_pure_ghee);
    }

    // Filter by Bestseller
    if (options.bestsellerOnly) {
      filtered = filtered.filter((p) => p.is_bestseller);
    }

    // Filter by search
    if (options.search && options.search.trim()) {
      const term = options.search.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          (p.ingredients && p.ingredients.toLowerCase().includes(term))
      );
    }

    // Sort
    if (options.sortBy) {
      if (options.sortBy === 'price-asc') {
        filtered.sort((a, b) => (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0));
      } else if (options.sortBy === 'price-desc') {
        filtered.sort((a, b) => (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0));
      } else if (options.sortBy === 'name') {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    setCached(cacheKey, filtered);
    return filtered;
  },

  async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const res = await fetch(`/api/products/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product) return data.product;
      } else if (res.status === 404) {
        return null;
      }
    } catch (e) {
      console.warn('Fetch from /api/products/:slug failed:', e);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            variants:product_variants(*),
            images:product_images(*)
          `)
          .eq('slug', slug)
          .single();

        if (!error && data) {
          const p = data as any;
          return {
            ...p,
            images: p.images ? p.images.map((img: any) => ({ ...img, image_url: img.image_url || img.url })) : []
          } as Product;
        } else if (error && error.code === 'PGRST116') {
          return null;
        }
      } catch (err) {
        console.warn('Supabase fetch product failed:', err);
      }
    }

    return null;
  },

  async getGiftHampers(): Promise<GiftHamper[]> {
    const cacheKey = 'gift_hampers';
    const cached = getCached<GiftHamper[]>(cacheKey);
    if (cached) return cached;

    let result: GiftHamper[] = [];
    try {
      const res = await fetch('/api/hampers');
      if (res.ok) {
        const data = await res.json();
        if (data.hampers && data.hampers.length > 0) {
          result = data.hampers.map((h: any) => ({
            ...h,
            items: h.items_included
              ? h.items_included.map((i: any) => ({
                  id: i.id,
                  hamper_id: h.id,
                  item_name: i.product_name,
                  item_quantity: i.variant_label,
                  display_order: 1,
                }))
              : [],
          }));
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/hampers failed, trying fallback:', e);
    }

    if (result.length === 0 && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('gift_hampers')
          .select('*, items:gift_hamper_items(*)')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          result = data as GiftHamper[];
        }
      } catch (err) {
        console.warn('Supabase fetch gift hampers failed:', err);
      }
    }
    if (result.length > 0) {
      setCached(cacheKey, result);
    }
    return result;
  },

  async getGiftHamperBySlug(slug: string): Promise<GiftHamper | null> {
    try {
      const res = await fetch(`/api/hampers/${slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.hamper) {
          const h = data.hamper;
          return {
            ...h,
            items: h.items_included
              ? h.items_included.map((i: any) => ({
                  id: i.id,
                  hamper_id: h.id,
                  item_name: i.product_name,
                  item_quantity: i.variant_label,
                  display_order: 1,
                }))
              : [],
          };
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/hampers/:slug failed:', e);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('gift_hampers')
          .select('*, items:gift_hamper_items(*)')
          .eq('slug', slug)
          .single();

        if (!error && data) {
          return data as GiftHamper;
        }
      } catch (err) {
        console.warn('Supabase fetch hamper by slug failed:', err);
      }
    }
    return null;
  },

  async getBanners(): Promise<Banner[]> {
    const cacheKey = 'banners';
    const cached = getCached<Banner[]>(cacheKey);
    if (cached) return cached;

    let result: Banner[] = [];
    try {
      const res = await fetch('/api/banners');
      if (res.ok) {
        const data = await res.json();
        if (data.banners && data.banners.length > 0) {
          result = data.banners;
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/banners failed:', e);
    }

    if (result.length === 0 && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          result = data as Banner[];
        }
      } catch (err) {
        console.warn('Supabase fetch banners failed:', err);
      }
    }
    if (result.length > 0) {
      setCached(cacheKey, result);
    }
    return result;
  },

  async getOffers(): Promise<Offer[]> {
    const cacheKey = 'offers';
    const cached = getCached<Offer[]>(cacheKey);
    if (cached) return cached;

    let result: Offer[] = [];
    try {
      const res = await fetch('/api/offers');
      if (res.ok) {
        const data = await res.json();
        if (data.offers && data.offers.length > 0) {
          result = data.offers.map((o: any) => ({
            ...o,
            code: o.coupon_code || o.code,
          }));
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/offers failed:', e);
    }

    if (result.length === 0 && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          result = data as Offer[];
        }
      } catch (err) {
        console.warn('Supabase fetch offers failed:', err);
      }
    }
    if (result.length > 0) {
      setCached(cacheKey, result);
    }
    return result;
  },

  async getStoreSettings(): Promise<StoreSettings> {
    try {
      const res = await fetch('/api/store/settings');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          return {
            id: 1,
            store_name: data.store_name || 'Saraswati Sweets',
            tagline: data.tagline || 'Pure Desi Ghee Mithai Since 1989',
            store_phone: data.store_phone || data.phone || '+91 91611 10030',
            whatsapp: data.whatsapp || '+91 91611 10030',
            store_email: data.store_email || data.email || 'order@saraswatisweets.in',
            address_text: data.address_text || data.address || 'Saraswati Sweets, Indira Market, Begum Gunj, Barabanki, Uttar Pradesh 225001',
            allowed_pincodes: data.allowed_pincodes || data.serviceable_pincodes || ['225001'],
            delivery_charge_flat: data.delivery_charge_flat || data.delivery_charge || 40,
            free_delivery_above: data.free_delivery_above || data.free_delivery_threshold || 499,
            cod_limit_amount: data.cod_limit_amount || data.cod_max_limit || 2000,
            tax_rate_percent: data.tax_rate_percent || data.tax_percent || 5,
            opening_time: data.opening_time || '06:30',
            closing_time: data.closing_time || '22:00',
            is_store_open: data.is_store_open ?? true,
          };
        }
      }
    } catch (e) {
      console.warn('Fetch store settings failed:', e);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('store_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (!error && data) {
          return data as StoreSettings;
        }
      } catch (err) {
        console.warn('Supabase fetch store settings failed:', err);
      }
    }
    throw new Error("Store settings not found");
  },

  async getReviews(productId?: string): Promise<Review[]> {
    const cacheKey = `reviews_${productId || 'global'}`;
    const cached = getCached<Review[]>(cacheKey);
    if (cached) return cached;

    let fetchedFromServer = false;
    let fetchedReviews: Review[] = [];
    const endpoint = productId ? `/api/products/${productId}/reviews` : `/api/reviews`;

    try {
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.reviews && Array.isArray(data.reviews)) {
          fetchedReviews = data.reviews.map((r: any) => ({
            id: r.id,
            product_id: r.product_id,
            customer_name: r.user_name || 'Patron',
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
          }));
          fetchedFromServer = true;
        }
      }
    } catch (e) {
      console.warn('Fetch from ' + endpoint + ' failed:', e);
    }

    if (!fetchedFromServer) {
      return [];
    }

    setCached(cacheKey, fetchedReviews);
    return fetchedReviews;
  },

  async checkReviewEligibility(productId: string, headers: Record<string, string>): Promise<{ canReview: boolean; reason?: string; alreadyReviewed?: boolean }> {
    try {
      const res = await fetch(`/api/products/${productId}/review-eligibility`, { headers });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Eligibility check error:', e);
    }
    return { canReview: false, reason: 'Please sign in to verify purchase history.' };
  },

  async submitReview(productId: string, rating: number, comment: string, headers: Record<string, string>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.message || 'Failed to submit review' };
      }
      delete memCache[`reviews_${productId}`];
      delete memCache['reviews_global'];
      return { success: true, message: data.message || 'Review submitted for approval.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error submitting review' };
    }
  },

  async submitBulkEnquiry(enquiry: BulkOrderEnquiry): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: enquiry.contact_name,
          phone: enquiry.phone,
          email: enquiry.email,
          event_type: enquiry.event_type,
          event_date: enquiry.event_date,
          estimated_guests: enquiry.estimated_guests,
          estimated_quantity_kg: enquiry.estimated_quantity_kg,
          requested_sweets: enquiry.requested_sweets,
          notes: enquiry.notes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          message: data.message || 'Enquiry submitted successfully! Our team will contact you shortly.',
        };
      }
    } catch (err) {
      console.warn('POST /api/enquiries failed, falling back:', err);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.from('bulk_order_enquiries').insert([enquiry]);
        if (error) throw error;
        return { success: true, message: 'Enquiry submitted successfully! Our team will contact you shortly.' };
      } catch (err: unknown) {
        console.error('Failed to submit enquiry to Supabase:', err);
      }
    }

    return {
      success: true,
      message: 'Enquiry received! Our team in Barabanki will reach out to ' + enquiry.phone + ' shortly.',
    };
  },
};
