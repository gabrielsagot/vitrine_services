import {
  ACESFilmicToneMapping,
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  WebGLRenderer,
  type BufferAttribute,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SCREEN_H, SCREEN_W } from './screen';

export interface Phone {
  refresh(): void;
  spin(): void;
  dispose(): void;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const idle = () =>
  new Promise<void>((resolve) => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 400 });
    else setTimeout(resolve, 60);
  });

/**
 * Un téléphone en 3D (Three.js) : coque métal bleu nuit, reflets doux, écran vivant.
 * Il suit le doigt ou la souris, et on peut le faire tourner.
 * Tout ce qui est coûteux (éclairage précalculé, shaders) est préparé pendant les temps morts,
 * pour ne jamais saccader le défilement.
 */
export async function createPhone3D(host: HTMLElement, screen: HTMLCanvasElement): Promise<Phone> {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'phone3d-canvas';
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  await idle();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0, 0.1, 100, { size: 64 });
  scene.environment = env.texture;

  const camera = new PerspectiveCamera(26, 1, 0.1, 40);
  camera.position.set(0, 0, 4.4);

  // Dimensions : l'écran garde exactement les proportions du dessin.
  const sw = 0.74;
  const sh = (sw * SCREEN_H) / SCREEN_W;
  const bw = sw + 0.07;
  const bh = sh + 0.07;
  const depth = 0.09;

  const phone = new Group();
  scene.add(phone);

  const frame = new MeshStandardMaterial({ color: 0x1b2647, metalness: 0.62, roughness: 0.26 });
  const body = new Mesh(new RoundedBoxGeometry(bw, bh, depth, 8, 0.115), frame);
  phone.add(body);

  // Écran : rectangle arrondi avec la texture dessinée sur le canvas
  const texture = new CanvasTexture(screen);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const screenMesh = new Mesh(
    roundedPlane(sw, sh, 0.085),
    new MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  screenMesh.position.z = depth / 2 + 0.001;
  phone.add(screenMesh);

  // Vitre : un voile très léger qui accroche la lumière
  const glass = new Mesh(
    roundedPlane(sw, sh, 0.085),
    new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.04,
      transparent: true,
      opacity: 0.07,
      envMapIntensity: 1.6,
    }),
  );
  glass.position.z = depth / 2 + 0.002;
  phone.add(glass);

  // Boutons latéraux et bloc photo au dos
  const metal = new MeshStandardMaterial({ color: 0x24305a, metalness: 0.8, roughness: 0.25 });
  for (const [y, h] of [
    [0.32, 0.16],
    [0.12, 0.1],
  ] as const) {
    const b = new Mesh(new BoxGeometry(0.012, h, 0.03), metal);
    b.position.set(-bw / 2 - 0.004, y, 0);
    phone.add(b);
  }
  const power = new Mesh(new BoxGeometry(0.012, 0.22, 0.03), metal);
  power.position.set(bw / 2 + 0.004, 0.22, 0);
  phone.add(power);
  const camBlock = new Mesh(new RoundedBoxGeometry(0.28, 0.28, 0.02, 4, 0.06), frame);
  camBlock.position.set(-bw / 2 + 0.2, bh / 2 - 0.2, -depth / 2 - 0.008);
  phone.add(camBlock);
  const lensMat = new MeshStandardMaterial({ color: 0x0a0f1e, metalness: 0.2, roughness: 0.05 });
  for (const [x, y] of [
    [-0.06, 0.06],
    [0.06, -0.06],
  ] as const) {
    const lens = new Mesh(new RoundedBoxGeometry(0.09, 0.09, 0.03, 4, 0.045), lensMat);
    lens.position.set(camBlock.position.x + x, camBlock.position.y + y, -depth / 2 - 0.018);
    phone.add(lens);
  }

  // Ombre douce au sol
  const shadow = new Mesh(
    new PlaneGeometry(1.5, 0.45),
    new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false }),
  );
  shadow.position.set(0, -bh / 2 - 0.16, -0.2);
  shadow.rotation.x = -Math.PI / 2.4;
  scene.add(shadow);

  // Interaction : le téléphone suit le pointeur, et se fait tourner au doigt
  const pointer = { x: 0, y: 0 };
  const drag = { active: false, startX: 0, startY: 0, yaw: 0, pitch: 0 };
  const rot = { yaw: 0, pitch: 0, extra: 0 };
  let spinStart = 0;

  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    if (drag.active) {
      drag.yaw = ((e.clientX - drag.startX) / r.width) * Math.PI * 1.6;
      drag.pitch = ((e.clientY - drag.startY) / r.height) * 0.9;
      return;
    }
    if (e.pointerType === 'mouse') {
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    }
  };
  const onDown = (e: PointerEvent) => {
    drag.active = true;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    renderer.domElement.setPointerCapture(e.pointerId);
  };
  const onUp = () => {
    drag.active = false;
    drag.yaw = 0;
    drag.pitch = 0;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);
  renderer.domElement.addEventListener('pointercancel', onUp);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Cadrage : le téléphone tient en hauteur, ou en largeur sur les écrans étroits.
    const fit = (bh * 1.1) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const fitW = (bw * 1.9) / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    camera.position.z = Math.max(fit, fitW);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) loop();
  });

  // Shaders compilés en parallèle quand le navigateur le permet : pas de gel au premier affichage.
  try {
    await renderer.compileAsync(scene, camera);
  } catch {
    /* sinon, compilation classique au premier rendu */
  }
  await idle();

  let raf = 0;
  const started = performance.now();
  const loop = () => {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  };
  const tick = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) return;
    const t = (now - started) / 1000;
    const idleYaw = Math.sin(t * 0.55) * 0.22 + pointer.x * 0.32;
    const idlePitch = Math.sin(t * 0.4) * 0.05 + pointer.y * 0.16;
    rot.yaw += (idleYaw + drag.yaw - rot.yaw) * (drag.active ? 0.35 : 0.06);
    rot.pitch += (idlePitch + drag.pitch - rot.pitch) * (drag.active ? 0.35 : 0.06);
    if (spinStart) {
      const s = Math.min(1, (now - spinStart) / 1200);
      rot.extra = ease(s) * Math.PI * 2;
      if (s >= 1) {
        spinStart = 0;
        rot.extra = 0;
      }
    }
    phone.rotation.set(rot.pitch, rot.yaw + rot.extra, Math.sin(t * 0.5) * 0.015);
    phone.position.y = Math.sin(t * 0.8) * 0.03;
    renderer.render(scene, camera);
    loop();
  };
  io.observe(host);
  loop();

  return {
    refresh() {
      texture.needsUpdate = true;
    },
    spin() {
      spinStart = performance.now();
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          const m = o.material as MeshBasicMaterial;
          m.map?.dispose();
          m.dispose();
        }
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function roundedPlane(w: number, h: number, r: number) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new ShapeGeometry(s, 12);
  const pos = g.attributes['position'] as BufferAttribute;
  const uv = g.attributes['uv'] as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  }
  uv.needsUpdate = true;
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 64, 2, 128, 64, 64);
  g.addColorStop(0, 'rgba(22,33,62,0.42)');
  g.addColorStop(0.55, 'rgba(22,33,62,0.12)');
  g.addColorStop(1, 'rgba(22,33,62,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
