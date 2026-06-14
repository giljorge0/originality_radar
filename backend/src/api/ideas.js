// backend/src/api/ideas.js — V2: domain tagging, WebSocket broadcast, domain filtering
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from '../db/client.js';
import { generateEmbedding, generateDrift } from '../services/anthropic.js';
import { scoreFromDistances, densityFromScore, projectCoordinates } from '../services/vector.js';
import { broadcast } from '../services/broadcast.js';

// ── POST /api/ideas/scan ─────────────────────────────────────────────────────
export async function scanIdea(req, res, next) {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== 'string')
      return res.status(400).json({ error: 'Idea is required' });
    if (idea.trim().length < 5 || idea.trim().length > 500)
      return res.status(400).json({ error: 'Idea must be 5–500 characters' });

    // Rate limit: 5 scans / minute per IP
    const ipHash = crypto.createHash('sha256').update(req.ip || 'unknown').digest('hex').slice(0, 16);
    const recentCount = await db.one(
      `SELECT COUNT(*) AS count FROM ideas WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 minute'`,
      [ipHash], r => parseInt(r.count, 10)
    );
    if (recentCount >= 5) return res.status(429).json({ error: 'Rate limited — max 5 scans per minute' });

    // 1. Real embedding
    const { vector } = await generateEmbedding(idea.trim());
    const vecStr = `[${vector.join(',')}]`;

    // 2. k-NN query
    const neighbors = await db.manyOrNone(
      `SELECT id, idea, score, density,
              1 - (vector <=> $1::vector) AS similarity
       FROM ideas WHERE vector IS NOT NULL
       ORDER BY vector <=> $1::vector LIMIT 10`,
      [vecStr]
    );

    // 3. Score
    const similarities = neighbors.map(n => parseFloat(n.similarity));
    const score = scoreFromDistances(similarities);
    const density = densityFromScore(score);

    // 4. Drift analysis (LLM — also returns domain + detects language)
    const neighborLabels = neighbors.slice(0, 5).map(n =>
      `"${n.idea}" (${Math.round(parseFloat(n.similarity) * 100)}% similar)`
    );
    const drift = await generateDrift(idea.trim(), score, density, neighborLabels);

    // 5. 2D projection
    const storedVectors = await db.manyOrNone(
      `SELECT vector FROM ideas WHERE vector IS NOT NULL ORDER BY created_at DESC LIMIT 500`
    );
    const parsed2D = storedVectors.map(r => {
      const raw = r.vector;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    });
    const coordinates = projectCoordinates(parsed2D, vector);

    // 6. Persist
    const id = uuidv4();
    await db.none(
      `INSERT INTO ideas (
        id, idea, vector, score, density, domain,
        nearest_neighbors, nearest_clusters,
        what_makes_it_common, what_makes_it_novel, drift_suggestion,
        map_x, map_y, ip_hash, user_agent
      ) VALUES ($1,$2,$3::vector,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        id, idea.trim(), vecStr, score, density, drift.domain,
        JSON.stringify(neighbors.slice(0, 5).map(n => ({
          id: n.id, idea: n.idea,
          similarity: Math.round(parseFloat(n.similarity) * 100),
        }))),
        drift.nearestClusters,
        drift.whatMakesItCommon,
        drift.whatMakesItNovel,
        drift.driftSuggestion,
        coordinates.x, coordinates.y,
        ipHash, req.get('user-agent') ?? '',
      ]
    );

    const result = {
      id, idea: idea.trim(), score, density,
      domain: drift.domain,
      nearestClusters: drift.nearestClusters,
      whatMakesItCommon: drift.whatMakesItCommon,
      whatMakesItNovel: drift.whatMakesItNovel,
      driftSuggestion: drift.driftSuggestion,
      mapCoordinates: coordinates,
      nearestNeighbors: neighbors.slice(0, 5).map(n => ({
        idea: n.idea,
        similarity: Math.round(parseFloat(n.similarity) * 100),
      })),
      createdAt: new Date().toISOString(),
    };

    // 7. Broadcast to all WebSocket clients (live multiplayer map)
    broadcast({ type: 'NEW_IDEA', payload: {
      id, idea: idea.trim(), score, density, domain: drift.domain,
      mapCoordinates: coordinates, createdAt: result.createdAt,
    }});

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/ideas/map?domain=Tech ──────────────────────────────────────────
// Optional ?domain= filter — returns all if omitted
export async function getMap(req, res, next) {
  try {
    const { domain } = req.query;
    const ideas = domain
      ? await db.manyOrNone(
          `SELECT id, idea, score, density, domain, map_x, map_y, created_at
           FROM ideas WHERE domain = $1 ORDER BY created_at DESC LIMIT 1000`,
          [domain]
        )
      : await db.manyOrNone(
          `SELECT id, idea, score, density, domain, map_x, map_y, created_at
           FROM ideas ORDER BY created_at DESC LIMIT 1000`
        );

    const stats = await db.oneOrNone(`SELECT * FROM idea_analytics LIMIT 1`);

    // Domain counts for filter UI
    const domains = await db.manyOrNone(
      `SELECT domain, COUNT(*) AS count FROM ideas GROUP BY domain ORDER BY count DESC`
    );

    res.json({
      totalIdeas: stats?.total_ideas ?? 0,
      ideas: ideas.map(i => ({
        id: i.id, idea: i.idea, score: i.score, density: i.density,
        domain: i.domain,
        mapCoordinates: { x: i.map_x, y: i.map_y },
        createdAt: i.created_at,
      })),
      stats: {
        avgScore: Math.round(stats?.avg_score ?? 0),
        saturationPercent: Math.round(stats?.saturation_percent ?? 0),
        frontierPercent: Math.round(stats?.frontier_percent ?? 0),
      },
      domainCounts: Object.fromEntries(domains.map(d => [d.domain, parseInt(d.count, 10)])),
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/ideas/stats ─────────────────────────────────────────────────────
export async function getStats(req, res, next) {
  try {
    const stats = await db.oneOrNone(`SELECT * FROM idea_analytics LIMIT 1`);
    const byDensity = await db.manyOrNone(
      `SELECT density, COUNT(*) AS count FROM ideas GROUP BY density ORDER BY count DESC`
    );
    const trend = await db.manyOrNone(
      `SELECT DATE_TRUNC('day', created_at)::DATE AS day, COUNT(*) AS count
       FROM ideas WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY day ORDER BY day DESC`
    );

    res.json({
      total: stats?.total_ideas ?? 0,
      avgScore: Math.round(stats?.avg_score ?? 0),
      densityDistribution: Object.fromEntries(byDensity.map(d => [d.density, parseInt(d.count, 10)])),
      recentTrend: trend.map(r => ({ date: r.day, count: parseInt(r.count, 10) })),
    });
  } catch (err) {
    next(err);
  }
}
