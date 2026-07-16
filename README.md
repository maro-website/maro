# Maro — Phase 1 (Local Prototype)

> Trego çka të duhet. **Maro e maron.**

An AI-powered website builder — **Phase 1 local prototype**. Everything runs
locally with simulated data (no database, auth, or payments). The product looks
and behaves like a real SaaS app so the complete UX can be tested and demoed.

**Real AI is wired in:** website generation and the in-editor chat are powered
by **Anthropic Claude Opus 4.8** (`claude-opus-4-8`) via local API routes. Add a
key to use it; without one, Maro falls back to the built-in mock AI so the app
still runs fully offline.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS (centralized design tokens)
- Lucide icons
- Plus Jakarta Sans (self-hosted via `@fontsource`)
- pnpm

Brand primary color: `#5a28e5`.

## Getting started

```bash
pnpm install
pnpm dev      # runs on http://localhost:3006
```

Other commands:

```bash
pnpm build
pnpm lint
```

### Enabling real AI (Claude Opus 4.8)

Copy the template and paste your Anthropic API key:

```bash
cp .env.example .env.local
# then edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | _(empty)_ | Your key. Empty = mock AI fallback. |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` | Model id. |
| `ANTHROPIC_EFFORT` | `high` | Adaptive-thinking effort (`low`–`xhigh`). |

`.env.local` is gitignored. With no key, the wizard uses the local content
factory and the editor chat uses the local interpreter — nothing breaks.

AI endpoints: `POST /api/ai/generate` (wizard → full site) and
`POST /api/ai/edit` (editor chat → theme/section edits). Both run server-side so
your key is never exposed to the browser. All imagery stays 100% local
(deterministic SVGs) — the model never returns external image URLs.

## The full journey (all local)

Landing → Sign up → Dashboard → New project wizard → Simulated generation →
Editor (AI chat, live text/color/font/image editing, pages, versions, SEO) →
Publish → fake `*.maro.al` URL → back to Dashboard. State persists in
`localStorage` across refreshes.

- **Try Demo** on the landing page opens the flagship demo project (NICE
  Creative Agency) fully populated.
- **Reset Demo Data** (user menu) clears local data and restores defaults.

## Structure

```
src/
  app/                     # routes (landing, auth, dashboard, wizard, editor, ...)
  components/
    ui/                    # reusable primitives (Button, Modal, Toast, ...)
    marketing/             # landing page
    dashboard/             # app header, project cards
    wizard/                # new-project flow
    editor/                # editor shell + panels
    website-previews/      # live generated-website renderer (swappable)
  context/                 # global store + editor state
  lib/
    types/                 # data model
    mock/                  # themes, content factory, demo/seed data, images
    ai/                    # Claude Opus 4.8 client, prompts, schema, normalize
    services/              # generation / publish / ai-edit / project services
    storage/               # localStorage layer
    utils/
  hooks/
  app/api/ai/              # server routes: /generate and /edit
```

## Phase 2 replacement points

The mock services are the seams for Phase 2: fake auth → real auth, mock project
service → database, local uploads → asset storage, local preview → remote
iframe, fake publish → real deployment. **AI generation/editing is already
real** (Claude Opus 4.8) — the remaining swap is persisting projects to a DB
instead of `localStorage`.
