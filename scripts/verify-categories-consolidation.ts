import assert from 'node:assert';
import { inMemoryStore, loadStoreState } from '../server/db';

async function main() {
  console.log('--- Loading store state ---');
  await loadStoreState();

  const categories = Array.from(inMemoryStore.categories.values())
    .filter((c: any) => c.is_active !== false)
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

  console.log('Active categories count:', categories.length);
  assert.strictEqual(categories.length, 5, 'Must have exactly 5 active categories');

  const expectedNames = ['Meva', 'Bengali', 'Ghee', 'Khoya', 'Namkeen'];
  const names = categories.map((c: any) => c.name);
  console.log('Category names:', names);
  assert.deepStrictEqual(names, expectedNames, 'Categories must match canonical 5 in order');

  const products = Array.from(inMemoryStore.products.values());
  console.log('Total products count:', products.length);

  const activeCategoryIds = new Set(categories.map((c: any) => c.id));
  let unassignedCount = 0;
  let inactiveCategoryCount = 0;

  for (const p of products) {
    if (!p.category_id) {
      unassignedCount++;
    } else if (!activeCategoryIds.has(p.category_id)) {
      inactiveCategoryCount++;
      console.log('Product in inactive category:', p.name, p.category_id);
    }
  }

  assert.strictEqual(unassignedCount, 0, 'No products should have missing category_id');
  assert.strictEqual(inactiveCategoryCount, 0, 'No products should be assigned to inactive categories');

  console.log('\n--- Breakdown by category ---');
  for (const cat of categories) {
    const count = products.filter((p: any) => p.category_id === cat.id).length;
    console.log(`  ${cat.name} (${cat.slug}): ${count} products`);
    assert(count > 0, `Category ${cat.name} must have at least one product`);
  }

  console.log('\n✓ All 5 canonical categories verified with 0 unassigned and 0 inactive-assigned products!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
