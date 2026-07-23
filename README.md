# MARO Beta Version

> Trego çka të duhet. **Maro e maron.**

An AI-powered website builder — **Beta**. A single-screen, app-first experience:
you land, type what website you want, pick the type + speed, and Maro generates
it with **Anthropic Claude Opus 4.8** (`claude-opus-4-8`).

Real backend is wired in via **Supabase**: real email/password auth, per-user
credits, a generation log, and an in-app **Admin** panel (grant credits, edit the
master prompt, edit pricing). Projects are stored in `localStorage` for this
iteration. Credits are **test mode** — only the admin grants them.

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
| `ANTHROPIC_EFFORT` | `high` | Default adaptive-thinking effort. Speed overrides it per request. |
| `OPENAI_API_KEY` | _(empty)_ | Image tools (maro Logo, maro Imazh). |
| `ELEVENLABS_API_KEY` | _(empty)_ | Audio tool (maro Zo): TTS, music, SFX, voice change, isolation, transcription. |
| `ELEVEN_VOICE_FEMALE` / `ELEVEN_VOICE_MALE` | _(defaults)_ | Optional override of the voice ids used for Femëror / Mashkullor. |
| `NEXT_PUBLIC_SUPABASE_URL` | _(empty)_ | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | _(empty)_ | Supabase anon (public) key. |
| `SUPABASE_SERVICE_ROLE_KEY` | _(empty)_ | Server-only service role key (credit deduction). Keep secret. |

`.env.local` is gitignored. With no Anthropic key the generation falls back to
the local content factory. With no Supabase keys the app runs but auth/credits
are disabled.

### Supabase setup (one time)

1. Create a free Supabase project → copy the URL + anon key + service role key
   into `.env.local` (and into Vercel → Project → Settings → Environment
   Variables for all environments).
2. Open Supabase → SQL Editor → run the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This
   creates `profiles`, `app_settings` (master prompt + pricing), `generations`,
   RLS policies, the signup trigger, and the atomic `spend_credits` function.
3. The admin account is **`erzen@nice.al`** — sign up with that email and it is
   auto-flagged as admin (with test credits). Everyone else starts at 0 credits;
   the admin grants credits from `/admin`.

### Credit model (editable in `/admin`)

- Base per type: Landing = 5, Business = 10, Platform = 20 credits.
- Speed multiplies cost and sets Opus effort: Slow (`xhigh`, ×1), Fast
  (`high`, ×1.5), 2x Faster (`medium`, ×2). Cost = `ceil(base × mult)`.
- Editor chat edits cost a flat `editCost` (default 2). Credits are deducted
  **atomically server-side** before the model is called, and refunded on failure.

AI endpoints: `POST /api/ai/generate` (wizard → full site) and
`POST /api/ai/edit` (editor chat → theme/section edits). Both run server-side so
your key is never exposed to the browser. All imagery stays 100% local
(deterministic SVGs) — the model never returns external image URLs.

## The journey

Home (composer) → type your prompt + pick Type/Speed → Generate → (login gate if
needed → credit gate if needed) → simulated build → Editor (AI chat, live
text/color/font/image editing, pages, versions, SEO) → Publish → `*.maro.al`
preview. Projects persist in `localStorage`; auth + credits live in Supabase.

- **`/`** — app shell: sidebar (projects, account, admin) + centered composer.
- **`/admin`** — admin only: grant credits, edit master prompt (+ final-prompt
  preview), edit pricing, view generation log.

## Structure

```
src/
  app/                     # routes (landing, auth, dashboard, wizard, editor, ...)
  components/
    ui/                    # reusable primitives (Button, Modal, Toast, ...)
    app/                   # composer, home sidebar, credit/auth modals
    auth/                  # auth panel + layout
    dashboard/             # app header
    editor/                # editor shell + panels
    website-previews/      # live generated-website renderer (swappable)
  context/                 # global store (Supabase auth) + editor state
  lib/
    types/                 # data model
    supabase/              # browser + server clients, domain types
    hooks/                 # useSettings (pricing + master prompt)
    mock/                  # themes, content factory, images
    ai/                    # Claude Opus 4.8 client, prompts, schema, normalize
    services/              # generation / publish / ai-edit / project services
    storage/               # localStorage layer
    utils/
supabase/migrations/       # SQL schema (run in Supabase SQL editor)
  app/api/ai/              # server routes: /generate and /edit
```

## Phase 2 replacement points

The mock services are the seams for Phase 2: fake auth → real auth, mock project
service → database, local uploads → asset storage, local preview → remote
iframe, fake publish → real deployment. **AI generation/editing is already
real** (Claude Opus 4.8) — the remaining swap is persisting projects to a DB
instead of `localStorage`.
