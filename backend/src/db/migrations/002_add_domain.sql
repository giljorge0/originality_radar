-- backend/src/db/migrations/002_add_domain.sql
-- V2: Domain categorisation for map filtering

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS domain VARCHAR(32) DEFAULT 'Tech';

-- Index for fast domain filtering on map queries
CREATE INDEX IF NOT EXISTS ideas_domain_idx ON ideas (domain);

-- Expose domain in analytics
-- (analytics table already has an auto-refresh trigger from migration 001)
