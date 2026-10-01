const fs = require('fs');
const path = require('path');

const publicRoutesPath = path.join(__dirname, '../server/routes/publicRoutes.ts');
let publicRoutesContent = fs.readFileSync(publicRoutesPath, 'utf8');

const newRoutes = `
// ==========================================================
// 0. CATALOG (PUBLIC)
// ==========================================================
router.get('/categories', (_req, res: Response) => {
  const categories = Array.from(inMemoryStore.categories.values())
    .filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  res.json({ categories });
});

router.get('/products', (_req, res: Response) => {
  const products = Array.from(inMemoryStore.products.values())
    .filter((p) => p.is_active);
    
  // Populate variants and categories
  const populatedProducts = products.map(p => {
    const variants = Array.from(inMemoryStore.variants.values())
      .filter(v => v.productId === p.id)
      .sort((a, b) => a.weightGrams - b.weightGrams);
      
    // Map MasterVariant to the shape expected by the client ProductVariant
    const mappedVariants = variants.map(v => ({
      id: v.id,
      product_id: v.productId,
      label: v.label,
      weight_grams: v.weightGrams,
      price: v.price,
      mrp: v.mrp,
      sku: v.id, // Or use actual sku if stored
      stock_status: v.stockStatus,
      stock_quantity: v.stockQuantity,
      display_order: v.weightGrams
    }));
      
    const cat = inMemoryStore.categories.get(p.category_id);
    return {
      ...p,
      variants: mappedVariants,
      category: cat || null
    };
  });
  
  res.json({ products: populatedProducts });
});
`;

if (!publicRoutesContent.includes('/products\'')) {
  publicRoutesContent = publicRoutesContent.replace('const router = Router();', 'const router = Router();\n' + newRoutes);
  fs.writeFileSync(publicRoutesPath, publicRoutesContent, 'utf8');
  console.log('Updated server/routes/publicRoutes.ts');
}
