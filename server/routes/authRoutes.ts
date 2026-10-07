import { randomUUID } from 'crypto';
import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../authMiddleware';
import { supabaseServer, isLiveSupabase, inMemoryStore, ServerProfile } from '../db';

const router = Router();

// GET /api/auth/profile - Fetch current authenticated profile
router.get('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json({
    profile: req.user,
  });
});

// PUT /api/auth/profile - Update user profile (name, phone)
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { full_name, phone } = req.body;
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }

  const cleanName = typeof full_name === 'string' ? full_name.trim() : '';
  if (cleanName) {
    req.user.full_name = cleanName;
  }

  if (typeof phone === 'string') {
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length === 10) {
      req.user.phone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
    }
  }

  req.user.updated_at = new Date().toISOString();

  // Save to in-memory store under canonical id and alias tokens
  inMemoryStore.profiles.set(req.user.id, req.user);
  if (req.user.phone) {
    const rawClean = req.user.phone.replace(/\D/g, '').slice(-10);
    
  }

  // Also sync to Supabase if live
  if (isLiveSupabase && supabaseServer) {
    try {
      await supabaseServer.from('profiles').upsert(req.user, { onConflict: 'id' });
    } catch (err) {
      console.warn('Supabase profile update warning:', err);
    }
  }

  res.json({ success: true, profile: req.user });
});

// POST /api/auth/sync - Sync profile row on first login
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

  if (!id) {
    res.status(400).json({ error: 'MISSING_ID', message: 'User ID is required' });
    return;
  }

  const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : '';
  const formattedPhone = cleanPhone ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}` : phone;

  // Bug #2 Fix: Never generate a placeholder name.
  const displayName = full_name?.trim() || (email ? email.split('@')[0] : '');

  let finalRole = req.user!.role || 'CUSTOMER';
  let finalCreatedAt = new Date().toISOString();

  if (isLiveSupabase && supabaseServer) {
    try {
      // First check if profile already exists to preserve role and created_at
      const { data: existingProfile } = await supabaseServer
        .from('profiles')
        .select('role, created_at')
        .eq('id', id)
        .single();
        
      if (existingProfile) {
        finalRole = existingProfile.role;
        finalCreatedAt = existingProfile.created_at;
      }
    } catch (e) {
      // ignore
    }
  }

  const profileData: ServerProfile = {
    id,
    email: email || undefined,
    phone: formattedPhone || undefined,
    full_name: displayName,
    role: finalRole,
    created_at: finalCreatedAt,
    updated_at: new Date().toISOString(),
  };

  if (isLiveSupabase && supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .single();

      if (!error && data) {
        res.json({ success: true, profile: data });
        return;
      }
    } catch (err) {
      console.warn('Supabase profile sync warning:', err);
    }
  }

  // Sync to in-memory store
  inMemoryStore.profiles.set(id, profileData);
  if (cleanPhone) {
    
  }
  res.json({ success: true, profile: profileData });
});



export default router;
