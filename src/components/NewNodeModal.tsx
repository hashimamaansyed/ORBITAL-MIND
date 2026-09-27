import React, { useState, useEffect } from 'react';
import { ThoughtNode, ThoughtType } from '../types';
import {
  Sparkles,
  Globe2,
  X,
  BookOpen,
  FileText,
  Calendar,
  Target,
  Orbit,
} from 'lucide-react';

export type NodeCategory = 'Notes' | 'Diary' | 'Goals' | 'Books';

interface NewNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (thoughtData: Partial<ThoughtNode>, spotlightIn3D?: boolean) => Promise<ThoughtNode | null>;
}

const CATEGORIES: {
  key: NodeCategory;
  label: string;
  type: ThoughtType;
  isTextbook: boolean;
  folder: string;
  colorHex: string;
  glowHex: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'Notes',
    label: 'Notes',
    type: 'note',
    isTextbook: false,
    folder: 'Notes',
    colorHex: '#c084fc',
    glowHex: '#9333ea',
    icon: <FileText className="w-3.5 h-3.5 text-[#c084fc]" />,
  },
  {
    key: 'Diary',
    label: 'Diary',
    type: 'diary',
    isTextbook: false,
    folder: 'Diary',
    colorHex: '#fbbf24',
    glowHex: '#d97706',
    icon: <Calendar className="w-3.5 h-3.5 text-[#fbbf24]" />,
  },
  {
    key: 'Goals',
    label: 'Goals',
    type: 'goal',
    isTextbook: false,
    folder: 'Goals',
    colorHex: '#22d3ee',
    glowHex: '#0891b2',
    icon: <Target className="w-3.5 h-3.5 text-[#22d3ee]" />,
  },
  {
    key: 'Books',
    label: 'Books',
    type: 'note',
    isTextbook: true,
    folder: 'Notes/Books',
    colorHex: '#38bdf8',
    glowHex: '#0284c7',
    icon: <BookOpen className="w-3.5 h-3.5 text-[#38bdf8]" />,
  },
];

const SUGGESTED_TAGS = [
  '#physics',
  '#quantum',
  '#space',
  '#philosophy',
  '#ethics',
  '#mind',
  '#code',
  '#graphics',
  '#ai',
];

export const NewNodeModal: React.FC<NewNodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<NodeCategory>('Notes');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSparking, setIsSparking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSparkWithGemini = async () => {
    try {
      setIsSparking(true);
      const catKey = category === 'Diary' ? 'diary' : (category === 'Goals' ? 'goal' : 'note');
      const res = await fetch('/api/gemini/spark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: title.trim() || 'A breakthrough cosmic insight in science and consciousness',
          category: catKey,
          mode: 'idea'
        })
      });
      const data = await res.json();
      if (data.spark) {
        if (!title.trim() || data.spark.title) {
          setTitle(data.spark.title);
        }
        if (data.spark.tags && data.spark.tags.length > 0) {
          setTags(data.spark.tags.map((t: string) => `#${t.replace(/^#/, '')}`).join(', '));
        }
        if (data.spark.content) {
          setContent(data.spark.content);
        }
      }
    } catch (err) {
      console.warn('Spark auto-fill error:', err);
    } finally {
      setIsSparking(false);
    }
  };

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCategoryConfig = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];

  const handleSelectTagChip = (tag: string) => {
    const rawTag = tag.trim();
    const currentTags = tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (currentTags.includes(rawTag)) {
      setTags(currentTags.filter(t => t !== rawTag).join(', '));
    } else {
      setTags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${rawTag}` : rawTag);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter a title for the planetary node.');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      // Clean tags: preserve or ensure '#' prefixes for display, but clean list for embeddings
      const tagList = tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => (t.startsWith('#') ? t : `#${t}`));

      // Determine default markdown body if none provided
      const defaultBody = content.trim()
        ? content.trim()
        : `# ${title.trim()}\n\n*Captured in the Alien Solar System Knowledge Vault*\n\nTags: ${tagList.join(' ')}\n\nCan link associatively with other thoughts via [[Wikilinks]].`;

      await onSave(
        {
          title: title.trim(),
          type: currentCategoryConfig.type,
          isTextbook: currentCategoryConfig.isTextbook,
          folder: currentCategoryConfig.folder,
          tags: tagList,
          content: defaultBody,
        },
        true // spotlight in 3D universe
      );

      // Reset form and close
      setTitle('');
      setCategory('Notes');
      setTags('');
      setContent('');
      onClose();
    } catch (err: any) {
      console.error('Failed to spawn planet:', err);
      setErrorMessage(err.message || 'Failed to spawn planet in universe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="new-node-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#030508]/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* High-Contrast Obsidian & Electric Purple Modal Card */}
      <div
        id="new-node-modal-container"
        className="w-full max-w-xl bg-[#030508] border-2 border-[#7c3aed] rounded-2xl p-6 shadow-[0_0_40px_rgba(124,58,237,0.45)] text-white relative animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#7c3aed]/40 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#090a0f] border-2 border-[#7c3aed] flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.5)]">
              <Orbit className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="font-astral font-bold text-sm sm:text-base text-white tracking-[0.18em] flex items-center gap-2">
                <span>NEW NODE</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/30 border border-[#7c3aed] text-[#e9d5ff] font-mono">
                  ORBITAL INGESTION
                </span>
              </h2>
              <p className="font-astral text-[9px] text-[#a855f7] tracking-[0.2em] font-semibold mt-0.5">
                ASTRO-SEMANTIC PLANET CREATION
              </p>
            </div>
          </div>

          <button
            id="close-new-node-modal"
            type="button"
            onClick={onClose}
            aria-label="Close Modal"
            className="w-8 h-8 rounded-lg bg-[#090a0f] border border-[#7c3aed]/50 hover:border-[#7c3aed] text-gray-400 hover:text-white flex items-center justify-center transition-all hover:bg-[#7c3aed]/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 px-3.5 py-2 rounded-xl bg-red-950/60 border border-red-500/60 text-red-200 text-xs font-mono">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Field 1: Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="node-title-input"
                className="font-astral font-bold text-[10px] text-[#e9d5ff] tracking-[0.16em]"
              >
                TITLE <span className="text-[#a855f7]">*</span>
              </label>
              <button
                type="button"
                disabled={isSparking}
                onClick={handleSparkWithGemini}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#7c3aed]/20 hover:bg-[#7c3aed]/40 border border-[#7c3aed]/40 text-[#c084fc] hover:text-white transition-all text-[10px] font-astral cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3 text-[#c084fc] animate-pulse" />
                <span>{isSparking ? 'SPARKING...' : '✨ SPARK WITH GEMINI'}</span>
              </button>
            </div>
            <input
              id="node-title-input"
              type="text"
              required
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Quantum Entanglement & Superposition"
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#7c3aed]/50 hover:border-[#7c3aed] focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] rounded-xl text-white placeholder-gray-500 text-sm font-sans transition-all outline-none"
            />
          </div>

          {/* Field 2: Category (Dropdown / Pills: Notes, Diary, Goals, Books) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="node-category-select"
                className="font-astral font-bold text-[10px] text-[#e9d5ff] tracking-[0.16em]"
              >
                CATEGORY
              </label>
              {/* Optional Category Select Dropdown */}
              <select
                id="node-category-select"
                value={category}
                onChange={e => setCategory(e.target.value as NodeCategory)}
                className="bg-[#090a0f] border border-[#7c3aed]/50 rounded-lg text-xs font-astral px-2 py-1 text-white focus:outline-none focus:border-[#7c3aed]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.key} value={cat.key}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => {
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    className={`py-2 px-3 rounded-xl border text-xs font-astral font-bold tracking-[0.12em] flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? 'bg-[#090a0f] text-white border-2'
                        : 'bg-[#090a0f]/60 border-[#7c3aed]/30 text-gray-400 hover:text-white hover:border-[#7c3aed]/70'
                    }`}
                    style={{
                      borderColor: isSelected ? cat.colorHex : undefined,
                      boxShadow: isSelected ? `0 0 16px ${cat.colorHex}55` : undefined,
                    }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: cat.colorHex,
                        boxShadow: `0 0 8px ${cat.colorHex}`,
                      }}
                    />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 3: Tags (Comma-separated text input) */}
          <div>
            <label
              htmlFor="node-tags-input"
              className="block font-astral font-bold text-[10px] text-[#e9d5ff] tracking-[0.16em] mb-1.5"
            >
              TAGS (COMMA-SEPARATED)
            </label>
            <input
              id="node-tags-input"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="#physics, #quantum"
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#7c3aed]/50 hover:border-[#7c3aed] focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] rounded-xl text-white placeholder-gray-500 text-sm font-sans transition-all outline-none"
            />

            {/* Quick Tag Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-gray-400 font-mono mr-1">Suggested:</span>
              {SUGGESTED_TAGS.map(tagChip => {
                const isActive = tags.toLowerCase().includes(tagChip.toLowerCase());
                return (
                  <button
                    key={tagChip}
                    type="button"
                    onClick={() => handleSelectTagChip(tagChip)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all border ${
                      isActive
                        ? 'bg-[#7c3aed] text-white border-[#a855f7] shadow-[0_0_8px_rgba(124,58,237,0.5)]'
                        : 'bg-[#090a0f] text-gray-300 border-[#7c3aed]/40 hover:border-[#7c3aed] hover:text-white'
                    }`}
                  >
                    {tagChip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 4: Content / Excerpt (Textarea) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="node-content-input"
                className="font-astral font-bold text-[10px] text-[#e9d5ff] tracking-[0.16em]"
              >
                CONTENT / EXCERPT
              </label>
              <span className="text-[10px] font-mono text-gray-400">
                Supports [[Wikilinks]]
              </span>
            </div>
            <textarea
              id="node-content-input"
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Synthesize planetary concepts, insights, or observations... Link nodes with [[Note Title]]."
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-[#7c3aed]/50 hover:border-[#7c3aed] focus:border-[#a855f7] focus:ring-1 focus:ring-[#a855f7] rounded-xl text-white placeholder-gray-500 text-sm font-mono leading-relaxed transition-all outline-none resize-none"
            />
          </div>

          {/* Modal Footer Controls: Primary "SPAWN PLANET" & Cancel */}
          <div className="flex items-center justify-between pt-4 border-t border-[#7c3aed]/40 mt-5">
            <span className="text-[10px] text-[#a855f7] font-mono hidden sm:inline">
              ✦ Saves persistently to /vault
            </span>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                id="cancel-new-node-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#090a0f] hover:bg-[#131722] text-gray-300 hover:text-white border border-[#7c3aed]/50 font-astral font-bold text-xs tracking-[0.14em] transition-all"
              >
                CANCEL
              </button>

              <button
                id="spawn-planet-btn"
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-50 text-white font-astral font-bold text-xs tracking-[0.18em] flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.6)] hover:shadow-[0_0_28px_rgba(124,58,237,0.85)] border border-[#a855f7] active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Globe2 className="w-4 h-4 text-white" />
                )}
                <span>SPAWN PLANET</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
