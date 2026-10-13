import { randomUUID } from 'crypto';
import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../authMiddleware';
import { supabaseServer, isLiveSupabase, inMemoryStore, ServerProfile } from '../db';

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



export default router;
