import React, { useState } from 'react';
import { ThoughtNode, ThoughtType } from '../types';
import { THOUGHT_COLORS } from './Universe3D';
import {
  Sparkles,
  Save,
  Compass,
  FileText,
  Calendar,
  Target,
  X
} from 'lucide-react';

interface QuickThoughtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (thoughtData: Partial<ThoughtNode>, spotlightIn3D?: boolean) => Promise<ThoughtNode | null>;
}

export const QuickThoughtModal: React.FC<QuickThoughtModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [type, setType] = useState<ThoughtType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('Notes');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleTypeChange = (newType: ThoughtType) => {
    setType(newType);
    if (newType === 'diary') setFolder('Diary');
    else if (newType === 'goal') setFolder('Goals');
    else setFolder('Notes');
  };

  const handleSubmit = async (spotlight: boolean = true) => {
    if (!title.trim()) return;
    setIsSaving(true);

    const tagList = tags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    await onSave(
      {
        title,
        type,
        content: content || `# ${title}\n\nCaptured via quick thought entry.\n\nCan link with [[Other Notes]].`,
        folder,
        tags: tagList,
      },
      spotlight
    );

    setIsSaving(false);
    onClose();
    // Reset fields
    setTitle('');
    setContent('');
    setTags('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#030508]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg cyber-panel rounded-2xl p-5 glow-box-violet animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2638] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-base text-[#c084fc]">✦</span>
            <h3 className="font-bold text-base text-white tracking-wide">Capture Quick Thought</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white p-1 rounded-lg hover:bg-[#131722] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Archetype Selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleTypeChange('note')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              type === 'note'
                ? 'bg-[#1e2638] border-[#c084fc] text-white shadow-sm shadow-[#9333ea]/30'
                : 'bg-[#0b0e14] border-[#1e2638] text-[#64748b] hover:text-white hover:bg-[#131722]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#c084fc] shadow-sm shadow-[#9333ea] shrink-0" />
            <span>Note</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('diary')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              type === 'diary'
                ? 'bg-[#1e2638] border-[#fbbf24] text-white shadow-sm shadow-[#d97706]/30'
                : 'bg-[#0b0e14] border-[#1e2638] text-[#64748b] hover:text-white hover:bg-[#131722]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] shadow-sm shadow-[#d97706] shrink-0" />
            <span>Diary</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeChange('goal')}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              type === 'goal'
                ? 'bg-[#1e2638] border-[#22d3ee] text-white shadow-sm shadow-[#0891b2]/30'
                : 'bg-[#0b0e14] border-[#1e2638] text-[#64748b] hover:text-white hover:bg-[#131722]'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#22d3ee] shadow-sm shadow-[#0891b2] shrink-0" />
            <span>Goal</span>
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[#64748b] font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={type === 'diary' ? 'Today Reflection: ...' : type === 'goal' ? 'Achieve: ...' : 'Concept / Note Title...'}
              className="w-full px-3 py-2 bg-[#0b0e14] border border-[#1e2638] rounded-lg text-[#f1f5f9] text-sm focus:outline-none focus:border-[#c084fc] font-sans transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#64748b] font-medium mb-1">Vault Folder</label>
              <input
                type="text"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="Folder Path"
                className="w-full px-3 py-1.5 bg-[#0b0e14] border border-[#1e2638] rounded-lg text-[#cbd5e1] font-mono text-xs focus:outline-none focus:border-[#1e2638]"
              />
            </div>
            <div>
              <label className="block text-[#64748b] font-medium mb-1">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="e.g. ai, neurotech"
                className="w-full px-3 py-1.5 bg-[#0b0e14] border border-[#1e2638] rounded-lg text-[#cbd5e1] text-xs focus:outline-none focus:border-[#1e2638]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#64748b] font-medium mb-1">Markdown Body (Supports [[Wikilinks]])</label>
            <textarea
              rows={4}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Jot down your thought, insights, and connect with [[Other Notes]]..."
              className="w-full px-3 py-2 bg-[#0b0e14] border border-[#1e2638] rounded-lg text-[#cbd5e1] font-mono text-xs focus:outline-none focus:border-[#1e2638] leading-relaxed"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#1e2638]">
          <span className="text-[11px] text-[#64748b] font-mono">
            Saves directly to /vault disk
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSaving || !title.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#0b0e14] hover:bg-[#1e2638] text-[#94a3b8] hover:text-white border border-[#1e2638] text-xs font-medium disabled:opacity-50 transition-colors"
            >
              Save Only
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSaving || !title.trim()}
              className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-black" />
              <span>Save & Spotlight</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
