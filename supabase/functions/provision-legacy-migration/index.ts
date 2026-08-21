// ============================================================================
// ONE MORE RUSH — Supabase Edge Function: provision-legacy-migration
// Strictly server-authoritative provisioning boundary.
// Derives all economic values & cosmetics exclusively from server PostgreSQL
// state (rush_point_transactions, user_locker_items) of the verified source
// anonymous session. Never trusts client-reported amounts, cosmetics, or user_metadata.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CATALOG = {
  frames: ['classic', 'neon', 'cyber', 'inferno', 'void', 'one_more'],
  titles: ['rookie', 'one_more', 'speed_demon', 'reflex_master', 'hunter', 'rush_addict', 'legend'],
  effects: ['classic', 'confetti', 'neon_burst', 'starfall', 'lightning', 'glitch'],
  badges: ['first_play', 'one_more', 'high_score', 'sharpshooter', 'survivor', 'builder', 'memory_master', 'colorist'],
};

// UUID v4 validator
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing service_role key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Authenticate target user strictly from JWT token
    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user || !user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired player session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = user.id;

    // 2. Verify target user has NO established cloud transactions or prior conversions
    const { data: existingTx, error: txError } = await supabaseAdmin
      .from('rush_point_transactions')
      .select('id')
      .eq('user_id', targetUserId)
      .limit(1);

    if (txError) {
      return new Response(
        JSON.stringify({ error: 'Failed to verify account ledger state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingTx && existingTx.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Account already has an established cloud economy. Legacy migration is not applicable.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingConv } = await supabaseAdmin
      .from('guest_conversion_records')
      .select('user_id')
      .eq('user_id', targetUserId)
      .limit(1);

    if (existingConv && existingConv.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Account has already been converted.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request payload
    const body = await req.json();
    const { conversionIntentId, sourceAnonymousUserId } = body;

    const trimmedIntent = (conversionIntentId || '').trim();
    if (!trimmedIntent || trimmedIntent.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Invalid conversionIntentId: must be a valid non-empty intent identifier' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sourceAnonymousUserId || typeof sourceAnonymousUserId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing sourceAnonymousUserId in migration context' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Look up and strictly validate the SERVER-CREATED migration handoff in public.guest_migration_handoffs
    const { data: handoffList, error: handoffError } = await supabaseAdmin
      .from('guest_migration_handoffs')
      .select('id, source_anonymous_user_id, target_user_id, conversion_intent_id, status, expires_at, consumed_at')
      .eq('conversion_intent_id', trimmedIntent)
      .limit(1);

    if (handoffError) {
      return new Response(
        JSON.stringify({ error: 'Failed to query server migration handoff records' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!handoffList || handoffList.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Untrusted migration request: No server-created handoff found for this intent. (400)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const handoff = handoffList[0];

    // Strict validation of handoff relationships:
    if (handoff.source_anonymous_user_id !== sourceAnonymousUserId) {
      return new Response(
        JSON.stringify({ error: 'Untrusted migration request: Source user does not match server handoff record. (400)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (handoff.target_user_id !== targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Untrusted migration request: Target user does not match server handoff record. (400)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (handoff.status === 'consumed' || handoff.consumed_at) {
      return new Response(
        JSON.stringify({ error: 'Migration handoff has already been consumed. (400)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (handoff.status !== 'pending' && handoff.status !== 'provisioned') {
      return new Response(
        JSON.stringify({ error: `Invalid handoff status: ${handoff.status} (400)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(handoff.expires_at).getTime() <= Date.now()) {
      return new Response(
        JSON.stringify({ error: 'Migration handoff has expired. (400)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Verify source user is genuinely anonymous in Auth
    const { data: sourceUserRes, error: sourceUserError } = await supabaseAdmin.auth.admin.getUserById(sourceAnonymousUserId);
    if (sourceUserError || !sourceUserRes?.user) {
      return new Response(
        JSON.stringify({ error: 'Untrusted migration request: source anonymous identity does not exist in Supabase Auth' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sourceUser = sourceUserRes.user;
    const isSourceAnon = Boolean(
      sourceUser.is_anonymous ||
      sourceUser.app_metadata?.provider === 'anonymous'
    );

    if (!isSourceAnon) {
      return new Response(
        JSON.stringify({ error: 'Untrusted migration request: source identity is not an anonymous guest' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Check if active unconsumed authorization already exists in database (ONLY AFTER HANDOFF VALIDATION)
    const { data: existingAuth } = await supabaseAdmin
      .from('guest_migration_authorizations')
      .select('id, conversion_intent_id, expires_at, consumed_at')
      .eq('target_user_id', targetUserId)
      .eq('conversion_intent_id', trimmedIntent)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (existingAuth && existingAuth.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          authorizationId: existingAuth[0].id,
          conversionIntentId: trimmedIntent,
          message: 'Existing active authorization reused',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. DERIVE ECONOMIC VALUES & COSMETICS STRICTLY FROM SERVER POSTGRESQL STATE
    // Query source anonymous user's ledger transactions
    const { data: sourceTxList, error: sourceTxError } = await supabaseAdmin
      .from('rush_point_transactions')
      .select('amount, source')
      .eq('user_id', sourceAnonymousUserId);

    if (sourceTxError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve source guest economy from server ledger' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverBalance = (sourceTxList || []).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    // Query source anonymous user's locker items
    const { data: sourceLockerList, error: sourceLockerError } = await supabaseAdmin
      .from('user_locker_items')
      .select('category, item_key')
      .eq('user_id', sourceAnonymousUserId);

    if (sourceLockerError) {
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve source guest cosmetics from server inventory' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serverLockerItems: Record<string, string[]> = {};
    if (sourceLockerList && sourceLockerList.length > 0) {
      for (const item of sourceLockerList) {
        const cat = item.category?.toLowerCase();
        const key = item.item_key?.toLowerCase();
        if (CATALOG[cat] && CATALOG[cat].includes(key) && key !== 'classic' && key !== 'rookie') {
          if (!serverLockerItems[cat]) serverLockerItems[cat] = [];
          if (!serverLockerItems[cat].includes(key)) {
            serverLockerItems[cat].push(key);
          }
        }
      }
    }

    // FAIL-CLOSED: If the source user has NO server ledger activity or locker items in PostgreSQL,
    // client LocalStorage claims cannot be authorized by service_role!
    if (serverBalance <= 0 && Object.keys(serverLockerItems).length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Untrusted migration: No server-authoritative guest economy or transactions found for source user. LocalStorage claims cannot be authorized.',
          outcome: 'NO_SERVER_AUTHORIZATION',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Number.isSafeInteger(serverBalance) || serverBalance < 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid server-authoritative guest balance in ledger',
          outcome: 'INVALID_SERVER_BALANCE',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // FAIL-CLOSED: Strict 50,000 RP hard cap — serverBalance > 50,000 must be REJECTED, NEVER silently clamped
    if (serverBalance > 50000) {
      return new Response(
        JSON.stringify({
          error: `Server-authoritative guest balance (${serverBalance} RP) exceeds maximum allowable migration cap (50000 RP).`,
          outcome: 'EXCEEDS_CAP',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authorizedLegacyAmount = serverBalance;

    // 7. Invoke register_guest_migration_authorization using service_role with SERVER-DERIVED VALUES
    const { data: authId, error: rpcError } = await supabaseAdmin.rpc('register_guest_migration_authorization', {
      p_target_user_id: targetUserId,
      p_conversion_intent_id: trimmedIntent,
      p_legacy_amount: authorizedLegacyAmount,
      p_daily_visit_claimed: false,
      p_quick_win_claimed: false,
      p_extreme_claimed: false,
      p_streak: 0,
      p_locker_items: Object.keys(serverLockerItems).length > 0 ? serverLockerItems : null,
      p_expires_in_hours: 1,
    });

    if (rpcError) {
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark handoff status as provisioned (Monotonic guard: never overwrite if already consumed)
    await supabaseAdmin
      .from('guest_migration_handoffs')
      .update({ status: 'provisioned' })
      .eq('conversion_intent_id', trimmedIntent)
      .eq('status', 'pending')
      .is('consumed_at', null);

    return new Response(
      JSON.stringify({
        success: true,
        authorizationId: authId,
        conversionIntentId: trimmedIntent,
        authorizedAmount: authorizedLegacyAmount,
        expiresInHours: 1,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
