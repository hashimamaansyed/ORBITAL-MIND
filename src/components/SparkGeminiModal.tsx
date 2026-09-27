import React, { useState } from 'react';
import { ThoughtNode, ThoughtType } from '../types';
import {
  Sparkles,
  Zap,
  Globe2,
  X,
  FileText,
  Calendar,
  Target,
  ArrowRight,
  GitBranch,
  Layers,
  CheckCircle2,
  Loader2
} from 'lucide-react';

interface SparkGeminiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveThought: (thoughtData: Partial<ThoughtNode>, spotlightIn3D?: boolean) => Promise<ThoughtNode | null>;
  contextThought?: ThoughtNode | null;
}

const INSPIRATION_PROMPTS = [
  'Quantum topology & neural manifolds',
  'Stoic resilience & emotional equanimity',
  'Transformer attention & emergent reasoning',
  'Hippocampal spatial mapping & memory consolidation',
  'Q4 physical endurance & marathon blueprint'
];

export const SparkGeminiModal: React.FC<SparkGeminiModalProps> = ({
  isOpen,
  onClose,
  onSaveThought,
  contextThought
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<'auto' | 'note' | 'diary' | 'goal'>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [sparkResult, setSparkResult] = useState<{
    title: string;
    category: ThoughtType;
    tags: string[];
    content: string;
    branches?: Array<{
      title: string;
      category: ThoughtType;
      tags: string[];
      content: string;
    }>;
  } | null>(null);
  const [spawnedCount, setSpawnedCount] = useState(0);

  if (!isOpen) return null;

  const handleGenerate = async (queryText?: string) => {
    const activeQuery = queryText || prompt;
    if (!activeQuery.trim() && !contextThought) return;

    setIsLoading(true);
    setSparkResult(null);
    setSpawnedCount(0);

    try {
      const res = await fetch('/api/gemini/spark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: activeQuery,
          mode: contextThought ? 'mindmap_branch' : 'idea',
          category,
          contextNode: contextThought
            ? {
                title: contextThought.title,
                content: contextThought.content,
                tags: contextThought.tags,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.spark) {
        setSparkResult(data.spark);
      }
    } catch (err) {
      console.error('Spark generation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpawnMain = async () => {
    if (!sparkResult) return;
    const cat = sparkResult.category || 'note';
    const folder = cat === 'diary' ? 'Diary' : cat === 'goal' ? 'Goals' : 'Notes/AI';

    const saved = await onSaveThought(
      {
        title: sparkResult.title,
        type: cat,
        tags: sparkResult.tags || ['ai', 'mindmap'],
        content: sparkResult.content,
        folder,
      },
      true
    );

    if (saved) {
      setSpawnedCount(prev => prev + 1);
      setTimeout(() => {
        onClose();
      }, 700);
    }
  };

  const handleSpawnAllBranches = async () => {
    if (!sparkResult) return;
    // Spawn main first
    await handleSpawnMain();

    // Spawn branches
    if (sparkResult.branches && sparkResult.branches.length > 0) {
      for (const branch of sparkResult.branches) {
        const cat = branch.category || 'note';
        const folder = cat === 'diary' ? 'Diary' : cat === 'goal' ? 'Goals' : 'Notes/AI';
        await onSaveThought(
          {
            title: branch.title,
            type: cat,
            tags: branch.tags || ['mindmap', 'branch'],
            content: branch.content,
            folder,
          },
          false
        );
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#030508] border-2 border-[#7c3aed] rounded-3xl p-6 sm:p-8 text-white shadow-[0_0_60px_rgba(124,58,237,0.45)] overflow-hidden max-h-[90vh] flex flex-col">
        {/* Glow ambient background accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#7c3aed]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#22d3ee]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between pb-4 mb-4 border-b border-[#7c3aed]/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#090a0f] border-2 border-[#7c3aed] flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.6)]">
              <Sparkles className="w-5 h-5 text-[#a855f7] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Syncopate',sans-serif] font-bold text-sm sm:text-base tracking-[0.16em] text-white">
                  MIND MAP SPARK
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-['Syncopate',sans-serif] font-bold bg-[#7c3aed]/30 border border-[#a855f7] text-[#e9d5ff]">
                  GEMINI 3.8 FLASH
                </span>
              </div>
              <p className="text-xs text-white/60 font-sans">
                {contextThought
                  ? `Expanding conceptual branches from "${contextThought.title}"`
                  : 'Synthesize planetary thoughts and connected mind map branches'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="relative z-10 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Prompt Input */}
          <div>
            <label className="block text-xs font-['Syncopate',sans-serif] font-bold tracking-wider text-white/80 mb-1.5 uppercase">
              Topic or Brainstorm Catalyst
            </label>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder={
                  contextThought
                    ? `Explore related ideas to ${contextThought.title}...`
                    : 'e.g. Quantum decoherence and human consciousness...'
                }
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isLoading) {
                    handleGenerate();
                  }
                }}
                className="w-full bg-[#090a0f] border border-[#7c3aed]/60 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] transition-all font-sans"
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={isLoading || (!prompt.trim() && !contextThought)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-lg bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white font-['Syncopate',sans-serif] font-bold text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(124,58,237,0.5)] cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>SPARKING...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>SPARK</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Concept Inspirations */}
          {!sparkResult && (
            <div>
              <span className="text-[10px] font-mono text-white/50 block mb-1.5">
                Quick Inspirations:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {INSPIRATION_PROMPTS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(p);
                      handleGenerate(p);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#7c3aed]/30 border border-white/10 hover:border-[#a855f7] text-white/80 transition-all font-sans"
                  >
                    ✨ {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-['Syncopate',sans-serif] font-bold text-white/60 tracking-wider">
              TYPE:
            </span>
            <div className="flex gap-1.5">
              {[
                { key: 'auto', label: 'Auto Detect' },
                { key: 'note', label: 'Notes (Violet)' },
                { key: 'diary', label: 'Diary (Amber)' },
                { key: 'goal', label: 'Goals (Cyan)' },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-['Syncopate',sans-serif] font-bold transition-all ${
                    category === item.key
                      ? 'bg-[#7c3aed] text-white border border-[#a855f7] shadow-sm'
                      : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spark Result Presentation */}
          {sparkResult && (
            <div className="mt-4 p-4 rounded-2xl bg-[#090a0f] border border-[#7c3aed] space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        sparkResult.category === 'diary'
                          ? 'bg-[#fbbf24]'
                          : sparkResult.category === 'goal'
                          ? 'bg-[#22d3ee]'
                          : 'bg-[#c084fc]'
                      }`}
                    />
                    <h3 className="font-['Syncopate',sans-serif] font-bold text-sm text-white tracking-wide">
                      {sparkResult.title}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {sparkResult.tags?.map((t, i) => (
                      <span
                        key={i}
                        className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 font-mono text-[#c084fc]"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSpawnMain}
                  className="px-3 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-['Syncopate',sans-serif] font-bold text-[10px] tracking-wider transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(124,58,237,0.6)] cursor-pointer shrink-0"
                >
                  <Globe2 className="w-3.5 h-3.5" />
                  <span>SPAWN PLANET</span>
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto p-3 rounded-xl bg-black/50 text-xs text-white/80 font-mono whitespace-pre-wrap border border-white/10">
                {sparkResult.content}
              </div>

              {/* Connected Sub-branches */}
              {sparkResult.branches && sparkResult.branches.length > 0 && (
                <div className="pt-2 border-t border-[#7c3aed]/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-['Syncopate',sans-serif] font-bold text-white/80 tracking-wider flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-[#22d3ee]" />
                      CONNECTED MIND MAP BRANCHES ({sparkResult.branches.length})
                    </span>
                    <button
                      onClick={handleSpawnAllBranches}
                      className="text-[9px] font-['Syncopate',sans-serif] font-bold text-[#22d3ee] hover:underline flex items-center gap-1"
                    >
                      <Layers className="w-3 h-3" />
                      Spawn All Branches
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sparkResult.branches.map((b, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between"
                      >
                        <div>
                          <div className="font-['Syncopate',sans-serif] font-bold text-[10px] text-white">
                            {b.title}
                          </div>
                          <p className="text-[10px] text-white/60 font-sans line-clamp-2 mt-1">
                            {b.content}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                          <span className="text-[9px] font-mono text-cyan-400">
                            #{b.tags?.[0] || 'branch'}
                          </span>
                          <button
                            onClick={async () => {
                              const folder =
                                b.category === 'diary'
                                  ? 'Diary'
                                  : b.category === 'goal'
                                  ? 'Goals'
                                  : 'Notes/AI';
                              await onSaveThought(
                                {
                                  title: b.title,
                                  type: b.category || 'note',
                                  tags: b.tags || ['mindmap', 'branch'],
                                  content: b.content,
                                  folder,
                                },
                                true
                              );
                            }}
                            className="text-[9px] font-['Syncopate',sans-serif] font-bold text-[#a855f7] hover:text-white transition-colors"
                          >
                            + Spawn
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-4 mt-3 border-t border-[#7c3aed]/30 flex items-center justify-between text-xs">
          <span className="text-white/40 text-[10px] font-mono">
            Powered by Google Gemini 3.8 Flash • Automatic Embedding Clustered
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-['Syncopate',sans-serif] font-bold text-[10px] tracking-wider transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
