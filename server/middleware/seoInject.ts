import express from 'express';
import fs from 'fs';
import path from 'path';
import { inMemoryStore, isStoreLoaded } from '../db';
import { getBaseSiteUrl } from '../services/seoService';
import {
  ROUTE_ALIASES,
  isPrivatePath,
  StaticPublicRoute,
} from '../../src/config/routes';

/**
 * Escapes characters for safe inclusion in HTML attribute values and text content.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Serializes an object to JSON-LD safely preventing script injection (< escaped as \u003c).
 */
export function escapeJsonLd(obj: any): string {
  return JSON.stringify(obj, null, 2).replace(/</g, '\\u003c');
}

export interface RouteSeoMeta {
  title: string;
  description: string;
  canonicalPath?: string;
  ogType?: string;
  ogImage?: string;
}

/**
 * Hand-written, brand-consistent metadata for all public static pages.
 * Verified against brand facts: Indira Market, Barabanki, UP, since 1989, 100% cow desi ghee.
 */
export const STATIC_ROUTE_METADATA: Record<string, RouteSeoMeta> = {
  '/': {
    title: 'Saraswati Sweets - Pure Desi Ghee Mithai & Namkeen Since 1989 | Barabanki',
    description: 'Authentic pure cow desi ghee mithai, artisanal namkeen, and festive gift hampers from Saraswati Sweets in Barabanki, UP. Doorstep delivery & counter takeaway.',
    canonicalPath: '/',
    ogType: 'website',
  },
  '/catalog': {
    title: 'All Sweets & Namkeen Catalog | Saraswati Sweets Barabanki',
    description: 'Browse fresh handcrafted Indian mithai, mawa peda, pure desi ghee motichoor ladoo, kaju katli, and crispy savory namkeen prepared daily in Barabanki.',
    canonicalPath: '/catalog',
    ogType: 'website',
  },
  '/categories': {
    title: 'Mithai & Namkeen Collections | Saraswati Sweets Barabanki',
    description: 'Explore our collections of traditional Awadhi sweets, pure desi ghee ladoos, dry fruit mithai, festive gift hampers, and savory namkeen.',
    canonicalPath: '/categories',
    ogType: 'website',
  },
  '/hampers': {
    title: 'Festive & Wedding Gift Hampers | Saraswati Sweets Barabanki',
    description: 'Curated luxury gift hampers and celebratory sweet boxes wrapped in royal packaging for weddings, corporate gifting, and auspicious festivals in Barabanki.',
    canonicalPath: '/hampers',
    ogType: 'website',
  },
  '/offers': {
    title: 'Festive Sweet Offers & Seasonal Sweets | Saraswati Sweets Barabanki',
    description: 'Discover seasonal specials and festive sweet collections prepared fresh in 100% cow desi ghee at Saraswati Sweets Barabanki.',
    canonicalPath: '/',
    ogType: 'website',
  },
  '/bulk-enquiry': {
    title: 'Bulk & Corporate Mithai Orders | Saraswati Sweets Barabanki',
    description: 'Place bulk sweet orders for weddings, family celebrations and corporate events. Custom packaging and scheduled delivery from Saraswati Sweets, Barabanki.',
    canonicalPath: '/bulk-enquiry',
    ogType: 'website',
  },
  '/contact': {
    title: 'Visit Our Counter & Contact Us | Saraswati Sweets Barabanki',
    description: 'Visit our flagship store at Indira Market, Near Chaya Chauraha, Barabanki. Open daily 6:30 AM to 10:00 PM. Call +91 91611 10030 for fresh sweet orders.',
    canonicalPath: '/contact',
    ogType: 'business.business',
  },
  '/certifications': {
    title: 'Heritage & Food Safety Certifications | Saraswati Sweets Barabanki',
    description: 'Serving Barabanki since 1989. View our FSSAI food safety licence and state programme certificates.',
    canonicalPath: '/certifications',
    ogType: 'website',
  },
  '/terms': {
    title: 'Terms of Service | Saraswati Sweets Barabanki',
    description: 'Read our terms of service governing online ordering, doorstep delivery, store takeaway pickup, and customer accounts for Saraswati Sweets in Barabanki.',
    canonicalPath: '/terms',
    ogType: 'website',
  },
  '/shipping-policy': {
    title: 'Shipping & Delivery Policy | Saraswati Sweets Barabanki',
    description: 'Delivery guidelines, serviceable Barabanki PIN codes (225001, 225002, 225003, 225122), dispatch schedules, packaging standards, and delivery fee thresholds.',
    canonicalPath: '/shipping-policy',
    ogType: 'website',
  },
  '/refund-policy': {
    title: 'Cancellation & Refund Policy | Saraswati Sweets Barabanki',
    description: 'Cancellation, replacement and refund terms for orders from Saraswati Sweets, Barabanki.',
    canonicalPath: '/refund-policy',
    ogType: 'website',
  },
  '/privacy-policy': {
    title: 'Privacy Policy & DPDP Notice | Saraswati Sweets Barabanki',
    description: 'How Saraswati Sweets protects your personal information, mobile OTP authentication, delivery addresses, and payment data under the Digital Personal Data Protection Act.',
    canonicalPath: '/privacy-policy',
    ogType: 'website',
  },
};

// Aliases mapped to canonical definitions from shared routes config
for (const [alias, target] of Object.entries(ROUTE_ALIASES)) {
  if (STATIC_ROUTE_METADATA[target]) {
    STATIC_ROUTE_METADATA[alias] = STATIC_ROUTE_METADATA[target];
  }
}

/**
 * Returns true if the path is a private, customer-account, or checkout transaction path.
 */
export function isPrivateRoute(pathname: string): boolean {
  return isPrivatePath(pathname);
}

/**
 * Resolves default social share image (1200x630 real photo from catalog).
 * Checks for dedicated og-share.jpg in public/images, otherwise falls back to gift-hamper-banner.jpg.
 */
export function getDefaultShareImage(siteUrl: string): string {
  const ogSharePath = path.resolve(process.cwd(), 'public', 'images', 'og-share.jpg');
  const imagePath = fs.existsSync(ogSharePath) ? '/images/og-share.jpg' : '/images/gift-hamper-banner.jpg';
  return siteUrl ? `${siteUrl}${imagePath}` : imagePath;
}

/**
 * Resolves absolute URL for any relative or absolute image path.
 */
export function toAbsoluteImageUrl(imgUrl: string | undefined | null, siteUrl: string): string {
  if (!imgUrl) return getDefaultShareImage(siteUrl);
  if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) return imgUrl;
  const cleanPath = imgUrl.startsWith('/') ? imgUrl : `/${imgUrl}`;
  return siteUrl ? `${siteUrl}${cleanPath}` : cleanPath;
}

/**
 * Injects SEO tags, canonical URL, OpenGraph, Twitter Cards, and JSON-LD schema into index.html
 */
export function injectSeoIntoHtml(
  htmlTemplate: string,
  options: {
    siteUrl: string;
    pathname: string;
    meta: RouteSeoMeta;
    isNotFound?: boolean;
    isPrivate?: boolean;
    productSchema?: any;
    catalogChunk?: string | null;
  }
): string {
  const { siteUrl, pathname, meta, isNotFound, isPrivate, productSchema, catalogChunk } = options;
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
  const hasValidSiteUrl = Boolean(siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1'));
  const shouldInjectUrl = hasValidSiteUrl || !isProduction;

  const canonicalUrl = shouldInjectUrl && siteUrl ? `${siteUrl}${meta.canonicalPath || pathname}` : '';
  const ogImageUrl = meta.ogImage || (shouldInjectUrl && siteUrl ? getDefaultShareImage(siteUrl) : '');

  let html = htmlTemplate;

  // 1. Replace <title>
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);

  // 2. Replace meta description
  if (html.includes('<meta name="description"')) {
    html = html.replace(
      /<meta name="description" content=".*?"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(meta.description)}" />`
    );
  } else {
    html = html.replace(
      '</head>',
      `  <meta name="description" content="${escapeHtml(meta.description)}" />\n</head>`
    );
  }

  // 3. Replace or inject canonical link (never include query parameters, suppress if invalid in prod)
  if (shouldInjectUrl && canonicalUrl) {
    if (html.includes('<link rel="canonical"')) {
      html = html.replace(
        /<link rel="canonical" href=".*?"\s*\/?>/i,
        `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`
      );
    } else {
      html = html.replace(
        '</head>',
        `  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n</head>`
      );
    }
  } else {
    html = html.replace(/<link rel="canonical" href=".*?"\s*\/?>\n?/i, '');
  }

  // 4. OpenGraph and Twitter tags
  if (html.includes('<meta property="og:title"')) {
    html = html.replace(
      /<meta property="og:title" content=".*?"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(meta.title)}" />`
    );
  }
  if (html.includes('<meta property="og:description"')) {
    html = html.replace(
      /<meta property="og:description" content=".*?"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(meta.description)}" />`
    );
  }
  if (shouldInjectUrl && canonicalUrl) {
    if (html.includes('<meta property="og:url"')) {
      html = html.replace(
        /<meta property="og:url" content=".*?"\s*\/?>/i,
        `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
      );
    }
  } else {
    html = html.replace(/<meta property="og:url" content=".*?"\s*\/?>\n?/i, '');
  }
  if (html.includes('<meta property="og:type"')) {
    html = html.replace(
      /<meta property="og:type" content=".*?"\s*\/?>/i,
      `<meta property="og:type" content="${escapeHtml(meta.ogType || 'website')}" />`
    );
  }

  // Inject og:image and twitter tags
  const tagsToInject: string[] = [];
  if (shouldInjectUrl && ogImageUrl) {
    if (!html.includes('<meta property="og:image"')) {
      tagsToInject.push(`  <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`);
    } else {
      html = html.replace(
        /<meta property="og:image" content=".*?"\s*\/?>/i,
        `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />`
      );
    }
  } else {
    html = html.replace(/<meta property="og:image" content=".*?"\s*\/?>\n?/i, '');
  }

  if (!html.includes('<meta name="twitter:title"')) {
    tagsToInject.push(`  <meta name="twitter:title" content="${escapeHtml(meta.title)}" />`);
  } else {
    html = html.replace(
      /<meta name="twitter:title" content=".*?"\s*\/?>/i,
      `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`
    );
  }

  if (!html.includes('<meta name="twitter:description"')) {
    tagsToInject.push(`  <meta name="twitter:description" content="${escapeHtml(meta.description)}" />`);
  } else {
    html = html.replace(
      /<meta name="twitter:description" content=".*?"\s*\/?>/i,
      `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`
    );
  }

  if (shouldInjectUrl && ogImageUrl) {
    if (!html.includes('<meta name="twitter:image"')) {
      tagsToInject.push(`  <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`);
    } else {
      html = html.replace(
        /<meta name="twitter:image" content=".*?"\s*\/?>/i,
        `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />`
      );
    }
  } else {
    html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/?>\n?/i, '');
  }

  // 5. Robots meta tag for private or 404 routes
  if (isPrivate || isNotFound) {
    if (!html.includes('<meta name="robots"')) {
      tagsToInject.push('  <meta name="robots" content="noindex, nofollow" />');
    }
  }

  // 6. Product JSON-LD schema (strictly real data, zero aggregateRating, zero reviews)
  if (productSchema) {
    tagsToInject.push(`  <script type="application/ld+json">\n${escapeJsonLd(productSchema)}\n  </script>`);
  }

  // 7. Route-specific preloads: Preload hero carousel image strictly on homepage, avoiding wasteful downloads on /catalog
  if (pathname === '/') {
    tagsToInject.push('  <link rel="preload" as="image" href="/images/1-mobile.webp" media="(max-width: 640px)" type="image/webp" fetchpriority="high" />');
    tagsToInject.push('  <link rel="preload" as="image" href="/images/1.webp" media="(min-width: 641px)" type="image/webp" fetchpriority="high" />');
  } else if (pathname === '/catalog' && catalogChunk) {
    tagsToInject.push(`  <link rel="modulepreload" crossorigin href="/assets/${catalogChunk}" />`);
  }

  if (tagsToInject.length > 0) {
    html = html.replace('</head>', `${tagsToInject.join('\n')}\n</head>`);
  }

  // 7. Align canonical LocalBusiness schema url and image with siteUrl if valid
  if (shouldInjectUrl && siteUrl) {
    html = html.replace(
      /"url":\s*"https:\/\/saraswatisweetsbarabanki\.com\/"/g,
      `"url": "${siteUrl}/"`
    );
    html = html.replace(
      /"image":\s*"https:\/\/saraswatisweetsbarabanki\.com\/images\/gift-hamper-banner\.jpg"/g,
      `"image": "${getDefaultShareImage(siteUrl)}"`
    );
  }

  return html;
}

/**
 * Creates an Express middleware for server-side meta injection and 404 handling.
 */
export function createSeoInjectMiddleware(distDir: string) {
  const distIndexHtml = path.resolve(distDir, 'index.html');
  let cachedTemplate: string | null = null;

  // Read index.html template once at startup
  try {
    if (fs.existsSync(distIndexHtml)) {
      cachedTemplate = fs.readFileSync(distIndexHtml, 'utf8');
    } else {
      const rootIndex = path.resolve(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndex)) {
        cachedTemplate = fs.readFileSync(rootIndex, 'utf8');
      }
    }
  } catch (err) {
    console.error('[SeoInject] Failed to read index.html template at startup:', err);
  }

  let catalogChunk: string | null = null;
  const findCatalogChunk = (): string | null => {
    if (catalogChunk) return catalogChunk;
    try {
      const assetsDir = path.resolve(distDir, 'assets');
      if (fs.existsSync(assetsDir)) {
        const files = fs.readdirSync(assetsDir);
        const match = files.find((f) => f.startsWith('CatalogPage-') && f.endsWith('.js'));
        if (match) {
          catalogChunk = match;
          return catalogChunk;
        }
      }
    } catch {}
    return null;
  };

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only handle GET and HEAD requests for HTML pages
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const pathname = (req.path || '/').replace(/\/$/, '') || '/';
    const siteUrl = getBaseSiteUrl();

    // Skip API, static assets, service worker, manifest, robots, sitemap
    if (
      pathname.startsWith('/api') ||
      pathname.startsWith('/assets') ||
      pathname.startsWith('/images') ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/llms.txt' ||
      pathname === '/llms-full.txt' ||
      pathname === '/ai-catalog.json' ||
      pathname === '/sw.js' ||
      pathname.startsWith('/workbox-') ||
      pathname === '/manifest.webmanifest' ||
      /\.(png|jpe?g|webp|svg|ico|css|js|map|woff2?|ttf|otf|json)$/i.test(pathname)
    ) {
      return next();
    }

    if (!cachedTemplate) {
      return next();
    }

    try {
      // 1. Private Routes: Send X-Robots-Tag: noindex, nofollow
      if (isPrivateRoute(pathname)) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        const html = injectSeoIntoHtml(cachedTemplate, {
          siteUrl,
          pathname,
          meta: {
            title: 'Account & Orders | Saraswati Sweets Barabanki',
            description: 'Customer account, live order tracking, and checkout at Saraswati Sweets.',
          },
          isPrivate: true,
        });
        return res.status(200).type('html').send(html);
      }

      // 2. Static Public Routes
      if (STATIC_ROUTE_METADATA[pathname]) {
        res.setHeader('Cache-Control', 'no-cache');
        const meta = STATIC_ROUTE_METADATA[pathname];
        const html = injectSeoIntoHtml(cachedTemplate, {
          siteUrl,
          pathname,
          meta,
          catalogChunk: pathname === '/catalog' ? findCatalogChunk() : undefined,
        });
        return res.status(200).type('html').send(html);
      }

      // 3. Dynamic Category Routes (/categories/:slug)
      if (pathname.startsWith('/categories/')) {
        // If store hydration has not yet completed, serve normal 200 with index.html
        if (!isStoreLoaded()) {
          res.setHeader('Cache-Control', 'no-cache');
          return res.status(200).type('html').send(cachedTemplate);
        }

        const slug = decodeURIComponent(pathname.replace('/categories/', '')).replace(/\/$/, '');
        const categories = Array.from(inMemoryStore.categories.values()) as any[];
        const category = categories.find(
          (c) => c.slug === slug && Boolean(c.is_active) && !c.deleted_at
        );

        if (category) {
          res.setHeader('Cache-Control', 'no-cache');
          const meta: RouteSeoMeta = {
            title: `${category.name} - Pure Desi Ghee Mithai | Saraswati Sweets Barabanki`,
            description:
              category.description ||
              `Handcrafted ${category.name} made with pure cow desi ghee and traditional recipes at Saraswati Sweets, Barabanki.`,
            canonicalPath: `/categories/${category.slug}`,
            ogType: 'website',
            ogImage: toAbsoluteImageUrl(category.image_url, siteUrl),
          };
          const html = injectSeoIntoHtml(cachedTemplate, {
            siteUrl,
            pathname,
            meta,
          });
          return res.status(200).type('html').send(html);
        } else {
          // Unknown or inactive/deleted category slug -> Real 404
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          res.setHeader('Cache-Control', 'no-cache');
          const meta: RouteSeoMeta = {
            title: 'Category Not Found | Saraswati Sweets Barabanki',
            description: 'The requested mithai collection could not be found. Browse all sweets at Saraswati Sweets Barabanki.',
            canonicalPath: pathname,
          };
          const html = injectSeoIntoHtml(cachedTemplate, {
            siteUrl,
            pathname,
            meta,
            isNotFound: true,
          });
          return res.status(404).type('html').send(html);
        }
      }

      // 4. Dynamic Product Routes (/products/:slug)
      if (pathname.startsWith('/products/')) {
        // If store hydration has not yet completed, serve normal 200 with index.html
        if (!isStoreLoaded()) {
          res.setHeader('Cache-Control', 'no-cache');
          return res.status(200).type('html').send(cachedTemplate);
        }

        const slug = decodeURIComponent(pathname.replace('/products/', '')).replace(/\/$/, '');
        const products = Array.from(inMemoryStore.products.values()) as any[];
        const product = products.find(
          (p) => p.slug === slug && Boolean(p.is_active) && !p.deleted_at
        );

        if (product) {
          res.setHeader('Cache-Control', 'no-cache');

          // Resolve product image
          const primaryImage =
            product.image_url ||
            (product.images && product.images[0]?.image_url) ||
            null;
          const ogImage = toAbsoluteImageUrl(primaryImage, siteUrl);

          // Resolve product variants & price
          const variants = (product.variants && product.variants.length > 0)
            ? product.variants
            : Array.from(inMemoryStore.variants.values())
                .filter((v: any) => v.productId === product.id)
                .sort((a: any, b: any) => (a.weightGrams || 0) - (b.weightGrams || 0));
          const primaryVariant = variants[0];
          const canonicalPath = `/products/${product.slug}`;

          // Build valid Schema.org Product JSON-LD using real data only (strictly zero aggregateRating, zero reviews)
          const productSchema: any = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description:
              product.description ||
              `Fresh ${product.name} prepared in 100% pure cow desi ghee at Saraswati Sweets in Barabanki, UP.`,
            image: [ogImage],
            url: `${siteUrl}${canonicalPath}`,
            brand: {
              '@type': 'Brand',
              name: 'Saraswati Sweets',
            },
            offers: {
              '@type': 'Offer',
              price: primaryVariant?.price || 0,
              priceCurrency: 'INR',
              priceValidUntil: '2027-12-31',
              availability:
                primaryVariant?.stockStatus === 'OUT_OF_STOCK' || product.in_stock === false
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
              url: `${siteUrl}${canonicalPath}`,
            },
          };

          const meta: RouteSeoMeta = {
            title: `${product.name} | Saraswati Sweets Barabanki`,
            description:
              product.description ||
              `Fresh ${product.name} prepared in 100% pure cow desi ghee at Saraswati Sweets in Barabanki, UP.`,
            canonicalPath,
            ogType: 'product',
            ogImage,
          };

          const html = injectSeoIntoHtml(cachedTemplate, {
            siteUrl,
            pathname,
            meta,
            productSchema,
          });
          return res.status(200).type('html').send(html);
        } else {
          // Unknown or inactive/deleted product slug -> Real 404
          res.setHeader('X-Robots-Tag', 'noindex, nofollow');
          res.setHeader('Cache-Control', 'no-cache');
          const meta: RouteSeoMeta = {
            title: 'Product Not Found | Saraswati Sweets Barabanki',
            description: 'The requested sweet or namkeen item could not be found. Browse our fresh catalog at Saraswati Sweets Barabanki.',
            canonicalPath: pathname,
          };
          const html = injectSeoIntoHtml(cachedTemplate, {
            siteUrl,
            pathname,
            meta,
            isNotFound: true,
          });
          return res.status(404).type('html').send(html);
        }
      }

      // 5. Any other unmatched route -> Real 404
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      res.setHeader('Cache-Control', 'no-cache');
      const meta: RouteSeoMeta = {
        title: 'Page Not Found (404) | Saraswati Sweets Barabanki',
        description: 'The requested page does not exist at Saraswati Sweets. Browse our fresh sweet catalog or return home.',
        canonicalPath: pathname,
      };
      const html = injectSeoIntoHtml(cachedTemplate, {
        siteUrl,
        pathname,
        meta,
        isNotFound: true,
      });
      return res.status(404).type('html').send(html);
    } catch (err) {
      console.error('[SEO Inject Error]', err);
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).type('html').send(cachedTemplate);
    }
  };
}
