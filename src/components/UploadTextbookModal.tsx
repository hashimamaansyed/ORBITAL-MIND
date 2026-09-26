import React, { useState, useRef, DragEvent } from 'react';
import { ThoughtNode } from '../types';
import {
  UploadCloud,
  FileText,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  Compass,
  ArrowRight,
  Zap
} from 'lucide-react';

interface UploadTextbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTextbookUploaded: (thought: ThoughtNode, spotlightIn3D?: boolean) => void;
}

export const UploadTextbookModal: React.FC<UploadTextbookModalProps> = ({
  isOpen,
  onClose,
  onTextbookUploaded
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [targetFolder, setTargetFolder] = useState('Notes/Textbooks');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a valid PDF file (.pdf)');
      return;
    }
    setError(null);
    setFile(selectedFile);
    const cleanName = selectedFile.name
      .replace(/\.pdf$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    setCustomTitle(cleanName);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const convertFileToBase64 = (fileToConvert: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data:application/pdf;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileToConvert);
    });
  };

  const handleSubmit = async (spotlight: boolean = true) => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress('Extracting PDF text and reading chapters...');

      const base64 = await convertFileToBase64(file);

      setUploadProgress('Analyzing semantic concepts & cross-linking notes...');

      const res = await fetch('/api/vault/upload-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileBase64: base64,
          customTitle: customTitle.trim() || undefined,
          targetFolder: targetFolder.trim() || 'Notes/Textbooks'
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to upload and index PDF');
      }

      const data = await res.json();
      setUploadProgress('Connecting neural lines in 3D Mind Map...');

      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(null);
        onTextbookUploaded(data.thought, spotlight);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Upload error:', err);
      setIsUploading(false);
      setUploadProgress(null);
      setError(err.message || 'An error occurred during upload.');
    }
  };

  // Seed sample textbook for immediate testing
  const handleLoadSample = async (sampleType: 'ai' | 'neuroscience') => {
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(`Importing sample ${sampleType === 'ai' ? 'Deep Learning' : 'Neuroscience'} textbook...`);

      const res = await fetch('/api/vault/seed-sample-textbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleType })
      });

      if (!res.ok) throw new Error('Failed to generate sample textbook');
      const data = await res.json();

      setUploadProgress('Projecting high-dimensional embeddings & connecting 3D lines...');
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(null);
        onTextbookUploaded(data.thought, true);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Sample import error:', err);
      setIsUploading(false);
      setUploadProgress(null);
      setError(err.message || 'Failed to load sample textbook.');
    }
  };

  return (
    <div
      id="upload-textbook-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      onClick={e => {
        if (e.target === e.currentTarget && !isUploading) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl overflow-hidden flex flex-col gap-4 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Upload Textbook (PDF)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
                  Notes
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Extracts chapters, indexes text into semantic search, and draws 3D connecting lines.
              </p>
            </div>
          </div>

          {!isUploading && (
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1 hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-center gap-2 font-mono">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            isDragOver
              ? 'border-white bg-zinc-900/80'
              : file
              ? 'border-zinc-700 bg-zinc-900/40'
              : 'border-zinc-800 hover:border-zinc-600 bg-zinc-900/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {file ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-sm font-semibold text-white truncate max-w-xs">{file.name}</div>
              <div className="text-xs text-zinc-400 font-mono">
                {(file.size / (1024 * 1024)).toFixed(2)} MB • Click or drag to replace
              </div>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-zinc-200">
                Click to browse or drop textbook PDF here
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                Supports full textbooks, papers, and multi-page documents
              </div>
            </>
          )}
        </div>

        {/* Metadata Inputs */}
        {file && (
          <div className="space-y-3 bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-800 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Textbook Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="e.g. Deep Learning & Neural Architectures"
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Vault Destination Folder
              </label>
              <input
                type="text"
                value={targetFolder}
                onChange={e => setTargetFolder(e.target.value)}
                placeholder="Notes/Textbooks"
                className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* Progress State */}
        {isUploading && (
          <div className="p-3.5 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
            <div className="text-xs font-mono text-zinc-200">
              {uploadProgress || 'Processing PDF...'}
            </div>
          </div>
        )}

        {/* Quick Sample Presets */}
        {!isUploading && !file && (
          <div className="pt-2 border-t border-zinc-900">
            <div className="text-[11px] font-medium text-zinc-400 mb-2 flex items-center justify-between">
              <span>Don't have a textbook PDF right now?</span>
              <span className="text-[10px] font-mono text-zinc-400">1-Click Test</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleLoadSample('ai')}
                className="p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-all group flex items-start gap-2 text-xs"
              >
                <span className="text-sm">📘</span>
                <div>
                  <div className="font-medium text-zinc-200 group-hover:text-white leading-snug">
                    Deep Learning & Neural Systems
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Connects to Latent Space & Transformers
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('neuroscience')}
                className="p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition-all group flex items-start gap-2 text-xs"
              >
                <span className="text-sm">📗</span>
                <div>
                  <div className="font-medium text-zinc-200 group-hover:text-white leading-snug">
                    Cognitive Neuroscience Topologies
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    Connects to Cortical Mapping & Memory
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-3.5 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          {file && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => handleSubmit(true)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white hover:bg-zinc-200 text-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Connect in 3D</span>
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
