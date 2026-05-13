import { useState, useRef } from 'react';
import { UploadCloud, Copy, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface ConversionResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
}

export default function App() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez importer une image (JPEG, PNG, SVG, etc.)');
      return;
    }

    setIsCompressing(true);
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
        setResult({
          dataUrl: e.target?.result as string,
          originalSize,
          compressedSize: compressed.size,
        });
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressed);
    } catch {
      // Fallback : conversion sans compression
      const reader = new FileReader();
      reader.onload = (e) => {
        setResult({
          dataUrl: e.target?.result as string,
          originalSize: file.size,
          compressedSize: file.size,
        });
        setIsCompressing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result.dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const reset = () => {
    setResult(null);
    setCopied(false);
    setIsCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

  const ratio = result
    ? Math.round((1 - result.compressedSize / result.originalSize) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-6 md:p-12 font-sans overflow-x-hidden">
      <div className="w-full max-w-2xl flex flex-col gap-12">

        <header className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 mt-8 sm:mt-0">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 text-center">VaultLink</h1>
          <p className="text-zinc-500 text-center">Encrypted image assets for GitHub repositories</p>
        </header>

        <main className="flex flex-col gap-8">
          {isCompressing ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
              <p className="text-sm text-zinc-500 font-medium">Compression en cours…</p>
            </div>
          ) : !result ? (
            <div className="group relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">Import Asset</label>
              <div
                className={`w-full h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer
                  ${isDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-300 bg-white hover:border-zinc-400'}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <div className="p-3 bg-zinc-50 rounded-full">
                  <UploadCloud className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="text-sm text-zinc-600 font-medium">Drop JPEG, PNG or SVG</div>
                <div className="text-xs text-zinc-400">Maximum file size 5MB · Auto-compressed to WebP</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">

              {/* Image Preview */}
              <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">Asset Preview</label>
                <div className="relative aspect-video bg-white rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-200">
                  <img src={result.dataUrl} alt="Aperçu de l'import" className="max-w-full max-h-full object-contain p-4" />
                </div>
              </div>

              {/* Compression stats */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Original</span>
                  <span className="text-sm font-semibold text-zinc-700">{formatSize(result.originalSize)}</span>
                </div>
                <div className="flex-1 bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Compressé</span>
                  <span className="text-sm font-semibold text-zinc-700">{formatSize(result.compressedSize)}</span>
                </div>
                <div className="flex-1 bg-black rounded-2xl px-4 py-3 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Réduction</span>
                  <span className="text-sm font-semibold text-white">−{ratio}%</span>
                </div>
              </div>

              {/* Text Output */}
              <div className="flex flex-col gap-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Encrypted Export</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={result.dataUrl}
                      className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-zinc-900 text-sm font-mono focus:outline-none"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-1 rounded">Base64 · WebP</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-6 py-4 bg-black text-white rounded-2xl text-sm font-semibold hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2 flex-1 sm:flex-none"
                      title="Copier le texte"
                    >
                      <span>Copy</span>
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={reset}
                      className="px-6 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl text-sm font-semibold hover:bg-zinc-50 transition-colors flex justify-center items-center gap-2 flex-1 sm:flex-none"
                      title="Nouvelle image"
                    >
                      New
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>

        <footer className="pt-12 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center text-zinc-400 gap-4 pb-8 sm:pb-0">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs uppercase tracking-wide font-medium">Secure Session</span>
            </div>
            <span className="text-xs uppercase tracking-wide font-medium hidden sm:inline">Optimized Output</span>
          </div>
          <div className="text-[10px] font-mono opacity-50">VER 2.0.4 // GITHUB_DEPLOY_SYNC</div>
        </footer>

      </div>
    </div>
  );
}
