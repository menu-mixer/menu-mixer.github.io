import { Env, InviteCode, ValidateRequest, ValidateResponse, TIER_LIMITS, JWTPayload } from '../types';
import { hashCode, createJWT, verifyJWT, checkRateLimit } from '../middleware/auth';
import { corsHeaders } from '../middleware/cors';

export async function handleValidate(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = await request.json() as ValidateRequest;
    const { inviteCode } = body;

    if (!inviteCode) {
      return jsonResponse({ success: false, error: 'Invite code required' }, 400, request);
    }

    const codeHash = await hashCode(inviteCode);
    const storedData = await env.INVITE_CODES.get(codeHash);

    if (!storedData) {
      return jsonResponse({ success: false, error: 'Invalid invite code' }, 401, request);
    }

    const inviteData = JSON.parse(storedData) as InviteCode;

    if (!inviteData.isActive) {
      return jsonResponse({ success: false, error: 'Invite code has been deactivated' }, 401, request);
    }

    if (inviteData.expiresAt && new Date(inviteData.expiresAt) < new Date()) {
      return jsonResponse({ success: false, error: 'Invite code has expired' }, 401, request);
    }

    // Create JWT token
    const now = Math.floor(Date.now() / 1000);
    const payload: JWTPayload = {
      sub: codeHash,
      tier: inviteData.tier,
      iat: now,
      exp: now + (30 * 24 * 60 * 60), // 30 days
    };

    const token = await createJWT(payload, env.JWT_SECRET);

    // Get usage stats
    const rateLimit = await checkRateLimit(env, codeHash, inviteData.tier);
    const limits = TIER_LIMITS[inviteData.tier];

    const response: ValidateResponse = {
      success: true,
      token,
      tier: inviteData.tier,
      limits: {
        maxRecipes: limits.maxRecipes,
        maxAiCalls: limits.monthlyAiCalls,
        remainingAiCalls: rateLimit.remaining,
      },
      starterPackId: inviteData.starterPackId,
    };

    return jsonResponse(response, 200, request);
  } catch (error) {
    console.error('Validate error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, request);
  }
}

export async function handleRefresh(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ success: false, error: 'Missing token' }, 401, request);
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return jsonResponse({ success: false, error: 'Invalid or expired token' }, 401, request);
    }

    // Create new token with extended expiry
    const now = Math.floor(Date.now() / 1000);
    const newPayload: JWTPayload = {
      sub: payload.sub,
      tier: payload.tier,
      iat: now,
      exp: now + (30 * 24 * 60 * 60),
    };

    const newToken = await createJWT(newPayload, env.JWT_SECRET);
    const rateLimit = await checkRateLimit(env, payload.sub, payload.tier);
    const limits = TIER_LIMITS[payload.tier];

    return jsonResponse({
      success: true,
      token: newToken,
      tier: payload.tier,
      limits: {
        maxRecipes: limits.maxRecipes,
        maxAiCalls: limits.monthlyAiCalls,
        remainingAiCalls: rateLimit.remaining,
      },
    }, 200, request);
  } catch (error) {
    console.error('Refresh error:', error);
    return jsonResponse({ success: false, error: 'Internal server error' }, 500, request);
  }
}

export async function handleUsage(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing token' }, 401, request);
    }

    const token = authHeader.slice(7);
    const payload = await verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401, request);
    }

    const rateLimit = await checkRateLimit(env, payload.sub, payload.tier);
    const limits = TIER_LIMITS[payload.tier];

    return jsonResponse({
      tier: payload.tier,
      monthlyAiCalls: limits.monthlyAiCalls - rateLimit.remaining,
      monthlyLimit: limits.monthlyAiCalls,
      remainingCalls: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    }, 200, request);
  } catch (error) {
    console.error('Usage error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500, request);
  }
}

function jsonResponse(data: unknown, status: number, request: Request): Response {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers });
}
