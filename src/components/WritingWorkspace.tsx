import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ThoughtNode, VaultFileItem } from '../types';
import {
  Folder,
  FolderPlus,
  FileText,
  FilePlus,
  Save,
  Trash2,
  Eye,
  Edit3,
  Columns,
  Tag,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Link2,
  CheckSquare,
  List,
  Heading,
  Code,
  Bold,
  Italic,
  Share2
} from 'lucide-react';

interface WritingWorkspaceProps {
  thoughts: ThoughtNode[];
  vaultTree: VaultFileItem[];
  activeThoughtId?: string | null;
  onSaveThought: (thoughtData: Partial<ThoughtNode>) => Promise<ThoughtNode | null>;
  onDeleteThought: (filePath: string) => Promise<boolean>;
  onCreateFolder: (folderPath: string) => Promise<boolean>;
  onNavigateToThought: (thoughtId: string) => void;
}

export const WritingWorkspace: React.FC<WritingWorkspaceProps> = ({
  thoughts,
  vaultTree,
  activeThoughtId,
  onSaveThought,
  onDeleteThought,
  onCreateFolder,
  onNavigateToThought
}) => {
  // Find currently active note or default to first note
  const notesList = useMemo(() => thoughts.filter(t => t.type === 'note'), [thoughts]);

  const [selectedNoteId, setSelectedNoteId] = useState<string>(
    activeThoughtId || (notesList[0]?.id || '')
  );

  useEffect(() => {
    if (activeThoughtId) {
      setSelectedNoteId(activeThoughtId);
    }
  }, [activeThoughtId]);

  const currentNote = useMemo(() => {
    return thoughts.find(t => t.id === selectedNoteId) || notesList[0];
  }, [thoughts, selectedNoteId, notesList]);

  // Editor states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('');
  const [tagsString, setTagsString] = useState('');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState('');

  // Sync state when selected note changes
  useEffect(() => {
    if (currentNote) {
      setTitle(currentNote.title);
      setContent(currentNote.content);
      setFolder(currentNote.folder || 'Notes');
      setTagsString(currentNote.tags.join(', '));
    }
  }, [currentNote?.id]);

  // Handle Save
  const handleSave = async () => {
    if (!currentNote && !title) return;
    setIsSaving(true);
    const tags = tagsString
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const saved = await onSaveThought({
      id: currentNote?.id,
      title: title || 'Untitled Note',
      type: 'note',
      content,
      folder: folder || 'Notes',
      tags,
      filePath: currentNote?.filePath,
    });

    setIsSaving(false);
    if (saved) {
      setSaveMessage('Saved to disk (/vault)');
      setTimeout(() => setSaveMessage(null), 3000);
      if (saved.id !== selectedNoteId) {
        setSelectedNoteId(saved.id);
      }
    }
  };

  // Quick insertion helpers
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const insertText = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = prefix + (selected || 'text') + suffix;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 0);
  };

  // Helper to render Wikilinks [[Title]] as clickable elements in preview
  const renderMarkdownPreview = (text: string) => {
    if (!text) return <p className="text-zinc-500 italic">No content yet...</p>;

    // Split by lines
    const lines = text.split('\n');

    return (
      <div className="space-y-3 font-sans leading-relaxed text-zinc-200">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-2xl font-bold text-white border-b border-zinc-800 pb-2 mt-4 mb-2">
                {renderInlineWikilinks(line.replace('# ', ''))}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-xl font-semibold text-zinc-100 border-b border-zinc-800/80 pb-1.5 mt-4 mb-2">
                {renderInlineWikilinks(line.replace('## ', ''))}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-lg font-medium text-zinc-200 mt-3 mb-1.5">
                {renderInlineWikilinks(line.replace('### ', ''))}
              </h3>
            );
          }
          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="border-l-2 border-zinc-500 pl-3 py-1 text-zinc-300 italic bg-zinc-900/40 rounded-r-lg">
                {renderInlineWikilinks(line.replace('> ', ''))}
              </blockquote>
            );
          }
          // Task checkbox
          if (line.match(/^-\s*\[([ xX])\]\s*(.*)$/)) {
            const match = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
            const isChecked = match?.[1].toLowerCase() === 'x';
            const itemText = match?.[2] || '';
            return (
              <div key={idx} className="flex items-center gap-2.5 text-sm py-0.5">
                <input
                  type="checkbox"
                  checked={isChecked}
                  readOnly
                  className="rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 accent-white"
                />
                <span className={isChecked ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                  {renderInlineWikilinks(itemText)}
                </span>
              </div>
            );
          }
          // Bullet list
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-sm text-zinc-300 py-0.5">
                {renderInlineWikilinks(line.replace(/^[-*]\s+/, ''))}
              </li>
            );
          }
          // Empty line
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }

          // Regular paragraph
          return (
            <p key={idx} className="text-sm text-zinc-300">
              {renderInlineWikilinks(line)}
            </p>
          );
        })}
      </div>
    );
  };

  // Convert [[Target]] into clickable links
  const renderInlineWikilinks = (text: string) => {
    const parts = [];
    const regex = /\[\[(.*?)\]\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      const linkedTitle = match[1];
      const targetThought = thoughts.find(
        t => t.title.toLowerCase() === linkedTitle.toLowerCase()
      );

      parts.push(
        <button
          key={match.index}
          onClick={() => {
            if (targetThought) {
              setSelectedNoteId(targetThought.id);
            }
          }}
          className={`inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded transition-all ${
            targetThought
              ? 'bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 underline decoration-zinc-400'
              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 italic'
          }`}
          title={targetThought ? `Jump to [[${linkedTitle}]]` : `Thought not found yet`}
        >
          <Link2 className="w-2.5 h-2.5 text-zinc-400" />
          <span>{linkedTitle}</span>
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  // Word count stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div id="writing-workspace" className="h-[calc(100vh-68px)] flex bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Left Sidebar: Folder Tree & Notes Navigator */}
      <div className="w-64 sm:w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-zinc-300" />
            <span className="font-bold text-xs uppercase tracking-wider text-zinc-300">
              Vault Hierarchy
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              id="create-folder-btn"
              onClick={() => setShowNewFolderModal(true)}
              title="New Folder in Vault"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded transition-colors"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              id="create-new-note-btn"
              onClick={() => {
                const newId = `note-${Date.now()}`;
                setSelectedNoteId(newId);
                setTitle('New Knowledge Note');
                setContent('# New Knowledge Note\n\nRecord notes, concepts, and link with [[Other Thoughts]].');
                setFolder('Notes');
                setTagsString('concept');
              }}
              title="New Note"
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded transition-colors"
            >
              <FilePlus className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Notes Search Filter */}
        <div className="p-2 border-b border-zinc-800">
          <input
            type="text"
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Filter files & folders..."
            className="w-full px-2.5 py-1 text-xs bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* File Tree List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {notesList
            .filter(n =>
              !sidebarFilter ||
              n.title.toLowerCase().includes(sidebarFilter.toLowerCase()) ||
              n.filePath.toLowerCase().includes(sidebarFilter.toLowerCase())
            )
            .map(note => {
              const isActive = note.id === selectedNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`p-2 rounded-lg cursor-pointer transition-all flex items-start gap-2.5 text-xs ${
                    isActive
                      ? 'bg-zinc-900 text-white border border-zinc-700 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-200 truncate">{note.title}</div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">
                      📁 {note.filePath}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Vault Stats Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-950 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Obsidian Format</span>
          <span>{notesList.length} Notes</span>
        </div>
      </div>

      {/* Main Editor & Live Preview Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor Top Bar */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-[240px]">
            <input
              id="note-title-input"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Note Title..."
              className="text-lg sm:text-xl font-bold bg-transparent text-white focus:outline-none w-full border-b border-transparent focus:border-zinc-500 transition-all"
            />
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 font-mono">
              <span>Folder:</span>
              <input
                type="text"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="Notes/Subfolder"
                className="bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-zinc-500"
              />
              <span>•</span>
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-zinc-400" />
                <input
                  type="text"
                  value={tagsString}
                  onChange={e => setTagsString(e.target.value)}
                  placeholder="tags, comma, separated"
                  className="bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800 text-zinc-300 text-xs focus:outline-none focus:border-zinc-500"
                />
              </span>
            </div>
          </div>

          {/* View Mode Toggle & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => setViewMode('edit')}
                title="Editor only"
                className={`p-1.5 rounded text-xs transition-all ${
                  viewMode === 'edit' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                title="Split Edit & Live Preview"
                className={`p-1.5 rounded text-xs transition-all ${
                  viewMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('preview')}
                title="Live Preview only"
                className={`p-1.5 rounded text-xs transition-all ${
                  viewMode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Save Button */}
            <button
              id="save-note-btn"
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-black" />
              <span>{isSaving ? 'Saving...' : 'Save to Vault'}</span>
            </button>

            {/* Delete button */}
            {currentNote && (
              <button
                onClick={() => {
                  if (confirm(`Delete "${currentNote.title}" from disk?`)) {
                    onDeleteThought(currentNote.filePath);
                  }
                }}
                title="Delete note file"
                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Markdown Toolbar */}
        <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/70 flex items-center gap-1 text-zinc-400 text-xs overflow-x-auto">
          <button
            onClick={() => insertText('**', '**')}
            title="Bold"
            className="p-1.5 hover:bg-zinc-900 hover:text-white rounded transition-colors"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('*', '*')}
            title="Italic"
            className="p-1.5 hover:bg-zinc-900 hover:text-white rounded transition-colors"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('## ')}
            title="Heading 2"
            className="p-1.5 hover:bg-zinc-900 hover:text-white rounded transition-colors"
          >
            <Heading className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('- [ ] ')}
            title="Task Checkbox"
            className="p-1.5 hover:bg-zinc-900 hover:text-white rounded flex items-center gap-1 transition-colors"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="text-[10px]">Task</span>
          </button>
          <button
            onClick={() => insertText('- ')}
            title="Bullet item"
            className="p-1.5 hover:bg-zinc-900 hover:text-white rounded transition-colors"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => insertText('[[', ']]')}
            title="Obsidian Wikilink"
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded border border-zinc-700 flex items-center gap-1 text-xs transition-colors"
          >
            <Link2 className="w-3 h-3 text-zinc-400" />
            <span>[[Wikilink]]</span>
          </button>
          <button
            onClick={() => insertText('```ts\n', '\n```')}
            title="Code Block"
            className="p-1.5 hover:bg-zinc-900 hover:text-white rounded transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {saveMessage && (
            <span className="ml-auto text-xs text-white font-mono flex items-center gap-1 animate-in fade-in">
              <span>✓</span> {saveMessage}
            </span>
          )}
        </div>

        {/* Content Pane: Split / Edit / Preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor Area */}
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className={`h-full flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-zinc-800' : 'w-full'}`}>
              <textarea
                ref={textareaRef}
                id="markdown-editor-textarea"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write in human-readable Markdown with [[Wikilinks]]..."
                className="flex-1 p-5 bg-zinc-950 text-zinc-200 font-mono text-sm resize-none focus:outline-none leading-relaxed selection:bg-zinc-800 selection:text-white"
              />
            </div>
          )}

          {/* Live Preview Area */}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`h-full overflow-y-auto p-6 bg-zinc-950 ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
              <div className="max-w-2xl">
                {renderMarkdownPreview(content)}
              </div>
            </div>
          )}
        </div>

        {/* Editor Bottom Status Bar */}
        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>{wordCount} words</span>
            <span>{content.length} characters</span>
            <span>~{readingTime} min read</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500">
            <span>Obsidian wikilinks enabled</span>
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-white" />
              <span>Create Custom Folder</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Enter directory path in the vault (e.g. <code>Notes/Cognition</code>)
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="e.g. Notes/Philosophy"
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-200 focus:outline-none focus:border-zinc-500 mb-4 font-mono"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (newFolderName.trim()) {
                    await onCreateFolder(newFolderName.trim());
                    setNewFolderName('');
                    setShowNewFolderModal(false);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-zinc-200 text-black shadow-md"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
