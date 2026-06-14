import fetch from 'node-fetch'; 

const OLLAMA_BASE = 'http://localhost:11434';
const LOCAL_LLM = 'mistral'; 

export async function generateEmbedding(idea) {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: idea,
      }),
    });

    if (!response.ok) throw new Error(`Ollama embedding status: ${response.status}`);
    const data = await response.json();

    return { vector: data.embedding };
  } catch (error) {
    console.error('Local embedding error:', error);
    throw new Error(`Failed to generate local embedding: ${error.message}`);
  }
}

export async function generateDrift(idea, score, density, neighbors) {
  try {
    const neighborContext = neighbors.length > 0
      ? `\n\nNearest neighbors found in the database:\n${neighbors.join('\n')}`
      : '\n\n(First idea in the database — no neighbors yet.)';

    const prompt = `You are an originality analyst. The user's idea has been scored mathematically by a vector database — do NOT change or recreate the score.
    
Idea: "${idea}"
Math Score: ${score}/100 (${density})${neighborContext}

Analyze this concept and return ONLY a raw JSON object matching this schema precisely. Do not include markdown formatting, backticks, or conversational text.

{
  "nearestClusters": ["3-5 nearby concepts, fields, or existing products"],
  "whatMakesItCommon": "One sentence explaining what elements make this idea common or populated.",
  "whatMakesItNovel": "One sentence highlighting what element is genuinely unusual or original.",
  "driftSuggestion": "One actionable, specific constraint or domain mashup to push it further into unexplored territory."
}`;

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LOCAL_LLM,
        prompt: prompt,
        stream: false,
        options: { format: 'json' } 
      }),
    });

    if (!response.ok) throw new Error(`Ollama generation status: ${response.status}`);
    const data = await response.json();
    
    const parsed = JSON.parse(data.response.trim());

    return {
      nearestClusters: Array.isArray(parsed.nearestClusters) ? parsed.nearestClusters : [],
      whatMakesItCommon: parsed.whatMakesItCommon || '',
      whatMakesItNovel: parsed.whatMakesItNovel || '',
      driftSuggestion: parsed.driftSuggestion || '',
    };
  } catch (error) {
    console.error('Local drift generation error:', error);
    return {
      nearestClusters: ['Local analysis fallback'],
      whatMakesItCommon: 'Math tracking complete.',
      whatMakesItNovel: 'Analyzing locally.',
      driftSuggestion: 'Try tweaking your concept slightly to trigger a fresh analysis pass.',
    };
  }
}