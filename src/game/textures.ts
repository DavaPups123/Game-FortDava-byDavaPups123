import * as THREE from 'three';

function makeProceduralTexture(
  drawFn: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
  repeat = 1,
  anisotropy = 4
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (repeat > 1) tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export interface ProceduralTextures {
  woodPlanks: THREE.CanvasTexture;
  brickWall: THREE.CanvasTexture;
  stoneBlock: THREE.CanvasTexture;
  terrainDetail: THREE.CanvasTexture;
  goldChest: THREE.CanvasTexture;
  tokenChest: THREE.CanvasTexture;
  slurpBarrel: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  shopSign: THREE.CanvasTexture;
  weaponMetal: THREE.CanvasTexture;
  weaponGrip: THREE.CanvasTexture;
  weaponScope: THREE.CanvasTexture;
  woodHandle: THREE.CanvasTexture;
  roofTiles: THREE.CanvasTexture;
  armorFabric: THREE.CanvasTexture;
}

export function createProceduralTextures(maxAnisotropy = 4): ProceduralTextures {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));

  const woodPlanks = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#c27828';
    ctx.fillRect(0, 0, s, s);
    const planks = 4;
    const ph = s / planks;
    for (let i = 0; i < planks; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#b4691e' : '#cc8132';
      ctx.fillRect(0, i * ph + 2, s, ph - 4);
      ctx.fillStyle = '#6b3808';
      ctx.fillRect(0, i * ph, s, 3);
      ctx.strokeStyle = 'rgba(90, 45, 8, 0.28)';
      ctx.lineWidth = 2;
      for (let g = 0; g < 4; g++) {
        ctx.beginPath();
        ctx.moveTo(0, i * ph + 10 + g * 12);
        ctx.bezierCurveTo(s * 0.3, i * ph + 6 + g * 12, s * 0.7, i * ph + 16 + g * 12, s, i * ph + 10 + g * 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#334155';
      ctx.fillRect(10, i * ph + 8, 5, 5);
      ctx.fillRect(s - 15, i * ph + ph - 13, 5, 5);
    }
  }, 256, 1, aniso);

  const brickWall = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const cols = 4;
    const rh = s / rows;
    const cw = s / cols;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (cw / 2);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.14)';
        ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
  }, 256, 2, aniso);

  const stoneBlock = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.14)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 18 + Math.random() * 24, 14 + Math.random() * 20);
    }
  }, 256, 2, aniso);

  const terrainDetail = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 8, 8);
    }
  }, 256, 48, aniso);

  const goldChest = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(0, 0, s, 26);
    ctx.fillRect(0, s - 26, s, 26);
    ctx.fillRect(0, 0, 24, s);
    ctx.fillRect(s - 24, 0, 24, s);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(s / 2 - 22, s / 2 - 26, 44, 52);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(s / 2 - 7, s / 2 - 8, 14, 20);
  }, 128, 1, aniso);

  const tokenChest = makeProceduralTexture((ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, s, s);
    grad.addColorStop(0, '#0284c7');
    grad.addColorStop(1, '#7e22ce');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 14;
    ctx.strokeRect(7, 7, s - 14, s - 14);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(s / 2, 26);
    ctx.lineTo(s - 26, s / 2);
    ctx.lineTo(s / 2, s - 26);
    ctx.lineTo(26, s / 2);
    ctx.closePath();
    ctx.fill();
  }, 128, 1, aniso);

  const slurpBarrel = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 24, s, s - 48);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 18, s, 10);
    ctx.fillRect(0, s - 28, s, 10);
    ctx.fillStyle = '#e0f2fe';
    ctx.beginPath();
    ctx.arc(s / 2, s / 2 + 6, 18, 0, Math.PI * 2);
    ctx.fill();
  }, 128, 1, aniso);

  const contactShadow = makeProceduralTexture((ctx, s) => {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }, 128, 1, 1);

  const shopSign = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, s - 16, s - 16);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NOMS', s / 2, s / 2 - 18);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('SHOP 24/7', s / 2, s / 2 + 26);
  }, 256, 1, aniso);

  const weaponMetal = makeProceduralTexture((ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#475569');
    grad.addColorStop(0.5, '#334155');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#0f172a';
    for (let x = 10; x < s - 10; x += 18) {
      ctx.fillRect(x, 12, 10, 14);
      ctx.fillRect(x, s / 2 - 8, 8, 22);
    }
    ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
    for (let y = 8; y < s; y += 16) {
      ctx.fillRect(0, y, s, 2);
    }
    ctx.fillStyle = '#94a3b8';
    [32, s - 32].forEach((rx) => {
      ctx.beginPath();
      ctx.arc(rx, s * 0.78, 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }, 256, 1, aniso);

  const weaponGrip = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 3;
    for (let i = -s; i < s * 2; i += 14) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + s, 0);
      ctx.lineTo(i, s);
      ctx.stroke();
    }
  }, 128, 1, aniso);

  const weaponScope = makeProceduralTexture((ctx, s) => {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.55, '#0284c7');
    grad.addColorStop(0.85, '#1e1b4b');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s / 2, 10);
    ctx.lineTo(s / 2, s - 10);
    ctx.moveTo(10, s / 2);
    ctx.lineTo(s - 10, s / 2);
    ctx.stroke();
  }, 128, 1, aniso);

  const woodHandle = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.22)';
    ctx.lineWidth = 4;
    for (let y = 6; y < s; y += 14) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(s * 0.35, y - 5, s * 0.7, y + 6, s, y);
      ctx.stroke();
    }
  }, 128, 1, aniso);

  const roofTiles = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const cols = 6;
    const rh = s / rows;
    const cw = s / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (cw / 2);
      for (let c = -1; c <= cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? 'rgba(15,23,42,0.16)' : 'rgba(255,255,255,0.12)';
        ctx.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
  }, 256, 2, aniso);

  const armorFabric = makeProceduralTexture((ctx, s) => {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, s, s);
    // Clean symmetrical tactical fabric weave & seam highlights (multiplied cleanly by skin color)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.06)';
    for (let y = 0; y < s; y += 16) {
      ctx.fillRect(0, y, s, 4);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    for (let x = 0; x < s; x += 32) {
      ctx.fillRect(x, 0, 2, s);
    }
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.12)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, s - 8, s - 8);
  }, 128, 2, aniso);

  return {
    woodPlanks,
    brickWall,
    stoneBlock,
    terrainDetail,
    goldChest,
    tokenChest,
    slurpBarrel,
    contactShadow,
    shopSign,
    weaponMetal,
    weaponGrip,
    weaponScope,
    woodHandle,
    roofTiles,
    armorFabric,
  };
}
