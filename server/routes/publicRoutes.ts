import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../authMiddleware';
import {
  inMemoryStore,
  ServerOffer,
  ServerBanner,
  ServerGiftHamper,
  ServerReview,
  ServerBulkEnquiry,
  ServerNotification,
  isLiveSupabase,
  supabaseServer,
} from '../db';
import { notifyNewBulkEnquiry } from '../services/notificationService';

const router = Router();

// ==========================================================
// 0. CATALOG (PUBLIC)
// ==========================================================
router.get('/categories', (_req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const categories = Array.from(inMemoryStore.categories.values())
    .filter((c) => c.is_active)
    .sort((a, b) => a.display_order - b.display_order);
  res.json({ categories });
});


router.get('/products/:slug', (req, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache');
  const { slug } = req.params;
  const p = Array.from(inMemoryStore.products.values()).find(p => p.slug === slug && p.is_active);
  if (!p) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  
  const variants = Array.from(inMemoryStore.variants.values())
    .filter(v => v.productId === p.id)
    .sort((a, b) => a.weightGrams - b.weightGrams)
    .map(v => ({
      id: v.id,
      product_id: v.productId,
      label: v.label,
      weight_grams: v.weightGrams,
      price: v.price,
      mrp: v.mrp,
      sku: v.id,
      stock_status: v.stockStatus,
      stock_quantity: v.stockQuantity,
      display_order: v.weightGrams
    }));
    
  const cat = inMemoryStore.categories.get(p.category_id);
  res.json({
    product: {
      ...p,
      is_eggless: true,
      is_pure_ghee: Boolean(p.pure_ghee),
      is_bestseller: Boolean(p.is_bestseller),
      is_featured: Boolean(p.is_featured),
      badge_label: p.badge_label || null,
      variants,
      images: [
        {
          id: `img-${p.id}`,
          product_id: p.id,
          image_url: p.image_url,
          alt_text: p.name,
          is_primary: true,
          display_order: 1,
        },
      ],
      category: cat || null,
    }
  });
});

router.get('/products', (_req, res: Response) => {
  res.setHeader('Cache-Control', 'no-cache');
  const products = Array.from(inMemoryStore.products.values())
    .filter((p) => p.is_active);
    
  // Populate variants and categories
  const populatedProducts = products.map(p => {
    const variants = Array.from(inMemoryStore.variants.values())
      .filter(v => v.productId === p.id)
      .sort((a, b) => a.weightGrams - b.weightGrams);
      
    // Map MasterVariant to the shape expected by the client ProductVariant
    const mappedVariants = variants.map(v => ({
      id: v.id,
      product_id: v.productId,
      label: v.label,
      weight_grams: v.weightGrams,
      price: v.price,
      mrp: v.mrp,
      sku: v.id, // Or use actual sku if stored
      stock_status: v.stockStatus,
      stock_quantity: v.stockQuantity,
      display_order: v.weightGrams
    }));
      
    const cat = inMemoryStore.categories.get(p.category_id);
    return {
      ...p,
      is_eggless: true,
      is_pure_ghee: Boolean(p.pure_ghee),
      is_bestseller: Boolean(p.is_bestseller),
      is_featured: Boolean(p.is_featured),
      badge_label: p.badge_label || null,
      variants: mappedVariants,
      images: [
        {
          id: `img-${p.id}`,
          product_id: p.id,
          image_url: p.image_url,
          alt_text: p.name,
          is_primary: true,
          display_order: 1,
        },
      ],
      category: cat || null,
    };
  });
  
  res.json({ products: populatedProducts });
});


// ==========================================================
// 1. OFFERS & PROMOTIONS (PUBLIC)
// ==========================================================
router.get('/offers', (_req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const offers = Array.from(inMemoryStore.offers.values())
    .filter((o) => o.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  res.json({ offers });
});

// ==========================================================
// 2. HERO & PROMOTIONAL BANNERS (PUBLIC)
// ==========================================================
router.get('/banners', (_req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const banners = Array.from(inMemoryStore.banners.values())
    .filter((b) => b.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  res.json({ banners });
});

// ==========================================================
// 3. GIFT HAMPERS (PUBLIC)
// ==========================================================
router.get('/hampers', (_req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const hampers = Array.from(inMemoryStore.giftHampers.values())
    .filter((h) => h.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    .map((h: any) => {
      const price = typeof h.price === 'number' && !isNaN(h.price) && h.price > 0
        ? h.price
        : typeof h.hamper_price === 'number' && !isNaN(h.hamper_price) && h.hamper_price > 0
        ? h.hamper_price
        : Number(h.price ?? h.hamper_price ?? 0);
      const mrp = typeof h.mrp === 'number' && !isNaN(h.mrp) && h.mrp > 0 ? h.mrp : price;
      return {
        ...h,
        price,
        hamper_price: price,
        mrp,
      };
    });

  res.json({ hampers });
});

router.get('/hampers/:idOrSlug', (req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const { idOrSlug } = req.params;
  const hamper =
    inMemoryStore.giftHampers.get(idOrSlug) ||
    Array.from(inMemoryStore.giftHampers.values()).find(
      (h) => h.id === idOrSlug || h.slug === idOrSlug
    );

  if (!hamper || !hamper.is_active) {
    res.status(404).json({ error: 'HAMPER_NOT_FOUND', message: 'Gift hamper not found or inactive.' });
    return;
  }

  const h = hamper as any;
  const price = typeof h.price === 'number' && !isNaN(h.price) && h.price > 0
    ? h.price
    : typeof h.hamper_price === 'number' && !isNaN(h.hamper_price) && h.hamper_price > 0
    ? h.hamper_price
    : Number(h.price ?? h.hamper_price ?? 0);
  const mrp = typeof h.mrp === 'number' && !isNaN(h.mrp) && h.mrp > 0 ? h.mrp : price;

  res.json({
    hamper: {
      ...h,
      price,
      hamper_price: price,
      mrp,
    },
  });
});

// ==========================================================
// 4. REVIEWS (STRICT: ONLY VERIFIED DELIVERED PURCHASERS)
// ==========================================================

/**
 * GET /api/products/:productId/reviews
 * Returns only APPROVED reviews for public display + aggregate ratings
 */

/**
 * GET /api/reviews
 * Returns the latest globally approved reviews for the homepage
 */
router.get('/reviews', (req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const globalReviews = Array.from(inMemoryStore.reviews.values())
    .filter((r) => r.is_approved)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10); // get top 10 latest reviews

  res.json({ reviews: globalReviews });
});

router.get('/products/:productId/reviews', (req, res: Response) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const { productId } = req.params;

  const productReviews = Array.from(inMemoryStore.reviews.values())
    .filter((r) => r.product_id === productId && r.is_approved)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalReviews = productReviews.length;
  const averageRating =
    totalReviews > 0
      ? Number((productReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 5.0;

  res.json({
    reviews: productReviews,
    totalReviews,
    averageRating,
  });
});

/**
 * GET /api/products/:productId/review-eligibility
 * Checks if the logged-in user has a DELIVERED order containing this product
 */
router.get(
  '/products/:productId/review-eligibility',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;
    const user = req.user!;

    // Search user's orders for status === 'DELIVERED' and item matching productId
    const deliveredOrders = Array.from(inMemoryStore.orders.values()).filter((order) => {
      const isUserOrder =
        order.user_id === user.id ||
        (user.phone && order.guest_phone === user.phone) ||
        (user.email && order.guest_email === user.email);

      if (!isUserOrder) return false;
      if (order.status !== 'DELIVERED') return false;

      return order.items.some((item) => item.product_id === productId);
    });

    // Check if user already submitted a review
    const existingReview = Array.from(inMemoryStore.reviews.values()).find(
      (r) => r.product_id === productId && r.user_id === user.id
    );

    if (deliveredOrders.length === 0) {
      res.json({
        canReview: false,
        reason: 'Reviews are available exclusively to verified customers who have a delivered order containing this sweet.',
      });
      return;
    }

    if (existingReview) {
      res.json({
        canReview: false,
        alreadyReviewed: true,
        isApproved: existingReview.is_approved,
        reason: existingReview.is_approved
          ? 'You have already reviewed this product.'
          : 'Your review has been submitted and is awaiting admin approval.',
      });
      return;
    }

    res.json({
      canReview: true,
      deliveredOrderId: deliveredOrders[0].id,
      deliveredOrderNumber: deliveredOrders[0].order_number,
    });
  }
);

/**
 * POST /api/products/:productId/reviews
 * Submits review. Strictly rejects users without a DELIVERED order containing the product!
 * Review is unpublished (is_approved: false) until admin approves.
 */
router.post(
  '/products/:productId/reviews',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const user = req.user!;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      res.status(400).json({ error: 'INVALID_RATING', message: 'Rating must be between 1 and 5 stars.' });
      return;
    }

    if (!comment || comment.trim().length < 5) {
      res.status(400).json({ error: 'INVALID_COMMENT', message: 'Please share at least a few words about your experience.' });
      return;
    }

    // STRICT CHECK: DELIVERED order check
    const deliveredOrder = Array.from(inMemoryStore.orders.values()).find((order) => {
      const isUserOrder =
        order.user_id === user.id ||
        (user.phone && order.guest_phone === user.phone) ||
        (user.email && order.guest_email === user.email);

      if (!isUserOrder) return false;
      if (order.status !== 'DELIVERED') return false;

      return order.items.some((item) => item.product_id === productId);
    });

    if (!deliveredOrder) {
      res.status(403).json({
        error: 'REVIEW_NOT_PERMITTED',
        message: 'Only customers who have received a DELIVERED order containing this sweet may leave a review.',
      });
      return;
    }

    // Find product name
    const product = inMemoryStore.products.get(productId);
    const productName = product?.name || deliveredOrder.items.find((i) => i.product_id === productId)?.product_name || 'Mithai';

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newReview: ServerReview = {
      id: reviewId,
      product_id: productId,
      product_name: productName,
      order_id: deliveredOrder.id,
      user_id: user.id,
      user_name: user.full_name || 'Verified Customer',
      rating: Number(rating),
      comment: comment.trim(),
      is_approved: false, // Unpublished until admin approves
      created_at: new Date().toISOString(),
    };

    inMemoryStore.reviews.set(reviewId, newReview);

    res.status(201).json({
      success: true,
      message: 'Thank you! Your authentic review has been recorded and will appear on the store once approved by our team.',
      review: newReview,
    });
  }
);

// ==========================================================
// 5. BULK / CORPORATE / WEDDING ENQUIRIES (PUBLIC)
// ==========================================================
router.post('/enquiries', async (req, res: Response) => {
  // 1. Silent rejection for automated bot submissions trapped by honeypot field
  if (req.body.website && String(req.body.website).trim().length > 0) {
    const fakeEnquiryNumber = `ENQ-${Math.floor(1000 + Math.random() * 9000)}`;
    res.status(201).json({
      success: true,
      message: `Thank you! Your bulk enquiry (${fakeEnquiryNumber}) has been received. Our team will contact you shortly.`,
    });
    return;
  }

  const {
    contact_name,
    organization_name,
    phone,
    email,
    event_type = 'WEDDING',
    event_date,
    estimated_guests,
    estimated_quantity_kg,
    budget_range,
    delivery_address,
    requested_sweets,
    notes,
  } = req.body;

  const cleanName = typeof contact_name === 'string' ? contact_name.trim() : '';
  const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[\s-]/g, '') : '';
  const cleanDate = typeof event_date === 'string' ? event_date.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';

  if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
    res.status(400).json({
      error: 'INVALID_NAME',
      message: 'Please provide a valid contact name between 2 and 100 characters.',
    });
    return;
  }

  // Indian mobile phone validation: optional +91/91/0 prefix followed by 10 digits starting 6-9
  const indianPhoneRegex = /^(?:\+91|91|0)?[6-9]\d{9}$/;
  if (!cleanPhone || !indianPhoneRegex.test(cleanPhone) || cleanPhone.length > 15) {
    res.status(400).json({
      error: 'INVALID_PHONE',
      message: 'Please enter a valid 10-digit Indian mobile number.',
    });
    return;
  }

  if (!cleanDate || cleanDate.length > 30 || isNaN(Date.parse(cleanDate))) {
    res.status(400).json({
      error: 'INVALID_DATE',
      message: 'Please provide a valid event date.',
    });
    return;
  }

  if (cleanEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (cleanEmail.length > 120 || !emailRegex.test(cleanEmail)) {
      res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Please provide a valid email address or leave the field empty.',
      });
      return;
    }
  }

  if (notes && typeof notes === 'string' && notes.length > 2000) {
    res.status(400).json({
      error: 'TEXT_TOO_LONG',
      message: 'Special instructions notes must not exceed 2000 characters.',
    });
    return;
  }

  if (requested_sweets && typeof requested_sweets === 'string' && requested_sweets.length > 1000) {
    res.status(400).json({
      error: 'TEXT_TOO_LONG',
      message: 'Requested sweets specification must not exceed 1000 characters.',
    });
    return;
  }

  const id = `enq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const enquiryNumber = `ENQ-${Math.floor(1000 + Math.random() * 9000)}`;
  const nowIso = new Date().toISOString();

  const newEnquiry: ServerBulkEnquiry = {
    id,
    enquiry_number: enquiryNumber,
    contact_name: cleanName,
    organization_name: organization_name ? String(organization_name).trim().slice(0, 150) : undefined,
    phone: cleanPhone,
    email: cleanEmail || undefined,
    event_type: (['WEDDING', 'CORPORATE', 'FESTIVE_BULK', 'CUSTOM_EVENT'] as const).includes(event_type as any)
      ? (event_type as ServerBulkEnquiry['event_type'])
      : 'WEDDING',
    event_date: cleanDate,
    estimated_guests: estimated_guests && !isNaN(Number(estimated_guests)) ? Math.min(Math.max(1, Number(estimated_guests)), 50000) : undefined,
    estimated_quantity_kg: estimated_quantity_kg && !isNaN(Number(estimated_quantity_kg)) ? Math.min(Math.max(1, Number(estimated_quantity_kg)), 10000) : undefined,
    budget_range: budget_range ? String(budget_range).trim().slice(0, 100) : undefined,
    delivery_address: delivery_address ? String(delivery_address).trim().slice(0, 500) : undefined,
    requested_sweets: requested_sweets ? String(requested_sweets).trim().slice(0, 1000) : undefined,
    notes: notes ? String(notes).trim().slice(0, 2000) : undefined,
    status: 'NEW',
    created_at: nowIso,
    updated_at: nowIso,
  };

  inMemoryStore.bulkEnquiries.set(id, newEnquiry);

  // Mask phone in application logs to protect customer privacy
  const maskedPhone = cleanPhone.length >= 10
    ? `${cleanPhone.slice(0, 2)}******${cleanPhone.slice(-2)}`
    : '***';
  console.log(`[Bulk Enquiry] Received enquiry ${enquiryNumber} (event: ${newEnquiry.event_type}, phone: ${maskedPhone})`);

  // Dispatch transactional notification to Store Owner + Confirmation email to customer
  notifyNewBulkEnquiry(newEnquiry).catch((err) =>
    console.error('[Bulk Enquiry Notification Error]:', err)
  );

  res.status(201).json({
    success: true,
    message: `Thank you! Your bulk enquiry (${enquiryNumber}) has been received. Our team will contact you shortly on ${cleanPhone}.`,
    enquiry: newEnquiry,
  });
});

// ==========================================================
// 6. IN-APP NOTIFICATIONS
// ==========================================================
router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF';

  // Customer sees notifications targeted to their user ID or phone. Admin also sees 'ADMIN' and 'ALL'
  const notifs = inMemoryStore.notifications.filter((n) => {
    if (isAdmin && (n.user_id === 'ADMIN' || n.user_id === 'STORE_OWNER' || n.user_id === 'ALL')) {
      return true;
    }
    return n.user_id === user.id || (user.phone && n.user_id === user.phone);
  });

  const unreadCount = notifs.filter((n) => !n.is_read).length;

  res.json({
    notifications: notifs.slice(0, 50),
    unreadCount,
  });
});

router.patch('/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF';
  const { id } = req.params;

  // Single ownership-scoped database update when live Supabase is configured
  if (isLiveSupabase && supabaseServer) {
    try {
      let query = supabaseServer
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (!isAdmin) {
        // Scoped strictly to caller's profile ID
        query = query.eq('profile_id', user.id);
      }

      const { data, error } = await query.select('id');
      if (error) {
        console.error('[Notifications] Database error updating notification:', error.message);
        res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to update notification status.' });
        return;
      }

      // If DB update succeeded, sync memory if present and return success (supports DB-only notifications)
      if (data && data.length > 0) {
        const notif = inMemoryStore.notifications.find((n) => n.id === id);
        if (notif) {
          notif.is_read = true;
        }
        res.json({ success: true, message: 'Notification marked as read.' });
        return;
      }
    } catch (err: any) {
      console.error('[Notifications] Database exception updating notification:', err.message);
      res.status(500).json({ error: 'DATABASE_ERROR', message: 'Failed to update notification status.' });
      return;
    }
  }

  const notif = inMemoryStore.notifications.find((n) => n.id === id);

  if (!notif) {
    res.status(404).json({ error: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' });
    return;
  }

  // Verify ownership: customer owns notification if matched to user.id or user.phone; admin/staff can also mark system alerts
  const isOwner =
    notif.user_id === user.id ||
    (user.phone && notif.user_id === user.phone) ||
    (isAdmin && (notif.user_id === 'ADMIN' || notif.user_id === 'STORE_OWNER' || notif.user_id === 'ALL'));

  if (!isOwner) {
    res.status(404).json({ error: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found.' });
    return;
  }

  notif.is_read = true;
  res.json({ success: true, message: 'Notification marked as read.' });
});

router.patch('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isAdmin = user.role === 'ADMIN' || user.role === 'STAFF';

  inMemoryStore.notifications.forEach((n) => {
    const isTarget =
      n.user_id === user.id ||
      (user.phone && n.user_id === user.phone) ||
      (isAdmin && (n.user_id === 'ADMIN' || n.user_id === 'STORE_OWNER'));
    if (isTarget) {
      n.is_read = true;
    }
  });

  res.json({ success: true, message: 'All notifications marked as read.' });
});

export default router;
