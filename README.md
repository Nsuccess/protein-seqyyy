# 🧬 AgingProteins.ai - Longevity Research Platform

> **OpenLongevity AISOC Hackathon Submission**
> 
> A comprehensive AI-powered platform for exploring aging-related proteins, scientific literature, and longevity research using RAG (Retrieval-Augmented Generation) technology.

🌐 **Live Demo**: [protein-seqyyy.vercel.app](https://protein-seqyyy.vercel.app)

---

## 🎯 What We Built

AgingProteins.ai is a **universal protein intelligence platform** that combines:

- **308 aging-related proteins** from the GenAge Human database
- **6,621 indexed paper chunks** with real PMCIDs from Europe PMC
- **4,998 aging-filtered Mol-Instructions** for enhanced ML understanding
- **11 aging theories** classification system
- **3D protein structure visualization** via RCSB PDB
- **AI-powered RAG search** with automatic aging relevance detection

### The Problem We Solved

Traditional protein databases are:
- ❌ Limited to specific query types
- ❌ Hard to navigate for non-experts
- ❌ Missing connections between proteins and aging
- ❌ No visual exploration tools

### Our Solution

- ✅ **Ask ANY question** - not limited to aging topics
- ✅ **Automatic aging detection** - AI finds longevity connections
- ✅ **3D visualization** - interactive protein structures
- ✅ **Beautiful UX** - modern, accessible interface
- ✅ **Comprehensive citations** - direct links to papers with PMCIDs

---

## 🏗️ System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   Railway       │────▶│   NeonDB        │
│   (Frontend)    │     │   (Backend)     │     │   (Vectors)     │
│   Next.js 15    │     │   FastAPI       │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Groq API      │
                    │   Llama 3.3 70B │
                    │   (Fast LLM)    │
                    └─────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, React, Tailwind CSS | Modern UI with App Router |
| **Backend** | FastAPI, Python 3.11 | High-performance API |
| **Vector DB** | NeonDB + pgvector | Cloud-native vector search |
| **LLM** | Groq (Llama 3.3 70B) | Fast inference (~200ms) |
| **Embeddings** | Nebius (Qwen3-8B) | 4096-dim vectors |
| **Hosting** | Vercel + Railway | Serverless deployment |

---

## 🧬 The Science of Aging

### The 11 Hallmarks of Aging

Our system classifies proteins by their connection to established aging theories:

| Theory | Description | Example Proteins |
|--------|-------------|------------------|
| **Genomic Instability** | DNA damage accumulation | TP53, BRCA1, ATM |
| **Telomere Attrition** | Chromosome end shortening | TERT, TERC, POT1 |
| **Epigenetic Alterations** | Gene expression changes | SIRT1, SIRT6, HDAC |
| **Loss of Proteostasis** | Protein quality decline | HSP70, HSP90, HSPA |
| **Mitochondrial Dysfunction** | Energy production failure | POLG, TFAM, PGC1A |
| **Cellular Senescence** | Cell division arrest | CDKN2A, RB1, CDKN1A |
| **Stem Cell Exhaustion** | Regeneration decline | SOX2, NANOG, KLF4 |
| **Altered Intercellular Communication** | Signaling disruption | IGF1, GH, FOXO3 |
| **Disabled Macroautophagy** | Cellular cleanup failure | ATG5, BECN1, LC3 |
| **Chronic Inflammation** | Persistent immune activation | IL6, TNF, NFKB |
| **Dysbiosis** | Microbiome imbalance | TLR4, NOD2, MYD88 |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **API Keys**: Groq, Nebius, NeonDB

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure .env
cp .env.example .env
# Add: GROQ_API_KEY, NEBIUS_API_KEY, NEON_DATABASE_URL

python -m uvicorn app:app --reload
# Backend: http://localhost:8000
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Add: NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# Frontend: http://localhost:3000
```

---

## 📱 Features

### 1. Universal RAG Query (`/query`)
Ask ANY protein question - AI automatically detects aging connections.

### 2. Protein Browser (`/proteins`)
Browse all 308 aging-related proteins with filtering.

### 3. Protein Detail (`/protein-detail/[symbol]`)
- Amino acid sequence visualization
- 3D structure from RCSB PDB
- Associated papers with citations

### 4. Protein Comparison (`/compare`)
Compare up to 4 proteins side-by-side.

### 5. Statistics Dashboard (`/stats`)
Dataset coverage and Mol-Instructions stats.

### 6. Interactive Demo (`/demo`)
Guided tour of all features.

---

## 🔬 Data Sources

| Source | Content | Count |
|--------|---------|-------|
| **GenAge** | Aging-related proteins | 308 |
| **Europe PMC** | Scientific papers | 6,621 chunks |
| **Mol-Instructions** | Aging-filtered examples | 4,998 |
| **RCSB PDB** | 3D structures | On-demand |
| **UniProt** | Protein sequences | On-demand |

### Mol-Instructions Filtering

We filtered the original 495K Mol-Instructions dataset to 4,998 aging-relevant examples using keywords:
- Telomere, senescence, DNA repair
- Autophagy, apoptosis, p53
- Mitochondria, oxidative stress
- Sirtuin, FOXO, and more

---

## 🛠️ API Reference

### Query Endpoints

```http
POST /query/rag-general
  query: string    # Any protein question
  top_k: int       # Results count (default: 5)

POST /query/rag
  query: string
  protein: string  # Filter by symbol
  theories: array  # Filter by aging theory
```

### Protein Endpoints

```http
GET /proteins/genage           # List all proteins
GET /protein/{symbol}          # Protein details
GET /protein/{symbol}/uniprot  # UniProt data
```

### Statistics

```http
GET /stats/comprehensive       # All stats
GET /mol-instructions/stats    # ML dataset stats
GET /vector-store/status       # NeonDB status
```

---

## 🐳 Deployment

### Production Stack

- **Frontend**: Vercel (auto-deploy from GitHub)
- **Backend**: Railway (Docker container)
- **Database**: NeonDB (PostgreSQL + pgvector)

### Environment Variables

```bash
# Backend (Railway)
GROQ_API_KEY=gsk_...
NEBIUS_API_KEY=...
NEON_DATABASE_URL=postgresql://...
VECTOR_STORE_MODE=neon

# Frontend (Vercel)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

---

## 📁 Project Structure

```
aging-proteins/
├── backend/
│   ├── app.py                    # FastAPI routes
│   ├── neon_query_engine.py      # RAG with NeonDB
│   ├── neon_vector_store.py      # pgvector integration
│   ├── aging_relevance_analyzer.py
│   ├── mol_instructions_loader.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/app/                  # Next.js pages
│   ├── src/components/           # React components
│   └── src/lib/api.ts            # API client
│
├── data/
│   ├── raw/genage_human.csv      # 308 proteins
│   └── mol_instructions_sample/  # Aging-filtered ML data
│
└── scripts/
    ├── filter_aging_relevant.py  # Mol-Instructions filter
    └── batch_update_pmids.py     # Citation extraction
```

---

## 🏆 Hackathon Highlights

### Innovation
1. **Universal RAG** - Answer ANY protein question
2. **Automatic Aging Detection** - AI finds longevity connections
3. **Aging-Filtered Dataset** - Curated Mol-Instructions
4. **Real Citations** - PMCIDs extracted from source URLs

### Technical Excellence
- ✅ Full TypeScript frontend
- ✅ Sub-second Groq inference
- ✅ Cloud-native vector search (NeonDB)
- ✅ Serverless deployment (Vercel + Railway)

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- **GenAge** - Human Ageing Genomic Resources
- **Europe PMC** - Scientific paper corpus
- **Mol-Instructions** - Biomolecular instruction dataset
- **Groq** - Fast LLM inference
- **NeonDB** - Serverless PostgreSQL

---

Built with 💙 for the **OpenLongevity AISOC Hackathon**
