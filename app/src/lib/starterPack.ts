import type { StarterPack, StarterRecipe, Recipe, DietaryTag } from '@/types';
import { recipeDB, recipeBoxDB, menuDB } from '@/lib/db';

const STARTER_PACK_LOADED_KEY = 'menu-mixer-starter-loaded';

/**
 * Parse a starter pack markdown file into structured data
 */
export function parseStarterPackMarkdown(markdown: string, packId: string): StarterPack {
  const lines = markdown.split('\n');
  const recipes: StarterRecipe[] = [];
  const boxes: { name: string; recipeNames: string[] }[] = [];
  const menus: { name: string; recipeNames: string[] }[] = [];

  let packName = '';
  let packDescription = '';
  let currentMenuName = '';
  let currentRecipe: Partial<StarterRecipe> | null = null;
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Pack title (H1 at start)
    if (trimmed.startsWith('# ') && !packName) {
      packName = trimmed.slice(2).trim();
      continue;
    }

    // Menu section (## Menu: Name)
    if (trimmed.startsWith('## Menu:')) {
      // Save previous recipe if any
      if (currentRecipe?.name) {
        recipes.push(currentRecipe as StarterRecipe);
      }
      currentRecipe = null;
      currentSection = '';

      currentMenuName = trimmed.slice(8).trim();
      boxes.push({ name: currentMenuName, recipeNames: [] });
      menus.push({ name: `The Station - ${currentMenuName}`, recipeNames: [] });
      continue;
    }

    // Recipe header (### Recipe: Name)
    if (trimmed.startsWith('### Recipe:')) {
      // Save previous recipe if any
      if (currentRecipe?.name) {
        recipes.push(currentRecipe as StarterRecipe);
        // Add to current menu/box
        if (currentMenuName && boxes.length > 0) {
          boxes[boxes.length - 1].recipeNames.push(currentRecipe.name!);
          menus[menus.length - 1].recipeNames.push(currentRecipe.name!);
        }
      }

      const recipeName = trimmed.slice(11).trim();
      currentRecipe = {
        name: recipeName,
        metadata: { tags: [] },
        ingredients: [],
        description: '',
        instructions: '',
      };
      currentSection = '';
      continue;
    }

    // Section headers within recipe (## Metadata, ## Ingredients, etc)
    if (trimmed.startsWith('## ') && currentRecipe) {
      currentSection = trimmed.slice(3).trim().toLowerCase();
      continue;
    }

    // Skip empty lines and horizontal rules
    if (!trimmed || trimmed === '---') continue;

    // Parse content based on current section
    if (currentRecipe) {
      switch (currentSection) {
        case 'metadata':
          parseMetadataLine(trimmed, currentRecipe);
          break;
        case 'ingredients':
          if (trimmed.startsWith('- ')) {
            const raw = trimmed.slice(2);
            currentRecipe.ingredients!.push(parseIngredient(raw));
          }
          break;
        case 'description':
          currentRecipe.description = currentRecipe.description
            ? currentRecipe.description + '\n' + trimmed
            : trimmed;
          break;
        case 'instructions':
          currentRecipe.instructions = currentRecipe.instructions
            ? currentRecipe.instructions + '\n' + trimmed
            : trimmed;
          break;
        case 'notes':
          currentRecipe.notes = currentRecipe.notes
            ? currentRecipe.notes + '\n' + trimmed
            : trimmed;
          break;
      }
    } else if (!currentMenuName && !packDescription && trimmed) {
      // Pack description (text after title, before first menu)
      packDescription += (packDescription ? '\n' : '') + trimmed;
    }
  }

  // Save last recipe
  if (currentRecipe?.name) {
    recipes.push(currentRecipe as StarterRecipe);
    if (currentMenuName && boxes.length > 0) {
      boxes[boxes.length - 1].recipeNames.push(currentRecipe.name!);
      menus[menus.length - 1].recipeNames.push(currentRecipe.name!);
    }
  }

  return {
    id: packId,
    name: packName || 'Starter Pack',
    description: packDescription,
    recipes,
    boxes,
    menus,
  };
}

function parseMetadataLine(line: string, recipe: Partial<StarterRecipe>): void {
  if (!line.startsWith('- ')) return;
  const content = line.slice(2);
  const colonIndex = content.indexOf(':');
  if (colonIndex === -1) return;

  const key = content.slice(0, colonIndex).trim().toLowerCase();
  const value = content.slice(colonIndex + 1).trim();

  if (!recipe.metadata) recipe.metadata = { tags: [] };

  switch (key) {
    case 'prep_time':
    case 'preptime':
      recipe.metadata.prepTime = parseInt(value, 10) || undefined;
      break;
    case 'assembly_time':
    case 'assemblytime':
      recipe.metadata.assemblyTime = parseInt(value, 10) || undefined;
      break;
    case 'cost':
    case 'ingredient_cost':
      recipe.metadata.ingredientCost = parseFloat(value) || undefined;
      break;
    case 'price':
    case 'menu_price':
      recipe.metadata.menuPrice = parseFloat(value) || undefined;
      break;
    case 'tags':
      recipe.metadata.tags = value.split(',').map(t => t.trim().toLowerCase());
      break;
  }
}

function parseIngredient(raw: string): { raw: string; item: string; quantity?: string } {
  const match = raw.match(/^([\d\s\/½¼¾⅓⅔⅛]+\s*(?:lb|lbs|oz|cup|cups|tbsp|tsp|g|kg|ml|l|bunch|clove|cloves|can|cans|pkg)?s?)\s+(.+)$/i);
  if (match) {
    return { raw, quantity: match[1].trim(), item: match[2].trim() };
  }
  return { raw, item: raw };
}

/**
 * Check if a starter pack has already been loaded
 */
export function hasLoadedStarterPack(packId: string): boolean {
  try {
    const loaded = localStorage.getItem(STARTER_PACK_LOADED_KEY);
    if (!loaded) return false;
    const loadedPacks = JSON.parse(loaded) as string[];
    return loadedPacks.includes(packId);
  } catch {
    return false;
  }
}

/**
 * Mark a starter pack as loaded
 */
function markStarterPackLoaded(packId: string): void {
  try {
    const loaded = localStorage.getItem(STARTER_PACK_LOADED_KEY);
    const loadedPacks = loaded ? JSON.parse(loaded) as string[] : [];
    if (!loadedPacks.includes(packId)) {
      loadedPacks.push(packId);
      localStorage.setItem(STARTER_PACK_LOADED_KEY, JSON.stringify(loadedPacks));
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load a starter pack into the database
 */
export async function loadStarterPack(pack: StarterPack): Promise<void> {
  // Check if already loaded
  if (hasLoadedStarterPack(pack.id)) {
    console.log(`Starter pack ${pack.id} already loaded, skipping`);
    return;
  }

  // Check if user already has data (don't overwrite)
  const existingBoxes = await recipeBoxDB.getAll();
  const existingMenus = await menuDB.getAll();
  if (existingBoxes.length > 0 || existingMenus.length > 0) {
    console.log('User has existing data, skipping starter pack');
    markStarterPackLoaded(pack.id);
    return;
  }

  console.log(`Loading starter pack: ${pack.name}`);

  // Create recipes and build name->id map
  const recipeNameToId = new Map<string, string>();
  const recipesToCreate = pack.recipes.map(sr => ({
    name: sr.name,
    metadata: {
      prepTime: sr.metadata.prepTime,
      assemblyTime: sr.metadata.assemblyTime,
      ingredientCost: sr.metadata.ingredientCost,
      menuPrice: sr.metadata.menuPrice,
      tags: sr.metadata.tags as DietaryTag[],
    },
    ingredients: sr.ingredients,
    description: sr.description,
    instructions: sr.instructions,
    notes: sr.notes,
  }));

  const createdRecipes = await recipeDB.bulkCreate(recipesToCreate);
  for (const recipe of createdRecipes) {
    recipeNameToId.set(recipe.name, recipe.id);
  }

  // Create recipe boxes
  const boxNameToId = new Map<string, string>();
  for (const box of pack.boxes) {
    const createdBox = await recipeBoxDB.create(box.name);
    boxNameToId.set(box.name, createdBox.id);

    // Add recipes to box
    for (const recipeName of box.recipeNames) {
      const recipeId = recipeNameToId.get(recipeName);
      if (recipeId) {
        await recipeBoxDB.addRecipe(createdBox.id, recipeId);
      }
    }
  }

  // Create menus and add items
  for (const menuDef of pack.menus) {
    const menu = await menuDB.create(menuDef.name);

    // Add recipes as menu items
    for (const recipeName of menuDef.recipeNames) {
      const recipeId = recipeNameToId.get(recipeName);
      if (recipeId) {
        const recipe = createdRecipes.find(r => r.id === recipeId);
        if (recipe) {
          await menuDB.addItem(menu.id, recipe as Recipe);
        }
      }
    }
  }

  // Mark as loaded
  markStarterPackLoaded(pack.id);
  console.log(`Starter pack ${pack.name} loaded successfully`);
}

// Embedded starter pack data - The Station
export const THE_STATION_STARTER_PACK: StarterPack = {
  id: 'the-station-2026',
  name: 'The Station Cafe',
  description: 'Sample menus from The Station, a cafe featuring specialty coffee drinks and fresh food.',
  recipes: [
    // Drinks
    {
      name: 'Greek Frappe',
      metadata: { menuPrice: 8.00, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Greek Nescafe instant coffee', item: 'Greek Nescafe instant coffee' },
        { raw: 'Sugar to taste', item: 'Sugar' },
        { raw: 'Ice', item: 'Ice' },
        { raw: 'Water', item: 'Water' },
        { raw: 'Chocolate syrup for rim', item: 'Chocolate syrup' },
      ],
      description: 'A traditional Greek iced coffee with a modern twist. Frothy, refreshing, and served in a chocolate-rimmed cup.',
      instructions: '1. Add Greek Nescafe and sugar to a shaker or frappe mixer\n2. Add a small amount of water\n3. Froth vigorously until thick and foamy\n4. Rim glass with chocolate syrup\n5. Fill glass with ice\n6. Pour frothed coffee over ice\n7. Top with cold water to desired strength',
    },
    {
      name: 'Brown Butter Brulee Latte',
      metadata: { menuPrice: 7.50, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Double espresso', item: 'espresso' },
        { raw: 'Housemade brown butter brulee syrup', item: 'brown butter brulee syrup' },
        { raw: 'Steamed milk', item: 'milk' },
      ],
      description: 'Rich espresso with housemade brown butter brulee syrup, topped with silky steamed milk. Available hot or iced.',
      instructions: '1. Pull double shot of espresso\n2. Add brown butter brulee syrup to cup (1.5 oz)\n3. Pour espresso over syrup and stir\n4. Steam milk to 150-160°F with microfoam\n5. Pour steamed milk over espresso mixture\n6. Optional: drizzle extra syrup on top',
      notes: 'Brown butter brulee syrup: brown butter + caramelized sugar + vanilla',
    },
    {
      name: 'Chocolate Hazelnut Pistachio Latte',
      metadata: { menuPrice: 7.50, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Double espresso', item: 'espresso' },
        { raw: 'Nutella (1 tbsp)', quantity: '1 tbsp', item: 'Nutella' },
        { raw: 'Pistachio syrup (0.5 oz)', quantity: '0.5 oz', item: 'pistachio syrup' },
        { raw: 'Steamed milk', item: 'milk' },
        { raw: 'Whipped cream', item: 'whipped cream' },
        { raw: 'Cocoa powder for dusting', item: 'cocoa powder' },
      ],
      description: 'Decadent espresso drink combining Nutella, pistachio syrup, and topped with whipped cream and cocoa powder.',
      instructions: '1. Add Nutella to cup and pull espresso directly over it\n2. Stir to dissolve Nutella\n3. Add pistachio syrup\n4. Steam milk and pour over\n5. Top with whipped cream\n6. Dust with cocoa powder',
    },
    {
      name: 'Toasted Marshmallow Matcha Latte',
      metadata: { menuPrice: 7.50, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Ceremonial grade matcha (2 tsp)', quantity: '2 tsp', item: 'matcha' },
        { raw: 'Housemade toasted marshmallow syrup (1 oz)', quantity: '1 oz', item: 'toasted marshmallow syrup' },
        { raw: 'Milk (10 oz)', quantity: '10 oz', item: 'milk' },
        { raw: 'Hot water (2 oz)', quantity: '2 oz', item: 'water' },
      ],
      description: 'Creamy matcha latte with housemade toasted marshmallow syrup. A unique sweet and earthy combination.',
      instructions: '1. Sift matcha powder into cup\n2. Add hot water (not boiling, ~170°F)\n3. Whisk until smooth with no lumps\n4. Add toasted marshmallow syrup\n5. Steam milk and pour over matcha mixture\n6. Stir gently to combine',
    },
    {
      name: 'Poached Pear London Fog',
      metadata: { menuPrice: 7.50, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Earl Grey tea (1 bag or 1 tbsp loose)', item: 'Earl Grey tea' },
        { raw: 'Housemade poached pear syrup (1 oz)', quantity: '1 oz', item: 'poached pear syrup' },
        { raw: 'Steamed milk', item: 'milk' },
        { raw: 'Honey drizzle', item: 'honey' },
      ],
      description: 'A cozy twist on the classic London Fog, featuring housemade poached pear syrup and a honey drizzle.',
      instructions: '1. Steep Earl Grey in 4 oz hot water for 3-4 minutes\n2. Remove tea bag/strain leaves\n3. Add poached pear syrup and stir\n4. Steam milk with light foam\n5. Pour steamed milk over tea\n6. Drizzle honey on top',
    },
    // Food
    {
      name: 'Breakfast Sandwich',
      metadata: { menuPrice: 10.00, tags: [] },
      ingredients: [
        { raw: 'Housemade sweet potato biscuit OR croissant', item: 'sweet potato biscuit' },
        { raw: '1 egg', quantity: '1', item: 'egg' },
        { raw: 'Turkey sausage patty', item: 'turkey sausage' },
        { raw: 'White cheddar cheese slice', item: 'white cheddar cheese' },
        { raw: 'Fresh fruit for serving', item: 'fresh fruit' },
      ],
      description: 'Hearty breakfast sandwich on housemade sweet potato biscuit or croissant with egg, turkey sausage, and white cheddar. Served with fresh fruit.',
      instructions: '1. Warm biscuit or croissant in oven (325°F, 3-4 min)\n2. Cook turkey sausage patty until internal temp reaches 165°F\n3. Fry or scramble egg to customer preference\n4. Slice biscuit/croissant in half\n5. Layer: bottom half, egg, sausage, cheese, top half\n6. Serve immediately with fresh fruit on the side',
    },
    {
      name: 'Brown Sugar French Toast Bake',
      metadata: { menuPrice: 9.00, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Brioche bread cubes', item: 'brioche bread' },
        { raw: 'Brown sugar', item: 'brown sugar' },
        { raw: 'Eggs', item: 'eggs' },
        { raw: 'Milk', item: 'milk' },
        { raw: 'Vanilla extract', item: 'vanilla extract' },
        { raw: 'Cinnamon', item: 'cinnamon' },
        { raw: 'Butter', item: 'butter' },
        { raw: 'Fresh fruit for serving', item: 'fresh fruit' },
        { raw: 'Maple syrup', item: 'maple syrup' },
      ],
      description: 'Baked French toast with brown sugar, served with fresh fruit and maple syrup.',
      instructions: '1. Cube brioche bread and place in buttered baking dish\n2. Whisk eggs, milk, vanilla, cinnamon, and half the brown sugar\n3. Pour mixture over bread, refrigerate overnight\n4. Top with remaining brown sugar and butter pats\n5. Bake at 350°F for 35-40 minutes until golden\n6. Serve with fresh fruit and maple syrup',
    },
    {
      name: 'Avocado Toast',
      metadata: { menuPrice: 12.00, tags: ['vegan', 'dairy-free'] },
      ingredients: [
        { raw: '2 slices rustic bread', quantity: '2 slices', item: 'rustic bread' },
        { raw: '1 ripe avocado', quantity: '1', item: 'avocado' },
        { raw: 'Handful arugula', item: 'arugula' },
        { raw: 'Pickled red onion (2 tbsp)', quantity: '2 tbsp', item: 'pickled red onion' },
        { raw: 'Olive oil', item: 'olive oil' },
        { raw: 'Everything seasoning', item: 'everything seasoning' },
        { raw: 'Salt and pepper', item: 'salt and pepper' },
      ],
      description: 'Toasted rustic bread topped with smashed avocado, peppery arugula, tangy pickled red onion, olive oil, and everything seasoning.',
      instructions: '1. Toast rustic bread until golden and crispy\n2. Halve and pit avocado, scoop into bowl\n3. Mash avocado with salt and pepper\n4. Spread avocado generously on toast\n5. Top with arugula and pickled red onion\n6. Drizzle with olive oil\n7. Sprinkle everything seasoning on top',
    },
    {
      name: 'The Station Salad',
      metadata: { menuPrice: 12.00, tags: ['vegetarian', 'gluten-free'] },
      ingredients: [
        { raw: 'Baby butter lettuce', item: 'butter lettuce' },
        { raw: 'Cucumber, sliced', item: 'cucumber' },
        { raw: 'Grape tomatoes, halved', item: 'grape tomatoes' },
        { raw: 'Red bell pepper, diced', item: 'red bell pepper' },
        { raw: 'Pomegranate seeds', item: 'pomegranate seeds' },
        { raw: 'Goat cheese, crumbled', item: 'goat cheese' },
        { raw: 'Candied pecans', item: 'candied pecans' },
        { raw: 'Housemade citrus vinaigrette', item: 'citrus vinaigrette' },
      ],
      description: 'Fresh baby butter lettuce with colorful vegetables, pomegranate seeds, creamy goat cheese, candied pecans, and housemade citrus vinaigrette.',
      instructions: '1. Wash and dry butter lettuce, arrange on plate\n2. Slice cucumber and halve grape tomatoes\n3. Dice red bell pepper\n4. Arrange vegetables over lettuce\n5. Scatter pomegranate seeds\n6. Add crumbled goat cheese\n7. Top with candied pecans\n8. Drizzle with citrus vinaigrette',
    },
    {
      name: 'Turkey, Manchego & Fig Sandwich',
      metadata: { menuPrice: 13.00, tags: [] },
      ingredients: [
        { raw: 'Oven-roasted turkey (4 oz)', quantity: '4 oz', item: 'turkey' },
        { raw: 'Manchego cheese, sliced', item: 'manchego cheese' },
        { raw: 'Baby green leaf lettuce', item: 'lettuce' },
        { raw: 'Fig jam (2 tbsp)', quantity: '2 tbsp', item: 'fig jam' },
        { raw: 'Multigrain bread (2 slices)', quantity: '2 slices', item: 'multigrain bread' },
        { raw: 'Fresh fruit or side salad for serving', item: 'fresh fruit' },
      ],
      description: 'Savory oven-roasted turkey with nutty manchego cheese, fresh lettuce, and sweet fig jam on multigrain bread.',
      instructions: '1. Toast multigrain bread lightly\n2. Spread fig jam on one slice\n3. Layer turkey on other slice\n4. Add manchego cheese slices\n5. Top with baby lettuce\n6. Close sandwich and slice diagonally\n7. Serve with fresh fruit or side salad',
    },
    {
      name: 'Hummus Wrap',
      metadata: { menuPrice: 11.00, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Large flour wrap/tortilla', item: 'flour tortilla' },
        { raw: 'Hummus (3 tbsp)', quantity: '3 tbsp', item: 'hummus' },
        { raw: 'Feta cheese, crumbled', item: 'feta cheese' },
        { raw: 'Cucumber, sliced', item: 'cucumber' },
        { raw: 'Red onion, thinly sliced', item: 'red onion' },
        { raw: 'Red bell pepper, sliced', item: 'red bell pepper' },
        { raw: 'Fresh sprouts', item: 'sprouts' },
        { raw: 'Fresh fruit for serving', item: 'fresh fruit' },
      ],
      description: 'Mediterranean-inspired wrap filled with creamy hummus, tangy feta, crisp vegetables, and fresh sprouts.',
      instructions: '1. Warm wrap slightly for pliability\n2. Spread hummus across center of wrap\n3. Layer cucumber, red onion, and red pepper\n4. Add crumbled feta\n5. Top with fresh sprouts\n6. Fold bottom up, then sides in, and roll tightly\n7. Cut in half diagonally\n8. Serve with fresh fruit',
    },
    {
      name: 'Veggie Sangweech',
      metadata: { menuPrice: 11.00, tags: ['vegetarian'] },
      ingredients: [
        { raw: 'Portuguese roll', item: 'Portuguese roll' },
        { raw: 'Herbed boursin cheese (2 tbsp)', quantity: '2 tbsp', item: 'boursin cheese' },
        { raw: 'Cucumber, sliced', item: 'cucumber' },
        { raw: 'Baby lettuce', item: 'lettuce' },
        { raw: 'Red bell pepper, sliced', item: 'red bell pepper' },
        { raw: 'Red onion, thinly sliced', item: 'red onion' },
        { raw: 'Fresh fruit for serving', item: 'fresh fruit' },
      ],
      description: 'Fresh vegetable sandwich with creamy herbed boursin on a Portuguese roll, served with fresh fruit.',
      instructions: '1. Slice Portuguese roll in half\n2. Spread herbed boursin on both halves\n3. Layer cucumber slices on bottom half\n4. Add red pepper and red onion\n5. Top with baby lettuce\n6. Close sandwich\n7. Serve with fresh fruit',
    },
  ],
  boxes: [
    { name: 'Drinks', recipeNames: ['Greek Frappe', 'Brown Butter Brulee Latte', 'Chocolate Hazelnut Pistachio Latte', 'Toasted Marshmallow Matcha Latte', 'Poached Pear London Fog'] },
    { name: 'Food', recipeNames: ['Breakfast Sandwich', 'Brown Sugar French Toast Bake', 'Avocado Toast', 'The Station Salad', 'Turkey, Manchego & Fig Sandwich', 'Hummus Wrap', 'Veggie Sangweech'] },
  ],
  menus: [
    { name: 'The Station - Drinks', recipeNames: ['Greek Frappe', 'Brown Butter Brulee Latte', 'Chocolate Hazelnut Pistachio Latte', 'Toasted Marshmallow Matcha Latte', 'Poached Pear London Fog'] },
    { name: 'The Station - Food', recipeNames: ['Breakfast Sandwich', 'Brown Sugar French Toast Bake', 'Avocado Toast', 'The Station Salad', 'Turkey, Manchego & Fig Sandwich', 'Hummus Wrap', 'Veggie Sangweech'] },
  ],
};

// Map of available starter packs
export const STARTER_PACKS: Record<string, StarterPack> = {
  'the-station-2026': THE_STATION_STARTER_PACK,
};

/**
 * Get a starter pack by ID
 */
export function getStarterPack(packId: string): StarterPack | undefined {
  return STARTER_PACKS[packId];
}
