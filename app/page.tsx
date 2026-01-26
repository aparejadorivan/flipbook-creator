'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { BookOpen, Upload, Sparkles, Download, Maximize2, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import FlipbookViewer from '@/components/FlipbookViewer';

export default function Home() {
  const [pages, setPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const processPDF = async (file: File) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setError(null);
    setFileName(file.name);

    try {
      // Dynamic import of PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const totalPages = pdf.numPages;
      const renderedPages: string[] = [];
      
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 2; // Higher scale for better quality
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        const imageData = canvas.toDataURL('image/jpeg', 0.92);
        renderedPages.push(imageData);
        
        setLoadingProgress(Math.round((i / totalPages) * 100));
      }
      
      setPages(renderedPages);
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Error al procesar el PDF. Asegúrate de que el archivo no está dañado o protegido.');
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'application/pdf') {
      processPDF(file);
    } else {
      setError('Por favor, selecciona un archivo PDF válido.');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const resetApp = () => {
    setPages([]);
    setFileName('');
    setError(null);
    setLoadingProgress(0);
  };

  return (
    <main className="min-h-screen py-8 px-4">
      {/* Header */}
      <header className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-3 mb-4">
          <BookOpen className="w-10 h-10 text-gold" />
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
            Flipbook <span className="text-gold">Creator</span>
          </h1>
        </div>
        <p className="text-cream/70 text-lg max-w-2xl mx-auto">
          Transforma tus documentos PDF en elegantes libros interactivos. 
          <br className="hidden md:block" />
          Procesamiento local, sin enviar datos a ningún servidor.
        </p>
      </header>

      {/* Main Content */}
      {pages.length === 0 ? (
        <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {/* Upload Zone */}
          <div
            {...getRootProps()}
            className={`dropzone p-12 text-center cursor-pointer ${
              isDragActive ? 'dropzone-active' : ''
            }`}
          >
            <input {...getInputProps()} />
            
            {isLoading ? (
              <div className="space-y-6">
                <Loader2 className="w-16 h-16 mx-auto text-gold animate-spin" />
                <div>
                  <p className="text-xl font-semibold mb-2">Procesando PDF...</p>
                  <p className="text-cream/60 mb-4">{fileName}</p>
                  <div className="progress-bar max-w-xs mx-auto">
                    <div 
                      className="progress-bar-fill" 
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                  <p className="text-gold mt-2">{loadingProgress}%</p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gold/20 to-burgundy/20 flex items-center justify-center mb-4">
                    <Upload className="w-10 h-10 text-gold" />
                  </div>
                  <h2 className="font-display text-2xl font-semibold mb-2">
                    {isDragActive ? '¡Suelta el archivo aquí!' : 'Arrastra tu PDF aquí'}
                  </h2>
                  <p className="text-cream/60">
                    o haz clic para seleccionar un archivo
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-cream/50">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Alta calidad
                  </span>
                  <span>•</span>
                  <span>Procesamiento local</span>
                  <span>•</span>
                  <span>Sin límites de tamaño</span>
                </div>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
              {error}
            </div>
          )}

          {/* Features */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '📖',
                title: 'Efecto realista',
                desc: 'Animación de paso de página con física natural',
              },
              {
                icon: '🔒',
                title: '100% Privado',
                desc: 'Todo se procesa en tu navegador',
              },
              {
                icon: '⚡',
                title: 'Sin esperas',
                desc: 'Conversión instantánea sin colas',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-xl bg-white/5 backdrop-blur border border-white/10 text-center"
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-cream/60">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          {/* Back button */}
          <div className="max-w-6xl mx-auto mb-6">
            <button onClick={resetApp} className="btn-secondary flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" />
              Cargar otro PDF
            </button>
          </div>

          {/* File info */}
          <div className="text-center mb-6">
            <h2 className="font-display text-2xl font-semibold">{fileName}</h2>
            <p className="text-cream/60">{pages.length} páginas</p>
          </div>

          {/* Flipbook Viewer */}
          <FlipbookViewer pages={pages} />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-16 text-center text-cream/40 text-sm">
        <p>
          Creado con ❤️ usando Next.js, PDF.js y PageFlip
        </p>
      </footer>
    </main>
  );
}
