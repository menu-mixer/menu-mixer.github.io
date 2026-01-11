const ALLOWED_ORIGINS = [
  'https://menu-mixer.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
];

export function corsHeaders(request: Request): Headers {
  const origin = request.headers.get('Origin') || '';
  const headers = new Headers();

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return headers;
}

export function handleCors(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }
  return null;
}
