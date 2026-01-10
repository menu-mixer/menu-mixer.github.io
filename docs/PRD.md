# Menu Mixer - Product Requirements Document

## Overview

Menu Mixer is a browser-based recipe and menu management application for bakers, cafe owners, and caterers. Users can import recipes from any source, organize them into menus and collections, and use AI to optimize for ingredient reuse, dietary coverage, and seasonal theming.

**Core value proposition**: A lightweight tool that accepts recipes in any format, helps organize them into menus and collections, and uses AI to surface insights—without forcing users into rigid enterprise software.

---

## Problem Statement

Small bakeries, cafes, and catering operations struggle with menu planning:
- Recipes scattered across notebooks, Google Docs, PDFs, and screenshots
- Planning seasonal menus requires juggling ingredients, dietary restrictions, costs, and preferences
- Current solutions are too simple (spreadsheets) or too complex (enterprise software with unnecessary features)

**Gap in market**: No tool combines drag-and-drop recipe import, visual menu editing, AI optimization, and browser-local storage for small food businesses.

---

## User Personas

### Primary: Christie the Cafe Owner
- Runs a 12-seat cafe with rotating seasonal menu (8-12 items)
- Sources recipes from cookbooks, blogs, suppliers, experiments
- Needs to balance costs, prep time, dietary variety
- Comfortable with Google Docs and Canva, not a developer
- **Pain points**: recipe versioning, ingredient waste, menu fatigue, cost estimation

### Secondary: Baker with Multiple Product Lines
- Standing recipes plus seasonal specials
- Different recipe boxes for wholesale, retail, catering
- Wants ingredient reuse optimization across product lines

### Tertiary: Caterer/Pop-Up Operator
- Event-specific menus (6-20 items)
- High recipe reuse, many one-time menus

---

## Core Features

### 1. Universal Recipe Import (Drop Zone)
Drag any file or text into a drop zone. App parses recipes from PDFs, Word docs, images, URLs, plain text, or multi-recipe files.

**User flow**:
1. User drags `fall_soups.pdf` into drop zone
2. App extracts 5 recipes, creates 5 recipe cards in "Menu Backlog"
3. User reviews, edits, or drags cards into active menu

**Technical requirements**:
- Multimodal LLM (GPT-4V or Claude 3.5 Sonnet) for image/PDF parsing
- Structured extraction: name, ingredients (with quantities), instructions, metadata
- Batch import support: one file → multiple cards

### 2. Recipe Cards (Source of Truth)
Each recipe is a card with:

**Structured data (AI-generated, editable)**:
- Recipe name
- Ingredient list with quantities
- Dietary tags (vegan, vegetarian, gluten-free, nut-free, dairy-free) - auto-tagged by AI
- Metrics: prep time, assembly time, ingredient cost, suggested price, dietary profiles

**Freeform text**:
- Menu description (customer-facing)
- Assembly instructions (kitchen-facing)

**Actions**:
- Optimization buttons: "Seasonal flip", "Max ingredient reuse", "Profile coverage"
- Text box for nudges: "More vegan options", "Use butternut squash", etc.

### 3. Recipe Boxes (Named Collections)
Named collections of recipes. Examples: "Summer 2026 Bakery", "Wholesale Client: GreenLeaf", "Halloween Specials"

**Use cases**:
- Organize by season, client, or optimization stage
- Compare before/after optimization versions
- Maintain different sets for sales channels

**UI**: Sidebar shows recipe boxes as folders. Click to view, drag recipes between boxes.

### 4. Menu Editor (Active + Backlog)
**Layout**:
- **Top half**: Active menu (6-20 cards in visual grid, draggable)
- **Bottom half**: Backlog (all other recipes, filterable)

**Interactions**:
- Drag recipe from backlog to active menu
- Drag to reorder
- Click card to expand/edit
- Connection lines showing ingredient overlap (optional)

### 5. Optimization Routines

| Routine | Description |
|---------|-------------|
| **Deduplicate & Merge** | Find exact/near-duplicates, suggest combining |
| **Ingredient Reuse** | Highlight shared ingredients, suggest additions |
| **Dietary Coverage** | Count recipes per profile, suggest gaps |
| **Cost Optimization** | Flag high-cost recipes, suggest swaps |

### 6. Re-Theming
Take a menu and rewrite names/descriptions for a theme.

**Examples**:
- "Spooky Halloween": "Butternut Squash Soup" → "Witch's Cauldron Potion"
- "Fourth of July": "Berry Tart" → "Star-Spangled Berry Tart"

**UI**: Select menu → "Re-theme" → choose/describe theme → preview → apply

### 7. Evaluation Dashboard

| Panel | Content |
|-------|---------|
| **Ingredient List** | Unique ingredients from active menu, usage highlighting, dietary flags |
| **Taste Profiles** | Count/chart of items per dietary profile |
| **Estimated Cost** | Total and per-recipe ingredient costs |

### 8. Chat Interface

**General chat** (sidebar/modal):
- Ask questions: "What recipes use butternut squash?"
- Get suggestions: "Show me 3 vegan dessert ideas"
- Conversational planning: "I need a fall menu with 10 items, under $60, 3+ vegan"

**Mini-chat** (between active menu and backlog):
- Contextual to current menu
- Quick operations: "Add a gluten-free option", "Remove highest-cost recipe"
- Returns recipe cards that can be dragged into menu

---

## Technical Architecture

### Stack
| Layer | Technology |
|-------|------------|
| Frontend | React (latest stable, functional components, hooks) |
| Layout Engine | React Flow for draggable grid and connections |
| State/Storage | IndexedDB (recipes), localStorage (config + auth) |
| AI Proxy | Cloudflare Worker (auth + rate limiting + OpenAI proxy) |
| AI Provider | OpenAI GPT-4 or Claude 3.5 Sonnet |
| Parsing | Multimodal LLM for image/PDF extraction |

### Authentication: Invite Code System

Instead of BYOK (Bring Your Own Key), Menu Mixer uses an **invite code system** with a Cloudflare Worker proxy. This provides better UX for non-technical users and enables usage tracking/limits.

```
┌─────────────┐    invite code     ┌──────────────────┐     API key      ┌─────────┐
│   Browser   │ ────────────────►  │ Cloudflare Worker │ ───────────────► │ OpenAI  │
│   (React)   │ ◄──────────────── │   (Auth + Proxy)  │ ◄─────────────── │   API   │
└─────────────┘    AI response     └──────────────────┘    response      └─────────┘
       │
       ▼
  localStorage
  (cached invite code + session)
```

**How it works**:
1. User receives invite code (e.g., `CAFE-CHRISTIE-2026`) via email or signup
2. On first use, user enters invite code in the app
3. Browser sends code to Cloudflare Worker for validation
4. Worker returns a session token (JWT) with tier info and rate limits
5. Browser caches token in localStorage
6. All AI requests include the token; Worker validates and proxies to OpenAI
7. Worker tracks usage per invite code for billing/limits

**Benefits**:
- Users don't need their own API keys (critical for non-technical cafe owners)
- Instant access revocation (disable code server-side)
- Per-user usage tracking and rate limiting
- Enforce free tier limits (20 recipes, 50 AI calls/month)
- Single API key managed by Menu Mixer (cost control)

**Invite Code Tiers**:
| Tier | Code Pattern | Limits |
|------|--------------|--------|
| Free | `FREE-XXXXXX` | 20 recipes, 50 AI calls/month |
| Pro | `PRO-XXXXXX` | Unlimited recipes, 500 AI calls/month |
| Beta | `BETA-XXXXXX` | Unlimited (for early testers) |

**Security**:
- Invite codes are hashed before storage
- Session tokens expire after 30 days (re-validate code)
- Rate limiting at Worker level prevents abuse
- No API keys ever touch the browser

### Data Model: Semi-Structured Markdown

Recipes are stored as **semi-structured markdown** with a predictable layout. This enables schema evolution without migrations—new fields can be added without breaking existing data.

**Why markdown?**
- Forward/backward compatible
- Human-readable exports
- AI generates it naturally
- Easy manual editing
- Graceful degradation for unknown sections

**Recipe (stored as markdown)**:
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

## Description
Creamy roasted butternut squash soup with sage and olive oil.

## Instructions
1. Roast squash at 400F for 45min
2. Blend with broth until smooth

## Notes
Optional section for variations, tips, etc.
```

**IndexedDB Record** (wrapper):
```json
{
  "id": "uuid",
  "markdown": "# Butternut Squash Soup\n\n## Metadata\n...",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

**Recipe Box**:
```json
{
  "id": "uuid",
  "name": "Fall 2026 Menu",
  "recipeIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Menu**:
```json
{
  "activeRecipeIds": ["uuid1", "uuid2"],
  "layout": [{"id": "uuid1", "x": 0, "y": 0}, {"id": "uuid2", "x": 200, "y": 0}]
}
```

### Scale Assumptions
- 100 menus, 500-1000 recipes per browser (~10MB IndexedDB)
- AI calls: <3 seconds per operation

### Offline-First
- All data in browser
- AI requires internet, editing works offline
- JSON export/import for backup

---

## Feature Prioritization

### MVP (Must-Have)
- [ ] Invite code authentication (Cloudflare Worker)
- [ ] Recipe import (drag & drop, PDF/image parsing)
- [ ] Recipe cards (editable, structured data)
- [ ] Active menu + backlog (drag to move)
- [ ] Basic optimization (dedupe, ingredient list)
- [ ] Browser-local storage (IndexedDB)

### v1.1 (Should-Have)
- [ ] Recipe boxes (named collections)
- [ ] Re-theming
- [ ] Evaluation dashboard
- [ ] Chat interface

### v2+ (Nice-to-Have)
- [ ] Multi-user sharing
- [ ] Mobile-responsive
- [ ] Photo uploads
- [ ] PDF/Word export
- [ ] Voice input
- [ ] Supplier pricing integration

---

## Success Metrics

### Launch (90 Days)
| Metric | Target |
|--------|--------|
| Users signed up | 100 |
| Users with 1+ menu | 50 |
| Users with 10+ recipes | 20 |
| Pro upgrades | 10 |

### Engagement
| Metric | Target |
|--------|--------|
| Weekly active users | 40% of total |
| Avg recipes/user | 30 |
| Avg menus/user | 5 |
| AI feature usage | 60% |

### Revenue (Year 1)
- 500 total users
- 50 Pro subscribers @ $10/month
- $6,000 ARR

---

## Pricing Model

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | 20 recipes, 3 menus, basic AI |
| Pro | $10-15/month | Unlimited recipes/menus, advanced AI |
| Team | $30-50/month | Shared recipe boxes, multi-user (v2) |

---

## Open Questions

1. **AI API costs**: ~$2-5 per 100 recipes parsed. Covered by tier pricing; monitor usage via Worker analytics.
2. **Export formats**: Start JSON-only, add PDF if requested?
3. **Image handling**: Start without photos (browser storage limits)?
4. **Multi-user**: Requires backend/auth. Defer to v2? (Note: invite codes could enable basic multi-device sync via Worker KV)
5. **Mobile**: Start desktop-first (React Flow optimized for desktop)?
6. **Invite code distribution**: Manual (email) for beta, self-serve signup with Stripe for launch?
7. **Worker KV vs D1**: Use KV for invite codes/sessions (simple), or D1 for richer usage analytics?

---

## Competitive Landscape

| Product | Gap |
|---------|-----|
| Paprika Recipe Manager | No AI, no menu planning |
| Notion | Manual setup, no recipe features |
| Canva | Visual only, not for recipes |
| ChatGPT | No structured storage or UI |
