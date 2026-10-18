/**
 * Canonical route definitions shared between client router (src/App.tsx)
 * and server-side SEO middleware (server/middleware/seoInject.ts).
 *
 * Single source of truth for all public static pages, aliases, private paths,
 * auth redirects, and dynamic entity prefixes.
 */

export const STATIC_PUBLIC_ROUTES = [
  '/',
  '/catalog',
  '/categories',
  '/hampers',
  '/offers',
  '/bulk-enquiry',
  '/contact',
  '/certifications',
  '/terms',
  '/privacy-policy',
  '/shipping-policy',
  '/refund-policy',
] as const;

export type StaticPublicRoute = (typeof STATIC_PUBLIC_ROUTES)[number];

export const ROUTE_ALIASES: Record<string, StaticPublicRoute> = {
  '/legacy-and-certifications': '/certifications',
  '/legacy': '/certifications',
  '/terms-and-conditions': '/terms',
  '/terms-of-service': '/terms',
  '/shipping-and-delivery': '/shipping-policy',
  '/delivery-policy': '/shipping-policy',
  '/cancellation-and-refund': '/refund-policy',
  '/return-policy': '/refund-policy',
  '/privacy': '/privacy-policy',
};

export const AUTH_MODAL_ROUTES = [
  '/login',
  '/auth',
] as const;

export const PRIVATE_EXACT_ROUTES = [
  '/cart',
  '/checkout',
  '/profile',
  '/orders',
  '/admin',
  '/admin/login',
  '/admin/coupons',
] as const;

export const PRIVATE_ROUTE_PREFIXES = [
  '/admin/',
  '/orders/',
  '/order-confirmation/',
] as const;

export const DYNAMIC_PUBLIC_PREFIXES = [
  '/categories/',
  '/products/',
] as const;

/**
 * All static exact routes handled in client router.
 */
export const ALL_EXACT_ROUTES = [
  ...STATIC_PUBLIC_ROUTES,
  ...Object.keys(ROUTE_ALIASES),
  ...AUTH_MODAL_ROUTES,
  ...PRIVATE_EXACT_ROUTES,
] as const;

/**
 * Returns true if the path is a private, customer-account, checkout, or admin transaction route.
 */
export function isPrivatePath(pathname: string): boolean {
  const clean = pathname.replace(/\/$/, '') || '/';
  if ((PRIVATE_EXACT_ROUTES as readonly string[]).includes(clean)) return true;
  return (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/orders/') ||
    pathname.startsWith('/order-confirmation/') ||
    clean === '/order-confirmation'
  );
}

/**
 * Returns the canonical static path if the given path is a known static route or recognized alias.
 */
export function getCanonicalStaticPath(pathname: string): StaticPublicRoute | null {
  const clean = (pathname.replace(/\/$/, '') || '/') as StaticPublicRoute;
  if ((STATIC_PUBLIC_ROUTES as readonly string[]).includes(clean)) return clean;
  if (ROUTE_ALIASES[clean]) return ROUTE_ALIASES[clean];
  return null;
}
