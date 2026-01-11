import type { Recipe, RecipeRecord, RecipeMetadata, Ingredient, DietaryTag } from '@/types';

const VALID_TAGS: DietaryTag[] = ['vegan', 'vegetarian', 'gluten-free', 'nut-free', 'dairy-free'];

export function parseRecipeMarkdown(record: RecipeRecord): Recipe {
  const { markdown, id, createdAt, updatedAt } = record;
  const lines = markdown.split('\n');

  let name = '';
  const metadata: RecipeMetadata = { tags: [] };
  const ingredients: Ingredient[] = [];
  let description = '';
  let instructions = '';
  let notes = '';

  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse H1 as recipe name
    if (trimmed.startsWith('# ')) {
      name = trimmed.slice(2).trim();
      continue;
    }

    // Parse H2 as section headers
    if (trimmed.startsWith('## ')) {
      currentSection = trimmed.slice(3).trim().toLowerCase();
      continue;
    }

    // Skip empty lines
    if (!trimmed) continue;

    // Parse based on current section
    switch (currentSection) {
      case 'metadata':
        parseMetadataLine(trimmed, metadata);
        break;
      case 'ingredients':
        if (trimmed.startsWith('- ')) {
          ingredients.push(parseIngredient(trimmed.slice(2)));
        }
        break;
      case 'description':
        description += (description ? '\n' : '') + trimmed;
        break;
      case 'instructions':
        instructions += (instructions ? '\n' : '') + trimmed;
        break;
      case 'notes':
        notes += (notes ? '\n' : '') + trimmed;
        break;
    }
  }

  return {
    id,
    name,
    metadata,
    ingredients,
    description,
    instructions,
    notes: notes || undefined,
    raw: markdown,
    createdAt,
    updatedAt,
  };
}

function parseMetadataLine(line: string, metadata: RecipeMetadata): void {
  if (!line.startsWith('- ')) return;
  const content = line.slice(2);
  const colonIndex = content.indexOf(':');
  if (colonIndex === -1) return;

  const key = content.slice(0, colonIndex).trim().toLowerCase();
  const value = content.slice(colonIndex + 1).trim();

  switch (key) {
    case 'prep_time':
    case 'preptime':
      metadata.prepTime = parseInt(value, 10) || undefined;
      break;
    case 'assembly_time':
    case 'assemblytime':
      metadata.assemblyTime = parseInt(value, 10) || undefined;
      break;
    case 'cost':
    case 'ingredient_cost':
      metadata.ingredientCost = parseFloat(value) || undefined;
      break;
    case 'price':
    case 'menu_price':
      metadata.menuPrice = parseFloat(value) || undefined;
      break;
    case 'tags':
      metadata.tags = value
        .split(',')
        .map(t => t.trim().toLowerCase() as DietaryTag)
        .filter(t => VALID_TAGS.includes(t));
      break;
  }
}

function parseIngredient(raw: string): Ingredient {
  // Try to split quantity from item
  // Common patterns: "2 lbs butternut squash", "4 cups vegetable broth", "1/2 tsp salt"
  const match = raw.match(/^([\d\s\/½¼¾⅓⅔⅛]+\s*(?:lb|lbs|oz|cup|cups|tbsp|tsp|g|kg|ml|l|bunch|clove|cloves|can|cans|pkg)?s?)\s+(.+)$/i);

  if (match) {
    return {
      raw,
      quantity: match[1].trim(),
      item: match[2].trim(),
    };
  }

  return { raw, item: raw };
}

export function serializeRecipe(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.name}`);
  lines.push('');

  // Metadata section
  lines.push('## Metadata');
  if (recipe.metadata.prepTime) {
    lines.push(`- prep_time: ${recipe.metadata.prepTime}`);
  }
  if (recipe.metadata.assemblyTime) {
    lines.push(`- assembly_time: ${recipe.metadata.assemblyTime}`);
  }
  if (recipe.metadata.ingredientCost) {
    lines.push(`- cost: ${recipe.metadata.ingredientCost.toFixed(2)}`);
  }
  if (recipe.metadata.menuPrice) {
    lines.push(`- price: ${recipe.metadata.menuPrice.toFixed(2)}`);
  }
  if (recipe.metadata.tags.length > 0) {
    lines.push(`- tags: ${recipe.metadata.tags.join(', ')}`);
  }
  lines.push('');

  // Ingredients section
  lines.push('## Ingredients');
  for (const ing of recipe.ingredients) {
    lines.push(`- ${ing.raw}`);
  }
  lines.push('');

  // Description section
  lines.push('## Description');
  lines.push(recipe.description || '');
  lines.push('');

  // Instructions section
  lines.push('## Instructions');
  lines.push(recipe.instructions || '');

  // Notes section (optional)
  if (recipe.notes) {
    lines.push('');
    lines.push('## Notes');
    lines.push(recipe.notes);
  }

  return lines.join('\n');
}
