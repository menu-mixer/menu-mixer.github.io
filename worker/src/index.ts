import { Env } from './types';
import { handleCors, corsHeaders } from './middleware/cors';
import { handleValidate, handleRefresh, handleUsage } from './routes/auth';
import { handleParse, handleOptimize, handleTheme, handleChat } from './routes/ai';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check
    if (path === '/' || path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', version: '1.0.0' }), {
        headers: { 'Content-Type': 'application/json', ...Object.fromEntries(corsHeaders(request)) },
      });
    }

    // Route handling
    if (request.method === 'POST') {
      switch (path) {
        // Auth routes
        case '/auth/validate':
          return handleValidate(request, env);
        case '/auth/refresh':
          return handleRefresh(request, env);
        case '/auth/usage':
          return handleUsage(request, env);

        // AI routes
        case '/ai/parse':
          return handleParse(request, env);
        case '/ai/optimize':
          return handleOptimize(request, env);
        case '/ai/theme':
          return handleTheme(request, env);
        case '/ai/chat':
          return handleChat(request, env);
      }
    }

    // 404 for unknown routes
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...Object.fromEntries(corsHeaders(request)) },
    });
  },
};
