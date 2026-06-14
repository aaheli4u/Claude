# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup (install deps + generate Prisma client + run migrations)
npm run setup

# Development server (Turbopack)
npm run dev

# Build for production
npm run build

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx vitest run src/components/chat/__tests__/ChatInterface.test.tsx

# Reset the database
npm run db:reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev
```

> **Do not run `npm audit fix`** — dependencies are pinned to specific compatible versions; `audit fix` can break them.

## Architecture

UIGen is a Next.js 15 App Router app that lets users describe React components in chat and see them rendered live. The AI writes code into an in-memory virtual file system; a sandboxed `<iframe>` runs the result.

### Key data flows

**Chat → code generation:**
1. `src/app/api/chat/route.ts` — the only API route for AI interaction. Receives messages + the serialized virtual FS, reconstructs the FS, streams a `streamText` response via Vercel AI SDK.
2. The model (`claude-haiku-4-5` via `@ai-sdk/anthropic`) is given two tools: `str_replace_editor` (create/edit files) and `file_manager` (rename/delete).
3. `src/lib/provider.ts` — `getLanguageModel()` returns the real Anthropic model when `ANTHROPIC_API_KEY` is set; otherwise falls back to `MockLanguageModel`, which returns canned components without calling the API.

**Virtual file system:**
- `src/lib/file-system.ts` — `VirtualFileSystem` class. All generated files live in memory only (nothing written to disk). Supports CRUD, rename, serialize/deserialize (for saving to DB and sending over the wire).
- `src/lib/contexts/file-system-context.tsx` — React context that wraps `VirtualFileSystem`. `handleToolCall` is the bridge: when the AI calls `str_replace_editor` or `file_manager`, the context applies those operations to the in-memory FS.

**Live preview:**
- `src/lib/transform/jsx-transformer.ts` — transforms JSX/TSX files with `@babel/standalone`, then builds an ES module import map using blob URLs. Third-party imports are resolved via `esm.sh`. CSS files are collected into inline `<style>` tags.
- `src/components/preview/PreviewFrame.tsx` — renders an `<iframe srcdoc>` with the full import map HTML. Auto-detects entry point (`/App.jsx` → `/App.tsx` → `/index.jsx` etc.). Displays Babel syntax errors inline without crashing.

**AI system prompt:**
- `src/lib/prompts/generation.tsx` — instructs the model to always create `/App.jsx` as the root, use `@/` import aliases for local files, and style with Tailwind (not inline styles). Sent with Anthropic's prompt caching enabled (`ephemeral`).

**Auth & persistence:**
- Auth is JWT-based via `jose`, stored in an `httpOnly` cookie. `src/lib/auth.ts` handles session create/get/delete (server-only).
- `src/middleware.ts` protects `/api/projects` and `/api/filesystem` routes.
- Prisma + SQLite (`prisma/dev.db`). Schema: `User` (email/password) → `Project` (stores serialized messages JSON + serialized FS JSON). Anonymous users can use the app but projects are not persisted.
- `src/lib/anon-work-tracker.ts` tracks chat messages and file system state for unauthenticated users locally. On sign-in, `useAuth` (`src/hooks/use-auth.ts`) automatically migrates that work into a persisted project.
- Generated Prisma client lives in `src/generated/prisma/` (not `node_modules`).
- Database schema is defined in `prisma/schema.prisma` — reference it for all model/field/relation details.

### Component structure

```
src/
  app/
    api/chat/route.ts       # AI streaming endpoint
    [projectId]/page.tsx    # Project detail page
  components/
    chat/                   # ChatInterface, MessageList, MessageInput, MarkdownRenderer
    editor/                 # CodeEditor (Monaco), FileTree
    preview/                # PreviewFrame (iframe sandbox)
    auth/                   # AuthDialog, SignInForm, SignUpForm
    ui/                     # shadcn/ui primitives (button, dialog, tabs, etc.)
  lib/
    contexts/               # file-system-context, chat-context (React contexts)
    transform/              # jsx-transformer (Babel + import map builder)
    tools/                  # str-replace.ts, file-manager.ts (AI tool definitions)
    prompts/                # generation.tsx (system prompt)
    file-system.ts          # VirtualFileSystem class
    provider.ts             # getLanguageModel() + MockLanguageModel
    auth.ts                 # JWT session helpers (server-only)
    prisma.ts               # Prisma client singleton
```

### Tests

Tests use Vitest + jsdom + `@testing-library/react`. Test files live alongside the code they test in `__tests__/` subdirectories.

### Environment

Copy `.env.example` to `.env` (or edit `.env` directly). The only required variable for real AI responses:

```
ANTHROPIC_API_KEY=sk-ant-...
```

`JWT_SECRET` defaults to `"development-secret-key"` if unset — fine for local dev.
