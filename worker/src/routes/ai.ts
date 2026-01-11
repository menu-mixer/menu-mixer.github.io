import { Env, ParseRequest, OptimizeRequest, ChatRequest, ThemeRequest } from '../types';
import { extractAuth, checkRateLimit, incrementUsage } from '../middleware/auth';
import { corsHeaders } from '../middleware/cors';
import { parseRecipeFromText, parseRecipeFromImage, optimizeRecipes, themeRecipes, chat } from '../services/openai';

export async function handleParse(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await extractAuth(request, env);
  if (!auth.valid || !auth.payload) {
    return jsonResponse({ error: auth.error }, 401, request);
  }

  const rateLimit = await checkRateLimit(env, auth.payload.sub, auth.tier!);
  if (!rateLimit.allowed) {
    return jsonResponse({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    }, 429, request);
  }

  try {
    const body = await request.json() as ParseRequest;
    const { content, contentType } = body;

    if (!content) {
      return jsonResponse({ error: 'Content is required' }, 400, request);
    }

    let result;
    if (contentType === 'image') {
      result = await parseRecipeFromImage(env.OPENAI_API_KEY, content, 'image/jpeg');
    } else if (contentType === 'pdf') {
      result = await parseRecipeFromImage(env.OPENAI_API_KEY, content, 'application/pdf');
    } else {
      result = await parseRecipeFromText(env.OPENAI_API_KEY, content);
    }

    await incrementUsage(env, auth.payload.sub, result.tokensUsed);

    return jsonResponse({
      recipes: result.recipes,
      remaining: rateLimit.remaining - 1,
    }, 200, request);
  } catch (error) {
    console.error('Parse error:', error);
    return jsonResponse({ error: 'Failed to parse recipes' }, 500, request);
  }
}

export async function handleOptimize(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await extractAuth(request, env);
  if (!auth.valid || !auth.payload) {
    return jsonResponse({ error: auth.error }, 401, request);
  }

  const rateLimit = await checkRateLimit(env, auth.payload.sub, auth.tier!);
  if (!rateLimit.allowed) {
    return jsonResponse({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    }, 429, request);
  }

  try {
    const body = await request.json() as OptimizeRequest;
    const { type, recipes } = body;

    if (!type || !recipes?.length) {
      return jsonResponse({ error: 'Type and recipes are required' }, 400, request);
    }

    const result = await optimizeRecipes(env.OPENAI_API_KEY, type, recipes);
    await incrementUsage(env, auth.payload.sub, result.tokensUsed);

    return jsonResponse({
      result: result.result,
      remaining: rateLimit.remaining - 1,
    }, 200, request);
  } catch (error) {
    console.error('Optimize error:', error);
    return jsonResponse({ error: 'Failed to optimize recipes' }, 500, request);
  }
}

export async function handleTheme(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await extractAuth(request, env);
  if (!auth.valid || !auth.payload) {
    return jsonResponse({ error: auth.error }, 401, request);
  }

  const rateLimit = await checkRateLimit(env, auth.payload.sub, auth.tier!);
  if (!rateLimit.allowed) {
    return jsonResponse({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    }, 429, request);
  }

  try {
    const body = await request.json() as ThemeRequest;
    const { recipes, theme } = body;

    if (!recipes?.length || !theme) {
      return jsonResponse({ error: 'Recipes and theme are required' }, 400, request);
    }

    const result = await themeRecipes(env.OPENAI_API_KEY, recipes, theme);
    await incrementUsage(env, auth.payload.sub, result.tokensUsed);

    return jsonResponse({
      themedRecipes: result.themedRecipes,
      remaining: rateLimit.remaining - 1,
    }, 200, request);
  } catch (error) {
    console.error('Theme error:', error);
    return jsonResponse({ error: 'Failed to theme recipes' }, 500, request);
  }
}

export async function handleChat(
  request: Request,
  env: Env
): Promise<Response> {
  const auth = await extractAuth(request, env);
  if (!auth.valid || !auth.payload) {
    return jsonResponse({ error: auth.error }, 401, request);
  }

  const rateLimit = await checkRateLimit(env, auth.payload.sub, auth.tier!);
  if (!rateLimit.allowed) {
    return jsonResponse({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    }, 429, request);
  }

  try {
    const body = await request.json() as ChatRequest;
    const { messages, context } = body;

    if (!messages?.length) {
      return jsonResponse({ error: 'Messages are required' }, 400, request);
    }

    const result = await chat(env.OPENAI_API_KEY, messages, context);
    await incrementUsage(env, auth.payload.sub, result.tokensUsed);

    return jsonResponse({
      response: result.response,
      remaining: rateLimit.remaining - 1,
    }, 200, request);
  } catch (error) {
    console.error('Chat error:', error);
    return jsonResponse({ error: 'Failed to process chat' }, 500, request);
  }
}

function jsonResponse(data: unknown, status: number, request: Request): Response {
  const headers = corsHeaders(request);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers });
}
