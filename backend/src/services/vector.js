// backend/src/services/vector.js

// ── Cosine Similarity ───────────────────────────────────────────────────────

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Originality Score from k-NN Similarities ───────────────────────────────
//
// Score = (1 - avgSimilarity) × 100
// - High similarity (0.95) → score ≈ 5  → SATURATED
// - Low similarity  (0.10) → score ≈ 90 → FRONTIER
// - No neighbors at all    → score = 95 → VOID

export function scoreFromDistances(similarities) {
  if (!similarities || similarities.length === 0) {
    return 95; // First idea ever is void by definition
  }

  // Use top-10 nearest neighbors
  const top = similarities.slice(0, Math.min(10, similarities.length));
  const avg = top.reduce((a, b) => a + b, 0) / top.length;

  return Math.max(0, Math.min(100, Math.round((1 - avg) * 100)));
}

// ── Density Label ───────────────────────────────────────────────────────────

export function densityFromScore(score) {
  if (score <= 15) return 'SATURATED';
  if (score <= 35) return 'DENSE';
  if (score <= 55) return 'POPULATED';
  if (score <= 75) return 'SPARSE';
  if (score <= 90) return 'FRONTIER';
  return 'VOID';
}

// ── 2D Projection via Incremental PCA ──────────────────────────────────────
//
// Projects a 1024-dim vector to (x, y) using the two highest-variance axes
// found in the existing database vectors. Similar ideas cluster together
// because the projection preserves cosine distances as much as possible
// in a 2D linear subspace.
//
// For production with 10k+ ideas, replace this with a periodic UMAP job
// that re-projects all vectors and stores the results in the database.

export function projectCoordinates(allVectors, newVector) {
  if (!allVectors || allVectors.length < 2) {
    // Not enough data to compute axes — scatter deterministically
    const hash = newVector.slice(0, 4).reduce((a, b) => a + b, 0);
    return {
      x: Math.tanh(newVector[0] * 3),
      y: Math.tanh(newVector[1] * 3),
    };
  }

  const combined = [...allVectors, newVector];
  const n = combined.length;
  const d = newVector.length;

  // Compute column means
  const means = new Array(d).fill(0);
  for (const v of combined) {
    for (let i = 0; i < d; i++) means[i] += v[i] / n;
  }

  // Center the new vector
  const centered = newVector.map((x, i) => x - means[i]);

  // Find the two highest-variance directions in the dataset using power iteration
  // (fast approximation — one iteration each)
  const axis1 = powerIterate(combined, means, d, null);
  const axis2 = powerIterate(combined, means, d, axis1);

  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

  const x = dot(centered, axis1);
  const y = dot(centered, axis2);

  // Clamp to [-1, 1] using tanh to handle outliers gracefully
  const scale = Math.sqrt(d) * 0.15;
  return {
    x: Math.tanh(x / scale),
    y: Math.tanh(y / scale),
  };
}

function powerIterate(vectors, means, d, deflateAxis) {
  const dot  = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const norm = (a) => {
    const mag = Math.sqrt(dot(a, a));
    return mag < 1e-10 ? a : a.map(x => x / mag);
  };

  // Start with a random-ish direction based on the first vector
  let v = vectors[0].map((x, i) => x - means[i]);

  // Deflate against previous axis if provided (Gram-Schmidt)
  if (deflateAxis) {
    const proj = dot(v, deflateAxis);
    v = v.map((x, i) => x - proj * deflateAxis[i]);
  }
  v = norm(v);

  // One power-iteration pass: compute covariance-vector product
  const Cv = new Array(d).fill(0);
  for (const vec of vectors) {
    const centered = vec.map((x, i) => x - means[i]);
    const scale = dot(centered, v);
    for (let i = 0; i < d; i++) Cv[i] += centered[i] * scale;
  }

  // Deflate again and normalise
  if (deflateAxis) {
    const proj = dot(Cv, deflateAxis);
    for (let i = 0; i < d; i++) Cv[i] -= proj * deflateAxis[i];
  }

  return norm(Cv);
}
