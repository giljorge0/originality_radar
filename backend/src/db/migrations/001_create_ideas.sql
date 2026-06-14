-- backend/src/db/migrations/001_create_ideas.sql
-- Requires: PostgreSQL 14+ with pgvector extension (Supabase includes this)

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create ideas table
-- vector(1024) matches Voyage AI's voyage-3-lite output dimensions
CREATE TABLE IF NOT EXISTS ideas (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idea          TEXT        NOT NULL,
  vector        vector(768),
  score         INTEGER     NOT NULL DEFAULT 0,
  density       VARCHAR(20) NOT NULL DEFAULT 'POPULATED',

  -- Semantic tokens extracted during embedding
  semantic_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Nearest neighbors stored as JSONB for fast retrieval
  nearest_neighbors JSONB DEFAULT '[]'::JSONB,

  -- LLM narrative fields (drift analysis)
  nearest_clusters    TEXT[]  DEFAULT ARRAY[]::TEXT[],
  what_makes_it_common TEXT,
  what_makes_it_novel  TEXT,
  drift_suggestion     TEXT,

  -- 2D map coordinates from PCA projection
  map_x FLOAT DEFAULT 0,
  map_y FLOAT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_hash    VARCHAR(64),
  user_agent TEXT
);

-- HNSW index for fast approximate k-NN with cosine distance
-- HNSW builds dynamically (no minimum row count required, unlike IVFFlat)
-- m=16 and ef_construction=64 are solid defaults for <1M vectors
CREATE INDEX IF NOT EXISTS ideas_vector_hnsw_idx
  ON ideas
  USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Supporting indexes
CREATE INDEX IF NOT EXISTS ideas_density_idx    ON ideas (density);
CREATE INDEX IF NOT EXISTS ideas_created_at_idx ON ideas (created_at DESC);
CREATE INDEX IF NOT EXISTS ideas_score_idx      ON ideas (score DESC);
CREATE INDEX IF NOT EXISTS ideas_ip_hash_idx    ON ideas (ip_hash, created_at DESC);

-- Analytics materialized view (auto-refreshed via trigger)
CREATE TABLE IF NOT EXISTS idea_analytics (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_ideas          INTEGER DEFAULT 0,
  avg_score            FLOAT   DEFAULT 0,
  saturation_percent   FLOAT   DEFAULT 0,
  frontier_percent     FLOAT   DEFAULT 0,
  last_updated         TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION update_idea_analytics()
RETURNS void AS $$
BEGIN
  DELETE FROM idea_analytics;
  INSERT INTO idea_analytics (
    total_ideas,
    avg_score,
    saturation_percent,
    frontier_percent,
    last_updated
  )
  SELECT
    COUNT(*),
    COALESCE(AVG(score), 0),
    COALESCE(
      COUNT(*) FILTER (WHERE density IN ('SATURATED', 'DENSE')) * 100.0
      / NULLIF(COUNT(*), 0),
      0
    ),
    COALESCE(
      COUNT(*) FILTER (WHERE density IN ('FRONTIER', 'VOID')) * 100.0
      / NULLIF(COUNT(*), 0),
      0
    ),
    NOW()
  FROM ideas;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep analytics up to date after each insert
CREATE OR REPLACE FUNCTION trigger_update_analytics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_idea_analytics();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ideas_analytics_trigger ON ideas;
CREATE TRIGGER ideas_analytics_trigger
  AFTER INSERT ON ideas
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_update_analytics();

-- Seed the analytics table with initial (empty) state
SELECT update_idea_analytics();
