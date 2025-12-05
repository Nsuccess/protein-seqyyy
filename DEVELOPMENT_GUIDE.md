# AgingProteins.ai - Development Guide

## Project Overview

A RAG-powered research platform for exploring aging-related proteins. Uses scientific literature to answer questions about proteins and their role in longevity.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│    Backend      │────▶│    NeonDB       │
│   (Next.js)     │     │   (FastAPI)     │     │  (PostgreSQL)   │
│   Port 3000     │     │   Port 8000     │     │   + pgvector    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              ┌─────────┐ ┌─────────┐ ┌─────────┐
              │  Groq   │ │ Nebius  │ │ UniProt │
              │  (LLM)  │ │(Embeds) │ │  (API)  │
              └─────────┘ └─────────┘ └─────────┘
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14 + TypeScript | UI, protein visualization |
| Backend | FastAPI + Python | API, RAG pipeline |
| Vector DB | NeonDB + pgvector | Production vector storage |
| LLM | Groq (llama-3.3-70b) | Answer synthesis |
| Embeddings | Nebius (Qwen3-8B) | Text embeddings (4096 dims) |
| Protein Data | GenAge, UniProt | Reference datasets |

## Data Sources

| Dataset | Records | Purpose |
|---------|---------|---------|
| GenAge | 307 proteins | Aging-related protein registry |
| Aging Theories | 8,196 theories | Classification system |
| Mol-Instructions | 495,004 | Few-shot learning examples |
| Paper Corpus | 6,621 chunks | RAG knowledge base (in NeonDB) |

## Environment Setup

### Required API Keys

Create `backend/.env`:
```env
# Groq - LLM inference (https://console.groq.com)
GROQ_API_KEY=your_key_here

# Nebius - Embeddings (https://nebius.ai)
NEBIUS_API_KEY=your_key_here

# NeonDB - Vector storage (https://neon.tech)
NEON_DATABASE_URL=postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require

# Vector store mode
VECTOR_STORE_MODE=neon  # or "chroma" for local dev
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Local Development

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python -m uvicorn app:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Key Files

### Backend

| File | Purpose |
|------|---------|
| `app.py` | Main FastAPI app, all endpoints |
| `neon_vector_store.py` | NeonDB/pgvector integration |
| `neon_query_engine.py` | RAG query engine for NeonDB |
| `protein_query_engine.py` | ChromaDB query engine (fallback) |
| `genage_loader.py` | GenAge protein data loader |
| `theory_loader.py` | Aging theory classifier |
| `uniprot_client.py` | UniProt API client |
| `migrate_to_neon.py` | ChromaDB → NeonDB migration |

### Frontend

| File | Purpose |
|------|---------|
| `src/lib/api.ts` | Backend API client |
| `src/app/query/page.tsx` | RAG query interface |
| `src/app/proteins/page.tsx` | Protein browser |
| `src/app/protein-detail/[symbol]/page.tsx` | Protein detail + RAG insights |
| `src/components/QueryInterface.tsx` | Query input component |
| `src/components/ProteinCard.tsx` | Protein card with quick insights |

## API Endpoints

### RAG Queries
- `POST /query/rag` - Main RAG query with filters
- `POST /query/rag-general` - General protein questions

### Proteins
- `GET /proteins/genage` - List all GenAge proteins
- `GET /protein/{symbol}` - Get protein details
- `GET /protein/{symbol}/uniprot` - Get UniProt data
- `GET /protein/{symbol}/papers` - Get related papers

### Statistics
- `GET /stats/genage` - GenAge statistics
- `GET /stats/coverage` - Protein coverage stats
- `GET /stats/theories` - Theory distribution
- `GET /vector-store/status` - Vector DB status

### Health
- `GET /health` - Health check

## NeonDB Migration

The project migrated from ChromaDB (SQLite) to NeonDB (PostgreSQL + pgvector) for production.

### Current Status
- ✅ 6,621 vectors migrated to NeonDB
- ✅ Backend auto-switches based on `VECTOR_STORE_MODE`
- ✅ RAG queries working via NeonDB

### Re-running Migration (if needed)
```bash
cd backend
python migrate_to_neon.py
```

### NeonDB Credentials (for team)
- Dashboard: https://console.neon.tech
- Project: `aging-proteins`
- Region: AWS US East 1

## Deployment

### Recommended Stack
- **Frontend**: Vercel (free tier)
- **Backend**: Railway ($5/month) or Render
- **Database**: NeonDB (already set up, free tier)

### Deploy Frontend to Vercel
1. Push to GitHub
2. Import repo in Vercel
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

### Deploy Backend to Railway
1. Create Railway project
2. Connect GitHub repo
3. Set root directory to `backend`
4. Add environment variables from `backend/.env`
5. Deploy

## Known Limitations

1. **Vector Index**: pgvector HNSW/IVFFlat limited to 2000 dims, our embeddings are 4096. Using sequential scan (~200ms per query).

2. **Query Time**: ~15-20 seconds total (embedding + search + LLM generation)

3. **Mol-Instructions**: Large dataset (495K) loads on startup, takes ~30 seconds

## Next Steps

- [ ] Deploy to Vercel + Railway
- [ ] Add user authentication
- [ ] Implement caching for frequent queries
- [ ] Add protein comparison feature
- [ ] Optimize embedding dimensions (consider 1536-dim model)

## Contact

For questions about this codebase, check the commit history or reach out to the team.
