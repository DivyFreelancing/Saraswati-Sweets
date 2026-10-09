import { inMemoryStore } from '../db';

export const SITE_DOMAIN = 'https://saraswatisweetsbarabanki.com';

/**
 * Generates the robots.txt content with proper permissions and sitemap link
 */
export function generateRobotsTxt(): string {
  return [
    '# Robots.txt for Saraswati Sweets (Barabanki)',
    `# Production Website: ${SITE_DOMAIN}/`,
    '',
    'User-agent: *',
    'Allow: /',
    'Allow: /images/',
    'Allow: /assets/',
    'Allow: /icon.svg',
    'Allow: /apple-touch-icon.png',
    '',
    '# Disallow private, administrative, and checkout transaction paths',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /orders',
    'Disallow: /orders/',
    'Disallow: /order-confirmation/',
    'Disallow: /profile',
    'Disallow: /api/',
    '',
    `Sitemap: ${SITE_DOMAIN}/sitemap.xml`,
    '',
  ].join('\n');
}

/**
 * Format timestamp to W3C Datetime / ISO date (YYYY-MM-DD)
 */
function formatDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Generates sitemap.xml dynamically from current store catalog
 */
export function generateSitemapXml(): string {
  const urls: Array<{ loc: string; lastmod?: string | null }> = [];
  const seenUrls = new Set<string>();

  const addUrl = (path: string, lastmod?: string | null) => {
    const loc = `${SITE_DOMAIN}${path}`;
    if (seenUrls.has(loc)) return;
    seenUrls.add(loc);
    urls.push({ loc, lastmod: formatDate(lastmod) });
  };

  // 1. Core Public Landing Pages
  addUrl('/', null);
  addUrl('/catalog', null);
  addUrl('/categories', null);
  addUrl('/hampers', null);
  addUrl('/bulk-enquiry', null);
  addUrl('/contact', null);

  // 2. Active Public Categories
  const categories = Array.from(inMemoryStore.categories.values())
    .filter((c: any) => c.is_active && c.slug)
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

  for (const cat of categories) {
    const catDate = (cat as any).updated_at || (cat as any).created_at;
    addUrl(`/categories/${cat.slug}`, catDate);
  }

  // 3. Active Public Products
  const products = Array.from(inMemoryStore.products.values())
    .filter((p: any) => p.is_active && p.slug)
    .sort((a: any, b: any) => a.slug.localeCompare(b.slug));

  for (const prod of products) {
    const prodDate = (prod as any).updated_at || (prod as any).created_at;
    addUrl(`/products/${prod.slug}`, prodDate);
  }

  // Build standard XML
  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of urls) {
    xmlLines.push('  <url>');
    xmlLines.push(`    <loc>${escapeXml(entry.loc)}</loc>`);
    if (entry.lastmod) {
      xmlLines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    }
    xmlLines.push('  </url>');
  }

  xmlLines.push('</urlset>');
  xmlLines.push('');

  return xmlLines.join('\n');
}
