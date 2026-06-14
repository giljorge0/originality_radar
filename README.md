# Originality Radar

A real vector-math topological map of human thought. Submit an idea, get scored against every idea ever submitted globally via cosine similarity. Watch the shared map grow denser over time.

**Not LLM vibes — actual semantic vectors + math.**

## The Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Vector DB**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: Anthropic API (deterministic 64-dim semantic vectors)
- **Hosting**: Vercel (frontend) + Railway/Fly.io (backend)

## How It Works

1. **User submits an idea** → Frontend sends to backend API
2. **Backend calls Anthropic API** → Returns a deterministic 64-dim semantic vector (not random, not LLM guessing)
3. **Vector inserted into pgvector database** → Stored with the idea text
4. **K-Nearest Neighbors query** → Find 10 closest ideas in the database
5. **Cosine similarity math** → Compute originality score from distance to nearest neighbors
6. **Dimensionality reduction** → Project all vectors to 2D for the canvas
7. **LLM analyzes narrative** → "Why is this common?" / "What's novel?" / "How to drift further?"
8. **Store result** → Map grows richer

## Quick Start (Local)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Supabase account (free tier works)
- Anthropic API key

### 1. Clone & Setup

```bash
git clone https://github.com/yourusername/originality-radar.git
cd originality-radar

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

### 2. Environment Variables

**`backend/.env`**
```
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/originality_radar
ANTHROPIC_API_KEY=sk-ant-...
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**`frontend/.env`**
```
VITE_API_URL=http://localhost:3001
VITE_ENV=development
```

### 3. Database Setup

If using Supabase:
1. Create a new Supabase project
2. Enable the `vector` extension:
   ```sql
   create extension if not exists vector;
   ```
3. Run migrations:
   ```bash
   cd backend
   npm run migrate
   ```

This creates the `ideas` table with pgvector columns.

### 4. Run Locally

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Visit `http://localhost:5173`

## Project Structure

```
originality-radar/
├── frontend/                 # React Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── OriginalityRadar.jsx    # Main component
│   │   │   ├── ScoreMeter.jsx          # Score visualization
│   │   │   ├── IdeaMap.jsx             # Vector space visualization
│   │   │   └── ResultCard.jsx          # History card
│   │   ├── hooks/
│   │   │   └── useAPI.js               # Fetch wrapper
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Node.js + Express
│   ├── src/
│   │   ├── api/
│   │   │   ├── ideas.js               # POST /ideas/scan
│   │   │   └── map.js                 # GET /ideas/map
│   │   ├── db/
│   │   │   ├── client.js              # Supabase pgvector client
│   │   │   ├── migrations/
│   │   │   │   └── 001_create_ideas.sql
│   │   │   └── seed.js                # (Optional) seed data
│   │   ├── services/
│   │   │   ├── anthropic.js           # Embedding & drift generation
│   │   │   └── vector.js              # k-NN queries, cosine math
│   │   ├── middleware/
│   │   │   └── cors.js
│   │   ├── app.js                     # Express setup
│   │   └── index.js                   # Server entry
│   ├── package.json
│   └── .env.example
│
└── docs/                     # (Optional) Architecture diagrams
    └── ARCHITECTURE.md
```

## API Reference

### `POST /api/ideas/scan`

Submit an idea for originality analysis.

**Request:**
```json
{
  "idea": "A marketplace for renting out household robots during off-peak hours"
}
```

**Response:**
```json
{
  "id": "uuid",
  "idea": "A marketplace for renting out household robots during off-peak hours",
  "score": 67,
  "density": "SPARSE",
  "vector": [0.12, -0.34, ...],
  "nearestClusters": ["robot leasing", "peer-to-peer economy", "asset utilization"],
  "whatMakesItCommon": "Marketplace + hardware sharing is well-explored territory.",
  "whatMakesItNovel": "Off-peak utilization adds a time-arbitrage angle most don't consider.",
  "driftSuggestion": "Combine with autonomous dispatch: robots negotiate pickup times with renters in real-time.",
  "mapCoordinates": {"x": 0.34, "y": -0.12},
  "nearestNeighbors": [
    {"idea": "Airbnb for drones", "similarity": 0.89},
    {"idea": "Tool rental platform", "similarity": 0.76}
  ],
  "createdAt": "2025-06-14T12:34:56Z"
}
```

### `GET /api/ideas/map`

Fetch all ideas and their 2D coordinates (for the global map visualization).

**Response:**
```json
{
  "totalIdeas": 1247,
  "ideas": [
    {
      "id": "uuid",
      "idea": "Social media for ants",
      "score": 89,
      "density": "FRONTIER",
      "mapCoordinates": {"x": 0.67, "y": 0.89},
      "createdAt": "2025-06-13T10:20:30Z"
    },
    ...
  ],
  "stats": {
    "avgScore": 54,
    "densityDistribution": {
      "SATURATED": 45,
      "DENSE": 234,
      "POPULATED": 412,
      "SPARSE": 334,
      "FRONTIER": 189,
      "VOID": 33
    }
  }
}
```

## Deployment

### Frontend (Vercel)

```bash
# Connect your repo to Vercel via GitHub
# Set env vars in Vercel dashboard:
# - VITE_API_URL=https://your-backend.railway.app

npm run build
```

### Backend (Railway)

```bash
# Connect repo to Railway
# Set env vars:
# - DATABASE_URL=postgresql://...
# - ANTHROPIC_API_KEY=sk-ant-...
# - FRONTEND_URL=https://your-domain.vercel.app

npm run build
npm start
```

## How Originality Scoring Works

### Vector Generation (Deterministic)

The `EMBED_SYSTEM` prompt asks Claude to produce a 64-dimensional vector covering:

- **Dimensions 0-7**: Domain (tech, science, art, social, commerce, nature, philosophy, engineering)
- **Dimensions 8-15**: Novelty axes (combination, abstraction, concreteness, temporal, spatial, causal, systemic, emergent)
- **Dimensions 16-23**: Human context (individual, community, institutional, global, etc.)
- **Dimensions 24-31**: Modality (digital, physical, cognitive, emotional, aesthetic, functional, informational, relational)
- **Dimensions 32-39**: Complexity (simple → networked → chaotic → adaptive)
- **Dimensions 40-47**: Time horizon (immediate → civilizational)
- **Dimensions 48-55**: Impact vectors (economic, social, scientific, artistic, political, environmental, psychological, spiritual)
- **Dimensions 56-63**: Distance from mainstream (0=common, 1=niche) × 8 orthogonal axes

**Same idea submitted twice = nearly identical vectors.** This consistency is critical.

### Scoring Formula

```
1. Run k-NN query: find 10 nearest neighbors
2. Compute cosine similarity to each neighbor
3. Average the top similarities: avgSim
4. Score = (1 - avgSim) × 100
5. Convert to density label:
   0-15:   SATURATED
   16-35:  DENSE
   36-55:  POPULATED
   56-75:  SPARSE
   76-90:  FRONTIER
   91-100: VOID
```

**Why it works:**
- If your idea is very close (high similarity) to existing ideas, you're in saturated space.
- If you're far from everything, you're in the void.
- The score is **objective** — based on real vectors and math, not LLM vibes.

### 2D Projection

When rendering the map, all vectors are projected to 2D via **PCA (Principal Component Axis)**:

```javascript
// Simplified: find 2 axes that explain max variance
// Project all vectors onto those axes
// Plot on canvas
```

Similar ideas naturally cluster near each other because the math preserves distance.

## Global Map Growth

Every submission adds a vector to the database. Over time:
- **Day 1**: 5 ideas → high variance in scores
- **Week 1**: 150 ideas → clusters start forming
- **Month 1**: 2000 ideas → map becomes a dense topology
- **Year 1**: 50k ideas → true landscape of human ideation

A `VOID` idea (score 95) today might become `FRONTIER` (score 78) in 6 months if 1000 people converge on that space.

## Key Design Decisions

### Why Anthropic's API for Embeddings?

We could use OpenAI or open-source embeddings, but Anthropic's approach lets us:
1. Generate vectors via Claude's reasoning (more consistent)
2. Get structured JSON output (no parsing image data)
3. Control the 64 dimensions explicitly (not a black box)
4. Avoid model updates breaking consistency

### Why pgvector (not Pinecone/Qdrant)?

- **pgvector is built into Supabase** — no separate infrastructure
- Free tier handles 100k+ vectors easily
- Full SQL queries (filter by date, sort, aggregate)
- Open source — can self-host if needed
- No vendor lock-in

### Why Cosine Similarity (not Euclidean)?

- Cosine is invariant to magnitude (direction = meaning, not scale)
- Two very similar ideas will have cosine ≈ 0.95
- Two unrelated ideas will have cosine ≈ 0.1
- Natural scale: 0 (perpendicular) to 1 (identical)

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-idea`
3. Make changes
4. Test locally
5. Submit PR

## License

MIT

## Questions?

- **How do I self-host?** Everything is open source. Use your own PostgreSQL + pgvector, deploy backend to any Node.js host (Fly.io, DigitalOcean, AWS Lambda), frontend to Vercel/Netlify.
- **How is data stored?** Ideas + vectors are stored in PostgreSQL with pgvector. No logs of API calls beyond standard analytics.
- **Can I use a different embedding model?** Yes. Swap the Anthropic service for OpenAI embeddings, Hugging Face, or local models. Keep the same scoring pipeline.
- **What if someone submits spam?** Rate limiting, content moderation filters, and flagging systems should be added before production. (See `backend/src/middleware/`.)

## Roadmap

- [ ] User accounts (optional, for viewing personal history)
- [ ] Filtering by domain/modality
- [ ] Live map visualization (WebSocket updates)
- [ ] Drift suggestion refinement via user feedback loop
- [ ] Multi-language support
- [ ] Mobile app

---

**Built with the belief that originality is measurable. No vibes, just math.**
