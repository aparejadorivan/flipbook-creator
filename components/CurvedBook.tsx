'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Props {
  pages: string[]; current: number; ratio: number; width: number; height: number;
  scale: number; tilt: number; rotation: number; curvature: number; gloss: number;
  focus: 'center' | 'left' | 'right'; pan: { x: number; y: number }; shadow: number; speed: number;
  onReady: () => void; onError: () => void; onBusy: (busy: boolean) => void;
  onNext: () => void; onPrev: () => void;
}

/** A subdivided sheet: its cross-section has an actual arch, not a shaded flat image. */
function bend(geometry: THREE.PlaneGeometry, pageWidth: number, curve: number, side: number, turn = 0, depth = 0) {
  const positions = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    const t = uv.getX(i);
    const v = uv.getY(i);
    const arch = curve * 150 * Math.sin(Math.PI * t) * Math.exp(-2.5 * t);
    const corner = curve * 9 * t * t * Math.pow(Math.abs(v - .5) * 2, 3);
    // The fore-edge follows the spine with a slight delay while a sheet turns.
    const angle = turn + Math.sin(turn) * .48 * Math.sin(Math.PI * t);
    const x = side * (pageWidth * t * Math.cos(angle) - arch * Math.sin(angle));
    const z = pageWidth * t * Math.sin(angle) + arch * Math.cos(angle) * Math.cos(turn) + corner + depth;
    const shade = 1 - curve * .37 * Math.exp(-t * 22);
    const colors = geometry.attributes.color;
    if (colors) colors.setXYZ(i, shade, shade, shade);
    positions.setXYZ(i, x, (v - .5) * 600 + Math.sin(turn) * 12 * t * (v - .5), z);
  }
  positions.needsUpdate = true;
  if (geometry.attributes.color) geometry.attributes.color.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

export default function CurvedBook(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { latest.current.onError(); return; }
    let disposed = false;
    let frame = 0;
    let dirty = true;
    let lastSettings = '';
    let shown = latest.current.current;
    let transition: { from: number; to: number; start: number; duration: number } | null = null;
    let requested = shown;
    let requestId = 0;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, .04);
    scene.environment = environment.texture;
    room.dispose(); pmrem.dispose();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 6000);
    camera.position.z = 1800;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Libro 3D con páginas curvas');
    renderer.domElement.setAttribute('role', 'img');
    const assembly = new THREE.Group();
    const book = new THREE.Group();
    assembly.add(book); scene.add(assembly);
    // La suma de las luces se mantiene por debajo de 1 para que el papel blanco no
    // sature: por encima de 1 todo lo que no es negro puro se levanta y se pierde
    // contraste en el texto.
    scene.add(new THREE.AmbientLight(0xffffff, .18));
    const key = new THREE.DirectionalLight(0xfff5e8, .62);
    key.position.set(-350, 700, 1100); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = key.shadow.camera.bottom = -1200;
    key.shadow.camera.right = key.shadow.camera.top = 1200;
    key.shadow.camera.near = 10; key.shadow.camera.far = 3500;
    key.shadow.bias = -.00015; key.shadow.normalBias = 1.5; key.shadow.radius = 4;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe7f0ff, .10);
    fill.position.set(600, -100, 800); scene.add(fill);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: .3 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), floorMaterial);
    floor.position.z = -22; floor.receiveShadow = true; book.add(floor);
    const pageWidth = props.ratio * 600;
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext('2d')!;
    const gradient = shadowContext.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(25,20,12,0.5)'); gradient.addColorStop(.7, 'rgba(25,20,12,0.2)'); gradient.addColorStop(1, 'rgba(25,20,12,0)');
    shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(pageWidth * 2.65, 830), contactMaterial);
    contact.position.set(0, -12, -16); book.add(contact);
    const geometries: THREE.PlaneGeometry[] = [];
    const materials: THREE.Material[] = [floorMaterial];
    const textures = new Map<number, THREE.Texture>();
    const pending = new Map<number, Promise<THREE.Texture | null>>();
    const loader = new THREE.TextureLoader();
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    // El PDF se rasteriza a 2600 px de lado mayor, pero la página casi siempre se ve
    // mucho más pequeña. Dejar que la GPU resuelva esa diferencia con mipmaps borraba
    // el texto: promedia en espacio lineal, y el promedio lineal de un trazo negro fino
    // sobre papel blanco sale casi blanco. Quitar los mipmaps lo devuelve, pero a costa
    // de aliasing. La salida es no tener que reducir: se construye la textura al tamaño
    // al que se va a ver, encogiendo en un canvas 2D (que filtra en gamma, como el
    // navegador) y se rehace cuando el zoom cambia de verdad.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let builtHeight = 0;
    function wantedHeight() {
      // 600 es la altura de la hoja en unidades de escena, y una unidad es un píxel CSS.
      // El margen de 1.6 deja aire para acercarse un poco sin rehacer nada.
      return Math.round(Math.min(2048, Math.max(384, 600 * latest.current.scale * dpr * 1.6)));
    }
    function buildTexture(image: HTMLImageElement, height: number): THREE.Texture {
      const sourceWidth = image.naturalWidth || image.width;
      const sourceHeight = image.naturalHeight || image.height;
      const target = Math.min(height, sourceHeight);
      const canvas = document.createElement('canvas');
      canvas.height = Math.max(1, target);
      canvas.width = Math.max(1, Math.round(sourceWidth * (target / Math.max(1, sourceHeight))));
      const context = canvas.getContext('2d');
      if (!context) {
        const plain = new THREE.Texture(image);
        plain.colorSpace = THREE.SRGBColorSpace;
        plain.anisotropy = maxAnisotropy;
        plain.needsUpdate = true;
        return plain;
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAnisotropy;
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }
    function texture(index: number): Promise<THREE.Texture | null> {
      if (index < 0 || index >= props.pages.length) return Promise.resolve(null);
      if (textures.has(index)) return Promise.resolve(textures.get(index)!);
      if (pending.has(index)) return pending.get(index)!;
      const height = builtHeight || (builtHeight = wantedHeight());
      // No se guarda la imagen original: con 150 páginas decodificadas en memoria el
      // consumo se dispara. Volver a cargarla desde su blob cuando hace falta es barato.
      const ready = new Promise<HTMLImageElement>((resolve, reject) => {
        loader.load(props.pages[index], loaded => {
          const image = loaded.image as HTMLImageElement;
          loaded.dispose();
          resolve(image);
        }, undefined, reject);
      });
      const task = ready.then(image => {
        if (disposed) return null;
        const tex = buildTexture(image, height);
        textures.set(index, tex); pending.delete(index); dirty = true;
        return tex;
      });
      pending.set(index, task); return task;
    }
    function rebuildTextures() {
      builtHeight = wantedHeight();
      for (const tex of textures.values()) tex.dispose();
      textures.clear();
      // assign() se salta el trabajo si el índice no ha cambiado, así que hay que
      // soltar los mapas actuales para que vuelva a tomarlos.
      [left, right, movingFront, movingBack].forEach(item => {
        item.material.map?.dispose();
        item.material.map = null;
        item.material.needsUpdate = true;
      });
      void prepare(shown, true);
    }
    function sheet(side: number, reverse = false, depth = 0) {
      const geometry = new THREE.PlaneGeometry(1, 1, 72, 12);
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 3).fill(1), 3));
      geometries.push(geometry);
      // Geometry runs outwards from the spine. Reverse the left sheet's image UVs.
      const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, envMapIntensity: .04, specularIntensity: .25, roughness: .55, metalness: 0, clearcoat: .2, clearcoatRoughness: .45, side: reverse ? THREE.BackSide : side < 0 ? THREE.BackSide : THREE.FrontSide });
      materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true; mesh.receiveShadow = true; book.add(mesh);
      return { geometry, material, mesh, side, depth };
    }
    const left = sheet(-1);
    const right = sheet(1);
    const movingFront = sheet(1);
    const movingBack = sheet(1, true);
    movingFront.mesh.visible = movingBack.mesh.visible = false;
    // Thin layered edges follow the same cross-section as the printed surface.
    const layers = [-1, 1].flatMap(side => Array.from({ length: 9 }, (_, i) => {
      const item = sheet(side, false, -1.2 - i * 1.2);
      item.material.color.set(i === 8 ? '#454b40' : i % 2 ? '#c6c1b5' : '#f4efe2');
      item.material.roughness = .85; item.material.clearcoat = 0;
      item.mesh.castShadow = i === 8;
      return item;
    }));
    function indices(index: number): [number, number] {
      if (index === 0) return [-1, 0];
      const start = index % 2 === 0 ? index - 1 : index;
      return [start, start + 1 < props.pages.length ? start + 1 : -1];
    }
    function assign(item: ReturnType<typeof sheet>, index: number, mirror: boolean) {
      item.mesh.visible = index >= 0;
      const original = textures.get(index);
      // A per-material texture transform is needed for the reverse side of the leaf.
      const old = item.material.map;
      if (old?.userData.index === index && old.userData.mirror === mirror) return;
      old?.dispose();
      item.material.map = original ? original.clone() : null;
      if (item.material.map) {
        item.material.map.userData = { index, mirror };
        item.material.map.repeat.x = mirror ? -1 : 1;
        item.material.map.offset.x = mirror ? 1 : 0;
        item.material.map.needsUpdate = true;
      }
      item.material.needsUpdate = true;
    }
    function settled(index: number) {
      const [l, r] = indices(index);
      assign(left, l, true); assign(right, r, false);
      movingFront.mesh.visible = movingBack.mesh.visible = false;
      layers.forEach(item => { item.mesh.visible = item.side < 0 ? l >= 0 : r >= 0; });
      // Bound GPU memory to the current spread and nearby pages.
      for (const [id, tex] of Array.from(textures)) if (Math.abs(id - index) > 5) { tex.dispose(); textures.delete(id); }
    }
    async function prepare(to: number, initial = false) {
      const id = ++requestId;
      latest.current.onBusy(true);
      const needed = new Set([...indices(shown), ...indices(to)]);
      try {
        await Promise.all(Array.from(needed, texture));
        if (disposed || id !== requestId) return;
        if (initial || to === shown) { shown = to; settled(to); latest.current.onBusy(false); }
        else {
          transition = { from: shown, to, start: performance.now(), duration: latest.current.speed };
          const forward = to > shown;
          const before = indices(shown); const after = indices(to);
          assign(left, forward ? before[0] : after[0], true);
          assign(right, forward ? after[1] : before[1], false);
          assign(movingFront, forward ? before[1] : after[1], false);
          assign(movingBack, forward ? after[0] : before[0], true);
          layers.forEach(item => { item.mesh.visible = item.side < 0 ? before[0] >= 0 || after[0] >= 0 : before[1] >= 0 || after[1] >= 0; });
        }
        dirty = true; latest.current.onReady();
      } catch { if (!disposed) latest.current.onError(); }
    }
    void prepare(shown, true);
    const contextLost = (e: Event) => { e.preventDefault(); latest.current.onError(); };
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    function tick(now: number) {
      if (disposed) return;
      frame = requestAnimationFrame(tick);
      const p = latest.current;
      if (p.current !== requested) { requested = p.current; void prepare(requested); }
      const settings = [p.width, p.height, p.scale, p.tilt, p.rotation, p.focus, p.pan.x, p.pan.y, p.curvature, p.gloss, p.shadow].join(',');
      if (settings !== lastSettings) {
        lastSettings = settings; dirty = true;
        const w = Math.max(1, p.width), h = Math.max(1, p.height);
        const size = renderer.getSize(new THREE.Vector2());
        if (size.x !== Math.round(w) || size.y !== Math.round(h)) renderer.setSize(w, h, false);
        camera.aspect = w / h; camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 3600)); camera.updateProjectionMatrix();
        assembly.position.set(p.pan.x / 100 * w, -p.pan.y / 100 * h, 0);
        assembly.scale.setScalar(p.scale);
        assembly.rotation.set(-THREE.MathUtils.degToRad(p.tilt), THREE.MathUtils.degToRad(p.rotation), THREE.MathUtils.degToRad(3));
        book.position.x = p.focus === 'left' ? pageWidth / 2 : p.focus === 'right' ? -pageWidth / 2 : 0;
        floorMaterial.opacity = p.shadow / 150; contactMaterial.opacity = p.shadow / 100;
        [left, right, ...layers].forEach(item => bend(item.geometry, pageWidth, p.curvature / 100, item.side, 0, item.depth));
        [left, right, movingFront, movingBack].forEach(item => {
          item.material.clearcoat = p.gloss / 250;
          item.material.roughness = .85 - p.gloss / 220;
          item.material.clearcoatRoughness = .6 - p.gloss / 220;
        });
      }
      // Si el zoom ha cambiado lo bastante, la textura deja de corresponder al tamaño
      // en pantalla: se rehace, pero nunca en mitad de un paso de página.
      if (!transition && builtHeight) {
        const want = wantedHeight();
        if (want > builtHeight * 1.5 || want < builtHeight * .55) rebuildTextures();
      }
      if (transition) {
        const t = Math.min(1, (now - transition.start) / transition.duration);
        const eased = t * t * (3 - 2 * t);
        const angle = (transition.to > transition.from ? eased : 1 - eased) * Math.PI;
        bend(movingFront.geometry, pageWidth, p.curvature / 100, 1, angle, .5);
        bend(movingBack.geometry, pageWidth, p.curvature / 100, 1, angle, .5);
        dirty = true;
        if (t === 1) { shown = transition.to; transition = null; settled(shown); p.onBusy(false); }
      }
      if (dirty) { renderer.render(scene, camera); dirty = false; }
    }
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true; requestId++; cancelAnimationFrame(frame);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      geometries.forEach(g => g.dispose()); floor.geometry.dispose();
      [left, right, movingFront, movingBack].forEach(item => item.material.map?.dispose());
      materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      contact.geometry.dispose(); contactMaterial.dispose(); shadowTexture.dispose(); environment.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [props.pages, props.ratio]);

  return <div ref={host} className="curved-book" data-page={props.current + 1} data-camera={[props.scale, props.tilt, props.rotation, props.focus, props.pan.x, props.pan.y].join(",")}
    onPointerDown={e => { pointer.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerCancel={() => { pointer.current = null; }}
    onPointerUp={e => {
      const start = pointer.current; pointer.current = null; if (!start) return;
      const dx = e.clientX - start.x;
      if (Math.abs(e.clientY - start.y) > Math.max(40, Math.abs(dx))) return;
      if (Math.abs(dx) > 25) { if (dx < 0) props.onNext(); else props.onPrev(); }
      else { const bounds = e.currentTarget.getBoundingClientRect(); if (e.clientX > bounds.left + bounds.width / 2) props.onNext(); else props.onPrev(); }
    }}/>;
}



