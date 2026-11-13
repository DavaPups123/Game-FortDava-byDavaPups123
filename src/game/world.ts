import * as THREE from 'three';
import { STARTER_ISLAND_CENTER, WORLD_RADIUS } from './data';
import { ProceduralTextures } from './textures';
import { VehicleTypeId } from './types';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  destructible: boolean;
  hp: number;
  maxHp: number;
  mesh?: THREE.Mesh;
  type: string;
  isSlurpBarrel?: boolean;
  isTree?: boolean;
  isRock?: boolean;
  instanceId?: number;
  woodYield?: number;
}

export interface RampCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  baseY: number;
  topY: number;
  dir: number;
  hp: number;
  maxHp: number;
  mesh?: THREE.Mesh;
}

export interface RoofCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  baseY: number;
  topY: number;
  hp: number;
}

export interface ChestObj {
  x: number;
  y: number;
  z: number;
  opened: boolean;
  isTokenChest: boolean;
  mesh: THREE.Group;
  lidPivot: THREE.Group;
  beacon: THREE.Mesh;
  tokenOrb: THREE.Mesh | null;
}

export interface LaunchPadObj {
  x: number;
  y: number;
  z: number;
  radius: number;
  mesh: THREE.Group;
}

export interface WorldVehicleSpawn {
  type: VehicleTypeId;
  x: number;
  z: number;
  yaw: number;
}

/**
 * Multi-biome island height function:
 * - Central Plaza (flat city zone around 0,0)
 * - North-West Snow Mountains (x < -55, z < -55)
 * - South-East Desert Dunes (x > 65, z > 45)
 * - Winding River channel carving diagonally
 * - Starter Island off-shore at (-460, -460)
 */
export function getTerrainHeight(x: number, z: number): number {
  const starterDist = Math.hypot(x - STARTER_ISLAND_CENTER.x, z - STARTER_ISLAND_CENTER.z);
  if (starterDist < STARTER_ISLAND_CENTER.radius + 30) {
    const edge = Math.max(0, (starterDist - (STARTER_ISLAND_CENTER.radius - 8)) / 18);
    const wave = Math.sin(x * 0.08) * Math.cos(z * 0.08) * 1.4;
    return 4.5 + wave * 0.4 - edge * 14;
  }

  const distFromCenter = Math.hypot(x, z);
  const townFlatness = Math.min(1, Math.max(0, (distFromCenter - 58) / 40));
  const edgeDrop = Math.max(0, (distFromCenter - (WORLD_RADIUS - 38)) / 38) * -18;

  // River trough curving across the east/north-east side
  const riverCurveX = 78 + Math.sin(z * 0.015) * 32;
  const riverDist = Math.abs(x - riverCurveX);
  const riverCarve = distFromCenter < WORLD_RADIUS - 25 ? Math.max(0, 1 - riverDist / 14) * -5.2 : 0;

  let biomeH =
    Math.sin(x * 0.018) * Math.cos(z * 0.018) * 8.0 +
    Math.sin(x * 0.045 + 1.1) * Math.sin(z * 0.042 + 0.7) * 3.0;

  // Snow mountain peaks in NW quadrant
  if (x < -45 && z < -45) {
    const snowWeight = Math.min(1, (Math.hypot(x + 45, z + 45) - 10) / 80);
    const mountain = (Math.abs(Math.sin(x * 0.02)) + Math.abs(Math.cos(z * 0.02))) * 11.5;
    biomeH += mountain * snowWeight;
  }

  // Desert rolling dunes in SE quadrant
  if (x > 45 && z > 35) {
    const desertWeight = Math.min(1, (Math.hypot(x - 45, z - 35) - 10) / 70);
    const dunes = Math.sin(x * 0.032 + z * 0.022) * 5.2;
    biomeH = biomeH * (1 - desertWeight * 0.5) + dunes * desertWeight;
  }

  return biomeH * townFlatness + riverCarve + edgeDrop;
}

export function getBiomeAt(x: number, z: number): 'city' | 'snow' | 'desert' | 'forest' | 'shore' {
  const d = Math.hypot(x, z);
  if (d < 56) return 'city';
  if (x < -45 && z < -45) return 'snow';
  if (x > 55 && z > 40) return 'desert';
  if (getTerrainHeight(x, z) < -1.5) return 'shore';
  return 'forest';
}

export function buildTerrainGeometry(geo: THREE.PlaneGeometry): void {
  const posAttr = geo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);

  const cGrass = new THREE.Color('#38b864');
  const cForest = new THREE.Color('#228b49');
  const cSnow = new THREE.Color('#f1f5f9');
  const cIce = new THREE.Color('#bae6fd');
  const cDesert = new THREE.Color('#e6a856');
  const cShore = new THREE.Color('#e2c28d');
  const cCity = new THREE.Color('#475569');
  const cRoad = new THREE.Color('#1e293b');

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);

    const dist = Math.hypot(vx, vz);
    let col = cGrass;

    if (dist < 56 && Math.abs(vx) < 54 && Math.abs(vz) < 54) {
      if (Math.abs(vx) < 5.5 || Math.abs(vz) < 5.5) {
        col = cRoad;
      } else {
        col = cCity;
      }
    } else if (Math.abs(vz) < 4.5 && dist < WORLD_RADIUS - 40) {
      col = cRoad; // East-West Highway
    } else if (vy < -1.6) {
      col = cShore;
    } else if (vx < -45 && vz < -45) {
      col = vy > 12 ? cSnow : cIce;
    } else if (vx > 55 && vz > 40) {
      col = cDesert;
    } else if (Math.sin(vx * 0.06) * Math.cos(vz * 0.06) > 0.1) {
      col = cForest;
    }

    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  posAttr.needsUpdate = true;
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
}

export function buildStarterIslandGeometry(): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(STARTER_ISLAND_CENTER.radius, STARTER_ISLAND_CENTER.radius + 14, 14, 32);
  const mat = new THREE.MeshLambertMaterial({ color: 0x38b864 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(STARTER_ISLAND_CENTER.x, -2.5, STARTER_ISLAND_CENTER.z);
  mesh.receiveShadow = true;
  return mesh;
}

export function createWorldProps(
  worldGroup: THREE.Group,
  textures: ProceduralTextures,
  quality: 'low' | 'medium' | 'high',
  boxColliders: BoxCollider[],
  rampColliders: RampCollider[],
  roofColliders: RoofCollider[],
  chests: ChestObj[],
  launchPads: LaunchPadObj[],
  spawnLootFn: (type: string, rar: number, x: number, y: number, z: number) => void,
  spawnRandomLootFn: (x: number, y: number, z: number, minRar?: number) => void
): {
  treeTrunkInst: THREE.InstancedMesh;
  treeLeavesInst: THREE.InstancedMesh;
  rockInst: THREE.InstancedMesh;
  vehicleSpawns: WorldVehicleSpawn[];
} {
  const castShadows = quality !== 'low';

  const createStructureBox = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    colorHex: number,
    options: Partial<{
      destructible: boolean;
      hp: number;
      type: string;
      isSlurpBarrel: boolean;
      texture: THREE.Texture;
    }> = {}
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    const matOpts: THREE.MeshLambertMaterialParameters = { color: colorHex };
    if (options.texture) matOpts.map = options.texture;
    const mat = new THREE.MeshLambertMaterial(matOpts);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = castShadows;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);

    const col: BoxCollider = {
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y,
      maxY: y + h,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      destructible: !!options.destructible,
      hp: options.hp || 9999,
      maxHp: options.hp || 9999,
      mesh,
      type: options.type || 'building',
      isSlurpBarrel: !!options.isSlurpBarrel,
    };
    boxColliders.push(col);
    return col;
  };

  const spawnChest = (x: number, y: number, z: number, isTokenChest = false) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const tex = isTokenChest ? textures.tokenChest : textures.goldChest;
    const baseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.65, 0.88),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    baseMesh.position.y = 0.325;
    baseMesh.castShadow = castShadows;
    group.add(baseMesh);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.65, -0.42);
    const lidMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.38, 0.26, 0.9),
      new THREE.MeshLambertMaterial({ map: tex })
    );
    lidMesh.position.set(0, 0.13, 0.42);
    lidPivot.add(lidMesh);
    group.add(lidPivot);

    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(isTokenChest ? 0.18 : 0.1, isTokenChest ? 0.42 : 0.24, isTokenChest ? 4.4 : 2.1, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: isTokenChest ? 0x38bdf8 : 0xfacc15,
        transparent: true,
        opacity: isTokenChest ? 0.48 : 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beacon.position.y = isTokenChest ? 2.2 : 1.1;
    group.add(beacon);

    let tokenOrb: THREE.Mesh | null = null;
    if (isTokenChest) {
      tokenOrb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      tokenOrb.position.y = 1.65;
      group.add(tokenOrb);
    }

    worldGroup.add(group);
    chests.push({ x, y, z, opened: false, isTokenChest, mesh: group, lidPivot, beacon, tokenOrb });
  };

  const spawnLaunchPad = (x: number, z: number) => {
    const y = getTerrainHeight(x, z);
    const group = new THREE.Group();
    group.position.set(x, y + 0.08, z);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.22, 16), new THREE.MeshLambertMaterial({ color: 0x334155 }));
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.26, 16), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    group.add(rim, pad);
    worldGroup.add(group);
    launchPads.push({ x, y, z, radius: 2.1, mesh: group });
  };

  const buildHouse = (
    cx: number,
    cz: number,
    width: number,
    depth: number,
    floors: number,
    wallColor: number,
    roofColor: number,
    hasTokenChest = false,
    isShop = false
  ) => {
    const baseY = getTerrainHeight(cx, cz);
    const floorH = 3.8;
    const t = 0.38;
    const doorW = 2.6;

    for (let f = 0; f < floors; f++) {
      const y = baseY + f * floorH;
      if (f > 0) {
        createStructureBox(cx - width * 0.18, y, cz, width * 0.64, 0.25, depth, 0x92400e, { texture: textures.woodPlanks });
        createStructureBox(cx + width * 0.32, y, cz - depth * 0.25, width * 0.36, 0.25, depth * 0.5, 0x92400e, { texture: textures.woodPlanks });
      }
      if (f === 0) {
        const segW = (width - doorW) / 2;
        createStructureBox(cx - doorW / 2 - segW / 2, y, cz + depth / 2, segW, floorH, t, wallColor, { texture: textures.brickWall });
        createStructureBox(cx + doorW / 2 + segW / 2, y, cz + depth / 2, segW, floorH, t, wallColor, { texture: textures.brickWall });
        createStructureBox(cx, y + 2.7, cz + depth / 2, doorW, floorH - 2.7, t, wallColor, { texture: textures.brickWall });
      } else {
        const segW = (width - 2.2) / 2;
        createStructureBox(cx - 1.1 - segW / 2, y, cz + depth / 2, segW, floorH, t, wallColor, { texture: textures.brickWall });
        createStructureBox(cx + 1.1 + segW / 2, y, cz + depth / 2, segW, floorH, t, wallColor, { texture: textures.brickWall });
        createStructureBox(cx, y, cz + depth / 2, 2.2, 1.1, t, wallColor, { texture: textures.brickWall });
        createStructureBox(cx, y + 2.8, cz + depth / 2, 2.2, floorH - 2.8, t, wallColor, { texture: textures.brickWall });
      }
      createStructureBox(cx, y, cz - depth / 2, width, floorH, t, wallColor, { texture: textures.brickWall });
      createStructureBox(cx - width / 2, y, cz, t, floorH, depth, wallColor, { texture: textures.brickWall });
      createStructureBox(cx + width / 2, y, cz, t, floorH, depth, wallColor, { texture: textures.brickWall });

      if (f < floors - 1) {
        const rx = cx + width * 0.32;
        const rz = cz + depth * 0.15;
        const rw = width * 0.32;
        const rd = depth * 0.48;
        const rampGeo = new THREE.BoxGeometry(rw, 0.25, Math.hypot(rd, floorH));
        const rampMat = new THREE.MeshLambertMaterial({ color: 0xb45309, map: textures.woodPlanks });
        const rampMesh = new THREE.Mesh(rampGeo, rampMat);
        rampMesh.rotation.order = 'YXZ';
        rampMesh.position.set(rx, y + floorH / 2, rz);
        rampMesh.rotation.x = Math.atan2(floorH, rd);
        rampMesh.castShadow = castShadows;
        rampMesh.receiveShadow = true;
        worldGroup.add(rampMesh);

        rampColliders.push({
          minX: rx - rw / 2,
          maxX: rx + rw / 2,
          minZ: rz - rd / 2,
          maxZ: rz + rd / 2,
          baseY: y,
          topY: y + floorH,
          dir: 0,
          hp: 9999,
          maxHp: 9999,
          mesh: rampMesh,
        });
      }
    }

    const roofY = baseY + floors * floorH;
    const roofH = 2.6;
    // Solid ceiling / roof base slab with collision so players & bullets never pass through the top floor
    createStructureBox(cx, roofY - 0.12, cz, width + 0.5, 0.34, depth + 0.5, roofColor, {
      texture: textures.woodPlanks,
      type: 'roof_deck',
    });

    const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.76, roofH, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(
      roofGeo,
      new THREE.MeshLambertMaterial({ color: roofColor, map: textures.roofTiles })
    );
    roofMesh.position.set(cx, roofY + 0.22 + roofH / 2, cz);
    roofMesh.castShadow = castShadows;
    roofMesh.receiveShadow = true;
    worldGroup.add(roofMesh);

    // Sloped pyramid roof collision matching the roof cone footprint
    roofColliders.push({
      minX: cx - width * 0.54,
      maxX: cx + width * 0.54,
      minZ: cz - depth * 0.54,
      maxZ: cz + depth * 0.54,
      baseY: roofY + 0.22,
      topY: roofY + 0.22 + roofH,
      hp: 9999,
    });

    if (isShop) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 1.8, 0.25),
        new THREE.MeshBasicMaterial({ map: textures.shopSign })
      );
      sign.position.set(cx, baseY + floorH + 0.4, cz + depth / 2 + 0.35);
      worldGroup.add(sign);

      createStructureBox(cx, baseY + 2.75, cz + depth / 2 + 0.75, width * 0.7, 0.24, 1.5, 0xef4444, {
        type: 'awning',
      });
    }

    spawnChest(cx - width * 0.22, baseY + (floors > 1 ? floorH + 0.25 : 0), cz - depth * 0.22, hasTokenChest);
    spawnRandomLootFn(cx + width * 0.15, baseY + 0.1, cz - depth * 0.15);
  };

  // 1. Central City ("Неоновый Город"): Houses, Shops (Магазины), Watchtower
  buildHouse(-26, -26, 13, 12, 2, 0xfef3c7, 0xdc2626, false, true);
  buildHouse(26, -26, 14, 12, 2, 0xe0f2fe, 0x2563eb, true, true);
  buildHouse(-26, 26, 12, 12, 1, 0xfce7f3, 0x9333ea, false, false);
  buildHouse(26, 26, 14, 12, 2, 0xdcfce7, 0x16a34a, false, false);
  buildHouse(0, -52, 9, 9, 3, 0xfde68a, 0xb45309, true, false); // Lookout Spire

  // 2. Timber Village (Forest Biome SW)
  buildHouse(-135, 95, 12, 11, 2, 0xfef3c7, 0x15803d, true, true);
  buildHouse(-158, 112, 10, 10, 1, 0xffedd5, 0x9a3412, false, false);
  buildHouse(-115, 118, 11, 10, 1, 0xe2e8f0, 0x475569, false, false);

  // 3. Frost Citadel (Snow Biome NW)
  buildHouse(-115, -155, 13, 12, 2, 0xcbd5e1, 0x0284c7, true, false);
  buildHouse(-142, -138, 11, 10, 1, 0x94a3b8, 0x1e3a8a, false, true);

  // 4. Sunstone Oasis (Desert Biome SE)
  buildHouse(155, 120, 13, 11, 2, 0xffedd5, 0xb45309, true, true);
  buildHouse(180, 105, 10, 10, 1, 0xfde68a, 0x9a3412, false, false);

  // 5. Bridge Gas Station (River Biome NE)
  const stationY = getTerrainHeight(115, -90);
  buildHouse(115, -90, 12, 10, 1, 0xf8fafc, 0xef4444, true, true);
  // Gas Canopy
  createStructureBox(115, stationY + 3.2, -74, 11, 0.4, 6, 0xef4444);
  createStructureBox(111, stationY, -74, 0.6, 3.2, 0.6, 0x94a3b8);
  createStructureBox(119, stationY, -74, 0.6, 3.2, 0.6, 0x94a3b8);

  // Bridge across the winding river near z = 0
  const bridgeY = 0.8;
  createStructureBox(78, bridgeY - 0.5, 0, 26, 0.6, 8.5, 0x64748b, { texture: textures.stoneBlock });
  createStructureBox(78, bridgeY, -4.1, 26, 1.0, 0.4, 0x94a3b8);
  createStructureBox(78, bridgeY, 4.1, 26, 1.0, 0.4, 0x94a3b8);

  // Starter Island Props & Launch Pad
  const sx = STARTER_ISLAND_CENTER.x;
  const sz = STARTER_ISLAND_CENTER.z;
  const sy = getTerrainHeight(sx, sz);
  createStructureBox(sx - 12, sy, sz - 10, 6, 2.5, 6, 0xfacc15, { texture: textures.woodPlanks });
  createStructureBox(sx + 14, sy, sz + 8, 5, 1.5, 5, 0x38bdf8, { texture: textures.stoneBlock });
  spawnLaunchPad(sx + 8, sz - 8);
  spawnRandomLootFn(sx - 4, sy, sz + 4, 2);
  spawnRandomLootFn(sx + 4, sy, sz + 4, 2);

  // Main Island Launch Pads
  spawnLaunchPad(0, 0);
  spawnLaunchPad(-120, -135);
  spawnLaunchPad(140, 105);
  spawnLaunchPad(-120, 85);

  // Slurp Barrels & Crates
  const barrelSpots: [number, number][] = [
    [-16, -16], [16, -16], [16, 16], [-16, 16],
    [-125, 95], [145, 118], [108, -82], [-108, -145],
  ];
  for (const [bx, bz] of barrelSpots) {
    const by = getTerrainHeight(bx, bz);
    createStructureBox(bx, by, bz, 0.9, 1.3, 0.9, 0xffffff, {
      destructible: true,
      hp: 45,
      type: 'slurp_barrel',
      isSlurpBarrel: true,
      texture: textures.slurpBarrel,
    });
  }

  // Outdoor Loot
  for (let i = 0; i < 48; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 16 + Math.random() * (WORLD_RADIUS - 65);
    const lx = Math.cos(ang) * rad;
    const lz = Math.sin(ang) * rad;
    const ly = getTerrainHeight(lx, lz);
    if (ly > -1.2) spawnRandomLootFn(lx, ly, lz);
  }

  // Outdoor Token Chests
  [
    [-185, 10],
    [195, -20],
    [0, 185],
    [-15, -195],
  ].forEach(([hx, hz]) => {
    const hy = getTerrainHeight(hx, hz);
    if (hy > -1.0) spawnChest(hx, hy, hz, true);
  });

  // Instanced Trees & Rocks
  const treeCount = quality === 'low' ? 120 : quality === 'medium' ? 200 : 280;
  const rockCount = quality === 'low' ? 50 : quality === 'medium' ? 85 : 120;

  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.68, 3.4, 7);
  trunkGeo.translate(0, 1.7, 0);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x78350f });
  const leavesGeo = new THREE.ConeGeometry(2.9, 7.2, 7);
  leavesGeo.translate(0, 6.0, 0);
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const treeTrunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  treeTrunkInst.castShadow = castShadows;
  treeTrunkInst.receiveShadow = true;

  const treeLeavesInst = new THREE.InstancedMesh(leavesGeo, leavesMat, treeCount);
  treeLeavesInst.castShadow = castShadows;
  treeLeavesInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const cPine = new THREE.Color(0x15803d);
  const cPineDark = new THREE.Color(0x166534);
  const cSnowPine = new THREE.Color(0xe2e8f0);
  const cCactus = new THREE.Color(0x65a30d);

  let placedTrees = 0;
  for (let attempt = 0; attempt < treeCount * 4 && placedTrees < treeCount; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 58 + Math.random() * (WORLD_RADIUS - 90);
    const tx = Math.cos(ang) * rad;
    const tz = Math.sin(ang) * rad;
    const ty = getTerrainHeight(tx, tz);
    if (ty < -0.5) continue;
    if (
      Math.hypot(tx + 135, tz - 95) < 28 ||
      Math.hypot(tx + 115, tz + 155) < 26 ||
      Math.hypot(tx - 155, tz - 120) < 26 ||
      Math.hypot(tx - 115, tz + 90) < 24 ||
      Math.abs(tz) < 8
    ) {
      continue;
    }

    const scale = 0.85 + Math.random() * 0.5;
    const biome = getBiomeAt(tx, tz);
    dummy.position.set(tx, ty, tz);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale * (biome === 'desert' ? 0.65 : 1.0), scale);
    dummy.updateMatrix();

    treeTrunkInst.setMatrixAt(placedTrees, dummy.matrix);
    treeLeavesInst.setMatrixAt(placedTrees, dummy.matrix);
    treeLeavesInst.setColorAt(
      placedTrees,
      biome === 'snow' ? cSnowPine : biome === 'desert' ? cCactus : placedTrees % 2 === 0 ? cPine : cPineDark
    );

    boxColliders.push({
      minX: tx - 0.65 * scale,
      maxX: tx + 0.65 * scale,
      minY: ty,
      maxY: ty + 7.5 * scale,
      minZ: tz - 0.65 * scale,
      maxZ: tz + 0.65 * scale,
      destructible: true,
      hp: 100,
      maxHp: 100,
      type: 'tree',
      isTree: true,
      instanceId: placedTrees,
      woodYield: 45,
    });
    placedTrees++;
  }
  treeTrunkInst.count = placedTrees;
  treeLeavesInst.count = placedTrees;
  treeTrunkInst.instanceMatrix.needsUpdate = true;
  treeLeavesInst.instanceMatrix.needsUpdate = true;
  if (treeLeavesInst.instanceColor) treeLeavesInst.instanceColor.needsUpdate = true;
  treeTrunkInst.computeBoundingSphere();
  treeLeavesInst.computeBoundingSphere();
  worldGroup.add(treeTrunkInst, treeLeavesInst);

  // Rocks
  const rockGeo = new THREE.DodecahedronGeometry(1.7, 0);
  rockGeo.translate(0, 1.0, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: textures.stoneBlock });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInst.castShadow = castShadows;
  rockInst.receiveShadow = true;

  let placedRocks = 0;
  for (let attempt = 0; attempt < rockCount * 3 && placedRocks < rockCount; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = 58 + Math.random() * (WORLD_RADIUS - 88);
    const rx = Math.cos(ang) * rad;
    const rz = Math.sin(ang) * rad;
    const ry = getTerrainHeight(rx, rz);
    if (ry < -1.0 || Math.abs(rz) < 8) continue;

    const scale = 0.8 + Math.random() * 0.9;
    const biome = getBiomeAt(rx, rz);
    dummy.position.set(rx, ry, rz);
    dummy.rotation.set(Math.random() * 0.4, Math.random() * Math.PI * 2, Math.random() * 0.4);
    dummy.scale.set(scale * 1.2, scale * 0.85, scale);
    dummy.updateMatrix();
    rockInst.setMatrixAt(placedRocks, dummy.matrix);
    rockInst.setColorAt(
      placedRocks,
      new THREE.Color(biome === 'desert' ? 0xc27832 : biome === 'snow' ? 0x94a3b8 : 0x64748b)
    );

    boxColliders.push({
      minX: rx - 1.4 * scale,
      maxX: rx + 1.4 * scale,
      minY: ry,
      maxY: ry + 1.9 * scale,
      minZ: rz - 1.4 * scale,
      maxZ: rz + 1.4 * scale,
      destructible: true,
      hp: 150,
      maxHp: 150,
      type: 'rock',
      isRock: true,
      instanceId: placedRocks,
      woodYield: 30,
    });
    placedRocks++;
  }
  rockInst.count = placedRocks;
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  worldGroup.add(rockInst);

  // Drivable Vehicle Spawns along roads & POIs
  const vehicleSpawns: WorldVehicleSpawn[] = [
    { type: 'sports', x: 8, z: -12, yaw: 0 },
    { type: 'suv', x: -12, z: 10, yaw: Math.PI / 2 },
    { type: 'buggy', x: 142, z: 102, yaw: -0.8 },
    { type: 'sports', x: 105, z: -74, yaw: Math.PI },
    { type: 'suv', x: -122, z: 96, yaw: 0.5 },
    { type: 'buggy', x: -105, z: -140, yaw: 1.2 },
    { type: 'sports', x: 45, z: 0, yaw: Math.PI / 2 },
  ];

  // Unused param guard
  void spawnLootFn;

  return { treeTrunkInst, treeLeavesInst, rockInst, vehicleSpawns };
}
