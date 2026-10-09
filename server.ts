import express from 'express';
import compression from 'compression';
import rateLimit from 'express-rate-limit';


import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

import { authenticateToken } from './server/authMiddleware';
import authRoutes from './server/routes/authRoutes';
import cartRoutes from './server/routes/cartRoutes';
import addressRoutes from './server/routes/addressRoutes';
import adminRoutes from './server/routes/adminRoutes';
import orderRoutes from './server/routes/orderRoutes';
import paymentRoutes from './server/routes/paymentRoutes';
import publicRoutes from './server/routes/publicRoutes';
import { STORE_SETTINGS , loadStoreState } from './server/db';
import { generateRobotsTxt, generateSitemapXml } from './server/services/seoService';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await loadStoreState();
  const app = express();
  app.set('trust proxy', 1);

  // Enable HTTP response compression (gzip / deflate) for all responses > 1KB
  app.use(
    compression({
      threshold: 1024,
      level: 6,
    })
  );

  // Dynamic port resolution: prioritizes process.env.PORT, fallback to 3000
  const port = Number(process.env.PORT) || 3000;

  // Environment detection:
  // In production if explicitly NODE_ENV=production, or in Railway environment,
  // or when started via 'npm start' with a compiled dist directory.
  const isRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.RAILWAY_SERVICE_ID ||
    process.env.RAILWAY_STATIC_URL
  );
  const isNpmStart = process.env.npm_lifecycle_event === 'start';
  const distDir = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distDir, 'index.html');
  const hasDist = fs.existsSync(distIndexHtml);

  // In Railway or when running via npm start with pre-built dist, force production mode
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    isRailway ||
    (isNpmStart && hasDist);

  const isDev = !isProduction;

  if (isProduction && process.env.NODE_ENV !== 'production') {
    process.env.NODE_ENV = 'production';
  }

  if (isRailway) {
    console.log(`[Railway Deployment] Detected Railway environment. NODE_ENV=${process.env.NODE_ENV}, PORT=${port}`);
  }

  // Body parser for JSON API requests - captures rawBody for Cashfree webhook HMAC validation
  app.use(
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Global Auth Token Extraction Middleware (extracts Bearer token)
  app.use(authenticateToken);

  // --- API Routes ---
  
  // Security Headers & Cache Control for APIs
  // Defaults to no-store to protect private data. Public routes override this.
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    next();
  });
  
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });

  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per window for sensitive actions
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later.' }
  });

  app.use('/api/auth', sensitiveLimiter, authRoutes);
  app.use('/api/checkout', sensitiveLimiter);
  app.use('/api/cart', cartRoutes);
  app.use('/api/addresses', addressRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', sensitiveLimiter, paymentRoutes); // Mounts /api/payments/verify, /api/payments/webhook/cashfree
  app.use('/api', apiLimiter, orderRoutes); // Mounts /api/checkout, /api/delivery-slots, /api/orders
  app.use('/api', publicRoutes); // Mounts /api/offers, /api/banners, /api/hampers, /api/enquiries, /api/notifications, /api/products/:id/reviews

  // Store settings endpoint
  app.get('/api/store/settings', (_req, res) => {
    res.json(STORE_SETTINGS);
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      shop: 'Saraswati Sweets (Barabanki, UP)',
    });
  });

  // SEO Routes: Production robots.txt & dynamic sitemap.xml
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(generateRobotsTxt());
  });

  // Robust Sitemap Endpoints & Aliases:
  // Handles /sitemap.xml, /sitemap, /sitemap_index.xml, and accidental full-domain prefixes from GSC
  const handleSitemapRequest = (_req: express.Request, res: express.Response) => {
    let xml = generateSitemapXml();
    // Safety fallback: if dynamic generation produced too few URLs, use public/sitemap.xml static file
    if (!xml || xml.length < 500) {
      const fallbackPath = path.resolve(__dirname, 'public', 'sitemap.xml');
      if (fs.existsSync(fallbackPath)) {
        xml = fs.readFileSync(fallbackPath, 'utf8');
      }
    }
    const buf = Buffer.from(xml, 'utf-8');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Length', buf.length.toString());
    res.send(buf);
  };

  app.get(['/sitemap.xml', '/sitemap.xml/'], handleSitemapRequest);
  app.get(['/sitemap', '/sitemap/', '/sitemap_index.xml'], (_req, res) => res.redirect(301, '/sitemap.xml'));
  // Handle accidental double-domain submissions in GSC: e.g. /https://saraswatisweetsbarabanki.com/sitemap.xml
  app.get(/.*sitemap\.xml$/, handleSitemapRequest);

  // Agent Discoverability Routes: llms.txt, llms-full.txt & ai-catalog.json
  const readRootFile = (fileName: string): string | null => {
    const candidatePaths = [
      path.resolve(__dirname, 'public', fileName),
      path.resolve(__dirname, 'dist', fileName),
      path.resolve(process.cwd(), 'public', fileName),
      path.resolve(process.cwd(), 'dist', fileName),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf8');
      }
    }
    return null;
  };

  app.get(['/llms.txt', '/.well-known/llms.txt'], (_req, res) => {
    const content = readRootFile('llms.txt');
    if (content) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(content);
    } else {
      res.status(404).type('text/plain').send('llms.txt not found');
    }
  });

  app.get('/llms-full.txt', (_req, res) => {
    const content = readRootFile('llms-full.txt');
    if (content) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(content);
    } else {
      res.status(404).type('text/plain').send('llms-full.txt not found');
    }
  });

  app.get(['/ai-catalog.json', '/.well-known/ai-catalog.json', '/.well-known/ard.json'], (_req, res) => {
    const content = readRootFile('ai-catalog.json');
    if (content) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(content);
    } else {
      res.status(404).type('application/json').json({ error: 'NotFound', message: 'ai-catalog.json not found' });
    }
  });

  
  // Global API Error Handler (prevents HTML error pages for API routes)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('API Error:', err.message);
      res.status(err.status || 500).json({
        error: err.name || 'InternalServerError',
        message: err.message || 'An unexpected error occurred.',
      });
    } else {
      next(err);
    }
  });

  // --- Vite Dev Server Middleware vs Static Production ---
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, ensure dist exists before serving
    if (!hasDist) {
      console.warn(`[Saraswati Sweets Server] WARNING: 'dist/index.html' not found at ${distIndexHtml}. Ensure 'npm run build' was executed during build phase.`);
    }

    // Fallback 404 for unmatched /api routes so unknown API requests return JSON 404 instead of SPA index.html
    app.all('/api/*', (_req, res) => {
      res.status(404).json({ error: 'NotFound', message: 'API route not found' });
    });

    // In production, serve static files from dist
    app.use(
      express.static(distDir, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            // Never cache index.html to ensure users receive the latest release
            res.setHeader('Cache-Control', 'no-cache');
          } else if (filePath.includes('/assets/')) {
            // Cache Vite-hashed assets immutably
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // SPA wildcard fallback: serve index.html for all non-API paths
    app.get('*', (_req, res) => {
      res.sendFile(distIndexHtml);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[Saraswati Sweets Server] Running at http://0.0.0.0:${port} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('[Saraswati Sweets Server] Failed to start:', err);
  process.exit(1);
});
