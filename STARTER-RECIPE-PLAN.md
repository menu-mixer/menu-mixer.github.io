# Starter Pack via Invite Code - Implementation Plan

## Overview

Allow invite codes to optionally include a "starter pack" that pre-populates new users with recipe boxes and menus. Example: `CHRISTIE-2026-STATION` creates two menu boxes (Food, Drinks) and loads The Station cafe menus.

## Data Model Changes

### 1. Starter Pack Definition (`app/src/types/starterPack.ts`)

```typescript
export interface StarterPack {
  id: string;
  name: string;
  description?: string;
  boxes: StarterBox[];
  menus: StarterMenu[];
}

export interface StarterBox {
  id: string;          // Becomes RecipeBox.id (prefixed to avoid collision)
  name: string;        // e.g., "Food", "Drinks"
  recipeMarkdowns: string[];  // Raw recipe markdown strings
}

export interface StarterMenu {
  id: string;
  name: string;        // e.g., "The Station - Food"
  boxId: string;       // Links to StarterBox.id
  itemIds: string[];   // Recipe IDs to include from the box
}
```

### 2. Invite Code Response Change (`app/src/types/auth.ts`)

```typescript
// Extend existing AuthState
export interface AuthState {
  // ... existing fields
  starterPackId?: string;  // If present, load this starter pack
}
```

## Backend Changes (Cloudflare Worker)

### 1. Invite Code KV Schema

Current:
```json
{
  "tier": "pro",
  "maxUses": 100,
  "usedCount": 5
}
```

Extended:
```json
{
  "tier": "pro",
  "maxUses": 100,
  "usedCount": 5,
  "starterPackId": "the-station-2026"  // Optional
}
```

### 2. Starter Packs KV Namespace

New KV namespace: `STARTER_PACKS`

Key: `the-station-2026`
Value: JSON of `StarterPack` type (see above)

### 3. New Worker Endpoint

`GET /api/starter-packs/:id`
- Returns starter pack JSON
- Called client-side after successful auth if `starterPackId` present

## Frontend Changes

### 1. Auth Flow Update (`app/src/stores/authStore.ts`)

```typescript
login: async (inviteCode: string) => {
  const authState = await validateInviteCode(inviteCode);
  set({ ...authState, isLoading: false });

  // Check for starter pack
  if (authState.starterPackId) {
    await loadStarterPack(authState.starterPackId);
  }
}
```

### 2. Starter Pack Loader (`app/src/lib/starterPack.ts`)

```typescript
export async function loadStarterPack(packId: string): Promise<void> {
  // 1. Fetch pack definition from API
  const pack = await fetchStarterPack(packId);

  // 2. Check if user already has data (don't overwrite)
  const existingBoxes = await db.recipeBoxes.getAll();
  if (existingBoxes.length > 0) {
    console.log('User has existing data, skipping starter pack');
    return;
  }

  // 3. Create recipe boxes and import recipes
  for (const box of pack.boxes) {
    const boxId = `starter-${box.id}`;
    const recipeIds: string[] = [];

    for (const markdown of box.recipeMarkdowns) {
      const recipeId = await db.recipes.create(markdown);
      recipeIds.push(recipeId);
    }

    await db.recipeBoxes.create({
      id: boxId,
      name: box.name,
      recipeIds,
    });
  }

  // 4. Create menus with items
  for (const menu of pack.menus) {
    const items = menu.itemIds.map(id => ({
      sourceRecipeId: `starter-${id}`,
      // ... copy recipe data as MenuItem
    }));

    await db.menus.create({
      name: menu.name,
      items,
    });
  }
}
```

### 3. First-Run Detection

Add to `app/src/App.tsx`:

```typescript
useEffect(() => {
  if (isAuthenticated && starterPackId && !hasLoadedStarterPack) {
    loadStarterPack(starterPackId).then(() => {
      setHasLoadedStarterPack(true);
    });
  }
}, [isAuthenticated, starterPackId]);
```

## Starter Pack File Format

For easy authoring, support a single markdown file format (like `the-station-starter.md`):

```markdown
# Pack Name

## Menu: Drinks

### Recipe: Greek Frappe
## Metadata
- price: 8.00
...

### Recipe: Another Drink
...

## Menu: Food

### Recipe: Breakfast Sandwich
...
```

Parser splits by `## Menu:` to create boxes, and `### Recipe:` for individual recipes.

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `app/src/types/starterPack.ts` | Create | Type definitions |
| `app/src/lib/starterPack.ts` | Create | Loader and parser |
| `app/src/stores/authStore.ts` | Modify | Add starter pack loading |
| `app/src/lib/ai/client.ts` | Modify | Handle starterPackId in response |
| `worker/src/index.ts` | Modify | Add starter pack endpoint |
| `worker/wrangler.toml` | Modify | Add STARTER_PACKS KV binding |

## Example Invite Codes

| Code | Tier | Starter Pack |
|------|------|--------------|
| `CHRISTIE-2026-STATION` | pro | the-station-2026 |
| `DEMO-CAFE-2026` | free | demo-cafe |
| `WORKSHOP-Q1` | pro | (none) |

## Migration Notes

- Existing invite codes continue to work (no starterPackId = no starter content)
- Starter packs only load on first use (empty database)
- Users can delete starter content normally after loading

## Testing Checklist

- [ ] New user with starter pack code gets pre-populated data
- [ ] Existing user with starter pack code does NOT overwrite data
- [ ] Regular invite code (no starter pack) works unchanged
- [ ] Recipes parse correctly from starter markdown
- [ ] Menu items correctly reference source recipes
- [ ] Recipe boxes contain correct recipes
