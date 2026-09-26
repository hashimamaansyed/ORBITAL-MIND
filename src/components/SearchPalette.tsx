import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ThoughtNode, ThoughtType } from '../types';
import { generateLocalEmbedding, cosineSimilarity } from '../services/embedding';
import { THOUGHT_COLORS } from './Universe3D';
import {
  Search,
  Sparkles,
  ExternalLink,
  Compass,
  FileText,
  Calendar,
  Target,
  ArrowRight,
  Command,
  X
} from 'lucide-react';

interface SearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  thoughts: ThoughtNode[];
  onSelectThought: (thought: ThoughtNode, action: 'spotlight' | 'open') => void;
}

export const SearchPalette: React.FC<SearchPaletteProps> = ({
  isOpen,
  onClose,
  thoughts,
  onSelectThought
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | ThoughtType | 'textbook'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Compute search results with both semantic similarity and keyword scores
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filterFn = (t: ThoughtNode) => {
      if (filterType === 'all') return true;
      if (filterType === 'textbook') return t.isTextbook;
      return t.type === filterType;
    };

    if (!q) {
      // Return recent thoughts when query is empty
      const filtered = thoughts.filter(filterFn);
      return filtered.slice(0, 8).map(t => ({
        thought: t,
        semanticScore: 0,
        keywordScore: 0,
        totalScore: 0,
        matchSnippet: t.content.slice(0, 140)
      }));
    }

    // Query embedding
    const queryVector = generateLocalEmbedding({
      title: q,
      content: q,
      tags: [q]
    });

    const scored = thoughts
      .filter(filterFn)
      .map(thought => {
        // 1. Semantic score
        const thoughtVector = thought.embedding || generateLocalEmbedding(thought);
        const sim = cosineSimilarity(queryVector, thoughtVector);

        // 2. Keyword score
        let keywordScore = 0;
        const titleLower = thought.title.toLowerCase();
        const contentLower = thought.content.toLowerCase();
        const tagsLower = thought.tags.map(t => t.toLowerCase());

        if (titleLower === q) keywordScore += 2.0;
        else if (titleLower.includes(q)) keywordScore += 1.2;

        if (tagsLower.includes(q)) keywordScore += 1.0;
        else if (tagsLower.some(t => t.includes(q))) keywordScore += 0.6;

        if (contentLower.includes(q)) keywordScore += 0.8;

        const totalScore = sim * 0.65 + keywordScore * 0.35;

        // Find relevant snippet around matched keyword
        let snippet = thought.content.slice(0, 160);
        const kwIndex = contentLower.indexOf(q);
        if (kwIndex !== -1) {
          const start = Math.max(0, kwIndex - 40);
          const end = Math.min(thought.content.length, kwIndex + q.length + 80);
          snippet = (start > 0 ? '...' : '') + thought.content.slice(start, end) + (end < thought.content.length ? '...' : '');
        }

        return {
          thought,
          semanticScore: sim,
          keywordScore,
          totalScore,
          matchSnippet: snippet
        };
      });

    // Filter to relevant and sort descending
    return scored
      .filter(r => r.totalScore > 0.25 || r.keywordScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 12);
  }, [query, filterType, thoughts]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectThought(results[selectedIndex].thought, 'spotlight');
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="search-palette-overlay"
      className="fixed inset-0 z-50 bg-[#030508]/85 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl frosted-glass-panel neon-border-trail rounded-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1e2638] bg-[#0b0e14]">
          <Search className="w-5 h-5 text-[#22d3ee] shrink-0" />
          <input
            ref={inputRef}
            id="cmd-k-input"
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search concepts, wikilinks, tags, or daily logs..."
            className="w-full bg-transparent text-sm sm:text-base text-[#f1f5f9] placeholder:text-[#64748b] focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#64748b] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-[#64748b] bg-[#131722] px-2 py-0.5 rounded border border-[#1e2638]">
            ESC
          </kbd>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e2638] bg-[#0b0e14] text-xs">
          <span className="text-[#64748b] font-medium">Filter:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              filterType === 'all'
                ? 'bg-[#1e2638] text-white font-medium border border-[#64748b]/50'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('note')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              filterType === 'note'
                ? 'bg-[#1e2638] text-white font-medium border border-[#c084fc]/50'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#c084fc] shadow-sm shadow-[#9333ea]" />
            Notes
          </button>
          <button
            onClick={() => setFilterType('textbook')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              filterType === 'textbook'
                ? 'bg-[#1e2638] text-white font-medium border border-[#38bdf8]/50'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-sm shadow-[#0284c7]" />
            Textbooks (PDF)
          </button>
          <button
            onClick={() => setFilterType('diary')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              filterType === 'diary'
                ? 'bg-[#1e2638] text-white font-medium border border-[#fbbf24]/50'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#fbbf24] shadow-sm shadow-[#d97706]" />
            Diary
          </button>
          <button
            onClick={() => setFilterType('goal')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-all ${
              filterType === 'goal'
                ? 'bg-[#1e2638] text-white font-medium border border-[#22d3ee]/50'
                : 'text-[#64748b] hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#22d3ee] shadow-sm shadow-[#0891b2]" />
            Goals
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-[#1e2638]/40 flex-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-[#64748b] text-sm font-mono">
              No matching thoughts found for "{query}".
            </div>
          ) : (
            results.map((item, index) => {
              const { thought, semanticScore } = item;
              const isSelected = index === selectedIndex;
              const hexColor = thought.isTextbook ? '#38bdf8' : (THOUGHT_COLORS[thought.type]?.hex || '#c084fc');

              return (
                <div
                  key={thought.id}
                  onClick={() => {
                    onSelectThought(thought, 'spotlight');
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#131722] border border-[#1e2638] shadow-md'
                      : 'hover:bg-[#131722]/60'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 mt-1 shadow-sm"
                      style={{ backgroundColor: hexColor }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-[#f1f5f9] text-sm truncate">
                          {thought.isTextbook ? `📚 ${thought.title}` : thought.title}
                        </h4>
                        <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                          thought.isTextbook
                            ? 'bg-[#0284c7]/20 text-[#38bdf8] border-[#0284c7]/40'
                            : 'bg-[#0b0e14] text-[#94a3b8] border-[#1e2638]'
                        }`}>
                          {thought.isTextbook ? `PDF (${thought.pageCount || 1}p)` : thought.type}
                        </span>
                      </div>

                      <p className="text-xs text-[#94a3b8] line-clamp-1 mt-1 font-mono">
                        {item.matchSnippet}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#64748b] font-mono">
                        <span>📁 {thought.filePath}</span>
                        {thought.tags.length > 0 && (
                          <span>• #{thought.tags.slice(0, 2).join(', #')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Similarity Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {query && semanticScore > 0.4 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0b0e14] text-[#22d3ee] border border-[#22d3ee]/40 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-[#22d3ee]" />
                        {Math.round(semanticScore * 100)}% match
                      </span>
                    )}

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectThought(thought, 'spotlight');
                        onClose();
                      }}
                      title="Spotlight in 3D Mind Map"
                      className="px-2.5 py-1 text-xs rounded-lg bg-[#0b0e14] hover:bg-[#1e2638] text-[#cbd5e1] hover:text-white border border-[#1e2638] flex items-center gap-1 transition-colors"
                    >
                      <Compass className="w-3 h-3 text-[#22d3ee]" />
                      <span className="hidden sm:inline">Spotlight</span>
                    </button>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectThought(thought, 'open');
                        onClose();
                      }}
                      title="Open in Workspace"
                      className="p-1 text-[#64748b] hover:text-white rounded-lg hover:bg-[#1e2638]"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#0b0e14] border-t border-[#1e2638] flex items-center justify-between text-[11px] text-[#64748b] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select & Spotlight</span>
          </div>
          <span>Semantic + Keyword Vault Search</span>
        </div>
      </div>
    </div>
  );
};
