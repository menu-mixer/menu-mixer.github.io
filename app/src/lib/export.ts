import JSZip from 'jszip';
import type { Recipe, Menu, DietaryTag } from '@/types';

/**
 * Export recipes and menus to a zip file
 */
export async function exportToZip(
  recipes: Recipe[],
  menus: Menu[],
  options: { includeMenus?: boolean } = {}
): Promise<Blob> {
  const zip = new JSZip();
  const recipesFolder = zip.folder('recipes');

  // Export each recipe as markdown
  for (const recipe of recipes) {
    const markdown = recipeToMarkdown(recipe);
    const safeName = sanitizeFilename(recipe.name);
    recipesFolder?.file(`${safeName}.md`, markdown);
  }

  // Optionally export menus
  if (options.includeMenus && menus.length > 0) {
    const menusFolder = zip.folder('menus');
    for (const menu of menus) {
      const menuData = JSON.stringify(menu, null, 2);
      const safeName = sanitizeFilename(menu.name);
      menusFolder?.file(`${safeName}.json`, menuData);
    }
  }

  // Create manifest
  const manifest = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    recipeCount: recipes.length,
    menuCount: options.includeMenus ? menus.length : 0,
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

/**
 * Import recipes from a zip file
 */
export async function importFromZip(file: File): Promise<{
  recipes: ParsedRecipeImport[];
  menus: Menu[];
}> {
  const zip = await JSZip.loadAsync(file);
  const recipes: ParsedRecipeImport[] = [];
  const menus: Menu[] = [];

  // Process recipe files
  const recipesFolder = zip.folder('recipes');
  if (recipesFolder) {
    const files = recipesFolder.filter((_, f) => f.name.endsWith('.md'));
    for (const file of files) {
      const content = await file.async('string');
      const recipe = parseMarkdownRecipe(content);
      if (recipe) {
        recipes.push(recipe);
      }
    }
  }

  // Also check root for any .md files (backwards compatibility)
  const rootMdFiles = zip.filter((path, file) =>
    !file.dir && path.endsWith('.md') && !path.includes('/')
  );
  for (const file of rootMdFiles) {
    const content = await file.async('string');
    const recipe = parseMarkdownRecipe(content);
    if (recipe) {
      recipes.push(recipe);
    }
  }

  // Process menu files
  const menusFolder = zip.folder('menus');
  if (menusFolder) {
    const files = menusFolder.filter((_, f) => f.name.endsWith('.json'));
    for (const file of files) {
      const content = await file.async('string');
      try {
        const menu = JSON.parse(content) as Menu;
        menus.push(menu);
      } catch {
        // Skip invalid JSON
      }
    }
  }

  return { recipes, menus };
}

export interface ParsedRecipeImport {
  name: string;
  description: string;
  ingredients: { raw: string; quantity?: string; item: string }[];
  instructions: string;
  notes?: string;
  metadata: {
    prepTime?: number;
    assemblyTime?: number;
    ingredientCost?: number;
    tags: DietaryTag[];
  };
  raw: string;
}

/**
 * Convert a recipe to markdown format
 */
function recipeToMarkdown(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.name}`);
  lines.push('');

  if (recipe.description) {
    lines.push(recipe.description);
    lines.push('');
  }

  // Metadata
  const metaParts: string[] = [];
  if (recipe.metadata.prepTime) {
    metaParts.push(`Prep: ${recipe.metadata.prepTime}min`);
  }
  if (recipe.metadata.assemblyTime) {
    metaParts.push(`Assembly: ${recipe.metadata.assemblyTime}min`);
  }
  if (recipe.metadata.ingredientCost) {
    metaParts.push(`Cost: $${recipe.metadata.ingredientCost.toFixed(2)}`);
  }
  if (recipe.metadata.tags.length > 0) {
    metaParts.push(`Tags: ${recipe.metadata.tags.join(', ')}`);
  }
  if (metaParts.length > 0) {
    lines.push(`*${metaParts.join(' | ')}*`);
    lines.push('');
  }

  // Ingredients
  if (recipe.ingredients.length > 0) {
    lines.push('## Ingredients');
    lines.push('');
    for (const ing of recipe.ingredients) {
      lines.push(`- ${ing.raw}`);
    }
    lines.push('');
  }

  // Instructions
  if (recipe.instructions) {
    lines.push('## Instructions');
    lines.push('');
    lines.push(recipe.instructions);
    lines.push('');
  }

  // Notes
  if (recipe.notes) {
    lines.push('## Notes');
    lines.push('');
    lines.push(recipe.notes);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Parse markdown back to recipe structure
 */
const VALID_DIETARY_TAGS: DietaryTag[] = ['vegan', 'vegetarian', 'gluten-free', 'nut-free', 'dairy-free'];

function parseMarkdownRecipe(markdown: string): ParsedRecipeImport | null {
  const lines = markdown.split('\n');

  // Find title
  const titleLine = lines.find(l => l.startsWith('# '));
  if (!titleLine) return null;

  const name = titleLine.replace('# ', '').trim();
  let description = '';
  const ingredients: { raw: string; quantity?: string; item: string }[] = [];
  let instructions = '';
  let notes = '';
  const metadata: ParsedRecipeImport['metadata'] = { tags: [] as DietaryTag[] };

  let currentSection = 'description';
  let sectionContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip title
    if (line.startsWith('# ')) continue;

    // Check for section headers
    if (line.startsWith('## ')) {
      // Save previous section
      saveSectionContent(currentSection, sectionContent, { description: (d) => description = d, instructions: (d) => instructions = d, notes: (d) => notes = d, ingredients });
      sectionContent = [];

      const header = line.replace('## ', '').toLowerCase().trim();
      if (header.includes('ingredient')) {
        currentSection = 'ingredients';
      } else if (header.includes('instruction') || header.includes('method') || header.includes('direction')) {
        currentSection = 'instructions';
      } else if (header.includes('note')) {
        currentSection = 'notes';
      }
      continue;
    }

    // Parse metadata line (e.g., *Prep: 15min | Cost: $5.00 | Tags: vegan*)
    if (line.startsWith('*') && line.endsWith('*') && currentSection === 'description') {
      const metaContent = line.slice(1, -1);
      const parts = metaContent.split('|').map(p => p.trim());
      for (const part of parts) {
        if (part.toLowerCase().startsWith('prep:')) {
          const num = parseInt(part.replace(/\D/g, ''));
          if (!isNaN(num)) metadata.prepTime = num;
        } else if (part.toLowerCase().startsWith('assembly:')) {
          const num = parseInt(part.replace(/\D/g, ''));
          if (!isNaN(num)) metadata.assemblyTime = num;
        } else if (part.toLowerCase().startsWith('cost:')) {
          const num = parseFloat(part.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) metadata.ingredientCost = num;
        } else if (part.toLowerCase().startsWith('tags:')) {
          const tagsStr = part.replace(/tags:\s*/i, '');
          metadata.tags = tagsStr.split(',').map(t => t.trim().toLowerCase())
            .filter((t): t is DietaryTag => VALID_DIETARY_TAGS.includes(t as DietaryTag));
        }
      }
      continue;
    }

    // Parse ingredients
    if (currentSection === 'ingredients' && line.startsWith('- ')) {
      const raw = line.replace('- ', '').trim();
      const parsed = parseIngredientLine(raw);
      ingredients.push(parsed);
      continue;
    }

    // Collect content
    sectionContent.push(line);
  }

  // Save final section
  saveSectionContent(currentSection, sectionContent, { description: (d) => description = d, instructions: (d) => instructions = d, notes: (d) => notes = d, ingredients });

  return {
    name,
    description: description.trim(),
    ingredients,
    instructions: instructions.trim(),
    notes: notes.trim() || undefined,
    metadata,
    raw: markdown,
  };
}

function saveSectionContent(
  section: string,
  content: string[],
  handlers: {
    description: (d: string) => void;
    instructions: (d: string) => void;
    notes: (d: string) => void;
    ingredients: { raw: string; quantity?: string; item: string }[];
  }
) {
  const text = content.join('\n').trim();
  switch (section) {
    case 'description':
      handlers.description(text);
      break;
    case 'instructions':
      handlers.instructions(text);
      break;
    case 'notes':
      handlers.notes(text);
      break;
  }
}

function parseIngredientLine(raw: string): { raw: string; quantity?: string; item: string } {
  // Try to extract quantity from beginning
  const match = raw.match(/^([\d\s/½¼¾⅓⅔⅛]+\s*(?:cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|piece|pieces|clove|cloves)?s?)\s+(.+)$/i);
  if (match) {
    return {
      raw,
      quantity: match[1].trim(),
      item: match[2].trim(),
    };
  }
  return { raw, item: raw };
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .substring(0, 100);
}

/**
 * Trigger download of a blob
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
