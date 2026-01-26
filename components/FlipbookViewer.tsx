'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PageFlip } from 'page-flip';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface FlipbookViewerProps {
  pages: string[];
}

export default function FlipbookViewer({ pages }: FlipbookViewerProps) {
  const bookRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bookSize, setBookSize] = useState({ width: 400, height: 550 });

  // Calculate book size based on container
  const calculateSize = useCallback(() => {
    const maxWidth = isFullscreen ? window.innerWidth * 0.85 : Math.min(window.innerWidth * 0.9, 900);
    const maxHeight = isFullscreen ? window.innerHeight * 0.8 : Math.min(window.innerHeight * 0.6, 600);
    
    // Aspect ratio of typical PDF page (letter size)
    const aspectRatio = 0.77;
    
    let width = maxWidth / 2; // Each page is half the book width
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    setBookSize({ width: Math.round(width), height: Math.round(height) });
  }, [isFullscreen]);

  useEffect(() => {
    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, [calculateSize]);

  useEffect(() => {
    if (!bookRef.current || pages.length === 0) return;

    // Clean up previous instance
    if (pageFlipRef.current) {
      pageFlipRef.current.destroy();
    }

    // Wait for DOM update
    setTimeout(() => {
      if (!bookRef.current) return;

      const pageFlip = new PageFlip(bookRef.current, {
        width: bookSize.width,
        height: bookSize.height,
        size: 'stretch',
        minWidth: 300,
        maxWidth: 800,
        minHeight: 400,
        maxHeight: 900,
        maxShadowOpacity: 0.5,
        showCover: true,
        mobileScrollSupport: true,
        clickEventForward: true,
        useMouseEvents: true,
        swipeDistance: 30,
        showPageCorners: true,
        disableFlipByClick: false,
        flippingTime: 800,
        usePortrait: true,
        startZIndex: 0,
        autoSize: true,
        drawShadow: true,
        startPage: 0,
      });

      // Get all page elements
      const pageElements = bookRef.current.querySelectorAll('.page');
      if (pageElements.length > 0) {
        pageFlip.loadFromHTML(pageElements as NodeListOf<HTMLElement>);
      }

      pageFlip.on('flip', (e) => {
        setCurrentPage(e.data);
      });

      setTotalPages(pages.length);
      pageFlipRef.current = pageFlip;
    }, 100);

    return () => {
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
        pageFlipRef.current = null;
      }
    };
  }, [pages, bookSize]);

  const goToPrev = () => {
    pageFlipRef.current?.flipPrev();
  };

  const goToNext = () => {
    pageFlipRef.current?.flipNext();
  };

  const goToPage = (pageNum: number) => {
    pageFlipRef.current?.flip(pageNum);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const downloadCurrentPage = () => {
    const link = document.createElement('a');
    link.download = `page-${currentPage + 1}.jpg`;
    link.href = pages[currentPage];
    link.click();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen]);

  const containerClass = isFullscreen
    ? 'fullscreen-container'
    : 'max-w-6xl mx-auto';

  return (
    <div className={containerClass}>
      {/* Fullscreen close button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-50 nav-btn"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      {/* Flipbook container */}
      <div className="flipbook-container flex items-center justify-center gap-4 mb-6">
        {/* Previous button */}
        <button
          onClick={goToPrev}
          disabled={currentPage === 0}
          className="nav-btn hidden md:flex"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Book */}
        <div 
          className="relative"
          style={{ 
            width: bookSize.width * 2 + 20,
            height: bookSize.height + 20,
          }}
        >
          <div 
            ref={bookRef} 
            className="flipbook mx-auto"
            style={{
              width: bookSize.width * 2,
              height: bookSize.height,
            }}
          >
            {pages.map((page, index) => (
              <div 
                key={index} 
                className="page"
                data-density={index === 0 || index === pages.length - 1 ? 'hard' : 'soft'}
              >
                <div className="page-content w-full h-full overflow-hidden">
                  <img
                    src={page}
                    alt={`Página ${index + 1}`}
                    className="w-full h-full object-contain bg-white"
                    style={{ 
                      boxShadow: 'inset 0 0 30px rgba(0,0,0,0.05)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Book shadow */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-4 bg-black/30 blur-xl rounded-full"
            style={{ zIndex: -1 }}
          />
        </div>

        {/* Next button */}
        <button
          onClick={goToNext}
          disabled={currentPage >= totalPages - 1}
          className="nav-btn hidden md:flex"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        {/* Page indicator */}
        <div className="flex items-center gap-4 text-cream/80">
          <span className="font-display text-lg">
            Página <span className="text-gold font-bold">{currentPage + 1}</span> de {totalPages}
          </span>
        </div>

        {/* Mobile navigation */}
        <div className="flex md:hidden items-center gap-4">
          <button
            onClick={goToPrev}
            disabled={currentPage === 0}
            className="nav-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentPage >= totalPages - 1}
            className="nav-btn"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="btn-secondary flex items-center gap-2"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                Salir
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                Pantalla completa
              </>
            )}
          </button>
          <button
            onClick={downloadCurrentPage}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Descargar página
          </button>
        </div>

        {/* Thumbnail navigation */}
        <div className="thumbnail-strip max-w-full mt-4">
          {pages.map((page, index) => (
            <button
              key={index}
              onClick={() => goToPage(index)}
              className={`thumbnail ${index === currentPage ? 'active' : ''}`}
            >
              <img src={page} alt={`Miniatura ${index + 1}`} />
            </button>
          ))}
        </div>

        {/* Keyboard hints */}
        <p className="text-cream/40 text-sm mt-2">
          Usa las teclas ← → para navegar
        </p>
      </div>
    </div>
  );
}
