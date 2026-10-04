import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://pdovuxqbymgqzvaxcwuk.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectCategories() {
  const { data: cats, error: e1 } = await supabase.from('categories').select('*');
  const { data: prods, error: e2 } = await supabase.from('products').select('id, name, category_id');
  
  if (e1 || e2) {
    console.error('Error fetching data:', e1 || e2);
    return;
  }
  
  console.log('--- ALL CATEGORIES ---');
  cats.forEach(c => {
    const pCount = prods.filter(p => p.category_id === c.id).length;
    console.log(`- ${c.name} (ID: ${c.id}) -> ${pCount} products`);
  });

  const catIds = new Set(cats.map(c => c.id));
  const orphans = prods.filter(p => !catIds.has(p.category_id));
  console.log('\n--- ORPHANED PRODUCTS ---');
  console.log(`Found ${orphans.length} products with missing category IDs.`);
  orphans.forEach(o => console.log(`- ${o.name} (Cat ID: ${o.category_id})`));
}
inspectCategories();
