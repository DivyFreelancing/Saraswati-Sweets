import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { NEW_CATEGORIES, RAW_PRODUCTS } from './new-products-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. UPDATE src/data/seedData.ts
const seedDataPath = path.join(rootDir, 'src', 'data', 'seedData.ts');
let seedDataRaw = fs.readFileSync(seedDataPath, 'utf8');
const isCrlf = seedDataRaw.includes('\r\n');
const nl = isCrlf ? '\r\n' : '\n';
let seedDataLines = seedDataRaw.split(/\r?\n/);

// Insert categories before the end of SEED_CATEGORIES
if (!seedDataRaw.includes('cat-namkeen-snacks')) {
  const catEndIdx = seedDataLines.findIndex((line) => line.trim() === 'export const SEED_PRODUCTS: Product[] = [');
  // The line before this should be `];`
  let insertIdx = catEndIdx;
  while (insertIdx > 0 && seedDataLines[insertIdx - 1].trim() !== '];') {
    insertIdx--;
  }
  insertIdx--; // at `];`

  const newCatLines = [];
  NEW_CATEGORIES.forEach((c) => {
    newCatLines.push(`  {`);
    newCatLines.push(`    id: '${c.id}',`);
    newCatLines.push(`    name: '${c.name}',`);
    newCatLines.push(`    slug: '${c.slug}',`);
    newCatLines.push(`    description: '${c.description.replace(/'/g, "\\'")}',`);
    newCatLines.push(`    image_url: '${c.image_url}',`);
    newCatLines.push(`    display_order: ${c.display_order},`);
    newCatLines.push(`    is_active: ${c.is_active},`);
    newCatLines.push(`  },`);
  });

  seedDataLines.splice(insertIdx, 0, ...newCatLines);
}

// Insert products before the end of SEED_PRODUCTS
seedDataRaw = seedDataLines.join(nl);
if (!seedDataRaw.includes('prod-mini-samosa')) {
  seedDataLines = seedDataRaw.split(/\r?\n/);
  const prodEndIdx = seedDataLines.findIndex((line) => line.trim() === 'export const SEED_GIFT_HAMPERS: GiftHamper[] = [');
  let insertIdx = prodEndIdx;
  while (insertIdx > 0 && seedDataLines[insertIdx - 1].trim() !== '];') {
    insertIdx--;
  }
  insertIdx--; // at `];`

  const newProdLines = [];
  RAW_PRODUCTS.forEach((p) => {
    const prodId = `prod-${p.slug}`;
    const v250Id = `v-${p.slug}-250`;
    const v500Id = `v-${p.slug}-500`;
    const v1kgId = `v-${p.slug}-1kg`;

    newProdLines.push(`  {`);
    newProdLines.push(`    id: '${prodId}',`);
    newProdLines.push(`    category_id: '${p.categoryId}',`);
    newProdLines.push(`    name: '${p.name.replace(/'/g, "\\'")}',`);
    newProdLines.push(`    slug: '${p.slug}',`);
    newProdLines.push(`    description: '${p.desc.replace(/'/g, "\\'")}',`);
    newProdLines.push(`    ingredients: '${p.ingredients.replace(/'/g, "\\'")}',`);
    newProdLines.push(`    shelf_life_days: ${p.shelfLife},`);
    newProdLines.push(`    is_eggless: true,`);
    newProdLines.push(`    is_pure_ghee: ${p.pureGhee},`);
    newProdLines.push(`    is_bestseller: false,`);
    newProdLines.push(`    is_featured: false,`);
    newProdLines.push(`    is_active: true,`);
    newProdLines.push(`    badge_label: '${p.badge}',`);
    newProdLines.push(`    variants: [`);
    newProdLines.push(`      { id: '${v250Id}', product_id: '${prodId}', label: '250g', weight_grams: 250, price: ${p.p250}, mrp: ${p.p250}, sku: '${p.skuBase}-250', stock_status: 'IN_STOCK', stock_quantity: 50, display_order: 1 },`);
    newProdLines.push(`      { id: '${v500Id}', product_id: '${prodId}', label: '500g', weight_grams: 500, price: ${p.p500}, mrp: ${p.p500}, sku: '${p.skuBase}-500', stock_status: 'IN_STOCK', stock_quantity: 50, display_order: 2 },`);
    newProdLines.push(`      { id: '${v1kgId}', product_id: '${prodId}', label: '1kg', weight_grams: 1000, price: ${p.p1kg}, mrp: ${p.p1kg}, sku: '${p.skuBase}-1KG', stock_status: 'IN_STOCK', stock_quantity: 50, display_order: 3 },`);
    newProdLines.push(`    ],`);
    newProdLines.push(`    images: [],`);
    newProdLines.push(`  },`);
  });

  seedDataLines.splice(insertIdx, 0, ...newProdLines);
  seedDataRaw = seedDataLines.join(nl);
}

fs.writeFileSync(seedDataPath, seedDataRaw, 'utf8');
console.log('Updated src/data/seedData.ts successfully');

// 2. UPDATE server/db.ts
const serverDbPath = path.join(rootDir, 'server', 'db.ts');
let serverDbRaw = fs.readFileSync(serverDbPath, 'utf8');
let serverDbLines = serverDbRaw.split(/\r?\n/);

// Update categories in inMemoryStore
if (!serverDbRaw.includes('cat-namkeen-snacks')) {
  const catEndIdx = serverDbLines.findIndex((line) => line.trim() === 'products: new Map<string, ServerProduct>([');
  let insertIdx = catEndIdx;
  while (insertIdx > 0 && !serverDbLines[insertIdx - 1].includes(']),')) {
    insertIdx--;
  }
  insertIdx--; // at `]),`

  const newServerCatLines = [];
  NEW_CATEGORIES.forEach((c) => {
    newServerCatLines.push(`    [`);
    newServerCatLines.push(`      '${c.id}',`);
    newServerCatLines.push(`      {`);
    newServerCatLines.push(`        id: '${c.id}',`);
    newServerCatLines.push(`        name: '${c.name}',`);
    newServerCatLines.push(`        slug: '${c.slug}',`);
    newServerCatLines.push(`        description: '${c.description.replace(/'/g, "\\'")}',`);
    newServerCatLines.push(`        image_url: '${c.image_url}',`);
    newServerCatLines.push(`        display_order: ${c.display_order},`);
    newServerCatLines.push(`        is_active: ${c.is_active},`);
    newServerCatLines.push(`      },`);
    newServerCatLines.push(`    ],`);
  });

  serverDbLines.splice(insertIdx, 0, ...newServerCatLines);
  serverDbRaw = serverDbLines.join(nl);
}

// Update products in inMemoryStore
if (!serverDbRaw.includes('prod-mini-samosa')) {
  serverDbLines = serverDbRaw.split(/\r?\n/);
  const prodEndIdx = serverDbLines.findIndex((line) => line.trim().startsWith('variants: new Map<string, MasterVariant>'));
  let insertIdx = prodEndIdx;
  while (insertIdx > 0 && !serverDbLines[insertIdx - 1].includes(']),')) {
    insertIdx--;
  }
  insertIdx--; // at `]),`

  const newServerProdLines = [];
  RAW_PRODUCTS.forEach((p) => {
    const prodId = `prod-${p.slug}`;
    newServerProdLines.push(`    [`);
    newServerProdLines.push(`      '${prodId}',`);
    newServerProdLines.push(`      {`);
    newServerProdLines.push(`        id: '${prodId}',`);
    newServerProdLines.push(`        name: '${p.name.replace(/'/g, "\\'")}',`);
    newServerProdLines.push(`        slug: '${p.slug}',`);
    newServerProdLines.push(`        description: '${p.desc.replace(/'/g, "\\'")}',`);
    newServerProdLines.push(`        category_id: '${p.categoryId}',`);
    newServerProdLines.push(`        image_url: '',`);
    newServerProdLines.push(`        pure_ghee: ${p.pureGhee},`);
    newServerProdLines.push(`        shelf_life_days: ${p.shelfLife},`);
    newServerProdLines.push(`        is_active: true,`);
    newServerProdLines.push(`        ingredients: '${p.ingredients.replace(/'/g, "\\'")}',`);
    newServerProdLines.push(`      },`);
    newServerProdLines.push(`    ],`);
  });

  serverDbLines.splice(insertIdx, 0, ...newServerProdLines);
  serverDbRaw = serverDbLines.join(nl);
}

// Update MASTER_VARIANTS
if (!serverDbRaw.includes('v-mini-samosa-250')) {
  serverDbLines = serverDbRaw.split(/\r?\n/);
  const varEndIdx = serverDbLines.findIndex((line) => line.trim() === 'export const SERVICEABLE_PINCODES = [\'225001\', \'225002\', \'225003\', \'225122\'];');
  let insertIdx = varEndIdx;
  while (insertIdx > 0 && serverDbLines[insertIdx - 1].trim() !== '];') {
    insertIdx--;
  }
  insertIdx--; // at `];`

  const newVarLines = [];
  RAW_PRODUCTS.forEach((p) => {
    const prodId = `prod-${p.slug}`;
    newVarLines.push(`  {`);
    newVarLines.push(`    id: 'v-${p.slug}-250',`);
    newVarLines.push(`    productId: '${prodId}',`);
    newVarLines.push(`    productName: '${p.name.replace(/'/g, "\\'")}',`);
    newVarLines.push(`    label: '250g',`);
    newVarLines.push(`    weightGrams: 250,`);
    newVarLines.push(`    price: ${p.p250},`);
    newVarLines.push(`    mrp: ${p.p250},`);
    newVarLines.push(`    imageUrl: '',`);
    newVarLines.push(`    stockStatus: 'IN_STOCK',`);
    newVarLines.push(`    stockQuantity: 50,`);
    newVarLines.push(`  },`);

    newVarLines.push(`  {`);
    newVarLines.push(`    id: 'v-${p.slug}-500',`);
    newVarLines.push(`    productId: '${prodId}',`);
    newVarLines.push(`    productName: '${p.name.replace(/'/g, "\\'")}',`);
    newVarLines.push(`    label: '500g',`);
    newVarLines.push(`    weightGrams: 500,`);
    newVarLines.push(`    price: ${p.p500},`);
    newVarLines.push(`    mrp: ${p.p500},`);
    newVarLines.push(`    imageUrl: '',`);
    newVarLines.push(`    stockStatus: 'IN_STOCK',`);
    newVarLines.push(`    stockQuantity: 50,`);
    newVarLines.push(`  },`);

    newVarLines.push(`  {`);
    newVarLines.push(`    id: 'v-${p.slug}-1kg',`);
    newVarLines.push(`    productId: '${prodId}',`);
    newVarLines.push(`    productName: '${p.name.replace(/'/g, "\\'")}',`);
    newVarLines.push(`    label: '1kg',`);
    newVarLines.push(`    weightGrams: 1000,`);
    newVarLines.push(`    price: ${p.p1kg},`);
    newVarLines.push(`    mrp: ${p.p1kg},`);
    newVarLines.push(`    imageUrl: '',`);
    newVarLines.push(`    stockStatus: 'IN_STOCK',`);
    newVarLines.push(`    stockQuantity: 50,`);
    newVarLines.push(`  },`);
  });

  serverDbLines.splice(insertIdx, 0, ...newVarLines);
  serverDbRaw = serverDbLines.join(nl);
}

fs.writeFileSync(serverDbPath, serverDbRaw, 'utf8');
console.log('Updated server/db.ts successfully');
