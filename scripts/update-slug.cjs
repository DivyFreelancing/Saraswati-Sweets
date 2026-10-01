const fs = require('fs');
const path = require('path');

const publicRoutesPath = path.join(__dirname, '../server/routes/publicRoutes.ts');
let publicRoutesContent = fs.readFileSync(publicRoutesPath, 'utf8');

const newProductSlugRoute = `
router.get('/products/:slug', (req, res: Response) => {
  const { slug } = req.params;
  const p = Array.from(inMemoryStore.products.values()).find(p => p.slug === slug && p.is_active);
  if (!p) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  
  const variants = Array.from(inMemoryStore.variants.values())
    .filter(v => v.productId === p.id)
    .sort((a, b) => a.weightGrams - b.weightGrams)
    .map(v => ({
      id: v.id,
      product_id: v.productId,
      label: v.label,
      weight_grams: v.weightGrams,
      price: v.price,
      mrp: v.mrp,
      sku: v.id,
      stock_status: v.stockStatus,
      stock_quantity: v.stockQuantity,
      display_order: v.weightGrams
    }));
    
  const cat = inMemoryStore.categories.get(p.category_id);
  res.json({
    product: {
      ...p,
      variants,
      category: cat || null
    }
  });
});
`;

if (!publicRoutesContent.includes('/products/:slug\'')) {
  publicRoutesContent = publicRoutesContent.replace("router.get('/products', (_req, res: Response) => {", newProductSlugRoute + "\nrouter.get('/products', (_req, res: Response) => {");
  fs.writeFileSync(publicRoutesPath, publicRoutesContent, 'utf8');
  console.log('Updated server/routes/publicRoutes.ts with /products/:slug');
}

const catalogServicePath = path.join(__dirname, '../src/services/catalogService.ts');
let catalogServiceContent = fs.readFileSync(catalogServicePath, 'utf8');

const getProductBySlugOriginalRegex = /async getProductBySlug\(slug: string\): Promise<Product \| null> \{[\s\S]*?const found = SEED_PRODUCTS\.find\(\(p\) => p\.slug === slug\);\s*return found \|\| null;\s*\}/;

const getProductBySlugNew = `async getProductBySlug(slug: string): Promise<Product | null> {
    try {
      const res = await fetch(\`/api/products/\${slug}\`);
      if (res.ok) {
        const data = await res.json();
        if (data.product) return data.product;
      }
    } catch (e) {
      console.warn('Fetch from /api/products/:slug failed:', e);
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select(\`
            *,
            category:categories(*),
            variants:product_variants(*),
            images:product_images(*)
          \`)
          .eq('slug', slug)
          .single();

        if (!error && data) {
          return data as Product;
        }
      } catch (err) {
        console.warn('Supabase fetch product failed:', err);
      }
    }

    const found = SEED_PRODUCTS.find((p) => p.slug === slug);
    return found || null;
  }`;

if (catalogServiceContent.includes('async getProductBySlug')) {
  catalogServiceContent = catalogServiceContent.replace(getProductBySlugOriginalRegex, getProductBySlugNew);
  fs.writeFileSync(catalogServicePath, catalogServiceContent, 'utf8');
  console.log('Updated catalogService.ts with getProductBySlug');
}
