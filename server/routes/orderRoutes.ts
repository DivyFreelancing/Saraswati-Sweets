import { randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest, requireAuth, requireRole } from '../authMiddleware';
import {
  MASTER_VARIANTS,
  STORE_SETTINGS,
  inMemoryStore,
  ServerOrder,
  ServerOrderItem,
  ServerDeliverySlot,
  OrderStatus,
  VALID_ORDER_TRANSITIONS,
  SERVICEABLE_PINCODES,
  expireUnpaidOrders,
  logAuditEvent,
  validateCouponServer,
  isLiveSupabase,
  supabaseServer,
  findOrderInSupabase,
} from '../db';
import { createCashfreeOrder, getCashfreeAppId, fetchCashfreeOrderDetails } from '../services/cashfreeService';
import { notifyOrderPlaced, notifyOrderStatusChanged } from '../services/notificationService';
import { confirmOrderPayment } from '../services/paymentPersistenceService';

const router = Router();

// GET /api/delivery-slots - Get active slots for customer picker
router.get('/delivery-slots', (_req, res) => {
  const now = new Date();
  const validDates = new Set();
  
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() + i);
    const dateStr = formatter.format(d); // YYYY-MM-DD
    validDates.add(dateStr);
  }

  const slots = Array.from(inMemoryStore.deliverySlots.values())
    .filter((s) => s.status === "ACTIVE" && validDates.has(s.slot_date))
    .sort((a, b) => {
      if (a.slot_date !== b.slot_date) return a.slot_date.localeCompare(b.slot_date);
      return a.start_time.localeCompare(b.start_time);
    })
    .map((s) => {
      const isPastCutoff = now > new Date(s.cutoff_at);
      const isFull = s.booked_count >= s.capacity;
      return {
        ...s, is_active: s.status === "ACTIVE",
        isPastCutoff,
        isFull,
        isAvailable: !isPastCutoff && !isFull,
      };
    });

  res.json({ slots });
});

// POST /api/admin/delivery-slots/bulk-generate - Admin bulk generate slots
router.post(
  '/admin/delivery-slots/bulk-generate',
  requireRole(['ADMIN', 'STAFF']),
  (req: AuthenticatedRequest, res: Response) => {
    const { startDate, daysCount = 7, capacity = 30 } = req.body;

    const baseDate = startDate ? new Date(startDate) : new Date();
    const generated: ServerDeliverySlot[] = [];

    const templates = [
      { start: '10:00', end: '13:00', cutoffHours: 2 },
      { start: '14:00', end: '17:00', cutoffHours: 2 },
      { start: '18:00', end: '21:00', cutoffHours: 2 },
    ];

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      templates.forEach((tmpl) => {
        const slotId = randomUUID();
        const cutoffDate = new Date(`${dateStr}T${tmpl.start}:00Z`);
        cutoffDate.setHours(cutoffDate.getHours() - tmpl.cutoffHours);

        const slot: ServerDeliverySlot = {
          id: slotId,
          slot_date: dateStr,
          start_time: tmpl.start,
          end_time: tmpl.end,
          capacity: Number(capacity) || 30,
          booked_count: 0,
          cutoff_at: cutoffDate.toISOString(),
          status: "ACTIVE",
        };

        inMemoryStore.deliverySlots.set(slotId, slot);
        generated.push(slot);
      });
    }

    res.json({
      success: true,
      message: `Bulk-generated ${generated.length} delivery slots over ${daysCount} days`,
      count: generated.length,
    });
  }
);

// POST /api/checkout - Atomic Order Placement with Server Authoritative Calculations & Idempotency
router.post('/checkout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // 1. Strict Server-Side Authentication Verification
  // Must verify valid, non-expired auth token BEFORE doing any price computation, order creation, or payment initiation
  if (!req.user || !req.user.id) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required. Please log in with your phone or email to place an order.',
    });
    return;
  }

  // Authoritative verified user id from verified token - NEVER trust client-supplied user id
  const verifiedUserId = req.user.id;

  // 2. Idempotency Key check
  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) {
    res.status(400).json({
      error: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'Header Idempotency-Key is required to prevent duplicate order placement.',
    });
    return;
  }

  // If already processed with this key, return original order (Idempotency guarantee)
  if (inMemoryStore.ordersByIdempotency.has(idempotencyKey)) {
    const existingOrder = inMemoryStore.ordersByIdempotency.get(idempotencyKey)!;
    res.status(200).json({
      success: true,
      isRetry: true,
      message: 'Order already created (idempotent response)',
      order: existingOrder,
    });
    return;
  }

  const {
    items = [],
    address,
    slot_id,
    coupon_code,
    special_instructions,
    packaging_notes,
    guest_phone,
    guest_email,
    payment_method = 'COD',
  } = req.body;

  // Run auto-expire check on pending orders to free up slots
  expireUnpaidOrders();

  // 2. Validate Items
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({
      error: 'EMPTY_CART',
      message: 'Cart has no items to order.',
    });
    return;
  }

  // 3. Validate Address & Pincode serviceability
  if (!address || !address.recipient_name || !address.recipient_phone || !address.street_address || !address.pincode) {
    res.status(400).json({
      error: 'INVALID_ADDRESS',
      message: 'Recipient name, phone, address, and pincode are required.',
    });
    return;
  }

  const cleanPincode = String(address.pincode).trim();
  if (!SERVICEABLE_PINCODES.includes(cleanPincode)) {
    res.status(400).json({
      error: 'PINCODE_NOT_SERVICEABLE',
      message: `Pincode ${cleanPincode} is outside Barabanki delivery limits.`,
      allowedPincodes: SERVICEABLE_PINCODES,
    });
    return;
  }

  // 4. Validate and Lock Delivery Slot
  if (!slot_id) {
    res.status(400).json({
      error: 'SLOT_REQUIRED',
      message: 'Please select an available delivery slot.',
    });
    return;
  }

  const slot = inMemoryStore.deliverySlots.get(slot_id);
  if (!slot || slot.status !== "ACTIVE") {
    res.status(400).json({
      error: 'INVALID_SLOT',
      message: 'Selected delivery slot is invalid or inactive.',
    });
    return;
  }

  // Enforce the 7-day delivery window (Asia/Kolkata)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayISTDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const todayISTStr = formatter.format(todayISTDate);
  const maxISTDate = new Date(todayISTDate);
  maxISTDate.setDate(maxISTDate.getDate() + 6);
  const maxISTStr = formatter.format(maxISTDate);

  if (slot.slot_date < todayISTStr || slot.slot_date > maxISTStr) {
    res.status(400).json({
      error: 'SLOT_OUT_OF_BOUNDS',
      message: 'Delivery date must be within the next 7 days.',
    });
    return;
  }

  const now = new Date();
  if (now > new Date(slot.cutoff_at)) {
    res.status(400).json({
      error: 'SLOT_CUTOFF_EXPIRED',
      message: 'Orders for this delivery window have closed. Please select an upcoming slot.',
    });
    return;
  }

  if (slot.booked_count >= slot.capacity) {
    res.status(400).json({
      error: 'SLOT_CAPACITY_FULL',
      message: 'This delivery slot has reached full capacity. Please select another slot.',
    });
    return;
  }

  // 5. Atomic Transaction: Re-fetch variant & hamper prices/stock & Recompute Subtotal
  let subtotal = 0;
  const orderItemsSnapshots: ServerOrderItem[] = [];
  const orderId = randomUUID();

  for (const it of items) {
    const rawVariantId = it.variantId || it.variant_id;
    const requestedQty = Math.max(1, Math.min(20, Math.floor(it.quantity || 1)));

    // Check if item is a Gift Hamper
    const isHamper =
      it.item_type === 'HAMPER' ||
      rawVariantId?.startsWith('hamper-var-') ||
      inMemoryStore.giftHampers.has(rawVariantId);

    if (isHamper) {
      const hamperId = rawVariantId.startsWith('hamper-var-')
        ? rawVariantId.replace('hamper-var-', '')
        : rawVariantId;

      const hamper =
        inMemoryStore.giftHampers.get(hamperId) ||
        Array.from(inMemoryStore.giftHampers.values()).find(
          (h) => h.id === hamperId || h.slug === hamperId
        );

      if (!hamper || !hamper.is_active) {
        res.status(400).json({
          error: 'HAMPER_NOT_FOUND',
          message: `Gift hamper '${hamperId}' is not available for purchase.`,
        });
        return;
      }

      const itemTotalPrice = hamper.price * requestedQty;
      subtotal += itemTotalPrice;

      orderItemsSnapshots.push({
        id: randomUUID(),
        order_id: orderId,
        product_id: hamper.id,
        variant_id: `hamper-var-${hamper.id}`,
        product_name: hamper.name,
        variant_label: hamper.box_type || 'Festive Hamper Box',
        unit_price: hamper.price,
        quantity: requestedQty,
        total_price: itemTotalPrice,
        image_url: hamper.image_url,
        item_type: 'HAMPER',
        hamper_details: {
          box_type: hamper.box_type,
          items_included: hamper.items_included.map((hi: any) => ({
            product_name: hi.product_name,
            variant_label: hi.variant_label,
            quantity: hi.quantity,
          })),
        },
      });
      continue;
    }

    // Standard Mithai Product Variant
    const variant = inMemoryStore.variants.get(rawVariantId);
    const product = variant ? inMemoryStore.products.get(variant.productId) : null;
    if (!variant) {
      res.status(400).json({
        error: 'VARIANT_NOT_FOUND',
        message: `Item variant ${rawVariantId} is not available in our catalog.`,
      });
      return;
    }

    if (variant.stockStatus === 'OUT_OF_STOCK') {
      res.status(400).json({
        error: 'OUT_OF_STOCK',
        message: `${product?.name || variant.productName || 'Unknown Product'} (${variant.label}) is currently out of stock.`,
      });
      return;
    }

    const itemTotalPrice = variant.price * requestedQty;
    subtotal += itemTotalPrice;

    orderItemsSnapshots.push({
      id: randomUUID(),
      order_id: orderId,
      product_id: variant.productId,
      variant_id: variant.id,
      product_name: product?.name || variant.productName || 'Unknown Product',
      variant_label: variant.label,
      unit_price: variant.price,
      quantity: requestedQty,
      total_price: itemTotalPrice,
      image_url: product?.image_url || variant.imageUrl || '',
      item_type: 'PRODUCT',
    });
  }

  // 6. Validate Coupon Server-Side (authoritative check at checkout time)
  let discount = 0;
  let appliedCouponCode: string | undefined = undefined;
  let validatedCouponObj: any = null;

  if (coupon_code) {
    const couponRes = validateCouponServer(
      String(coupon_code),
      subtotal,
      req.user?.id,
      address.recipient_phone
    );

    if (!couponRes.valid) {
      res.status(400).json({
        error: couponRes.errorCode || 'COUPON_INVALID',
        message: couponRes.error || 'Invalid or expired coupon applied.',
      });
      return;
    }

    discount = couponRes.discount_amount;
    appliedCouponCode = couponRes.coupon!.code;
    validatedCouponObj = couponRes.coupon;
  }

  // 7. Calculate Delivery & Tax
  const isFreeDelivery = subtotal >= STORE_SETTINGS.free_delivery_above;
  const deliveryCharge = isFreeDelivery ? 0 : STORE_SETTINGS.delivery_charge;
  const tax = 0; // Inclusive in MRP per sweets standard in UP
  const total = Math.max(0, subtotal - discount + deliveryCharge + tax);

  // 8. Payment Method Validation
  const isOnlinePayment = payment_method === 'ONLINE';

  if (!isOnlinePayment) {
    // COD Limit Check
    if (total > STORE_SETTINGS.cod_limit_amount) {
      res.status(400).json({
        error: 'COD_LIMIT_EXCEEDED',
        message: `Cash on Delivery is allowed only for orders up to ₹${STORE_SETTINGS.cod_limit_amount}. Your order total is ₹${total}. Please pay online.`,
        codMaxLimit: STORE_SETTINGS.cod_limit_amount,
        total,
      });
      return;
    }
  }

  // 9. Increment slot booked_count (Lock slot)
  slot.booked_count += 1;
  inMemoryStore.deliverySlots.set(slot.id, slot);

  // 10. Generate Order Number & Record Order
  const orderNumber = `SS-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;
  const nowIso = new Date().toISOString();
  const initialStatus: OrderStatus = isOnlinePayment ? 'PENDING_PAYMENT' : 'PLACED';

  const newOrder: ServerOrder = {
    id: orderId,
    order_number: orderNumber,
    user_id: verifiedUserId,
    guest_phone: req.user.phone || address?.recipient_phone || undefined,
    guest_email: req.user.email || undefined,
    address_snapshot: {
      ...address,
      city: 'Barabanki',
      state: 'Uttar Pradesh',
    },
    delivery_slot_id: slot.id,
    slot_snapshot: {
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
    },
    subtotal,
    discount_amount: discount,
    coupon_code: appliedCouponCode,
    delivery_charge: deliveryCharge,
    tax_amount: tax,
    total_amount: total,
    status: initialStatus,
    payment_method: isOnlinePayment ? 'ONLINE' : 'COD',
    payment_status: 'PENDING',
    special_instructions: special_instructions || undefined,
    packaging_notes: packaging_notes || undefined,
    idempotency_key: idempotencyKey,
    placed_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    items: orderItemsSnapshots,
  };

  // If ONLINE payment: create Cashfree order and set 20-min auto-expiry
  let cashfreePayload: any = null;
  if (isOnlinePayment) {
    const amountInPaise = Math.round(total * 100);
    newOrder.expires_at = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    let cfOrder: { id: string; amount: number; currency: string; payment_session_id?: string };
    try {
      cfOrder = await createCashfreeOrder(
        amountInPaise, 
        orderNumber, 
        {
          customer_id: verifiedUserId || 'guest',
          customer_phone: address.recipient_phone,
          customer_name: address.recipient_name,
        },
        {
          order_id: orderId,
          order_number: orderNumber
        },
        newOrder.expires_at
      );
    } catch (cfErr: any) {
      // Roll back in-memory delivery slot reservation!
      slot.booked_count = Math.max(0, slot.booked_count - 1);
      inMemoryStore.deliverySlots.set(slot.id, slot);

      // Roll back database write too if delivery slot was already saved to Supabase
      if (isLiveSupabase && supabaseServer && slot.id) {
        try {
          const { data: dbSlot } = await supabaseServer
            .from('delivery_slots')
            .select('booked_count')
            .eq('id', slot.id)
            .maybeSingle();

          if (dbSlot && dbSlot.booked_count > 0) {
            await supabaseServer
              .from('delivery_slots')
              .update({
                booked_count: Math.max(0, dbSlot.booked_count - 1),
                updated_at: new Date().toISOString(),
              })
              .eq('id', slot.id);
          }
        } catch (dbRollbackErr: any) {
          console.warn('[Checkout] Failed to roll back database slot reservation:', dbRollbackErr.message);
        }
      }

      console.error('[Checkout] Cashfree order creation failed; delivery slot rolled back:', cfErr.message);
      const statusCode = cfErr.statusCode === 502 ? 502 : 503;
      res.status(statusCode).json({
        error: 'PAYMENT_TEMPORARILY_UNAVAILABLE',
        message: 'Payment gateway is temporarily unavailable. Please try again shortly or choose Cash on Delivery.',
        details: cfErr.message,
      });
      return;
    }

    newOrder.provider_order_id = cfOrder.id;

    // Record initial created payment record
    const initialPaymentId = randomUUID();
    inMemoryStore.payments.set(initialPaymentId, {
      id: initialPaymentId,
      order_id: orderId,
      order_number: orderNumber,
      provider_order_id: cfOrder.id,
      amount: Number((amountInPaise / 100).toFixed(2)), // in rupees, consistent with database
      currency: 'INR',
      status: 'CREATED',
      method: 'ONLINE',
      created_at: nowIso,
      updated_at: nowIso,
    });

    cashfreePayload = {
      order_id: cfOrder.id,
      payment_session_id: cfOrder.payment_session_id,
      amount: amountInPaise,
      currency: 'INR',
    };
  }

  // 11. Atomic Order & Coupon Usage Recording in the same transaction
  if (validatedCouponObj && appliedCouponCode) {
    validatedCouponObj.usage_count = (validatedCouponObj.used_count || 0) + 1;
    inMemoryStore.coupons.set(validatedCouponObj.code, validatedCouponObj);

    inMemoryStore.couponUsage.push({
      id: `cu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      coupon_id: validatedCouponObj.id,
      coupon_code: appliedCouponCode,
      order_id: orderId,
      user_id: verifiedUserId,
      phone: address.recipient_phone,
      discount_amount: discount,
      created_at: nowIso,
    });
  }

  inMemoryStore.orders.set(orderId, newOrder);
  inMemoryStore.ordersByIdempotency.set(idempotencyKey, newOrder);

  // Clear customer's server cart for verified user
  inMemoryStore.userCarts.delete(verifiedUserId);

  if (!isLiveSupabase || !supabaseServer) {
    res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not available' });
    return;
  }

  // Bug #1 Fix: Ensure the user profile row exists in Supabase BEFORE inserting the order.
  // Without this, `orders.user_id` FK references a Supabase auth uid that has no row in `profiles`,
  // causing "insert or update on table orders violates foreign key constraint orders_user_id_fkey".
  const profileToUpsert = {
    id: verifiedUserId,
    phone: req.user.phone || newOrder.guest_phone || undefined,
    email: req.user.email || newOrder.guest_email || undefined,
    full_name: req.user.full_name || address.recipient_name,
    role: req.user.role || 'CUSTOMER',
    created_at: req.user.created_at || nowIso,
    updated_at: nowIso,
  };
  const { error: profileErr } = await supabaseServer
    .from('profiles')
    .upsert(profileToUpsert, { onConflict: 'id' });
  if (profileErr) {
    console.error('[Order] Profile upsert failed before order insert:', profileErr);
    // Non-fatal if profile already exists — the FK may still resolve. Log and continue.
  }

  // Bug #2 Fix: Ensure the delivery slot row exists in Supabase BEFORE inserting the order.
  // Without this, if the slot was generated in-memory or has an unsynced UUID,
  // `orders.delivery_slot_id` FK references a missing row in `delivery_slots`,
  // causing "insert or update on table orders violates foreign key constraint orders_delivery_slot_id_fkey".
  let resolvedDeliverySlotId: string | null = slot.id;
  if (isLiveSupabase && supabaseServer && slot) {
    try {
      const { data: existingSlot } = await supabaseServer
        .from('delivery_slots')
        .select('id')
        .eq('id', slot.id)
        .maybeSingle();

      if (!existingSlot) {
        // Check if there is already a slot for this exact time window (UNIQUE(slot_date, start_time, end_time))
        const { data: slotByTime } = await supabaseServer
          .from('delivery_slots')
          .select('id')
          .eq('slot_date', slot.slot_date)
          .eq('start_time', slot.start_time)
          .eq('end_time', slot.end_time)
          .maybeSingle();

        if (slotByTime) {
          resolvedDeliverySlotId = slotByTime.id;
          slot.id = slotByTime.id;
          newOrder.delivery_slot_id = slotByTime.id;
        } else {
          // Insert slot row into Supabase delivery_slots
          const { data: insertedSlot, error: insertSlotErr } = await supabaseServer
            .from('delivery_slots')
            .upsert(
              {
                id: slot.id,
                slot_date: slot.slot_date,
                start_time: slot.start_time,
                end_time: slot.end_time,
                capacity: slot.capacity || 25,
                booked_count: Math.min(slot.capacity || 25, slot.booked_count || 1),
                cutoff_at: slot.cutoff_at || nowIso,
                status: slot.status || 'ACTIVE',
              },
              { onConflict: 'slot_date,start_time,end_time' }
            )
            .select('id')
            .maybeSingle();

          if (!insertSlotErr && insertedSlot) {
            resolvedDeliverySlotId = insertedSlot.id;
            slot.id = insertedSlot.id;
            newOrder.delivery_slot_id = insertedSlot.id;
          } else {
            const { data: retrySlot } = await supabaseServer
              .from('delivery_slots')
              .select('id')
              .eq('slot_date', slot.slot_date)
              .eq('start_time', slot.start_time)
              .eq('end_time', slot.end_time)
              .maybeSingle();

            if (retrySlot) {
              resolvedDeliverySlotId = retrySlot.id;
              slot.id = retrySlot.id;
              newOrder.delivery_slot_id = retrySlot.id;
            } else {
              console.warn('[Order] Could not sync delivery slot to Supabase. Setting delivery_slot_id to null (details preserved in slot_snapshot).');
              resolvedDeliverySlotId = null;
            }
          }
        }
      }
    } catch (slotEx: any) {
      console.warn('[Order] Delivery slot check error:', slotEx.message);
      resolvedDeliverySlotId = null;
    }
  }

  // Write direct to Supabase
  const orderRow: Record<string, any> = {
    id: orderId,
    order_number: orderNumber,
    user_id: verifiedUserId,
    guest_phone: newOrder.guest_phone,
    guest_email: newOrder.guest_email,
    address_snapshot: newOrder.address_snapshot,
    delivery_slot_id: resolvedDeliverySlotId,
    slot_snapshot: newOrder.slot_snapshot,
    subtotal: newOrder.subtotal,
    discount_amount: newOrder.discount_amount,
    coupon_code: newOrder.coupon_code,
    delivery_charge: newOrder.delivery_charge,
    tax_amount: newOrder.tax_amount,
    total_amount: newOrder.total_amount,
    status: newOrder.status,
    payment_method: newOrder.payment_method,
    payment_status: newOrder.payment_status,
    special_instructions: newOrder.special_instructions,
    packaging_notes: newOrder.packaging_notes,
    idempotency_key: idempotencyKey,
    placed_at: newOrder.placed_at,
    provider_order_id: newOrder.provider_order_id || null,
  };

  let { error: orderErr } = await supabaseServer.from('orders').insert([orderRow]);

  // If pending migration causes error on provider_order_id column, retry without it
  if (orderErr && orderErr.message?.includes('provider_order_id')) {
    delete orderRow.provider_order_id;
    const retryNoProvider = await supabaseServer.from('orders').insert([orderRow]);
    orderErr = retryNoProvider.error;
  }

  // If order insert fails on delivery_slot_id foreign key constraint, retry with null
  // (the full slot details are safely preserved in slot_snapshot JSONB)
  if (orderErr && (orderErr.message?.includes('orders_delivery_slot_id_fkey') || orderErr.message?.includes('delivery_slot_id'))) {
    console.warn('[Order] Retrying order insert with delivery_slot_id = null due to FK constraint on delivery_slots');
    orderRow.delivery_slot_id = null;
    const retryRes = await supabaseServer.from('orders').insert([orderRow]);
    orderErr = retryRes.error;
  }

  if (orderErr) {
    console.error('Order insert failed', orderErr);
    res.status(500).json({ error: 'DB_WRITE_FAILED', message: orderErr.message });
    return;
  }
  
  // Write order items
  const orderItemsRows = orderItemsSnapshots.map(it => ({
    id: it.id,
    order_id: orderId,
    item_type: it.item_type || 'PRODUCT',
    product_variant_id: it.item_type === 'HAMPER' ? null : (it.variant_id || null),
    gift_hamper_id: it.item_type === 'HAMPER' ? (it.product_id || null) : null,
    product_name_snapshot: it.product_name,
    variant_label_snapshot: it.variant_label,
    unit_price: it.unit_price,
    quantity: it.quantity,
    line_total: it.total_price
  }));
  
  if (orderItemsRows.length > 0) {
     const { error: itemsErr } = await supabaseServer.from('order_items').insert(orderItemsRows);
     if (itemsErr) {
        console.error('Order items insert failed', itemsErr);
        res.status(500).json({ error: 'DB_WRITE_FAILED', message: itemsErr.message });
        return;
     }
  }

  // Update memory only after DB success
  inMemoryStore.orders.set(orderId, newOrder);
  if (idempotencyKey) {
    inMemoryStore.ordersByIdempotency.set(idempotencyKey, newOrder);
  }


  // Dispatch transactional notifications (email via ZeptoMail + in-app notification)
  if (!isOnlinePayment) {
    notifyOrderPlaced(newOrder).catch((err) =>
      console.error('[Notification Dispatch Error]:', err)
    );
  }

  res.status(201).json({
    success: true,
    message: isOnlinePayment
      ? 'Cashfree payment order generated. Please complete payment within 15 minutes.'
      : 'Order placed successfully! Fresh sweets are being prepared.',
    order: newOrder,
    ...(cashfreePayload ? { cashfree: cashfreePayload } : {}),
  });
});

// GET /api/orders - List orders (Customers see own; Staff/Admin see all)
router.get('/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isStaffOrAdmin = user.role === 'ADMIN' || user.role === 'STAFF';

  const userCleanPhone = user.phone ? user.phone.replace(/\D/g, '').slice(-10) : '';

  const allOrders = Array.from(inMemoryStore.orders.values());
  const userOrders = isStaffOrAdmin
    ? allOrders
    : allOrders.filter((o) => {
        if (o.user_id === user.id) return true;
        if (userCleanPhone) {
          if (false || false) return true;
          const guestPhone = (o.guest_phone || '').replace(/\D/g, '').slice(-10);
          const recipientPhone = (o.address_snapshot?.recipient_phone || '').replace(/\D/g, '').slice(-10);
          if (guestPhone === userCleanPhone || recipientPhone === userCleanPhone) return true;
        }
        return false;
      });

  userOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allEnquiries = Array.from(inMemoryStore.bulkEnquiries.values());
  const userEnquiries = isStaffOrAdmin 
    ? allEnquiries 
    : allEnquiries.filter((e) => {
        const ePhone = e.phone.replace(/\D/g, '').slice(-10);
        return ePhone === userCleanPhone;
      });
  userEnquiries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({ orders: userOrders, bulkEnquiries: userEnquiries });
});

// GET /api/orders/:orderNumber - Fetch order details by order_number
router.get('/orders/:orderNumber', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { orderNumber } = req.params;

  const order = Array.from(inMemoryStore.orders.values()).find(
    (o) => o.order_number === orderNumber || o.id === orderNumber
  );

  if (!order) {
    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: `Order #${orderNumber} not found.`,
    });
    return;
  }

  // If user is authenticated and not staff, verify ownership
  if (req.user && req.user.role === 'CUSTOMER') {
    if (order.user_id && order.user_id !== req.user.id) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', message: `Order #${orderNumber} not found.` });
      return;
    }
  }

  res.json({ order });
});

// GET /api/checkout/order-status/:orderId - Fallback reconciliation route
router.get('/checkout/order-status/:orderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { orderId } = req.params;

  let order: ServerOrder | undefined = inMemoryStore.orders.get(orderId);
  if (!order) {
    order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.id === orderId || o.order_number === orderId || o.provider_order_id === orderId
    );
  }

  if (!order && isLiveSupabase && supabaseServer) {
    const { order: dbOrder, error: dbErr } = await findOrderInSupabase(orderId);
    if (dbErr) {
      console.error(`[OrderRoutes] Database lookup failure for order status:`, dbErr);
      res.status(500).json({
        error: 'DATABASE_LOOKUP_ERROR',
        message: 'Failed to query order from database. Please retry.',
      });
      return;
    }
    if (dbOrder) order = dbOrder;
  }

  if (!order) {
    res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return;
  }

  // Authorize order ownership if user is customer
  if (req.user && req.user.role === 'CUSTOMER') {
    if (order.user_id && order.user_id !== req.user.id) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }
  }

  // If already confirmed & captured, return immediately
  if (order.payment_status === 'CAPTURED' && order.status !== 'PENDING_PAYMENT') {
    res.json({
      success: true,
      status: order.status,
      payment_status: order.payment_status,
      order,
    });
    return;
  }

  // If order is in PENDING_PAYMENT with Cashfree provider_order_id, query Cashfree API to reconcile
  if (order.payment_method === 'ONLINE' && order.provider_order_id) {
    const cashfreeDetails = await fetchCashfreeOrderDetails(order.provider_order_id);

    if (cashfreeDetails.status === 'PAID') {
      const confirmResult = await confirmOrderPayment({
        orderIdOrProviderId: order.id,
        providerOrderId: order.provider_order_id,
        paymentAmount: cashfreeDetails.orderAmount,
        currency: cashfreeDetails.orderCurrency,
        source: 'STATUS_POLL',
      });

      if (confirmResult.success && confirmResult.order) {
        res.json({
          success: true,
          status: confirmResult.order.status,
          payment_status: confirmResult.order.payment_status,
          reconciled: true,
          order: confirmResult.order,
        });
        return;
      }
    } else if (cashfreeDetails.status === 'ACTIVE') {
      res.json({
        success: false,
        pending: true,
        status: order.status,
        payment_status: order.payment_status,
        message: 'Payment verification is still pending on Cashfree gateway.',
        order,
      });
      return;
    }
  }

  res.json({
    success: order.status === 'PLACED',
    status: order.status,
    payment_status: order.payment_status,
    order,
  });
});

const guestOrderStatusIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // Max 40 lookups per IP window (raised from 15)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many order status lookup requests from this IP. Please try again after 15 minutes.',
  },
});

const guestOrderStatusOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 lookups per order number per 15 minutes
  keyGenerator: (req) => {
    const rawOrderNum = req.body?.order_number;
    return typeof rawOrderNum === 'string' && rawOrderNum.trim()
      ? `order_${rawOrderNum.trim().toUpperCase()}`
      : req.ip || 'unknown';
  },
  validate: { default: true, keyGeneratorIpFallback: false },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many status check attempts for this specific order. Please try again after 15 minutes.',
  },
});

// POST /api/orders/guest-status - Safe guest order status lookup (requires order_number + checkout phone)
router.post(
  '/orders/guest-status',
  guestOrderStatusIpLimiter,
  guestOrderStatusOrderLimiter,
  async (req: Request, res: Response) => {
  const { order_number, phone } = req.body;

  if (!order_number || typeof order_number !== 'string' || !order_number.trim()) {
    res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'order_number is required.',
    });
    return;
  }

  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'Mobile number used at checkout is required.',
    });
    return;
  }

  const cleanInputPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanInputPhone.length !== 10) {
    res.status(400).json({
      error: 'INVALID_PHONE',
      message: 'A valid 10-digit mobile number is required.',
    });
    return;
  }

  const targetIdentifier = order_number.trim();

  // 1. Look up order in memory
  let order: ServerOrder | undefined = inMemoryStore.orders.get(targetIdentifier);
  if (!order) {
    order = Array.from(inMemoryStore.orders.values()).find(
      (o) => o.order_number === targetIdentifier || o.id === targetIdentifier
    );
  }

  // 2. Look up in Supabase if not found in memory
  if (!order && isLiveSupabase && supabaseServer) {
    const { order: dbOrder, error: dbErr } = await findOrderInSupabase(targetIdentifier);
    if (dbErr) {
      console.error('[GuestStatus] Database lookup failure:', dbErr);
      res.status(500).json({
        error: 'DATABASE_LOOKUP_ERROR',
        message: 'Failed to query order. Please retry shortly.',
      });
      return;
    }
    if (dbOrder) order = dbOrder;
  }

  // Uniform 404 response if order not found OR phone does not match
  // (Prevents attackers from probing which order numbers exist)
  if (!order) {
    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: 'No matching order found for the provided order number and phone number.',
    });
    return;
  }

  const orderPhone1 = (order.guest_phone || '').replace(/\D/g, '').slice(-10);
  const orderPhone2 = (order.address_snapshot?.recipient_phone || '').replace(/\D/g, '').slice(-10);

  if (cleanInputPhone !== orderPhone1 && cleanInputPhone !== orderPhone2) {
    res.status(404).json({
      error: 'ORDER_NOT_FOUND',
      message: 'No matching order found for the provided order number and phone number.',
    });
    return;
  }

  // If order is in PENDING_PAYMENT with provider_order_id, reconcile with Cashfree
  if (order.status === 'PENDING_PAYMENT' && order.payment_method === 'ONLINE' && order.provider_order_id) {
    try {
      const gatewayDetails = await fetchCashfreeOrderDetails(order.provider_order_id);
      if (gatewayDetails.status === 'PAID') {
        const confirmResult = await confirmOrderPayment({
          orderIdOrProviderId: order.id,
          providerOrderId: order.provider_order_id,
          paymentAmount: gatewayDetails.orderAmount,
          currency: gatewayDetails.orderCurrency,
          source: 'STATUS_POLL',
        });
        if (confirmResult.success && confirmResult.order) {
          order = confirmResult.order;
        }
      }
    } catch (reconcileErr: any) {
      console.warn(`[GuestStatus] Reconcile error: ${reconcileErr.message}`);
    }
  }

  // Mask recipient phone for privacy: e.g. "******7890"
  const rawRecipientPhone = order.address_snapshot?.recipient_phone || order.guest_phone || '';
  const digits = rawRecipientPhone.replace(/\D/g, '');
  const maskedPhone = digits.length >= 4 ? `******${digits.slice(-4)}` : '******';

  // Return safe sanitized projection
  res.json({
    success: true,
    order: {
      order_number: order.order_number,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      placed_at: order.placed_at,
      total_amount: order.total_amount,
      subtotal: order.subtotal,
      discount_amount: order.discount_amount || 0,
      delivery_charge: order.delivery_charge || 0,
      coupon_code: order.coupon_code,
      recipient_name: order.address_snapshot?.recipient_name,
      recipient_phone_masked: maskedPhone,
      address_snapshot: order.address_snapshot ? {
        recipient_name: order.address_snapshot.recipient_name,
        street_address: order.address_snapshot.street_address,
        landmark: order.address_snapshot.landmark,
        city: order.address_snapshot.city,
        state: order.address_snapshot.state,
        pincode: order.address_snapshot.pincode,
      } : undefined,
      slot_snapshot: order.slot_snapshot,
      items: (order.items || []).map((item) => ({
        product_name: item.product_name,
        variant_label: item.variant_label,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      is_paid: order.payment_status === 'CAPTURED',
      tracking_status: order.status,
    },
  });
});

// PATCH /api/orders/:id/status - Server-side Order State Machine
router.patch('/orders/:id/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status: targetStatus, reason } = req.body;

  const order = inMemoryStore.orders.get(id) || Array.from(inMemoryStore.orders.values()).find((o) => o.order_number === id);

  if (!order) {
    res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
    return;
  }

  const currentStatus = order.status;
  const nextStatus = targetStatus as OrderStatus;

  // 1. Customer Cancel Rule: Only allowed if status is PLACED or CONFIRMED
  const isCustomer = req.user?.role === 'CUSTOMER';
  if (isCustomer) {
    if (order.user_id && order.user_id !== req.user?.id) {
      res.status(404).json({ error: 'ORDER_NOT_FOUND', message: 'Order not found' });
      return;
    }

    if (nextStatus !== 'CANCELLED') {
      res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Customers are only permitted to cancel pending orders.',
      });
      return;
    }

    if (currentStatus !== 'PLACED' && currentStatus !== 'CONFIRMED') {
      res.status(409).json({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Order #${order.order_number} has already entered kitchen preparation (${currentStatus}) and cannot be cancelled.`,
      });
      return;
    }
  }

  // 2. State Machine Transition Graph Check
  const allowedNext = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(nextStatus)) {
    res.status(409).json({
      error: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition order status from '${currentStatus}' to '${nextStatus}'. Valid next states: [${allowedNext.join(', ')}]`,
    });
    return;
  }

  // 3. Update timestamps
  const nowIso = new Date().toISOString();
  order.status = nextStatus;
  order.updated_at = nowIso;

  if (nextStatus === 'CONFIRMED') order.confirmed_at = nowIso;
  else if (nextStatus === 'PREPARING') order.preparing_at = nowIso;
  else if (nextStatus === 'READY_FOR_PICKUP') order.ready_at = nowIso;
  else if (nextStatus === 'OUT_FOR_DELIVERY') order.out_for_delivery_at = nowIso;
  else if (nextStatus === 'DELIVERED') {
    order.delivered_at = nowIso;
    order.payment_status = 'CAPTURED';
  } else if (nextStatus === 'CANCELLED') {
    order.cancelled_at = nowIso;
    // Release delivery slot booked_count
    const slot = inMemoryStore.deliverySlots.get(order.delivery_slot_id);
    if (slot && slot.booked_count > 0) {
      slot.booked_count -= 1;
      inMemoryStore.deliverySlots.set(slot.id, slot);
    }
  }

  
  if (!isLiveSupabase || !supabaseServer) {
    res.status(503).json({ error: 'DB_UNAVAILABLE', message: 'Database not available' });
    return;
  }

  const updates: any = {
    status: nextStatus,
    updated_at: nowIso,
  };
  if (nextStatus === 'CONFIRMED') updates.confirmed_at = nowIso;
  else if (nextStatus === 'PREPARING') updates.preparing_at = nowIso;
  else if (nextStatus === 'READY_FOR_PICKUP') updates.ready_at = nowIso;
  else if (nextStatus === 'OUT_FOR_DELIVERY') updates.out_for_delivery_at = nowIso;
  else if (nextStatus === 'DELIVERED') {
    updates.delivered_at = nowIso;
    updates.payment_status = 'CAPTURED';
  } else if (nextStatus === 'CANCELLED') {
    updates.cancelled_at = nowIso;
  }

  const { error } = await supabaseServer.from('orders').update(updates).eq('id', order.id);
  if (error) {
    console.error('Order status update failed:', error);
    res.status(500).json({ error: 'DB_WRITE_FAILED', message: error.message });
    return;
  }

  inMemoryStore.orders.set(order.id, order);


  logAuditEvent(req.user, 'ORDER_STATUS_CHANGED', 'ORDER', order.id, {
    orderNumber: order.order_number,
    from: currentStatus,
    to: nextStatus,
    reason: reason || undefined,
  });

  // Notify customer of order status transition (email + in-app notification)
  notifyOrderStatusChanged(order, currentStatus, nextStatus).catch((err) =>
    console.error('[Notification Dispatch Error]:', err)
  );

  res.json({
    success: true,
    message: `Order #${order.order_number} status updated to ${nextStatus}`,
    order,
  });
});

export default router;
