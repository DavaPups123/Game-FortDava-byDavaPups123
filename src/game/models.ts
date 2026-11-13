import * as THREE from 'three';
import { ProceduralTextures } from './textures';
import {
  BackblingDef,
  BackblingStyleId,
  GliderDef,
  PickaxeDef,
  SkinDef,
  SkinStyle,
  VehicleSkinDef,
  VehicleTypeId,
} from './types';

export interface CharacterRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbow: THREE.Group;
  rightElbow: THREE.Group;
  weaponGroup: THREE.Group;
  weaponMeshGroup: THREE.Group;
  muzzleFlash: THREE.Mesh;
  gliderGroup: THREE.Group;
  shadowDisc: THREE.Mesh;
  flashTimer: number;
  walkDist: number;
  dancePhase: number;
  aimBlend: number;
  equippedWeaponKey: string;
}

let cachedCharGeos: {
  shadowDisc: THREE.CircleGeometry;
  jacket: THREE.CylinderGeometry;
  chestArmor: THREE.CylinderGeometry;
  chestTrim: THREE.TorusGeometry;
  collar: THREE.CylinderGeometry;
  belt: THREE.CylinderGeometry;
  buckle: THREE.BoxGeometry;
  strap: THREE.BoxGeometry;
  pouch: THREE.BoxGeometry;
  head: THREE.SphereGeometry;
  jaw: THREE.SphereGeometry;
  nose: THREE.ConeGeometry;
  brow: THREE.BoxGeometry;
  eyeSclera: THREE.SphereGeometry;
  eyeIris: THREE.SphereGeometry;
  eyePupil: THREE.SphereGeometry;
  eyeGlint: THREE.SphereGeometry;
  ear: THREE.SphereGeometry;
  thigh: THREE.CapsuleGeometry;
  kneePad: THREE.BoxGeometry;
  shin: THREE.CapsuleGeometry;
  bootUpper: THREE.BoxGeometry;
  bootSole: THREE.BoxGeometry;
  shoulder: THREE.SphereGeometry;
  upperArm: THREE.CapsuleGeometry;
  elbowPad: THREE.SphereGeometry;
  forearm: THREE.CapsuleGeometry;
  hand: THREE.SphereGeometry;
  muzzle: THREE.OctahedronGeometry;
} | null = null;

function getCharGeos() {
  if (cachedCharGeos) return cachedCharGeos;
  cachedCharGeos = {
    shadowDisc: new THREE.CircleGeometry(0.65, 14),
    jacket: new THREE.CylinderGeometry(0.31, 0.24, 0.72, 12),
    chestArmor: new THREE.CylinderGeometry(0.335, 0.29, 0.34, 12),
    chestTrim: new THREE.TorusGeometry(0.242, 0.028, 6, 12),
    collar: new THREE.CylinderGeometry(0.105, 0.132, 0.15, 10),
    belt: new THREE.CylinderGeometry(0.275, 0.285, 0.11, 12),
    buckle: new THREE.BoxGeometry(0.15, 0.1, 0.065),
    strap: new THREE.BoxGeometry(0.065, 0.36, 0.46),
    pouch: new THREE.BoxGeometry(0.11, 0.13, 0.08),
    head: new THREE.SphereGeometry(0.232, 12, 10),
    jaw: new THREE.SphereGeometry(0.165, 10, 8),
    nose: new THREE.ConeGeometry(0.026, 0.07, 5),
    brow: new THREE.BoxGeometry(0.068, 0.018, 0.024),
    eyeSclera: new THREE.SphereGeometry(0.036, 8, 6),
    eyeIris: new THREE.SphereGeometry(0.024, 8, 6),
    eyePupil: new THREE.SphereGeometry(0.014, 6, 6),
    eyeGlint: new THREE.SphereGeometry(0.007, 6, 6),
    ear: new THREE.SphereGeometry(0.048, 6, 6),
    thigh: new THREE.CapsuleGeometry(0.11, 0.19, 3, 8),
    kneePad: new THREE.BoxGeometry(0.135, 0.11, 0.065),
    shin: new THREE.CapsuleGeometry(0.095, 0.2, 3, 8),
    bootUpper: new THREE.BoxGeometry(0.16, 0.11, 0.26),
    bootSole: new THREE.BoxGeometry(0.175, 0.045, 0.28),
    shoulder: new THREE.SphereGeometry(0.138, 8, 8),
    upperArm: new THREE.CapsuleGeometry(0.088, 0.14, 3, 8),
    elbowPad: new THREE.SphereGeometry(0.088, 6, 6),
    forearm: new THREE.CapsuleGeometry(0.08, 0.15, 3, 8),
    hand: new THREE.SphereGeometry(0.075, 8, 6),
    muzzle: new THREE.OctahedronGeometry(0.19, 0),
  };
  return cachedCharGeos;
}

const sharedEyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
const sharedEyePupilMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
const sharedSkinToneMat = new THREE.MeshStandardMaterial({ color: 0xf6b98e, roughness: 0.62, metalness: 0.02 });
const sharedBootSoleMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.05 });
const sharedMuzzleMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

export interface VehicleRig {
  root: THREE.Group;
  chassisGroup: THREE.Group;
  wheels: THREE.Group[];
  flames: THREE.Mesh[];
  shadowDisc: THREE.Mesh;
}

export function createPickaxeMesh(
  pickaxeDef: PickaxeDef,
  textures?: ProceduralTextures
): THREE.Group {
  const g = new THREE.Group();
  const shaftMat = new THREE.MeshStandardMaterial({
    color: pickaxeDef.style === 'classic' ? 0xffffff : pickaxeDef.accent,
    map: pickaxeDef.style === 'classic' && textures ? textures.woodHandle : textures?.weaponGrip ?? null,
    roughness: 0.65,
    metalness: 0.25,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: pickaxeDef.primary,
    map: textures?.weaponMetal ?? null,
    roughness: 0.3,
    metalness: 0.72,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: pickaxeDef.glow,
    emissive: pickaxeDef.glow,
    emissiveIntensity: 0.55,
    roughness: 0.2,
    metalness: 0.5,
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.12, 8), shaftMat);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, 0.02, -0.34);
  g.add(shaft);

  if (pickaxeDef.style === 'scythe') {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 8), headMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.02, -0.86);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 6, 14, Math.PI * 0.85), glowMat);
    arc.position.set(0.24, 0.02, -0.82);
    arc.rotation.z = Math.PI * 0.65;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 6), headMat);
    spike.rotation.z = -Math.PI / 2;
    spike.position.set(-0.14, 0.02, -0.86);
    g.add(collar, arc, spike);
  } else if (pickaxeDef.style === 'halberd') {
    const axe = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.08), headMat);
    axe.position.set(0.18, 0.02, -0.86);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.11), glowMat);
    edge.position.set(0.42, 0.02, -0.86);
    const spear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), glowMat);
    spear.rotation.x = -Math.PI / 2;
    spear.position.set(0, 0.02, -1.04);
    g.add(axe, edge, spear);
  } else if (pickaxeDef.style === 'scepter') {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 8, 16), headMat);
    ring.position.set(0, 0.02, -0.94);
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.095, 0), glowMat);
    orb.position.set(0, 0.02, -0.94);
    g.add(ring, orb);
  } else if (pickaxeDef.style === 'hammer') {
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.24), headMat);
    block.position.set(0, 0.02, -0.86);
    const capL = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.06, 8), glowMat);
    capL.rotation.z = Math.PI / 2;
    capL.position.set(-0.29, 0.02, -0.86);
    const capR = capL.clone();
    capR.position.x = 0.29;
    g.add(block, capL, capR);
  } else if (pickaxeDef.style === 'katana') {
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10), headMat);
    guard.rotation.x = Math.PI / 2;
    guard.position.set(0, 0.02, -0.42);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.075, 0.85), glowMat);
    blade.position.set(0, 0.02, -0.86);
    g.add(guard, blade);
  } else {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.12, 8), headMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.02, -0.78);
    const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.14), headMat);
    bladeMain.position.set(0, 0.02, -0.84);
    const bladeTipL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 4), glowMat);
    bladeTipL.rotation.z = Math.PI / 2;
    bladeTipL.position.set(-0.38, 0.02, -0.84);
    const bladeTipR = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 4), glowMat);
    bladeTipR.rotation.z = -Math.PI / 2;
    bladeTipR.position.set(0.36, 0.02, -0.84);
    g.add(collar, bladeMain, bladeTipL, bladeTipR);
  }

  g.userData.muzzleZ = -0.95;
  g.userData.muzzleY = 0.02;
  return g;
}

export function createGliderMesh(gliderDef: GliderDef): THREE.Group {
  const g = new THREE.Group();
  const mainMat = new THREE.MeshStandardMaterial({ color: gliderDef.primary, roughness: 0.42, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: gliderDef.accent, roughness: 0.35, metalness: 0.5 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: gliderDef.glow,
    emissive: gliderDef.glow,
    emissiveIntensity: 0.45,
    roughness: 0.2,
  });
  const strutMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });

  if (gliderDef.style === 'jet') {
    const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.28, 2.2), accentMat);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.09, 0.95), mainMat);
    wingL.position.set(-1.1, 0, 0.2);
    wingL.rotation.y = 0.28;
    const wingR = wingL.clone();
    wingR.position.x = 1.1;
    wingR.rotation.y = -0.28;
    const thrL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 8), glowMat);
    thrL.rotation.x = Math.PI / 2;
    thrL.position.set(-0.28, 0, 1.15);
    const thrR = thrL.clone();
    thrR.position.x = 0.28;
    g.add(fuselage, wingL, wingR, thrL, thrR);
  } else if (gliderDef.style === 'manta' || gliderDef.style === 'dragon') {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.45, 2.0, 8), accentMat);
    core.rotation.x = Math.PI / 2;
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0.45);
    wingShape.lineTo(2.1, 0.15);
    wingShape.lineTo(1.75, -0.75);
    wingShape.lineTo(0, -0.35);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    const wR = new THREE.Mesh(wingGeo, mainMat);
    wR.rotation.x = Math.PI / 2;
    wR.position.set(0.15, 0.05, 0);
    const wL = wR.clone();
    wL.scale.x = -1;
    wL.position.x = -0.15;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.45, 0.9), glowMat);
    fin.position.set(0, 0.24, 0.3);
    g.add(core, wR, wL, fin);
  } else {
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 1.35), mainMat);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 1.1), accentMat);
    wingL.position.set(-1.68, -0.16, 0);
    wingL.rotation.z = 0.25;
    const wingR = wingL.clone();
    wingR.position.x = 1.68;
    wingR.rotation.z = -0.25;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.18), glowMat);
    trim.position.set(0, 0.09, -0.52);
    g.add(canopy, wingL, wingR, trim);
  }

  const strutL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.15, 4), strutMat);
  strutL.position.set(-0.62, -0.5, 0);
  strutL.rotation.z = -0.35;
  const strutR = strutL.clone();
  strutR.position.x = 0.62;
  strutR.rotation.z = 0.35;
  g.add(strutL, strutR);
  return g;
}

export function createBackblingMesh(
  style: BackblingStyleId,
  primaryHex: number,
  accentHex: number,
  glowHex: number
): THREE.Group {
  const backbling = new THREE.Group();
  const packMat = new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.42, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.28, metalness: 0.55 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: glowHex,
    emissive: glowHex,
    emissiveIntensity: 0.48,
    roughness: 0.15,
    metalness: 0.8,
  });

  if (style === 'wings') {
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.85, 0.45);
    wingShape.lineTo(0.65, -0.35);
    wingShape.lineTo(0, -0.2);
    wingShape.closePath();
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    const leftWing = new THREE.Mesh(wingGeo, accentMat);
    leftWing.position.set(-0.08, 0.1, 0);
    leftWing.rotation.y = Math.PI - 0.25;
    const rightWing = new THREE.Mesh(wingGeo, accentMat);
    rightWing.position.set(0.08, 0.1, 0);
    rightWing.rotation.y = 0.25;
    backbling.add(leftWing, rightWing);
  } else if (style === 'cape') {
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.94, 0.05), packMat);
    cape.position.set(0, -0.32, 0.06);
    cape.rotation.x = 0.12;
    const capeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.09, 0.06), accentMat);
    capeTrim.position.set(0, 0.14, 0.06);
    backbling.add(cape, capeTrim);
  } else if (style === 'jetpack') {
    const tankL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 4, 10), packMat);
    tankL.position.set(-0.14, 0, 0.06);
    const tankR = tankL.clone();
    tankR.position.x = 0.14;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 10), visorMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0.06, 0.09);
    backbling.add(tankL, tankR, core);
  } else if (style === 'katana') {
    const sheath = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.05, 8), packMat);
    sheath.rotation.z = 0.58;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), accentMat);
    hilt.position.set(-0.24, 0.36, 0.02);
    hilt.rotation.z = 0.58 + Math.PI / 2;
    backbling.add(sheath, hilt);
  } else if (style === 'shield') {
    const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.08, 8), packMat);
    shieldBody.rotation.x = Math.PI / 2;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), accentMat);
    boss.position.z = 0.05;
    backbling.add(shieldBody, boss);
  } else if (style === 'prism') {
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 12), accentMat);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), visorMat);
    crystal.position.z = 0.04;
    backbling.add(frame, crystal);
  } else {
    const mainPack = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 4, 10), packMat);
    mainPack.scale.set(1.25, 1, 0.68);
    const pouch = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.14, 4, 8), accentMat);
    pouch.rotation.z = Math.PI / 2;
    pouch.position.set(0, -0.1, 0.11);
    backbling.add(mainPack, pouch);
  }
  return backbling;
}

export function createWeaponMesh(
  itemType: string,
  rarityHex: number,
  textures?: ProceduralTextures,
  pickaxeDef?: PickaxeDef
): THREE.Group {
  if (itemType === 'pickaxe' && pickaxeDef) {
    return createPickaxeMesh(pickaxeDef, textures);
  }
  const g = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    map: textures?.weaponMetal ?? null,
    roughness: 0.34,
    metalness: 0.72,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    map: textures?.weaponMetal ?? null,
    roughness: 0.45,
    metalness: 0.65,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    map: textures?.weaponGrip ?? null,
    roughness: 0.85,
    metalness: 0.15,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures?.woodHandle ?? null,
    roughness: 0.75,
    metalness: 0.08,
  });
  const scopeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: textures?.weaponScope ?? null,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.15,
    metalness: 0.8,
  });
  const rarTrimMat = new THREE.MeshStandardMaterial({
    color: rarityHex,
    emissive: rarityHex,
    emissiveIntensity: 0.25,
    roughness: 0.3,
    metalness: 0.55,
  });

  if (itemType === 'pickaxe') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.05, 8), textures ? woodMat : gripMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0.02, -0.32);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.12, 8), darkMetalMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 0.02, -0.78);
    const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.14), metalMat);
    bladeMain.position.set(0, 0.02, -0.84);
    const bladeTipL = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 4), rarTrimMat);
    bladeTipL.rotation.z = Math.PI / 2;
    bladeTipL.position.set(-0.38, 0.02, -0.84);
    const bladeTipR = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 4), rarTrimMat);
    bladeTipR.rotation.z = -Math.PI / 2;
    bladeTipR.position.set(0.36, 0.02, -0.84);
    g.add(shaft, collar, bladeMain, bladeTipL, bladeTipR);
    g.userData.muzzleZ = -0.92;
    g.userData.muzzleY = 0.02;
    return g;
  }

  if (itemType === 'shotgun') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.15, 0.3), textures ? woodMat : gripMat);
    stock.position.set(0, -0.02, 0.16);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.44), darkMetalMat);
    receiver.position.set(0, 0.02, -0.18);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.106, 0.03, 0.38), rarTrimMat);
    trim.position.set(0, 0.06, -0.18);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.56, 8), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.055, -0.66);
    const underTube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.48, 8), darkMetalMat);
    underTube.rotation.x = Math.PI / 2;
    underTube.position.set(0, 0.005, -0.62);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.24, 8), gripMat);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, 0.005, -0.58);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.08), gripMat);
    grip.position.set(0, -0.09, -0.04);
    grip.rotation.x = 0.3;
    g.add(stock, receiver, trim, barrel, underTube, pump, grip);
    g.userData.muzzleZ = -0.96;
    g.userData.muzzleY = 0.055;
    return g;
  }

  if (itemType === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.15, 0.44), darkMetalMat);
    body.position.set(0, 0.02, -0.18);
    const shroud = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.045, 0.34), rarTrimMat);
    shroud.position.set(0, 0.08, -0.2);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 8), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -0.54);
    const suppressor = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.18, 8), gripMat);
    suppressor.rotation.x = Math.PI / 2;
    suppressor.position.set(0, 0.03, -0.72);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.26, 0.075), metalMat);
    mag.position.set(0, -0.14, -0.26);
    mag.rotation.x = -0.16;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), gripMat);
    grip.position.set(0, -0.09, -0.04);
    grip.rotation.x = 0.25;
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.09), gripMat);
    sight.position.set(0, 0.125, -0.16);
    g.add(body, shroud, barrel, suppressor, mag, grip, sight);
    g.userData.muzzleZ = -0.83;
    g.userData.muzzleY = 0.03;
    return g;
  }

  if (itemType === 'sniper') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.36), gripMat);
    stock.position.set(0, -0.01, 0.16);
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.14, 0.56), darkMetalMat);
    receiver.position.set(0, 0.02, -0.26);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.03, 0.44), rarTrimMat);
    trim.position.set(0, 0.05, -0.28);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.72, 8), metalMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.045, -0.86);
    const muzzleBrake = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.1), darkMetalMat);
    muzzleBrake.position.set(0, 0.045, -1.21);
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.032, 0.34, 10), gripMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 0.145, -0.22);
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 10), scopeMat);
    scopeLens.rotation.x = Math.PI / 2;
    scopeLens.position.set(0, 0.145, -0.39);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), gripMat);
    grip.position.set(0, -0.09, -0.04);
    grip.rotation.x = 0.25;
    g.add(stock, receiver, trim, barrel, muzzleBrake, scopeTube, scopeLens, grip);
    g.userData.muzzleZ = -1.28;
    g.userData.muzzleY = 0.045;
    return g;
  }

  if (itemType === 'rpg') {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.08, 12), darkMetalMat);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.06, -0.34);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), rarTrimMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.06, -0.78);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.16, 12), metalMat);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(0, 0.06, 0.22);
    const warhead = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.24, 10),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, metalness: 0.3 })
    );
    warhead.rotation.x = -Math.PI / 2;
    warhead.position.set(0, 0.06, -0.96);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.09), gripMat);
    grip.position.set(0, -0.08, -0.15);
    g.add(tube, ring, exhaust, warhead, grip);
    g.userData.muzzleZ = -1.1;
    g.userData.muzzleY = 0.06;
    return g;
  }

  if (itemType === 'shield_pot' || itemType === 'slurp') {
    const liquidColor = itemType === 'shield_pot' ? 0x38bdf8 : 0x06b6d4;
    const flask = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.34, 12),
      new THREE.MeshStandardMaterial({
        color: liquidColor,
        emissive: liquidColor,
        emissiveIntensity: 0.45,
        roughness: 0.15,
        metalness: 0.2,
      })
    );
    flask.position.set(0, 0.04, -0.15);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.12, 10), metalMat);
    neck.position.set(0, 0.25, -0.15);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.06, 10), rarTrimMat);
    cap.position.set(0, 0.33, -0.15);
    g.add(flask, neck, cap);
    g.userData.muzzleZ = -0.35;
    g.userData.muzzleY = 0.04;
    return g;
  }

  if (itemType === 'medkit') {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.24, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.1 })
    );
    box.position.set(0, 0.04, -0.16);
    const crossMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.2), crossMat);
    crossH.position.set(0, 0.04, -0.16);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.2), crossMat);
    crossV.position.set(0, 0.04, -0.16);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), gripMat);
    handle.position.set(0, 0.18, -0.16);
    g.add(box, crossH, crossV, handle);
    g.userData.muzzleZ = -0.35;
    g.userData.muzzleY = 0.04;
    return g;
  }

  // Default: Assault Rifle ('ar')
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.15, 0.26), gripMat);
  stock.position.set(0, -0.02, 0.15);
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.56), darkMetalMat);
  receiver.position.set(0, 0.02, -0.22);
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.12, 0.34), metalMat);
  handguard.position.set(0, 0.03, -0.58);
  const railTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.5), rarTrimMat);
  railTrim.position.set(0, 0.102, -0.36);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), metalMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.88);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.09), gripMat);
  mag.position.set(0, -0.13, -0.3);
  mag.rotation.x = -0.18;
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.08), gripMat);
  grip.position.set(0, -0.09, -0.05);
  grip.rotation.x = 0.28;
  const optic = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 10), scopeMat);
  optic.rotation.x = Math.PI / 2;
  optic.position.set(0, 0.14, -0.2);
  g.add(stock, receiver, handguard, railTrim, barrel, mag, grip, optic);
  g.userData.muzzleZ = -1.09;
  g.userData.muzzleY = 0.035;
  return g;
}

export function setRigWeapon(
  rig: CharacterRig,
  itemType: string,
  rarityHex: number,
  textures?: ProceduralTextures,
  pickaxeDef?: PickaxeDef
): void {
  const key = `${itemType}_${rarityHex}_${pickaxeDef?.id || ''}`;
  if (rig.equippedWeaponKey === key) return;
  rig.equippedWeaponKey = key;

  while (rig.weaponMeshGroup.children.length > 0) {
    rig.weaponMeshGroup.remove(rig.weaponMeshGroup.children[0]);
  }
  const mesh = createWeaponMesh(itemType, rarityHex, textures, pickaxeDef);
  rig.weaponMeshGroup.add(mesh);
  rig.muzzleFlash.position.set(0, mesh.userData.muzzleY ?? 0.03, mesh.userData.muzzleZ ?? -1.04);
}

export function createCharacterRig(
  skinDef: SkinDef,
  style: SkinStyle,
  shadowTex: THREE.CanvasTexture,
  castShadows = true,
  textures?: ProceduralTextures,
  cosmetics?: {
    pickaxeDef?: PickaxeDef;
    gliderDef?: GliderDef;
    backblingDef?: BackblingDef;
    showGliderOpen?: boolean;
  }
): CharacterRig {
  const root = new THREE.Group();
  const geo = getCharGeos();

  const shadowDisc = new THREE.Mesh(
    geo.shadowDisc,
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.5 })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.02;
  root.add(shadowDisc);

  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: style.primary,
    map: textures?.armorFabric ?? null,
    roughness: 0.46,
    metalness: 0.2,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: style.secondary,
    map: textures?.armorFabric ?? null,
    roughness: 0.64,
    metalness: 0.16,
  });
  const accentMat = new THREE.MeshStandardMaterial({ color: style.accent, roughness: 0.28, metalness: 0.58 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: style.visor,
    emissive: style.visor,
    emissiveIntensity: 0.48,
    roughness: 0.15,
    metalness: 0.8,
  });
  const hairMat = new THREE.MeshStandardMaterial({ color: style.hair, roughness: 0.6, metalness: 0.08 });
  const irisMat = new THREE.MeshBasicMaterial({ color: style.visor });

  // Torso — Athletic V-taper + tactical chest rig & utility belt
  const torso = new THREE.Group();
  torso.position.y = 1.16;

  const jacket = new THREE.Mesh(geo.jacket, primaryMat);
  jacket.scale.set(1.04, 1, 0.63);
  jacket.castShadow = castShadows;
  torso.add(jacket);

  const chestArmor = new THREE.Mesh(geo.chestArmor, secondaryMat);
  chestArmor.scale.set(1.06, 1, 0.68);
  chestArmor.position.y = 0.15;
  chestArmor.castShadow = castShadows;
  torso.add(chestArmor);

  // Tactical shoulder straps & front utility pouch
  const strapL = new THREE.Mesh(geo.strap, accentMat);
  strapL.position.set(-0.14, 0.16, 0);
  const strapR = new THREE.Mesh(geo.strap, accentMat);
  strapR.position.set(0.14, 0.16, 0);
  const chestPouch = new THREE.Mesh(geo.pouch, secondaryMat);
  chestPouch.position.set(-0.11, 0.08, -0.22);
  torso.add(strapL, strapR, chestPouch);

  const chestTrim = new THREE.Mesh(geo.chestTrim, accentMat);
  chestTrim.rotation.x = Math.PI / 2;
  chestTrim.scale.set(1.12, 0.72, 1);
  chestTrim.position.y = 0.29;
  torso.add(chestTrim);

  const collar = new THREE.Mesh(geo.collar, sharedSkinToneMat);
  collar.position.y = 0.42;
  torso.add(collar);

  const belt = new THREE.Mesh(geo.belt, secondaryMat);
  belt.scale.set(1.06, 1, 0.68);
  belt.position.y = -0.32;
  torso.add(belt);

  const buckle = new THREE.Mesh(geo.buckle, accentMat);
  buckle.position.set(0, -0.32, -0.2);
  const hipPouchL = new THREE.Mesh(geo.pouch, accentMat);
  hipPouchL.scale.set(0.7, 0.85, 0.9);
  hipPouchL.position.set(-0.29, -0.32, 0.02);
  const hipPouchR = hipPouchL.clone();
  hipPouchR.position.x = 0.29;
  torso.add(buckle, hipPouchL, hipPouchR);

  // Backbling (uses standalone BackblingDef if equipped, otherwise skin's signature backbling)
  const customBb = cosmetics?.backblingDef;
  const useCustomBb = customBb && customBb.style !== 'skin_default';
  const bbStyle: BackblingStyleId = useCustomBb ? (customBb.style as BackblingStyleId) : skinDef.backbling;
  const bbPrimary = useCustomBb ? customBb.primary : style.pack;
  const bbAccent = useCustomBb ? customBb.accent : style.accent;
  const bbGlow = useCustomBb ? customBb.glow : style.visor;
  const backbling = createBackblingMesh(bbStyle, bbPrimary, bbAccent, bbGlow);
  backbling.position.set(0, 0.06, 0.22);
  torso.add(backbling);
  bodyGroup.add(torso);

  // Head + Refined Facial Anatomy (sculpted jaw, nose, eyebrows, layered iris eyes, ears)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.82, 0);

  const head = new THREE.Mesh(geo.head, sharedSkinToneMat);
  head.scale.set(0.9, 1.04, 0.92);
  head.castShadow = castShadows;
  headGroup.add(head);

  const jaw = new THREE.Mesh(geo.jaw, sharedSkinToneMat);
  jaw.scale.set(0.88, 0.9, 0.92);
  jaw.position.set(0, -0.095, -0.03);
  headGroup.add(jaw);

  const nose = new THREE.Mesh(geo.nose, sharedSkinToneMat);
  nose.rotation.x = -Math.PI * 0.42;
  nose.position.set(0, -0.015, -0.215);
  headGroup.add(nose);

  // Layered Eyes + Eyebrows facing -Z
  [-0.078, 0.078].forEach((ex, idx) => {
    const sclera = new THREE.Mesh(geo.eyeSclera, sharedEyeWhiteMat);
    sclera.scale.set(1.1, 0.9, 0.55);
    sclera.position.set(ex, 0.025, -0.198);

    const iris = new THREE.Mesh(geo.eyeIris, irisMat);
    iris.scale.set(1, 1, 0.55);
    iris.position.set(ex, 0.025, -0.212);

    const pupil = new THREE.Mesh(geo.eyePupil, sharedEyePupilMat);
    pupil.scale.set(1, 1, 0.55);
    pupil.position.set(ex, 0.025, -0.218);

    const glint = new THREE.Mesh(geo.eyeGlint, sharedEyeWhiteMat);
    glint.position.set(ex + 0.01, 0.034, -0.224);

    const brow = new THREE.Mesh(geo.brow, hairMat);
    brow.position.set(ex, 0.072, -0.205);
    brow.rotation.z = idx === 0 ? -0.1 : 0.1;

    headGroup.add(sclera, iris, pupil, glint, brow);
  });

  if (skinDef.headgear === 'cap' || skinDef.headgear === 'goggles' || skinDef.headgear === 'crown') {
    const earL = new THREE.Mesh(geo.ear, sharedSkinToneMat);
    earL.scale.set(0.55, 1.1, 0.75);
    earL.position.set(-0.215, 0.0, 0.01);
    const earR = earL.clone();
    earR.position.x = 0.215;
    headGroup.add(earL, earR);
  }

  if (skinDef.headgear === 'cap') {
    const capTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.246, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.54),
      primaryMat
    );
    capTop.position.y = 0.06;
    const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.244, 0.05, 12), accentMat);
    capBand.position.y = 0.08;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.032, 10, 1, false, -Math.PI * 0.34, Math.PI * 0.68), accentMat);
    brim.rotation.y = Math.PI;
    brim.position.set(0, 0.075, -0.09);
    headGroup.add(capTop, capBand, brim);
  } else if (skinDef.headgear === 'goggles') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.246, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 0.06;
    const goggleBand = new THREE.Mesh(new THREE.CylinderGeometry(0.238, 0.238, 0.075, 12), secondaryMat);
    goggleBand.position.y = 0.095;
    const lensL = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.05, 10), visorMat);
    lensL.rotation.x = Math.PI / 2;
    lensL.position.set(-0.09, 0.095, -0.215);
    const lensR = lensL.clone();
    lensR.position.x = 0.09;
    headGroup.add(hair, goggleBand, lensL, lensR);
  } else if (skinDef.headgear === 'mask') {
    const foxMask = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), primaryMat);
    foxMask.position.y = 0.05;
    const lowerMask = new THREE.Mesh(new THREE.CylinderGeometry(0.228, 0.188, 0.18, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7), secondaryMat);
    lowerMask.rotation.y = Math.PI;
    lowerMask.position.set(0, -0.08, -0.01);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.24, 6), accentMat);
    earL.position.set(-0.14, 0.29, -0.03);
    const earR = earL.clone();
    earR.position.x = 0.14;
    const visorBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 3, 8), visorMat);
    visorBar.rotation.z = Math.PI / 2;
    visorBar.position.set(0, 0.03, -0.22);
    headGroup.add(foxMask, lowerMask, earL, earR, visorBar);
  } else if (skinDef.headgear === 'hood') {
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.278, 12, 10), primaryMat);
    hood.scale.set(0.98, 1.07, 1.04);
    hood.position.set(0, 0.02, 0.03);
    const faceShadow = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.165, 0.28, 10), secondaryMat);
    faceShadow.scale.set(1, 1, 0.35);
    faceShadow.position.set(0, 0, -0.2);
    const glowEyes = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.17, 3, 8), visorMat);
    glowEyes.rotation.z = Math.PI / 2;
    glowEyes.position.set(0, 0.04, -0.24);
    headGroup.add(hood, faceShadow, glowEyes);
  } else if (skinDef.headgear === 'cyber_helm') {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), secondaryMat);
    helm.scale.set(0.96, 1.06, 1.02);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.36), accentMat);
    fin.position.y = 0.27;
    const cyberVisor = new THREE.Mesh(new THREE.CylinderGeometry(0.246, 0.246, 0.1, 12, 1, false, -Math.PI * 0.34, Math.PI * 0.68), visorMat);
    cyberVisor.rotation.y = Math.PI;
    cyberVisor.position.set(0, 0.03, -0.02);
    headGroup.add(helm, fin, cyberVisor);
  } else if (skinDef.headgear === 'horns') {
    const oniMask = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.192, 0.2, 12, 1, false, -Math.PI * 0.35, Math.PI * 0.7), primaryMat);
    oniMask.rotation.y = Math.PI;
    oniMask.position.set(0, -0.08, -0.01);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.246, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), hairMat);
    hair.position.y = 0.05;
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.27, 6), accentMat);
    hornL.position.set(-0.16, 0.29, -0.07);
    hornL.rotation.z = 0.35;
    const hornR = hornL.clone();
    hornR.position.x = 0.16;
    hornR.rotation.z = -0.35;
    headGroup.add(oniMask, hair, hornL, hornR);
  } else if (skinDef.headgear === 'crown') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.248, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    hair.position.y = 0.05;
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.13, 8), accentMat);
    crownBase.position.y = 0.3;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), visorMat);
    gem.position.set(0, 0.31, -0.22);
    headGroup.add(hair, crownBase, gem);
  } else {
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.268, 12, 10), secondaryMat);
    const visorDome = new THREE.Mesh(new THREE.SphereGeometry(0.252, 10, 8, -Math.PI * 0.32, Math.PI * 0.64, 0.35, Math.PI * 0.45), visorMat);
    visorDome.rotation.y = -Math.PI / 2;
    visorDome.position.set(0, 0.01, -0.03);
    headGroup.add(helm, visorDome);
  }
  bodyGroup.add(headGroup);

  // Articulated 2-Segment Legs (Thigh + Knee Pivot + Shin + Tactical Boot)
  const makeLeg = (xPos: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xPos, 0.78, 0);
    const thigh = new THREE.Mesh(geo.thigh, secondaryMat);
    thigh.position.y = -0.19;
    thigh.castShadow = castShadows;

    const kneePivot = new THREE.Group();
    kneePivot.position.y = -0.38;
    const kneePad = new THREE.Mesh(geo.kneePad, accentMat);
    kneePad.position.set(0, 0, -0.095);
    const shin = new THREE.Mesh(geo.shin, primaryMat);
    shin.position.y = -0.17;
    shin.castShadow = castShadows;
    const bootUpper = new THREE.Mesh(geo.bootUpper, secondaryMat);
    bootUpper.position.set(0, -0.32, -0.045);
    bootUpper.castShadow = castShadows;
    const bootSole = new THREE.Mesh(geo.bootSole, sharedBootSoleMat);
    bootSole.position.set(0, -0.38, -0.045);

    kneePivot.add(kneePad, shin, bootUpper, bootSole);
    legGroup.add(thigh, kneePivot);
    return { legGroup, kneePivot };
  };
  const leftLegBuild = makeLeg(-0.165);
  const rightLegBuild = makeLeg(0.165);
  const leftLeg = leftLegBuild.legGroup;
  const rightLeg = rightLegBuild.legGroup;
  const leftKnee = leftLegBuild.kneePivot;
  const rightKnee = rightLegBuild.kneePivot;
  bodyGroup.add(leftLeg, rightLeg);

  // Articulated 2-Segment Arms (Shoulder + UpperArm + Elbow Pivot + Forearm + Glove)
  const makeArm = (xPos: number) => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xPos, 1.48, 0);
    const shoulder = new THREE.Mesh(geo.shoulder, accentMat);
    shoulder.position.y = -0.03;
    const upperArm = new THREE.Mesh(geo.upperArm, primaryMat);
    upperArm.position.y = -0.16;
    upperArm.castShadow = castShadows;

    const elbowPivot = new THREE.Group();
    elbowPivot.position.y = -0.29;
    const elbowPad = new THREE.Mesh(geo.elbowPad, secondaryMat);
    const forearm = new THREE.Mesh(geo.forearm, secondaryMat);
    forearm.position.y = -0.14;
    forearm.castShadow = castShadows;
    const hand = new THREE.Mesh(geo.hand, sharedSkinToneMat);
    hand.position.y = -0.29;

    elbowPivot.add(elbowPad, forearm, hand);
    armGroup.add(shoulder, upperArm, elbowPivot);
    return { armGroup, elbowPivot };
  };
  const leftArmBuild = makeArm(-0.43);
  const rightArmBuild = makeArm(0.43);
  const leftArm = leftArmBuild.armGroup;
  const leftElbow = leftArmBuild.elbowPivot;
  const rightArm = rightArmBuild.armGroup;
  const rightElbow = rightArmBuild.elbowPivot;

  leftArm.rotation.set(0.38, 0, 0.14);
  leftElbow.rotation.x = 0.48;
  rightArm.rotation.set(0.55, 0, 0);
  rightElbow.rotation.x = 0.57;

  // Detailed Weapon Group attached to Right Hand (compensates arm+elbow total pitch)
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(-0.04, -0.3, -0.03);
  weaponGroup.rotation.x = -1.12;

  const weaponMeshGroup = new THREE.Group();
  const muzzleFlash = new THREE.Mesh(geo.muzzle, sharedMuzzleMat);
  muzzleFlash.visible = false;

  weaponGroup.add(weaponMeshGroup, muzzleFlash);
  rightElbow.add(weaponGroup);
  bodyGroup.add(leftArm, rightArm);

  // Stylized Glider Canopy (uses custom GliderDef if provided)
  const gliderGroup = cosmetics?.gliderDef
    ? createGliderMesh(cosmetics.gliderDef)
    : createGliderMesh({
        id: 'skin_glider',
        nameRu: '',
        nameEn: '',
        rarity: 'common',
        price: 0,
        style: 'classic',
        primary: style.primary,
        accent: style.accent,
        glow: style.visor,
        swatch: '',
      });
  gliderGroup.position.set(0, 2.75, 0);
  gliderGroup.visible = !!cosmetics?.showGliderOpen;
  root.add(gliderGroup);

  const rig: CharacterRig = {
    root,
    bodyGroup,
    torso,
    headGroup,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    leftArm,
    rightArm,
    leftElbow,
    rightElbow,
    weaponGroup,
    weaponMeshGroup,
    muzzleFlash,
    gliderGroup,
    shadowDisc,
    flashTimer: 0,
    walkDist: 0,
    dancePhase: 0,
    aimBlend: 0,
    equippedWeaponKey: '',
  };

  setRigWeapon(rig, cosmetics?.pickaxeDef ? 'pickaxe' : 'ar', 0x38bdf8, textures, cosmetics?.pickaxeDef);
  return rig;
}

export function animateCharacterPose(
  rig: CharacterRig,
  dt: number,
  opts: {
    vx: number;
    vz: number;
    grounded: boolean;
    gliding: boolean;
    freefalling: boolean;
    crouching: boolean;
    pitch: number;
    emoteId: string | null;
    inVehicle?: boolean;
    sprinting?: boolean;
    aiming?: boolean;
    weaponType?: string;
  }
): void {
  if (opts.inVehicle) {
    rig.root.visible = false;
    return;
  }
  rig.root.visible = true;

  if (rig.flashTimer > 0) {
    rig.flashTimer -= dt;
    if (rig.flashTimer <= 0) rig.muzzleFlash.visible = false;
  }

  // Reset base transforms
  rig.bodyGroup.rotation.set(0, 0, 0);
  rig.bodyGroup.position.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.headGroup.rotation.set(0, 0, 0);
  rig.leftArm.rotation.set(0.32, 0, 0.16);
  rig.leftElbow.rotation.set(0.5, 0, 0);
  rig.rightArm.rotation.set(0.55, 0, -0.06);
  rig.rightElbow.rotation.set(0.57, 0, 0);
  rig.leftKnee.rotation.set(0, 0, 0);
  rig.rightKnee.rotation.set(0, 0, 0);
  rig.weaponGroup.rotation.set(-1.12, 0, 0);

  if (opts.emoteId) {
    rig.aimBlend = 0;
    rig.weaponGroup.visible = false;
    rig.dancePhase += dt * (opts.emoteId === 'hyper_jump' ? 8.5 : opts.emoteId === 'breakdance' ? 7.2 : 5.8);
    const p = rig.dancePhase;

    if (opts.emoteId === 'floss') {
      const sw = Math.sin(p) * 1.1;
      rig.torso.position.y = 1.16 + Math.abs(Math.cos(p)) * 0.06;
      rig.torso.rotation.z = Math.sin(p) * 0.15;
      rig.leftArm.rotation.x = 0.35;
      rig.leftArm.rotation.z = sw * 0.8 - 0.3;
      rig.rightArm.rotation.x = 0.35;
      rig.rightArm.rotation.z = sw * 0.8 + 0.3;
      rig.leftElbow.rotation.x = 0.25;
      rig.rightElbow.rotation.x = 0.25;
      rig.leftLeg.rotation.x = Math.sin(p) * 0.18;
      rig.rightLeg.rotation.x = -Math.sin(p) * 0.18;
    } else if (opts.emoteId === 'boogie') {
      rig.bodyGroup.position.y = Math.abs(Math.sin(p * 1.2)) * 0.16;
      rig.leftArm.rotation.x = 1.7 + Math.sin(p * 2) * 0.45;
      rig.rightArm.rotation.x = 1.7 - Math.sin(p * 2) * 0.45;
      rig.leftElbow.rotation.x = 0.65;
      rig.rightElbow.rotation.x = 0.65;
      rig.leftArm.rotation.z = -0.35;
      rig.rightArm.rotation.z = 0.35;
      rig.leftLeg.rotation.x = Math.sin(p) * 0.35;
      rig.rightLeg.rotation.x = -Math.sin(p) * 0.35;
      rig.leftKnee.rotation.x = -Math.abs(Math.sin(p)) * 0.45;
      rig.rightKnee.rotation.x = -Math.abs(Math.cos(p)) * 0.45;
    } else if (opts.emoteId === 'robot') {
      const step = Math.round(Math.sin(p) * 2) / 2;
      rig.torso.rotation.y = step * 0.5;
      rig.headGroup.rotation.y = -step * 0.6;
      rig.leftArm.rotation.x = 1.15 + step * 0.85;
      rig.rightArm.rotation.x = 1.15 - step * 0.85;
      rig.leftElbow.rotation.x = 0.85;
      rig.rightElbow.rotation.x = 0.85;
      rig.leftLeg.rotation.x = step * 0.3;
      rig.rightLeg.rotation.x = -step * 0.3;
    } else if (opts.emoteId === 'breakdance') {
      rig.bodyGroup.rotation.y = p * 0.9;
      rig.bodyGroup.position.y = Math.abs(Math.sin(p * 0.8)) * 0.35;
      rig.leftArm.rotation.x = 0.4;
      rig.rightArm.rotation.x = 0.4;
      rig.leftArm.rotation.z = -1.3;
      rig.rightArm.rotation.z = 1.3;
      rig.leftLeg.rotation.x = Math.sin(p * 2) * 0.55;
      rig.rightLeg.rotation.x = -Math.sin(p * 2) * 0.55;
    } else if (opts.emoteId === 'salute') {
      rig.rightArm.rotation.x = 1.45;
      rig.rightElbow.rotation.x = 1.35;
      rig.rightArm.rotation.z = 0.35;
      rig.leftArm.rotation.x = 0.25;
      rig.leftElbow.rotation.x = 0.35;
      rig.leftArm.rotation.z = -0.15;
      rig.torso.position.y = 1.18 + Math.sin(p * 0.5) * 0.03;
      rig.leftLeg.rotation.x = 0;
      rig.rightLeg.rotation.x = 0;
    } else {
      rig.bodyGroup.position.y = Math.abs(Math.sin(p)) * 0.55;
      rig.bodyGroup.rotation.y = Math.sin(p * 0.5) * 0.6;
      rig.leftArm.rotation.x = 2.2;
      rig.rightArm.rotation.x = 2.2;
      rig.leftArm.rotation.z = -0.25;
      rig.rightArm.rotation.z = 0.25;
      rig.leftLeg.rotation.x = Math.sin(p) * 0.45;
      rig.rightLeg.rotation.x = -Math.sin(p) * 0.45;
    }
    return;
  }

  rig.weaponGroup.visible = !opts.gliding && !opts.freefalling;

  if (opts.freefalling) {
    rig.aimBlend = 0;
    rig.bodyGroup.rotation.x = 1.15;
    rig.bodyGroup.position.y = 0.8;
    rig.leftArm.rotation.set(0.45, 0, -0.88);
    rig.rightArm.rotation.set(0.45, 0, 0.88);
    rig.leftElbow.rotation.x = 0.35;
    rig.rightElbow.rotation.x = 0.35;
    rig.leftLeg.rotation.x = -0.35;
    rig.rightLeg.rotation.x = 0.25;
    rig.leftKnee.rotation.x = -0.25;
    rig.rightKnee.rotation.x = -0.2;
    return;
  }

  if (opts.gliding) {
    rig.aimBlend = 0;
    rig.leftArm.rotation.set(2.45, 0, -0.24);
    rig.rightArm.rotation.set(2.45, 0, 0.24);
    rig.leftElbow.rotation.x = 0.45;
    rig.rightElbow.rotation.x = 0.45;
    rig.leftLeg.rotation.x = 0.15;
    rig.rightLeg.rotation.x = -0.1;
    rig.leftKnee.rotation.x = -0.25;
    rig.rightKnee.rotation.x = -0.15;
    return;
  }

  rig.torso.position.y = opts.crouching ? 0.92 : 1.16;
  rig.headGroup.position.y = opts.crouching ? 1.54 : 1.82;
  rig.rightArm.position.y = opts.crouching ? 1.24 : 1.48;
  rig.leftArm.position.y = opts.crouching ? 1.24 : 1.48;

  // Smooth ADS Aiming blend (0 = hip/run, 1 = crisp two-handed ADS)
  const targetAim = opts.aiming && !opts.sprinting ? 1 : 0;
  rig.aimBlend = THREE.MathUtils.lerp(rig.aimBlend, targetAim, Math.min(1, dt * 14));
  const ab = rig.aimBlend;

  const horizSpeed = Math.hypot(opts.vx, opts.vz);
  const isUnarmedOrPickaxe = opts.weaponType === 'pickaxe' || !opts.weaponType;

  // Base stance (interpolates smoothly into ADS)
  let rShoulderX = THREE.MathUtils.lerp(0.55 + opts.pitch * 0.65, 1.06 + opts.pitch * 0.85, ab);
  let rElbowX = THREE.MathUtils.lerp(0.57, 0.44, ab);
  let rShoulderZ = THREE.MathUtils.lerp(-0.06, -0.14, ab);

  let lShoulderX = THREE.MathUtils.lerp(0.32, 1.08 + opts.pitch * 0.78, ab);
  let lElbowX = THREE.MathUtils.lerp(0.55, 0.66, ab);
  let lShoulderY = THREE.MathUtils.lerp(0, -0.46, ab);
  let lShoulderZ = THREE.MathUtils.lerp(0.16, 0.38, ab);

  rig.torso.rotation.y = THREE.MathUtils.lerp(0.08, 0.28, ab);
  rig.torso.rotation.x = THREE.MathUtils.lerp(opts.crouching ? -0.12 : 0, -0.07, ab);
  rig.headGroup.rotation.z = THREE.MathUtils.lerp(0, -0.07, ab);
  rig.headGroup.rotation.y = THREE.MathUtils.lerp(-0.04, -0.22, ab);
  rig.headGroup.rotation.x = opts.pitch * (0.45 + 0.35 * ab);

  if (horizSpeed > 0.35 && opts.grounded) {
    const sprintBoost = opts.sprinting ? 1.38 : 1.15;
    rig.walkDist += dt * horizSpeed * sprintBoost;
    const swing = Math.sin(rig.walkDist);
    const cosBounce = Math.abs(Math.cos(rig.walkDist));

    const strideAmp = opts.sprinting ? 0.94 : ab > 0.4 ? 0.56 : 0.78;
    rig.leftLeg.rotation.x = swing * strideAmp;
    rig.rightLeg.rotation.x = -swing * strideAmp;
    rig.leftKnee.rotation.x = -Math.max(0, -swing) * (opts.sprinting ? 1.18 : 0.92) - 0.12;
    rig.rightKnee.rotation.x = -Math.max(0, swing) * (opts.sprinting ? 1.18 : 0.92) - 0.12;

    rig.bodyGroup.position.y = cosBounce * (opts.sprinting ? 0.085 : 0.055);
    rig.torso.rotation.x += (opts.sprinting ? -0.2 : -0.1) * (1 - ab * 0.65);
    rig.torso.rotation.y += swing * (opts.sprinting ? 0.28 : 0.18) * (1 - ab * 0.7);

    // Big Fortnite-style expressive arm swinging when running/sprinting (damped cleanly when ADS)
    const armAmpL = (opts.sprinting ? 1.48 : isUnarmedOrPickaxe ? 1.3 : 1.15) * (1 - ab * 0.85);
    lShoulderX -= swing * armAmpL;
    lShoulderZ += Math.max(0, -swing) * 0.2 * (1 - ab);
    lElbowX += Math.max(0, -swing) * 0.52 * (1 - ab);

    if (opts.sprinting || isUnarmedOrPickaxe) {
      const armAmpR = opts.sprinting ? 1.12 : 1.24;
      rShoulderX = (opts.sprinting ? 0.48 : 0.36) + swing * armAmpR;
      rElbowX = 0.72 + Math.max(0, swing) * 0.48;
      rShoulderZ = -0.14;
    } else if (ab < 0.35) {
      rShoulderX += swing * 0.22;
      rElbowX += Math.abs(swing) * 0.12;
    }
  } else if (!opts.grounded) {
    rig.leftLeg.rotation.x = 0.42;
    rig.rightLeg.rotation.x = -0.28;
    rig.leftKnee.rotation.x = -0.55;
    rig.rightKnee.rotation.x = -0.22;
    lShoulderX -= 0.25;
    lShoulderZ += 0.18;
  } else {
    rig.leftLeg.rotation.x *= 0.82;
    rig.rightLeg.rotation.x *= 0.82;
    rig.dancePhase += dt * 2.2;
    rig.torso.position.y += Math.sin(rig.dancePhase) * 0.015;
  }

  rig.leftArm.rotation.set(lShoulderX, lShoulderY, lShoulderZ);
  rig.leftElbow.rotation.x = lElbowX;
  rig.rightArm.rotation.set(rShoulderX, 0, rShoulderZ);
  rig.rightElbow.rotation.x = rElbowX;

  // Keep held weapon barrel cleanly aligned with aim pitch regardless of arm/elbow bend
  const weaponTotalArm = rShoulderX + rElbowX;
  rig.weaponGroup.rotation.x = -weaponTotalArm + opts.pitch - (opts.sprinting && !isUnarmedOrPickaxe ? 0.22 : 0);
  rig.weaponGroup.rotation.y = THREE.MathUtils.lerp(0.04, 0.15, ab);
}

export function createVehicleRig(
  type: VehicleTypeId,
  skin: VehicleSkinDef,
  shadowTex: THREE.CanvasTexture,
  castShadows = true
): VehicleRig {
  const root = new THREE.Group();
  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 5.4),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  const chassisGroup = new THREE.Group();
  root.add(chassisGroup);

  const bodyMat = new THREE.MeshStandardMaterial({ color: skin.bodyColor, roughness: 0.25, metalness: 0.55 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: skin.stripeColor, roughness: 0.3, metalness: 0.4 });
  const trimMat = new THREE.MeshStandardMaterial({ color: skin.trimColor, roughness: 0.75, metalness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.85 });
  const rimMat = new THREE.MeshStandardMaterial({ color: skin.rimColor, roughness: 0.2, metalness: 0.8 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9, metalness: 0.05 });
  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const flameMat = new THREE.MeshBasicMaterial({ color: skin.neonColor });

  const wheels: THREE.Group[] = [];
  const makeWheel = (wx: number, wy: number, wz: number, r: number, w: number) => {
    const wg = new THREE.Group();
    wg.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = castShadows;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.58, r * 0.58, w + 0.02, 8), rimMat);
    rim.rotation.z = Math.PI / 2;
    wg.add(tire, rim);
    root.add(wg);
    wheels.push(wg);
  };

  const flames: THREE.Mesh[] = [];

  if (type === 'sports') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.58, 4.4), bodyMat);
    base.position.y = 0.62;
    base.castShadow = castShadows;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.6, 4.42), stripeMat);
    stripe.position.y = 0.63;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.52, 2.0), glassMat);
    cabin.position.set(0, 1.12, 0.2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.08, 1.65), bodyMat);
    roof.position.set(0, 1.4, 0.25);
    const spoilerWing = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, 0.42), stripeMat);
    spoilerWing.position.set(0, 1.24, 2.0);
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.14), trimMat);
    postL.position.set(-0.65, 1.05, 2.0);
    const postR = postL.clone();
    postR.position.x = 0.65;
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.22, 0.26), trimMat);
    bumperF.position.set(0, 0.42, -2.18);
    chassisGroup.add(base, stripe, cabin, roof, spoilerWing, postL, postR, bumperF);

    makeWheel(-1.08, 0.42, -1.35, 0.42, 0.32);
    makeWheel(1.08, 0.42, -1.35, 0.42, 0.32);
    makeWheel(-1.08, 0.42, 1.35, 0.42, 0.32);
    makeWheel(1.08, 0.42, 1.35, 0.42, 0.32);
  } else if (type === 'suv') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.85, 4.7), bodyMat);
    base.position.y = 0.92;
    base.castShadow = castShadows;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.24, 4.72), stripeMat);
    stripe.position.y = 0.82;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.72, 2.75), glassMat);
    cabin.position.set(0, 1.66, 0.35);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.14, 2.8), bodyMat);
    roof.position.set(0, 2.04, 0.35);
    const roofRack = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.12, 2.1), trimMat);
    roofRack.position.set(0, 2.16, 0.4);
    const bullbar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.48, 0.25), trimMat);
    bullbar.position.set(0, 0.78, -2.42);
    const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 12), tireMat);
    spareTire.rotation.x = Math.PI / 2;
    spareTire.position.set(0, 1.15, 2.46);
    chassisGroup.add(base, stripe, cabin, roof, roofRack, bullbar, spareTire);

    makeWheel(-1.18, 0.56, -1.45, 0.56, 0.42);
    makeWheel(1.18, 0.56, -1.45, 0.56, 0.42);
    makeWheel(-1.18, 0.56, 1.45, 0.56, 0.42);
    makeWheel(1.18, 0.56, 1.45, 0.56, 0.42);
  } else {
    // Dune Raider Buggy
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.44, 3.8), bodyMat);
    base.position.y = 0.58;
    base.castShadow = castShadows;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 1.0), stripeMat);
    nose.position.set(0, 0.65, -1.7);
    const cageTop = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 1.8), trimMat);
    cageTop.position.set(0, 1.56, 0.15);
    const pillarFL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), trimMat);
    pillarFL.position.set(-0.68, 1.12, -0.68);
    pillarFL.rotation.x = 0.25;
    const pillarFR = pillarFL.clone();
    pillarFR.position.x = 0.68;
    const pillarBL = pillarFL.clone();
    pillarBL.position.set(-0.68, 1.12, 0.95);
    pillarBL.rotation.x = -0.25;
    const pillarBR = pillarBL.clone();
    pillarBR.position.x = 0.68;
    const engine = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.85), rimMat);
    engine.position.set(0, 0.88, 1.45);
    chassisGroup.add(base, nose, cageTop, pillarFL, pillarFR, pillarBL, pillarBR, engine);

    makeWheel(-1.05, 0.48, -1.35, 0.48, 0.34);
    makeWheel(1.05, 0.48, -1.35, 0.48, 0.34);
    makeWheel(-1.12, 0.54, 1.35, 0.54, 0.42);
    makeWheel(1.12, 0.54, 1.35, 0.54, 0.42);
  }

  // Headlights, Taillights & Exhaust Nitro Flames
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.1), headLightMat);
  hlL.position.set(-0.68, 0.66, type === 'suv' ? -2.35 : type === 'buggy' ? -2.18 : -2.2);
  const hlR = hlL.clone();
  hlR.position.x = 0.68;
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.1), tailLightMat);
  tlL.position.set(-0.68, 0.7, type === 'suv' ? 2.35 : type === 'buggy' ? 1.92 : 2.2);
  const tlR = tlL.clone();
  tlR.position.x = 0.68;
  chassisGroup.add(hlL, hlR, tlL, tlR);

  [-0.45, 0.45].forEach((fx) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.75, 6), flameMat);
    flame.rotation.x = Math.PI / 2;
    flame.position.set(fx, 0.48, type === 'suv' ? 2.55 : type === 'buggy' ? 2.15 : 2.45);
    flame.visible = false;
    chassisGroup.add(flame);
    flames.push(flame);
  });

  return { root, chassisGroup, wheels, flames, shadowDisc };
}

export function createBattleBus(): THREE.Group {
  const bus = new THREE.Group();

  const busBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.35 });
  const busTrim = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.5 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.5 });
  const balloonMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.6 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 });

  // Main Bus Hull
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.6, 12.2), busBlue);
  body.position.y = 2.2;
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.6, 12.5), darkMetal);
  bumper.position.y = 0.7;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 11.8), busTrim);
  roof.position.y = 4.15;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.4, 0.2), new THREE.MeshBasicMaterial({ color: 0x67e8f9 }));
  windshield.position.set(0, 2.7, -6.12);

  // Hot-Air Balloon above Bus
  const balloon = new THREE.Mesh(new THREE.SphereGeometry(5.6, 16, 14), balloonMat);
  balloon.scale.set(1, 1.15, 1.25);
  balloon.position.y = 12.2;
  const band = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.45, 8, 20), stripeMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 12.2;

  const burner = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.0, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
  burner.position.y = 6.0;

  // Suspension cables
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  [
    [-1.8, -3.5],
    [1.8, -3.5],
    [-1.8, 3.5],
    [1.8, 3.5],
  ].forEach(([cx, cz]) => {
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.2, 4), cableMat);
    cable.position.set(cx, 6.8, cz);
    bus.add(cable);
  });

  // Thruster Exhausts on Rear
  const jetL = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.2, 8), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  jetL.rotation.x = Math.PI / 2;
  jetL.position.set(-1.1, 1.8, 7.2);
  const jetR = jetL.clone();
  jetR.position.x = 1.1;

  // Side Windows & Front Headlights
  const sideWinMat = new THREE.MeshBasicMaterial({ color: 0xbae6fd });
  [-3.8, -1.3, 1.3, 3.8].forEach((wz) => {
    const winL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.0, 1.8), sideWinMat);
    winL.position.set(-2.22, 2.7, wz);
    const winR = winL.clone();
    winR.position.x = 2.22;
    bus.add(winL, winR);
  });
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const bhlL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.35, 0.15), hlMat);
  bhlL.position.set(-1.35, 1.25, -6.15);
  const bhlR = bhlL.clone();
  bhlR.position.x = 1.35;
  bus.add(bhlL, bhlR);

  bus.add(body, bumper, roof, windshield, balloon, band, burner, jetL, jetR);
  return bus;
}
