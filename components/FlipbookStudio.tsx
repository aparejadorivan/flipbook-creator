'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Upload, ChevronLeft, ChevronRight, Box, SlidersHorizontal, Play, Pause, Maximize, EyeOff, X, RotateCcw, Download, ShieldCheck, Check, Film } from 'lucide-react';
import type { PageFlip } from 'page-flip';
import dynamic from 'next/dynamic';
const CurvedBook = dynamic(() => import('./CurvedBook'), { ssr: false });

const palettes = [
  { id: 'sand', name: 'Beige', color: '#d9d2c5' },
  { id: 'slate', name: 'Gris oscuro', color: '#383f43' },
  { id: 'rose', name: 'Rosa', color: '#d6b3a5' },
  { id: 'sage', name: 'Verde', color: '#b9c2b2' },
  { id: 'white', name: 'Gris claro', color: '#f3f2f1' },
  { id: 'green', name: 'Croma verde', color: '#00b140' },
];

const demoDoc = [
  { title: ['Documento', 'de muestra'], lines: [] },
  { title: ['Importar'], lines: ['Arrastra un PDF sobre la escena', 'o pulsa Importar PDF.', '', 'Hasta 100 MB y 150 páginas.'] },
  { title: ['Proceso local'], lines: ['El PDF se convierte en imagenes', 'dentro de tu navegador.', '', 'No se sube a ningún servidor.'] },
  { title: ['Punto de vista'], lines: ['Ajusta inclinación, giro', 'y curvatura del papel.', '', 'El encuadre no cambia', 'al pasar página.'] },
  { title: ['Fondo y sombra'], lines: ['Elige el color de fondo', 'y la intensidad de la sombra.', '', 'Croma verde para recortar', 'después en el montaje.'] },
  { title: ['Movimiento'], lines: ['Velocidad del paso de página', 'y autopase cada 3 a 15 s.'] },
  { title: ['Grabar'], lines: ['Pulsa H para ocultar la interfaz', 'y graba con tu capturador.', '', 'Esc vuelve al estudio.'] },
  { title: ['Fin del', 'documento'], lines: [] },
];

function demoPages() {
  return demoDoc.map((page, i) => {
    const dark = i === 0 || i === demoDoc.length - 1;
    const ink = dark ? '#ffffff' : '#0b0c0c';
    const soft = dark ? '#c9cbcb' : '#505a5f';
    const size = page.lines.length ? 40 : 54;
    const titles = page.title.map((t, n) => `<text x="52" y="${(page.lines.length ? 120 : 236) + n * (size + 10)}" font-size="${size}" font-weight="bold" fill="${ink}">${t}</text>`).join('');
    const body = page.lines.map((line, n) => line ? `<text x="52" y="${232 + n * 34}" font-size="19" fill="${ink}">${line}</text>` : '').join('');
    const rule = `<rect x="52" y="${page.lines.length ? 146 : 150}" width="96" height="8" fill="#1d70b8"/>`;
    const foot = dark ? '' : `<text x="52" y="800" font-size="16" fill="${soft}">Folio</text><text x="534" y="800" font-size="16" fill="${soft}">${i + 1}</text>`;
    const sub = i === 0 ? `<text x="52" y="${236 + page.title.length * 64 + 28}" font-size="19" fill="${soft}">Folio · Flipbook Studio</text>` : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="850" viewBox="0 0 600 850"><rect width="600" height="850" fill="${dark ? '#0b0c0c' : '#ffffff'}"/><g font-family="Arial, sans-serif">${rule}${titles}${sub}${body}${foot}</g></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export default function FlipbookStudio() {
  const [pages, setPages] = useState<string[]>(demoPages);
  const [name, setName] = useState('Documento de muestra');
  const [demo, setDemo] = useState(true);
  const [ratio, setRatio] = useState(600 / 850);
  const [current, setCurrent] = useState(0);
  const [mode3d, setMode3d] = useState(true);
  const [tilt, setTilt] = useState(52);
  const [curvature, setCurvature] = useState(85);
  const [gloss, setGloss] = useState(45);
  const busy3d = useRef(false);
  const [rotation, setRotation] = useState(-17);
  const [zoom, setZoom] = useState(90);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [focus, setFocus] = useState<'center' | 'left' | 'right'>('center');
  const panGesture = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const changeZoom = useCallback((delta: number) => setZoom(z => Math.max(50, Math.min(300, z + delta))), []);
  const [shadow, setShadow] = useState(65);
  const [background, setBackground] = useState('sand');
  const [format, setFormat] = useState('16:9');
  const [clean, setClean] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [interval, setIntervalSeconds] = useState(5);
  const [speed, setSpeed] = useState(1100);
  const [guides, setGuides] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [area, setArea] = useState({ width: 800, height: 600 });
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const flip = useRef<PageFlip | null>(null);
  const pageRef = useRef(0);
  const gesture = useRef<{ x: number; y: number } | null>(null);
  const urls = useRef<string[]>([]);
  const generation = useRef(0);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setArea({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1);
      changeZoom(-Math.max(-15, Math.min(15, delta * .12)));
    };
    stage.addEventListener('wheel', wheel, { passive: false });
    return () => stage.removeEventListener('wheel', wheel);
  }, [changeZoom]);

  useEffect(() => {
    let disposed = false;
    let instance: PageFlip | null = null;
    if (mode3d) { setReady(false); return; }
    const host = hostRef.current;
    if (!host) return;
    setReady(false);
    import('page-flip').then(({ PageFlip }) => {
      if (disposed) return;
      const book = document.createElement('div');
      book.className = 'physical-book';
      host.appendChild(book);
      const elements = pages.map((src, i) => {
        const page = document.createElement('div');
        page.className = 'paper';
        page.dataset.density = i === 0 || i === pages.length - 1 ? 'hard' : 'soft';
        const img = document.createElement('img');
        img.src = src; img.alt = `Página ${i + 1}`; img.draggable = false;
        page.appendChild(img); book.appendChild(page);
        return page;
      });
      instance = new PageFlip(book, { width: 600 * ratio, height: 600, size: 'fixed', showCover: true, usePortrait: false, autoSize: false, drawShadow: true, maxShadowOpacity: .65, flippingTime: speed, showPageCorners: true, mobileScrollSupport: false, useMouseEvents: false, startPage: Math.min(pageRef.current, pages.length - 1) });
      instance.on('flip', e => { pageRef.current = e.data; setCurrent(e.data); });
      instance.loadFromHTML(elements);
      flip.current = instance;
      setReady(true);
    }).catch(() => setError('No se ha podido iniciar el visor. Recarga la página.'));
    return () => { disposed = true; instance?.destroy(); host.replaceChildren(); flip.current = null; };
  }, [pages, ratio, speed, mode3d]);

  const lastSpread = pages.length % 2 === 0 ? pages.length - 1 : Math.max(0, pages.length - 2);
  const goToPage = useCallback((index: number) => {
    if (!mode3d) { flip.current?.flip(index); return; }
    if (busy3d.current) return;
    const target = index === 0 ? 0 : index % 2 === 0 ? index - 1 : index;
    const bounded = Math.max(0, Math.min(lastSpread, target));
    if (bounded === pageRef.current) return;
    busy3d.current = true;
    pageRef.current = bounded; setCurrent(bounded);
  }, [mode3d, lastSpread]);
  const next = useCallback(() => {
    if (!mode3d) { flip.current?.flipNext(); return; }
    goToPage(pageRef.current === 0 ? 1 : pageRef.current + 2);
  }, [mode3d, goToPage]);
  const prev = useCallback(() => {
    if (!mode3d) { flip.current?.flipPrev(); return; }
    goToPage(pageRef.current <= 1 ? 0 : pageRef.current - 2);
  }, [mode3d, goToPage]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setClean(false); return; }
      if ((e.target as HTMLElement)?.matches('input, select, textarea')) return;
      if (e.code === 'Space' && (e.target as HTMLElement)?.matches('button')) return;
      if (e.key === '+' || e.key === '=') { e.preventDefault(); changeZoom(10); }
      if (e.key === '-') { e.preventDefault(); changeZoom(-10); }
      if (e.key === '0') { e.preventDefault(); setZoom(90); setPan({ x: 0, y: 0 }); setFocus('center'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
      if (e.key.toLowerCase() === 'h') setClean(c => !c);
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, changeZoom]);
  useEffect(() => {
    if (!playing || !ready) return;
    if (current >= lastSpread) { setPlaying(false); return; }
    const timer = window.setInterval(next, interval * 1000);
    return () => window.clearInterval(timer);
  }, [playing, current, lastSpread, interval, next, ready]);
  useEffect(() => () => { generation.current++; urls.current.forEach(URL.revokeObjectURL); }, []);

  async function loadFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { setError('Selecciona un archivo PDF.'); return; }
    if (file.size > 100 * 1024 * 1024) { setError('Elige un PDF de menos de 100 MB.'); return; }
    const token = ++generation.current;
    setLoading(0); setError(''); setPlaying(false);
    const newUrls: string[] = [];
    let task: import('pdfjs-dist').PDFDocumentLoadingTask | undefined;
    let pdf: import('pdfjs-dist').PDFDocumentProxy | undefined;
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      task = pdfjs.getDocument({ data: await file.arrayBuffer() });
      pdf = await task.promise;
      if (pdf.numPages > 150) throw new Error('too-many-pages');
      let aspect = ratio;
      for (let i = 1; i <= pdf.numPages; i++) {
        if (token !== generation.current) throw new Error('cancelled');
        const page = await pdf.getPage(i);
        const original = page.getViewport({ scale: 1 });
        if (i === 1) aspect = original.width / original.height;
        const viewport = page.getViewport({ scale: 2600 / Math.max(original.width, original.height) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        if (!canvas.getContext('2d')) throw new Error('canvas');
        await page.render({ canvas, viewport, background: '#ffffff' }).promise;
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('image')), 'image/jpeg', .94));
        newUrls.push(URL.createObjectURL(blob));
        canvas.width = canvas.height = 0; page.cleanup();
        if (token === generation.current) setLoading(Math.round(i / pdf.numPages * 100));
      }
      if (token !== generation.current) throw new Error('cancelled');
      const oldUrls = urls.current; urls.current = newUrls;
      pageRef.current = 0; setCurrent(0); setRatio(aspect); setPages(newUrls); setName(file.name.replace(/\.pdf$/i, '')); setDemo(false);
      oldUrls.forEach(URL.revokeObjectURL);
    } catch (e) {
      newUrls.forEach(URL.revokeObjectURL);
      if (token === generation.current) setError(e instanceof Error && e.message === 'too-many-pages' ? 'Para mantener el estudio fluido, utiliza un PDF de hasta 150 páginas.' : 'No se ha podido abrir el PDF. Comprueba que no esté dañado ni protegido con contraseña.');
    } finally { await task?.destroy(); if (token === generation.current) setLoading(null); }
  }

  const scale = Math.min(area.width * .78 / (1200 * ratio), area.height * .73 / 600) * zoom / 90;
  const reset = () => { setPan({ x: 0, y: 0 }); setFocus('center'); setTilt(52); setCurvature(85); setGloss(45); setRotation(-17); setZoom(90); setShadow(65); setBackground('sand'); setSpeed(1100); };
  return <main className={`studio ${clean ? 'is-clean' : ''}`}>
    <header className="topbar"><a href="/" className="brand"><span className="brand-icon"><BookOpen size={22}/></span>folio<span className="brand-divider"/> <span className="brand-sub">FLIPBOOK STUDIO</span></a><span className="local-badge">El PDF no sale de tu equipo</span><button className="primary" onClick={() => fileRef.current?.click()} disabled={loading !== null}><Upload size={16}/> Importar PDF</button></header>
    <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={e => { void loadFile(e.target.files?.[0]); e.target.value = ''; }}/>
    <div className="workspace">
      <section className="preview-column">
        <div className="workspace-heading"><div><h1>Presenta un PDF como un libro</h1><p>Importa el documento, ajusta la escena y grábala con tu capturador de pantalla.</p></div></div>
        <div className="canvas-toolbar"><div className="segmented"><button className={!mode3d ? 'selected' : ''} onClick={() => setMode3d(false)}><BookOpen size={15}/> Lectura</button><button className={mode3d ? 'selected' : ''} onClick={() => setMode3d(true)}><Box size={15}/> Escena 3D</button></div><div className="toolbar-right"><span>ENCUADRE</span><select aria-label="Formato del encuadre" value={format} onChange={e => setFormat(e.target.value)}><option>16:9</option><option>9:16</option><option>1:1</option><option>4:5</option></select><button className="icon-button" title="Pantalla completa" aria-label="Pantalla completa" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => setError('No se pudo activar la pantalla completa.')); }}><Maximize size={17}/></button></div></div>
        <div className="stage-surround">
          <div ref={stageRef} data-format={format} className={`stage bg-${background} ${guides && !clean ? 'with-guides' : ''}`} onPointerDownCapture={e => {
            if (!e.shiftKey && e.button !== 1) return;
            e.preventDefault(); e.stopPropagation();
            panGesture.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }} onPointerMove={e => {
            const start = panGesture.current;
            if (!start) return;
            setPan({ x: start.px + (e.clientX - start.x) / area.width * 100, y: start.py + (e.clientY - start.y) / area.height * 100 });
          }} onPointerUpCapture={e => {
            if (!panGesture.current) return;
            e.stopPropagation(); panGesture.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
          }} onPointerCancel={() => { panGesture.current = null; }} style={{ aspectRatio: format.replace(':', '/') }} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (loading === null) void loadFile(e.dataTransfer.files[0]); }}>
            {!clean && <div className="stage-label"><span/> Vista previa <span className="stage-label-line"/> {mode3d ? 'Perspectiva' : 'Frontal'}</div>}
            {mode3d ? <CurvedBook pages={pages} current={current} ratio={ratio} width={area.width} height={area.height} scale={scale} tilt={tilt} rotation={rotation} curvature={curvature} gloss={gloss} focus={focus} pan={pan} shadow={shadow} speed={speed} onReady={() => setReady(true)} onBusy={value => { busy3d.current = value; }} onError={() => { busy3d.current = false; setMode3d(false); setError('La vista 3D no está disponible. Se ha activado el modo Lectura.'); }} onNext={next} onPrev={prev}/> : <div className="book-position" style={{ left: `${50 + pan.x}%`, top: `${49 + pan.y}%`, width: 1200 * ratio, height: 600, transform: `translate(-50%, -50%) scale(${scale})` }}>
              <div className="book-angle" style={{ transform: `rotateX(${mode3d ? tilt : 0}deg) rotateY(${mode3d ? rotation : 0}deg) rotateZ(${mode3d ? -3 : 0}deg) translateX(${focus === 'right' ? -300 * ratio : focus === 'left' ? 300 * ratio : 0}px)`, filter: `drop-shadow(12px 35px 22px rgba(24,20,15,${shadow / 170}))` }}><div ref={hostRef} className="book-host" onPointerDown={e => { gesture.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerCancel={() => { gesture.current = null; }} onPointerUp={e => { const start = gesture.current; gesture.current = null; if (!start) return; const dx = e.clientX - start.x; if (Math.abs(e.clientY - start.y) > Math.max(40, Math.abs(dx))) return; if (Math.abs(dx) > 25) { if (dx < 0) next(); else prev(); } else { const bounds = e.currentTarget.getBoundingClientRect(); if (e.clientX > bounds.left + bounds.width / 2) next(); else prev(); } }}/> </div>
            </div>
            }
            {!clean && <div className="stage-bottom"><span>{demo ? 'Documento de muestra' : 'PDF local'} · {pages.length} páginas</span><span>Haz clic o desliza para pasar página</span></div>}
            {loading !== null && <div className="loading-overlay" role="status"><span className="loading-orbit"/><h2>Procesando el PDF</h2><p>{loading}% · en tu navegador</p><progress max={100} value={loading}/></div>}
          </div>
        </div>
        <div className="transport"><div className="document-info"><span className="file-icon"><BookOpen size={19}/></span><div><strong>{name}</strong><span>{demo ? 'Importa un PDF para sustituirlo' : `${pages.length} páginas`}</span></div></div><div className="page-controls"><button className="icon-button" aria-label="Página anterior" disabled={!ready || current === 0} onClick={prev}><ChevronLeft size={19}/></button><span><b>{String(current + 1).padStart(2, '0')}</b> / {String(pages.length).padStart(2, '0')}</span><button className="icon-button" aria-label="Página siguiente" disabled={!ready || current >= lastSpread} onClick={next}><ChevronRight size={19}/></button></div><button className={`play-button ${playing ? 'active' : ''}`} title={playing ? 'Pausar' : 'Pasar páginas automáticamente'} aria-label={playing ? 'Pausar' : 'Reproducir'} disabled={!ready || current >= lastSpread} onClick={() => setPlaying(p => !p)}>{playing ? <Pause size={16}/> : <Play size={16}/>}</button></div>
        <div className="filmstrip">{pages.map((src, i) => <button key={src} className={`thumbnail ${current === i ? 'active' : ''}`} aria-label={`Ir a página ${i + 1}`} aria-current={current === i ? 'page' : undefined} onClick={() => goToPage(i)}><img src={src} alt={`Miniatura ${i + 1}`}/><span>{String(i + 1).padStart(2, '0')}</span></button>)}</div>
        <div className="workspace-footer"><span><ShieldCheck size={16}/> Todo el proceso ocurre en tu navegador.</span><span><kbd>←</kbd><kbd>→</kbd> páginas <kbd>H</kbd> modo limpio <kbd>espacio</kbd> reproducir</span></div>
      </section>
      <aside className="inspector"><div className="inspector-title"><SlidersHorizontal size={17}/><h2>Escena</h2><button className="icon-button" title="Restablecer escena" aria-label="Restablecer escena" onClick={reset}><RotateCcw size={15}/></button></div>
        <section className="control-section"><div className="section-title"><span>01</span><h3>Punto de vista</h3><span className="tiny-badge">3D</span></div><div className="view-presets">{[{ label: 'Frontal', x: 0, y: 0 }, { label: 'Editorial', x: 16, y: -17 }, { label: 'Revista', x: 58, y: -22 }].map(p => <button key={p.label} className={mode3d && tilt === p.x && rotation === p.y ? 'active' : ''} onClick={() => { setMode3d(true); setTilt(p.x); setRotation(p.y); }}><span className="view-symbol" style={{ transform: `perspective(70px) rotateX(${p.x}deg) rotateY(${p.y}deg)` }}><BookOpen size={24}/></span>{p.label}</button>)}</div><Range label="Inclinación" value={tilt} min={0} max={72} suffix="°" disabled={!mode3d} onChange={setTilt}/><Range label="Curvatura del papel" value={curvature} min={0} max={150} suffix="%" disabled={!mode3d} onChange={setCurvature}/><Range label="Brillo satinado" value={gloss} min={0} max={100} suffix="%" disabled={!mode3d} onChange={setGloss}/><Range label="Giro horizontal" value={rotation} min={-50} max={50} suffix="°" disabled={!mode3d} onChange={setRotation}/><Range label="Acercamiento" value={Math.round(zoom)} min={50} max={300} suffix="%" onChange={setZoom}/><label className="control-label camera-focus-label" htmlFor="camera-focus">Encuadre fijo</label><select id="camera-focus" className="wide-select" value={focus} onChange={e => { setFocus(e.target.value as 'center' | 'left' | 'right'); setPan({ x: 0, y: 0 }); }}><option value="center">Libro completo</option><option value="left">Página izquierda</option><option value="right">Página derecha</option></select><p className="control-note">El encuadre no cambia al pasar página. Rueda o + / − para zoom. Mayús + arrastrar para mover. 0 restablece la vista.</p></section>
        <section className="control-section"><div className="section-title"><span>02</span><h3>Fondo y sombra</h3></div><label className="control-label">Fondo <span>{palettes.find(p => p.id === background)?.name}</span></label><div className="swatches">{palettes.map(p => <button key={p.id} className={background === p.id ? 'active' : ''} style={{ background: p.color }} title={p.name} aria-label={`Fondo ${p.name}`} aria-pressed={background === p.id} onClick={() => setBackground(p.id)}>{background === p.id && <Check size={17}/>}</button>)}</div><Range label="Intensidad de sombra" value={shadow} min={0} max={100} suffix="%" onChange={setShadow}/><p className="control-note">El fondo y la sombra solo afectan a la escena, no al PDF.</p></section>
        <section className="control-section"><div className="section-title"><span>03</span><h3>Movimiento</h3></div><label className="control-label" htmlFor="speed">Paso de página</label><select id="speed" className="wide-select" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={650}>Rápido · 0,65 s</option><option value={1100}>Normal · 1,1 s</option><option value={1800}>Lento · 1,8 s</option></select><Range label="Autopase cada" value={interval} min={3} max={15} suffix=" s" onChange={setIntervalSeconds}/></section>
        <section className="record-card"><span className="record-eyebrow"><Film size={15}/></span><h3>Grabar la escena</h3><p>Oculta la interfaz y graba con tu capturador de pantalla. La aplicación no exporta vídeo.</p><label className="toggle-row">Guías de encuadre <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)}/></label><button className="primary clean-button" onClick={() => setClean(true)}><EyeOff size={16}/> Entrar en modo limpio <kbd>H</kbd></button><span className="record-hint">Rueda: zoom · Mayús + arrastrar: mover · Esc: salir</span></section>
        <button className="download-button" onClick={() => { const a = document.createElement('a'); a.href = pages[current]; a.download = `pagina-${current + 1}.${demo ? 'svg' : 'jpg'}`; a.click(); }}><Download size={15}/> Descargar página actual</button>
      </aside>
    </div>
    {clean && <button className="exit-clean" onClick={() => setClean(false)} aria-label="Salir del modo limpio"><X size={18}/> Salir · Esc</button>}
    {error && <div className="error-toast" role="alert">{error}<button aria-label="Cerrar aviso" onClick={() => setError('')}><X size={16}/></button></div>}
  </main>;
}
function Range({ label, value, min, max, suffix, onChange, disabled = false }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void; disabled?: boolean }) {
  return <label className={`range-control ${disabled ? 'disabled' : ''}`}><span>{label}<output>{value}{suffix}</output></span><input type="range" min={min} max={max} value={value} disabled={disabled} onChange={e => onChange(Number(e.target.value))} style={{ backgroundSize: `${(value - min) / (max - min) * 100}% 100%` }}/></label>;
}



