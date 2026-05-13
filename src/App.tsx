import React, { useState, useRef } from 'react';
import {
  UploadCloud, Copy, Check, Image as ImageIcon,
  Loader2, Link, Code2, Trash2,
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

const AGENT_URL = 'http://localhost:4001';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmbedResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
}

interface UrlResult {
  url: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  format: string;
}

type Mode = 'embed' | 'url';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<Mode>('url');

  const [embedResult, setEmbedResult] = useState<EmbedResult | null>(null);
  const [urlResult, setUrlResult] = useState<UrlResult | null>(null);

  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // URL-mode options
  const [quality, setQuality] = useState(80);
  const [maxDim, setMaxDim] = useState(1920);
  const [format, setFormat] = useState<'webp' | 'avif' | 'jpeg'>('webp');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Embed mode (base64, browser-image-compression) ─────────────────────────

  const handleEmbed = async (file: File) => {
    setIsProcessing(true);
    setCopied(false);
    try {
      const originalSize = file.size;
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.75,
      });
      const reader = new FileReader();
      reader.onload = (e) => {
        setEmbedResult({
          dataUrl: e.target?.result as string,
          originalSize,
          compressedSize: compressed.size,
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEmbedResult({
          dataUrl: e.target?.result as string,
          originalSize: file.size,
          compressedSize: file.size,
        });
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // ── URL mode (sharp server-side via agent) ──────────────────────────────────

  const handleUrl = async (file: File) => {
    setIsProcessing(true);
    setCopied(false);
    setAgentError(null);
    try {
      const body = new FormData();
      body.append('image', file);
      body.append('quality', String(quality));
      body.append('maxDim', String(maxDim));
      body.append('format', format);

      const res = await fetch(`${AGENT_URL}/api/compress`, { method: 'POST', body });
      if (!res.ok) throw new Error(`Agent HTTP ${res.status}`);
      const data: UrlResult = await res.json();
      setUrlResult(data);
    } catch (e: unknown) {
      setAgentError(
        `Agent inaccessible — lancez : npm run agent\n${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez importer une image (JPEG, PNG, SVG, etc.)');
      return;
    }
    if (mode === 'embed') handleEmbed(file);
    else handleUrl(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setEmbedResult(null);
    setUrlResult(null);
    setCopied(false);
    setAgentError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasResult = mode === 'embed' ? !!embedResult : !!urlResult;
  const previewSrc = mode === 'embed' ? embedResult?.dataUrl : urlResult?.url;

  const origSize = mode === 'embed' ? embedResult?.originalSize : urlResult?.originalSize;
  const compSize = mode === 'embed' ? embedResult?.compressedSize : urlResult?.compressedSize;
  const ratio = origSize && compSize ? Math.round((1 - compSize / origSize) * 100) : 0;

  const outputValue =
    mode === 'embed' ? (embedResult?.dataUrl ?? '') : (urlResult?.url ?? '');

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-6 md:p-12 font-sans overflow-x-hidden">
      <div className="w-full max-w-2xl flex flex-col gap-10">

        {/* Header */}
        <header className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 mt-8 sm:mt-0">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 text-center">VaultLink</h1>
          <p className="text-zinc-500 text-center text-sm">Compression & export d'images</p>
        </header>

        {/* Mode tabs */}
        <div className="flex bg-white border border-zinc-200 rounded-2xl p-1 gap-1">
          <button
            onClick={() => { setMode('url'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'url' ? 'bg-black text-white' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Link className="w-4 h-4" />
            URL — Agent Sharp
          </button>
          <button
            onClick={() => { setMode('embed'); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'embed' ? 'bg-black text-white' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Code2 className="w-4 h-4" />
            Embed — Base64
          </button>
        </div>

        <main className="flex flex-col gap-6">

          {/* URL mode options */}
          {mode === 'url' && !hasResult && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-5 flex flex-col gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Options Agent</span>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400">Format</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as typeof format)}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none"
                  >
                    <option value="webp">WebP</option>
                    <option value="avif">AVIF</option>
                    <option value="jpeg">JPEG</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400">Qualité ({quality}%)</label>
                  <input
                    type="range" min={10} max={100} value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="mt-2"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] uppercase tracking-widest text-zinc-400">Max px</label>
                  <select
                    value={maxDim}
                    onChange={(e) => setMaxDim(Number(e.target.value))}
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none"
                  >
                    <option value={800}>800</option>
                    <option value={1280}>1280</option>
                    <option value={1920}>1920</option>
                    <option value={3840}>3840</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 bg-zinc-50 rounded-xl px-4 py-3 font-mono">
                $ npm run agent &nbsp;→&nbsp; http://localhost:4001
              </p>
            </div>
          )}

          {/* Agent error */}
          {agentError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 whitespace-pre-wrap font-mono">
              {agentError}
            </div>
          )}

          {/* Loading */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
              <p className="text-sm text-zinc-500 font-medium">
                {mode === 'url' ? 'Compression sharp en cours…' : 'Compression navigateur…'}
              </p>
            </div>
          )}

          {/* Upload zone */}
          {!isProcessing && !hasResult && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                Import Asset
              </label>
              <div
                className={`w-full h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer
                  ${isDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-300 bg-white hover:border-zinc-400'}`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file" className="hidden" accept="image/*" ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="p-3 bg-zinc-50 rounded-full">
                  <UploadCloud className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="text-sm text-zinc-600 font-medium">Drop JPEG, PNG, WebP, AVIF…</div>
                <div className="text-xs text-zinc-400">
                  {mode === 'url' ? 'Compression serveur (sharp) → URL réelle' : 'Compression navigateur → Base64 embed'}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {!isProcessing && hasResult && (
            <div className="flex flex-col gap-6">

              {/* Preview */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                  Aperçu
                </label>
                <div className="relative aspect-video bg-white rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-200">
                  <img src={previewSrc} alt="Aperçu" className="max-w-full max-h-full object-contain p-4" />
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Original</span>
                  <span className="text-sm font-semibold text-zinc-700">{fmt(origSize!)}</span>
                </div>
                <div className="flex-1 bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Compressé</span>
                  <span className="text-sm font-semibold text-zinc-700">{fmt(compSize!)}</span>
                </div>
                <div className="flex-1 bg-black rounded-2xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Réduction</span>
                  <span className="text-sm font-semibold text-white">−{ratio}%</span>
                </div>
              </div>

              {/* Output */}
              <div className="flex flex-col gap-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                  {mode === 'url' ? 'URL — copiez dans surcyclage' : 'Base64 Embed'}
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text" readOnly value={outputValue}
                      className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-zinc-900 text-sm font-mono focus:outline-none"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-1 rounded">
                        {mode === 'url' ? `${urlResult?.format?.toUpperCase()} · URL` : 'Base64 · WebP'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copy(outputValue)}
                      className="px-6 py-4 bg-black text-white rounded-2xl text-sm font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-2"
                    >
                      <span>Copy</span>
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={reset}
                      className="px-6 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl text-sm font-semibold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      New
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>

        <footer className="pt-10 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-zinc-400 gap-4 pb-8 sm:pb-0">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs uppercase tracking-wide font-medium">Secure Session</span>
            </div>
          </div>
          <div className="text-[10px] font-mono opacity-50">VER 3.0.0 // SHARP_AGENT</div>
        </footer>

      </div>
    </div>
  );
}
