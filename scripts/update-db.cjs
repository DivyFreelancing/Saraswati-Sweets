const fs = require('fs');
const path = require('path');

const srcDataPath = path.join(__dirname, '../src/data/seedData.ts');
const serverDbPath = path.join(__dirname, '../server/db.ts');
const supabaseSeedPath = path.join(__dirname, '../supabase/seed.sql');

const generatedPath = path.join(__dirname, 'namkeen-output-utf8.txt');
const generatedContent = fs.readFileSync(generatedPath, 'utf8').replace(/\r\n/g, '\n');

// Parse generated content
const categoryStr = generatedContent.match(/\/\/ --- CATEGORY ---\n([\s\S]*?)\n\/\/ --- PRODUCTS ---/)[1].trim().replace(/,$/, '');
const productsStr = generatedContent.match(/\/\/ --- PRODUCTS ---\n([\s\S]*?)\n\/\/ --- VARIANTS ---/)[1].trim().replace(/,$/, '');
const variantsStr = generatedContent.match(/\/\/ --- VARIANTS ---\n([\s\S]*)$/)[1].trim().replace(/,$/, '');

const categoryObj = JSON.parse(categoryStr);
const productsArr = JSON.parse('[' + productsStr + ']');
const variantsArr = JSON.parse('[' + variantsStr + ']');

// 1. Update src/data/seedData.ts
let seedData = fs.readFileSync(srcDataPath, 'utf8');
seedData = seedData.replace(/(export const categories: Category\[\] = \[[\s\S]*?)(\r?\n\];)/, `$1,\n  ${JSON.stringify(categoryObj, null, 2).replace(/\n/g, '\n  ')}$2`);
seedData = seedData.replace(/(export const products: Product\[\] = \[[\s\S]*?)(\r?\n\];)/, `$1,\n  ${productsArr.map(p => JSON.stringify(p, null, 2)).join(',\n  ').replace(/\n/g, '\n  ')}$2`);
seedData = seedData.replace(/(export const variants: ProductVariant\[\] = \[[\s\S]*?)(\r?\n\];)/, `$1,\n  ${variantsArr.map(v => JSON.stringify(v, null, 2)).join(',\n  ').replace(/\n/g, '\n  ')}$2`);
fs.writeFileSync(srcDataPath, seedData);
console.log('Updated src/data/seedData.ts');

// 2. Update server/db.ts
let dbData = fs.readFileSync(serverDbPath, 'utf8');
dbData = dbData.replace(/(export const categories = \[[\s\S]*?)(\r?\n\];)/, `$1,\n  ${JSON.stringify(categoryObj, null, 2).replace(/\n/g, '\n  ')}$2`);
dbData = dbData.replace(/(export const products = \[[\s\S]*?)(\r?\n\];)/, `$1,\n  ${productsArr.map(p => JSON.stringify(p, null, 2)).join(',\n  ').replace(/\n/g, '\n  ')}$2`);
dbData = dbData.replace(/(export const variants = \[[\s\S]*?)(\r?\n\];)/, `$1,\n  ${variantsArr.map(v => JSON.stringify(v, null, 2)).join(',\n  ').replace(/\n/g, '\n  ')}$2`);
fs.writeFileSync(serverDbPath, dbData);
console.log('Updated server/db.ts');

// 3. Update supabase/seed.sql
function escapeSql(str) {
  if (typeof str === 'boolean') return str ? 'true' : 'false';
  if (typeof str === 'number') return str;
  if (!str) return "''";
  return "'" + str.replace(/'/g, "''") + "'";
}

const catSql = `('${categoryObj.id}', ${escapeSql(categoryObj.name)}, ${escapeSql(categoryObj.slug)}, ${escapeSql(categoryObj.description)}, ${escapeSql(categoryObj.tag)}, ${categoryObj.display_order})`;
let seedSql = fs.readFileSync(supabaseSeedPath, 'utf8');
seedSql = seedSql.replace(/(INSERT INTO categories \(id, name, slug, description, tag, display_order\) VALUES[\s\S]*?)(\r?\nON CONFLICT)/, `$1,\n${catSql}$2`);

const prodSqlRows = productsArr.map(p => `('${p.id}', '${p.category_id}', ${escapeSql(p.name)}, ${escapeSql(p.slug)}, ${escapeSql(p.description)}, ${escapeSql(p.ingredients)}, ${p.shelf_life_days}, ${p.is_active}, ${p.is_featured})`).join(',\n');
seedSql = seedSql.replace(/(INSERT INTO products \(id, category_id, name, slug, description, ingredients, shelf_life_days, is_active, is_featured\) VALUES[\s\S]*?)(\r?\nON CONFLICT)/, `$1,\n${prodSqlRows}$2`);

const varSqlRows = variantsArr.map(v => `('${v.id}', '${v.product_id}', ${v.weight_g}, ${v.price}, ${escapeSql(v.sku)}, '${v.stock_status}')`).join(',\n');
seedSql = seedSql.replace(/(INSERT INTO product_variants \(id, product_id, weight_g, price, sku, stock_status\) VALUES[\s\S]*?)(\r?\nON CONFLICT)/, `$1,\n${varSqlRows}$2`);
fs.writeFileSync(supabaseSeedPath, seedSql);
console.log('Updated supabase/seed.sql');
