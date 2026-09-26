import { ThoughtNode, ConnectionEdge, TagOrbitalShell } from '../types';

// High-dimensional semantic concept anchors for local embedding projection
const SEMANTIC_CONCEPTS: Record<string, string[]> = {
  physics_quantum: ['quantum', 'entanglement', 'superposition', 'bell', 'qubit', 'epr', 'paradox', 'hilbert', 'state', 'particle', 'wave', 'born', 'chsh', 'decoherence', 'teleportation', 'spin', 'mechanics', 'observable', 'eigenvalue'],
  physics_cosmology: ['relativity', 'spacetime', 'curvature', 'einstein', 'geodesic', 'gravity', 'gravitational', 'metric', 'riemannian', 'ricci', 'christoffel', 'lensing', 'blackhole', 'cosmology', 'tensor', 'universe', 'celestial', 'speed', 'light'],
  philosophy_ethics: ['stoic', 'virtue', 'ethics', 'epictetus', 'control', 'enchiridion', 'prohairesis', 'eudaimonia', 'apatheia', 'fati', 'wisdom', 'courage', 'justice', 'temperance', 'marcus', 'aurelius', 'seneca', 'moral', 'duty', 'good'],
  philosophy_mind: ['consciousness', 'mind', 'dualism', 'descartes', 'chalmers', 'qualia', 'hard', 'problem', 'cogito', 'subjective', 'phenomenology', 'mental', 'zombie', 'mary', 'jackson', 'intentionality', 'brain', 'perception', 'awareness', 'ontology'],
  code_graphics: ['webgl', 'gpu', 'pipeline', 'shader', 'vertex', 'fragment', 'rasterization', 'vbo', 'buffer', 'glsl', 'framebuffer', 'mesh', 'rendering', 'draw', 'texture', 'opengl', 'graphics', 'canvas', 'barycentric', 'instanced'],
  code_ai: ['transformer', 'attention', 'latent', 'space', 'embedding', 'vector', 'cosine', 'similarity', 'weights', 'neural', 'query', 'key', 'value', 'multihead', 'vaswani', 'manifold', 'tokens', 'deep', 'optimization', 'gradient', 'backpropagation'],
  general_science: ['physics', 'science', 'mathematics', 'calculus', 'algebra', 'geometry', 'matrix', 'equation', 'proof', 'energy', 'entropy', 'thermodynamics'],
  habits_reflection: ['diary', 'reflection', 'morning', 'clarity', 'journal', 'habit', 'discipline', 'progress', 'goal', 'target', 'milestone', 'focus']
};

const CONCEPT_KEYS = Object.keys(SEMANTIC_CONCEPTS);
const EMBEDDING_DIM = 64;

// Simple fast deterministic hash for n-grams
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

// Standard English stopwords to filter out for clean TF-IDF term representation
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could', 'did', 'do',
  'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
  'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she',
  'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your'
]);

/**
 * Generates a normalized local dense embedding vector for a thought node.
 * Integrates TF-IDF term frequency calculation, semantic domain concept projection,
 * and subword n-gram hashing into a unit-normalized vector.
 */
export function generateLocalEmbedding(thought: Partial<ThoughtNode>): number[] {
  const titleWeight = `${thought.title || ''} ${thought.title || ''} `;
  const tagsWeight = `${thought.tags?.map(t => `${t} ${t}`).join(' ') || ''} `;
  const bodySample = thought.content ? thought.content.slice(0, 30000) : '';
  const text = `${titleWeight} ${tagsWeight} ${bodySample}`.toLowerCase();
  const vector = new Float32Array(EMBEDDING_DIM);

  // 1. TF-IDF Tokenization and Sublinear Term Frequency Scaling: TF = 1 + ln(count)
  const rawWords = text.match(/\b[a-z]{3,}\b/g) || [];
  const wordFreq: Record<string, number> = {};
  for (const w of rawWords) {
    if (!STOPWORDS.has(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  // 2. Domain Concept Anchor Projections (Dimensions 0 to 31)
  CONCEPT_KEYS.forEach((conceptKey, cIndex) => {
    const keywords = SEMANTIC_CONCEPTS[conceptKey];
    let conceptScore = 0;
    for (const kw of keywords) {
      if (wordFreq[kw]) {
        const tf = 1 + Math.log(wordFreq[kw]);
        conceptScore += tf * 1.8;
      } else if (text.includes(kw)) {
        conceptScore += 0.75;
      }
    }
    // Distribute onto corresponding concept dimensions
    const baseDim = (cIndex * 4) % 32;
    vector[baseDim] += conceptScore * 1.2;
    vector[baseDim + 1] += conceptScore * 0.8;
    vector[baseDim + 2] += conceptScore * 0.5;
  });

  // 3. TF-IDF Hashed Vocabulary Projection (Dimensions 32 to 55)
  for (const [word, count] of Object.entries(wordFreq)) {
    const tf = 1 + Math.log(count);
    const h = hashString(word);
    const dim = 32 + (h % 24);
    vector[dim] += tf * 0.45;
  }

  // 4. Structural Tag & Type Bias Signature (Dimensions 56 to 63)
  const cleanTags = (thought.tags || []).map(t => t.replace(/^#/, '').toLowerCase());
  if (cleanTags.includes('physics') || cleanTags.includes('quantum') || cleanTags.includes('space')) {
    vector[56] += 2.8;
    vector[57] += 2.0;
  }
  if (cleanTags.includes('philosophy') || cleanTags.includes('ethics') || cleanTags.includes('mind')) {
    vector[58] += 2.8;
    vector[59] += 2.0;
  }
  if (cleanTags.includes('code') || cleanTags.includes('graphics') || cleanTags.includes('ai')) {
    vector[60] += 2.8;
    vector[61] += 2.0;
  }
  if (thought.type === 'diary') {
    vector[62] += 2.0;
  } else if (thought.type === 'goal') {
    vector[63] += 2.0;
  }

  // 5. L2 Normalization so dot product produces exact Cosine Similarity
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0.00001) {
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      vector[i] /= norm;
    }
  }

  return Array.from(vector);
}

/**
 * Computes cosine similarity between two normalized vectors.
 */
export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dot = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
  }
  return Math.max(0, Math.min(1, dot));
}

/**
 * Extracts a normalized, clean primary tag/topic cluster for a thought node.
 * Guarantees grouping into primary topic clusters (#physics, #philosophy, #code).
 */
export function getPrimaryTopic(thought: ThoughtNode): string {
  const cleanTags = (thought.tags || [])
    .map(t => t.replace(/^#/, '').toLowerCase().trim())
    .filter(Boolean);

  // 1. Explicit check against primary clusters
  if (cleanTags.includes('physics')) return 'physics';
  if (cleanTags.includes('philosophy')) return 'philosophy';
  if (cleanTags.includes('code')) return 'code';

  // 2. Sub-tag domain associations
  for (const tag of cleanTags) {
    if (['quantum', 'space', 'cosmology', 'relativity', 'gravity'].includes(tag)) return 'physics';
    if (['ethics', 'mind', 'consciousness', 'stoic', 'epictetus', 'dualism'].includes(tag)) return 'philosophy';
    if (['graphics', 'ai', 'webgl', 'gpu', 'transformers', 'algorithms', 'neural', 'representation'].includes(tag)) return 'code';
  }

  // 3. Folder-based domain associations
  if (thought.folder) {
    const folderLower = thought.folder.toLowerCase();
    if (folderLower.includes('physics')) return 'physics';
    if (folderLower.includes('philosophy')) return 'philosophy';
    if (folderLower.includes('code') || folderLower.includes('ai')) return 'code';
  }

  if (cleanTags.length > 0) return cleanTags[0];
  if (thought.isTextbook) return 'textbooks';
  if (thought.type === 'diary') return 'diary';
  if (thought.type === 'goal') return 'goals';
  return 'notes';
}

// Orbital Shell Color Mapping across primary and auxiliary clusters:
// Code (Electric Violet: #A855F7), Physics (Gold: #F59E0B), Philosophy (Teal: #14B8A6)
export const TOPIC_SHELL_CONFIG: Record<string, { label: string; color: string; preferredOrder: number }> = {
  code: { label: 'CODE & AI ARCHITECTURE', color: '#A855F7', preferredOrder: 1 },
  physics: { label: 'PHYSICS & COSMOLOGY', color: '#F59E0B', preferredOrder: 2 },
  philosophy: { label: 'PHILOSOPHY & ETHICS', color: '#14B8A6', preferredOrder: 3 },
  diary: { label: 'DIARY & TIMELINE', color: '#EAB308', preferredOrder: 4 },
  goals: { label: 'GOALS & MILESTONES', color: '#06B6D4', preferredOrder: 5 },
  textbooks: { label: 'TEXTBOOKS & CORPUS', color: '#38BDF8', preferredOrder: 6 },
};

/**
 * Computes the distinct tag/topic orbital shells with calibrated radii centered on the Neural Core (0, 0, 0).
 * Groups nodes into orbital rings based on primary topic clusters (#physics, #philosophy, #code).
 */
export function computeTagOrbitalShells(thoughts: ThoughtNode[]): TagOrbitalShell[] {
  const counts: Record<string, number> = {};
  thoughts.forEach(t => {
    const topic = getPrimaryTopic(t);
    counts[topic] = (counts[topic] || 0) + 1;
  });

  const uniqueTopics = Object.keys(counts).sort((a, b) => {
    const orderA = TOPIC_SHELL_CONFIG[a]?.preferredOrder ?? 99;
    const orderB = TOPIC_SHELL_CONFIG[b]?.preferredOrder ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return counts[b] - counts[a] || a.localeCompare(b);
  });

  // Unique orbital radius (R_tag) starting at R=28 with step=16
  const baseRadius = 28;
  const stepRadius = 16;

  return uniqueTopics.map((topic, index) => {
    const config = TOPIC_SHELL_CONFIG[topic];
    return {
      tag: topic,
      label: config?.label || topic.toUpperCase(),
      radius: baseRadius + index * stepRadius,
      color: config?.color || '#8B5CF6',
      nodeCount: counts[topic],
    };
  });
}

/**
 * Computes 3D universe positions for a set of thoughts using:
 * 1. Tag-based Orbital Shells centered at origin (0, 0, 0)
 * 2. Semantic Gravity physics (force-directed angular attraction & repulsion)
 * 3. Continuous slow planetary revolution parameters
 */
export function layoutNodesIn3D(thoughts: ThoughtNode[]): ThoughtNode[] {
  if (thoughts.length === 0) return [];

  // Ensure all thoughts have embeddings
  const withEmbeddings = thoughts.map(t => ({
    ...t,
    embedding: t.embedding || generateLocalEmbedding(t),
  }));

  // 1. Assign each tag/topic category to its own unique orbital radius (R_tag)
  const shells = computeTagOrbitalShells(withEmbeddings);
  const shellMap = new Map<string, TagOrbitalShell>();
  shells.forEach(s => shellMap.set(s.tag, s));

  // Initialize nodes on their respective orbital shells around (0, 0, 0)
  interface NodeSimState {
    thought: ThoughtNode;
    tag: string;
    radius: number;
    angle: number;
    yElev: number;
    speed: number;
  }

  const nodes: NodeSimState[] = withEmbeddings.map((thought, index) => {
    const tag = getPrimaryTopic(thought);
    const shell = shellMap.get(tag) || shells[0];
    const emb = thought.embedding!;

    // Initial angle driven by embedding principal dimensions + distributed phase
    const angleSeed = Math.atan2(emb[4] - emb[16], emb[0] - emb[12]);
    const phaseOffset = (index / withEmbeddings.length) * Math.PI * 2;
    const initialAngle = ((angleSeed + phaseOffset) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);

    // Controlled radial micro-jitter (+- 1.4) to give celestial breathing room within the tag shell
    const radiusJitter = ((index % 5) - 2) * 0.7;
    const radius = shell.radius + radiusJitter;

    // Subtle 3D vertical elevation (+- 3.5)
    const yElev = ((emb[24] || 0) - (emb[28] || 0)) * 5.0 + Math.sin(index * 1.3) * 1.5;

    // Continuous Keplerian-inspired orbital revolution speed (slower for outer rings)
    // Range ~ 0.03 to 0.06 rad/sec
    const speed = 0.042 * Math.sqrt(35 / radius);

    return {
      thought,
      tag,
      radius,
      angle: initialAngle,
      yElev,
      speed,
    };
  });

  // 2. Semantic Gravity Simulation (Force-directed angular attraction & repulsion)
  // - Nodes sharing similar embeddings or overlapping tags pull closer together along their orbital planes.
  // - Disparate/unrelated topics experience orbital repulsion, keeping distinct tag families clustered.
  const iterations = 40;
  for (let iter = 0; iter < iterations; iter++) {
    const angularForces: number[] = new Array(nodes.length).fill(0);

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nA = nodes[i];
        const nB = nodes[j];

        // Semantic similarity
        const sim = cosineSimilarity(nA.thought.embedding!, nB.thought.embedding!);
        const sameTag = nA.tag === nB.tag;
        const affinity = sim + (sameTag ? 0.30 : 0);

        // Angular difference on orbital circle normalized to [-PI, PI]
        let dAngle = nB.angle - nA.angle;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;

        const absDAngle = Math.abs(dAngle);
        const sign = dAngle >= 0 ? 1 : -1;

        // Current 3D distance
        const xA = nA.radius * Math.cos(nA.angle);
        const zA = nA.radius * Math.sin(nA.angle);
        const xB = nB.radius * Math.cos(nB.angle);
        const zB = nB.radius * Math.sin(nB.angle);
        const dist3D = Math.hypot(xB - xA, nB.yElev - nA.yElev, zB - zA);

        // A. Semantic Gravitational Attraction on Shared Orbital Plane:
        // Nodes within the same cluster (#physics, #philosophy, #code) with high semantic similarity
        // pull toward neighboring angular positions on their shared orbital ring.
        if (sameTag) {
          if (sim > 0.30 && absDAngle > 0.06) {
            const attractStrength = Math.min(0.15, (sim - 0.25) * 0.12);
            angularForces[i] += sign * attractStrength;
            angularForces[j] -= sign * attractStrength;
          }

          // Circular arc clearance along the shared orbital shell so planets settle comfortably as neighbors
          const avgRadius = (nA.radius + nB.radius) * 0.5;
          const arcDistance = avgRadius * absDAngle;
          const targetArcClearance = 11.0;
          if (arcDistance < targetArcClearance) {
            const push = Math.min(0.16, (targetArcClearance - arcDistance) * 0.015);
            angularForces[i] -= sign * push;
            angularForces[j] += sign * push;
          }
        } else {
          // Cross-cluster nodes: maintain clean orbital separation
          if (dist3D < 18.0) {
            const repelStrength = Math.min(0.10, (18.0 - dist3D) * 0.01);
            angularForces[i] -= sign * repelStrength;
            angularForces[j] += sign * repelStrength;
          }
        }
      }
    }

    // Apply angular forces with damping
    const damping = 0.65 * (1 - iter / iterations);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].angle += angularForces[i] * damping;
      // Keep in [0, 2PI)
      nodes[i].angle = ((nodes[i].angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    }
  }

  // 3. Output positioned nodes centered cleanly at (0, 0, 0)
  return nodes.map(n => {
    const px = n.radius * Math.cos(n.angle);
    const py = n.yElev;
    const pz = n.radius * Math.sin(n.angle);

    return {
      ...n.thought,
      position: [px, py, pz] as [number, number, number],
      orbitalTag: n.tag,
      orbitalRadius: n.radius,
      orbitalAngle: n.angle,
      orbitalSpeed: n.speed,
      yElevation: n.yElev,
    };
  });
}

/**
 * Calculates connection edges between thoughts where semantic similarity >= threshold.
 */
export function calculateEdges(thoughts: ThoughtNode[], similarityThreshold: number): ConnectionEdge[] {
  const edges: ConnectionEdge[] = [];

  for (let i = 0; i < thoughts.length; i++) {
    for (let j = i + 1; j < thoughts.length; j++) {
      const nodeA = thoughts[i];
      const nodeB = thoughts[j];

      if (!nodeA.position || !nodeB.position) continue;

      const sim = cosineSimilarity(
        nodeA.embedding || generateLocalEmbedding(nodeA),
        nodeB.embedding || generateLocalEmbedding(nodeB)
      );

      if (sim >= similarityThreshold) {
        edges.push({
          id: `${nodeA.id}-${nodeB.id}`,
          sourceId: nodeA.id,
          targetId: nodeB.id,
          similarity: sim,
          sourcePos: nodeA.position,
          targetPos: nodeB.position,
        });
      }
    }
  }

  // Sort by similarity descending
  return edges.sort((a, b) => b.similarity - a.similarity);
}
