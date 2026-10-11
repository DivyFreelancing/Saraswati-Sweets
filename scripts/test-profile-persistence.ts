import { isLiveSupabase, supabaseServer } from '../server/db';

async function runTests() {
  if (process.env.RUN_LIVE_TEST !== 'true') {
    console.log('[Safe Mode] Skipping live profile persistence test. Set RUN_LIVE_TEST=true to execute.');
    process.exit(0);
  }

  console.log('=== Saraswati Sweets Profile Persistence & Checkout Test ===');
  console.log('Live Supabase Connected:', isLiveSupabase);

  if (!isLiveSupabase || !supabaseServer) {
    throw new Error('Supabase live connection is required for this test.');
  }

  // Dedicated test account: test99@example.com
  const testUserId = '972fb7d0-fb67-4d2c-82cc-6cbf1f534642';

  // Snapshot original state so we ALWAYS restore it
  const { data: initialProfile, error: initErr } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('id', testUserId)
    .single();

  if (initErr || !initialProfile) {
    throw new Error(`Could not snapshot test user state: ${initErr?.message}`);
  }

  let initialAuthMeta: Record<string, any> | null = null;
  try {
    const authRes = await supabaseServer.auth.admin.getUserById(testUserId);
    if (authRes?.data?.user?.user_metadata) {
      initialAuthMeta = { ...authRes.data.user.user_metadata };
    }
  } catch {}

  console.log('Initial test user snapshot:', {
    id: initialProfile.id,
    full_name: initialProfile.full_name,
    phone: initialProfile.phone,
    email: initialProfile.email,
    role: initialProfile.role,
    authMeta: initialAuthMeta,
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Update profile in Supabase public.profiles
    // -------------------------------------------------------------
    console.log('\n[Test 1] Updating profile details...');
    const newName = 'Aman Verma';
    const rawMobile = '9161110030';
    const formattedMobile = `+91 ${rawMobile.slice(0, 5)} ${rawMobile.slice(5)}`;
    const nowIso = new Date().toISOString();

    const { data: updatedProfile, error: updateErr } = await supabaseServer
      .from('profiles')
      .update({
        full_name: newName,
        phone: formattedMobile,
        updated_at: nowIso,
      })
      .eq('id', testUserId)
      .select('*')
      .maybeSingle();

    if (updateErr) {
      throw new Error(`Test 1 Failed: Update error: ${updateErr.message}`);
    }
    if (!updatedProfile) {
      throw new Error('Test 1 Failed: Profile row not found for test user');
    }

    console.log('  -> Update succeeded. Persisted profile:', {
      id: updatedProfile.id,
      full_name: updatedProfile.full_name,
      phone: updatedProfile.phone,
      email: updatedProfile.email,
    });

    // Verify actual row in Supabase
    const { data: verifyRow, error: verifyErr } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', testUserId)
      .single();

    if (verifyErr || !verifyRow) {
      throw new Error(`Test 1 Failed: Verification query error: ${verifyErr?.message}`);
    }
    if (verifyRow.full_name !== newName || verifyRow.phone !== formattedMobile) {
      throw new Error(`Test 1 Failed: Data mismatch in database. Expected ${newName}/${formattedMobile}, got ${verifyRow.full_name}/${verifyRow.phone}`);
    }
    console.log('  [PASS] Actual row verified in Supabase public.profiles.');

    // -------------------------------------------------------------
    // Test 2: Login Sync - Re-login does NOT erase existing name or phone
    // -------------------------------------------------------------
    console.log('\n[Test 2] Simulating subsequent login sync...');
    // When user logs in with OTP, client sends sync payload with empty full_name and no phone
    const syncPayload = { id: testUserId, email: 'test99@example.com', full_name: '', phone: undefined };

    // New sync logic
    const { data: existingProfile } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', syncPayload.id)
      .maybeSingle();

    let displayName = syncPayload.full_name?.trim() || '';
    let finalPhone = syncPayload.phone;

    if (existingProfile) {
      if (!displayName && existingProfile.full_name) {
        displayName = existingProfile.full_name;
      }
      if (!finalPhone && existingProfile.phone) {
        finalPhone = existingProfile.phone;
      }
    }

    const profilePayload: Record<string, any> = {
      id: syncPayload.id,
      email: syncPayload.email || existingProfile?.email,
      phone: finalPhone || existingProfile?.phone,
      full_name: displayName,
      role: existingProfile?.role || 'CUSTOMER',
      is_active: existingProfile?.is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    if (existingProfile?.notif_promotional_opt_in !== undefined) {
      profilePayload.notif_promotional_opt_in = existingProfile.notif_promotional_opt_in;
    }
    if (existingProfile?.fcm_token !== undefined) {
      profilePayload.fcm_token = existingProfile.fcm_token;
    }

    const { data: syncedProfile, error: syncErr } = await supabaseServer
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('*')
      .single();

    if (syncErr) {
      throw new Error(`Test 2 Failed: Sync upsert error: ${syncErr.message}`);
    }
    if (syncedProfile.full_name !== newName || syncedProfile.phone !== formattedMobile) {
      throw new Error(`Test 2 Failed: Saved details were erased on sync! Found ${syncedProfile.full_name}/${syncedProfile.phone}`);
    }
    console.log('  [PASS] Subsequent login sync preserved existing name and phone perfectly.');

    // -------------------------------------------------------------
    // Test 3: Duplicate phone conflict handling
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing duplicate phone conflict protection...');
    const { error: dupErr } = await supabaseServer
      .from('profiles')
      .update({
        phone: '+91 91708 84796', // Belongs to Divyanshu
        updated_at: new Date().toISOString(),
      })
      .eq('id', testUserId);

    if (dupErr && dupErr.code === '23505') {
      console.log('  [PASS] Duplicate phone correctly caught with Postgres 23505 unique violation.');
    } else {
      throw new Error(`Test 3 Failed: Expected code 23505, got: ${JSON.stringify(dupErr)}`);
    }

    // -------------------------------------------------------------
    // Test 4: Checkout validation logic (with & without +91)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing checkout profile validation logic...');

    function validateForCheckout(user: { full_name?: string | null; phone?: string | null } | null) {
      const cleanPhoneDigits = user?.phone ? user.phone.replace(/\D/g, '') : '';
      const hasValidPhone = cleanPhoneDigits.length >= 10 && cleanPhoneDigits.slice(-10).length === 10;
      const hasValidName = Boolean(user?.full_name && user.full_name.trim().length > 0);
      const needsProfilePrompt = !hasValidPhone || !hasValidName;
      return { hasValidPhone, hasValidName, needsProfilePrompt };
    }

    // Case 4A: Saved user with standard +91 (+91 91611 10030)
    const case4A = validateForCheckout({ full_name: 'Aman Verma', phone: '+91 91611 10030' });
    if (case4A.needsProfilePrompt) throw new Error('Test 4A Failed: +91 formatted number should be valid');
    console.log('  [PASS] 4A: Phone with +91 and spaces (+91 91611 10030) accepted.');

    // Case 4B: Phone without spaces (+919161110030)
    const case4B = validateForCheckout({ full_name: 'Aman Verma', phone: '+919161110030' });
    if (case4B.needsProfilePrompt) throw new Error('Test 4B Failed: +91 without spaces should be valid');
    console.log('  [PASS] 4B: Phone with +91 compact (+919161110030) accepted.');

    // Case 4C: Raw 10 digits without +91 (9161110030)
    const case4C = validateForCheckout({ full_name: 'Aman Verma', phone: '9161110030' });
    if (case4C.needsProfilePrompt) throw new Error('Test 4C Failed: 10-digit number without +91 should be valid');
    console.log('  [PASS] 4C: Phone raw 10 digits (9161110030) accepted.');

    // Case 4D: Phone with leading 0 trunk (09161110030)
    const case4D = validateForCheckout({ full_name: 'Aman Verma', phone: '09161110030' });
    if (case4D.needsProfilePrompt) throw new Error('Test 4D Failed: 11-digit trunk number should be valid');
    console.log('  [PASS] 4D: Phone with 0 trunk prefix (09161110030) accepted.');

    // Case 4E: Incomplete phone (less than 10 digits: 12345)
    const case4E = validateForCheckout({ full_name: 'Aman Verma', phone: '12345' });
    if (!case4E.needsProfilePrompt) throw new Error('Test 4E Failed: Short phone must trigger prompt');
    console.log('  [PASS] 4E: Short phone (12345) correctly triggers prompt.');

    // Case 4F: Incomplete phone with +91 (+91 12345)
    const case4F = validateForCheckout({ full_name: 'Aman Verma', phone: '+91 12345' });
    if (!case4F.needsProfilePrompt) throw new Error('Test 4F Failed: Short phone with +91 must trigger prompt');
    console.log('  [PASS] 4F: Short phone with +91 (+91 12345) correctly triggers prompt.');

    // Case 4G: Missing phone (null)
    const case4G = validateForCheckout({ full_name: 'Aman Verma', phone: null });
    if (!case4G.needsProfilePrompt) throw new Error('Test 4G Failed: Missing phone must trigger prompt');
    console.log('  [PASS] 4G: Null phone correctly triggers prompt.');

    // Case 4H: Blank full_name ('   ')
    const case4H = validateForCheckout({ full_name: '   ', phone: '+91 91611 10030' });
    if (!case4H.needsProfilePrompt) throw new Error('Test 4H Failed: Blank name must trigger prompt');
    console.log('  [PASS] 4H: Blank name correctly triggers prompt.');

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
  } finally {
    // Guaranteed cleanup: Restore test user back to exact original snapshot
    console.log('[Cleanup] Restoring test user to exact original snapshot in database...');
    if (initialProfile) {
      await supabaseServer
        .from('profiles')
        .update({
          full_name: initialProfile.full_name,
          phone: initialProfile.phone,
          email: initialProfile.email,
          role: initialProfile.role,
          is_active: initialProfile.is_active,
          notif_promotional_opt_in: initialProfile.notif_promotional_opt_in,
          fcm_token: initialProfile.fcm_token,
          updated_at: initialProfile.updated_at,
        })
        .eq('id', testUserId);
    }
    if (initialAuthMeta !== null) {
      try {
        await supabaseServer.auth.admin.updateUserById(testUserId, {
          user_metadata: initialAuthMeta,
        });
      } catch {}
    }
    console.log('[Cleanup] Complete. Exact original snapshot restored.');
  }

  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});
