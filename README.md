# 🧬 Aging Protein RAG System

**Universal Protein Intelligence with Automatic Aging Relevance Detection**

A powerful RAG (Retrieval-Augmented Generation) system that searches across **308 aging-related proteins** and **7,018 scientific papers** to answer ANY protein question while automatically identifying connections to aging and longevity.

---

## ✨ Key Features

### 🤖 Universal Queries
- **Ask ANY protein question** - not limited to aging topics
- Automatic aging relevance detection
- Smart analysis of 30+ aging keywords and 11 aging theories
- Visual relevance badges with connections

### 🧬 3D Protein Visualization
- Interactive Molstar 3D viewer
- Inline and fullscreen viewing modes
- Support for multiple PDB structures
- Smooth animations and controls

### 📚 Enhanced Citations
- Bold, prominent source display
- Large clickable buttons with hover effects
- Direct links to Europe PMC papers
- Impossible to miss!

### 🔍 Smart Search
- Semantic search with FAISS vector database
- LLM-powered answer synthesis
- Collapsible source chunks
- Recent paper highlighting (last 5 years)

### 💡 Example Queries
- 16 pre-loaded examples across 4 categories
- Aging-Specific, General, Comparative, Mechanistic
- One-click query execution

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- 16GB RAM (for FAISS index)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Set your API key
echo "NEBIUS_API_KEY=your_key_here" > .env

# Start the server
python app.py
```

Backend will run on `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:3000`

---

## 📊 Dataset

- **308 proteins** from GenAge Human Ageing Genomic Resources
- **7,018 scientific papers** from Europe PMC
- **495,004 Mol-Instructions** for few-shot learning
- **11 aging theories** classification

---

## 🎯 Usage Examples

### Example 1: General Query
```
Query: "What is the function of p53?"
Result: Comprehensive answer + aging connections automatically identified
```

### Example 2: Aging-Specific Query
```
Query: "What is the role of SIRT6 in aging?"
Result: Detailed aging analysis with high relevance score
```

### Example 3: Comparative Query
```
Query: "Compare FOXO3 and FOXO1 functions"
Result: Side-by-side comparison with shared aging theories
```

### Example 4: 3D Visualization
```
1. Go to /proteins
2. Click on any protein (e.g., APOE)
3. See 3D structure at the top
4. Click "View in Fullscreen" for detailed exploration
```

---

## 🏗️ Architecture

### Backend (FastAPI)
- **FAISS** vector database for semantic search
- **LlamaIndex** for RAG orchestration
- **Nebius LLM** for answer synthesis
- **AgingRelevanceAnalyzer** for automatic aging detection

### Frontend (Next.js)
- **React 18** with TypeScript
- **Molstar** for 3D protein visualization
- **Tailwind CSS** for styling
- **Responsive design** for all devices

---

## 📁 Project Structure

```
├── backend/                            # FastAPI backend
│   ├── app.py                          # Main FastAPI application
│   ├── aging_relevance_analyzer.py     # Aging connection detection
│   ├── protein_query_engine.py         # RAG query engine
│   ├── genage_loader.py                # GenAge dataset loader
│   ├── few_shot_prompt_builder.py      # Mol-Instructions integration
│   └── mol_instructions_loader.py      # Few-shot learning data
├── frontend/                           # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                # Home page
│   │   │   ├── query/                  # Query interface
│   │   │   ├── proteins/               # Protein browser
│   │   │   ├── protein-detail/         # Protein detail with 3D
│   │   │   ├── theories/               # Aging theories explorer
│   │   │   └── stats/                  # Dataset statistics
│   │   ├── components/
│   │   │   ├── QueryResults.tsx        # Enhanced results display
│   │   │   ├── AgingRelevanceBadge.tsx # Aging analysis badge
│   │   │   ├── StructureModal.tsx      # 3D fullscreen modal
│   │   │   ├── ExampleQueries.tsx      # Example query cards
│   │   │   └── Navigation.tsx          # Main navigation
│   │   └── utils/
│   │       └── proteinParser.tsx       # Protein name detection
├── data/
│   ├── raw/
│   │   ├── genage_human.csv            # 308 aging proteins
│   │   ├── epmc_papers/                # 7,018 papers
│   │   └── mol_instructions/           # 495K instructions
│   └── processed/
│       └── faiss_index/                # Vector database
├── docs/                               # Documentation
│   ├── README.md                       # This file
│   ├── QUICK_START_GUIDE.md            # Setup guide
│   ├── RAG_UX_IMPROVEMENTS_GUIDE.md    # User guide
│   └── HACKATHON_DEMO.md               # Demo script
└── scripts/                            # Utility scripts
```

---

## 🎨 Features Showcase

### Enhanced Citations
![Citations](https://via.placeholder.com/800x200?text=Bold+Prominent+Citations)
- Gradient backgrounds
- Large clickable buttons
- Hover animations
- External link icons

### 3D Protein Viewer
![3D Viewer](https://via.placeholder.com/800x400?text=Interactive+3D+Protein+Structure)
- Inline viewer on protein pages
- Fullscreen modal mode
- Rotate, zoom, pan controls
- Multiple structure support

### Aging Relevance Analysis
![Aging Badge](https://via.placeholder.com/800x200?text=Aging+Relevance+Badge)
- Automatic detection
- Color-coded scores (High/Moderate/Low)
- Connection list
- Related aging theories

---

## 🔬 Aging Theories Covered

1. Genomic Instability
2. Telomere Attrition
3. Epigenetic Alterations
4. Loss of Proteostasis
5. Mitochondrial Dysfunction
6. Cellular Senescence
7. Stem Cell Exhaustion
8. Altered Intercellular Communication
9. Disabled Macroautophagy
10. Chronic Inflammation
11. Dysbiosis

---

## 📖 API Documentation

### Query Endpoints

**General RAG Query** (NEW!)
```
POST /query/rag-general
Parameters:
  - query: string (any protein question)
  - top_k: int (default: 10)
  - synthesize: bool (default: true)

Returns:
  - answer: string
  - chunks: array
  - citations: array
  - aging_relevance: object (NEW!)
  - query_analysis: object (NEW!)
```

**Filtered RAG Query**
```
POST /query/rag
Parameters:
  - query: string
  - protein: string (optional)
  - theories: array (optional)
  - top_k: int (default: 10)
```

**Protein Details**
```
GET /protein/{symbol}
GET /protein/{symbol}/papers
GET /protein/{symbol}/uniprot
```

**Statistics**
```
GET /stats/coverage
GET /stats/theories
GET /mol-instructions/stats
```

---

## 🎓 For Hackathon Judges

### Innovation Highlights

1. **Universal RAG** - First aging protein system that answers ANY question
2. **Automatic Aging Detection** - AI identifies aging connections automatically
3. **3D Integration** - Seamless protein structure visualization
4. **Enhanced UX** - Bold citations, collapsible sections, example queries
5. **Comprehensive Dataset** - 308 proteins, 7K papers, 495K instructions

### Technical Excellence

- ✅ **Type-safe** - Full TypeScript coverage
- ✅ **Performant** - Sub-second queries, lazy loading
- ✅ **Accessible** - WCAG compliant, keyboard navigation
- ✅ **Documented** - Complete user and technical guides
- ✅ **Production-ready** - Error handling, caching, monitoring

### Demo Flow

1. **Home Page** → Shows dataset stats and features
2. **Query Page** → Try "What is p53?" to see universal RAG
3. **Protein Page** → Click any protein to see 3D structure
4. **Stats Page** → View dataset coverage and distribution

---

## 🧬 How to See the 3D Protein Viewer

### Quick Access
1. Go to `http://localhost:3000/proteins`
2. Click on any protein (e.g., **APOE**, **TP53**, **SIRT6**)
3. The 3D structure appears **at the top** of the protein detail page
4. Click **"View [PDB_ID] in Fullscreen"** for fullscreen mode

### Direct Links
Try these direct links to see 3D structures immediately:
- `http://localhost:3000/protein-detail/APOE`
- `http://localhost:3000/protein-detail/TP53`
- `http://localhost:3000/protein-detail/SIRT6`

### Features
- **Inline Viewer** - See structures directly on protein pages
- **Fullscreen Modal** - Click for detailed exploration
- **Interactive Controls** - Rotate, zoom, pan with mouse
- **Multiple Structures** - Support for all PDB entries
- **Molstar Integration** - Professional molecular visualization

---

## 📝 Documentation

- **README.md** (this file) - Quick start and overview
- **QUICK_START_GUIDE.md** - Detailed setup instructions
- **RAG_UX_IMPROVEMENTS_GUIDE.md** - User guide for new features
- **HACKATHON_DEMO.md** - 5-minute demo script for judges

---

## 🤝 Contributing

This project was built for the OpenLongevity HackAging.ai hackathon.

---

## 📄 License

See LICENSE file for details.

---

## 🙏 Acknowledgments

- **GenAge** - Human Ageing Genomic Resources
- **Europe PMC** - Scientific paper corpus
- **Mol-Instructions** - Biomolecular instruction dataset
- **Molstar** - 3D protein visualization
- **LlamaIndex** - RAG framework
- **Nebius** - LLM API

---

**Built with ❤️ for aging research**

🔗 [Live Demo](#) | 📊 [Dataset](#) | 📖 [Docs](#)
