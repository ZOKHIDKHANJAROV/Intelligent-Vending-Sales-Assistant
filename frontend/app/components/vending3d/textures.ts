import * as THREE from "three";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasTexture(w: number, h: number, draw: Draw, anisotropy = 8): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

const SANS = "Inter, 'Segoe UI', Arial, sans-serif";

export function marqueeTexture() {
  return canvasTexture(1024, 220, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2f7df0");
    g.addColorStop(0.5, "#1560d6");
    g.addColorStop(1, "#0c48b0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // light-box glow bands
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, w, 16);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, h - 14, w, 14);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(160,215,255,0.9)";
    ctx.shadowBlur = 14;
    ctx.font = `800 78px ${SANS}`;
    ctx.fillText("ATLANT FORTUNA LLC", w / 2, 96);
    ctx.shadowBlur = 0;
    ctx.font = `600 24px ${SANS}`;
    ctx.fillStyle = "rgba(220,238,255,0.9)";
    ctx.textAlign = "right";
    ctx.fillText("www.atlant-f.uz", w - 40, 178);
  });
}

export function frontHeaderTexture() {
  return canvasTexture(1024, 96, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#1557c8";
    ctx.font = `800 46px ${SANS}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TOZA SUV VENDING AVTOMATI", w / 2, h / 2);
  });
}

export function screenTexture() {
  return canvasTexture(768, 480, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#e8f6ff");
    sky.addColorStop(0.45, "#8fd0f5");
    sky.addColorStop(1, "#0b5fa8");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // splash wave
    for (let layer = 0; layer < 4; layer++) {
      ctx.beginPath();
      const base = 210 + layer * 42;
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = base + Math.sin(x * 0.012 + layer * 1.3) * (34 - layer * 5) + Math.cos(x * 0.031 + layer) * 10;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = `rgba(${20 + layer * 10}, ${120 + layer * 18}, ${210 - layer * 12}, ${0.45 + layer * 0.12})`;
      ctx.fill();
    }
    // highlights on the crest
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = 210 + Math.sin(x * 0.012) * 34 + Math.cos(x * 0.031) * 10;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // bubbles
    for (let i = 0; i < 70; i++) {
      const x = (i * 97) % w;
      const y = 250 + ((i * 53) % 220);
      const r = 2 + (i % 5);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `900 64px ${SANS}`;
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(3,60,120,0.6)";
    ctx.shadowBlur = 12;
    ctx.fillText("TOZA SUV", 36, 90);
    ctx.shadowBlur = 0;
    ctx.font = `600 24px ${SANS}`;
    ctx.fillStyle = "#0b4a8a";
    ctx.fillText("9 bosqichli tozalash • 24/7", 40, 132);
  });
}

export function instructionsTexture() {
  const steps = [
    ["Idishni qo'ying", "Установите тару"],
    ["To'lovni kiriting", "Внесите оплату"],
    ["START tugmasi", "Нажмите СТАРТ"],
    ["Suv quyilmoqda", "Идёт налив"],
    ["STOP tugmasi", "Нажмите СТОП"],
    ["Idishni oling", "Заберите бутыль"],
  ];
  return canvasTexture(1024, 320, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 16 + col * 336;
      const y = 16 + row * 152;
      ctx.strokeStyle = "#2f7df0";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, 320, 136);
      ctx.fillStyle = "#1560d6";
      ctx.font = `900 92px ${SANS}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + 50, y + 70);
      ctx.textAlign = "left";
      ctx.fillStyle = "#0f2a55";
      ctx.font = `800 25px ${SANS}`;
      ctx.fillText(steps[i][0].toUpperCase(), x + 100, y + 52);
      ctx.fillStyle = "#5b6b82";
      ctx.font = `600 22px ${SANS}`;
      ctx.fillText(steps[i][1], x + 100, y + 90);
    }
  });
}

export function lowerBannerTexture() {
  return canvasTexture(1024, 300, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const lines = [
      "9 BOSQICHLI FILTRLASH JARAYONI",
      "MINERALLAR BILAN BOYITISH",
      "UV STERILIZATORI",
      "OZON STERILIZATSIYASI",
    ];
    ctx.fillStyle = "#1557c8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 48px 'Times New Roman', Georgia, serif`;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, 45 + i * 70));
  });
}

export function columnTexture() {
  return canvasTexture(360, 1800, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "#1d6ae6");
    g.addColorStop(0.5, "#1560d6");
    g.addColorStop(1, "#0f4fbd");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // edge bevel lines
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(0, 0, 6, h);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(w - 6, 0, 6, h);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    // y mapping: canvas y = (0.9 - worldY) / 1.8 * h
    const Y = (worldY: number) => ((0.9 - worldY) / 1.8) * h;
    ctx.font = `700 26px ${SANS}`;
    ctx.fillText("START", w / 2, Y(0.285));
    ctx.fillText("STOP", w / 2, Y(-0.315));
    ctx.font = `600 17px ${SANS}`;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("KUPYURA  •  MONETA", w / 2, Y(0.195));

    ctx.fillStyle = "#ffffff";
    ctx.font = `700 50px 'Times New Roman', Georgia, serif`;
    ctx.fillText("TOZA SUV", w / 2, Y(-0.5));

    // 24h icon
    const cy = Y(-0.7);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, cy, 44, -Math.PI * 0.35, Math.PI * 1.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w / 2 + 30, cy - 40);
    ctx.lineTo(w / 2 + 44, cy - 26);
    ctx.lineTo(w / 2 + 24, cy - 22);
    ctx.stroke();
    ctx.font = `800 36px ${SANS}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText("24", w / 2, cy + 3);
  });
}

/** LED-табло литража — перерисовывается во время налива */
export function createLedDisplay() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const draw = (liters: number, status: string) => {
    ctx.fillStyle = "#03070c";
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = "rgba(255,60,60,0.08)";
    ctx.font = "bold 58px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("88.88", 128, 42);
    ctx.fillStyle = "#ff4d3d";
    ctx.shadowColor = "#ff4d3d";
    ctx.shadowBlur = 12;
    ctx.fillText(liters.toFixed(2).padStart(5, "0"), 128, 42);
    ctx.shadowBlur = 0;
    ctx.font = "bold 15px 'Courier New', monospace";
    ctx.fillStyle = "#ff9b8f";
    ctx.fillText(status, 128, 82);
    tex.needsUpdate = true;
  };
  draw(0, "LITR • TAYYOR");
  return { texture: tex, draw };
}

export function pcbTexture() {
  return canvasTexture(256, 320, (ctx, w, h) => {
    ctx.fillStyle = "#0b5a3a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(212,175,55,0.75)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const x = (i * 37) % w;
      const y = (i * 61) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30, y);
      ctx.lineTo(x + 30, y + 40);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 14px monospace";
    ctx.fillText("AF-CTRL v3.2", 12, h - 14);
  });
}

export function labelTexture(title: string, subtitle: string, bg = "#ffffff", fg = "#0f2a55") {
  return canvasTexture(256, 160, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1560d6";
    ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 34px ${SANS}`;
    ctx.fillText(title, w / 2, 66);
    ctx.font = `600 20px ${SANS}`;
    ctx.globalAlpha = 0.75;
    ctx.fillText(subtitle, w / 2, 112);
  }, 4);
}

/** Полосатая текстура для анимации движения воды по трубкам */
export function flowTexture() {
  const tex = canvasTexture(128, 16, (ctx, w, h) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, "rgba(120,200,255,0)");
    g.addColorStop(0.5, "rgba(80,170,255,1)");
    g.addColorStop(1, "rgba(120,200,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }, 1);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
