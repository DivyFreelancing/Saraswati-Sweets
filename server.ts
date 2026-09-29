import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
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
import { STORE_SETTINGS } from './server/db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isDev = process.env.NODE_ENV !== 'production';

  // Body parser for JSON API requests - captures rawBody for Razorpay webhook HMAC validation
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Global Auth Token Extraction Middleware (extracts Bearer token)
  app.use(authenticateToken);

  // --- API Routes ---
  app.use('/api/auth', authRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/addresses', addressRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/payments', paymentRoutes); // Mounts /api/payments/verify, /api/payments/webhook/razorpay
  app.use('/api', orderRoutes); // Mounts /api/checkout, /api/delivery-slots, /api/orders
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

  // --- Vite Dev Server Middleware vs Static Production ---
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve static files from dist
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Saraswati Sweets Server] Running at http://0.0.0.0:${PORT} (${isDev ? 'development' : 'production'})`);
  });
}

startServer().catch((err) => {
  console.error('[Saraswati Sweets Server] Failed to start:', err);
  process.exit(1);
});
