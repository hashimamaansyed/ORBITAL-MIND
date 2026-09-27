import React, { useState, useEffect, useCallback } from 'react';
import { ThoughtNode, VaultFileItem, WorkspaceTab } from './types';
import { layoutNodesIn3D, generateLocalEmbedding } from './services/embedding';
import { Universe3D } from './components/Universe3D';
import { WritingWorkspace } from './components/WritingWorkspace';
import { DiaryWorkspace } from './components/DiaryWorkspace';
import { GoalsWorkspace } from './components/GoalsWorkspace';
import { TopBar } from './components/TopBar';
import { SearchPalette } from './components/SearchPalette';
import { NewNodeModal } from './components/NewNodeModal';
import { QuickThoughtModal } from './components/QuickThoughtModal';
import { SparkGeminiModal } from './components/SparkGeminiModal';
import {
  auth,
  testFirestoreConnection,
  ensureAnonymousAuth,
  saveThoughtToFirestore,
  deleteThoughtFromFirestore,
  onAuthStateChanged,
  signInWithPopup,
  googleProvider,
  signOut,
} from './services/firebase';
import type { User } from 'firebase/auth';

export default function App() {
  const [thoughts, setThoughts] = useState<ThoughtNode[]>([]);
  const [vaultTree, setVaultTree] = useState<VaultFileItem[]>([]);
  const [vaultPath, setVaultPath] = useState<string>('/vault');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDiskSynced, setIsDiskSynced] = useState<boolean>(true);

  // Firebase auth & cloud sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isFirebaseSyncing, setIsFirebaseSyncing] = useState<boolean>(false);

  // Navigation & Workspace state
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>('universe');
  const [activeThoughtId, setActiveThoughtId] = useState<string | null>(null);
  const [highlightedThoughtId, setHighlightedThoughtId] = useState<string | null>(null);
  const [universeSearchQuery, setUniverseSearchQuery] = useState<string>('');

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isQuickThoughtOpen, setIsQuickThoughtOpen] = useState<boolean>(false);
  const [isSparkOpen, setIsSparkOpen] = useState<boolean>(false);
  const [connectedLocalVaultName, setConnectedLocalVaultName] = useState<string | null>(null);

  // Fetch thoughts and files from disk vault
  const fetchVault = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/vault/list');
      if (!res.ok) throw new Error('Failed to load vault');
      const data = await res.json();

      // Compute local embeddings & 3D coordinates
      const processedThoughts = layoutNodesIn3D(data.thoughts || []);
      setThoughts(processedThoughts);
      setVaultTree(data.tree || []);
      setVaultPath(data.vaultPath || '/vault');
      setIsDiskSynced(true);
    } catch (err) {
      console.error('Error fetching vault:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVault();
  }, [fetchVault]);

  // Initialize Firebase Firestore connection & Auth listener
  useEffect(() => {
    testFirestoreConnection().catch(console.warn);

    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
    });

    return () => unsubscribe();
  }, []);

  // Global Keyboard shortcuts: Cmd+K (Search), Cmd+N (Quick Note)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsQuickThoughtOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save thought to disk & Firestore cloud
  const handleSaveThought = async (thoughtData: Partial<ThoughtNode>): Promise<ThoughtNode | null> => {
    try {
      const res = await fetch('/api/vault/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thoughtData)
      });
      if (!res.ok) throw new Error('Failed to save note');
      const data = await res.json();
      const saved = data.thought;

      // Update local thoughts state
      setThoughts(prev => {
        const existingIndex = prev.findIndex(t => t.id === saved.id || t.filePath === saved.filePath);
        let updated: ThoughtNode[];
        if (existingIndex !== -1) {
          updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            ...saved,
            embedding: generateLocalEmbedding(saved),
          };
        } else {
          updated = [...prev, {
            ...saved,
            embedding: generateLocalEmbedding(saved),
          }];
        }
        return layoutNodesIn3D(updated);
      });

      // Synchronize to Firebase Firestore cloud database
      const uid = auth.currentUser?.uid || currentUser?.uid;
      if (uid && saved) {
        saveThoughtToFirestore(uid, saved).catch(err => {
          console.warn('[Firebase] Firestore auto-sync note:', err);
        });
      }

      return saved;
    } catch (err) {
      console.error('Error saving note:', err);
      return null;
    }
  };

  // Delete thought from disk & Firestore cloud
  const handleDeleteThought = async (filePath: string): Promise<boolean> => {
    try {
      const targetThought = thoughts.find(t => t.filePath === filePath);
      const res = await fetch('/api/vault/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      if (!res.ok) throw new Error('Failed to delete note');

      setThoughts(prev => {
        const updated = prev.filter(t => t.filePath !== filePath);
        return layoutNodesIn3D(updated);
      });

      // Delete from Firebase Firestore cloud
      const uid = auth.currentUser?.uid || currentUser?.uid;
      if (uid && targetThought) {
        deleteThoughtFromFirestore(uid, targetThought.id).catch(console.warn);
      }

      return true;
    } catch (err) {
      console.error('Error deleting note:', err);
      return false;
    }
  };

  // Cloud backup & restore handlers
  const handleSyncAllToFirebase = async () => {
    let uid = auth.currentUser?.uid || currentUser?.uid;
    if (!uid) {
      try {
        const cred = await signInWithPopup(auth, googleProvider);
        uid = cred.user.uid;
      } catch (err: any) {
        console.warn('Sign in needed for cloud backup:', err?.message);
        return;
      }
    }
    if (!uid) return;

    try {
      setIsFirebaseSyncing(true);
      for (const thought of thoughts) {
        await saveThoughtToFirestore(uid, thought);
      }
      alert(`Backed up ${thoughts.length} planetary thoughts to Firebase Firestore cloud database!`);
    } catch (err) {
      console.error('Firebase sync error:', err);
      alert('Failed to complete Firestore backup.');
    } finally {
      setIsFirebaseSyncing(false);
    }
  };

  const handleSignInGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google sign-in:', err?.message);
    }
  };

  const handleSignOutFirebase = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out:', err);
    }
  };

  // Create folder in vault
  const handleCreateFolder = async (folderPath: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/vault/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });
      if (!res.ok) throw new Error('Failed to create folder');
      await fetchVault();
      return true;
    } catch (err) {
      console.error('Error creating folder:', err);
      return false;
    }
  };

  // Export entire vault as ZIP for Obsidian
  const handleExportZip = () => {
    window.location.href = '/api/vault/export-zip';
  };

  // Connect local Obsidian directory (HTML5 File System Access API)
  const handleConnectLocalDirectory = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite'
        });
        if (dirHandle) {
          setConnectedLocalVaultName(dirHandle.name);
          alert(`Connected local vault directory: "${dirHandle.name}". Files remain synced with disk /vault!`);
        }
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      alert('Your browser does not support the File System Access API directly, but all notes are persistently saved on container disk in /vault and can be downloaded as a .zip anytime!');
    }
  };

  // Handlers for switching between Universe and workspaces
  const handleOpenWorkspace = (tab: 'writing' | 'diary' | 'goals', thoughtId?: string) => {
    if (thoughtId) {
      setActiveThoughtId(thoughtId);
    }
    setCurrentTab(tab);
  };

  const handleSelectFromSearch = (thought: ThoughtNode, action: 'spotlight' | 'open') => {
    if (action === 'spotlight') {
      setCurrentTab('universe');
      setUniverseSearchQuery(thought.title);
      setHighlightedThoughtId(thought.id);
    } else {
      const tab = thought.type === 'diary' ? 'diary' : (thought.type === 'goal' ? 'goals' : 'writing');
      setActiveThoughtId(thought.id);
      setCurrentTab(tab);
    }
  };

  const handleSaveQuickThought = async (
    thoughtData: Partial<ThoughtNode>,
    spotlightIn3D: boolean = true
  ): Promise<ThoughtNode | null> => {
    const saved = await handleSaveThought(thoughtData);
    if (saved && spotlightIn3D) {
      setCurrentTab('universe');
      setUniverseSearchQuery(saved.title);
      setHighlightedThoughtId(saved.id);
    }
    return saved;
  };

  return (
    <div className="h-screen w-screen bg-[#080b14] text-slate-100 flex flex-col font-sans overflow-hidden selection:bg-cyan-500/30 selection:text-white">
      {/* Top Bar with Navigation Tabs, Vault Indicator & Cmd+K Trigger */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={tab => {
          setCurrentTab(tab);
          if (tab === 'universe') {
            // Keep current universe search or clear
          }
        }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenQuickNew={() => setIsQuickThoughtOpen(true)}
        onOpenSpark={() => setIsSparkOpen(true)}
        thoughts={thoughts}
        vaultPath={vaultPath}
        isDiskSynced={isDiskSynced}
        onExportZip={handleExportZip}
        onConnectLocalDirectory={handleConnectLocalDirectory}
        connectedLocalVaultName={connectedLocalVaultName}
        firebaseUser={currentUser}
        isFirebaseSyncing={isFirebaseSyncing}
        onSyncAllToFirebase={handleSyncAllToFirebase}
        onSignInGoogle={handleSignInGoogle}
        onSignOutFirebase={handleSignOutFirebase}
      />

      {/* Main Workspace Content Area */}
      <main className="flex-1 relative w-full h-[calc(100vh-68px)] overflow-hidden">
        {isLoading && thoughts.length === 0 && (
          <div className="absolute inset-0 z-40 bg-slate-950 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-cyan-300 tracking-wider">
              Materializing 3D Knowledge Universe...
            </span>
          </div>
        )}

        {/* 1. 🌌 3D Universe */}
        <div className={`absolute inset-0 w-full h-full ${currentTab === 'universe' ? 'block' : 'hidden'}`}>
          <Universe3D
            thoughts={thoughts}
            onSelectThought={thought => setActiveThoughtId(thought.id)}
            onOpenWorkspace={handleOpenWorkspace}
            highlightedThoughtId={highlightedThoughtId}
            searchQuery={universeSearchQuery}
          />
        </div>

        {/* 2. ✍️ Writing & Notes */}
        {currentTab === 'writing' && (
          <WritingWorkspace
            thoughts={thoughts}
            vaultTree={vaultTree}
            activeThoughtId={activeThoughtId}
            onSaveThought={handleSaveThought}
            onDeleteThought={handleDeleteThought}
            onCreateFolder={handleCreateFolder}
            onNavigateToThought={id => setActiveThoughtId(id)}
          />
        )}

        {/* 3. 📅 Diary / Daily Log */}
        {currentTab === 'diary' && (
          <DiaryWorkspace
            thoughts={thoughts}
            onSaveThought={handleSaveThought}
            onDeleteThought={handleDeleteThought}
            onNavigateToUniverse={id => {
              setCurrentTab('universe');
              setHighlightedThoughtId(id);
            }}
          />
        )}

        {/* 4. 🎯 Goals Board */}
        {currentTab === 'goals' && (
          <GoalsWorkspace
            thoughts={thoughts}
            onSaveThought={handleSaveThought}
            onDeleteThought={handleDeleteThought}
            onNavigateToUniverse={id => {
              setCurrentTab('universe');
              setHighlightedThoughtId(id);
            }}
          />
        )}
      </main>

      {/* Global Cmd+K Search Palette */}
      <SearchPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        thoughts={thoughts}
        onSelectThought={handleSelectFromSearch}
      />

      {/* Interactive New Node Modal */}
      <NewNodeModal
        isOpen={isQuickThoughtOpen}
        onClose={() => setIsQuickThoughtOpen(false)}
        onSave={handleSaveQuickThought}
      />

      {/* Mind Map Spark (Gemini AI) Modal */}
      <SparkGeminiModal
        isOpen={isSparkOpen}
        onClose={() => setIsSparkOpen(false)}
        onSaveThought={handleSaveQuickThought}
        contextThought={thoughts.find(t => t.id === activeThoughtId) || null}
      />
    </div>
  );
}
