import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { PARTS, type PartInfo } from "./parts";
import * as T from "./textures";

export type CameraPreset = "iso" | "front" | "dispenser" | "controls" | "inside" | "exploded";

export type SceneCallbacks = {
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onDispenseProgress: (liters: number, done: boolean) => void;
};

export type VendingSceneApi = {
  setExplode: (t: number) => void;
  setXray: (on: boolean) => void;
  setNight: (on: boolean) => void;
  setDispensing: (on: boolean) => void;
  setAutoRotate: (on: boolean) => void;
  select: (id: string | null) => void;
  hover: (id: string | null) => void;
  setCameraPreset: (p: CameraPreset) => void;
  setLabelElement: (id: string, el: HTMLElement | null) => void;
  dispose: () => void;
};

type V3 = [number, number, number];

type MatRec = {
  mat: any;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  emissive: THREE.Color | null;
  eDay: number;
  eNight: number;
  wasGhost: boolean;
};

type PartRuntime = {
  info: PartInfo;
  group: THREE.Group;
  base: THREE.Vector3;
  offset: THREE.Vector3;
  anchor: THREE.Vector3;
  radius: number;
  mats: MatRec[];
  pickable: boolean;
};

const PRESETS: Record<CameraPreset, { pos: V3; target: V3 }> = {
  iso: { pos: [2.5, 1.35, 3.3], target: [0, 0.05, 0] },
  front: { pos: [0, 0.15, 3.4], target: [0, 0.05, 0] },
  dispenser: { pos: [-0.35, 0.02, 1.45], target: [-0.19, -0.12, 0.25] },
  controls: { pos: [0.75, 0.2, 1.35], target: [0.31, 0.12, 0.35] },
  inside: { pos: [1.7, 0.75, 2.3], target: [0, 0, -0.1] },
  exploded: { pos: [3.7, 2.1, 4.9], target: [0, 0.15, 0.2] },
};

const HIGHLIGHT = new THREE.Color(0x38bdf8);

// ───────────────────────── geometry helpers ─────────────────────────

function rbox(w: number, h: number, d: number, r = 0.008, seg = 3) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
}

function roundedRectPath(p: THREE.Path, x: number, y: number, w: number, h: number, r: number) {
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
}

/** Прямоугольная рамка (с отверстием) — экструзия по +Z */
function frameGeo(ow: number, oh: number, iw: number, ih: number, depth: number, r = 0.008, holeOffset: [number, number] = [0, 0]) {
  const shape = new THREE.Shape();
  roundedRectPath(shape, -ow / 2, -oh / 2, ow, oh, r);
  const hole = new THREE.Path();
  roundedRectPath(hole, -iw / 2 + holeOffset[0], -ih / 2 + holeOffset[1], iw, ih, r * 0.8);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: 6,
  });
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos?: V3, rot?: V3, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

const cyl = (rt: number, rb: number, h: number, seg = 32) => new THREE.CylinderGeometry(rt, rb, h, seg);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const RX = Math.PI / 2;

// ───────────────────────── scene ─────────────────────────

export function createVendingScene(container: HTMLElement, cb: SceneCallbacks): VendingSceneApi {
  const width = container.clientWidth || 800;
  const height = container.clientHeight || 650;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const dayBg = new THREE.Color(0x0a1019);
  const nightBg = new THREE.Color(0x03060c);
  scene.background = dayBg.clone();
  scene.fog = new THREE.Fog(0x0a1019, 7, 16);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const camera = new THREE.PerspectiveCamera(36, width / height, 0.05, 60);
  camera.position.set(...PRESETS.iso.pos);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI / 2 + 0.08;
  controls.minDistance = 0.6;
  controls.maxDistance = 9;
  controls.target.set(...PRESETS.iso.target);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.9;

  // ─── lights ───
  const ambient = new THREE.HemisphereLight(0xdbeafe, 0x0b1220, 0.7);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(3.5, 5.5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -3;
  keyLight.shadow.camera.right = 3;
  keyLight.shadow.camera.top = 3;
  keyLight.shadow.camera.bottom = -3;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 15;
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x7cc4ff, 0.9);
  fillLight.position.set(-4, 2.5, 2);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.1);
  rimLight.position.set(0, 3.5, -4.5);
  scene.add(rimLight);
  const nightGreen = new THREE.PointLight(0x22c55e, 0, 1.4);
  nightGreen.position.set(0.31, 0.36, 0.55);
  scene.add(nightGreen);
  const nightRed = new THREE.PointLight(0xef4444, 0, 1.4);
  nightRed.position.set(0.31, -0.24, 0.55);
  scene.add(nightRed);

  // ─── stage ───
  const ground = mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x080d15, roughness: 0.9, metalness: 0.1 }), [0, -1.12, 0], [-RX, 0, 0], false);
  scene.add(ground);
  const platform = mesh(cyl(1.5, 1.6, 0.06, 96), new THREE.MeshStandardMaterial({ color: 0x121c2a, roughness: 0.35, metalness: 0.75 }), [0, -1.09, 0], undefined, false);
  scene.add(platform);
  const ring = mesh(new THREE.RingGeometry(1.32, 1.36, 96), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), [0, -1.058, 0], [-RX, 0, 0], false);
  scene.add(ring);
  const grid = new THREE.GridHelper(6, 60, 0x38bdf8, 0x1e3a5f);
  grid.position.y = -1.055;
  const gridMats = (Array.isArray(grid.material) ? grid.material : [grid.material]) as THREE.Material[];
  gridMats.forEach((m) => {
    m.transparent = true;
    m.opacity = 0;
    m.depthWrite = false;
  });
  scene.add(grid);

  const machine = new THREE.Group();
  scene.add(machine);

  // ─── materials (клонируются на каждую деталь позже) ───
  const nightIntensity = new Map<THREE.Material, number>();
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);

  const M = {
    white: phys({ color: 0xf4f6f9, roughness: 0.34, metalness: 0.05, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
    blue: phys({ color: 0x1560d6, roughness: 0.3, metalness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.18 }),
    blueDark: phys({ color: 0x0f4fbd, roughness: 0.35, metalness: 0.15, clearcoat: 0.5 }),
    greyPaint: phys({ color: 0xd8dee6, roughness: 0.45, metalness: 0.1, clearcoat: 0.3 }),
    frame: std({ color: 0x3a4555, roughness: 0.5, metalness: 0.7 }),
    darkSteel: std({ color: 0x252f3d, roughness: 0.5, metalness: 0.6 }),
    chrome: std({ color: 0xf5f7fa, roughness: 0.06, metalness: 1 }),
    stainless: std({ color: 0xcfd7e0, roughness: 0.26, metalness: 0.92 }),
    brushed: std({ color: 0xa9b4c2, roughness: 0.38, metalness: 0.85 }),
    aluminium: std({ color: 0xc3cad3, roughness: 0.42, metalness: 0.8 }),
    black: phys({ color: 0x0d1117, roughness: 0.35, metalness: 0.1, clearcoat: 0.6 }),
    blackMatte: std({ color: 0x14181f, roughness: 0.75, metalness: 0.1 }),
    rubber: std({ color: 0x0a0d12, roughness: 0.95, metalness: 0 }),
    brass: std({ color: 0xc9a13b, roughness: 0.3, metalness: 0.95 }),
    frpBlue: phys({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.3 }),
    frpNavy: phys({ color: 0x1e2f6b, roughness: 0.4, metalness: 0.05, clearcoat: 0.7, clearcoatRoughness: 0.3 }),
    housing: phys({ color: 0x3b82f6, roughness: 0.15, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 1 }),
    housingCap: phys({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.05, clearcoat: 0.4 }),
    cartridgeWhite: std({ color: 0xf8fafc, roughness: 0.9, metalness: 0 }),
    cartridgeCarbon: std({ color: 0x1f2328, roughness: 0.95, metalness: 0 }),
    mineral: phys({ color: 0xf6d77a, roughness: 0.6, metalness: 0, transparent: true, opacity: 0.85 }),
    tank: phys({ color: 0xeef3f8, roughness: 0.55, metalness: 0, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
    water: phys({ color: 0x2b9be8, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.55, depthWrite: false }),
    glass: phys({ color: 0x9fb6cc, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.26, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    bottle: phys({ color: 0x8fd3ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }),
    capBlue: std({ color: 0x1d4ed8, roughness: 0.4, metalness: 0.1 }),
    pcbGreen: std({ color: 0x0b5a3a, roughness: 0.55, metalness: 0.1 }),
    relay: std({ color: 0x2563eb, roughness: 0.5, metalness: 0.1 }),
    terminal: std({ color: 0x16a34a, roughness: 0.6, metalness: 0.1 }),
    ledGreen: std({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.2 }),
    ledAmber: std({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.2 }),
    ledStrip: std({ color: 0xdff6ff, emissive: 0xbfefff, emissiveIntensity: 1.4 }),
    uvGlow: std({ color: 0xc084fc, emissive: 0xa855f7, emissiveIntensity: 1.6 }),
    heaterCoil: std({ color: 0x7f1d1d, emissive: 0xef4444, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.6 }),
    btnGreen: phys({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 1 }),
    btnRed: phys({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 1 }),
    tubeRaw: std({ color: 0x2f7df0, roughness: 0.35, metalness: 0.05 }),
    tubePure: phys({ color: 0xeaf5ff, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.85, clearcoat: 0.6 }),
    tubeDrain: std({ color: 0x64748b, roughness: 0.5, metalness: 0.05 }),
  };
  nightIntensity.set(M.ledStrip, 3);
  nightIntensity.set(M.btnGreen, 1.4);
  nightIntensity.set(M.btnRed, 1.4);
  nightIntensity.set(M.ledGreen, 2.2);
  nightIntensity.set(M.ledAmber, 2.2);

  const texMarquee = T.marqueeTexture();
  const texHeader = T.frontHeaderTexture();
  const texScreen = T.screenTexture();
  const texInstr = T.instructionsTexture();
  const texBanner = T.lowerBannerTexture();
  const texColumn = T.columnTexture();
  const led = T.createLedDisplay();
  const texPcb = T.pcbTexture();
  const texFlow = T.flowTexture();

  const marqueeMat = std({ map: texMarquee, emissive: 0xffffff, emissiveMap: texMarquee, emissiveIntensity: 0.35, roughness: 0.25 });
  nightIntensity.set(marqueeMat, 1.15);
  const screenMat = std({ map: texScreen, emissive: 0xffffff, emissiveMap: texScreen, emissiveIntensity: 0.45, roughness: 0.12 });
  nightIntensity.set(screenMat, 0.95);
  const decal = (map: THREE.Texture, transparent = false) =>
    std({ map, transparent, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ledMat = new THREE.MeshBasicMaterial({ map: led.texture, toneMapped: false });

  // ─── part registry ───
  const parts = new Map<string, PartRuntime>();
  const partMeta = new Map(PARTS.map((p) => [p.id, p]));

  function makePart(id: string, pos: V3) {
    const info = partMeta.get(id);
    if (!info) throw new Error(`Unknown part ${id}`);
    const group = new THREE.Group();
    group.name = id;
    group.position.set(...pos);
    machine.add(group);
    parts.set(id, {
      info,
      group,
      base: new THREE.Vector3(...pos),
      offset: new THREE.Vector3(...info.explode),
      anchor: new THREE.Vector3(),
      radius: 0.2,
      mats: [],
      pickable: true,
    });
    return group;
  }

  // ═════════════════════════ FRAME ═════════════════════════
  {
    const g = makePart("frame", [0, 0, 0]);
    const t = 0.03;
    for (const x of [-0.475, 0.475])
      for (const z of [-0.33, 0.33]) g.add(mesh(box(t, 1.8, t), M.frame, [x, 0, z]));
    for (const y of [-0.885, 0.885]) {
      for (const z of [-0.33, 0.33]) g.add(mesh(box(0.92, t, t), M.frame, [0, y, z]));
      for (const x of [-0.475, 0.475]) g.add(mesh(box(t, t, 0.63), M.frame, [x, y, 0]));
    }
    g.add(mesh(box(0.92, t, t), M.frame, [0, -0.42, -0.33]));
    g.add(mesh(box(0.98, 0.02, 0.7), M.darkSteel, [0, -0.905, 0]));
    g.add(mesh(box(0.98, 0.012, 0.7), M.darkSteel, [0, 0.905, 0]));
    // полка под накопительным баком
    g.add(mesh(box(0.92, 0.012, 0.43), M.darkSteel, [0, 0.36, -0.115]));
    // регулируемые опоры
    for (const x of [-0.43, 0.43])
      for (const z of [-0.29, 0.29]) {
        g.add(mesh(box(0.08, 0.012, 0.08), M.frame, [x, -0.921, z]));
        g.add(mesh(cyl(0.011, 0.011, 0.1, 16), M.chrome, [x, -0.975, z]));
        g.add(mesh(cyl(0.02, 0.02, 0.014, 6), M.chrome, [x, -0.94, z]));
        g.add(mesh(cyl(0.042, 0.048, 0.03, 32), M.rubber, [x, -1.045, z]));
      }
  }

  // ═════════════════════════ CANOPY ═════════════════════════
  let marqueeLight: THREE.PointLight;
  {
    const g = makePart("canopy", [0, 1.03, 0.01]);
    g.add(mesh(rbox(1.06, 0.24, 0.78, 0.016), M.blue));
    g.add(mesh(rbox(1.1, 0.022, 0.82, 0.008), M.blueDark, [0, 0.13, 0]));
    g.add(mesh(new THREE.PlaneGeometry(1.02, 0.2), marqueeMat, [0, 0, 0.3905], undefined, false));
    g.add(mesh(box(1.06, 0.006, 0.006), M.chrome, [0, -0.118, 0.392]));
    g.add(mesh(box(1.06, 0.006, 0.006), M.chrome, [0, 0.118, 0.392]));
    marqueeLight = new THREE.PointLight(0x7cc4ff, 0.8, 2.5);
    marqueeLight.position.set(0, 0, 0.7);
    g.add(marqueeLight);
  }

  // ═════════════════════════ FRONT PANEL ═════════════════════════
  {
    const g = makePart("frontPanel", [-0.185, 0, 0.352]);
    const shape = new THREE.Shape();
    roundedRectPath(shape, -0.305, -0.9, 0.61, 1.8, 0.01);
    const hole = new THREE.Path();
    roundedRectPath(hole, -0.2, -0.4, 0.4, 0.59, 0.012);
    shape.holes.push(hole);
    const panelGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
      curveSegments: 8,
    });
    g.add(mesh(panelGeo, M.white));
    const fz = 0.0175;
    g.add(mesh(new THREE.PlaneGeometry(0.56, 0.052), decal(texHeader, true), [0, 0.83, fz + 0.001], undefined, false));
    // экран
    g.add(mesh(rbox(0.54, 0.35, 0.022, 0.01), M.black, [0, 0.6, fz + 0.011]));
    g.add(mesh(new THREE.PlaneGeometry(0.5, 0.31), screenMat, [0, 0.6, fz + 0.0225], undefined, false));
    // инструкция
    g.add(mesh(rbox(0.56, 0.19, 0.006, 0.004), M.blueDark, [0, 0.31, fz + 0.003]));
    g.add(mesh(new THREE.PlaneGeometry(0.55, 0.172), decal(texInstr), [0, 0.31, fz + 0.0065], undefined, false));
    // хромированная рамка проёма камеры
    g.add(mesh(frameGeo(0.44, 0.63, 0.4, 0.59, 0.01, 0.014), M.chrome, [0, -0.105, fz]));
    // нижний баннер
    g.add(mesh(new THREE.PlaneGeometry(0.56, 0.165), decal(texBanner, true), [0, -0.63, fz + 0.001], undefined, false));
    // петли и замок
    for (const y of [0.62, -0.62]) g.add(mesh(cyl(0.008, 0.008, 0.08, 16), M.chrome, [-0.307, y, 0.012]));
    g.add(mesh(cyl(0.012, 0.012, 0.01, 24), M.chrome, [0.27, 0.05, fz + 0.005], [RX, 0, 0]));
    g.add(mesh(box(0.003, 0.012, 0.002), M.black, [0.27, 0.05, fz + 0.011]));
  }

  // ═════════════════════════ GLASS DOOR ═════════════════════════
  {
    const g = makePart("glassDoor", [-0.185, -0.105, 0.387]);
    g.add(mesh(frameGeo(0.38, 0.57, 0.33, 0.52, 0.01, 0.01), M.brushed));
    g.add(mesh(new THREE.PlaneGeometry(0.335, 0.525), M.glass, [0, 0, 0.005], undefined, false));
    g.add(mesh(cyl(0.0065, 0.0065, 0.16, 16), M.chrome, [0.155, 0, 0.034]));
    for (const y of [-0.07, 0.07]) g.add(mesh(cyl(0.005, 0.005, 0.024, 12), M.chrome, [0.155, y, 0.022], [RX, 0, 0]));
  }

  // ═════════════════════════ DISPENSE CHAMBER ═════════════════════════
  let waterLevel: THREE.Mesh;
  let waterStream: THREE.Mesh;
  {
    const g = makePart("dispenseChamber", [-0.19, -0.105, 0.22]);
    const w = 0.4,
      h = 0.59,
      d = 0.28,
      t = 0.008;
    g.add(mesh(box(w, h, t), M.stainless, [0, 0, -d / 2]));
    g.add(mesh(box(t, h, d), M.stainless, [-w / 2, 0, 0]));
    g.add(mesh(box(t, h, d), M.stainless, [w / 2, 0, 0]));
    g.add(mesh(box(w, t, d), M.stainless, [0, h / 2, 0]));
    g.add(mesh(box(w, 0.02, d), M.brushed, [0, -h / 2, 0]));
    for (let i = 0; i < 11; i++) g.add(mesh(box(0.37, 0.008, 0.01), M.chrome, [0, -h / 2 + 0.015, -0.12 + i * 0.024]));
    // сопло
    g.add(mesh(cyl(0.03, 0.03, 0.008, 32), M.chrome, [0, 0.287, 0.02]));
    g.add(mesh(cyl(0.016, 0.016, 0.06, 32), M.chrome, [0, 0.255, 0.02]));
    g.add(mesh(cyl(0.016, 0.008, 0.02, 32), M.chrome, [0, 0.215, 0.02]));
    g.add(mesh(box(0.3, 0.006, 0.012), M.ledStrip, [0, 0.286, 0.11], undefined, false));

    const spot = new THREE.SpotLight(0xbfefff, 2.2, 1.2, Math.PI / 4, 0.5);
    spot.position.set(0, 0.27, 0.08);
    spot.target.position.set(0, -0.3, 0.05);
    g.add(spot, spot.target);

    // 19-литровая бутыль
    const bottle = new THREE.Group();
    bottle.position.set(0, -0.272, 0.02);
    g.add(bottle);
    const prof: [number, number][] = [
      [0, 0],
      [0.1, 0],
      [0.115, 0.008],
      [0.12, 0.03],
    ];
    for (let i = 0; i < 5; i++) {
      const y = 0.06 + i * 0.05;
      prof.push([0.12, y], [0.112, y + 0.012], [0.12, y + 0.024]);
    }
    prof.push([0.12, 0.31], [0.108, 0.345], [0.07, 0.38], [0.038, 0.4], [0.036, 0.415], [0.036, 0.44]);
    const lathe = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 48);
    bottle.add(mesh(lathe, M.bottle, undefined, undefined, false));
    bottle.add(mesh(cyl(0.038, 0.038, 0.012, 32), M.capBlue, [0, 0.415, 0]));
    const wGeo = cyl(0.11, 0.11, 0.3, 48);
    wGeo.translate(0, 0.15, 0);
    waterLevel = mesh(wGeo, M.water, [0, 0.008, 0], undefined, false);
    waterLevel.scale.y = 0.04;
    bottle.add(waterLevel);

    waterStream = mesh(cyl(0.006, 0.009, 0.05, 16), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.8 }), [0, 0.18, 0.02], undefined, false);
    waterStream.visible = false;
    g.add(waterStream);
  }

  // ═════════════════════════ CONTROL COLUMN ═════════════════════════
  let startBtn: THREE.Mesh;
  {
    const g = makePart("controlColumn", [0.31, 0, 0.352]);
    g.add(mesh(rbox(0.36, 1.8, 0.03, 0.008), M.blue));
    g.add(mesh(new THREE.PlaneGeometry(0.352, 1.79), decal(texColumn), [0, 0, 0.0155], undefined, false));
    // LED-табло
    g.add(mesh(rbox(0.27, 0.125, 0.02, 0.008), M.black, [0, 0.62, 0.02]));
    g.add(mesh(new THREE.PlaneGeometry(0.235, 0.088), ledMat, [0, 0.62, 0.0305], undefined, false));
    [M.ledGreen, M.ledAmber, M.ledGreen, M.ledAmber].forEach((m, i) =>
      g.add(mesh(new THREE.SphereGeometry(0.006, 12, 12), m, [-0.045 + i * 0.03, 0.535, 0.018], undefined, false)),
    );
    const button = (y: number, mat: THREE.Material) => {
      g.add(mesh(cyl(0.054, 0.054, 0.008, 40), M.black, [0, y, 0.019], [RX, 0, 0]));
      g.add(mesh(new THREE.TorusGeometry(0.046, 0.007, 16, 48), M.chrome, [0, y, 0.024]));
      const b = mesh(cyl(0.038, 0.038, 0.016, 40), mat, [0, y, 0.027], [RX, 0, 0]);
      g.add(b);
      return b;
    };
    startBtn = button(0.36, M.btnGreen);
    button(-0.24, M.btnRed);
    // замок
    g.add(mesh(cyl(0.014, 0.014, 0.012, 24), M.chrome, [0.12, 0.8, 0.021], [RX, 0, 0]));
    g.add(mesh(box(0.003, 0.014, 0.002), M.black, [0.12, 0.8, 0.0275]));
  }

  // ═════════════════════════ BILL / COIN ACCEPTORS ═════════════════════════
  {
    const g = makePart("billAcceptor", [0.31, 0.08, 0.3]);
    g.add(mesh(rbox(0.16, 0.13, 0.03, 0.008), M.black, [0, 0, 0.075]));
    g.add(mesh(box(0.11, 0.007, 0.006), M.rubber, [0, 0.022, 0.0895]));
    for (const x of [-0.068, 0.068]) g.add(mesh(box(0.004, 0.05, 0.004), M.ledGreen, [x, 0, 0.0905], undefined, false));
    g.add(mesh(box(0.08, 0.018, 0.003), M.brushed, [0, -0.035, 0.0905]));
    g.add(mesh(rbox(0.14, 0.11, 0.2, 0.006), M.darkSteel, [0, 0, -0.05]));
    g.add(mesh(rbox(0.13, 0.09, 0.1, 0.006), M.blackMatte, [0, -0.01, -0.2]));
  }
  {
    const g = makePart("coinAcceptor", [0.31, -0.075, 0.33]);
    g.add(mesh(rbox(0.1, 0.075, 0.008, 0.004), M.chrome, [0, 0, 0.042]));
    g.add(mesh(box(0.005, 0.04, 0.004), M.rubber, [0, 0.008, 0.047]));
    g.add(mesh(cyl(0.008, 0.008, 0.006, 20), M.btnRed, [0.03, -0.022, 0.047], [RX, 0, 0]));
    g.add(mesh(rbox(0.085, 0.085, 0.1, 0.006), M.blackMatte, [0, 0, -0.015]));
  }

  // ═════════════════════════ CONTROLLER ═════════════════════════
  {
    const g = makePart("controller", [0.31, 0.42, 0.3]);
    const boardMat = std({ map: texPcb, roughness: 0.55, metalness: 0.1 });
    g.add(mesh(box(0.24, 0.28, 0.003), boardMat));
    const chips: [number, number, number, number][] = [
      [-0.04, 0.06, 0.05, 0.05],
      [0.06, 0.07, 0.03, 0.03],
      [-0.06, -0.03, 0.035, 0.02],
      [0.04, -0.02, 0.05, 0.02],
    ];
    chips.forEach(([x, y, w, h]) => g.add(mesh(box(w, h, 0.005), M.blackMatte, [x, y, -0.004])));
    for (let i = 0; i < 3; i++) g.add(mesh(box(0.032, 0.022, 0.026), M.relay, [-0.07 + i * 0.045, -0.085, -0.014]));
    for (let i = 0; i < 4; i++) g.add(mesh(cyl(0.007, 0.007, 0.02, 16), M.blackMatte, [0.085, 0.1 - i * 0.03, -0.011], [RX, 0, 0]));
    g.add(mesh(box(0.2, 0.018, 0.016), M.terminal, [0, -0.125, -0.009]));
    for (const [x, y] of [
      [-0.11, 0.13],
      [0.11, 0.13],
      [-0.11, -0.13],
      [0.11, -0.13],
    ])
      g.add(mesh(cyl(0.005, 0.005, 0.03, 10), M.brass, [x, y, 0.015], [RX, 0, 0]));
    g.add(mesh(new THREE.SphereGeometry(0.004, 8, 8), M.ledGreen, [0.1, 0.11, -0.003], undefined, false));
  }

  // ═════════════════════════ PSU ═════════════════════════
  {
    const g = makePart("psu", [0.34, -0.42, 0.04]);
    g.add(mesh(rbox(0.1, 0.2, 0.14, 0.004), M.aluminium));
    for (let i = 0; i < 7; i++) g.add(mesh(box(0.06, 0.006, 0.002), M.blackMatte, [0, 0.07 - i * 0.02, 0.071]));
    g.add(mesh(box(0.09, 0.022, 0.02), M.blackMatte, [0, -0.085, 0.074]));
    for (let i = 0; i < 5; i++) g.add(mesh(cyl(0.004, 0.004, 0.004, 10), M.chrome, [-0.034 + i * 0.017, -0.085, 0.086], [RX, 0, 0]));
  }

  // ═════════════════════════ FILTER COLUMNS (FRP) ═════════════════════════
  const frpColumn = (id: string, pos: V3, mat: THREE.Material, title: string, sub: string) => {
    const g = makePart(id, pos);
    g.add(mesh(new THREE.CapsuleGeometry(0.075, 0.62, 12, 40), mat));
    g.add(mesh(cyl(0.07, 0.07, 0.04, 32), M.blackMatte, [0, -0.38, 0]));
    const lbl = new THREE.MeshStandardMaterial({ map: T.labelTexture(title, sub), roughness: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.0765, 0.0765, 0.17, 32, 1, true, -0.65, 1.3), lbl, [0, 0.05, 0], undefined, false));
    // управляющий клапан
    g.add(mesh(cyl(0.035, 0.035, 0.04, 32), M.blackMatte, [0, 0.39, 0]));
    g.add(mesh(rbox(0.1, 0.075, 0.085, 0.01), M.black, [0, 0.445, 0]));
    g.add(mesh(cyl(0.042, 0.042, 0.03, 32), M.capBlue, [0, 0.497, 0]));
    g.add(mesh(cyl(0.024, 0.024, 0.006, 32), M.white, [0, 0.445, 0.044], [RX, 0, 0]));
    g.add(mesh(box(0.003, 0.018, 0.002), M.btnRed, [0, 0.45, 0.048]));
    for (const x of [-0.06, 0.06]) g.add(mesh(cyl(0.012, 0.012, 0.03, 16), M.housingCap, [x, 0.445, 0], [0, 0, RX]));
  };
  frpColumn("sandFilter", [-0.36, -0.46, -0.19], M.frpBlue, "SAND", "Ступень 1");
  frpColumn("carbonFilter", [-0.18, -0.46, -0.19], M.frpNavy, "CARBON", "Ступень 2");

  // ═════════════════════════ CARTRIDGE HOUSINGS ═════════════════════════
  const bowlProfile = [
    [0, -0.2],
    [0.038, -0.2],
    [0.048, -0.19],
    [0.05, -0.17],
    [0.05, 0.13],
    [0.054, 0.14],
    [0.054, 0.155],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowlGeo = new THREE.LatheGeometry(bowlProfile, 40);
  const housing = (id: string, pos: V3, cartridge: THREE.Material, sub: string) => {
    const g = makePart(id, pos);
    g.add(mesh(bowlGeo, M.housing, undefined, undefined, false));
    g.add(mesh(cyl(0.033, 0.033, 0.3, 32), cartridge, [0, -0.02, 0]));
    g.add(mesh(cyl(0.058, 0.058, 0.035, 40), M.capBlue, [0, 0.172, 0]));
    g.add(mesh(rbox(0.1, 0.03, 0.03, 0.005), M.housingCap, [0, 0.2, 0]));
    for (const x of [-0.055, 0.055]) g.add(mesh(cyl(0.01, 0.01, 0.02, 16), M.brass, [x, 0.2, 0], [0, 0, RX]));
    g.add(mesh(cyl(0.006, 0.006, 0.012, 12), M.blackMatte, [0.02, 0.222, 0]));
    const lbl = new THREE.MeshStandardMaterial({ map: T.labelTexture(sub, "10\""), roughness: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.0505, 0.0505, 0.07, 32, 1, true, -0.6, 1.2), lbl, [0, 0.0, 0], undefined, false));
  };
  housing("udfFilter", [0.02, -0.58, -0.22], M.cartridgeCarbon, "UDF");
  housing("ctoFilter", [0.14, -0.58, -0.22], M.cartridgeCarbon, "CTO");
  housing("ppFilter", [0.26, -0.58, -0.22], M.cartridgeWhite, "PP 5");

  // ═════════════════════════ RO MEMBRANE ═════════════════════════
  {
    const g = makePart("roMembrane", [-0.05, 0.28, -0.2]);
    g.add(mesh(cyl(0.055, 0.055, 0.74, 48), M.stainless, undefined, [0, 0, RX]));
    for (const x of [-0.385, 0.385]) {
      g.add(mesh(cyl(0.062, 0.062, 0.04, 48), M.housingCap, [x, 0, 0], [0, 0, RX]));
      g.add(mesh(cyl(0.012, 0.012, 0.03, 16), M.brass, [x + Math.sign(x) * 0.03, 0, 0], [0, 0, RX]));
    }
    for (const x of [-0.33, 0.33]) g.add(mesh(new THREE.TorusGeometry(0.058, 0.006, 12, 48), M.chrome, [x, 0, 0], [0, RX, 0]));
    const lbl = new THREE.MeshStandardMaterial({ map: T.labelTexture("VONTRON", "LP-4040 • RO"), roughness: 0.6 });
    const lg = new THREE.CylinderGeometry(0.0555, 0.0555, 0.2, 40, 1, true, -0.7, 1.4);
    g.add(mesh(lg, lbl, [0, 0, 0], [0, 0, RX], false));
    for (const x of [-0.22, 0.22]) g.add(mesh(box(0.03, 0.07, 0.12), M.frame, [x, -0.07, 0]));
  }

  // ═════════════════════════ STORAGE TANK ═════════════════════════
  let tankWater: THREE.Mesh;
  {
    const g = makePart("storageTank", [-0.22, 0.62, -0.1]);
    g.add(mesh(rbox(0.5, 0.42, 0.42, 0.04, 4), M.tank, undefined, undefined, false));
    tankWater = mesh(rbox(0.47, 0.28, 0.39, 0.03, 3), M.water, [0, -0.055, 0], undefined, false);
    g.add(tankWater);
    g.add(mesh(cyl(0.07, 0.07, 0.022, 40), M.capBlue, [0.08, 0.215, -0.04]));
    for (let i = 0; i < 3; i++) g.add(mesh(box(0.5, 0.006, 0.006), M.frame, [0, -0.16 + i * 0.16, 0.211]));
    g.add(mesh(cyl(0.004, 0.004, 0.3, 8), M.blackMatte, [-0.15, 0.05, -0.1]));
    g.add(mesh(new THREE.SphereGeometry(0.02, 16, 16), M.housingCap, [-0.15, 0.08, -0.1]));
    g.add(mesh(cyl(0.012, 0.012, 0.03, 16), M.brass, [0.1, -0.225, 0.15]));
  }

  // ═════════════════════════ UV / MINERALIZER / OZONATOR ═════════════════════════
  const uvRings: THREE.Mesh[] = [];
  {
    const g = makePart("uvSterilizer", [0.2, 0.6, -0.22]);
    g.add(mesh(cyl(0.035, 0.035, 0.36, 40), M.stainless));
    for (const y of [-0.19, 0.19]) {
      g.add(mesh(cyl(0.04, 0.04, 0.02, 40), M.chrome, [0, y, 0]));
      g.add(mesh(cyl(0.008, 0.008, 0.03, 16), M.brass, [0.045, y * 0.85, 0], [0, 0, RX]));
    }
    const r = mesh(new THREE.TorusGeometry(0.028, 0.006, 12, 40), M.uvGlow, [0, 0.21, 0], [RX, 0, 0], false);
    g.add(r);
    uvRings.push(r);
    g.add(mesh(cyl(0.02, 0.02, 0.03, 20), M.uvGlow, [0, 0.225, 0], undefined, false));
    g.add(mesh(rbox(0.05, 0.1, 0.035, 0.004), M.aluminium, [-0.065, 0, 0]));
  }
  {
    const g = makePart("mineralizer", [0.32, 0.6, -0.22]);
    g.add(mesh(cyl(0.04, 0.04, 0.26, 40), M.mineral));
    for (const y of [-0.14, 0.14]) {
      g.add(mesh(cyl(0.043, 0.043, 0.03, 40), M.capBlue, [0, y, 0]));
      g.add(mesh(cyl(0.007, 0.007, 0.03, 16), M.housingCap, [0, y + Math.sign(y) * 0.025, 0]));
    }
    const lbl = new THREE.MeshStandardMaterial({ map: T.labelTexture("MINERAL", "Ca • Mg • K"), roughness: 0.6 });
    g.add(mesh(new THREE.CylinderGeometry(0.0405, 0.0405, 0.1, 32, 1, true, -0.7, 1.4), lbl, undefined, undefined, false));
  }
  {
    const g = makePart("ozonator", [0.42, 0.64, -0.12]);
    g.add(mesh(rbox(0.07, 0.14, 0.1, 0.006), M.aluminium));
    for (let i = 0; i < 6; i++) g.add(mesh(box(0.004, 0.13, 0.1), M.brushed, [-0.038, 0, -0.04 + i * 0.016]));
    g.add(mesh(new THREE.SphereGeometry(0.005, 10, 10), M.relay, [0.036, 0.05, 0.03], undefined, false));
    g.add(mesh(cyl(0.006, 0.006, 0.04, 12), M.housingCap, [0, 0.085, 0]));
  }

  // ═════════════════════════ PUMP ═════════════════════════
  {
    const g = makePart("boosterPump", [0.33, -0.8, 0.12]);
    g.add(mesh(cyl(0.055, 0.055, 0.15, 40), M.frpNavy, [0.02, 0, 0], [0, 0, RX]));
    for (let i = 0; i < 6; i++) g.add(mesh(new THREE.TorusGeometry(0.056, 0.004, 8, 40), M.darkSteel, [-0.035 + i * 0.022, 0, 0], [0, RX, 0]));
    g.add(mesh(cyl(0.05, 0.05, 0.02, 40), M.darkSteel, [0.105, 0, 0], [0, 0, RX]));
    g.add(mesh(cyl(0.045, 0.05, 0.07, 40), M.brushed, [-0.1, 0, 0], [0, 0, RX]));
    g.add(mesh(cyl(0.012, 0.012, 0.03, 16), M.brass, [-0.12, 0.05, 0]));
    g.add(mesh(cyl(0.012, 0.012, 0.03, 16), M.brass, [-0.15, 0, 0], [0, 0, RX]));
    g.add(mesh(rbox(0.05, 0.03, 0.05, 0.004), M.blackMatte, [0.03, 0.065, 0]));
    g.add(mesh(box(0.2, 0.01, 0.12), M.frame, [0, -0.055, 0]));
  }

  // ═════════════════════════ SOLENOIDS + FLOWMETER ═════════════════════════
  {
    const g = makePart("solenoidBlock", [-0.12, 0.25, 0.12]);
    g.add(mesh(box(0.16, 0.028, 0.028), M.brass));
    for (const x of [-0.045, 0.02]) {
      g.add(mesh(box(0.03, 0.02, 0.03), M.brass, [x, 0.022, 0]));
      g.add(mesh(cyl(0.017, 0.017, 0.04, 24), M.blackMatte, [x, 0.052, 0]));
      g.add(mesh(box(0.012, 0.012, 0.012), M.blackMatte, [x, 0.08, 0]));
    }
    g.add(mesh(cyl(0.018, 0.018, 0.04, 24), M.housingCap, [0.075, 0, 0], [0, 0, RX]));
    g.add(mesh(box(0.012, 0.014, 0.014), M.relay, [0.075, 0.022, 0]));
  }

  // ═════════════════════════ HEATER ═════════════════════════
  {
    const g = makePart("heater", [-0.19, -0.73, 0.2]);
    g.add(mesh(box(0.26, 0.018, 0.09), M.aluminium, [0, -0.06, 0]));
    for (let i = 0; i < 12; i++) g.add(mesh(box(0.004, 0.1, 0.085), M.brushed, [-0.121 + i * 0.022, 0, 0]));
    g.add(mesh(cyl(0.008, 0.008, 0.26, 16), M.heaterCoil, [0, -0.04, 0], [0, 0, RX]));
    g.add(mesh(rbox(0.05, 0.065, 0.03, 0.004), M.housingCap, [0.165, -0.02, 0]));
    g.add(mesh(cyl(0.012, 0.012, 0.008, 24), M.blackMatte, [0.165, -0.015, 0.018], [RX, 0, 0]));
  }

  // ═════════════════════════ FANS ═════════════════════════
  const fanRotors: THREE.Group[] = [];
  {
    const g = makePart("fans", [0.25, 0.72, -0.318]);
    for (const fx of [-0.085, 0.085]) {
      const f = new THREE.Group();
      f.position.x = fx;
      g.add(f);
      f.add(mesh(frameGeo(0.12, 0.12, 0.105, 0.105, 0.022, 0.012), M.blackMatte, [0, 0, -0.011]));
      f.add(mesh(new THREE.TorusGeometry(0.03, 0.0015, 6, 32), M.chrome, [0, 0, -0.014]));
      f.add(mesh(new THREE.TorusGeometry(0.048, 0.0015, 6, 32), M.chrome, [0, 0, -0.014]));
      const rotor = new THREE.Group();
      f.add(rotor);
      rotor.add(mesh(cyl(0.02, 0.02, 0.018, 24), M.blackMatte, [0, 0, 0], [RX, 0, 0]));
      for (let i = 0; i < 7; i++) {
        const blade = mesh(box(0.034, 0.016, 0.002), M.blackMatte, undefined, undefined, false);
        const a = (i / 7) * Math.PI * 2;
        blade.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0);
        blade.rotation.set(0.45, 0, a);
        rotor.add(blade);
      }
      fanRotors.push(rotor);
    }
  }

  // ═════════════════════════ SIDE / BACK PANELS ═════════════════════════
  {
    const g = makePart("sidePanelLeft", [-0.5, 0, 0]);
    g.add(mesh(rbox(0.014, 1.8, 0.72, 0.006), M.white));
    for (let i = 0; i < 8; i++) g.add(mesh(box(0.006, 0.012, 0.32), M.darkSteel, [-0.009, -0.5 - i * 0.035, 0], [0, 0, 0.5]));
  }
  {
    const g = makePart("sidePanelRight", [0.5, 0, 0]);
    g.add(mesh(rbox(0.014, 1.8, 0.72, 0.006), M.blue));
    for (let i = 0; i < 8; i++) g.add(mesh(box(0.006, 0.012, 0.32), M.darkSteel, [0.009, 0.72 - i * 0.035, 0], [0, 0, -0.5]));
  }
  {
    const g = makePart("backPanel", [0, 0, -0.353]);
    g.add(mesh(rbox(1.0, 1.8, 0.014, 0.006), M.greyPaint));
    for (let i = 0; i < 8; i++) g.add(mesh(box(0.3, 0.01, 0.006), M.darkSteel, [0.25, 0.84 - i * 0.034, -0.009], [0.6, 0, 0]));
    for (let i = 0; i < 6; i++) g.add(mesh(box(0.3, 0.01, 0.006), M.darkSteel, [-0.25, -0.5 - i * 0.034, -0.009], [-0.6, 0, 0]));
    g.add(mesh(cyl(0.013, 0.013, 0.05, 16), M.brass, [0.35, -0.7, -0.03], [RX, 0, 0]));
    g.add(mesh(cyl(0.016, 0.016, 0.04, 16), M.tubeDrain, [0.1, -0.82, -0.025], [RX, 0, 0]));
    g.add(mesh(cyl(0.015, 0.018, 0.03, 16), M.blackMatte, [-0.35, -0.75, -0.02], [RX, 0, 0]));
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.35, -0.75, -0.035),
      new THREE.Vector3(-0.35, -0.8, -0.12),
      new THREE.Vector3(-0.3, -1.04, -0.25),
      new THREE.Vector3(-0.1, -1.05, -0.45),
    ]);
    g.add(mesh(new THREE.TubeGeometry(cable, 32, 0.007, 8), M.blackMatte));
    const plate = std({ map: T.labelTexture("ATLANT FORTUNA", "XL-01 • 220V • 250 L/h"), roughness: 0.5 });
    g.add(mesh(new THREE.PlaneGeometry(0.22, 0.137), plate, [-0.25, 0.45, -0.0075], [0, Math.PI, 0], false));
  }

  // ═════════════════════════ PIPING ═════════════════════════
  const flowGroup = new THREE.Group();
  machine.add(flowGroup);
  const flowMats: THREE.MeshBasicMaterial[] = [];
  const dispenseFlowMats: THREE.MeshBasicMaterial[] = [];
  {
    const g = makePart("piping", [0, 0, 0]);
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const lines: { pts: THREE.Vector3[]; kind: "raw" | "pure" | "drain"; dispense?: boolean }[] = [
      { kind: "raw", pts: [v(0.35, -0.7, -0.33), v(0.2, -0.45, -0.3), v(-0.2, -0.05, -0.3), v(-0.42, 0.0, -0.2)] },
      { kind: "raw", pts: [v(-0.3, -0.015, -0.19), v(-0.27, 0.07, -0.19), v(-0.24, -0.015, -0.19)] },
      { kind: "raw", pts: [v(-0.12, -0.015, -0.19), v(-0.05, -0.12, -0.21), v(0.0, -0.38, -0.22)] },
      { kind: "raw", pts: [v(0.075, -0.38, -0.22), v(0.08, -0.34, -0.22), v(0.085, -0.38, -0.22)] },
      { kind: "raw", pts: [v(0.195, -0.38, -0.22), v(0.2, -0.34, -0.22), v(0.205, -0.38, -0.22)] },
      { kind: "raw", pts: [v(0.315, -0.38, -0.22), v(0.42, -0.5, -0.02), v(0.22, -0.7, 0.12), v(0.18, -0.8, 0.12)] },
      { kind: "raw", pts: [v(0.21, -0.75, 0.12), v(0.08, -0.35, 0.02), v(0.42, 0.05, -0.1), v(0.37, 0.28, -0.2)] },
      { kind: "drain", pts: [v(0.37, 0.25, -0.24), v(0.44, -0.1, -0.3), v(0.3, -0.7, -0.31), v(0.1, -0.82, -0.33)] },
      { kind: "pure", pts: [v(-0.47, 0.28, -0.2), v(-0.44, 0.372, -0.2), v(0.05, 0.372, -0.2), v(0.2, 0.39, -0.22)] },
      { kind: "pure", pts: [v(0.2, 0.8, -0.22), v(0.26, 0.86, -0.22), v(0.32, 0.77, -0.22)] },
      { kind: "pure", pts: [v(0.32, 0.43, -0.22), v(0.38, 0.5, -0.17), v(0.42, 0.71, -0.12)] },
      { kind: "pure", pts: [v(0.42, 0.72, -0.12), v(0.3, 0.88, -0.05), v(-0.05, 0.88, -0.05), v(-0.1, 0.83, -0.05)] },
      { kind: "pure", dispense: true, pts: [v(-0.12, 0.4, 0.05), v(-0.1, 0.32, 0.09), v(-0.04, 0.25, 0.12)] },
      { kind: "pure", dispense: true, pts: [v(-0.2, 0.25, 0.12), v(-0.19, 0.22, 0.18), v(-0.17, 0.18, 0.24)] },
    ];
    const mats = { raw: M.tubeRaw, pure: M.tubePure, drain: M.tubeDrain };
    lines.forEach(({ pts, kind, dispense }) => {
      const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
      const segs = Math.max(24, Math.round(curve.getLength() * 90));
      g.add(mesh(new THREE.TubeGeometry(curve, segs, 0.0065, 10), mats[kind], undefined, undefined, false));
      for (const p of [pts[0], pts[pts.length - 1]]) g.add(mesh(new THREE.SphereGeometry(0.011, 12, 12), M.housingCap, [p.x, p.y, p.z], undefined, false));
      if (kind === "drain") return;
      const fm = new THREE.MeshBasicMaterial({
        map: texFlow.clone(),
        color: kind === "raw" ? 0x60a5fa : 0xa5f3fc,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      fm.map!.repeat.set(curve.getLength() * 8, 1);
      fm.map!.needsUpdate = true;
      flowGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.0085, 10), fm));
      (dispense ? dispenseFlowMats : flowMats).push(fm);
    });
  }

  // ─── clone materials per part, compute anchors ───
  machine.updateMatrixWorld(true);
  const tmpBox = new THREE.Box3();
  const tmpSphere = new THREE.Sphere();
  const meshToPart = new Map<THREE.Object3D, string>();
  parts.forEach((p, id) => {
    const cloned = new Map<THREE.Material, THREE.Material>();
    p.group.traverse((o: any) => {
      if (!o.isMesh) return;
      meshToPart.set(o, id);
      const orig = o.material as THREE.Material;
      let c = cloned.get(orig);
      if (!c) {
        c = orig.clone();
        cloned.set(orig, c);
        const anyC = c as any;
        const eDay = anyC.emissiveIntensity ?? 0;
        p.mats.push({
          mat: c,
          opacity: c.opacity,
          transparent: c.transparent,
          depthWrite: c.depthWrite,
          emissive: anyC.emissive && !anyC.emissiveMap ? anyC.emissive.clone() : null,
          eDay,
          eNight: nightIntensity.get(orig) ?? eDay,
          wasGhost: false,
        });
      }
      o.material = c;
    });
    tmpBox.setFromObject(p.group);
    tmpBox.getCenter(p.anchor);
    tmpBox.getBoundingSphere(tmpSphere);
    p.radius = tmpSphere.radius;
    p.group.worldToLocal(p.anchor);
  });
  const startBtnMat = startBtn.material as THREE.MeshPhysicalMaterial;
  // освобождаем исходные (неклонированные) материалы
  const usedMats = new Set<THREE.Material>();
  scene.traverse((o: any) => o.material && (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: THREE.Material) => usedMats.add(m)));
  Object.values(M).forEach((m) => !usedMats.has(m) && m.dispose());
  [marqueeMat, screenMat, ledMat].forEach((m) => !usedMats.has(m) && m.dispose());

  // ─────────────────────────── state ───────────────────────────
  const state = {
    explodeTarget: 0,
    explode: 0,
    xray: false,
    night: false,
    nightMix: 0,
    dispensing: false,
    fill: 0.04,
    lastReported: -1,
    selected: null as string | null,
    hovered: null as string | null,
  };
  const labelEls = new Map<string, HTMLElement>();

  let tween: { fromP: THREE.Vector3; toP: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; t: number; dur: number } | null = null;
  function flyTo(pos: THREE.Vector3, target: THREE.Vector3, dur = 1.1) {
    tween = { fromP: camera.position.clone(), toP: pos, fromT: controls.target.clone(), toT: target, t: 0, dur };
  }

  const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

  function partProgress(p: PartRuntime) {
    return ease(clamp01((state.explode - p.info.delay * 0.4) / 0.6));
  }

  function focusPart(id: string) {
    const p = parts.get(id);
    if (!p) return;
    const center = new THREE.Vector3();
    // целевая позиция детали с учётом разлёта
    const k = ease(clamp01((state.explodeTarget - p.info.delay * 0.4) / 0.6));
    center.copy(p.base).addScaledVector(p.offset, k).add(p.anchor);
    machine.localToWorld(center);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = Math.max(0.75, p.radius * 3.2);
    flyTo(center.clone().addScaledVector(dir, dist), center, 0.9);
  }

  function applyMaterials(time: number) {
    const pipeVis = 1 - clamp01(state.explode * 4);
    parts.forEach((p, id) => {
      let factor = 1;
      if (state.xray && p.info.shell) factor = Math.min(factor, 0.1);
      if (state.selected && state.selected !== id) factor = Math.min(factor, 0.1);
      if (id === "piping") factor *= pipeVis;
      p.pickable = factor > 0.3;
      p.group.visible = factor > 0.01;
      const lit = id === state.selected || id === state.hovered;
      const pulse = id === state.selected ? 0.3 + Math.sin(time * 4) * 0.12 : 0.28;
      for (const r of p.mats) {
        const ghost = factor < 0.999;
        const m = r.mat;
        if (ghost) {
          m.opacity = r.opacity * factor;
          m.transparent = true;
          m.depthWrite = false;
        } else if (r.wasGhost) {
          m.opacity = r.opacity;
          m.transparent = r.transparent;
          m.depthWrite = r.depthWrite;
        }
        if (ghost !== r.wasGhost) m.needsUpdate = true;
        r.wasGhost = ghost;
        if (r.emissive) {
          const base = r.eDay + (r.eNight - r.eDay) * state.nightMix;
          if (lit) {
            m.emissive.copy(HIGHLIGHT);
            m.emissiveIntensity = Math.max(base, pulse);
          } else {
            m.emissive.copy(r.emissive);
            m.emissiveIntensity = base;
          }
        } else if (m.emissiveMap) {
          m.emissiveIntensity = r.eDay + (r.eNight - r.eDay) * state.nightMix;
        }
      }
    });
    if (state.dispensing && state.selected !== "controlColumn" && state.hovered !== "controlColumn") {
      startBtnMat.emissiveIntensity = 1.2 + Math.sin(time * 8) * 0.4;
    }
  }

  // ─────────────────────────── picking ───────────────────────────
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const isShown = (o: THREE.Object3D | null): boolean => {
    for (let x = o; x; x = x.parent) if (!x.visible) return false;
    return true;
  };
  function pick(clientX: number, clientY: number): string | null {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(machine, true);
    for (const h of hits) {
      const id = meshToPart.get(h.object);
      if (!id || !isShown(h.object)) continue;
      if (parts.get(id)!.pickable) return id;
    }
    return null;
  }

  let downAt: { x: number; y: number } | null = null;
  let hoverQueued: PointerEvent | null = null;
  const onPointerDown = (e: PointerEvent) => {
    downAt = { x: e.clientX, y: e.clientY };
    tween = null;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    downAt = null;
    if (moved > 5) return;
    const id = pick(e.clientX, e.clientY);
    api.select(id);
    cb.onSelect(id);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (e.buttons) return;
    hoverQueued = e;
  };
  const onPointerLeave = () => {
    hoverQueued = null;
    if (state.hovered) {
      state.hovered = null;
      cb.onHover(null);
    }
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
  controls.addEventListener("start", () => (tween = null));

  const resizeObserver = new ResizeObserver(() => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
  resizeObserver.observe(container);

  // ─────────────────────────── loop ───────────────────────────
  const clock = new THREE.Clock();
  const tmpV = new THREE.Vector3();
  let raf = 0;

  const loop = () => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    // разбор / сборка
    const dE = state.explodeTarget - state.explode;
    if (Math.abs(dE) > 1e-4) state.explode += Math.sign(dE) * Math.min(Math.abs(dE), dt * 0.55);
    parts.forEach((p) => p.group.position.copy(p.base).addScaledVector(p.offset, partProgress(p)));
    const flowVis = 1 - clamp01(state.explode * 4);
    gridMats.forEach((m) => (m.opacity = clamp01(state.explode * 1.5) * 0.35));
    ring.visible = state.explode < 0.3;

    // ночь / день
    state.nightMix += ((state.night ? 1 : 0) - state.nightMix) * Math.min(1, dt * 4);
    const n = state.nightMix;
    (scene.background as THREE.Color).copy(dayBg).lerp(nightBg, n);
    ambient.intensity = 0.7 - 0.5 * n;
    keyLight.intensity = 2.2 - 1.8 * n;
    fillLight.intensity = 0.9 - 0.6 * n;
    rimLight.intensity = 1.1 - 0.5 * n;
    scene.environmentIntensity = 1 - 0.7 * n;
    marqueeLight.intensity = 0.8 + 2.2 * n;
    nightGreen.intensity = 1.2 * n;
    nightRed.intensity = 1.2 * n;

    // налив
    if (state.dispensing) {
      state.fill = Math.min(1, state.fill + dt / 14);
      waterLevel.scale.y = state.fill;
      waterStream.visible = true;
      waterStream.scale.x = waterStream.scale.z = 0.85 + Math.sin(time * 40) * 0.15;
      const liters = Math.round(state.fill * 18.9 * 10) / 10;
      if (liters !== state.lastReported) {
        state.lastReported = liters;
        led.draw(liters, "QUYILMOQDA...");
        cb.onDispenseProgress(liters, false);
      }
      if (state.fill >= 1) {
        state.dispensing = false;
        led.draw(18.9, "TAYYOR • ГОТОВО");
        cb.onDispenseProgress(18.9, true);
      }
    } else {
      waterStream.visible = false;
    }
    tankWater.scale.y = 1 - 0.08 * Math.sin(time * 0.5) * (state.dispensing ? 1 : 0);

    // потоки воды по трубкам
    const flowOn = (state.xray || state.dispensing) && !state.selected ? 1 : 0;
    flowMats.forEach((m) => {
      m.opacity += (flowOn * 0.9 * flowVis - m.opacity) * Math.min(1, dt * 5);
      m.map!.offset.x -= dt * 1.4;
    });
    dispenseFlowMats.forEach((m) => {
      const on = (state.dispensing ? 1 : flowOn) * flowVis * (state.selected ? 0 : 1);
      m.opacity += (on * 0.95 - m.opacity) * Math.min(1, dt * 5);
      m.map!.offset.x -= dt * 2.2;
    });
    flowGroup.visible = flowMats.some((m) => m.opacity > 0.01) || dispenseFlowMats.some((m) => m.opacity > 0.01);

    fanRotors.forEach((r) => (r.rotation.z += dt * 14));
    applyMaterials(time);
    if (!state.selected) uvRings.forEach((r) => ((r.material as any).emissiveIntensity = 1.4 + Math.sin(time * 6) * 0.4));

    // hover
    if (hoverQueued) {
      const id = pick(hoverQueued.clientX, hoverQueued.clientY);
      hoverQueued = null;
      renderer.domElement.style.cursor = id ? "pointer" : "";
      if (id !== state.hovered) {
        state.hovered = id;
        cb.onHover(id);
      }
    }

    // камера
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const k = ease(tween.t);
      camera.position.lerpVectors(tween.fromP, tween.toP, k);
      controls.target.lerpVectors(tween.fromT, tween.toT, k);
      if (tween.t >= 1) tween = null;
    }
    controls.update(dt);

    // выноски деталей
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    const explodeLabels = clamp01((state.explode - 0.45) / 0.3);
    labelEls.forEach((el, id) => {
      const p = parts.get(id);
      if (!p) return;
      let op = explodeLabels;
      if (state.xray && state.explode < 0.1) op = p.info.shell ? 0 : 1;
      if (state.selected) op = id === state.selected ? 1 : 0;
      if (id === state.hovered) op = 1;
      if (id === "piping" && state.explode > 0.2 && id !== state.selected) op = 0;
      tmpV.copy(p.anchor);
      p.group.localToWorld(tmpV);
      tmpV.project(camera);
      if (tmpV.z > 1) op = 0;
      el.style.opacity = op.toFixed(2);
      el.style.visibility = op < 0.02 ? "hidden" : "visible";
      el.style.transform = `translate(${((tmpV.x + 1) / 2) * w}px, ${((1 - tmpV.y) / 2) * h}px)`;
    });

    renderer.render(scene, camera);
  };
  loop();

  // ─────────────────────────── api ───────────────────────────
  const api: VendingSceneApi = {
    setExplode(t) {
      state.explodeTarget = clamp01(t);
    },
    setXray(on) {
      state.xray = on;
    },
    setNight(on) {
      state.night = on;
    },
    setDispensing(on) {
      if (on && !state.dispensing) {
        if (state.fill >= 1) state.fill = 0.02;
        state.lastReported = -1;
      }
      if (!on && state.dispensing) led.draw(Math.round(state.fill * 189) / 10, "STOP • ПАУЗА");
      state.dispensing = on;
    },
    setAutoRotate(on) {
      controls.autoRotate = on;
    },
    select(id) {
      state.selected = id && parts.has(id) ? id : null;
      if (state.selected) {
        controls.autoRotate = false;
        focusPart(state.selected);
      }
    },
    hover(id) {
      state.hovered = id;
    },
    setCameraPreset(p) {
      const preset = PRESETS[p];
      flyTo(new THREE.Vector3(...preset.pos), new THREE.Vector3(...preset.target));
    },
    setLabelElement(id, el) {
      if (el) labelEls.set(id, el);
      else labelEls.delete(id);
    },
    dispose() {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      controls.dispose();
      const textures = new Set<THREE.Texture>();
      scene.traverse((o: any) => {
        o.geometry?.dispose?.();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m: any) => {
          for (const k of ["map", "emissiveMap"]) if (m[k]) textures.add(m[k]);
          m.dispose();
        });
      });
      textures.forEach((t) => t.dispose());
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    },
  };
  return api;
}
