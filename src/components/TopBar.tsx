import React, { useState } from 'react';
import { WorkspaceTab, ThoughtNode } from '../types';
import {
  Search,
  Plus,
  FolderSync,
  Download,
  CheckCircle2,
  HardDrive,
  Sparkles,
  ExternalLink,
  Layers,
  ChevronDown
} from 'lucide-react';

interface TopBarProps {
  currentTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenSearch: () => void;
  onOpenQuickNew: () => void;
  thoughts: ThoughtNode[];
  vaultPath: string;
  isDiskSynced: boolean;
  onExportZip: () => void;
  onConnectLocalDirectory: () => void;
  connectedLocalVaultName?: string | null;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenQuickNew,
  thoughts,
  vaultPath,
  isDiskSynced,
  onExportZip,
  onConnectLocalDirectory,
  connectedLocalVaultName
}) => {
  const [showVaultMenu, setShowVaultMenu] = useState(false);

  const notesCount = thoughts.filter(t => t.type === 'note').length;
  const diaryCount = thoughts.filter(t => t.type === 'diary').length;
  const goalsCount = thoughts.filter(t => t.type === 'goal').length;

  return (
    <header className="relative z-30 h-[70px] shrink-0 bg-white border-b-2 border-[#7c3aed] px-4 sm:px-6 flex items-center justify-between gap-4 shadow-[0_12px_45px_rgba(0,0,0,0.85)]">
      {/* Left: Brand Identity & Workspace Navigation Tabs */}
      <div className="flex items-center gap-5 sm:gap-7">
        {/* App Title */}
        <div
          onClick={() => onSelectTab('universe')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-[#090a0f] border-2 border-[#7c3aed] flex items-center justify-center shadow-lg group-hover:border-[#6d28d9] group-hover:shadow-[0_0_18px_rgba(124,58,237,0.6)] transition-all">
            <Sparkles className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="font-astral font-bold text-xs sm:text-sm text-[#090a0f] flex items-center gap-1.5 tracking-[0.18em]">
              <span>MIND MAP</span>
            </div>
            <div className="font-astral text-[9px] text-[#7c3aed] tracking-[0.22em] font-semibold">
              ALEN SOLAR SYSTEM
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs with Astral 60/30/20 Styling */}
        <nav className="flex items-center gap-1 bg-[#090a0f] border border-[#7c3aed]/60 p-1 rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.2)]">
          <button
            id="tab-universe-btn"
            onClick={() => onSelectTab('universe')}
            className={`px-3 py-1.5 text-xs font-astral font-bold rounded-lg transition-all flex items-center gap-2 ${
              currentTab === 'universe'
                ? 'bg-[#7c3aed] text-white shadow-md border border-[#a855f7] shadow-[0_0_14px_rgba(124,58,237,0.65)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="text-sm leading-none">🪐</span>
            <span className="hidden sm:inline">SOLAR SYSTEM</span>
          </button>

          <button
            id="tab-writing-btn"
            onClick={() => onSelectTab('writing')}
            className={`px-3 py-1.5 text-xs font-astral font-bold rounded-lg transition-all flex items-center gap-2 ${
              currentTab === 'writing'
                ? 'bg-[#7c3aed] text-white shadow-md border border-[#a855f7] shadow-[0_0_14px_rgba(124,58,237,0.65)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#c084fc] shadow-sm shadow-[#9333ea]" />
            <span className="hidden sm:inline">NOTES</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black text-[#e9d5ff] font-mono hidden md:inline border border-[#7c3aed]/40">
              {notesCount}
            </span>
          </button>

          <button
            id="tab-diary-btn"
            onClick={() => onSelectTab('diary')}
            className={`px-3 py-1.5 text-xs font-astral font-bold rounded-lg transition-all flex items-center gap-2 ${
              currentTab === 'diary'
                ? 'bg-[#7c3aed] text-white shadow-md border border-[#a855f7] shadow-[0_0_14px_rgba(124,58,237,0.65)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#fbbf24] shadow-sm shadow-[#d97706]" />
            <span className="hidden sm:inline">DIARY</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black text-[#fef3c7] font-mono hidden md:inline border border-[#7c3aed]/40">
              {diaryCount}
            </span>
          </button>

          <button
            id="tab-goals-btn"
            onClick={() => onSelectTab('goals')}
            className={`px-3 py-1.5 text-xs font-astral font-bold rounded-lg transition-all flex items-center gap-2 ${
              currentTab === 'goals'
                ? 'bg-[#7c3aed] text-white shadow-md border border-[#a855f7] shadow-[0_0_14px_rgba(124,58,237,0.65)]'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#22d3ee] shadow-sm shadow-[#0891b2]" />
            <span className="hidden sm:inline">GOALS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black text-[#cffafe] font-mono hidden md:inline border border-[#7c3aed]/40">
              {goalsCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Right: Global Cmd+K Search, Vault Path Indicator, & Quick New */}
      <div className="flex items-center gap-2.5">
        {/* Global Cmd+K Search Trigger */}
        <button
          id="global-search-trigger"
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#090a0f] hover:bg-[#131722] border border-[#7c3aed]/60 hover:border-[#7c3aed] rounded-xl text-white transition-all text-xs font-astral shadow-[0_0_10px_rgba(124,58,237,0.15)]"
        >
          <Search className="w-3.5 h-3.5 text-[#a855f7]" />
          <span className="hidden md:inline text-[10px] tracking-[0.15em]">SEARCH UNIVERSE</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono bg-black border border-[#7c3aed]/50 rounded text-white/90">
            <span>⌘</span>K
          </kbd>
        </button>

        {/* Vault Path Indicator & Obsidian Sync Menu */}
        <div className="relative">
          <button
            id="vault-path-indicator"
            onClick={() => setShowVaultMenu(!showVaultMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#090a0f] hover:bg-[#131722] border border-[#7c3aed]/60 rounded-xl text-xs font-mono text-white transition-all"
            title="Obsidian-Compatible Vault Storage"
          >
            <HardDrive className="w-3.5 h-3.5 text-[#a855f7]" />
            <span className="hidden lg:inline text-white/60">vault:</span>
            <span className="text-white font-bold truncate max-w-[90px] sm:max-w-[130px]">
              {connectedLocalVaultName || '/vault'}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" title="Disk Synced" />
            <ChevronDown className="w-3 h-3 text-white/70" />
          </button>

          {/* Vault Menu Dropdown */}
          {showVaultMenu && (
            <div className="absolute right-0 top-11 w-72 bg-white border-2 border-[#7c3aed] text-[#090a0f] rounded-2xl p-4 shadow-[0_24px_65px_rgba(0,0,0,0.85)] z-40 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-200">
                <div className="flex items-center gap-1.5 font-bold font-astral text-[#090a0f] text-[11px]">
                  <FolderSync className="w-4 h-4 text-[#7c3aed]" />
                  <span>OBSIDIAN VAULT</span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-astral font-bold rounded-full bg-[#7c3aed] text-white">
                  SYNCED
                </span>
              </div>

              <div className="space-y-2 mb-4 text-[#090a0f]/80 text-[11px]">
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="font-mono font-bold text-[#090a0f]">.md + YAML</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard:</span>
                  <span className="font-semibold text-[#090a0f]">Obsidian Vault</span>
                </div>
                <div className="flex justify-between">
                  <span>Wikilinks:</span>
                  <span className="font-mono text-[#7c3aed] font-bold">[[Links]]</span>
                </div>
                <div className="flex justify-between">
                  <span>Planets:</span>
                  <span className="font-mono font-bold text-[#090a0f]">{thoughts.length} nodes</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    onExportZip();
                    setShowVaultMenu(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-[#090a0f] hover:bg-[#7c3aed] text-white flex items-center justify-center gap-2 transition-all font-astral font-bold text-[10px] tracking-[0.14em]"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>EXPORT VAULT (.ZIP)</span>
                </button>

                <button
                  onClick={() => {
                    onConnectLocalDirectory();
                    setShowVaultMenu(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#090a0f] flex items-center justify-center gap-2 transition-all font-astral font-bold text-[10px] tracking-[0.14em] border border-gray-300"
                >
                  <HardDrive className="w-3.5 h-3.5 text-[#7c3aed]" />
                  <span>CONNECT LOCAL FOLDER</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick New Thought Button (Astral Clean White with Deep Purple Border) */}
        <button
          id="quick-note-btn"
          onClick={onOpenQuickNew}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-astral font-bold text-xs tracking-[0.18em] transition-all shadow-[0_0_18px_rgba(124,58,237,0.5)] hover:shadow-[0_0_26px_rgba(124,58,237,0.8)] active:scale-95 border border-[#a855f7]"
        >
          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
          <span className="hidden sm:inline">NEW NODE</span>
        </button>
      </div>
    </header>
  );
};
