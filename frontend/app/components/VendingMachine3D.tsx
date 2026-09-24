"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export type HotspotInfo = {
  id: string;
  title: string;
  category: string;
  description: string;
  spec: string;
  position: [number, number, number];
};

const HOTSPOTS: HotspotInfo[] = [
  {
    id: "dispenser",
    title: "Камера налива и выдачи воды",
    category: "Зона выдачи",
    description: "Вместительная ниша из пищевой нержавеющей стали AISI 304 с хромированным соплом. Подходит для бутылей от 1 до 19 литров, оснащена защитной дверцей и светодиодной подсветкой.",
    spec: "Тара 1–19 л, дренажная решётка, подсветка камеры",
    position: [-0.18, 0.05, 0.45],
  },
  {
    id: "controls",
    title: "Панель управления и прием платежей",
    category: "Электроника и чип",
    description: "Компьютеризированная плата управления с цифровым дисплеем, купюроприемником, монетоприемником и светящимися кнопками СТАРТ / СТОП. Полный контроль литража и финансов.",
    spec: "Микропроцессорный чип, LED-дисплей, валидаторы валют",
    position: [0.32, 0.35, 0.44],
  },
  {
    id: "canopy",
    title: "Световой лайтбокс ATLANT FORTUNA",
    category: "Фирменный стиль",
    description: "Яркий ударопрочный верхний козырек с внутренней LED-подсветкой. Обеспечивает видимость автомата в темное время суток на расстоянии до 150 метров.",
    spec: "Энергосберегающая LED-подсветка, акрил IPX4",
    position: [0, 0.95, 0.44],
  },
  {
    id: "filters",
    title: "9-ступенчатая система очистки",
    category: "Фильтрация и мембрана",
    description: "Глубокая очистка: кварцевый песок, активированный уголь, UDF, CTO, PP 5мкм, мембрана Vontron LP-4040 (99% селективность), УФ-стерилизатор, минерализатор и озонатор.",
    spec: "Производительность 250 л/ч, насосы 220В",
    position: [0, -0.3, 0.2],
  },
  {
    id: "climate",
    title: "Всесезонный климат-контроль",
    category: "Термозащита",
    description: "Отопительный блок с термостатом для зимней работы (до -25°C) и система принудительного охлаждения с кулерами для летней жары (до +40°C).",
    spec: "Отопитель + кулеры, стабильная работа круглый год",
    position: [-0.35, -0.65, 0.42],
  },
];

export default function VendingMachine3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [isDispensing, setIsDispensing] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isXrayMode, setIsXrayMode] = useState(false);
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<HotspotInfo | null>(null);
  const [activePreset, setActivePreset] = useState<string>("iso");
  const [dispensedLiters, setDispensedLiters] = useState<number>(0);

  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const machineGroupRef = useRef<any>(null);
  const waterStreamRef = useRef<any>(null);
  const waterParticlesRef = useRef<any>(null);
  const waterLevelRef = useRef<any>(null);
  const internalGroupRef = useRef<any>(null);
  const bodyMaterialsRef = useRef<any[]>([]);
  const lightsRef = useRef<{
    ambient: any;
    keyLight: any;
    fillLight: any;
    dispenserLight: any;
    marqueeLight: any;
    nightPointLights: any[];
  } | null>(null);

  const createMarqueeTexture = (THREE: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const grad = ctx.createLinearGradient(0, 0, 1024, 256);
    grad.addColorStop(0, "#0b4cb4");
    grad.addColorStop(0.5, "#1565c0");
    grad.addColorStop(1, "#0b4cb4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = "rgba(100, 200, 255, 0.4)";
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, 1004, 236);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px Inter, Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0, 180, 255, 0.8)";
    ctx.shadowBlur = 18;
    ctx.fillText("ATLANT FORTUNA LLC", 512, 110);

    ctx.font = "bold 26px Inter, Montserrat, sans-serif";
    ctx.fillStyle = "#a8d5ff";
    ctx.shadowBlur = 8;
    ctx.fillText("www.atlant-f.uz • ВЕНДИНГ ПИТЬЕВОЙ ВОДЫ", 512, 185);

    return new THREE.CanvasTexture(canvas);
  };

  const createScreenTexture = (THREE: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 340;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, 512, 340);
    grad.addColorStop(0, "#031b33");
    grad.addColorStop(0.5, "#0b3c66");
    grad.addColorStop(1, "#021526");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 340);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 240);
    for (let x = 0; x <= 512; x += 10) {
      const y = 240 + Math.sin(x * 0.03) * 25 + Math.cos(x * 0.015) * 15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineTo(512, 340);
    ctx.lineTo(0, 340);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 24px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ЧИСТАЯ АРТЕЗИАНСКАЯ ВОДА", 256, 60);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 48px Inter, sans-serif";
    ctx.fillText("TOZA SUV", 256, 130);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText("● СИСТЕМА ГОТОВА К ВЫДАЧЕ", 256, 180);

    return new THREE.CanvasTexture(canvas);
  };

  const createInstructionsTexture = (THREE: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 200);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 504, 192);

    const steps = [
      "1. Установите тару",
      "2. Внесите оплату",
      "3. Нажмите СТАРТ",
      "4. Налив воды",
      "5. Нажмите СТОП",
      "6. Заберите бутыль",
    ];

    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 18 + col * 165;
      const y = 30 + row * 85;

      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(x, y, 150, 65);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(x, y, 150, 65);

      ctx.fillStyle = "#0284c7";
      ctx.fillRect(x + 8, y + 8, 24, 24);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), x + 20, y + 25);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 12px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(steps[i].replace(/^\d\.\s/, ""), x + 38, y + 25);
      ctx.fillStyle = "#64748b";
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText("автоматически", x + 38, y + 42);
    }

    return new THREE.CanvasTexture(canvas);
  };

  const createLowerBannerTexture = (THREE: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 180;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 180);

    ctx.fillStyle = "#0369a1";
    ctx.font = "bold 20px Inter, Montserrat, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("9-СТУПЕНЧАТАЯ ОЧИСТКА И МИНЕРАЛИЗАЦИЯ", 256, 45);

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 15px Inter, sans-serif";
    ctx.fillText("ОБРАТНЫЙ ОСМОС VONTRON • УФ-СТЕРИЛИЗАТОР", 256, 85);

    ctx.fillStyle = "#475569";
    ctx.font = "13px Inter, sans-serif";
    ctx.fillText("ОЗОНИРОВАНИЕ • ОБОГАЩЕНИЕ МИНЕРАЛАМИ • ЧИП", 256, 120);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText("✓ ГАРАНТИЯ 12 МЕСЯЦЕВ • СЕРТИФИЦИРОВАНО", 256, 155);

    return new THREE.CanvasTexture(canvas);
  };

  const createControlPanelTexture = (THREE: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 700;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#0d55c8";
    ctx.fillRect(0, 0, 300, 700);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, 8, 700);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(292, 0, 8, 700);

    ctx.fillStyle = "#050d18";
    ctx.fillRect(25, 40, 250, 90);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 4;
    ctx.strokeRect(25, 40, 250, 90);

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 38px monospace";
    ctx.textAlign = "center";
    ctx.shadowColor = "#22c55e";
    ctx.shadowBlur = 10;
    ctx.fillText("0.00 L", 150, 85);
    ctx.font = "bold 16px sans-serif";
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#86efac";
    ctx.fillText("ВНЕСИТЕ ОПЛАТУ", 150, 115);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ПУСК / START", 150, 255);

    ctx.fillStyle = "#1e293b";
    ctx.fillRect(45, 290, 210, 80);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 290, 210, 80);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 14px Inter, sans-serif";
    ctx.fillText("ПРИЕМ МОНЕТ И КУПЮР", 150, 335);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.fillText("СТОП / STOP", 150, 485);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px Inter, sans-serif";
    ctx.fillText("TOZA SUV", 150, 560);

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(150, 625, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Inter, sans-serif";
    ctx.fillText("24/7", 150, 632);

    return new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    let isCancelled = false;
    let cleanupFn: (() => void) | null = null;

    async function initThree() {
      let THREE: any;
      let OrbitControls: any;

      try {
        THREE = await import("three");
        try {
          const mod = await import("three/examples/jsm/controls/OrbitControls.js");
          OrbitControls = mod.OrbitControls;
        } catch {
          const mod = await import("three/addons/controls/OrbitControls.js" as any);
          OrbitControls = mod.OrbitControls;
        }
      } catch (err) {
        console.warn("Dynamic fallback to Three.js script:", err);
        await new Promise((resolve, reject) => {
          if ((window as any).THREE) return resolve((window as any).THREE);
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
          script.onload = () => resolve((window as any).THREE);
          script.onerror = reject;
          document.head.appendChild(script);
        });
        await new Promise((resolve, reject) => {
          if ((window as any).THREE?.OrbitControls) return resolve(true);
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        THREE = (window as any).THREE;
        OrbitControls = (window as any).THREE.OrbitControls;
      }

      if (isCancelled || !mountRef.current) return;

      const container = mountRef.current;
      const width = container.clientWidth || 800;
      const height = container.clientHeight || 650;

      const scene = new THREE.Scene();
      sceneRef.current = scene;
      scene.background = new THREE.Color(0x070b12);
      scene.fog = new THREE.FogExp2(0x070b12, 0.12);

      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      camera.position.set(2.4, 1.4, 3.2);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      rendererRef.current = renderer;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2 + 0.05;
      controls.minDistance = 1.2;
      controls.maxDistance = 6.5;
      controls.target.set(0, 0.1, 0);
      controlsRef.current = controls;

      // Lights
      const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
      keyLight.position.set(4, 6, 4);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      keyLight.shadow.bias = -0.0005;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.9);
      fillLight.position.set(-4, 3, 2);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
      rimLight.position.set(0, 4, -4);
      scene.add(rimLight);

      const dispenserLight = new THREE.SpotLight(0xa5f3fc, 2.5, 2.2, Math.PI / 4, 0.4);
      dispenserLight.position.set(-0.16, 0.42, 0.15);
      dispenserLight.target.position.set(-0.16, -0.2, 0.15);
      scene.add(dispenserLight);
      scene.add(dispenserLight.target);

      const marqueeLight = new THREE.PointLight(0x38bdf8, 1.2, 3);
      marqueeLight.position.set(0, 1.05, 0.5);
      scene.add(marqueeLight);

      const nightLight1 = new THREE.PointLight(0x22c55e, 0, 1.5);
      nightLight1.position.set(0.32, 0.35, 0.45);
      scene.add(nightLight1);

      const nightLight2 = new THREE.PointLight(0xef4444, 0, 1.5);
      nightLight2.position.set(0.32, -0.15, 0.45);
      scene.add(nightLight2);

      lightsRef.current = {
        ambient: ambientLight,
        keyLight,
        fillLight,
        dispenserLight,
        marqueeLight,
        nightPointLights: [nightLight1, nightLight2],
      };

      // Ground
      const groundGeo = new THREE.PlaneGeometry(20, 20);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x090f18,
        roughness: 0.8,
        metalness: 0.2,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.06;
      ground.receiveShadow = true;
      scene.add(ground);

      const platformGeo = new THREE.CylinderGeometry(1.4, 1.5, 0.06, 64);
      const platformMat = new THREE.MeshStandardMaterial({
        color: 0x131f2e,
        roughness: 0.35,
        metalness: 0.7,
      });
      const platform = new THREE.Mesh(platformGeo, platformMat);
      platform.position.y = -1.03;
      platform.receiveShadow = true;
      scene.add(platform);

      const ringGeo = new THREE.RingGeometry(1.2, 1.25, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.99;
      scene.add(ring);

      // Machine Group
      const machineGroup = new THREE.Group();
      machineGroupRef.current = machineGroup;
      scene.add(machineGroup);

      const outerMaterials: any[] = [];
      bodyMaterialsRef.current = outerMaterials;

      const marqueeTex = createMarqueeTexture(THREE);
      const screenTex = createScreenTexture(THREE);
      const instructionsTex = createInstructionsTexture(THREE);
      const lowerBannerTex = createLowerBannerTexture(THREE);
      const controlPanelTex = createControlPanelTexture(THREE);

      const whitePaintMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.25,
        metalness: 0.15,
      });
      outerMaterials.push(whitePaintMat);

      const bluePaintMat = new THREE.MeshStandardMaterial({
        color: 0x0f5be1,
        roughness: 0.2,
        metalness: 0.25,
      });
      outerMaterials.push(bluePaintMat);

      const darkSteelMat = new THREE.MeshStandardMaterial({
        color: 0x1a2433,
        roughness: 0.4,
        metalness: 0.6,
      });
      outerMaterials.push(darkSteelMat);

      const chromeMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.1,
        metalness: 0.95,
      });

      const stainlessSteelMat = new THREE.MeshStandardMaterial({
        color: 0xc8d3de,
        roughness: 0.25,
        metalness: 0.85,
      });

      // Main cabinet
      const leftBodyGeo = new THREE.BoxGeometry(0.64, 1.85, 0.74);
      const leftBody = new THREE.Mesh(leftBodyGeo, whitePaintMat);
      leftBody.position.set(-0.19, 0, 0);
      leftBody.castShadow = true;
      leftBody.receiveShadow = true;
      machineGroup.add(leftBody);

      const rightBodyGeo = new THREE.BoxGeometry(0.38, 1.85, 0.74);
      const rightBody = new THREE.Mesh(rightBodyGeo, bluePaintMat);
      rightBody.position.set(0.32, 0, 0);
      rightBody.castShadow = true;
      rightBody.receiveShadow = true;
      machineGroup.add(rightBody);

      const backPlateGeo = new THREE.BoxGeometry(1.03, 1.83, 0.02);
      const backPlate = new THREE.Mesh(backPlateGeo, darkSteelMat);
      backPlate.position.set(0, 0, -0.375);
      machineGroup.add(backPlate);

      // Top Canopy / Marquee
      const canopyGeo = new THREE.BoxGeometry(1.06, 0.22, 0.78);
      const canopy = new THREE.Mesh(canopyGeo, bluePaintMat);
      canopy.position.set(0, 0.98, 0.01);
      canopy.castShadow = true;
      machineGroup.add(canopy);

      const marqueeFaceGeo = new THREE.PlaneGeometry(1.04, 0.2);
      const marqueeFaceMat = new THREE.MeshStandardMaterial({
        map: marqueeTex,
        emissive: 0x0b4cb4,
        emissiveMap: marqueeTex,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const marqueeFace = new THREE.Mesh(marqueeFaceGeo, marqueeFaceMat);
      marqueeFace.position.set(0, 0.98, 0.402);
      machineGroup.add(marqueeFace);

      // Left column: Upper Display Screen
      const screenFrameGeo = new THREE.BoxGeometry(0.54, 0.36, 0.02);
      const screenFrameMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.3,
        metalness: 0.5,
      });
      const screenFrame = new THREE.Mesh(screenFrameGeo, screenFrameMat);
      screenFrame.position.set(-0.19, 0.64, 0.375);
      machineGroup.add(screenFrame);

      const screenDisplayGeo = new THREE.PlaneGeometry(0.51, 0.33);
      const screenDisplayMat = new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: 0x0369a1,
        emissiveMap: screenTex,
        emissiveIntensity: 0.7,
        roughness: 0.1,
      });
      const screenDisplay = new THREE.Mesh(screenDisplayGeo, screenDisplayMat);
      screenDisplay.position.set(-0.19, 0.64, 0.387);
      machineGroup.add(screenDisplay);

      // Instructions panel
      const instrPlaneGeo = new THREE.PlaneGeometry(0.54, 0.18);
      const instrPlaneMat = new THREE.MeshBasicMaterial({
        map: instructionsTex,
      });
      const instrPlane = new THREE.Mesh(instrPlaneGeo, instrPlaneMat);
      instrPlane.position.set(-0.19, 0.34, 0.372);
      machineGroup.add(instrPlane);

      // Dispensing Chamber
      const bayFrameGeo = new THREE.BoxGeometry(0.44, 0.62, 0.03);
      const bayFrame = new THREE.Mesh(bayFrameGeo, chromeMat);
      bayFrame.position.set(-0.19, -0.1, 0.372);
      machineGroup.add(bayFrame);

      const chamberBackGeo = new THREE.PlaneGeometry(0.4, 0.58);
      const chamberBack = new THREE.Mesh(chamberBackGeo, stainlessSteelMat);
      chamberBack.position.set(-0.19, -0.1, 0.08);
      machineGroup.add(chamberBack);

      const chamberLeftGeo = new THREE.PlaneGeometry(0.3, 0.58);
      const chamberLeft = new THREE.Mesh(chamberLeftGeo, stainlessSteelMat);
      chamberLeft.rotation.y = Math.PI / 2;
      chamberLeft.position.set(-0.39, -0.1, 0.23);
      machineGroup.add(chamberLeft);

      const chamberRightGeo = new THREE.PlaneGeometry(0.3, 0.58);
      const chamberRight = new THREE.Mesh(chamberRightGeo, stainlessSteelMat);
      chamberRight.rotation.y = -Math.PI / 2;
      chamberRight.position.set(0.01, -0.1, 0.23);
      machineGroup.add(chamberRight);

      const chamberTopGeo = new THREE.PlaneGeometry(0.4, 0.3);
      const chamberTop = new THREE.Mesh(chamberTopGeo, stainlessSteelMat);
      chamberTop.rotation.x = Math.PI / 2;
      chamberTop.position.set(-0.19, 0.19, 0.23);
      machineGroup.add(chamberTop);

      const grateGeo = new THREE.BoxGeometry(0.39, 0.02, 0.28);
      const grateMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.3,
        metalness: 0.9,
      });
      const grate = new THREE.Mesh(grateGeo, grateMat);
      grate.position.set(-0.19, -0.38, 0.23);
      grate.receiveShadow = true;
      machineGroup.add(grate);

      const nozzleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.08, 24);
      const nozzle = new THREE.Mesh(nozzleGeo, chromeMat);
      nozzle.position.set(-0.19, 0.15, 0.23);
      machineGroup.add(nozzle);

      const doorGeo = new THREE.BoxGeometry(0.38, 0.56, 0.01);
      const doorMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.32,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.9,
        ior: 1.5,
      });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(-0.19, -0.1, 0.36);
      machineGroup.add(door);

      const handleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 16);
      const handle = new THREE.Mesh(handleGeo, chromeMat);
      handle.position.set(-0.02, -0.1, 0.375);
      machineGroup.add(handle);

      // 19L Water Bottle
      const bottleGroup = new THREE.Group();
      bottleGroup.position.set(-0.19, -0.37, 0.23);
      machineGroup.add(bottleGroup);

      const bottleMat = new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.75,
        ior: 1.4,
      });

      const bottleBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.28, 32);
      const bottleBody = new THREE.Mesh(bottleBodyGeo, bottleMat);
      bottleBody.position.y = 0.15;
      bottleBody.castShadow = true;
      bottleGroup.add(bottleBody);

      const bottleShoulderGeo = new THREE.ConeGeometry(0.12, 0.08, 32, 1, true);
      const bottleShoulder = new THREE.Mesh(bottleShoulderGeo, bottleMat);
      bottleShoulder.position.y = 0.32;
      bottleGroup.add(bottleShoulder);

      const bottleNeckGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 24);
      const bottleNeck = new THREE.Mesh(bottleNeckGeo, bottleMat);
      bottleNeck.position.y = 0.38;
      bottleGroup.add(bottleNeck);

      const waterLevelGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.26, 32);
      const waterLevelMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.75,
        roughness: 0.1,
        metalness: 0.2,
      });
      const waterLevel = new THREE.Mesh(waterLevelGeo, waterLevelMat);
      waterLevel.position.y = 0.14;
      waterLevel.scale.set(1, 0.15, 1);
      bottleGroup.add(waterLevel);
      waterLevelRef.current = waterLevel;

      const streamGeo = new THREE.CylinderGeometry(0.009, 0.014, 0.16, 16);
      const streamMat = new THREE.MeshBasicMaterial({
        color: 0xa5f3fc,
        transparent: true,
        opacity: 0.85,
      });
      const waterStream = new THREE.Mesh(streamGeo, streamMat);
      waterStream.position.set(-0.19, 0.05, 0.23);
      waterStream.visible = false;
      machineGroup.add(waterStream);
      waterStreamRef.current = waterStream;

      const particleCount = 28;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = -0.19 + (Math.random() - 0.5) * 0.08;
        positions[i + 1] = -0.05 + Math.random() * 0.04;
        positions[i + 2] = 0.23 + (Math.random() - 0.5) * 0.08;
      }
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0xe0f2fe,
        size: 0.018,
        transparent: true,
        opacity: 0.7,
      });
      const particles = new THREE.Points(particleGeo, particleMat);
      particles.visible = false;
      machineGroup.add(particles);
      waterParticlesRef.current = particles;

      // Lower Banner
      const lowerBannerGeo = new THREE.PlaneGeometry(0.54, 0.24);
      const lowerBannerMat = new THREE.MeshBasicMaterial({
        map: lowerBannerTex,
      });
      const lowerBanner = new THREE.Mesh(lowerBannerGeo, lowerBannerMat);
      lowerBanner.position.set(-0.19, -0.62, 0.372);
      machineGroup.add(lowerBanner);

      // Right column: Control panel
      const controlFaceGeo = new THREE.PlaneGeometry(0.36, 1.78);
      const controlFaceMat = new THREE.MeshStandardMaterial({
        map: controlPanelTex,
        roughness: 0.25,
        metalness: 0.2,
      });
      const controlFace = new THREE.Mesh(controlFaceGeo, controlFaceMat);
      controlFace.position.set(0.32, 0, 0.372);
      machineGroup.add(controlFace);

      // 3D START button
      const startBtnGeo = new THREE.CylinderGeometry(0.04, 0.045, 0.02, 32);
      const startBtnMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x16a34a,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.3,
      });
      const startBtn = new THREE.Mesh(startBtnGeo, startBtnMat);
      startBtn.rotation.x = Math.PI / 2;
      startBtn.position.set(0.32, 0.28, 0.385);
      machineGroup.add(startBtn);

      const startRingGeo = new THREE.TorusGeometry(0.05, 0.006, 16, 32);
      const startRing = new THREE.Mesh(startRingGeo, chromeMat);
      startRing.position.set(0.32, 0.28, 0.378);
      machineGroup.add(startRing);

      // 3D STOP button
      const stopBtnGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.02, 32);
      const stopBtnMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xdc2626,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.3,
      });
      const stopBtn = new THREE.Mesh(stopBtnGeo, stopBtnMat);
      stopBtn.rotation.x = Math.PI / 2;
      stopBtn.position.set(0.32, -0.22, 0.385);
      machineGroup.add(stopBtn);

      const stopRingGeo = new THREE.TorusGeometry(0.048, 0.006, 16, 32);
      const stopRing = new THREE.Mesh(stopRingGeo, chromeMat);
      stopRing.position.set(0.32, -0.22, 0.378);
      machineGroup.add(stopRing);

      // Legs
      const legPositions = [
        [-0.44, -0.98, -0.3],
        [-0.44, -0.98, 0.3],
        [0.44, -0.98, -0.3],
        [0.44, -0.98, 0.3],
      ];

      legPositions.forEach(([lx, ly, lz]) => {
        const legRodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 16);
        const legRod = new THREE.Mesh(legRodGeo, chromeMat);
        legRod.position.set(lx, ly, lz);
        machineGroup.add(legRod);

        const footGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.02, 24);
        const foot = new THREE.Mesh(footGeo, darkSteelMat);
        foot.position.set(lx, ly - 0.05, lz);
        machineGroup.add(foot);
      });

      // Internal 9-stage system
      const internalGroup = new THREE.Group();
      internalGroup.visible = false;
      internalGroupRef.current = internalGroup;
      machineGroup.add(internalGroup);

      const vessel1Geo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 24);
      const vessel1Mat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.3,
        metalness: 0.6,
      });
      const vessel1 = new THREE.Mesh(vessel1Geo, vessel1Mat);
      vessel1.position.set(-0.35, 0.1, -0.1);
      internalGroup.add(vessel1);

      const vessel2Geo = new THREE.CylinderGeometry(0.09, 0.09, 0.7, 24);
      const vessel2 = new THREE.Mesh(vessel2Geo, vessel1Mat);
      vessel2.position.set(-0.15, 0.1, -0.1);
      internalGroup.add(vessel2);

      for (let i = 0; i < 3; i++) {
        const cartridgeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 20);
        const cartridgeMat = new THREE.MeshStandardMaterial({
          color: i === 2 ? 0x38bdf8 : 0x1d4ed8,
          roughness: 0.2,
          metalness: 0.4,
          transparent: i === 2,
          opacity: i === 2 ? 0.8 : 1,
        });
        const cartridge = new THREE.Mesh(cartridgeGeo, cartridgeMat);
        cartridge.position.set(0.06 + i * 0.11, 0.05, -0.1);
        internalGroup.add(cartridge);
      }

      const membraneGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.85, 32);
      const membrane = new THREE.Mesh(membraneGeo, stainlessSteelMat);
      membrane.rotation.z = Math.PI / 2;
      membrane.position.set(0, -0.45, -0.1);
      internalGroup.add(membrane);

      const clamp1Geo = new THREE.TorusGeometry(0.07, 0.01, 16, 32);
      const clamp1 = new THREE.Mesh(clamp1Geo, chromeMat);
      clamp1.rotation.y = Math.PI / 2;
      clamp1.position.set(-0.38, -0.45, -0.1);
      internalGroup.add(clamp1);

      const clamp2 = new THREE.Mesh(clamp1Geo, chromeMat);
      clamp2.rotation.y = Math.PI / 2;
      clamp2.position.set(0.38, -0.45, -0.1);
      internalGroup.add(clamp2);

      const uvTubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 24);
      const uvTubeMat = new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8,
      });
      const uvTube = new THREE.Mesh(uvTubeGeo, uvTubeMat);
      uvTube.position.set(0.28, 0.55, -0.12);
      internalGroup.add(uvTube);

      const minGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 20);
      const minMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xeab308,
        emissiveIntensity: 0.3,
        roughness: 0.3,
      });
      const mineralizer = new THREE.Mesh(minGeo, minMat);
      mineralizer.position.set(0.18, 0.55, -0.12);
      internalGroup.add(mineralizer);

      const pumpGeo = new THREE.BoxGeometry(0.18, 0.16, 0.18);
      const pumpMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
        metalness: 0.7,
      });
      const pump1 = new THREE.Mesh(pumpGeo, pumpMat);
      pump1.position.set(-0.3, -0.7, -0.15);
      internalGroup.add(pump1);

      const pump2 = new THREE.Mesh(pumpGeo, pumpMat);
      pump2.position.set(-0.08, -0.7, -0.15);
      internalGroup.add(pump2);

      const pcbGeo = new THREE.BoxGeometry(0.25, 0.3, 0.02);
      const pcbMat = new THREE.MeshStandardMaterial({
        color: 0x064e3b,
        emissive: 0x10b981,
        emissiveIntensity: 0.2,
        roughness: 0.4,
      });
      const pcb = new THREE.Mesh(pcbGeo, pcbMat);
      pcb.position.set(0.3, 0.5, 0.1);
      internalGroup.add(pcb);

      // Hotspots
      const hotspotPins: any[] = [];
      HOTSPOTS.forEach((spot) => {
        const pinGroup = new THREE.Group();
        pinGroup.position.set(...spot.position);

        const orbGeo = new THREE.SphereGeometry(0.03, 16, 16);
        const orbMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        pinGroup.add(orb);

        const haloGeo = new THREE.RingGeometry(0.04, 0.055, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        pinGroup.add(halo);

        pinGroup.userData = spot;
        machineGroup.add(pinGroup);
        hotspotPins.push(pinGroup);
      });

      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const newW = container.clientWidth || 800;
        const newH = container.clientHeight || 650;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      };
      window.addEventListener("resize", handleResize);

      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      const handleClick = (event: MouseEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(hotspotPins, true);
        if (intersects.length > 0) {
          let hit: any = intersects[0].object;
          while (hit.parent && !hit.userData?.id) {
            hit = hit.parent;
          }
          if (hit.userData?.id) {
            setActiveHotspot(hit.userData as HotspotInfo);
          }
        }
      };

      renderer.domElement.addEventListener("click", handleClick);

      let clock = new THREE.Clock();
      let fillAnimation = 0.15;

      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        if (isAutoRotate && !isDispensing) {
          machineGroup.rotation.y += 0.005;
        }

        hotspotPins.forEach((pin, idx) => {
          const halo = pin.children[1];
          if (halo) {
            halo.lookAt(camera.position);
            const scale = 1 + Math.sin(time * 3 + idx) * 0.25;
            halo.scale.set(scale, scale, scale);
          }
        });

        if (isDispensing) {
          if (waterStreamRef.current) {
            waterStreamRef.current.visible = true;
            waterStreamRef.current.scale.x = 0.9 + Math.sin(time * 30) * 0.15;
            waterStreamRef.current.scale.z = 0.9 + Math.cos(time * 30) * 0.15;
          }
          if (waterParticlesRef.current) {
            waterParticlesRef.current.visible = true;
            waterParticlesRef.current.rotation.y += 0.05;
          }
          if (fillAnimation < 1.0) {
            fillAnimation += delta * 0.25;
            if (waterLevelRef.current) {
              waterLevelRef.current.scale.set(1, fillAnimation, 1);
            }
            setDispensedLiters(Number((fillAnimation * 18.9).toFixed(1)));
          }
        } else {
          if (waterStreamRef.current) waterStreamRef.current.visible = false;
          if (waterParticlesRef.current) waterParticlesRef.current.visible = false;
        }

        controls.update();
        renderer.render(scene, camera);
      };

      animate();
      setLoading(false);

      return () => {
        window.removeEventListener("resize", handleResize);
        if (renderer.domElement) {
          renderer.domElement.removeEventListener("click", handleClick);
          if (renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        renderer.dispose();
      };
    }

    initThree().then((cleanup) => {
      if (isCancelled) {
        cleanup?.();
      } else {
        cleanupFn = cleanup || null;
      }
    });

    return () => {
      isCancelled = true;
      cleanupFn?.();
    };
  }, []);

  useEffect(() => {
    if (!lightsRef.current || !sceneRef.current) return;
    const { ambient, keyLight, fillLight, dispenserLight, marqueeLight, nightPointLights } = lightsRef.current;

    if (isNightMode) {
      sceneRef.current.background.setHex(0x020611);
      ambient.intensity = 0.25;
      keyLight.intensity = 0.4;
      fillLight.intensity = 0.3;
      dispenserLight.intensity = 4.5;
      marqueeLight.intensity = 3.0;
      nightPointLights[0].intensity = 2.0;
      nightPointLights[1].intensity = 2.0;
    } else {
      sceneRef.current.background.setHex(0x070b12);
      ambient.intensity = 0.85;
      keyLight.intensity = 1.6;
      fillLight.intensity = 0.9;
      dispenserLight.intensity = 2.5;
      marqueeLight.intensity = 1.2;
      nightPointLights[0].intensity = 0;
      nightPointLights[1].intensity = 0;
    }
  }, [isNightMode]);

  useEffect(() => {
    if (!bodyMaterialsRef.current || !internalGroupRef.current) return;

    if (isXrayMode) {
      bodyMaterialsRef.current.forEach((mat) => {
        mat.transparent = true;
        mat.opacity = 0.22;
        mat.wireframe = false;
      });
      internalGroupRef.current.visible = true;
    } else {
      bodyMaterialsRef.current.forEach((mat) => {
        mat.transparent = false;
        mat.opacity = 1.0;
      });
      internalGroupRef.current.visible = false;
    }
  }, [isXrayMode]);

  const setCameraAngle = useCallback((preset: string) => {
    setActivePreset(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    setIsAutoRotate(false);

    if (preset === "iso") {
      camera.position.set(2.4, 1.4, 3.2);
      controls.target.set(0, 0.1, 0);
    } else if (preset === "front") {
      camera.position.set(0, 0.1, 3.1);
      controls.target.set(0, 0.1, 0);
    } else if (preset === "dispenser") {
      camera.position.set(-0.25, 0.05, 1.35);
      controls.target.set(-0.19, -0.1, 0.25);
    } else if (preset === "controls") {
      camera.position.set(0.45, 0.2, 1.35);
      controls.target.set(0.32, 0.15, 0.35);
    } else if (preset === "xray") {
      setIsXrayMode(true);
      camera.position.set(0.3, 0.2, 2.4);
      controls.target.set(0, -0.1, 0);
    }
  }, []);

  return (
    <div className="vending-3d-wrapper">
      <div className="vending-3d-viewport">
        <div ref={mountRef} className="vending-3d-canvas-mount" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
        {loading && (
          <div className="vending-3d-loader">
            <div className="loader-spinner" />
            <p>Загрузка 3D-модели автомата XL-01...</p>
          </div>
        )}

        {activeHotspot && (
          <div className="hotspot-popup">
            <button className="hotspot-close" onClick={() => setActiveHotspot(null)}>
              ✕
            </button>
            <span className="hotspot-badge">{activeHotspot.category}</span>
            <h4>{activeHotspot.title}</h4>
            <p>{activeHotspot.description}</p>
            <div className="hotspot-spec">
              <strong>Параметр:</strong> {activeHotspot.spec}
            </div>
          </div>
        )}
      </div>

      <div className="vending-3d-hud-top">
        <div className="vending-3d-presets">
          <button
            type="button"
            className={`preset-btn ${activePreset === "iso" ? "active" : ""}`}
            onClick={() => setCameraAngle("iso")}
          >
            3D Обзор (360°)
          </button>
          <button
            type="button"
            className={`preset-btn ${activePreset === "front" ? "active" : ""}`}
            onClick={() => setCameraAngle("front")}
          >
            Лицевая панель
          </button>
          <button
            type="button"
            className={`preset-btn ${activePreset === "dispenser" ? "active" : ""}`}
            onClick={() => setCameraAngle("dispenser")}
          >
            Камера налива
          </button>
          <button
            type="button"
            className={`preset-btn ${activePreset === "controls" ? "active" : ""}`}
            onClick={() => setCameraAngle("controls")}
          >
            Панель управления
          </button>
          <button
            type="button"
            className={`preset-btn ${activePreset === "xray" ? "active" : ""}`}
            onClick={() => setCameraAngle("xray")}
          >
            🔬 9 Ступеней (X-Ray)
          </button>
        </div>

        <div className="vending-3d-toggles">
          <button
            type="button"
            className={`tool-btn ${isDispensing ? "active-dispense" : ""}`}
            onClick={() => setIsDispensing(!isDispensing)}
            title="Запустить анимацию налива воды в бутыль"
          >
            💧 {isDispensing ? "Остановить налив" : "Тестовый налив"}
          </button>
          <button
            type="button"
            className={`tool-btn ${isNightMode ? "active-night" : ""}`}
            onClick={() => setIsNightMode(!isNightMode)}
            title="Переключить ночную подсветку"
          >
            🌙 {isNightMode ? "День" : "Ночная подсветка"}
          </button>
          <button
            type="button"
            className={`tool-btn ${isXrayMode ? "active" : ""}`}
            onClick={() => setIsXrayMode(!isXrayMode)}
            title="Прозрачный вид корпуса и внутренние фильтры"
          >
            {isXrayMode ? "Корпус" : "Рентген / Фильтры"}
          </button>
          <button
            type="button"
            className={`tool-btn ${isAutoRotate ? "active" : ""}`}
            onClick={() => setIsAutoRotate(!isAutoRotate)}
            title="Автоповорот 360 градусов"
          >
            🔄 Вращение
          </button>
        </div>
      </div>

      <div className="vending-3d-hud-bottom">
        <div className="telemetry-card">
          <span className="telemetry-label">СТАТУС ОБОРУДОВАНИЯ</span>
          <div className="telemetry-val">
            <span className={`status-dot ${isDispensing ? "pulsing" : ""}`} />
            {isDispensing ? "ИДЕТ НАЛИВ ВОДЫ..." : "ОЖИДАНИЕ КЛИЕНТА • READY"}
          </div>
        </div>

        {isDispensing && (
          <div className="telemetry-card highlight">
            <span className="telemetry-label">НАЛИТО В БУТЫЛЬ (19Л)</span>
            <div className="telemetry-val">{dispensedLiters} / 18.9 ЛИТРОВ</div>
          </div>
        )}

        <div className="telemetry-card">
          <span className="telemetry-label">ПРОИЗВОДИТЕЛЬНОСТЬ</span>
          <div className="telemetry-val">250 ЛИТРОВ / ЧАС</div>
        </div>

        <div className="telemetry-card">
          <span className="telemetry-label">УПРАВЛЕНИЕ КАМЕРОЙ</span>
          <div className="telemetry-val text-muted">
            ЛКМ — вращение • Колесо — зум • ПКМ — перемещение
          </div>
        </div>
      </div>
    </div>
  );
}
