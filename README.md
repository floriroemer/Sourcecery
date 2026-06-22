# Sourcecery

A NotebookLM-inspired app for source-grounded AI research. Upload PDFs, documents, videos, and audio — then chat with your sources, generate insights, and create audio overviews, all grounded in what you upload.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- **Auth**: Clerk
- **Database**: Neon Postgres with pgvector
- **Storage**: Vercel Blob
- **ORM**: Drizzle ORM
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- An `.env` file with the following variables:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SECRET=whsec_...

# Neon
NEON_Connection_String=postgresql://...

# Vercel Blob
BLOB_READ_WRITE_TOKEN=...

# AI (deferred to later phase)
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=sk_...
```

### Installation

```bash
npm install
```

### Database setup

Enable pgvector on Neon (one-time):

```bash
node -e "const {Pool} = require('@neondatabase/serverless'); const pool = new Pool({connectionString: process.env.NEON_Connection_String}); pool.query('CREATE EXTENSION IF NOT EXISTS vector;').then(() => {console.log('pgvector enabled!'); return pool.end();}).catch(e => {console.error(e.message); process.exit(1);})"
```

Push the schema:

```bash
npm run db:push
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── actions/          # Server actions (notebooks, sources)
│   ├── api/
│   │   ├── chat/         # Chat endpoint (stub)
│   │   ├── upload/       # File upload to Vercel Blob
│   │   └── webhooks/     # Clerk user sync webhook
│   ├── dashboard/        # Dashboard with notebook grid
│   ├── notebooks/[id]/   # 3-pane notebook workspace
│   ├── sign-in/          # Clerk sign-in
│   ├── sign-up/          # Clerk sign-up
│   ├── globals.css       # Tailwind theme
│   ├── layout.tsx        # Root layout with ClerkProvider
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # Reusable UI primitives (button, card, etc.)
│   ├── navbar.tsx        # Top navigation
│   ├── notebook-sidebar.tsx
│   ├── notebook-card.tsx
│   ├── source-list.tsx   # Upload dropzone + source list
│   ├── chat-panel.tsx    # Chat interface
│   └── notes-panel.tsx   # Audio overview + notes
├── db/
│   ├── schema.ts         # Drizzle schema (users, notebooks, sources, embeddings, chat_messages)
│   └── index.ts          # Neon serverless Drizzle client
├── lib/
│   ├── auth.ts           # Clerk → DB user helpers
│   ├── blob.ts           # Vercel Blob upload helper
│   ├── files.ts          # File type validation
│   └── utils.ts          # cn, formatBytes, formatDate, getInitials
└── proxy.ts              # Clerk middleware (Next.js 16 proxy)
```

## Features

### Current (Phase 1)
- ✅ Landing page with professional design
- ✅ Clerk authentication (sign-in, sign-up, protected routes)
- ✅ Dashboard with notebook grid
- ✅ Create/delete notebooks
- ✅ Notebook workspace (3-pane: sources, chat, notes)
- ✅ File upload to Vercel Blob (PDF, Word, PPT, video, audio, text, Markdown)
- ✅ Source management (list, delete, status badges)
- ✅ Chat interface (stub responses, messages saved to DB)
- ✅ Neon Postgres with pgvector schema ready

### Planned (Phase 2+)
- 🔜 OpenAI-powered source-grounded chat with citations
- 🔜 Document processing & chunking (Python workers via Inngest/Trigger.dev)
- 🔜 Embedding generation & pgvector similarity search
- 🔜 Audio overviews (ElevenLabs)
- 🔜 Study guides, FAQs, timelines
- 🔜 Collaborative notebooks

## License

See [LICENSE](LICENSE).