const fs = require('fs');
const crypto = require('crypto');

const namkeenProducts = [
  { name: 'Mini Samosa', basePrice: 680 },
  { name: 'Mini Khasta', basePrice: 680 },
  { name: 'Plain Mathri', basePrice: 680 },
  { name: 'Achari Mathri', basePrice: 720 },
  { name: 'Achari Samosa', basePrice: 760 },
  { name: 'Mewa Samosa', basePrice: 760 },
  { name: 'Masoor Dalmoth', basePrice: 800 },
  { name: 'Pudina Mixture', basePrice: 900 },
  { name: 'Kaju Dalmoth', basePrice: 1200 },
  { name: 'Sev (Besan)', basePrice: 600 },
  { name: 'Ganthe', basePrice: 600 }
];

const categoryId = crypto.randomUUID();
const category = {
  id: categoryId,
  name: 'Namkeen & Snacks',
  slug: 'namkeen-snacks',
  description: 'A crisp, savory selection of traditional namkeen and snacks.',
  tag: 'namkeen',
  display_order: 4
};

const products = [];
const variants = [];

namkeenProducts.forEach((p, idx) => {
  const productId = crypto.randomUUID();
  const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const description = `A classic, crispy savory snack – ${p.name.toLowerCase()}.`;

  products.push({
    id: productId,
    category_id: categoryId,
    name: p.name,
    slug: slug,
    description: description,
    ingredients: '',
    shelf_life_days: 30,
    is_active: true,
    is_featured: false,
    rating: 0,
    reviews_count: 0
  });

  const generateSku = (baseName, weightStr) => {
    return baseName.toUpperCase().replace(/[^A-Z0-9]+/g, '-') + '-' + weightStr;
  };
  
  const baseSku = p.name.replace(/\(.*\)/g, '').trim();

  // 250g
  variants.push({
    id: crypto.randomUUID(),
    product_id: productId,
    weight_g: 250,
    price: p.basePrice / 4,
    sku: generateSku(baseSku, '250'),
    stock_status: 'IN_STOCK'
  });
  // 500g
  variants.push({
    id: crypto.randomUUID(),
    product_id: productId,
    weight_g: 500,
    price: p.basePrice / 2,
    sku: generateSku(baseSku, '500'),
    stock_status: 'IN_STOCK'
  });
  // 1kg
  variants.push({
    id: crypto.randomUUID(),
    product_id: productId,
    weight_g: 1000,
    price: p.basePrice,
    sku: generateSku(baseSku, '1KG'),
    stock_status: 'IN_STOCK'
  });
});

console.log('// --- CATEGORY ---');
console.log(JSON.stringify(category, null, 2) + ',');

console.log('\n// --- PRODUCTS ---');
products.forEach(p => console.log(JSON.stringify(p, null, 2) + ','));

console.log('\n// --- VARIANTS ---');
variants.forEach(v => console.log(JSON.stringify(v, null, 2) + ','));
