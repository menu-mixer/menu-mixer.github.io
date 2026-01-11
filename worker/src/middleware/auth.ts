import { Env, JWTPayload, Tier, TIER_LIMITS, MonthlyUsage } from '../types';

// Simple base64url encoding/decoding
function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

// Simple JWT implementation for Cloudflare Workers
export async function createJWT(payload: JWTPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${encodedHeader}.${encodedPayload}`)
  );

  const encodedSignature = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = Uint8Array.from(
      base64urlDecode(encodedSignature),
      c => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(`${encodedHeader}.${encodedPayload}`)
    );

    if (!valid) return null;

    const payload = JSON.parse(base64urlDecode(encodedPayload)) as JWTPayload;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.toUpperCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function extractAuth(request: Request, env: Env): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  tier?: Tier;
  error?: string;
}> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { valid: false, error: 'Missing authorization header' };
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, env.JWT_SECRET);

  if (!payload) {
    return { valid: false, error: 'Invalid or expired token' };
  }

  return { valid: true, payload, tier: payload.tier };
}

export async function checkRateLimit(
  env: Env,
  inviteCodeHash: string,
  tier: Tier
): Promise<{ allowed: boolean; remaining: number; resetAt: string }> {
  const now = new Date();
  const monthKey = `${inviteCodeHash}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const limits = TIER_LIMITS[tier];
  if (limits.monthlyAiCalls === -1) {
    return { allowed: true, remaining: -1, resetAt: '' };
  }

  const usageData = await env.USAGE.get(monthKey);
  const usage: MonthlyUsage = usageData
    ? JSON.parse(usageData)
    : { aiCalls: 0, tokensUsed: 0, lastCall: '' };

  const remaining = limits.monthlyAiCalls - usage.aiCalls;
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    resetAt: nextMonth.toISOString(),
  };
}

export async function incrementUsage(
  env: Env,
  inviteCodeHash: string,
  tokensUsed: number = 0
): Promise<void> {
  const now = new Date();
  const monthKey = `${inviteCodeHash}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const usageData = await env.USAGE.get(monthKey);
  const usage: MonthlyUsage = usageData
    ? JSON.parse(usageData)
    : { aiCalls: 0, tokensUsed: 0, lastCall: '' };

  usage.aiCalls += 1;
  usage.tokensUsed += tokensUsed;
  usage.lastCall = now.toISOString();

  // TTL of 60 days to auto-cleanup old months
  await env.USAGE.put(monthKey, JSON.stringify(usage), { expirationTtl: 60 * 24 * 60 * 60 });
}
