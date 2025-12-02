# 🧬 AgingProteins.ai - Longevity Research Platform

> **OpenLongevity AISOC Hackathon Submission**
> 
> A comprehensive AI-powered platform for exploring aging-related proteins, scientific literature, and longevity research using RAG (Retrieval-Augmented Generation) technology.

---

## 🎯 What We Built

AgingProteins.ai is a **universal protein intelligence platform** that combines:

- **308 aging-related proteins** from the GenAge Human database
- **7,018 scientific papers** from Europe PMC
- **495,004 Mol-Instructions** for enhanced ML understanding
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
- ✅ **Comprehensive citations** - direct links to papers

---

## 🧬 The Science of Aging

### What is Longevity Research?

Longevity research studies the biological mechanisms of aging to extend healthy human lifespan. Our platform focuses on **proteins** - the molecular machines that control aging processes.

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

### Key Longevity Proteins

#### SIRT6 - The Longevity Sirtuin
- **Function**: NAD+-dependent deacetylase
- **Aging Role**: DNA repair, telomere maintenance, glucose metabolism
- **Research**: Overexpression extends lifespan in mice by 15-20%

#### FOXO3 - The Centenarian Gene
- **Function**: Transcription factor
- **Aging Role**: Stress resistance, autophagy, metabolism
- **Research**: Variants associated with exceptional longevity in humans

#### APOE - The Alzheimer's Connection
- **Function**: Lipid transport protein
- **Aging Role**: Cholesterol metabolism, neurodegeneration
- **Research**: APOE4 variant increases Alzheimer's risk; APOE2 is protective

#### TP53 - The Guardian of the Genome
- **Function**: Tumor suppressor
- **Aging Role**: DNA damage response, cell cycle control, apoptosis
- **Research**: Balances cancer prevention with cellular senescence

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Home   │ │  Query  │ │Proteins │ │ Compare │ │  Stats  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │           │           │         │
│  ┌────┴───────────┴───────────┴───────────┴───────────┴────┐   │
│  │              React Components + Tailwind CSS             │   │
│  │  • QueryInterface    • ProteinCard    • SequencePanel   │   │
│  │  • QueryResults      • Navigation     • ProteinViewer   │   │
│  │  • AgingRelevance    • StatsDashboard • DemoMode        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    API Endpoints                         │   │
│  │  POST /query/rag-general  - Universal protein queries   │   │
│  │  POST /query/rag          - Filtered aging queries      │   │
│  │  GET  /proteins           - List all proteins           │   │
│  │  GET  /protein/{symbol}   - Protein details             │   │
│  │  GET  /stats/*            - Dataset statistics          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ RAG Engine    │  │ Aging Analyzer│  │ UniProt Client    │   │
│  │ (LlamaIndex)  │  │ (30+ keywords)│  │ (Sequence fetch)  │   │
│  └───────┬───────┘  └───────────────┘  └───────────────────┘   │
│          │                                                       │
│  ┌───────┴───────┐  ┌───────────────┐  ┌───────────────────┐   │
│  │ FAISS Vector  │  │ GenAge Loader │  │ Mol-Instructions  │   │
│  │ Database      │  │ (308 proteins)│  │ (495K examples)   │   │
│  └───────────────┘  └───────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Nebius LLM  │  │ RCSB PDB    │  │ UniProt REST API        │ │
│  │ (Synthesis) │  │ (3D Images) │  │ (Sequences)             │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 18+**
- **16GB RAM** (for FAISS vector index)
- **Nebius API Key** (for LLM synthesis)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-repo/aging-proteins.git
cd aging-proteins

# Create environment file
cp .env.example .env
# Edit .env and add your NEBIUS_API_KEY

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your NEBIUS_API_KEY

# Start the server
python app.py
# Backend runs on http://localhost:8000
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if needed (defaults work for local dev)

# Start development server
npm run dev
# Frontend runs on http://localhost:3000
```

---

## 📱 Features Guide

### 1. Universal RAG Query (`/query`)

Ask ANY protein question - the AI automatically detects aging connections.

**Example Queries:**
- "What is the function of p53?" → Gets answer + aging relevance
- "How does SIRT6 affect longevity?" → Detailed aging analysis
- "Compare FOXO3 and FOXO1" → Side-by-side comparison
- "What proteins are involved in autophagy?" → Multi-protein results

**Features:**
- 🔍 Semantic search across 7,018 papers
- 🤖 LLM-synthesized answers
- 🏷️ Automatic aging relevance scoring
- 📚 Clickable citations to source papers
- 💡 16 example queries to get started

### 2. Protein Browser (`/proteins`)

Browse all 308 aging-related proteins with filtering and search.

**Features:**
- 📋 Sortable protein list
- 🔎 Search by name or symbol
- 🏷️ Filter by aging theory
- 📊 Paper count per protein
- 🔗 Click to view details

### 3. Protein Detail (`/protein-detail/[symbol]`)

Deep dive into individual proteins with comprehensive data.

**Features:**
- 🧬 Amino acid sequence with color-coded properties
- 🔬 3D structure preview from RCSB PDB
- 📖 Associated scientific papers
- 🏷️ Aging theory classifications
- 🔗 External links (UniProt, PDB, GenAge)

### 4. 3D Structure Viewer

Interactive protein structure visualization powered by RCSB PDB.

**Features:**
- 🖼️ High-quality structure images
- 🔗 Click to open interactive 3D viewer
- 📐 Multiple view modes (cartoon, surface, ball-stick)
- 🔍 Zoom and rotate controls

### 5. Protein Comparison (`/compare`)

Compare up to 4 proteins side-by-side.

**Features:**
- ⚖️ Side-by-side comparison
- 📊 Shared vs unique papers
- 🏷️ Common aging theories
- 📈 Publication timeline

### 6. Statistics Dashboard (`/stats`)

Explore dataset coverage and distributions.

**Features:**
- 📊 Protein coverage charts
- 📈 Publication timeline
- 🏷️ Theory distribution
- 🧪 Mol-Instructions statistics

### 7. Interactive Demo (`/demo`)

Guided tour of all features with auto-play.

**Features:**
- 🎬 6 demo scenarios
- ▶️ Auto-play mode
- 📝 Expected highlights
- 🔗 Direct execution links

---

## 🔬 Data Sources

### GenAge Human Database
- **Source**: Human Ageing Genomic Resources (https://genomics.senescence.info/)
- **Content**: 308 genes/proteins associated with human aging
- **Fields**: Gene symbol, name, aliases, chromosome location, description

### Europe PMC Papers
- **Source**: Europe PMC API (https://europepmc.org/)
- **Content**: 7,018 scientific papers on aging proteins
- **Fields**: Title, abstract, authors, year, PMID, PMCID, citations

### Mol-Instructions Dataset
- **Source**: Biomolecular instruction dataset
- **Content**: 495,004 instruction-response pairs
- **Usage**: Few-shot learning for protein understanding

### RCSB Protein Data Bank
- **Source**: RCSB PDB (https://www.rcsb.org/)
- **Content**: 3D protein structure images and data
- **Usage**: Structure visualization on protein detail pages

### UniProt
- **Source**: UniProt REST API (https://www.uniprot.org/)
- **Content**: Protein sequences and annotations
- **Usage**: Amino acid sequences for sequence panel

---

## 🛠️ API Reference

### Query Endpoints

#### Universal RAG Query
```http
POST /query/rag-general
Content-Type: application/json

Parameters:
  query: string      # Any protein question
  top_k: int         # Number of results (default: 10)
  synthesize: bool   # Generate LLM answer (default: true)

Response:
{
  "status": "success",
  "query": "What is p53?",
  "answer": "p53 is a tumor suppressor protein...",
  "chunks": [...],
  "citations": [...],
  "metadata": {
    "confidence": 0.85,
    "proteins_mentioned": ["TP53"],
    "theories_identified": ["genomic_instability"],
    "query_time_ms": 1234
  },
  "aging_relevance": {
    "has_aging_connection": true,
    "relevance_score": 0.92,
    "connections": ["DNA damage", "cellular senescence"],
    "aging_theories": ["genomic_instability"]
  }
}
```

#### Filtered RAG Query
```http
POST /query/rag
Parameters:
  query: string
  protein: string    # Filter by protein symbol
  theories: array    # Filter by aging theories
  top_k: int
```

### Protein Endpoints

```http
GET /proteins                    # List all proteins
GET /protein/{symbol}            # Get protein details
GET /protein/{symbol}/papers     # Get protein's papers
GET /protein/{symbol}/uniprot    # Get UniProt data
```

### Statistics Endpoints

```http
GET /stats/coverage              # Dataset coverage stats
GET /stats/theories              # Theory distribution
GET /mol-instructions/stats      # ML instruction stats
```

---

## 🐳 Docker Deployment

### docker-compose.yml

The project includes a complete Docker setup:

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - NEBIUS_API_KEY=${NEBIUS_API_KEY}
    volumes:
      - ./backend/faiss_store:/app/faiss_store

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
```

### Build and Run

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📁 Project Structure

```
aging-proteins/
├── backend/                          # FastAPI Backend
│   ├── app.py                        # Main application & routes
│   ├── protein_query_engine.py       # RAG query engine
│   ├── aging_relevance_analyzer.py   # Aging detection AI
│   ├── aging_theory_classifier.py    # Theory classification
│   ├── genage_loader.py              # GenAge data loader
│   ├── theory_loader.py              # Theory definitions
│   ├── uniprot_client.py             # UniProt API client
│   ├── few_shot_prompt_builder.py    # Mol-Instructions integration
│   ├── mol_instructions_loader.py    # ML data loader
│   ├── statistics_service.py         # Stats calculations
│   ├── requirements.txt              # Python dependencies
│   ├── Dockerfile                    # Backend container
│   └── faiss_store/                  # Vector database
│
├── frontend/                         # Next.js Frontend
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── page.tsx              # Home page
│   │   │   ├── query/page.tsx        # Query interface
│   │   │   ├── proteins/page.tsx     # Protein browser
│   │   │   ├── protein-detail/       # Protein details
│   │   │   ├── compare/page.tsx      # Comparison tool
│   │   │   ├── stats/page.tsx        # Statistics
│   │   │   ├── theories/page.tsx     # Theory explorer
│   │   │   └── demo/page.tsx         # Interactive demo
│   │   │
│   │   ├── components/               # React Components
│   │   │   ├── QueryInterface.tsx    # Search input
│   │   │   ├── QueryResults.tsx      # Results display
│   │   │   ├── ProteinCard.tsx       # Protein list item
│   │   │   ├── SequencePanel.tsx     # Amino acid display
│   │   │   ├── ProteinViewer.tsx     # 3D structure viewer
│   │   │   ├── AgingRelevanceBadge.tsx
│   │   │   ├── StatsDashboard.tsx
│   │   │   ├── ProteinComparison.tsx
│   │   │   ├── ExampleQueries.tsx
│   │   │   ├── DemoMode.tsx
│   │   │   └── Navigation.tsx
│   │   │
│   │   └── lib/
│   │       └── api.ts                # API client
│   │
│   ├── package.json
│   ├── Dockerfile                    # Frontend container
│   └── next.config.js
│
├── data/                             # Data files
│   ├── genage_human.csv              # 308 aging proteins
│   └── papers/                       # Scientific papers
│
├── docker-compose.yml                # Container orchestration
├── .env.example                      # Environment template
└── README.md                         # This file
```

---

## 🏆 Hackathon Highlights

### Innovation Points

1. **Universal RAG** - First aging protein system that answers ANY question
2. **Automatic Aging Detection** - AI identifies longevity connections automatically
3. **3D Integration** - Seamless protein structure visualization
4. **Comprehensive Dataset** - 308 proteins, 7K papers, 495K ML instructions
5. **Beautiful UX** - Modern, accessible, researcher-friendly interface

### Technical Excellence

- ✅ **Full TypeScript** - Type-safe frontend
- ✅ **FastAPI Backend** - High-performance Python API
- ✅ **FAISS Vector DB** - Sub-second semantic search
- ✅ **Docker Ready** - One-command deployment
- ✅ **Responsive Design** - Works on all devices
- ✅ **Accessible** - WCAG compliant

### Demo Flow for Judges

1. **Home** (`/`) - See platform overview and stats
2. **Query** (`/query`) - Try "What is p53?" to see universal RAG
3. **Proteins** (`/proteins`) - Browse the 308 aging proteins
4. **Detail** (`/protein-detail/SIRT6`) - See 3D structure and sequence
5. **Compare** (`/compare`) - Compare SIRT6 vs TP53
6. **Stats** (`/stats`) - View dataset coverage

---

## 🔧 Configuration

### Environment Variables

```bash
# Backend (.env)
NEBIUS_API_KEY=your_api_key_here
NEBIUS_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct
FAISS_INDEX_PATH=./faiss_store

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Customization

- **Add proteins**: Update `data/genage_human.csv`
- **Add papers**: Run paper indexing script
- **Change LLM**: Update `NEBIUS_MODEL` in backend
- **Modify UI**: Edit components in `frontend/src/components`

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🙏 Acknowledgments

- **GenAge** - Human Ageing Genomic Resources
- **Europe PMC** - Scientific paper corpus
- **Mol-Instructions** - Biomolecular instruction dataset
- **RCSB PDB** - Protein structure database
- **UniProt** - Protein sequence database
- **LlamaIndex** - RAG framework
- **Nebius** - LLM API provider

---

## 👥 Team

Built with ❤️ for the OpenLongevity AISOC Hackathon

---

**🔗 Links**
- Live Demo: [Coming Soon]
- Documentation: This README
- API Docs: http://localhost:8000/docs (when running)
