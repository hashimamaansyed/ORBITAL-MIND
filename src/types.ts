export type ThoughtType = 'note' | 'diary' | 'goal';

export type GoalStatus = 'pending' | 'in-progress' | 'completed';
export type GoalPriority = 'low' | 'medium' | 'high';

export interface ThoughtNode {
  id: string;
  title: string;
  type: ThoughtType;
  content: string;
  folder: string; // e.g., 'Notes/AI', 'Diary', 'Goals'
  filePath: string; // relative to vault root, e.g., 'Notes/AI/Transformers.md'
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Diary specific
  mood?: string;
  // Goal specific
  targetDate?: string;
  goalStatus?: GoalStatus;
  goalPriority?: GoalPriority;
  progress?: number; // 0 to 100
  // Textbook & PDF specific
  isTextbook?: boolean;
  pageCount?: number;
  pdfFileName?: string;
  pdfUrl?: string;
  chapters?: { title: string; page?: number; summary?: string }[];
  // Computed 3D & embedding
  position?: [number, number, number];
  embedding?: number[];
  wordCount?: number;
  // Tag-based Orbital Shells & Semantic Gravity
  orbitalTag?: string;
  orbitalRadius?: number;
  orbitalAngle?: number;
  orbitalSpeed?: number;
  yElevation?: number;
  isDimmed?: boolean;
}

export interface TagOrbitalShell {
  tag: string;
  label: string;
  radius: number;
  color: string;
  nodeCount: number;
}

export interface ConnectionEdge {
  id: string;
  sourceId: string;
  targetId: string;
  similarity: number; // 0.0 to 1.0
  sourcePos: [number, number, number];
  targetPos: [number, number, number];
}

export interface VaultFileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  type?: ThoughtType;
  children?: VaultFileItem[];
}

export type WorkspaceTab = 'universe' | 'writing' | 'diary' | 'goals';

export interface SearchResult {
  thought: ThoughtNode;
  score: number;
  matchType: 'semantic' | 'keyword' | 'both';
  snippet: string;
}
