import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NEW_CATEGORIES, RAW_PRODUCTS } from './new-products-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function appendToData(filePath, endMarker, newItemsStr) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('prod-mini-samosa')) {
    console.log(`Already added to ${filePath}`);
    return;
  }
  const parts = content.split(endMarker);
  if (parts.length < 2) throw new Error(`Marker ${endMarker} not found in ${filePath}`);
  const updatedContent = parts[0] + newItemsStr + endMarker + parts.slice(1).join(endMarker);
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log(`Updated ${filePath}`);
}

// 1. Update src/data/seedData.ts
const seedDataPath = path.join(rootDir, 'src', 'data', 'seedData.ts');
const catData = NEW_CATEGORIES.map(c => `  {
    id: '${c.id}',
    name: '${c.name}',
    slug: '${c.slug}',
    description: '${c.description.replace(/'/g, "\\'")}',
    image_url: '${c.image_url}',
    display_order: ${c.display_order},
    is_active: ${c.is_active},
  },
`).join('');
// appendToData(seedDataPath, '];\\n\\nexport const SEED_GIFT_HAMPERS', catData); // Note: we have two `];` in file, we need to append to SEED_CATEGORIES and SEED_PRODUCTS

// Wait, doing this via replace is safer:
let sdContent = fs.readFileSync(seedDataPath, 'utf8');
if (!sdContent.includes('cat-namkeen-snacks')) {
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
if (!dbContent.includes('cat-namkeen-snacks')) {
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
if (!sqlContent.includes('cat-namkeen-snacks')) {
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
