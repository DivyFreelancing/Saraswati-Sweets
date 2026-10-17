import { randomUUID } from 'crypto';
import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../authMiddleware';
import {
  supabaseServer,
  isLiveSupabase,
  inMemoryStore,
  ServerProfile,
  logConsentRecord,
  recordPrivacyRequest,
  ServerAddress,
  ServerOrder,
} from '../db';

const router = Router();

// GET /api/auth/profile - Fetch current authenticated profile
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (isLiveSupabase && supabaseServer && req.user?.id) {
    try {
      const { data: dbProfile, error } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', req.user.id)
        .maybeSingle();

      if (!error && dbProfile) {
        req.user = dbProfile as ServerProfile;
        inMemoryStore.profiles.set(req.user.id, req.user);
        res.json({ profile: req.user });
        return;
      }
    } catch (err) {
      console.warn('[Profile] Live profile fetch warning:', err);
    }
  }

  res.json({
    profile: req.user,
  });
});

// PUT /api/auth/profile - Update user profile (name, phone)
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { full_name, phone } = req.body;
  if (!req.user || !req.user.id) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  const currentUser = req.user;
  const cleanName = typeof full_name === 'string' ? full_name.trim() : '';
  if (!cleanName) {
    res.status(400).json({ error: 'INVALID_NAME', message: 'Full name is required.' });
    return;
  }

  const rawDigits = typeof phone === 'string' ? phone.replace(/\D/g, '').slice(-10) : '';
  if (rawDigits.length !== 10) {
    res.status(400).json({ error: 'INVALID_PHONE', message: 'A valid 10-digit mobile number is required.' });
    return;
  }
  const formattedPhone = `+91 ${rawDigits.slice(0, 5)} ${rawDigits.slice(5)}`;
  const nowIso = new Date().toISOString();

  // If Supabase is live, update public.profiles directly
  if (isLiveSupabase && supabaseServer) {
    try {
      const { data: updatedProfile, error: updateError } = await supabaseServer
        .from('profiles')
        .update({
          full_name: cleanName,
          phone: formattedPhone,
          updated_at: nowIso,
        })
        .eq('id', currentUser.id)
        .select('*')
        .maybeSingle();

      if (updateError) {
        console.error('[Profile] Supabase update error:', updateError);
        if (updateError.code === '23505') {
          res.status(409).json({
            error: 'PHONE_ALREADY_IN_USE',
            message: 'This mobile number is already registered to another account. Please use a unique mobile number.',
          });
          return;
        }
        res.status(500).json({
          error: 'DATABASE_ERROR',
          message: 'Failed to save profile in database. Please try again.',
        });
        return;
      }

      let finalProfile = updatedProfile;

      // If no row existed to update, insert the profile row
      if (!finalProfile) {
        const insertPayload = {
          id: currentUser.id,
          email: currentUser.email || null,
          full_name: cleanName,
          phone: formattedPhone,
          role: currentUser.role || 'CUSTOMER',
          is_active: true,
          created_at: currentUser.created_at || nowIso,
          updated_at: nowIso,
        };

        const { data: insertedProfile, error: insertError } = await supabaseServer
          .from('profiles')
          .insert([insertPayload])
          .select('*')
          .single();

        if (insertError) {
          console.error('[Profile] Supabase insert error:', insertError);
          if (insertError.code === '23505') {
            res.status(409).json({
              error: 'PHONE_ALREADY_IN_USE',
              message: 'This mobile number is already registered to another account.',
            });
            return;
          }
          res.status(500).json({
            error: 'DATABASE_ERROR',
            message: 'Failed to create profile row in database.',
          });
          return;
        }
        finalProfile = insertedProfile;
      }

      const mergedUser: ServerProfile = {
        ...currentUser,
        ...finalProfile,
        full_name: finalProfile.full_name,
        phone: finalProfile.phone,
      };
      req.user = mergedUser;
      inMemoryStore.profiles.set(currentUser.id, mergedUser);
      res.json({ success: true, profile: mergedUser });
      return;
    } catch (err: any) {
      console.error('[Profile] Unexpected update exception:', err);
      res.status(500).json({ error: 'SERVER_ERROR', message: 'Internal server error while saving profile.' });
      return;
    }
  }

  // Fallback for non-live Supabase / unit test mode
  currentUser.full_name = cleanName;
  currentUser.phone = formattedPhone;
  currentUser.updated_at = nowIso;
  inMemoryStore.profiles.set(currentUser.id, currentUser);
  res.json({ success: true, profile: currentUser });
});

// POST /api/auth/sync - Sync profile row on login while preserving existing data
router.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id, email, phone, full_name } = req.body;

  if (!id) {
    res.status(400).json({ error: 'MISSING_ID', message: 'User ID is required' });
    return;
  }

  // Ensure users can only sync their own profile
  if (req.user!.id !== id) {
    res.status(403).json({ error: 'FORBIDDEN', message: 'You can only sync your own profile' });
    return;
  }

  const cleanDigits = phone ? phone.replace(/\D/g, '').slice(-10) : '';
  let formattedPhone = cleanDigits.length === 10 ? `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}` : (phone || undefined);
  let displayName = full_name?.trim() || (email ? email.split('@')[0] : '');

  // Role security: default to CUSTOMER for new profiles; preserve existing role from database
  let finalRole: 'CUSTOMER' | 'STAFF' | 'ADMIN' = req.user?.role || 'CUSTOMER';
  let finalCreatedAt = new Date().toISOString();
  let existingProfile: any = null;

  if (isLiveSupabase && supabaseServer) {
    try {
      const { data } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      existingProfile = data;

      if (existingProfile) {
        finalRole = existingProfile.role || 'CUSTOMER';
        finalCreatedAt = existingProfile.created_at || finalCreatedAt;
        // CRITICAL: Preserve existing full_name and phone if incoming request didn't provide them!
        if (!displayName && existingProfile.full_name) {
          displayName = existingProfile.full_name;
        }
        if (!formattedPhone && existingProfile.phone) {
          formattedPhone = existingProfile.phone;
        }
      }
    } catch (e) {
      console.warn('[Sync] Existing profile check warning:', e);
    }
  }

  // If still no display name, check req.user or fall back to email prefix
  if (!displayName) {
    displayName = (req.user?.full_name?.trim()) || (email ? email.split('@')[0] : '');
  }
  if (!formattedPhone && req.user?.phone) {
    formattedPhone = req.user.phone;
  }

  const profilePayload: Record<string, any> = {
    id,
    email: email || existingProfile?.email || req.user?.email || undefined,
    phone: formattedPhone || existingProfile?.phone || undefined,
    full_name: displayName,
    role: finalRole,
    is_active: existingProfile?.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (existingProfile?.notif_promotional_opt_in !== undefined) {
    profilePayload.notif_promotional_opt_in = existingProfile.notif_promotional_opt_in;
  }
  if (existingProfile?.fcm_token !== undefined) {
    profilePayload.fcm_token = existingProfile.fcm_token;
  }

  if (!existingProfile) {
    profilePayload.created_at = finalCreatedAt;
  }

  if (isLiveSupabase && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select('*')
        .single();

      if (!error && data) {
        req.user = data as ServerProfile;
        inMemoryStore.profiles.set(id, req.user);
        res.json({ success: true, profile: data });
        return;
      }
      if (error) {
        console.warn('[Sync] Supabase profile upsert warning:', error);
      }
    } catch (err) {
      console.warn('[Sync] Supabase profile sync exception:', err);
    }
  }

  // Fallback to in-memory store
  const fallbackProfile: ServerProfile = {
    id,
    email: profilePayload.email,
    phone: profilePayload.phone,
    full_name: profilePayload.full_name,
    role: profilePayload.role,
    created_at: existingProfile?.created_at || finalCreatedAt,
    updated_at: profilePayload.updated_at,
  };
  inMemoryStore.profiles.set(id, fallbackProfile);
  req.user = fallbackProfile;
  res.json({ success: true, profile: fallbackProfile });
});

/**
 * GET /api/auth/preferences - Get communication & consent preferences (DPDP Act & CCPA)
 */
router.get('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const user = inMemoryStore.profiles.get(userId) || req.user!;

  let optIn = false;
  if (user.notif_promotional_opt_in !== undefined) {
    optIn = Boolean(user.notif_promotional_opt_in);
  } else if (user.promotional_emails_opt_in !== undefined) {
    optIn = Boolean(user.promotional_emails_opt_in);
  }

  // If live Supabase, read latest row
  if (isLiveSupabase && supabaseServer) {
    try {
      const { data } = await supabaseServer
        .from('profiles')
        .select('notif_promotional_opt_in')
        .eq('id', userId)
        .maybeSingle();
      if (data && data.notif_promotional_opt_in !== undefined) {
        optIn = Boolean(data.notif_promotional_opt_in);
      }
    } catch (e) {
      console.warn('[Preferences] Supabase fetch warning:', e);
    }
  }

  // Retrieve user's consent history
  const userConsents = inMemoryStore.consentLogs
    .filter((l) => l.userId === userId)
    .slice(-10);

  res.json({
    success: true,
    promotional_opt_in: optIn,
    consents: userConsents,
  });
});

/**
 * PUT /api/auth/preferences - Update communication preferences with server-side consent audit log
 */
router.put('/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { promotional_opt_in } = req.body;

  if (typeof promotional_opt_in !== 'boolean') {
    res.status(400).json({
      error: 'INVALID_PREFERENCE',
      message: 'promotional_opt_in must be a boolean (true or false).',
    });
    return;
  }

  const nowIso = new Date().toISOString();

  // Update in-memory profile
  const user = inMemoryStore.profiles.get(userId) || req.user!;
  user.notif_promotional_opt_in = promotional_opt_in;
  user.promotional_emails_opt_in = promotional_opt_in;
  user.updated_at = nowIso;
  inMemoryStore.profiles.set(userId, user);

  // If live Supabase, persist to database
  if (isLiveSupabase && supabaseServer) {
    try {
      await supabaseServer
        .from('profiles')
        .update({
          notif_promotional_opt_in: promotional_opt_in,
          updated_at: nowIso,
        })
        .eq('id', userId);
    } catch (e) {
      console.warn('[Preferences] Supabase update warning:', e);
    }
  }

  // Create immutable server-side audit log
  await logConsentRecord({
    userId,
    consentType: promotional_opt_in ? 'PROMOTIONAL_OPT_IN' : 'PROMOTIONAL_OPT_OUT',
    policyVersion: '2026-v1.0',
    status: promotional_opt_in ? 'ACCEPTED' : 'WITHDRAWN',
    source: 'PROFILE_PREFERENCES',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { timestamp: nowIso },
  });

  res.json({
    success: true,
    promotional_opt_in,
    message: promotional_opt_in
      ? 'Promotional notifications enabled. You can withdraw consent at any time.'
      : 'Promotional notifications disabled. Essential order notifications will still be delivered.',
  });
});

/**
 * POST /api/auth/consent-acknowledgement - Authoritatively records user acceptance of Terms & Privacy
 */
router.post('/consent-acknowledgement', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const { source, policy_version } = req.body;

  const validSource = typeof source === 'string' && source.trim() ? source.trim() : 'CHECKOUT';
  const version = typeof policy_version === 'string' && policy_version.trim() ? policy_version.trim() : '2026-v1.0';

  const log = await logConsentRecord({
    userId,
    consentType: 'TERMS_AND_PRIVACY_ACK',
    policyVersion: version,
    status: 'ACCEPTED',
    source: validSource,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({
    success: true,
    consent_id: log.id,
    policy_version: log.policyVersion,
    recorded_at: log.createdAt,
  });
});

/**
 * GET /api/auth/export-my-data - Right to Access: download customer's personal data (DPDP Act 2023)
 */
router.get('/export-my-data', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const profile = inMemoryStore.profiles.get(userId) || req.user!;

  // Fetch addresses belonging strictly to this user
  let userAddresses = Array.from(inMemoryStore.addresses.values()).filter(
    (a) => a.profile_id === userId
  );
  if (isLiveSupabase && supabaseServer && userAddresses.length === 0) {
    try {
      const { data } = await supabaseServer
        .from('addresses')
        .select('*')
        .eq('user_id', userId);
      if (data) userAddresses = data;
    } catch (e) {
      console.warn('[ExportData] Addresses fetch warning:', e);
    }
  }

  // Fetch orders belonging strictly to this user
  let userOrders = Array.from(inMemoryStore.orders.values()).filter(
    (o) => o.user_id === userId || (o as any).profile_id === userId
  );
  if (isLiveSupabase && supabaseServer && userOrders.length === 0) {
    try {
      const { data } = await supabaseServer
        .from('orders')
        .select('id, order_number, status, total_amount, payment_status, payment_method, placed_at, created_at')
        .eq('user_id', userId);
      if (data) userOrders = data as any;
    } catch (e) {
      console.warn('[ExportData] Orders fetch warning:', e);
    }
  }

  // Log data access request
  await logConsentRecord({
    userId,
    consentType: 'DATA_EXPORT_REQUEST',
    policyVersion: '2026-v1.0',
    status: 'SUBMITTED',
    source: 'PRIVACY_EXPORT_DESK',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const exportPayload = {
    metadata: {
      dataFiduciary: 'Saraswati Sweets Private Limited',
      fssaiLicense: '12714022000190',
      exportTimestamp: new Date().toISOString(),
      statutoryFramework: 'Digital Personal Data Protection Act, 2023 (Section 11 - Right to Access)',
    },
    userProfile: {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      promotionalOptIn: Boolean(profile.notif_promotional_opt_in),
      accountCreatedAt: profile.created_at,
    },
    savedAddresses: userAddresses.map((a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipient_name,
      recipientPhone: a.recipient_phone,
      streetAddress: a.street_address,
      landmark: a.landmark,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      isDefault: a.is_default,
    })),
    ordersHistory: userOrders.map((o) => ({
      orderNumber: o.order_number,
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      totalAmount: o.total_amount,
      placedAt: o.placed_at || o.created_at,
    })),
    consentRecords: inMemoryStore.consentLogs.filter((l) => l.userId === userId),
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="saraswati-sweets-privacy-data-${userId.slice(0, 8)}.json"`);
  res.status(200).json(exportPayload);
});

/**
 * POST /api/auth/privacy-request - Customer submits data correction, erasure, or grievance request
 */
router.post('/privacy-request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const user = inMemoryStore.profiles.get(userId) || req.user!;
  const { request_type, details } = req.body;

  const validTypes = ['DATA_ACCESS', 'DATA_CORRECTION', 'DATA_ERASURE', 'CONSENT_WITHDRAWAL', 'GRIEVANCE'];
  if (!request_type || !validTypes.includes(request_type)) {
    res.status(400).json({
      error: 'INVALID_REQUEST_TYPE',
      message: `request_type must be one of: ${validTypes.join(', ')}`,
    });
    return;
  }

  const cleanDetails = typeof details === 'string' ? details.trim() : '';
  if (!cleanDetails) {
    res.status(400).json({
      error: 'DETAILS_REQUIRED',
      message: 'Please provide specific details explaining your privacy request.',
    });
    return;
  }

  const record = await recordPrivacyRequest({
    userId,
    customerName: user.full_name || 'Customer',
    customerEmail: user.email || 'customer@example.com',
    customerPhone: user.phone,
    requestType: request_type,
    details: cleanDetails,
  });

  res.status(201).json({
    success: true,
    ticketNumber: record.ticketNumber,
    status: record.status,
    message: 'Your privacy request has been received. Our Grievance Officer will acknowledge within 48 hours and provide complete resolution within 30 days.',
  });
});

export default router;
