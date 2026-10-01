import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const NEW_CATEGORIES = [
  { id: 'cat-dry-fruit-sweets', name: 'Dry Fruit Sweets', slug: 'dry-fruit-sweets', description: 'Premium dry fruit sweets.', image_url: '', display_order: 4, is_active: true },
  { id: 'cat-specialty-sweets', name: 'Specialty Sweets', slug: 'specialty-sweets', description: 'Specialty sweets.', image_url: '', display_order: 5, is_active: true },
  { id: 'cat-traditional-mithai', name: 'Traditional Mithai', slug: 'traditional-mithai', description: 'Traditional mithai.', image_url: '', display_order: 6, is_active: true }
];

const rawProducts = [
  { name: 'Kaju Kalash', priceKg: 1500, cat: 'cat-dry-fruit-sweets' },
  { name: 'Kaju Kesar', priceKg: 1500, cat: 'cat-dry-fruit-sweets' },
  { name: 'Pista Roll', priceKg: 2000, cat: 'cat-dry-fruit-sweets' },
  { name: 'Dry Fruit Laddoo', priceKg: 1500, cat: 'cat-dry-fruit-sweets' },
  { name: 'Badam Sugarfree', priceKg: 1500, cat: 'cat-dry-fruit-sweets', badge: 'Sugar Free' },
  { name: 'Anjeer Sugarfree', priceKg: 1600, cat: 'cat-dry-fruit-sweets', badge: 'Sugar Free' },
  { name: 'Anjeer King', priceKg: 1800, cat: 'cat-dry-fruit-sweets' },
  { name: 'Mewa Bite', priceKg: 1600, cat: 'cat-dry-fruit-sweets' },
  { name: 'Kaju Gujiya', priceKg: 1500, cat: 'cat-dry-fruit-sweets' },
  { name: 'Kaju Peda', priceKg: 1400, cat: 'cat-dry-fruit-sweets' },
  { name: 'Kaju Barfi (without Silver Leaf)', priceKg: 1400, cat: 'cat-dry-fruit-sweets' },
  
  { name: 'Choco White', priceKg: 1600, cat: 'cat-specialty-sweets' },
  { name: 'Orange White', priceKg: 1600, cat: 'cat-specialty-sweets' },
  { name: 'Baklava', priceKg: 2000, cat: 'cat-specialty-sweets' },
  
  { name: 'Chandrakala', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Batisa Barfi', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Gol Batisa', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Lal Peda', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Kesariya Peda', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Khoya Katli', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Mini Balushahi', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Mewa Laddu', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Khoya Gilori', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Doda Barfi', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Magdal', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Milk Barfi', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Mewa Motichur Laddu', priceKg: 900, cat: 'cat-traditional-mithai' },
  { name: 'Soonth Laddu', priceKg: 900, cat: 'cat-traditional-mithai' },
  { name: 'Churma Laddu', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Chocolate Biscuit', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Batisa Laddu', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Karachi Halwa', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Pinni', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Kala Jam', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Milk Cake', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Nariyal Barfi (Coconut Barfi)', priceKg: 800, cat: 'cat-traditional-mithai' },
  { name: 'Khoya Kalakand', priceKg: 800, cat: 'cat-traditional-mithai' }
];

const RAW_PRODUCTS = rawProducts.map(p => {
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const skuBase = p.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return {
    name: p.name,
    slug,
    skuBase,
    p250: p.priceKg / 4,
    p500: p.priceKg / 2,
    p1kg: p.priceKg,
    categoryId: p.cat,
    desc: `A delicious traditional sweet – ${p.name.toLowerCase()}.`,
    ingredients: '',
    shelfLife: 15,
    pureGhee: true,
    badge: p.badge || 'Traditional'
  };
});


// 1. Update src/data/seedData.ts
const seedDataPath = path.join(rootDir, 'src', 'data', 'seedData.ts');
let sdContent = fs.readFileSync(seedDataPath, 'utf8');
if (!sdContent.includes('cat-dry-fruit-sweets')) {
  const catData = NEW_CATEGORIES.map(c => `  {
    id: '${c.id}',
    name: '${c.name}',
    slug: '${c.slug}',
    description: '${c.description.replace(/'/g, "\\'")}',
    image_url: '${c.image_url}',
    display_order: ${c.display_order},
    is_active: ${c.is_active},
  },`).join('\n');
  sdContent = sdContent.replace(/(export const SEED_CATEGORIES: Category\[\] = \[[\s\S]*?)(\r?\n\];)/, `$1\n${catData}$2`);
  
  const prodData = RAW_PRODUCTS.map(p => {
    const prodId = `prod-${p.slug}`;
    return `  {
    id: '${prodId}',
    category_id: '${p.categoryId}',
    name: '${p.name.replace(/'/g, "\\'")}',
    slug: '${p.slug}',
    description: '${p.desc.replace(/'/g, "\\'")}',
    ingredients: '${p.ingredients.replace(/'/g, "\\'")}',
    shelf_life_days: ${p.shelfLife},
    is_eggless: true,
    is_pure_ghee: ${p.pureGhee},
    is_bestseller: false,
    is_featured: false,
    is_active: true,
    badge_label: '${p.badge}',
    variants: [
      { id: 'v-${p.slug}-250', product_id: '${prodId}', label: '250g', weight_grams: 250, price: ${p.p250}, mrp: ${p.p250}, sku: '${p.skuBase}-250', stock_status: 'IN_STOCK', stock_quantity: 50, display_order: 1 },
      { id: 'v-${p.slug}-500', product_id: '${prodId}', label: '500g', weight_grams: 500, price: ${p.p500}, mrp: ${p.p500}, sku: '${p.skuBase}-500', stock_status: 'IN_STOCK', stock_quantity: 50, display_order: 2 },
      { id: 'v-${p.slug}-1kg', product_id: '${prodId}', label: '1kg', weight_grams: 1000, price: ${p.p1kg}, mrp: ${p.p1kg}, sku: '${p.skuBase}-1KG', stock_status: 'IN_STOCK', stock_quantity: 50, display_order: 3 },
    ],
    images: [],
  },`;
  }).join('\n');
  sdContent = sdContent.replace(/(export const SEED_PRODUCTS: Product\[\] = \[[\s\S]*?)(\r?\n\];)/, `$1\n${prodData}$2`);
  fs.writeFileSync(seedDataPath, sdContent, 'utf8');
  console.log('Updated src/data/seedData.ts');
}

// 2. Update server/db.ts
const dbPath = path.join(rootDir, 'server', 'db.ts');
let dbContent = fs.readFileSync(dbPath, 'utf8');
if (!dbContent.includes('cat-dry-fruit-sweets')) {
  const masterVarData = RAW_PRODUCTS.map(p => {
    const prodId = `prod-${p.slug}`;
    return `  { id: 'v-${p.slug}-250', productId: '${prodId}', productName: '${p.name.replace(/'/g, "\\'")}', label: '250g', weightGrams: 250, price: ${p.p250}, mrp: ${p.p250}, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-${p.slug}-500', productId: '${prodId}', productName: '${p.name.replace(/'/g, "\\'")}', label: '500g', weightGrams: 500, price: ${p.p500}, mrp: ${p.p500}, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },
  { id: 'v-${p.slug}-1kg', productId: '${prodId}', productName: '${p.name.replace(/'/g, "\\'")}', label: '1kg', weightGrams: 1000, price: ${p.p1kg}, mrp: ${p.p1kg}, imageUrl: '', stockStatus: 'IN_STOCK', stockQuantity: 50 },`;
  }).join('\n');
  dbContent = dbContent.replace(/(export const MASTER_VARIANTS: MasterVariant\[\] = \[[\s\S]*?)(\r?\n\];)/, `$1\n${masterVarData}$2`);

  const memCatData = NEW_CATEGORIES.map(c => `    ['${c.id}', { id: '${c.id}', name: '${c.name}', slug: '${c.slug}', description: '${c.description.replace(/'/g, "\\'")}', image_url: '${c.image_url}', display_order: ${c.display_order}, is_active: ${c.is_active} }],`).join('\n');
  dbContent = dbContent.replace(/(categories: new Map<string, ServerCategory>\(\[[\s\S]*?)(\r?\n  \]\),)/, `$1\n${memCatData}$2`);

  const memProdData = RAW_PRODUCTS.map(p => {
    const prodId = `prod-${p.slug}`;
    return `    ['${prodId}', { id: '${prodId}', name: '${p.name.replace(/'/g, "\\'")}', slug: '${p.slug}', description: '${p.desc.replace(/'/g, "\\'")}', category_id: '${p.categoryId}', image_url: '', pure_ghee: ${p.pureGhee}, shelf_life_days: ${p.shelfLife}, is_active: true, ingredients: '${p.ingredients.replace(/'/g, "\\'")}' }],`;
  }).join('\n');
  dbContent = dbContent.replace(/(products: new Map<string, ServerProduct>\(\[[\s\S]*?)(\r?\n  \]\),)/, `$1\n${memProdData}$2`);
  fs.writeFileSync(dbPath, dbContent, 'utf8');
  console.log('Updated server/db.ts');
}

// 3. Update supabase/seed.sql
const sqlPath = path.join(rootDir, 'supabase', 'seed.sql');
let sqlContent = fs.readFileSync(sqlPath, 'utf8');
if (!sqlContent.includes('cat-dry-fruit-sweets')) {
  const catSql = NEW_CATEGORIES.map(c => `('${c.id}', '${c.name}', '${c.slug}', '${c.description.replace(/'/g, "''")}', '${c.image_url}', ${c.display_order}, ${c.is_active})`).join(',\n');
  sqlContent = sqlContent.replace(/(INSERT INTO categories \(id, name, slug, description, image_url, display_order, is_active\) VALUES[\s\S]*?)(\r?\nON CONFLICT)/, `$1,\n${catSql}$2`);

  const prodSql = RAW_PRODUCTS.map(p => `('prod-${p.slug}', '${p.categoryId}', '${p.name.replace(/'/g, "''")}', '${p.slug}', '${p.desc.replace(/'/g, "''")}', '${p.ingredients.replace(/'/g, "''")}', ${p.shelfLife}, true, false)`).join(',\n');
  sqlContent = sqlContent.replace(/(INSERT INTO products \(id, category_id, name, slug, description, ingredients, shelf_life_days, is_active, is_featured\) VALUES[\s\S]*?)(\r?\nON CONFLICT)/, `$1,\n${prodSql}$2`);

  const varSql = RAW_PRODUCTS.flatMap(p => [
    `('v-${p.slug}-250', 'prod-${p.slug}', '250g', 250, ${p.p250}, ${p.p250}, '${p.skuBase}-250', 'IN_STOCK', 50, 1)`,
    `('v-${p.slug}-500', 'prod-${p.slug}', '500g', 500, ${p.p500}, ${p.p500}, '${p.skuBase}-500', 'IN_STOCK', 50, 2)`,
    `('v-${p.slug}-1kg', 'prod-${p.slug}', '1kg', 1000, ${p.p1kg}, ${p.p1kg}, '${p.skuBase}-1KG', 'IN_STOCK', 50, 3)`
  ]).join(',\n');
  sqlContent = sqlContent.replace(/(INSERT INTO product_variants \(id, product_id, label, weight_grams, price, mrp, sku, stock_status, stock_quantity, display_order\) VALUES[\s\S]*?)(\r?\nON CONFLICT)/, `$1,\n${varSql}$2`);
  fs.writeFileSync(sqlPath, sqlContent, 'utf8');
  console.log('Updated supabase/seed.sql');
}
