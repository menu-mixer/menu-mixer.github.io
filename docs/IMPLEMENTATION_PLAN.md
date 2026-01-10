# Menu Mixer - Implementation Plan

## Overview

This document outlines the technical implementation plan for Menu Mixer, broken into phases with specific deliverables.

---

## Phase 0: Project Setup

### 0.1 Initialize React Project
- Create React app with Vite (faster build, better DX)
- Configure TypeScript
- Set up ESLint + Prettier
- Configure path aliases (`@/components`, `@/lib`, etc.)

```bash
npm create vite@latest menu-mixer -- --template react-ts
```

### 0.2 Install Core Dependencies
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "@xyflow/react": "^12.x",
    "zustand": "^4.x",
    "idb": "^8.x",
    "uuid": "^9.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tailwindcss": "^3.x",
    "@types/react": "^18.x",
    "vitest": "^1.x"
  }
}
```

### 0.3 Project Structure
```
src/
├── components/
│   ├── ui/                    # Base UI components
│   ├── recipe/                # Recipe card components
│   ├── menu/                  # Menu editor components
│   ├── sidebar/               # Navigation & recipe boxes
│   └── chat/                  # Chat interface components
├── lib/
│   ├── db/                    # IndexedDB operations
│   ├── ai/                    # AI service integrations
│   ├── parser/                # Recipe parsing utilities
│   └── utils/                 # General utilities
├── stores/                    # Zustand stores
├── hooks/                     # Custom React hooks
├── types/                     # TypeScript types/interfaces
└── App.tsx
```

### 0.4 Deliverables
- [ ] Running React app with TypeScript
- [ ] Tailwind CSS configured
- [ ] Project structure created
- [ ] Git repository initialized with `.gitignore`

---

## Phase 1: Auth & AI Proxy (Cloudflare Worker)

This phase sets up the backend infrastructure for authentication and AI API proxying. The Worker handles invite code validation, session management, rate limiting, and proxying requests to OpenAI/Anthropic.

### 1.1 Cloudflare Worker Project Setup

```bash
# Create Worker project
npm create cloudflare@latest menu-mixer-api -- --type worker-typescript

# Project structure
worker/
├── src/
│   ├── index.ts              # Main entry point
│   ├── routes/
│   │   ├── auth.ts           # /auth/validate, /auth/refresh
│   │   └── ai.ts             # /ai/parse, /ai/optimize, /ai/chat
│   ├── middleware/
│   │   ├── cors.ts           # CORS headers
│   │   ├── rateLimit.ts      # Rate limiting logic
│   │   └── auth.ts           # Token validation
│   ├── services/
│   │   ├── inviteCode.ts     # Code validation & tier lookup
│   │   ├── openai.ts         # OpenAI API client
│   │   └── anthropic.ts      # Anthropic API client
│   └── types.ts              # Shared types
├── wrangler.toml             # Cloudflare config
└── package.json
```

### 1.2 Wrangler Configuration

```toml
# wrangler.toml
name = "menu-mixer-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

# KV Namespaces for invite codes and sessions
[[kv_namespaces]]
binding = "INVITE_CODES"
id = "xxx"

[[kv_namespaces]]
binding = "SESSIONS"
id = "xxx"

[[kv_namespaces]]
binding = "USAGE"
id = "xxx"

# Secrets (set via wrangler secret put)
# OPENAI_API_KEY
# ANTHROPIC_API_KEY
# JWT_SECRET
```

### 1.3 Invite Code Data Model

```typescript
// Stored in KV: INVITE_CODES
interface InviteCode {
  code: string;              // Hashed
  tier: 'free' | 'pro' | 'beta';
  email?: string;
  createdAt: string;
  expiresAt?: string;        // Optional expiration
  maxUsage?: number;         // Max AI calls (null = unlimited)
  currentUsage: number;
  isActive: boolean;
}

// Stored in KV: SESSIONS
interface Session {
  token: string;             // JWT
  inviteCodeHash: string;
  tier: 'free' | 'pro' | 'beta';
  createdAt: string;
  expiresAt: string;         // 30 days from creation
}

// Stored in KV: USAGE (key = inviteCodeHash:YYYY-MM)
interface MonthlyUsage {
  aiCalls: number;
  tokensUsed: number;
  lastCall: string;
}
```

### 1.4 Auth Endpoints

```typescript
// POST /auth/validate
// Validates invite code, returns session token
interface ValidateRequest {
  inviteCode: string;
}

interface ValidateResponse {
  success: boolean;
  token?: string;            // JWT
  tier?: 'free' | 'pro' | 'beta';
  limits?: {
    maxRecipes: number;      // -1 = unlimited
    maxAiCalls: number;      // per month, -1 = unlimited
    remainingAiCalls: number;
  };
  error?: string;
}

// POST /auth/refresh
// Refreshes session token (if still valid)
interface RefreshRequest {
  token: string;
}

// POST /auth/usage
// Returns current usage stats
interface UsageResponse {
  tier: string;
  monthlyAiCalls: number;
  monthlyLimit: number;
  remainingCalls: number;
}
```

### 1.5 AI Proxy Endpoints

```typescript
// POST /ai/parse
// Parses recipe from text/image
interface ParseRequest {
  content: string;           // Text or base64 image
  contentType: 'text' | 'image' | 'pdf';
}

// POST /ai/optimize
// Runs optimization routine
interface OptimizeRequest {
  type: 'dedupe' | 'ingredients' | 'dietary' | 'cost';
  recipes: Recipe[];
  activeMenuIds?: string[];
}

// POST /ai/chat
// General chat completion
interface ChatRequest {
  messages: { role: string; content: string }[];
  context?: {
    recipes: Recipe[];
    activeMenu: string[];
  };
}

// POST /ai/theme
// Re-theme recipes
interface ThemeRequest {
  recipes: Recipe[];
  theme: string;             // Theme name or description
}
```

### 1.6 Rate Limiting Logic

```typescript
// src/middleware/rateLimit.ts
const TIER_LIMITS = {
  free: {
    maxRecipes: 20,
    monthlyAiCalls: 50,
    requestsPerMinute: 10,
  },
  pro: {
    maxRecipes: -1,          // Unlimited
    monthlyAiCalls: 500,
    requestsPerMinute: 30,
  },
  beta: {
    maxRecipes: -1,
    monthlyAiCalls: -1,      // Unlimited
    requestsPerMinute: 60,
  },
};

async function checkRateLimit(
  env: Env,
  inviteCodeHash: string,
  tier: Tier
): Promise<{ allowed: boolean; remaining: number; resetAt: string }>;
```

### 1.7 JWT Token Structure

```typescript
interface JWTPayload {
  sub: string;               // Invite code hash
  tier: 'free' | 'pro' | 'beta';
  iat: number;               // Issued at
  exp: number;               // Expires (30 days)
}

// Sign with JWT_SECRET environment variable
// Validate on every /ai/* request
```

### 1.8 Frontend Auth Integration

```typescript
// src/lib/auth/client.ts
const API_BASE = 'https://menu-mixer-api.workers.dev';

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  tier: Tier | null;
  limits: TierLimits | null;
}

async function validateInviteCode(code: string): Promise<AuthState>;
async function refreshToken(): Promise<AuthState>;
async function getUsage(): Promise<UsageStats>;

// Store in localStorage
const AUTH_STORAGE_KEY = 'menu-mixer-auth';

function persistAuth(state: AuthState): void;
function loadAuth(): AuthState | null;
function clearAuth(): void;
```

### 1.9 Auth UI Components

```typescript
// src/components/auth/InviteCodeModal.tsx
// - Shown on first load if no valid token
// - Input for invite code
// - "Validate" button
// - Error message display
// - Success → close modal, show app

// src/components/auth/UsageBadge.tsx
// - Shows in header: "Pro: 423/500 AI calls"
// - Click to expand usage details
// - Warning when approaching limit

// src/components/auth/UpgradePrompt.tsx
// - Shown when free tier limits reached
// - "Upgrade to Pro" CTA
// - Link to purchase page (future)
```

### 1.10 AI Client Wrapper

```typescript
// src/lib/ai/client.ts
// Replaces direct API calls with Worker proxy

async function parseRecipe(
  content: string,
  contentType: 'text' | 'image' | 'pdf'
): Promise<ParsedRecipe[]> {
  const auth = loadAuth();
  if (!auth?.token) throw new AuthRequiredError();

  const response = await fetch(`${API_BASE}/ai/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
    },
    body: JSON.stringify({ content, contentType }),
  });

  if (response.status === 401) {
    clearAuth();
    throw new AuthExpiredError();
  }

  if (response.status === 429) {
    throw new RateLimitError(await response.json());
  }

  return response.json();
}

// Similar wrappers for optimize, chat, theme
```

### 1.11 Deliverables

- [ ] Cloudflare Worker project initialized
- [ ] KV namespaces created (INVITE_CODES, SESSIONS, USAGE)
- [ ] Auth endpoints: /auth/validate, /auth/refresh, /auth/usage
- [ ] AI proxy endpoints: /ai/parse, /ai/optimize, /ai/chat, /ai/theme
- [ ] Rate limiting per tier
- [ ] JWT token generation and validation
- [ ] Frontend auth client library
- [ ] InviteCodeModal component
- [ ] UsageBadge component
- [ ] Integration tests for auth flow

### 1.12 Admin: Managing Invite Codes

```bash
# Generate invite codes via wrangler CLI
# (Or build simple admin UI later)

# Create a pro invite code
wrangler kv:key put --binding=INVITE_CODES \
  "hash(PRO-CAFE-2026)" \
  '{"tier":"pro","email":"christie@cafe.com","isActive":true,"currentUsage":0}'

# Revoke a code
wrangler kv:key put --binding=INVITE_CODES \
  "hash(OLD-CODE)" \
  '{"isActive":false}'
```

---

## Phase 2: Data Layer & Core Types

> Note: Previously "Phase 1" - renumbered after adding Auth phase

### 2.1 Semi-Structured Markdown Storage

Recipe cards use **semi-structured markdown** with a predictable layout. This allows schema evolution without migrations—new fields can be added, old fields ignored, and the format remains human-readable.

**Why markdown over strict JSON?**
- Forward/backward compatible (new fields don't break old parsers)
- Human-readable in exports and debugging
- Easy to edit manually if needed
- AI can generate and parse it naturally
- Graceful degradation (unparseable sections become freeform text)

**Recipe Markdown Format**:
```markdown
# Butternut Squash Soup

## Metadata
- prep_time: 15
- assembly_time: 60
- cost: 8.50
- price: 12.00
- tags: vegan, vegetarian, gluten-free

## Ingredients
- 2 lbs butternut squash
- 4 cups vegetable broth
- 2 tbsp olive oil
- 1 tsp sage, dried

## Description
Creamy roasted butternut squash soup with sage and olive oil.
Perfect for fall menus.

## Instructions
1. Preheat oven to 400°F
2. Cut squash in half, remove seeds
3. Roast cut-side down for 45 minutes
4. Scoop flesh into blender with broth
5. Blend until smooth, season to taste

## Notes
- Can substitute pumpkin for squash
- Add cream for non-vegan version
```

### 2.2 TypeScript Types (Parsed from Markdown)

```typescript
// src/types/recipe.ts
type DietaryTag = 'vegan' | 'vegetarian' | 'gluten-free' | 'nut-free' | 'dairy-free';

interface RecipeMetadata {
  prepTime?: number;        // minutes
  assemblyTime?: number;    // minutes
  ingredientCost?: number;  // dollars
  menuPrice?: number;       // dollars
  tags: DietaryTag[];
}

interface Ingredient {
  raw: string;              // Original line: "2 lbs butternut squash"
  quantity?: string;        // Parsed: "2 lbs"
  item: string;             // Parsed: "butternut squash"
}

// Stored in IndexedDB
interface RecipeRecord {
  id: string;
  markdown: string;         // Full markdown source (source of truth)
  createdAt: string;
  updatedAt: string;
}

// Parsed for UI (derived from markdown)
interface Recipe {
  id: string;
  name: string;
  metadata: RecipeMetadata;
  ingredients: Ingredient[];
  description: string;
  instructions: string;
  notes?: string;
  raw: string;              // Original markdown
}

// Parser functions
function parseRecipeMarkdown(markdown: string): Recipe;
function serializeRecipe(recipe: Recipe): string;  // Back to markdown

// src/types/menu.ts
interface RecipeBox {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt: string;
}

interface MenuLayout {
  id: string;
  x: number;
  y: number;
}

interface Menu {
  id: string;
  name: string;
  activeRecipeIds: string[];
  backlogRecipeIds: string[];
  layout: MenuLayout[];
}
```

### 2.2 IndexedDB Setup

```typescript
// src/lib/db/schema.ts
import { openDB, DBSchema } from 'idb';

interface MenuMixerDB extends DBSchema {
  recipes: {
    key: string;
    value: Recipe;
    indexes: { 'by-name': string; 'by-updated': string };
  };
  recipeBoxes: {
    key: string;
    value: RecipeBox;
  };
  menus: {
    key: string;
    value: Menu;
  };
  settings: {
    key: string;
    value: { theme?: string };  // Auth stored in localStorage
  };
}

export async function initDB() {
  return openDB<MenuMixerDB>('menu-mixer', 1, {
    upgrade(db) {
      const recipeStore = db.createObjectStore('recipes', { keyPath: 'id' });
      recipeStore.createIndex('by-name', 'name');
      recipeStore.createIndex('by-updated', 'updatedAt');

      db.createObjectStore('recipeBoxes', { keyPath: 'id' });
      db.createObjectStore('menus', { keyPath: 'id' });
      db.createObjectStore('settings', { keyPath: 'key' });
    },
  });
}
```

### 2.3 CRUD Operations

```typescript
// src/lib/db/recipes.ts
export const recipeDB = {
  async getAll(): Promise<Recipe[]>,
  async getById(id: string): Promise<Recipe | undefined>,
  async create(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe>,
  async update(id: string, updates: Partial<Recipe>): Promise<Recipe>,
  async delete(id: string): Promise<void>,
  async search(query: string): Promise<Recipe[]>,
};
```

### 2.4 Zustand Store

```typescript
// src/stores/recipeStore.ts
import { create } from 'zustand';

interface RecipeStore {
  recipes: Recipe[];
  isLoading: boolean;

  // Actions
  loadRecipes: () => Promise<void>;
  addRecipe: (recipe: Recipe) => void;
  updateRecipe: (id: string, updates: Partial<Recipe>) => void;
  deleteRecipe: (id: string) => void;
}
```

### 2.5 Deliverables
- [ ] TypeScript types for all entities
- [ ] IndexedDB initialization and migrations
- [ ] CRUD operations for recipes, recipe boxes, menus
- [ ] Zustand stores for state management
- [ ] Unit tests for DB operations

---

## Phase 2: Recipe Cards & Basic UI

### 2.1 UI Component Library
Build base components with Tailwind:
- `Button`, `Input`, `Textarea`, `Select`
- `Card`, `Modal`, `Dropdown`
- `Badge` (for dietary tags)
- `Tooltip`

### 2.2 Recipe Card Component

```typescript
// src/components/recipe/RecipeCard.tsx
interface RecipeCardProps {
  recipe: Recipe;
  isExpanded?: boolean;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onDragStart?: () => void;
}

// Collapsed view: name, dietary badges, cost
// Expanded view: full details, edit form
```

**Card sections**:
1. Header: Name, dietary badges
2. Metrics bar: Prep time, cost, price
3. Description (collapsed: truncated, expanded: full)
4. Ingredients list (expanded only)
5. Instructions (expanded only)
6. Action buttons (expanded only)

### 2.3 Recipe Edit Form

```typescript
// src/components/recipe/RecipeEditForm.tsx
// - Editable fields for all recipe properties
// - Ingredient list with add/remove
// - Dietary tag multi-select
// - Save/Cancel buttons
```

### 2.4 Dietary Tag System

```typescript
// src/lib/utils/dietary.ts
const DIETARY_TAGS = {
  vegan: { label: 'Vegan', color: 'green', icon: '🌱' },
  vegetarian: { label: 'Vegetarian', color: 'lime', icon: '🥬' },
  'gluten-free': { label: 'GF', color: 'amber', icon: '🌾' },
  'nut-free': { label: 'NF', color: 'orange', icon: '🥜' },
  'dairy-free': { label: 'DF', color: 'blue', icon: '🥛' },
};

// Auto-detect dietary tags from ingredients
function inferDietaryTags(ingredients: Ingredient[]): DietaryTag[];
```

### 2.5 Deliverables
- [ ] Base UI component library
- [ ] RecipeCard (collapsed + expanded views)
- [ ] RecipeEditForm with validation
- [ ] Dietary tag badge system
- [ ] Auto-inference of dietary tags

---

## Phase 3: Menu Editor with React Flow

### 3.1 React Flow Setup

```typescript
// src/components/menu/MenuEditor.tsx
import { ReactFlow, Background, Controls } from '@xyflow/react';

// Custom node type for recipe cards
const nodeTypes = {
  recipeCard: RecipeCardNode,
};
```

### 3.2 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (Recipe Boxes)  │  Main Area                       │
│                          │  ┌─────────────────────────────┐ │
│  □ All Recipes           │  │  Active Menu (React Flow)   │ │
│  □ Fall 2026             │  │  [Card] [Card] [Card]       │ │
│  □ Wholesale             │  │  [Card] [Card]              │ │
│  + New Recipe Box        │  └─────────────────────────────┘ │
│                          │  ┌─────────────────────────────┐ │
│                          │  │  Mini Chat Input            │ │
│                          │  └─────────────────────────────┘ │
│                          │  ┌─────────────────────────────┐ │
│                          │  │  Backlog (scrollable grid)  │ │
│                          │  │  [Card] [Card] [Card] ...   │ │
│                          │  └─────────────────────────────┘ │
│                          │  ┌─────────────────────────────┐ │
│                          │  │  Drop Zone                  │ │
│                          │  └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Drag & Drop System

```typescript
// Drag sources:
// - Backlog cards → Active menu
// - Active menu cards → Reorder
// - Active menu cards → Backlog (remove)
// - External files → Drop zone

// Use React DnD or native drag events
// React Flow handles internal drag/reorder
```

### 3.4 Connection Lines (Ingredient Overlap)

```typescript
// src/lib/utils/ingredientOverlap.ts
function findIngredientOverlap(recipes: Recipe[]): Edge[] {
  // Compare ingredients between recipe pairs
  // Return edges for React Flow showing connections
}

// Visual: dashed lines between cards sharing ingredients
// Tooltip on hover: "Shares: butternut squash, vegetable broth"
```

### 3.5 Deliverables
- [ ] React Flow integration with custom recipe nodes
- [ ] Active menu area with drag-to-reorder
- [ ] Backlog grid with filtering
- [ ] Drag between active/backlog
- [ ] Ingredient overlap connections (optional toggle)
- [ ] Menu persistence to IndexedDB

---

## Phase 4: Recipe Import (Drop Zone)

### 4.1 Drop Zone Component

```typescript
// src/components/import/DropZone.tsx
// - Accept: PDF, images, .docx, .txt, URLs
// - Visual feedback: drag over state
// - Progress indicator during parsing
// - Preview parsed recipes before import
```

### 4.2 File Type Handlers

```typescript
// src/lib/parser/handlers/
// - pdfHandler.ts (extract text, send to AI)
// - imageHandler.ts (convert to base64, send to AI)
// - textHandler.ts (plain text parsing)
// - urlHandler.ts (fetch page content)
```

### 4.3 AI Integration for Parsing

```typescript
// src/lib/ai/recipeParser.ts
// Uses the AI client from Phase 1 (Cloudflare Worker proxy)
import { aiClient } from '@/lib/ai/client';

interface ParsedRecipe {
  name: string;
  ingredients: { item: string; quantity: string }[];
  instructions: string;
  prepTime?: number;
  confidence: number; // 0-1
}

async function parseRecipeFromText(text: string): Promise<ParsedRecipe[]> {
  return aiClient.parse(text, 'text');
}

async function parseRecipeFromImage(imageBase64: string): Promise<ParsedRecipe[]> {
  return aiClient.parse(imageBase64, 'image');
}
```

### 4.4 AI Prompt for Parsing

```typescript
const RECIPE_PARSE_PROMPT = `
Extract all recipes from the following content. For each recipe, provide:
- name: Recipe title
- ingredients: Array of {item, quantity} objects
- instructions: Step-by-step preparation instructions
- prepTime: Estimated prep time in minutes (if mentioned)
- dietaryTags: Array of applicable tags (vegan, vegetarian, gluten-free, nut-free, dairy-free)

Return as JSON array. If multiple recipes are found, return all of them.
If no recipes are found, return an empty array.

Content:
{content}
`;
```

### 4.5 Import Preview & Confirmation

```typescript
// src/components/import/ImportPreview.tsx
// - Show parsed recipes in card format
// - Allow editing before final import
// - Checkbox to select which recipes to import
// - "Import All" / "Import Selected" buttons
```

### 4.6 Deliverables
- [ ] Drop zone with multi-file support
- [ ] File type detection and handlers
- [ ] AI-powered recipe parsing via Worker proxy (text + images)
- [ ] Import preview with editing
- [ ] Batch import support
- [ ] Error handling for failed parses
- [ ] Rate limit handling (show usage, prompt upgrade)

---

## Phase 5: Optimization Routines

### 5.1 Deduplication

```typescript
// src/lib/ai/optimization/dedupe.ts
interface DuplicateGroup {
  recipes: Recipe[];
  similarity: number; // 0-1
  suggestion: string; // "Merge into single recipe"
}

async function findDuplicates(recipes: Recipe[]): Promise<DuplicateGroup[]> {
  return aiClient.optimize('dedupe', recipes);
}
```

### 5.2 Ingredient Reuse Analysis

```typescript
// src/lib/ai/optimization/ingredientReuse.ts
interface IngredientAnalysis {
  ingredient: string;
  usedIn: Recipe[];
  unusedInMenu: boolean;
}

interface ReuseSuggestion {
  suggestion: string;
  reasoning: string;
  ingredientsAffected: string[];
}

function analyzeIngredientUsage(
  activeMenu: Recipe[],
  allRecipes: Recipe[]
): IngredientAnalysis[];

async function suggestForIngredientReuse(
  activeMenu: Recipe[],
  backlog: Recipe[]
): Promise<ReuseSuggestion[]> {
  return aiClient.optimize('ingredients', activeMenu, backlog);
}
```

### 5.3 Dietary Coverage

```typescript
// src/lib/ai/optimization/dietaryCoverage.ts
interface CoverageReport {
  tag: DietaryTag;
  count: number;
  recipes: Recipe[];
  isCovered: boolean; // at least 1 option
}

interface CoverageSuggestion {
  missingTag: DietaryTag;
  suggestedRecipe: Recipe;
  reasoning: string;
}

function analyzeDietaryCoverage(menu: Recipe[]): CoverageReport[];

async function suggestForCoverage(
  menu: Recipe[],
  backlog: Recipe[]
): Promise<CoverageSuggestion[]> {
  return aiClient.optimize('dietary', menu, backlog);
}
```

### 5.4 Cost Optimization

```typescript
// src/lib/ai/optimization/cost.ts
interface CostAnalysis {
  totalCost: number;
  perRecipe: { recipe: Recipe; cost: number }[];
  highestCost: Recipe;
  lowestCost: Recipe;
}

interface CostSuggestion {
  recipe: Recipe;
  currentCost: number;
  suggestedSwap: string;
  estimatedSavings: number;
}

function analyzeCosts(menu: Recipe[]): CostAnalysis;

async function suggestCostReductions(menu: Recipe[]): Promise<CostSuggestion[]> {
  return aiClient.optimize('cost', menu);
}
```

### 5.5 Optimization UI

```typescript
// src/components/optimization/OptimizationPanel.tsx
// - Tabs: Duplicates | Ingredients | Dietary | Cost
// - Each tab shows analysis + suggestions
// - "Apply" button to accept suggestions
// - Suggestions appear as actionable cards
```

### 5.6 Deliverables
- [ ] Deduplication detection and merge suggestions
- [ ] Ingredient usage analysis
- [ ] Dietary coverage report and suggestions
- [ ] Cost analysis and optimization suggestions
- [ ] Optimization panel UI
- [ ] "Apply suggestion" functionality

---

## Phase 6: Re-Theming

### 6.1 Theme Engine

```typescript
// src/lib/ai/theming.ts
interface ThemeConfig {
  name: string;
  description: string;
  examples?: { before: string; after: string }[];
}

const PRESET_THEMES: ThemeConfig[] = [
  { name: 'Halloween', description: 'Spooky, fun names with dark/autumn colors' },
  { name: 'Christmas', description: 'Festive, warm, traditional holiday naming' },
  { name: 'Summer', description: 'Light, fresh, tropical vibes' },
  { name: 'Minimalist', description: 'Simple, elegant, ingredient-focused' },
];

async function reThemeRecipes(
  recipes: Recipe[],
  theme: ThemeConfig | string
): Promise<{ original: Recipe; themed: Partial<Recipe> }[]> {
  return aiClient.theme(recipes, typeof theme === 'string' ? theme : theme.description);
}
```

### 6.2 Re-Theme UI

```typescript
// src/components/theming/ReThemeModal.tsx
// - Select preset theme or enter custom description
// - Preview changes before applying
// - Apply to: Current menu / Recipe box / Selected recipes
// - Option to create copy vs. modify in place
```

### 6.3 Deliverables
- [ ] Theme engine with presets
- [ ] Custom theme description support
- [ ] Preview before applying
- [ ] Batch re-theming
- [ ] Undo/create copy options

---

## Phase 7: Evaluation Dashboard

### 7.1 Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Evaluation Dashboard                                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Total Cost  │  │ Recipes     │  │ Unique Ingredients  │  │
│  │ $127.50     │  │ 12          │  │ 34                  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  Dietary Coverage                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Vegan       ████████░░░░░░░░░░░░  4 items              ││
│  │ Vegetarian  ████████████░░░░░░░░  6 items              ││
│  │ Gluten-Free ████░░░░░░░░░░░░░░░░  2 items              ││
│  │ Nut-Free    ██████████████░░░░░░  7 items              ││
│  │ Dairy-Free  ██████░░░░░░░░░░░░░░  3 items              ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Ingredient List                     │  Cost Breakdown      │
│  ┌────────────────────────────────┐  │  ┌────────────────┐  │
│  │ butternut squash (3 recipes)   │  │  │ Recipe    Cost │  │
│  │ olive oil (8 recipes)          │  │  │ Soup      $8.50│  │
│  │ garlic (6 recipes)             │  │  │ Salad     $6.20│  │
│  │ ...                            │  │  │ ...            │  │
│  └────────────────────────────────┘  │  └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Components

```typescript
// src/components/dashboard/
// - MetricCard.tsx (single stat with label)
// - DietaryCoverageChart.tsx (bar chart)
// - IngredientList.tsx (sortable, filterable)
// - CostBreakdown.tsx (table with totals)
```

### 7.3 Deliverables
- [ ] Dashboard layout with responsive grid
- [ ] Summary metrics cards
- [ ] Dietary coverage visualization
- [ ] Ingredient usage list with counts
- [ ] Cost breakdown table
- [ ] Export dashboard as image/PDF (stretch)

---

## Phase 8: Chat Interface

### 8.1 General Chat (Sidebar)

```typescript
// src/components/chat/ChatSidebar.tsx
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recipes?: Recipe[]; // Suggested recipes as cards
  timestamp: string;
}

// Features:
// - Conversation history (session only, not persisted)
// - Recipe suggestions rendered as draggable cards
// - Context: all recipes, current menu
```

### 8.2 Mini Chat (Inline)

```typescript
// src/components/chat/MiniChat.tsx
// - Single input field between menu and backlog
// - Quick commands: "add vegan", "remove expensive", "suggest soup"
// - Results appear as temporary cards above input
// - Drag to active menu to add
```

### 8.3 AI Chat System Prompt

```typescript
const CHAT_SYSTEM_PROMPT = `
You are a helpful menu planning assistant for Menu Mixer.
You have access to the user's recipe collection and current menu.

When suggesting recipes, format them as JSON that can be parsed:
\`\`\`json
{"type": "recipe_suggestion", "recipes": [...]}
\`\`\`

You can help with:
- Finding recipes by ingredient or dietary requirement
- Suggesting additions to balance a menu
- Answering questions about the current menu
- Generating new recipe ideas

Current menu has {menuCount} items. Recipe library has {totalCount} recipes.
`;
```

### 8.4 Deliverables
- [ ] Chat sidebar with message history
- [ ] Mini chat inline component
- [ ] Recipe cards in chat responses
- [ ] Drag from chat to menu
- [ ] Context-aware suggestions

---

## Phase 9: Polish & Export

### 9.1 JSON Export/Import

```typescript
// src/lib/export/json.ts
interface ExportData {
  version: string;
  exportedAt: string;
  recipes: Recipe[];
  recipeBoxes: RecipeBox[];
  menus: Menu[];
}

function exportAllData(): ExportData;
function importData(data: ExportData): Promise<void>;
```

### 9.2 Settings Panel

```typescript
// src/components/settings/SettingsPanel.tsx
// - Account info (tier, usage stats)
// - Theme (light/dark)
// - Export all data
// - Import data
// - Clear all data (with confirmation)
// - Logout (clear invite code)
```

### 9.3 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Open command palette / quick search |
| `Cmd+N` | New recipe |
| `Cmd+E` | Edit selected recipe |
| `Delete` | Remove selected from menu |
| `Cmd+S` | Manual save (auto-save is default) |

### 9.4 Error Handling & Loading States

- Skeleton loaders for async operations
- Toast notifications for success/error
- Retry logic for AI API calls
- Graceful degradation when offline

### 9.5 Deliverables
- [ ] JSON export/import
- [ ] Settings panel
- [ ] Keyboard shortcuts
- [ ] Loading states and skeletons
- [ ] Error toasts and handling
- [ ] Empty states

---

## Phase 10: Testing & Launch Prep

### 10.1 Testing Strategy

| Type | Tools | Coverage |
|------|-------|----------|
| Unit | Vitest | Utils, parsers, DB operations |
| Component | Vitest + Testing Library | UI components |
| E2E | Playwright | Critical user flows |

### 10.2 Critical E2E Flows
1. Import PDF → Review → Add to menu
2. Create menu → Add recipes → Reorder
3. Run optimization → Apply suggestion
4. Export data → Import on new browser

### 10.3 Performance Targets
- Initial load: <2s
- Recipe card render: <50ms
- AI operations: <5s with loading indicator
- IndexedDB operations: <100ms

### 10.4 Launch Checklist
- [ ] README with setup instructions
- [ ] Environment variable documentation
- [ ] Build optimization (code splitting, tree shaking)
- [ ] Error tracking setup (Sentry or similar)
- [ ] Analytics setup (privacy-respecting)
- [ ] Landing page
- [ ] Domain configured

### 10.5 Deliverables
- [ ] Unit test suite (>80% coverage on utils)
- [ ] Component tests for critical UI
- [ ] E2E tests for main flows
- [ ] Performance audit passed
- [ ] Production build optimized
- [ ] Documentation complete

---

## Dependency Graph

```
Phase 0 (Setup)
    │
    ├─────────────────────────────┐
    ▼                             ▼
Phase 1 (Auth/Worker)      Phase 2 (Data Layer)
    │                             │
    └──────────┬──────────────────┘
               ▼
         Phase 3 (Recipe Cards)
               │
               ▼
         Phase 4 (Menu Editor)
               │
    ┌──────────┼──────────────────┐
    ▼          ▼                  ▼
Phase 5     Phase 6           Phase 7
(Import)    (Optimize)        (Re-theme)
    │          │                  │
    └──────────┴──────────────────┘
               │
               ▼
         Phase 8 (Dashboard)
               │
               ▼
         Phase 9 (Chat)
               │
               ▼
         Phase 10 (Polish)
               │
               ▼
         Phase 11 (Testing)
```

**Note**: Phase 1 (Auth/Worker) and Phase 2 (Data Layer) can be developed in parallel. All AI-dependent features (Import, Optimize, Re-theme, Chat) require Phase 1.

---

## MVP Scope (Phases 0-5)

For initial launch, complete:
- **Phase 0**: Project setup
- **Phase 1**: Auth & AI proxy (Cloudflare Worker)
- **Phase 2**: Data layer
- **Phase 3**: Recipe cards
- **Phase 4**: Menu editor (basic, no connections)
- **Phase 5**: Recipe import

This delivers:
- Invite code authentication with tiered access
- Working recipe import from any source (AI-powered)
- Visual menu editor with drag-and-drop
- Local storage with export/import
- Basic dietary tagging
- Usage tracking and rate limiting

Phases 6-11 are post-MVP enhancements.

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI API costs unpredictable | Worker-side rate limiting, tiered usage caps, usage dashboard |
| React Flow performance with many cards | Virtual scrolling for backlog, limit active menu to 20 |
| IndexedDB storage limits | Monitor usage, warn at 80%, offer export |
| PDF parsing accuracy | Allow manual editing, show confidence scores |
| Browser compatibility | Target Chrome/Firefox/Safari latest 2 versions |
| Invite code abuse | Hash codes, rate limit validation attempts, IP tracking |
| Worker downtime | Graceful degradation (offline editing works, AI features show "unavailable") |
| Schema evolution | Semi-structured markdown storage allows forward compatibility |
