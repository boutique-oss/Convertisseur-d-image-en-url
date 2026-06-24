import { useState, useRef } from 'react';
import { UploadCloud, Copy, Check, Image as ImageIcon, Download } from 'lucide-react';

function toSquareTransparentPng(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.max(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        // transparent background (default — no fillRect needed)
        const x = Math.round((size - img.width) / 2);
        const y = Math.round((size - img.height) / 2);
        ctx.drawImage(img, x, y, img.width, img.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Veuillez importer une image (JPEG, PNG, SVG, etc.)');
      return;
    }
    setProcessing(true);
    try {
      const png = await toSquareTransparentPng(file);
      setDataUrl(png);
      setCopied(false);
    } catch {
      alert('Erreur lors du traitement de l\'image.');
    } finally {
      setProcessing(false);
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
    if (dataUrl) {
      navigator.clipboard.writeText(dataUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'image-carree.png';
    a.click();
  };

  const reset = () => {
    setDataUrl(null);
    setCopied(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#F4F4F5] flex flex-col items-center justify-center p-6 md:p-12 font-sans overflow-x-hidden">
      <div className="w-full max-w-2xl flex flex-col gap-12">

        <header className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 mt-8 sm:mt-0">
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 text-center">VaultLink</h1>
          <p className="text-zinc-500 text-center">PNG carré transparent — export Base64 GitHub</p>
        </header>

        <main className="flex flex-col gap-8">
          {!dataUrl ? (
            <div className="group relative">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                {processing ? 'Traitement…' : 'Import Asset'}
              </label>
              <div
                className={`w-full h-48 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer
                  ${isDragging ? 'border-zinc-500 bg-zinc-100' : 'border-zinc-300 bg-white hover:border-zinc-400'}
                  ${processing ? 'opacity-50 pointer-events-none' : ''}`}
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
                <div className="text-sm text-zinc-600 font-medium">Drop JPEG, PNG ou SVG</div>
                <div className="text-xs text-zinc-400">Sortie : PNG carré transparent</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">

              {/* Aperçu carré avec damier (transparent) */}
              <div className="group relative">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 ml-1">
                  Aperçu — PNG carré transparent
                </label>
                <div
                  className="relative bg-white rounded-3xl overflow-hidden flex items-center justify-center border border-zinc-200"
                  style={{
                    aspectRatio: '1 / 1',
                    backgroundImage:
                      'repeating-conic-gradient(#e4e4e7 0% 25%, #f4f4f5 0% 50%)',
                    backgroundSize: '20px 20px',
                  }}
                >
                  <img src={dataUrl} alt="Aperçu PNG carré" className="w-full h-full object-contain" />
                </div>
              </div>

              {/* Bouton téléchargement PNG */}
              <button
                onClick={downloadPng}
                className="w-full px-6 py-4 bg-zinc-900 text-white rounded-2xl text-sm font-semibold hover:bg-zinc-700 transition-colors flex justify-center items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger le PNG carré
              </button>

              {/* Export Base64 */}
              <div className="flex flex-col gap-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">
                  Export Base64
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={dataUrl}
                      className="w-full px-5 py-4 bg-white border border-zinc-200 rounded-2xl text-zinc-900 text-sm font-mono focus:outline-none"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                      <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-1 rounded">PNG</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-6 py-4 bg-black text-white rounded-2xl text-sm font-semibold hover:bg-zinc-800 transition-colors flex justify-center items-center gap-2 flex-1 sm:flex-none"
                    >
                      <span>Copy</span>
                      {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={reset}
                      className="px-6 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl text-sm font-semibold hover:bg-zinc-50 transition-colors flex justify-center items-center gap-2 flex-1 sm:flex-none"
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
              <span className="text-xs uppercase tracking-wide font-medium">PNG Transparent</span>
            </div>
            <span className="text-xs uppercase tracking-wide font-medium hidden sm:inline">Carré automatique</span>
          </div>
          <div className="text-[10px] font-mono opacity-50">VER 2.1.0 // GITHUB_DEPLOY_SYNC</div>
        </footer>

      </div>
    </div>
  );
}
