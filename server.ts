import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import JSZip from 'jszip';
import { PDFParse } from 'pdf-parse';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;
const VAULT_DIR = path.join(process.cwd(), 'vault');
const ATTACHMENTS_DIR = path.join(VAULT_DIR, 'attachments');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/vault/attachments', express.static(ATTACHMENTS_DIR));

// Helper: Parse YAML frontmatter and markdown body
function parseMarkdownWithFrontmatter(fileContent: string) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);

  const frontmatter: Record<string, any> = {};
  let body = fileContent;

  if (match) {
    const yamlBlock = match[1];
    body = match[2];

    const lines = yamlBlock.split(/\r?\n/);
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const key = line.slice(0, colonIndex).trim();
        let val: any = line.slice(colonIndex + 1).trim();

        // Parse basic types
        if (val.startsWith('[') && val.endsWith(']')) {
          val = val
            .slice(1, -1)
            .split(',')
            .map((s: string) => s.trim().replace(/^["']|["']$/g, ''))
            .filter(Boolean);
        } else if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        } else if (val === 'true') {
          val = true;
        } else if (val === 'false') {
          val = false;
        } else if (!isNaN(Number(val)) && val !== '') {
          val = Number(val);
        }
        frontmatter[key] = val;
      }
    }
  }

  return { frontmatter, body };
}

// Helper: Stringify frontmatter to YAML string
function stringifyFrontmatter(data: Record<string, any>, body: string): string {
  let yaml = '---\n';
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      yaml += `${k}: [${v.map(item => `"${item}"`).join(', ')}]\n`;
    } else if (typeof v === 'string') {
      yaml += `${k}: "${v.replace(/"/g, '\\"')}"\n`;
    } else {
      yaml += `${k}: ${v}\n`;
    }
  }
  yaml += '---\n\n';
  yaml += body;
  return yaml;
}

// Ensure default folders and initial seed files exist
function ensureVaultSeed() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
  }

  const defaultFolders = ['Notes/AI', 'Notes/Physics', 'Notes/Philosophy', 'Notes/Code', 'Notes/Neuroscience', 'Notes/Textbooks', 'Diary', 'Goals'];
  for (const folder of defaultFolders) {
    const p = path.join(VAULT_DIR, folder);
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }

  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }

  // 6 Domain-Specific Wikipedia Test Nodes to validate semantic clustering, orbital shells, and neural core gradient
  const wikipediaTestSeeds = [
    {
      folder: 'Notes/Physics',
      filename: 'Quantum-Entanglement-Superposition.md',
      frontmatter: {
        id: 'node-quantum-entanglement',
        title: 'Quantum Entanglement & Superposition',
        type: 'note',
        tags: ['physics', 'quantum'],
        createdAt: '2026-09-10T10:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      body: `# Quantum Entanglement & Superposition

**Quantum entanglement** is a physical phenomenon occurring when pairs or groups of particles interact such that the quantum state of each particle cannot be described independently of the state of the others, even when separated by a large distance.

## Superposition & State Vector Formulation
In isolated quantum systems, states exist as vectors $|\\psi\\rangle$ in a complex Hilbert space $\\mathcal{H}$:
$$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle \\quad \\text{where } |\\alpha|^2 + |\\beta|^2 = 1$$

For composite two-qubit systems, canonical maximally entangled **Bell states** (EPR pairs) form an orthonormal basis:
$$|\\Phi^+\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle + |11\\rangle), \\quad |\\Phi^-\\rangle = \\frac{1}{\\sqrt{2}}(|00\\rangle - |11\\rangle)$$
$$|\\Psi^+\\rangle = \\frac{1}{\\sqrt{2}}(|01\\rangle + |10\\rangle), \\quad |\\Psi^-\\rangle = \\frac{1}{\\sqrt{2}}(|01\\rangle - |10\\rangle)$$

## The EPR Paradox & Bell's Theorem
In 1935, Einstein, Podolsky, and Rosen formulated the **EPR paradox**, hypothesizing local hidden variables to resolve "spooky action at a distance". In 1964, John Stewart Bell proved that local realism implies strict bounds on statistical correlations:
$$|S| \\leq 2 \\quad \\text{(CHSH Bell Inequality)}$$
Quantum mechanics violates this bound up to Tsirelson's bound $2\\sqrt{2} \\approx 2.828$, decisively confirmed by experimental tests (Aspect, Zeilinger).

## Gravitational & Cross-Domain Intersections
- Intersects with [[General-Relativity-Spacetime-Curvature]] via the holographic ER=EPR principle (Maldacena-Susskind wormholes).
- Provides physical basis for quantum computing vector states explored in [[Transformers-Latent-Space-Dynamics]].
`
    },
    {
      folder: 'Notes/Physics',
      filename: 'General-Relativity-Spacetime-Curvature.md',
      frontmatter: {
        id: 'node-general-relativity',
        title: 'General Relativity & Spacetime Curvature',
        type: 'note',
        tags: ['physics', 'space'],
        createdAt: '2026-09-10T11:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      body: `# General Relativity & Spacetime Curvature

**General relativity** is the geometric theory of gravitation formulated by Albert Einstein in 1915. Gravitation is not an invisible attractive force, but the consequence of the curvature of four-dimensional spacetime induced by the mass, energy, and momentum of matter.

## The Einstein Field Equations (EFE)
The metric tensor $g_{\\mu\\nu}$ of pseudo-Riemannian spacetime geometry relates to the stress-energy tensor $T_{\\mu\\nu}$:
$$G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}$$
where $G_{\\mu\\nu} \\equiv R_{\\mu\\nu} - \\frac{1}{2} R g_{\\mu\\nu}$ is the Einstein curvature tensor composed of the Ricci tensor $R_{\\mu\\nu}$ and scalar curvature $R$.

## Geodesic Motion in Curved Spacetime
Test particles in free fall navigate along extremal paths known as **geodesics**:
$$\\frac{d^2 x^\\mu}{d\\tau^2} + \\Gamma^\\mu_{\\alpha\\beta} \\frac{dx^\\alpha}{d\\tau} \\frac{dx^\\beta}{d\\tau} = 0$$
where $\\Gamma^\\mu_{\\alpha\\beta}$ are the Christoffel connection coefficients derived from metric derivatives.

## Observational Phenomena
- **Gravitational Lensing**: Deflection of light rays grazing deep potential wells.
- **Gravitational Waves**: Ripples in spacetime geometry propagating at $c$, directly captured by LIGO/Virgo.
- **Frame Dragging & Gravitational Redshift**: Clocks tick slower in intense gravitational fields.

## Cross-Domain Intersections
- Connected with micro-scale geometry in [[Quantum-Entanglement-Superposition]].
- Shares continuous manifold geometry with high-dimensional embeddings in [[Transformers-Latent-Space-Dynamics]].
`
    },
    {
      folder: 'Notes/Philosophy',
      filename: 'Stoic-Virtue-Ethics-Epictetus.md',
      frontmatter: {
        id: 'node-stoic-virtue-ethics',
        title: 'Stoic Virtue Ethics & Epictetus',
        type: 'note',
        tags: ['philosophy', 'ethics'],
        createdAt: '2026-09-10T12:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      body: `# Stoic Virtue Ethics & Epictetus

**Stoic virtue ethics** is an ancient Hellenistic philosophy founded by Zeno of Citium and cultivated by Seneca, Epictetus, and Marcus Aurelius. Stoicism teaches that virtue (*aretē*) constitutes the sole and sufficient good for human flourishing (*eudaimonia*).

## The Dichotomy of Control (*Enchiridion*)
Epictetus grounds Stoic practice in distinguishing what is within our agency from what is not:
> *"Some things are in our control (eph' hemin) and others not. In our control are opinion, pursuit, desire, aversion, and whatever are our own actions. Not in our control are body, property, reputation, and whatever are not our own actions."*

### Key Tenets
- **Prohairesis (Faculty of Choice)**: The rational will capable of evaluating cognitive impressions (*phantasiai*).
- **Apatheia**: Serene equanimity unclouded by irrational passions or external distress.
- **Amor Fati**: The courageous affirmation of necessity, transforming hardship into ethical strength.

## The Four Cardinal Virtues
1. **Practical Wisdom (Phronesis)**: Discerning good from indifferent.
2. **Courage (Andreia)**: Standing resolute against fear and difficulty.
3. **Justice (Dikaiosyne)**: Fair treatment and duty to the cosmopolitan community.
4. **Temperance (Sophrosyne)**: Measured restraint and self-regulation.

## Cross-Domain Intersections
- Connects to agency, intentionality, and conscious control in [[Philosophy-of-Mind-Dualism]].
- Guides focused habit structures and daily reflection.
`
    },
    {
      folder: 'Notes/Philosophy',
      filename: 'Philosophy-of-Mind-Dualism.md',
      frontmatter: {
        id: 'node-philosophy-mind-dualism',
        title: 'Philosophy of Mind & Dualism',
        type: 'note',
        tags: ['philosophy', 'mind'],
        createdAt: '2026-09-10T13:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      body: `# Philosophy of Mind & Dualism

**Philosophy of mind** examines the nature of mental states, consciousness, sensory experience, and their metaphysical relationship to the physical brain and body.

## Cartesian Substance Dualism
In *Meditations on First Philosophy* (1641), René Descartes asserted that reality divides into two irreducible ontological substances:
- **Res Cogitans (Thinking Substance)**: Non-extended, indivisible, conscious mind.
- **Res Extensa (Extended Substance)**: Spatial, divisible, mechanistic physical matter.

Descartes reasoned through the *Cogito* (*"Cogito, ergo sum"*) that consciousness is indubitable, whereas physical matter remains subject to hyperbolic doubt.

## The Hard Problem of Consciousness
Philosopher David Chalmers famously partitioned the mind-body problem:
- **The "Easy" Problems**: Explaining cognitive functions, attentional routing, memory access, and verbal reporting through neuroscience.
- **The "Hard" Problem**: Why does physical neural firing feel like anything from the inside? How does physical matter generate subjective experience (*qualia*)?

### Landmark Thought Experiments
- **Mary's Room (Frank Jackson)**: A vision scientist learns all physical facts of color vision in black-and-white. Upon seeing red for the first time, does she learn something new?
- **The Philosophical Zombie (P-Zombie)**: A hypothetical physical duplicate devoid of subjective conscious experience.

## Cross-Domain Intersections
- Directly probes the nature of machine intelligence and representation in [[Transformers-Latent-Space-Dynamics]].
- Complements ethical reflection on intentionality in [[Stoic-Virtue-Ethics-Epictetus]].
`
    },
    {
      folder: 'Notes/Code',
      filename: 'WebGL-GPU-Pipeline-Architecture.md',
      frontmatter: {
        id: 'node-webgl-gpu-pipeline',
        title: 'WebGL & GPU Pipeline Architecture',
        type: 'note',
        tags: ['code', 'graphics'],
        createdAt: '2026-09-10T14:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      body: `# WebGL & GPU Pipeline Architecture

**WebGL** (Web Graphics Library) is a low-level JavaScript graphics API conforming to OpenGL ES, enabling hardware-accelerated 3D vector graphics rendering in HTML5 \`<canvas>\` elements across desktop and mobile devices.

## The GPU Programmable Pipeline Stages
The rasterization graphics pipeline converts 3D mathematical meshes into 2D display pixels:

1. **Vertex Buffers (VBOs) & Vertex Fetch**: Memory arrays of vertex positions, normals, tangents, and UV coordinates are streamed directly into GPU VRAM.
2. **Programmable Vertex Shader**: Transforms vertex coordinates by the Model-View-Projection (MVP) matrix:
   $$\\mathbf{v}_{\\text{clip}} = \\mathbf{P} \\times \\mathbf{V} \\times \\mathbf{M} \\times \\mathbf{v}_{\\text{local}}$$
3. **Primitive Assembly & Clipping**: Coordinates are assembled into geometric triangles and clipped against the normalized device coordinate (NDC) view frustum $[-1, 1]^3$.
4. **Rasterization & Interpolation**: Triangles are decomposed into discrete fragments. Varying attributes are interpolated across pixel centers via barycentric coordinates $(\\lambda_1, \\lambda_2, \\lambda_3)$.
5. **Programmable Fragment Shader**: Computes per-pixel RGBA color, evaluating PBR Cook-Torrance lighting, procedural noise textures, and GLSL uniforms.
6. **Per-Sample Operations**: Evaluates depth testing ($Z$-buffer), stencil tests, and additive/blended framebuffers.

## High-Performance 3D Shaders in Universe
- **Unreal Bloom Passes**: Isolates emissive planetary surfaces and stellar corona without canvas burnout.
- **Dynamic GLSL Uniforms**: Updates dynamic category proportions and time-varying plasma noise in real time.

## Cross-Domain Intersections
- Powers real-time visual manifold projection of high-dimensional weights in [[Transformers-Latent-Space-Dynamics]].
`
    },
    {
      folder: 'Notes/Code',
      filename: 'Transformers-Latent-Space-Dynamics.md',
      frontmatter: {
        id: 'node-transformers-latent-space',
        title: 'Transformers & Latent Space Dynamics',
        type: 'note',
        tags: ['code', 'ai'],
        createdAt: '2026-09-10T15:00:00.000Z',
        updatedAt: '2026-09-14T00:00:00.000Z',
      },
      body: `# Transformers & Latent Space Dynamics

The **Transformer** architecture (Vaswani et al., 2017) revolutionized machine learning by replacing recurrence with multi-head scaled dot-product attention, allowing high-throughput parallel training over massive sequence contexts.

## Scaled Dot-Product Self-Attention
Given query matrix $Q$, key matrix $K$, and value matrix $V$ in dimension $d_k$:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
The denominator $\\sqrt{d_k}$ mitigates small gradients in high-dimensional softmax evaluations.

**Multi-Head Attention** partitions representations into $h$ specialized projections:
$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$
$$\\text{where } \\text{head}_i = \\text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

## Latent Space Geometry & Cosine Similarity
High-dimensional dense vectors $\\mathbf{z} \\in \\mathbb{R}^d$ form continuous semantic manifolds. Cosine similarity measures angular orientation irrespective of vector magnitude:
$$\\text{sim}(\\mathbf{u}, \\mathbf{v}) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\|_2 \\|\\mathbf{v}\\|_2} = \\cos(\\theta)$$

- **Semantic Gravitational Clustering**: Semantically aligned ideas pull toward adjacent angular sectors on shared orbital shells.
- **Vector Compositionality**: Semantic transformations operate as linear translations in latent space.

## Cross-Domain Intersections
- Rendered on the GPU graphics pipeline explained in [[WebGL-GPU-Pipeline-Architecture]].
- Raises profound metaphysical questions regarding machine understanding in [[Philosophy-of-Mind-Dualism]].
`
    }
  ];

  // Write Wikipedia test seeds if any are missing
  for (const seed of wikipediaTestSeeds) {
    const fullDir = path.join(VAULT_DIR, seed.folder);
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }
    const fullPath = path.join(fullDir, seed.filename);
    if (!fs.existsSync(fullPath)) {
      const markdown = stringifyFrontmatter(seed.frontmatter, seed.body);
      fs.writeFileSync(fullPath, markdown, 'utf-8');
      console.log(`Ingested Wikipedia test note: ${seed.filename}`);
    }
  }

  // Check if vault has any .md files
  function hasMdFiles(dir: string): boolean {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (hasMdFiles(full)) return true;
      } else if (entry.name.endsWith('.md')) {
        return true;
      }
    }
    return false;
  }

  if (!hasMdFiles(VAULT_DIR)) {
    console.log('Seeding initial Obsidian-compatible thoughts into /vault...');
    const seeds = [
      {
        folder: 'Notes/AI',
        filename: 'Latent-Space-Dynamics.md',
        frontmatter: {
          id: 'note-latent-space',
          title: 'Latent Space Dynamics',
          type: 'note',
          tags: ['ai', 'representation', 'geometry', 'embeddings'],
          createdAt: '2026-09-08T14:30:00.000Z',
          updatedAt: '2026-09-12T00:15:00.000Z',
        },
        body: `# Latent Space Dynamics

Latent representations capture high-dimensional manifolds compressed into continuous topological spaces. In modern cognitive architectures, semantic proximity corresponds to geometric closeness.

Key intuitions:
- Semantic vectors form topological manifolds that can be mapped to 3D coordinate frames.
- Continuous vector spaces allow interpolation between disparate ideas, enabling creative synthesis.
- Related to [[Cortical-Mapping]] and modern [[Transformer-Attention-Mechanisms]].

> "The topology of mind is formed by the geometric curvature of its latent abstractions."
`
      },
      {
        folder: 'Notes/AI',
        filename: 'Transformer-Attention-Mechanisms.md',
        frontmatter: {
          id: 'note-attention',
          title: 'Transformer Attention Mechanisms',
          type: 'note',
          tags: ['ai', 'transformers', 'neural', 'algorithms'],
          createdAt: '2026-09-09T09:00:00.000Z',
          updatedAt: '2026-09-11T18:40:00.000Z',
        },
        body: `# Transformer Attention Mechanisms

Attention computes dynamic data-dependent routing weights over tokens. By calculating query-key inner products, representations dynamically attend to contextual clues across long horizons.

- Multi-head projections partition representation into specialized subspaces.
- Cross-attention provides grounding across modalities.
- Feeds into our exploration of [[Latent-Space-Dynamics]].
`
      },
      {
        folder: 'Notes/Neuroscience',
        filename: 'Cortical-Mapping.md',
        frontmatter: {
          id: 'note-cortical',
          title: 'Cortical Mapping & High-Bandwidth Interfaces',
          type: 'note',
          tags: ['neuroscience', 'biology', 'brain', 'hardware'],
          createdAt: '2026-09-06T11:20:00.000Z',
          updatedAt: '2026-09-10T16:00:00.000Z',
        },
        body: `# Cortical Mapping & High-Bandwidth Interfaces

Investigating direct cortical readout methods. The primary somatosensory and visual cortices utilize retinotopic and tonotopic spatial maps that mirror sensory topology.

Connections:
- Directly intersects with computational principles in [[Latent-Space-Dynamics]].
- Poses fundamental questions for [[Emergent-Consciousness]].
`
      },
      {
        folder: 'Notes/Philosophy',
        filename: 'Emergent-Consciousness.md',
        frontmatter: {
          id: 'note-consciousness',
          title: 'Emergent Consciousness & Integrated Information',
          type: 'note',
          tags: ['philosophy', 'mind', 'consciousness', 'systems'],
          createdAt: '2026-09-04T20:10:00.000Z',
          updatedAt: '2026-09-11T22:30:00.000Z',
        },
        body: `# Emergent Consciousness & Integrated Information

Does consciousness arise purely from high phi (integrated information) across recursive feedback loops, or is intentionality fundamentally irreducible?

- Reflection on personal journal [[2026-09-10-midnight-breakthrough]].
- Grounded in physical substrate described in [[Cortical-Mapping]].
`
      },
      {
        folder: 'Diary',
        filename: '2026-09-12-morning-clarity.md',
        frontmatter: {
          id: 'diary-morning-clarity',
          title: 'Morning Clarity: Geometry of Thought',
          type: 'diary',
          tags: ['reflection', 'morning', 'clarity', 'mindfulness'],
          mood: 'Inspired',
          createdAt: '2026-09-12T07:15:00.000Z',
          updatedAt: '2026-09-12T07:45:00.000Z',
        },
        body: `# Morning Clarity: Geometry of Thought

Woke up at 6:15 AM with a quiet, sharp focus. The morning light filtered through the blinds casting geometric shadows across the desk.

Reflections:
- Spent 20 minutes in silence breathing before looking at screens.
- Felt a clear synthesis between yesterday's work on [[Master-Spatial-Computing]] and my reading on [[Latent-Space-Dynamics]].
- Intention for today: Protect 3 uninterrupted hours of deep coding and synthesis. Keep the mind calm and unobstructed.
`
      },
      {
        folder: 'Diary',
        filename: '2026-09-10-midnight-breakthrough.md',
        frontmatter: {
          id: 'diary-midnight-breakthrough',
          title: 'Midnight Breakthrough on Recursive Embeddings',
          type: 'diary',
          tags: ['diary', 'epiphany', 'breakthrough', 'energy'],
          mood: 'Energized',
          createdAt: '2026-09-10T23:50:00.000Z',
          updatedAt: '2026-09-11T00:15:00.000Z',
        },
        body: `# Midnight Breakthrough on Recursive Embeddings

Could not sleep tonight because the pieces suddenly clicked together. When thoughts are embedded not just as isolated bag-of-words but as vector nodes connected by particle trails, the entire graph behaves like an associative neural cortex!

- Logged my findings into [[Transformer-Attention-Mechanisms]].
- This moves our progress forward on [[Publish-Neural-Architecture-Paper]].
- Need to balance this intense nocturnal energy with morning recovery.
`
      },
      {
        folder: 'Diary',
        filename: '2026-09-08-quiet-solitude.md',
        frontmatter: {
          id: 'diary-quiet-solitude',
          title: 'Quiet Solitude & Long Forest Walk',
          type: 'diary',
          tags: ['diary', 'nature', 'peace', 'gratitude'],
          mood: 'Serene',
          createdAt: '2026-09-08T18:00:00.000Z',
          updatedAt: '2026-09-08T18:40:00.000Z',
        },
        body: `# Quiet Solitude & Long Forest Walk

Took a 7-mile walk through the redwood trails. No headphones, just the rhythmic crunch of pine needles and rustling cedar branches.

Observations:
- The mind is naturally drawn to equilibrium when noise is filtered out.
- Reminded myself why [[Daily-Deep-Work-Discipline]] matters: not for compulsive output, but to carve out sacred space for reflection.
`
      },
      {
        folder: 'Goals',
        filename: 'Master-Spatial-Computing.md',
        frontmatter: {
          id: 'goal-spatial-computing',
          title: 'Master Spatial Computing & 3D Shaders',
          type: 'goal',
          tags: ['goals', 'graphics', 'shaders', 'spatial', '3d'],
          targetDate: '2026-11-30',
          goalStatus: 'in-progress',
          goalPriority: 'high',
          progress: 65,
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-12T00:00:00.000Z',
        },
        body: `# Master Spatial Computing & 3D Shaders

## Objective
Develop world-class intuition and implementation skill in WebGL, custom GLSL pulsating glow shaders, and particle simulation physics in 3D.

### Key Milestones
- [x] Build custom pulsating shader materials for glowing spheres
- [x] Implement instanced flowing light particles traversing graph edges
- [x] Integrate camera flight animation and vertical spotlight beams
- [ ] Profile WebGL draw calls for 10,000+ simultaneous instanced stars

Connected thoughts:
- Supports [[Latent-Space-Dynamics]] visualizer
- Deep work tracked in [[Daily-Deep-Work-Discipline]]
`
      },
      {
        folder: 'Goals',
        filename: 'Publish-Neural-Architecture-Paper.md',
        frontmatter: {
          id: 'goal-publish-paper',
          title: 'Publish Neural Architecture Paper',
          type: 'goal',
          tags: ['goals', 'ai', 'research', 'publication'],
          targetDate: '2026-12-15',
          goalStatus: 'in-progress',
          goalPriority: 'high',
          progress: 40,
          createdAt: '2026-08-25T14:00:00.000Z',
          updatedAt: '2026-09-10T12:00:00.000Z',
        },
        body: `# Publish Neural Architecture Paper

## Objective
Synthesize our empirical findings on associative latent space topology into a preprint for submission.

### Action Items
- [x] Literature review covering [[Transformer-Attention-Mechanisms]]
- [x] Draft initial mathematical formulations
- [ ] Run benchmark comparisons on semantic cluster retrieval
- [ ] Finalize manuscript figures and interactive 3D universe demo
`
      },
      {
        folder: 'Goals',
        filename: 'Daily-Deep-Work-Discipline.md',
        frontmatter: {
          id: 'goal-deep-work',
          title: 'Maintain 4 Hours Daily Deep Work Routine',
          type: 'goal',
          tags: ['goals', 'habits', 'discipline', 'productivity'],
          targetDate: '2026-10-31',
          goalStatus: 'in-progress',
          goalPriority: 'medium',
          progress: 80,
          createdAt: '2026-09-01T08:00:00.000Z',
          updatedAt: '2026-09-12T00:00:00.000Z',
        },
        body: `# Maintain 4 Hours Daily Deep Work Routine

## Rules of Engagement
- Zero notifications before 12:00 PM.
- Phone stays in separate room in airplane mode.
- 90-minute ultradian cycles with 15-minute breaks.
- Daily accountability logged in [[2026-09-12-morning-clarity]].
`
      }
    ];

    for (const seed of seeds) {
      const fullDir = path.join(VAULT_DIR, seed.folder);
      if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
      }
      const fullPath = path.join(fullDir, seed.filename);
      const markdown = stringifyFrontmatter(seed.frontmatter, seed.body);
      fs.writeFileSync(fullPath, markdown, 'utf-8');
    }
  }
}

// Recursively traverse vault directory to gather all markdown files
function scanVault(dir: string, baseDir: string = VAULT_DIR): { thoughts: any[]; tree: any[] } {
  const thoughts: any[] = [];
  const tree: any[] = [];

  if (!fs.existsSync(dir)) return { thoughts, tree };

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      const sub = scanVault(fullPath, baseDir);
      thoughts.push(...sub.thoughts);
      tree.push({
        name: entry.name,
        path: relPath,
        isDirectory: true,
        children: sub.tree,
      });
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { frontmatter, body } = parseMarkdownWithFrontmatter(raw);

      const stats = fs.statSync(fullPath);
      const title = frontmatter.title || entry.name.replace(/\.md$/, '');
      const type = frontmatter.type || (relPath.startsWith('Diary') ? 'diary' : relPath.startsWith('Goals') ? 'goal' : 'note');

      const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

      const thought = {
        id: frontmatter.id || `node-${Buffer.from(relPath).toString('base64url')}`,
        title,
        type,
        content: body,
        folder: path.dirname(relPath) === '.' ? '' : path.dirname(relPath),
        filePath: relPath,
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        createdAt: frontmatter.createdAt || stats.birthtime.toISOString(),
        updatedAt: frontmatter.updatedAt || stats.mtime.toISOString(),
        mood: frontmatter.mood,
        targetDate: frontmatter.targetDate,
        goalStatus: frontmatter.goalStatus,
        goalPriority: frontmatter.goalPriority,
        progress: frontmatter.progress !== undefined ? Number(frontmatter.progress) : undefined,
        isTextbook: Boolean(frontmatter.isTextbook),
        pageCount: frontmatter.pageCount !== undefined ? Number(frontmatter.pageCount) : undefined,
        pdfFileName: frontmatter.pdfFileName,
        pdfUrl: frontmatter.pdfUrl,
        wordCount,
      };

      thoughts.push(thought);
      tree.push({
        name: entry.name,
        path: relPath,
        isDirectory: false,
        type,
      });
    }
  }

  return { thoughts, tree };
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', vaultPath: VAULT_DIR });
});

// List all thoughts and file tree
app.get('/api/vault/list', (req, res) => {
  try {
    ensureVaultSeed();
    const { thoughts, tree } = scanVault(VAULT_DIR);
    res.json({ thoughts, tree, vaultPath: VAULT_DIR });
  } catch (err: any) {
    console.error('Error scanning vault:', err);
    res.status(500).json({ error: err.message });
  }
});

// Explicitly ensure/re-inject the 6 Wikipedia test nodes
app.post('/api/vault/inject-test-nodes', (req, res) => {
  try {
    ensureVaultSeed();
    const { thoughts, tree } = scanVault(VAULT_DIR);
    res.json({ success: true, count: thoughts.length, thoughts, tree });
  } catch (err: any) {
    console.error('Error injecting test nodes:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save or create a markdown note on disk
app.post('/api/vault/save', (req, res) => {
  try {
    const { id, title, type, content, folder, tags, mood, targetDate, goalStatus, goalPriority, progress, filePath } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Determine clean file path
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, '-').trim();
    let targetFolder = folder || (type === 'diary' ? 'Diary' : type === 'goal' ? 'Goals' : 'Notes');
    targetFolder = targetFolder.replace(/^\/+|\/+$/g, '');

    const targetDir = path.join(VAULT_DIR, targetFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    let targetFilePath = filePath;
    if (!targetFilePath) {
      targetFilePath = path.join(targetFolder, `${safeTitle}.md`).replace(/\\/g, '/');
    }

    const fullFilePath = path.join(VAULT_DIR, targetFilePath);

    const now = new Date().toISOString();
    const frontmatter: Record<string, any> = {
      id: id || `node-${Date.now()}`,
      title,
      type: type || 'note',
      tags: Array.isArray(tags) ? tags : [],
      updatedAt: now,
    };

    if (req.body.createdAt) {
      frontmatter.createdAt = req.body.createdAt;
    } else {
      frontmatter.createdAt = now;
    }

    if (type === 'diary' && mood) frontmatter.mood = mood;
    if (type === 'goal') {
      if (targetDate) frontmatter.targetDate = targetDate;
      if (goalStatus) frontmatter.goalStatus = goalStatus;
      if (goalPriority) frontmatter.goalPriority = goalPriority;
      if (progress !== undefined) frontmatter.progress = progress;
    }

    if (req.body.isTextbook !== undefined) frontmatter.isTextbook = Boolean(req.body.isTextbook);
    if (req.body.pageCount !== undefined) frontmatter.pageCount = req.body.pageCount;
    if (req.body.pdfFileName) frontmatter.pdfFileName = req.body.pdfFileName;
    if (req.body.pdfUrl) frontmatter.pdfUrl = req.body.pdfUrl;

    const markdownOutput = stringifyFrontmatter(frontmatter, content || '');
    fs.writeFileSync(fullFilePath, markdownOutput, 'utf-8');

    const wordCount = (content || '').trim() ? (content || '').trim().split(/\s+/).length : 0;

    const savedNode = {
      ...frontmatter,
      content: content || '',
      folder: targetFolder,
      filePath: targetFilePath,
      wordCount,
    };

    res.json({ success: true, thought: savedNode });
  } catch (err: any) {
    console.error('Error saving note:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete note from disk
app.delete('/api/vault/delete', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const fullFilePath = path.join(VAULT_DIR, filePath);
    if (fs.existsSync(fullFilePath)) {
      fs.unlinkSync(fullFilePath);
      return res.json({ success: true, message: 'File deleted' });
    }
    res.status(404).json({ error: 'File not found' });
  } catch (err: any) {
    console.error('Error deleting note:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a custom folder in the vault
app.post('/api/vault/folder', (req, res) => {
  try {
    const { folderPath } = req.body;
    if (!folderPath) {
      return res.status(400).json({ error: 'folderPath is required' });
    }
    const cleanPath = folderPath.replace(/^\/+|\/+$/g, '');
    const fullDirPath = path.join(VAULT_DIR, cleanPath);
    if (!fs.existsSync(fullDirPath)) {
      fs.mkdirSync(fullDirPath, { recursive: true });
    }
    res.json({ success: true, folderPath: cleanPath });
  } catch (err: any) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: err.message });
  }
});

// Export entire vault as ZIP for Obsidian
app.get('/api/vault/export-zip', async (req, res) => {
  try {
    const zip = new JSZip();

    function addDirToZip(dir: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const subZip = zipFolder.folder(entry.name);
          if (subZip) addDirToZip(fullPath, subZip);
        } else {
          const fileData = fs.readFileSync(fullPath);
          zipFolder.file(entry.name, fileData);
        }
      }
    }

    addDirToZip(VAULT_DIR, zip);

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="obsidian-knowledge-vault.zip"');
    res.send(buffer);
  } catch (err: any) {
    console.error('Error exporting zip:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload and index a PDF textbook into the vault
app.post('/api/vault/upload-pdf', async (req, res) => {
  try {
    const { fileName, fileBase64, customTitle, targetFolder } = req.body;
    if (!fileName || !fileBase64) {
      return res.status(400).json({ error: 'fileName and fileBase64 are required' });
    }

    // Decode base64 buffer
    const buffer = Buffer.from(fileBase64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Empty file buffer' });
    }

    // Ensure attachments directory exists
    if (!fs.existsSync(ATTACHMENTS_DIR)) {
      fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
    }
    const safeBaseName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const attachmentPath = path.join(ATTACHMENTS_DIR, safeBaseName);
    fs.writeFileSync(attachmentPath, buffer);

    // Parse with PDFParse
    let textResult: any = { pages: [], text: '', total: 1 };
    try {
      const parser = new PDFParse({ data: buffer });
      textResult = await parser.getText();
    } catch (parseErr) {
      console.warn('PDFParse getText warning:', parseErr);
    }

    const totalPages = textResult.total || (textResult.pages?.length || 1);
    const fullRawText = textResult.text || '';

    // Derive textbook title
    let derivedTitle = customTitle;
    if (!derivedTitle || !derivedTitle.trim()) {
      const lines = fullRawText.split(/\r?\n/).map((s: string) => s.trim()).filter(Boolean);
      const candidate = lines.find((l: string) => l.length > 3 && l.length < 90 && !l.toLowerCase().includes('page') && !l.toLowerCase().includes('copyright'));
      derivedTitle = candidate || fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
    }
    derivedTitle = derivedTitle.trim();

    // Scan existing thoughts to auto-inject [[Wikilinks]] for cross-connections
    const { thoughts: existingNotes } = scanVault(VAULT_DIR);
    const crossLinks = existingNotes
      .filter(n => n.title.length > 3)
      .map(n => ({
        title: n.title,
        slug: n.title.replace(/ /g, '-'),
      }));

    // Detect chapters or segment by pages
    const chaptersList: { title: string; page: number; summary: string }[] = [];
    let structuredMarkdown = `# ${derivedTitle}\n\n`;
    structuredMarkdown += `> 📚 **Textbook Source**: \`${fileName}\` | **Pages**: ${totalPages} | **Format**: Indexed PDF\n`;
    structuredMarkdown += `> 🔗 **Vault Attachment**: [Open Original PDF Document](/api/vault/attachments/${encodeURIComponent(safeBaseName)})\n\n`;

    if (textResult.pages && textResult.pages.length > 0) {
      const pageSections: { pageNum: number; title: string; content: string }[] = [];

      for (const page of textResult.pages) {
        const pageText = (page.text || '').trim();
        if (!pageText) continue;

        const lines = pageText.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
        const chapterHeading = lines.find((l: string) => 
          /^(chapter|unit|part|section)\s+([0-9ivxlcdm]+|\w+)/i.test(l) ||
          /^[A-Z0-9\s:,-]{6,50}$/.test(l)
        );

        if (chapterHeading && chapterHeading.length < 70) {
          chaptersList.push({
            title: chapterHeading,
            page: page.num,
            summary: lines.slice(1, 4).join(' ').slice(0, 160)
          });
        }

        pageSections.push({
          pageNum: page.num,
          title: chapterHeading || `Section (Page ${page.num})`,
          content: pageText
        });
      }

      structuredMarkdown += `## Table of Contents & Extracted Chapters\n\n`;
      if (chaptersList.length > 0) {
        chaptersList.forEach((chap, idx) => {
          structuredMarkdown += `- **Chapter ${idx + 1}**: ${chap.title} *(Page ${chap.page})*\n`;
        });
      } else {
        structuredMarkdown += `- Complete Indexed Textbook Curriculum (${totalPages} Pages)\n`;
      }
      structuredMarkdown += `\n---\n\n`;

      // Append page / section bodies with automated [[Wikilinks]]
      for (const sec of pageSections) {
        let cleanContent = sec.content
          .replace(/([a-z])-\r?\n([a-z])/gi, '$1$2')
          .replace(/\r?\n\r?\n+/g, '\n\n');

        // Cross-link with existing notes
        for (const cl of crossLinks) {
          if (cleanContent.toLowerCase().includes(cl.title.toLowerCase()) && !cleanContent.includes(`[[${cl.slug}]]`)) {
            const regex = new RegExp(`\\b(${cl.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
            cleanContent = cleanContent.replace(regex, `[[${cl.slug}]]`);
          }
        }

        structuredMarkdown += `### ${sec.title}\n\n${cleanContent}\n\n`;
      }
    } else {
      structuredMarkdown += `## Extracted Content\n\n${fullRawText || 'Textbook indexed from PDF.'}\n\n`;
    }

    // Detect semantic domain tags
    const domainTags = [
      'deep-learning', 'neural-networks', 'transformers', 'algorithms', 
      'neuroscience', 'biology', 'philosophy', 'physics', 'mathematics', 
      'calculus', 'linear-algebra', 'systems', 'computer-science', 
      'cognition', 'data-structures', 'optimization'
    ];
    const detectedTags = ['textbook', 'pdf'];
    const lowerText = (fullRawText + ' ' + derivedTitle).toLowerCase();
    for (const dt of domainTags) {
      if (lowerText.includes(dt.replace('-', ' '))) {
        detectedTags.push(dt);
      }
    }

    // Save to target folder in vault
    const folder = targetFolder || 'Notes/Textbooks';
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const safeTitleForFilename = derivedTitle.replace(/[/\\?%*:|"<>]/g, '-').trim();
    const targetFilePath = path.join(cleanFolder, `${safeTitleForFilename}.md`).replace(/\\/g, '/');
    const targetDir = path.join(VAULT_DIR, cleanFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const now = new Date().toISOString();
    const frontmatter: Record<string, any> = {
      id: `textbook-${Date.now()}`,
      title: derivedTitle,
      type: 'note',
      isTextbook: true,
      pageCount: totalPages,
      pdfFileName: fileName,
      pdfUrl: `/api/vault/attachments/${encodeURIComponent(safeBaseName)}`,
      tags: detectedTags,
      createdAt: now,
      updatedAt: now,
    };

    const finalMarkdown = stringifyFrontmatter(frontmatter, structuredMarkdown);
    const fullFilePath = path.join(VAULT_DIR, targetFilePath);
    fs.writeFileSync(fullFilePath, finalMarkdown, 'utf-8');

    const wordCount = structuredMarkdown.trim().split(/\s+/).length;

    const savedNode = {
      ...frontmatter,
      content: structuredMarkdown,
      folder: cleanFolder,
      filePath: targetFilePath,
      wordCount,
    };

    res.json({ success: true, thought: savedNode });
  } catch (err: any) {
    console.error('Error uploading/parsing PDF:', err);
    res.status(500).json({ error: err.message || 'Failed to process PDF' });
  }
});

// Helper endpoint to seed a sample textbook for immediate testing
app.post('/api/vault/seed-sample-textbook', async (req, res) => {
  try {
    const { sampleType } = req.body; // 'ai' | 'neuroscience'

    const isNeuro = sampleType === 'neuroscience';
    const title = isNeuro 
      ? 'Principles of Cognitive Neuroscience & Brain Topologies'
      : 'Foundations of Deep Learning & Neural Computation';
    const fileName = isNeuro 
      ? 'Principles_of_Cognitive_Neuroscience.pdf' 
      : 'Foundations_of_Deep_Learning.pdf';

    const chapters = isNeuro ? [
      {
        title: 'Chapter 1: Neural Plasticity and Cortical Topologies',
        text: 'Neural plasticity represents the biological basis of learning and memory. Cortical maps exhibit dynamic reorganization in response to sensory experience. Synaptic transmission mediated by neurotransmitters forms the electrochemical foundation for emergent cognition and subjective experience.'
      },
      {
        title: 'Chapter 2: Hippocampal Navigation and Memory Consolidation',
        text: 'The hippocampus operates as a relational spatial mapping engine. Place cells and grid cells encode coordinate systems for physical and conceptual navigation. Long-term potentiation stabilizes synaptic connections during sleep stages.'
      },
      {
        title: 'Chapter 3: Prefrontal Metacognition and Executive Control',
        text: 'The prefrontal cortex coordinates higher-order executive functioning, error-monitoring, and intentional action planning. Top-down inhibitory signaling regulates emotional reactivity from amygdaloid circuits.'
      }
    ] : [
      {
        title: 'Chapter 1: Representation Learning in Latent Spaces',
        text: 'Deep neural networks learn hierarchical representations of high-dimensional data distributions. Through successive non-linear transformations, raw inputs are mapped into compact geometric manifolds where semantic concepts become linearly separable.'
      },
      {
        title: 'Chapter 2: Transformer Attention and Scaled Dot-Product Dynamics',
        text: 'Self-attention mechanisms calculate pairwise compatibility matrices across sequence tokens using Query, Key, and Value projections. Scaled dot-product dynamics allow parallel context integration across unbounded sequence lengths without recurrent inductive biases.'
      },
      {
        title: 'Chapter 3: Gradient Descent and Optimization Landscapes',
        text: 'Backpropagation computes exact gradient vectors via the multivariate calculus chain rule. Adaptive optimizers navigate non-convex loss surfaces, escaping saddle points through stochastic momentum and second-moment variance scaling.'
      }
    ];

    // Build valid PDF in memory
    let objects: string[] = [];
    let offsets: number[] = [];
    let body = '%PDF-1.4\n';

    function addObj(content: string): number {
      offsets.push(body.length);
      const objNum = objects.length + 1;
      objects.push(content);
      body += objNum + ' 0 obj\n' + content + '\nendobj\n';
      return objNum;
    }

    const contentObjNums: number[] = [];
    for (const chap of chapters) {
      const cleanContent = `${chap.title}. ${chap.text}`.replace(/[()\\\r\n]/g, ' ');
      const textStream = `BT /F1 12 Tf 50 700 Td (${cleanContent.slice(0, 200)}) Tj ET`;
      const streamObj = addObj(`<< /Length ${textStream.length} >>\nstream\n${textStream}\nendstream`);
      contentObjNums.push(streamObj);
    }

    const fontObj = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const pageObjNums: number[] = [];
    for (let i = 0; i < chapters.length; i++) {
      const pObj = addObj(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentObjNums[i]} 0 R >>`);
      pageObjNums.push(pObj);
    }

    const pagesList = pageObjNums.map(n => n + ' 0 R').join(' ');
    const pagesObj = addObj(`<< /Type /Pages /Kids [${pagesList}] /Count ${chapters.length} >>`);
    const catalogObj = addObj(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>`);

    const xrefOffset = body.length;
    body += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    for (const off of offsets) {
      body += String(off).padStart(10, '0') + ' 00000 n \n';
    }
    body += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root ' + catalogObj + ' 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';

    const pdfBase64 = Buffer.from(body, 'binary').toString('base64');

    // Call upload logic directly
    const uploadRes = await fetch(`http://127.0.0.1:${PORT}/api/vault/upload-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileBase64: pdfBase64,
        customTitle: title,
        targetFolder: 'Notes/Textbooks'
      })
    });
    const data = await uploadRes.json();
    res.json(data);
  } catch (err: any) {
    console.error('Error seeding sample textbook:', err);
    res.status(500).json({ error: err.message });
  }
});

// Gemini AI Spark endpoint for Mind Map brainstorming and planetary thought synthesis
app.post('/api/gemini/spark', async (req, res) => {
  try {
    const { prompt, mode = 'idea', category = 'auto', contextNode } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    let responsePayload: any = null;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({});
        const systemPrompt = `You are the creative mind behind "Mind Map & Knowledge Universe".
Your job is to synthesize celestial, profound, or actionable thoughts, journal entries, or goals for an Obsidian-compatible personal knowledge vault.
Respond ONLY with valid JSON (no markdown formatting, no code fences):
{
  "title": "Short punchy title (max 6 words)",
  "category": "note" | "diary" | "goal",
  "tags": ["tag1", "tag2", "tag3"],
  "content": "Rich markdown body with sections, concepts, and [[Wikilinks]] to potential connected concepts.",
  "branches": [
    {
      "title": "Sub-concept or connected thought title",
      "category": "note" | "diary" | "goal",
      "tags": ["tag1", "tag2"],
      "content": "Brief 1-2 paragraph description with [[Wikilinks]]."
    },
    {
      "title": "Second connected thought",
      "category": "note" | "diary" | "goal",
      "tags": ["tag1", "tag2"],
      "content": "Brief 1-2 paragraph description with [[Wikilinks]]."
    }
  ]
}`;

        const userPrompt = `Mode: ${mode}
Requested Category: ${category}
User Query/Topic: ${prompt || 'A profound cosmic insight connecting mind, universe, and technology'}
${contextNode ? `Context Node: Title="${contextNode.title}", Tags=${JSON.stringify(contextNode.tags)}, Content="${(contextNode.content || '').slice(0, 500)}"` : ''}`;

        const result = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            temperature: 0.8,
          }
        });

        const rawText = result.text || '';
        try {
          responsePayload = JSON.parse(rawText.trim());
        } catch (jsonErr) {
          const cleaned = rawText.replace(/```json\n?|```/g, '').trim();
          responsePayload = JSON.parse(cleaned);
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API call error, falling back to algorithmic synthesis:', geminiErr?.message);
      }
    }

    // Fallback if Gemini API not configured or error occurred
    if (!responsePayload) {
      const topic = (prompt || 'Cosmic Cognition & Emergent Knowledge').trim();
      const detectedCat = category === 'diary' ? 'diary' : (category === 'goal' ? 'goal' : 'note');
      const isGoal = detectedCat === 'goal';
      const isDiary = detectedCat === 'diary';

      responsePayload = {
        title: topic.slice(0, 40),
        category: detectedCat,
        tags: isGoal ? ['goals', 'milestone', 'focus'] : isDiary ? ['diary', 'reflection', 'clarity'] : ['physics', 'mind', 'ai'],
        content: `# ${topic}\n\n${
          isDiary
            ? `## Morning Reflection\nToday my attention centers on ${topic}. By cultivating presence and clarity, thoughts coalesce into orbit.\n\n- Key intention: Maintain focus amidst cognitive noise.\n- Cross-link: Connecting with [[Neural-Architecture-Cognitive-Topologies]].`
            : isGoal
            ? `## Objective Roadmap\nDefine the foundational architecture to achieve ${topic}.\n\n### Milestones\n1. [ ] Map out core deliverables and telemetry.\n2. [ ] Review convergence with existing [[Goals]].\n3. [ ] Finalize implementation review.`
            : `## Synthesized Concept\nExploration of ${topic} across interconnected semantic manifolds.\n\nWhen viewed through relational geometry, concepts cluster naturally like planets around a central gravitational star. Intersects with [[Quantum-Entanglement-Superposition]] and [[Stoic-Virtue-Epictetus-Control]].`
        }`,
        branches: [
          {
            title: `${topic}: Foundations`,
            category: detectedCat,
            tags: ['foundations', 'concepts'],
            content: `Core axiomatic principles supporting [[${topic.replace(/ /g, '-')}]] in the knowledge graph.`
          },
          {
            title: `${topic}: Future Horizons`,
            category: detectedCat,
            tags: ['exploration', 'future'],
            content: `Extending [[${topic.replace(/ /g, '-')}]] into adjacent celestial clusters.`
          }
        ]
      };
    }

    res.json({ success: true, spark: responsePayload });
  } catch (err: any) {
    console.error('Error generating spark:', err);
    res.status(500).json({ error: err.message || 'Failed to generate spark' });
  }
});

async function startServer() {
  ensureVaultSeed();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Knowledge Universe Vault running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
