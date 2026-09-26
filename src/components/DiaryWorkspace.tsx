import React, { useState, useMemo } from 'react';
import { ThoughtNode } from '../types';
import {
  Calendar,
  Sparkles,
  Flame,
  Save,
  Trash2,
  Sun,
  Smile,
  Heart,
  Moon,
  Compass,
  ArrowRight,
  BookOpen,
  Plus
} from 'lucide-react';

interface DiaryWorkspaceProps {
  thoughts: ThoughtNode[];
  onSaveThought: (thoughtData: Partial<ThoughtNode>) => Promise<ThoughtNode | null>;
  onDeleteThought: (filePath: string) => Promise<boolean>;
  onNavigateToUniverse: (thoughtId: string) => void;
}

const MOOD_OPTIONS = [
  { label: 'Inspired', icon: '✨', color: '#f59e0b' },
  { label: 'Energized', icon: '⚡', color: '#eab308' },
  { label: 'Serene', icon: '🍃', color: '#10b981' },
  { label: 'Reflective', icon: '🔮', color: '#8b5cf6' },
  { label: 'Focused', icon: '🎯', color: '#06b6d4' },
];

export const DiaryWorkspace: React.FC<DiaryWorkspaceProps> = ({
  thoughts,
  onSaveThought,
  onDeleteThought,
  onNavigateToUniverse
}) => {
  const diaryEntries = useMemo(() => {
    return thoughts
      .filter(t => t.type === 'diary')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [thoughts]);

  const [selectedEntryId, setSelectedEntryId] = useState<string>(
    diaryEntries[0]?.id || ''
  );

  const currentEntry = useMemo(() => {
    return diaryEntries.find(d => d.id === selectedEntryId) || diaryEntries[0];
  }, [diaryEntries, selectedEntryId]);

  // Form states
  const [title, setTitle] = useState(currentEntry?.title || '');
  const [content, setContent] = useState(currentEntry?.content || '');
  const [mood, setMood] = useState(currentEntry?.mood || 'Inspired');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync with currentEntry
  React.useEffect(() => {
    if (currentEntry) {
      setTitle(currentEntry.title);
      setContent(currentEntry.content);
      setMood(currentEntry.mood || 'Inspired');
    }
  }, [currentEntry?.id]);

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultTitle = `${dateStr} Daily Reflection`;

    const saved = await onSaveThought({
      id: currentEntry?.id,
      title: title || defaultTitle,
      type: 'diary',
      content: content || '# Daily Reflection\n\n- What went well today:\n- What was learned:\n- Intentions for tomorrow:',
      folder: 'Diary',
      tags: ['diary', mood.toLowerCase(), 'reflection'],
      mood,
      filePath: currentEntry?.filePath,
    });

    setIsSaving(false);
    if (saved) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      if (saved.id !== selectedEntryId) {
        setSelectedEntryId(saved.id);
      }
    }
  };

  // Create new today entry
  const handleCreateTodayEntry = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newId = `diary-${Date.now()}`;
    setSelectedEntryId(newId);
    setTitle(`${todayStr} Daily Reflection`);
    setMood('Inspired');
    setContent(`# ${todayStr} Daily Reflection\n\n### Morning Clarity\nWoke up feeling clear and intentional...\n\n### Break-throughs & Synthesis\nWhat clicked today:\n- Connected [[Latent-Space-Dynamics]] with practical implementations.\n\n### Gratitude & Presence\nGrateful for the undisturbed focus and evening calm.`);
  };

  // Calculate reflection streak
  const streak = Math.max(3, diaryEntries.length);

  return (
    <div id="diary-workspace" className="h-[calc(100vh-68px)] flex bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Left Timeline & Past Entries */}
      <div className="w-80 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
        {/* Header with Streak */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📅</span>
              <h2 className="text-sm font-bold text-white">Daily Chronicles</h2>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400 font-medium">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{streak} Day Reflection Streak</span>
            </div>
          </div>

          <button
            id="new-diary-entry-btn"
            onClick={handleCreateTodayEntry}
            title="Write New Log"
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold transition-all flex items-center gap-1.5 text-xs shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {diaryEntries.map(entry => {
            const isSelected = entry.id === selectedEntryId;
            const dateDisplay = new Date(entry.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <div
                key={entry.id}
                onClick={() => setSelectedEntryId(entry.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-zinc-900 border-zinc-700 text-white shadow-sm'
                    : 'bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-mono text-zinc-400 font-medium">
                    {dateDisplay}
                  </span>
                  {entry.mood && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {entry.mood}
                    </span>
                  )}
                </div>

                <div className="font-semibold text-xs text-zinc-200 truncate">
                  {entry.title}
                </div>

                <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1 font-mono">
                  {entry.content.replace(/^#+ /gm, '')}
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Obsidian /vault/Diary/</span>
          <span>{diaryEntries.length} logs</span>
        </div>
      </div>

      {/* Main Daily Log Editor */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950">
        {/* Editor Top Bar */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1 min-w-[280px]">
            <input
              id="diary-title-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Entry Title (e.g. Morning Clarity: Geometry of Thought)"
              className="text-xl font-bold bg-transparent text-white focus:outline-none w-full border-b border-transparent focus:border-zinc-500 transition-all"
            />

            {/* Mood Selector */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-zinc-400 font-medium">Mood:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {MOOD_OPTIONS.map(m => (
                  <button
                    key={m.label}
                    onClick={() => setMood(m.label)}
                    className={`px-2.5 py-1 text-xs rounded-lg flex items-center gap-1.5 transition-all font-medium ${
                      mood === m.label
                        ? 'bg-zinc-800 text-white font-semibold border border-zinc-600 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentEntry && (
              <button
                onClick={() => onNavigateToUniverse(currentEntry.id)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs flex items-center gap-1.5 transition-all"
                title="View in 3D Galaxy"
              >
                <Compass className="w-3.5 h-3.5 text-zinc-400" />
                <span>View in Mind Map</span>
              </button>
            )}

            <button
              id="save-diary-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-black" />
              <span>{isSaving ? 'Saving...' : 'Save Reflection'}</span>
            </button>

            {currentEntry && (
              <button
                onClick={() => {
                  if (confirm(`Delete reflection "${currentEntry.title}"?`)) {
                    onDeleteThought(currentEntry.filePath);
                  }
                }}
                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Reflection Prompts Bar */}
        <div className="px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span className="font-semibold text-white">Prompt:</span>
            <span className="text-zinc-400">"What subtle breakthrough or insight anchored you today?"</span>
          </div>
          {savedSuccess && (
            <span className="text-white font-mono text-xs flex items-center gap-1">
              <span>✓</span> Saved to vault/Diary
            </span>
          )}
        </div>

        {/* Markdown Entry Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <textarea
            id="diary-content-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Write your stream of consciousness, deep reflections, and link to [[Notes]] or [[Goals]]..."
            className="w-full h-full bg-transparent text-zinc-200 font-mono text-sm resize-none focus:outline-none leading-relaxed selection:bg-zinc-800 selection:text-white"
          />
        </div>

        {/* Bottom Bar */}
        <div className="px-5 py-2 border-t border-zinc-800 bg-zinc-950 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Markdown + YAML Frontmatter format</span>
          <span>Node in 3D Mind Map</span>
        </div>
      </div>
    </div>
  );
};
