import { inMemoryStore } from '../db';

let hasLoggedConfigWarning = false;

/**
 * Resolves the canonical base website URL strictly from environment configuration.
 * Prioritizes PUBLIC_SITE_URL.
 * In production: if PUBLIC_SITE_URL is missing, empty, or contains localhost, logs a loud
 * error and returns empty string so that canonical and og:url tags are suppressed.
 */
export function getBaseSiteUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
  const rawPublicUrl = (process.env.PUBLIC_SITE_URL || '').trim();

  if (isProduction) {
    const isMissingOrLocalhost =
      !rawPublicUrl ||
      rawPublicUrl.includes('localhost') ||
      rawPublicUrl.includes('127.0.0.1');

    if (isMissingOrLocalhost) {
      if (!hasLoggedConfigWarning) {
        hasLoggedConfigWarning = true;
        console.error('****************************************************************');
        console.error('[SEO CRITICAL CONFIG ERROR] PUBLIC_SITE_URL is missing, empty, or contains localhost in production!');
        console.error('Canonical tags, og:url, og:image, twitter:image, and sitemap loc will be suppressed.');
        console.error('Set PUBLIC_SITE_URL=https://saraswatisweetsbarabanki.com in environment variables.');
        console.error('****************************************************************');
      }
      return '';
    }

    const clean = rawPublicUrl.replace(/\/$/, '');
    return clean.startsWith('http://') || clean.startsWith('https://') ? clean : `https://${clean}`;
  }

  // Development fallback
  const rawUrl = (
    rawPublicUrl ||
    process.env.APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`
  ).trim().replace(/\/$/, '');

  return rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `http://${rawUrl}`;
}

/**
 * Generates the robots.txt content with strict permissions and dynamic sitemap link
 */
export function generateRobotsTxt(siteUrl?: string): string {
  const baseUrl = (siteUrl || getBaseSiteUrl()).replace(/\/$/, '');
  const lines = [
    '# Robots.txt for Saraswati Sweets (Barabanki)',
    ...(baseUrl ? [`# Production Website: ${baseUrl}/`] : []),
    '',
    'User-agent: *',
    '# Disallow private, administrative, and checkout transaction paths',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /orders',
    'Disallow: /orders/',
    'Disallow: /order-confirmation',
    'Disallow: /order-confirmation/',
    'Disallow: /profile',
    'Disallow: /api/',
    'Allow: /',
    '',
  ];

  if (baseUrl) {
    lines.push(`Sitemap: ${baseUrl}/sitemap.xml`, '');
  }

  return lines.join('\n');
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

// In-memory cache for sitemap.xml with 1 hour TTL (3,600,000 ms)
interface SitemapCache {
  xml: string;
  generatedAt: number;
  siteUrl: string;
}

let cachedSitemap: SitemapCache | null = null;
const SITEMAP_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Generates sitemap.xml dynamically from current store catalog, cached for 1 hour.
 */
export function generateSitemapXml(siteUrl?: string, forceRefresh = false): string {
  const baseUrl = (siteUrl || getBaseSiteUrl()).replace(/\/$/, '');
  const now = Date.now();

  if (!baseUrl) {
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
  }

  if (!forceRefresh && cachedSitemap && (now - cachedSitemap.generatedAt < SITEMAP_CACHE_TTL_MS) && cachedSitemap.siteUrl === baseUrl) {
    return cachedSitemap.xml;
  }

  const urls: Array<{ loc: string; lastmod?: string | null }> = [];
  const seenUrls = new Set<string>();

  const addUrl = (path: string, lastmod?: string | null) => {
    const loc = `${baseUrl}${path}`;
    if (seenUrls.has(loc)) return;
    seenUrls.add(loc);
    urls.push({ loc, lastmod: formatDate(lastmod) });
  };

  // 1. Core Public Landing & Legal Policy Pages
  addUrl('/', null);
  addUrl('/catalog', null);
  addUrl('/categories', null);
  addUrl('/hampers', null);
  addUrl('/offers', null);
  addUrl('/bulk-enquiry', null);
  addUrl('/contact', null);
  addUrl('/certifications', null);
  addUrl('/terms', null);
  addUrl('/shipping-policy', null);
  addUrl('/refund-policy', null);
  addUrl('/privacy-policy', null);

  // 2. Active Public Categories (excluding inactive or soft-deleted)
  const categories = Array.from(inMemoryStore.categories.values())
    .filter((c: any) => Boolean(c.is_active) && !c.deleted_at && c.slug)
    .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

  for (const cat of categories) {
    const catDate = (cat as any).updated_at || (cat as any).created_at;
    addUrl(`/categories/${cat.slug}`, catDate);
  }

  // 3. Active Public Products (excluding inactive or soft-deleted)
  const products = Array.from(inMemoryStore.products.values())
    .filter((p: any) => Boolean(p.is_active) && !p.deleted_at && p.slug)
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

  const resultXml = xmlLines.join('\n');
  cachedSitemap = {
    xml: resultXml,
    generatedAt: now,
    siteUrl: baseUrl,
  };

  return resultXml;
}
