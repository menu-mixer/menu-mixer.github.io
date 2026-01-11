import { ParsedRecipe } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | { type: string; text?: string; image_url?: { url: string } }[];
}

interface OpenAIResponse {
  choices: { message: { content: string } }[];
  usage?: { total_tokens: number };
}

export async function callOpenAI(
  apiKey: string,
  messages: OpenAIMessage[],
  model: string = 'gpt-4o'
): Promise<{ content: string; tokensUsed: number }> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as OpenAIResponse;
  return {
    content: data.choices[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens || 0,
  };
}

export async function parseRecipeFromText(
  apiKey: string,
  content: string
): Promise<{ recipes: ParsedRecipe[]; tokensUsed: number }> {
  const systemPrompt = `You are a recipe parsing assistant. Extract all recipes from the provided content.

For each recipe, return a JSON object with:
- name: Recipe title
- ingredients: Array of {item, quantity} objects
- instructions: Step-by-step preparation instructions as a string
- prepTime: Prep time in minutes (if mentioned, otherwise null)
- assemblyTime: Assembly/cooking time in minutes (if mentioned, otherwise null)
- cost: Estimated ingredient cost in dollars (if mentioned, otherwise null)
- tags: Array of applicable dietary tags from: vegan, vegetarian, gluten-free, nut-free, dairy-free
- description: A short customer-facing description
- confidence: 0-1 score for how confident you are in the extraction

Return a JSON array of recipes. If no recipes found, return [].
Only return valid JSON, no markdown or explanation.`;

  const { content: responseContent, tokensUsed } = await callOpenAI(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Extract recipes from:\n\n${content}` },
  ]);

  try {
    const recipes = JSON.parse(responseContent) as ParsedRecipe[];
    return { recipes, tokensUsed };
  } catch {
    // Try to extract JSON from response
    const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return { recipes: JSON.parse(jsonMatch[0]), tokensUsed };
    }
    return { recipes: [], tokensUsed };
  }
}

export async function parseRecipeFromImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{ recipes: ParsedRecipe[]; tokensUsed: number }> {
  const systemPrompt = `You are a recipe parsing assistant. Extract all recipes from the provided image or document.

For each recipe, return a JSON object with:
- name: Recipe title
- ingredients: Array of {item, quantity} objects
- instructions: Step-by-step preparation instructions as a string
- prepTime: Prep time in minutes (if visible, otherwise null)
- assemblyTime: Assembly/cooking time in minutes (if visible, otherwise null)
- cost: Estimated ingredient cost in dollars (if mentioned, otherwise null)
- tags: Array of applicable dietary tags from: vegan, vegetarian, gluten-free, nut-free, dairy-free
- description: A short customer-facing description
- confidence: 0-1 score for how confident you are in the extraction

Return a JSON array of recipes. If no recipes found, return [].
Only return valid JSON, no markdown or explanation.`;

  const { content: responseContent, tokensUsed } = await callOpenAI(apiKey, [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract recipes from this:' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } }
      ]
    },
  ], 'gpt-4o');

  try {
    const recipes = JSON.parse(responseContent) as ParsedRecipe[];
    return { recipes, tokensUsed };
  } catch {
    const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return { recipes: JSON.parse(jsonMatch[0]), tokensUsed };
    }
    return { recipes: [], tokensUsed };
  }
}

export async function optimizeRecipes(
  apiKey: string,
  type: string,
  recipes: ParsedRecipe[]
): Promise<{ result: unknown; tokensUsed: number }> {
  const prompts: Record<string, string> = {
    dedupe: `Analyze these recipes for duplicates or near-duplicates. Return JSON:
{
  "duplicateGroups": [
    { "recipeNames": ["name1", "name2"], "similarity": 0.95, "suggestion": "Merge suggestion" }
  ]
}`,
    ingredients: `Analyze ingredient usage across these recipes. Return JSON:
{
  "sharedIngredients": [{ "ingredient": "name", "usedIn": ["recipe1", "recipe2"] }],
  "suggestions": [{ "suggestion": "text", "reasoning": "why" }]
}`,
    dietary: `Analyze dietary coverage of this menu. Return JSON:
{
  "coverage": { "vegan": 2, "vegetarian": 4, "gluten-free": 1, "nut-free": 3, "dairy-free": 2 },
  "gaps": ["gluten-free needs more options"],
  "suggestions": [{ "gap": "gluten-free", "suggestion": "Consider adding..." }]
}`,
    cost: `Analyze costs and suggest optimizations. Return JSON:
{
  "totalCost": 127.50,
  "highestCost": { "name": "recipe", "cost": 15.00 },
  "suggestions": [{ "recipe": "name", "currentCost": 15, "suggestion": "swap X for Y", "savings": 3 }]
}`,
  };

  const { content, tokensUsed } = await callOpenAI(apiKey, [
    { role: 'system', content: prompts[type] || 'Analyze these recipes.' },
    { role: 'user', content: JSON.stringify(recipes, null, 2) },
  ]);

  try {
    return { result: JSON.parse(content), tokensUsed };
  } catch {
    return { result: { raw: content }, tokensUsed };
  }
}

export async function themeRecipes(
  apiKey: string,
  recipes: ParsedRecipe[],
  theme: string
): Promise<{ themedRecipes: { original: string; themed: { name: string; description: string } }[]; tokensUsed: number }> {
  const systemPrompt = `You are a creative menu consultant. Re-theme these recipes for "${theme}".

For each recipe, create a themed version with:
- A creative new name that fits the theme
- An updated description that matches the theme vibe

Return JSON array:
[
  { "original": "Original Recipe Name", "themed": { "name": "Themed Name", "description": "Themed description" } }
]`;

  const { content, tokensUsed } = await callOpenAI(apiKey, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(recipes.map(r => ({ name: r.name, description: r.description })), null, 2) },
  ]);

  try {
    return { themedRecipes: JSON.parse(content), tokensUsed };
  } catch {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return { themedRecipes: JSON.parse(jsonMatch[0]), tokensUsed };
    }
    return { themedRecipes: [], tokensUsed };
  }
}

function extractIngredientSummary(recipes: ParsedRecipe[]): string {
  const ingredientCount = new Map<string, number>();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const item = ing.item.toLowerCase();
      ingredientCount.set(item, (ingredientCount.get(item) || 0) + 1);
    }
  }
  // Get ingredients used in 2+ recipes (shared ingredients)
  const shared = [...ingredientCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([item]) => item);
  return shared.join(', ');
}

export async function chat(
  apiKey: string,
  messages: { role: string; content: string }[],
  context?: { recipes: ParsedRecipe[]; activeMenu: string[] }
): Promise<{ response: string; tokensUsed: number }> {
  const sharedIngredients = context ? extractIngredientSummary(context.recipes) : '';

  const systemPrompt = `You are a helpful menu planning assistant for Menu Mixer, an app for bakers, cafe owners, and caterers.

${context ? `Context:
- User has ${context.recipes.length} recipes in their library
- Active menu has ${context.activeMenu.length} items
- Recipe names: ${context.recipes.map(r => r.name).join(', ')}
- Ingredients already in use: ${sharedIngredients || 'none yet'}

Full recipe data with ingredients is available - when users ask to create dishes using existing ingredients, reference ingredients from their current recipes.` : ''}

You can help with:
- Finding recipes by ingredient or dietary requirement
- Suggesting additions to balance a menu
- Answering questions about recipes
- Generating new recipe ideas that reuse ingredients from existing recipes

When suggesting recipes that exist in their library, reference them by name.
When generating new recipe ideas, format as JSON if asked.
When asked to create dishes using existing ingredients, focus on ingredients already in their menu to minimize waste and inventory.`;

  const apiMessages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  const { content, tokensUsed } = await callOpenAI(apiKey, apiMessages);
  return { response: content, tokensUsed };
}
