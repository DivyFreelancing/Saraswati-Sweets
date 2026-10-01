const fs = require('fs');
const path = require('path');

const catalogServicePath = path.join(__dirname, '../src/services/catalogService.ts');
let content = fs.readFileSync(catalogServicePath, 'utf8');

// Replace getCategories
const getCategoriesOriginal = `  async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as Category[];
        }
      } catch (err) {
        console.warn('Supabase fetch categories failed, using fallback:', err);
      }
    }
    return SEED_CATEGORIES.filter((c) => c.is_active);
  },`;

const getCategoriesNew = `  async getCategories(): Promise<Category[]> {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories && data.categories.length > 0) return data.categories;
      }
    } catch (e) {
      console.warn('Fetch from /api/categories failed:', e);
    }
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as Category[];
        }
      } catch (err) {
        console.warn('Supabase fetch categories failed, using fallback:', err);
      }
    }
    return SEED_CATEGORIES.filter((c) => c.is_active);
  },`;

if (content.includes('async getCategories()')) {
  content = content.replace(getCategoriesOriginal, getCategoriesNew);
}

// Replace getProducts
const getProductsRegex = /async getProducts\(options: CatalogFilterOptions = \{\}\): Promise<Product\[\]> \{[\s\S]*?if \(products\.length === 0\) \{\s*products = \[\.\.\.SEED_PRODUCTS\];\s*\}/;

const getProductsNew = `async getProducts(options: CatalogFilterOptions = {}): Promise<Product[]> {
    let products: Product[] = [];

    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        if (data.products && data.products.length > 0) {
          products = data.products;
          if (options.bestsellerOnly) products = products.filter(p => p.is_bestseller);
          if (options.pureGheeOnly) products = products.filter(p => p.is_pure_ghee);
        }
      }
    } catch (e) {
      console.warn('Fetch from /api/products failed:', e);
    }

    if (products.length === 0 && isSupabaseConfigured() && supabase) {
      try {
        let query = supabase
          .from('products')
          .select(\`
            *,
            category:categories(*),
            variants:product_variants(*),
            images:product_images(*)
          \`)
          .eq('is_active', true)
          .is('deleted_at', null);

        if (options.bestsellerOnly) {
          query = query.eq('is_bestseller', true);
        }

        if (options.pureGheeOnly) {
          query = query.eq('is_pure_ghee', true);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          products = data as Product[];
        }
      } catch (err) {
        console.warn('Supabase fetch products failed, using fallback:', err);
      }
    }

    if (products.length === 0) {
      products = [...SEED_PRODUCTS];
      if (options.bestsellerOnly) products = products.filter(p => p.is_bestseller);
      if (options.pureGheeOnly) products = products.filter(p => p.is_pure_ghee);
    }`;

content = content.replace(getProductsRegex, getProductsNew);

fs.writeFileSync(catalogServicePath, content, 'utf8');
console.log('Updated catalogService.ts');
