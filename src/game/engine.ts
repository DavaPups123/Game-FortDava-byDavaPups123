import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BACKBLINGS,
  BOT_NAMES,
  EMOTES,
  GLIDERS,
  GRID_SIZE,
  PICKAXES,
  POIS,
  RARITY_LIST,
  RARITY_COLORS,
  SKINS,
  STARTER_ISLAND_CENTER,
  TOURNAMENTS,
  VEHICLE_MODELS,
  VEHICLE_SKINS,
  WALL_HEIGHT,
  WEAPON_DEFS,
  WORLD_RADIUS,
  getBotDisplayName,
} from './data';
import {
  animateCharacterPose,
  CharacterRig,
  createBattleBus,
  createCharacterRig,
  createVehicleRig,
  createWeaponMesh,
  setRigWeapon,
  VehicleRig,
} from './models';
import {
  applyDamageMath,
  BotDifficultyProfile,
  calculateRankedDelta,
  calculateTournamentMatchPoints,
  canBotBuildCover,
  computeBuildGridPlacement,
  computeVehicleImpactDamage,
  getAllyCountForTeamSize,
  getBotDifficultyProfile,
  getBusBotJumpProgress,
  getDistanceToMarker,
  getRankForRp,
  getRoofSurfaceY,
  getStructureOpacity,
  shouldBotAnimateThisFrame,
  swapInventoryArray,
} from './rules';
import { SoundEngine } from './sound';
import { createProceduralTextures, ProceduralTextures } from './textures';
import {
  BuildPiece,
  ChatMessage,
  GameModeId,
  GraphicsQuality,
  HudSnapshot,
  MapMarker,
  MatchPhase,
  MatchResultSnapshot,
  PlayerProfile,
  TeamSizeId,
  VehicleTypeId,
} from './types';
import {
  BoxCollider,
  buildStarterIslandGeometry,
  buildTerrainGeometry,
  ChestObj,
  createWorldProps,
  getTerrainHeight,
  LaunchPadObj,
  RampCollider,
  RoofCollider,
} from './world';

interface InventorySlot {
  itemType: string;
  rarityIdx: number;
  ammo: number;
  count: number;
}

interface Combatant {
  isPlayer: boolean;
  isAlly: boolean;
  teamId: number;
  name: string;
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  wood: number;
  grounded: boolean;
  gliding: boolean;
  freefalling: boolean;
  inBus: boolean;
  busJumpTime: number;
  crouching: boolean;
  sprinting: boolean;
  aiming: boolean;
  reloading: boolean;
  reloadTimer: number;
  fireCooldown: number;
  recoilSpread: number;
  activeSlot: number;
  inventory: (InventorySlot | null)[];
  weapon?: InventorySlot;
  activeEmoteId: string | null;
  emoteTimer: number;
  vehicleId: number | null;
  aiState: 'roam' | 'combat' | 'flee_storm';
  aiTimer: number;
  targetPos: THREE.Vector3;
  targetEnemy: Combatant | null;
  strafeDir: number;
  stuckTimer: number;
  lastCheckX: number;
  lastCheckZ: number;
  allyColor: string;
  allyMarker: MapMarker | null;
  ramCooldown: number;
  enemyScanTimer: number;
  rig: CharacterRig;
}

interface WorldVehicle {
  id: number;
  type: VehicleTypeId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  speed: number;
  boost: number;
  hp: number;
  maxHp: number;
  driver: Combatant | null;
  lastDriver: Combatant | null;
  lastDriverTimer: number;
  rig: VehicleRig;
}

interface LootDrop {
  id: number;
  itemType: string;
  rarityIdx: number;
  ammo: number;
  count: number;
  x: number;
  y: number;
  z: number;
  mesh: THREE.Group;
  itemMesh: THREE.Object3D;
}

interface RocketObj {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  shooter: Combatant;
  life: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onKillFeed: (text: string) => void;
  onChatMessage: (msg: ChatMessage) => void;
  onFloatingText: (sx: number, sy: number, text: string, color: string, big: boolean) => void;
  onHitmarker: () => void;
  onDamageVignette: () => void;
  onPauseChange: (paused: boolean) => void;
  onMatchEnd: (res: MatchResultSnapshot) => void;
  onTokensChanged: (newTokens: number, chestOpened: boolean) => void;
}

export interface MatchConfig {
  mode: GameModeId;
  teamSize: TeamSizeId;
  botCount: number;
  quality: GraphicsQuality;
}

// Pre-allocated scratch helpers (Zero-GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function detectSoftwareWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class RoyaleEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  public sound = new SoundEngine();

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: ProceduralTextures;

  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private fog: THREE.Fog;
  private cloudGroup: THREE.Group;
  private worldGroup: THREE.Group;
  private terrainMesh: THREE.Mesh;
  private waterMesh: THREE.Mesh;
  private starterMesh: THREE.Mesh;

  // Lobby 3D Stage
  private lobbyStageGroup: THREE.Group;
  private lobbyCharRig: CharacterRig | null = null;
  private lobbyVehicleRig: VehicleRig | null = null;
  private lobbyPreviewMode: 'character' | 'vehicle' = 'character';
  private lobbyYaw = Math.PI - 0.35;
  private lobbyEmoteId: string | null = null;
  private lobbyEmoteTimer = 0;
  private shopPreview: {
    mode: 'character' | 'vehicle';
    skinId?: string;
    carSkinId?: string;
    emoteId?: string;
    pickaxeId?: string;
    gliderId?: string;
    backblingId?: string;
  } | null = null;

  // Match Entities & World Data
  private profile: PlayerProfile;
  private appMode: 'menu' | 'playing' | 'paused' | 'ended' = 'menu';
  private matchPhase: MatchPhase = 'starter_island';
  private matchConfig: MatchConfig = { mode: 'br', teamSize: 'solo', botCount: 23, quality: 'medium' };
  private botDifficulty: BotDifficultyProfile = getBotDifficultyProfile('br', 150);
  private starterTimer = 10;
  private starterWaitTime = 0;
  private thankedBusDriver = false;
  private busBotThankTimer = 0;
  private nextChatId = 1;

  // Battle Bus
  private battleBusMesh: THREE.Group;
  private busStart = new THREE.Vector3(-280, 88, -240);
  private busEnd = new THREE.Vector3(280, 88, 240);
  private busPos = new THREE.Vector3(-280, 88, -240);
  private busProgress = 0;
  private busActive = false;

  private boxColliders: BoxCollider[] = [];
  private rampColliders: RampCollider[] = [];
  private roofColliders: RoofCollider[] = [];
  private chests: ChestObj[] = [];
  private launchPads: LaunchPadObj[] = [];
  private lootItems: LootDrop[] = [];
  private vehicles: WorldVehicle[] = [];
  private rockets: RocketObj[] = [];
  private tracers: { mesh: THREE.Mesh; life: number }[] = [];
  private particles: { mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[] = [];
  private treeTrunkInst: THREE.InstancedMesh | null = null;
  private treeLeavesInst: THREE.InstancedMesh | null = null;
  private rockInst: THREE.InstancedMesh | null = null;
  private nextLootId = 1;

  // Marker 3D Beacon
  private playerMarker: MapMarker | null = null;
  private markerBeaconGroup: THREE.Group;

  // Storm
  private storm = {
    x: 0,
    z: 0,
    radius: WORLD_RADIUS * 1.05,
    nextX: 0,
    nextZ: 0,
    nextRadius: WORLD_RADIUS * 0.62,
    phase: 1,
    timer: 35,
    shrinking: false,
    dps: 2,
    tickAccum: 0,
    mesh: null as THREE.Mesh | null,
  };

  // Building Ghost
  private buildState: { active: boolean; piece: BuildPiece; rotStep: number } = {
    active: false,
    piece: 'wall',
    rotStep: 0,
  };
  private ghostGroup: THREE.Group;
  private ghostMat: THREE.MeshBasicMaterial;
  private ghostWallMesh: THREE.Mesh;
  private ghostFloorMesh: THREE.Mesh;
  private ghostRampMesh: THREE.Mesh;

  private player: Combatant | null = null;
  private bots: Combatant[] = [];
  private matchStats = { kills: 0, damage: 0, tokensEarned: 0, totalPlayers: 24 };

  // Input & Loop state
  private keys = new Set<string>();
  private mouseDownLeft = false;
  private isDraggingLobby = false;
  private lastDragX = 0;
  private wasPointerLocked = false;
  private uiModalOpen = false;
  private mouseSensitivity = 1.0;
  private currentQuality: GraphicsQuality = 'medium';
  private hitstopTimer = 0;
  private cameraTrauma = 0;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private fpsTimer = 0;
  private frameCounter = 0;
  private currentFps = 60;
  private hudThrottle = 0;
  private camTargetPos = new THREE.Vector3();
  private camDesiredPos = new THREE.Vector3();

  private tracerMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  private particleGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  private particleMatCache = new Map<number, THREE.MeshBasicMaterial>();
  private simFrame = 0;

  constructor(container: HTMLElement, initialProfile: PlayerProfile, callbacks: EngineCallbacks) {
    this.container = container;
    this.profile = initialProfile;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5ec8f8);
    this.fog = new THREE.Fog(0x7dd3fc, 155, 390);
    this.scene.fog = this.fog;

    // Studio Environment Reflections for PBR skins & cars
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      580
    );

    this.textures = createProceduralTextures(this.renderer.capabilities.getMaxAnisotropy());

    // 3-point warm/cool lighting
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f6212, 0.85);
    this.hemiLight.position.set(0, 140, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    this.dirLight.position.set(120, 180, 95);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 20;
    this.dirLight.shadow.camera.far = 450;
    const dShadow = 140;
    this.dirLight.shadow.camera.left = -dShadow;
    this.dirLight.shadow.camera.right = dShadow;
    this.dirLight.shadow.camera.top = dShadow;
    this.dirLight.shadow.camera.bottom = -dShadow;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Sun & Clouds
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(18, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
    );
    sunMesh.position.set(240, 280, 190);
    this.scene.add(sunMesh);

    this.cloudGroup = new THREE.Group();
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    for (let i = 0; i < 24; i++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 4; p++) {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + Math.random() * 6, 0), cloudMat);
        m.position.set((p - 1.5) * 7, Math.random() * 2.5, (Math.random() - 0.5) * 5);
        m.scale.y = 0.55;
        cg.add(m);
      }
      const ang = (i / 24) * Math.PI * 2;
      const rad = 110 + Math.random() * 220;
      cg.position.set(Math.cos(ang) * rad, 112 + Math.random() * 35, Math.sin(ang) * rad);
      this.cloudGroup.add(cg);
    }
    this.scene.add(this.cloudGroup);

    // Terrain & Ocean
    const terrainGeo = new THREE.PlaneGeometry(WORLD_RADIUS * 2.25, WORLD_RADIUS * 2.25, 132, 132);
    terrainGeo.rotateX(-Math.PI / 2);
    buildTerrainGeometry(terrainGeo);
    this.terrainMesh = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshLambertMaterial({ vertexColors: true, map: this.textures.terrainDetail })
    );
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    const waterGeo = new THREE.PlaneGeometry(2400, 2400);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(waterGeo, new THREE.MeshLambertMaterial({ color: 0x0ea5e9 }));
    this.waterMesh.position.y = -3.2;
    this.scene.add(this.waterMesh);

    this.starterMesh = buildStarterIslandGeometry();
    this.scene.add(this.starterMesh);

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // Storm Cylinder
    const stormGeo = new THREE.CylinderGeometry(1, 1, 180, 48, 1, true);
    this.storm.mesh = new THREE.Mesh(
      stormGeo,
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.scene.add(this.storm.mesh);

    // Battle Bus
    this.battleBusMesh = createBattleBus();
    this.battleBusMesh.visible = false;
    this.scene.add(this.battleBusMesh);

    // Map Marker 3D Beacon
    this.markerBeaconGroup = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.85, 140, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = 70;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.2, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    this.markerBeaconGroup.add(beam, ring);
    this.markerBeaconGroup.visible = false;
    this.scene.add(this.markerBeaconGroup);

    // Building Ghost Preview
    this.ghostMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.48, depthWrite: false });
    this.ghostGroup = new THREE.Group();
    this.ghostGroup.rotation.order = 'YXZ';
    this.ghostGroup.visible = false;
    this.ghostWallMesh = new THREE.Mesh(new THREE.BoxGeometry(GRID_SIZE, WALL_HEIGHT, 0.3), this.ghostMat);
    this.ghostFloorMesh = new THREE.Mesh(new THREE.BoxGeometry(GRID_SIZE, 0.25, GRID_SIZE), this.ghostMat);
    this.ghostRampMesh = new THREE.Mesh(new THREE.BoxGeometry(GRID_SIZE, 0.25, Math.hypot(GRID_SIZE, WALL_HEIGHT)), this.ghostMat);
    this.ghostRampMesh.rotation.x = Math.atan2(WALL_HEIGHT, GRID_SIZE);
    this.ghostGroup.add(this.ghostWallMesh, this.ghostFloorMesh, this.ghostRampMesh);
    this.scene.add(this.ghostGroup);

    // Lobby Stage
    this.lobbyStageGroup = new THREE.Group();
    const pedBase = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.7, 0.3, 28), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.5 }));
    const pedRing = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.28, 28), new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }));
    pedRing.rotation.x = -Math.PI / 2;
    pedRing.position.y = 0.16;
    this.lobbyStageGroup.add(pedBase, pedRing);
    this.scene.add(this.lobbyStageGroup);

    this.applyGraphicsQuality('medium');
    this.populateWorld();
    this.rebuildLobbyShowcase();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('auxclick', this.onAuxClick);
    window.addEventListener('wheel', this.onWheel);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('auxclick', this.onAuxClick);
    window.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private onResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onWindowBlur = (): void => {
    this.keys.clear();
    this.mouseDownLeft = false;
    this.isDraggingLobby = false;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.keys.clear();
      this.mouseDownLeft = false;
    }
  };

  private onPointerLockChange = (): void => {
    if (document.pointerLockElement === this.renderer.domElement) {
      this.wasPointerLocked = true;
    } else if (this.wasPointerLocked) {
      this.wasPointerLocked = false;
      if (this.appMode === 'playing' && !this.uiModalOpen) {
        this.pause();
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (this.appMode !== 'playing' || !this.player || !this.player.alive) return;

    if (this.matchPhase === 'starter_island' && e.code === 'Space') {
      this.skipStarterWait();
      return;
    }
    if (this.matchPhase === 'battle_bus' && (e.code === 'Space' || e.code === 'KeyF')) {
      this.jumpFromBus();
      return;
    }
    if (this.matchPhase === 'skydiving' && e.code === 'Space') {
      const groundY = getTerrainHeight(this.player.x, this.player.z);
      if (this.player.y - groundY > 14) {
        this.player.gliding = !this.player.gliding;
        this.player.freefalling = !this.player.gliding;
        this.player.rig.gliderGroup.visible = this.player.gliding;
      }
      return;
    }

    if (e.code === 'Digit1') this.selectSlot(0);
    if (e.code === 'Digit2') this.selectSlot(1);
    if (e.code === 'Digit3') this.selectSlot(2);
    if (e.code === 'Digit4') this.selectSlot(3);
    if (e.code === 'Digit5') this.selectSlot(4);

    if (e.code === 'KeyQ' && this.player.vehicleId === null) {
      this.buildState.active = !this.buildState.active;
      this.player.aiming = false;
      this.player.activeEmoteId = null;
    }
    if (e.code === 'KeyZ' && this.player.vehicleId === null) {
      this.buildState.active = true;
      this.buildState.piece = 'wall';
      this.player.aiming = false;
    }
    if (e.code === 'KeyX' && this.player.vehicleId === null) {
      this.buildState.active = true;
      this.buildState.piece = 'ramp';
      this.player.aiming = false;
    }
    if (e.code === 'KeyV' && this.player.vehicleId === null) {
      this.buildState.active = true;
      this.buildState.piece = 'floor';
      this.player.aiming = false;
    }

    if (e.code === 'KeyR') {
      if (this.buildState.active) {
        this.buildState.rotStep = (this.buildState.rotStep + 1) & 3;
      } else {
        this.startReload(this.player);
      }
    }

    if (e.code === 'KeyC' || e.code === 'ControlLeft') {
      this.player.crouching = !this.player.crouching;
    }

    if (e.code === 'KeyE' || e.code === 'KeyF') {
      this.tryInteract();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.appMode === 'menu' && this.isDraggingLobby) {
      const dx = e.movementX || (e.clientX - this.lastDragX);
      this.lastDragX = e.clientX;
      this.lobbyYaw += dx * 0.012;
      if (this.lobbyCharRig) this.lobbyCharRig.root.rotation.y = this.lobbyYaw;
      if (this.lobbyVehicleRig) this.lobbyVehicleRig.root.rotation.y = this.lobbyYaw;
      return;
    }

    if (this.appMode !== 'playing' || !this.player || !this.player.alive) return;
    if (document.pointerLockElement === this.renderer.domElement) {
      const zoomFactor = this.player.aiming ? 0.55 : 1.0;
      const sens = 0.0022 * this.mouseSensitivity * zoomFactor;
      this.player.yaw -= e.movementX * sens;
      this.player.pitch -= e.movementY * sens;
      this.player.pitch = Math.max(-1.15, Math.min(1.15, this.player.pitch));
    }
  };

  private onAuxClick = (e: MouseEvent): void => {
    if (this.appMode === 'playing' && e.button === 1 && e.target === this.renderer.domElement) {
      e.preventDefault();
    }
  };

  private pingFromCameraAim(): void {
    if (!this.player) return;
    this.camera.getWorldPosition(_v1);
    this.camera.getWorldDirection(_v2);
    const allCombatants = [this.player, ...this.bots];
    const hit = this.traceBullet(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z, 460, this.player, allCombatants);
    let px = hit.hitX;
    let pz = hit.hitZ;
    if (hit.hitType === 'none') {
      if (_v2.y < -0.04) {
        const tGround = Math.min(460, Math.max(12, -_v1.y / _v2.y));
        px = _v1.x + _v2.x * tGround;
        pz = _v1.z + _v2.z * tGround;
      } else {
        px = this.player.x + _v2.x * 140;
        pz = this.player.z + _v2.z * 140;
      }
    }
    const distFromOrigin = Math.hypot(px, pz);
    if (this.matchPhase !== 'starter_island' && distFromOrigin > WORLD_RADIUS - 8) {
      const ratio = (WORLD_RADIUS - 8) / distFromOrigin;
      px *= ratio;
      pz *= ratio;
    }
    this.setPlayerMarker(px, pz);
    this.emitHudSnapshot();
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.appMode === 'menu') {
      if (e.target === this.renderer.domElement) {
        this.isDraggingLobby = true;
        this.lastDragX = e.clientX;
      }
      return;
    }
    if (this.appMode !== 'playing' || !this.player || !this.player.alive || this.uiModalOpen) return;
    if (e.target !== this.renderer.domElement) return;

    if (e.button === 1) {
      e.preventDefault();
      this.pingFromCameraAim();
      return;
    }

    if (document.pointerLockElement !== this.renderer.domElement) {
      this.renderer.domElement.requestPointerLock?.();
    }

    if (e.button === 0) {
      this.mouseDownLeft = true;
      this.player.activeEmoteId = null;
      this.handlePrimaryAction();
    } else if (e.button === 2) {
      if (this.buildState.active) {
        this.buildState.piece =
          this.buildState.piece === 'wall' ? 'ramp' : this.buildState.piece === 'ramp' ? 'floor' : 'wall';
      } else if (!this.player.gliding && !this.player.freefalling && this.player.vehicleId === null) {
        this.player.aiming = true;
      }
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.isDraggingLobby = false;
    if (e.button === 0) this.mouseDownLeft = false;
    if (e.button === 2 && this.player) this.player.aiming = false;
  };

  private onWheel = (e: WheelEvent): void => {
    if (this.appMode !== 'playing' || !this.player || this.player.vehicleId !== null) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    this.selectSlot((this.player.activeSlot + dir + 5) % 5);
  };

  // =========================================================================
  // PUBLIC CONTROLS FOR REACT UI
  // =========================================================================
  public applyGraphicsQuality(q: GraphicsQuality): void {
    this.currentQuality = q;
    const pr = this.isSoftwareGl ? 1 : q === 'low' ? 0.8 : q === 'medium' ? 1.0 : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && q !== 'low';
    this.dirLight.castShadow = !this.isSoftwareGl && q !== 'low';
    this.fog.near = q === 'low' ? 110 : q === 'medium' ? 160 : 230;
    this.fog.far = q === 'low' ? 240 : q === 'medium' ? 390 : 520;
    this.camera.far = this.fog.far + 100;
    this.camera.updateProjectionMatrix();
  }

  public setSensitivity(s: number): void {
    this.mouseSensitivity = s;
  }

  public getProfile(): PlayerProfile {
    return this.profile;
  }

  public setUiModalOpen(open: boolean): void {
    this.uiModalOpen = open;
    if (open) {
      this.keys.clear();
      this.mouseDownLeft = false;
      if (this.player) this.player.aiming = false;
    }
  }

  public updateProfile(profile: PlayerProfile): void {
    this.profile = profile;
    if (this.appMode === 'menu') {
      this.rebuildLobbyShowcase();
    }
  }

  public setLobbyPreviewMode(mode: 'character' | 'vehicle'): void {
    this.shopPreview = null;
    this.lobbyPreviewMode = mode;
    this.lobbyYaw = mode === 'vehicle' ? Math.PI * 0.74 : Math.PI - 0.35;
    if (this.appMode === 'menu') {
      this.rebuildLobbyShowcase();
    }
  }

  public setShopPreview(
    preview: {
      mode: 'character' | 'vehicle';
      skinId?: string;
      carSkinId?: string;
      emoteId?: string;
      pickaxeId?: string;
      gliderId?: string;
      backblingId?: string;
    } | null
  ): void {
    this.shopPreview = preview;
    if (preview) {
      this.lobbyPreviewMode = preview.mode;
      this.lobbyYaw =
        preview.mode === 'vehicle'
          ? Math.PI * 0.74
          : preview.backblingId
            ? 0.45
            : Math.PI - 0.35;
      if (preview.emoteId) {
        this.sound.init();
        this.lobbyEmoteId = preview.emoteId;
        this.lobbyEmoteTimer = 5.0;
      }
    } else {
      this.lobbyPreviewMode = 'character';
      this.lobbyYaw = Math.PI - 0.35;
    }
    if (this.appMode === 'menu') {
      this.rebuildLobbyShowcase();
    }
  }

  public clearShopPreview(): void {
    this.setShopPreview(null);
  }

  public triggerEmote(emoteId: string): void {
    this.sound.init();
    if (this.appMode === 'menu') {
      this.lobbyEmoteId = emoteId;
      this.lobbyEmoteTimer = 5.0;
      return;
    }
    if (this.appMode === 'playing' && this.player && this.player.alive && this.player.grounded && this.player.vehicleId === null) {
      this.buildState.active = false;
      this.player.aiming = false;
      this.player.activeEmoteId = emoteId;
      this.player.emoteTimer = 5.5;
    }
  }

  public thankBusDriver(): void {
    if (this.appMode !== 'playing' || this.matchPhase !== 'battle_bus' || !this.player || this.thankedBusDriver) {
      return;
    }
    this.thankedBusDriver = true;
    this.sound.init();
    this.sound.playBusHorn();
    const lang = this.profile.language;
    this.callbacks.onChatMessage({
      id: this.nextChatId++,
      sender: this.player.name,
      text: lang === 'ru' ? 'поблагодарил водителя автобуса!' : 'thanked the bus driver!',
      kind: 'bus',
    });
    this.emitHudSnapshot();
  }

  public sendPlayerChat(text: string): void {
    const clean = text.trim().slice(0, 90);
    if (!clean || !this.player) return;
    this.callbacks.onChatMessage({
      id: this.nextChatId++,
      sender: this.player.name,
      text: clean,
      kind: 'player',
    });
  }

  public swapInventorySlots(idxA: number, idxB: number): void {
    if (!this.player || !this.player.alive) return;
    if (idxA < 1 || idxB < 1 || idxA >= 5 || idxB >= 5 || idxA === idxB) return;
    this.player.inventory = swapInventoryArray(this.player.inventory, idxA, idxB);
    if (this.player.activeSlot === idxA) this.player.activeSlot = idxB;
    else if (this.player.activeSlot === idxB) this.player.activeSlot = idxA;
    this.player.reloading = false;
    this.player.reloadTimer = 0;
    this.sound.playPickup();
    this.emitHudSnapshot();
  }

  public dropInventorySlot(idx: number): void {
    if (!this.player || !this.player.alive || idx < 1 || idx >= 5) return;
    const item = this.player.inventory[idx];
    if (!item) return;
    const dropX = this.player.x - Math.sin(this.player.yaw) * 1.4;
    const dropZ = this.player.z - Math.cos(this.player.yaw) * 1.4;
    const dropY = Math.max(this.player.y, getTerrainHeight(dropX, dropZ));
    this.spawnLoot(item.itemType, item.rarityIdx, dropX, dropY, dropZ, item.ammo, item.count);
    this.player.inventory[idx] = null;
    if (this.player.activeSlot === idx) {
      this.player.reloading = false;
      this.player.reloadTimer = 0;
    }
    this.sound.playPickup();
    this.emitHudSnapshot();
  }

  public equipSlot(idx: number): void {
    if (!this.player || !this.player.alive || idx < 0 || idx >= 5) return;
    this.selectSlot(idx);
    this.emitHudSnapshot();
  }

  public setPlayerMarker(x: number, z: number): void {
    const label = this.profile.language === 'ru' ? 'Метка' : 'Marker';
    this.playerMarker = { x, z, label, color: '#38bdf8', isPlayerPing: true };
    const y = getTerrainHeight(x, z);
    this.markerBeaconGroup.position.set(x, y, z);
    this.markerBeaconGroup.visible = true;
    this.sound.playPickup();
  }

  public clearPlayerMarker(): void {
    this.playerMarker = null;
    this.markerBeaconGroup.visible = false;
  }

  public pause(): void {
    if (this.appMode !== 'playing') return;
    this.appMode = 'paused';
    this.keys.clear();
    this.mouseDownLeft = false;
    if (this.player) this.player.aiming = false;
    document.exitPointerLock?.();
    this.callbacks.onPauseChange(true);
  }

  public resume(): void {
    if (this.appMode !== 'paused') return;
    this.appMode = 'playing';
    this.callbacks.onPauseChange(false);
    this.requestPointerLock();
  }

  public requestPointerLock(): void {
    if (this.appMode !== 'playing') return;
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { userActivation?: { isActive: boolean } }) : undefined;
    if (nav?.userActivation && !nav.userActivation.isActive) return;
    try {
      const p = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // Ignore pointer lock rejection when not directly triggered by user gesture
    }
  }

  public enterLobby(): void {
    this.appMode = 'menu';
    this.keys.clear();
    this.mouseDownLeft = false;
    this.busActive = false;
    document.exitPointerLock?.();
    this.clearMatchActors();
    this.battleBusMesh.visible = false;
    this.markerBeaconGroup.visible = false;
    this.ghostGroup.visible = false;
    this.lobbyStageGroup.visible = true;
    this.populateWorld();
    this.rebuildLobbyShowcase();
  }

  public startMatch(config: MatchConfig): void {
    this.sound.init();
    this.matchConfig = config;
    this.botDifficulty = getBotDifficultyProfile(config.mode, this.profile.rankedPoints);
    this.applyGraphicsQuality(config.quality);

    this.lobbyStageGroup.visible = false;
    if (this.lobbyCharRig) {
      this.scene.remove(this.lobbyCharRig.root);
      this.lobbyCharRig = null;
    }
    if (this.lobbyVehicleRig) {
      this.scene.remove(this.lobbyVehicleRig.root);
      this.lobbyVehicleRig = null;
    }

    this.clearMatchActors();
    this.populateWorld();
    this.resetStorm();
    this.clearPlayerMarker();
    this.busActive = false;
    this.battleBusMesh.visible = false;

    const totalBots = Math.max(7, config.botCount);
    this.matchStats = {
      kills: 0,
      damage: 0,
      tokensEarned: 0,
      totalPlayers: totalBots + 1,
    };

    // Spawn Player on Starter Island
    this.player = this.createPlayer();
    this.bots = [];
    const allyCount = getAllyCountForTeamSize(config.teamSize);
    const allyColors = ['#4ade80', '#facc15', '#fb7185'];

    for (let i = 0; i < totalBots; i++) {
      const isAlly = i < allyCount;
      this.bots.push(this.createBot(i, isAlly, isAlly ? allyColors[i % allyColors.length] : '#ef4444', totalBots));
    }

    this.matchPhase = 'starter_island';
    this.starterTimer = 10;
    this.starterWaitTime = 0;
    this.thankedBusDriver = false;
    this.busBotThankTimer = 1.1;
    this.buildState.active = false;
    this.appMode = 'playing';
    this.callbacks.onChatMessage({
      id: this.nextChatId++,
      sender: 'BUS-OS',
      text:
        this.profile.language === 'ru'
          ? 'Вы на стартовом острове! Нажмите [Enter] для чата или [СКМ] для метки.'
          : 'On Starter Island! Press [Enter] for chat or [MMB] to ping.',
      kind: 'system',
    });
    this.emitHudSnapshot();
    this.requestPointerLock();
  }

  public skipStarterWait(): void {
    if (this.appMode !== 'playing' || this.matchPhase !== 'starter_island') return;
    this.launchBattleBus();
  }

  public jumpFromBus(): void {
    if (this.appMode !== 'playing' || this.matchPhase !== 'battle_bus' || !this.player) return;
    this.matchPhase = 'skydiving';
    this.player.inBus = false;
    this.player.x = this.busPos.x;
    this.player.y = this.busPos.y - 3.5;
    this.player.z = this.busPos.z;
    this.player.vy = -8;
    this.player.freefalling = true;
    this.player.gliding = false;
    this.player.rig.gliderGroup.visible = false;
    this.sound.playLaunchPad();
  }

  // =========================================================================
  // WORLD & SHOWCASE SETUP
  // =========================================================================
  private rebuildLobbyShowcase(): void {
    if (this.lobbyCharRig) {
      this.scene.remove(this.lobbyCharRig.root);
      this.lobbyCharRig = null;
    }
    if (this.lobbyVehicleRig) {
      this.scene.remove(this.lobbyVehicleRig.root);
      this.lobbyVehicleRig = null;
    }

    const stageY = getTerrainHeight(0, 6);
    this.lobbyStageGroup.position.set(0, stageY, 6);

    if (this.lobbyPreviewMode === 'vehicle') {
      const targetCarSkinId = this.shopPreview?.carSkinId || this.profile.equippedCarSkin;
      const carSkin = VEHICLE_SKINS.find((s) => s.id === targetCarSkinId) || VEHICLE_SKINS[0];
      this.lobbyVehicleRig = createVehicleRig(this.profile.equippedCarModel, carSkin, this.textures.contactShadow, !this.isSoftwareGl);
      this.lobbyVehicleRig.root.position.set(0, stageY + 0.16, 6);
      this.lobbyVehicleRig.root.rotation.y = this.lobbyYaw;
      this.scene.add(this.lobbyVehicleRig.root);
    } else {
      const targetSkinId = this.shopPreview?.skinId || this.profile.equippedSkin;
      const skinDef = SKINS.find((s) => s.id === targetSkinId) || SKINS[0];
      const styleId = this.profile.equippedSkinStyles[skinDef.id];
      const style = skinDef.styles.find((st) => st.id === styleId) || skinDef.styles[0];

      const pickaxeDef = PICKAXES.find((p) => p.id === (this.shopPreview?.pickaxeId || this.profile.equippedPickaxe)) || PICKAXES[0];
      const gliderDef = GLIDERS.find((g) => g.id === (this.shopPreview?.gliderId || this.profile.equippedGlider)) || GLIDERS[0];
      const backblingDef = BACKBLINGS.find((b) => b.id === (this.shopPreview?.backblingId || this.profile.equippedBackbling)) || BACKBLINGS[0];

      this.lobbyCharRig = createCharacterRig(
        skinDef,
        style,
        this.textures.contactShadow,
        !this.isSoftwareGl,
        this.textures,
        {
          pickaxeDef,
          gliderDef,
          backblingDef,
          showGliderOpen: !!this.shopPreview?.gliderId,
        }
      );
      if (this.shopPreview?.pickaxeId) {
        setRigWeapon(this.lobbyCharRig, 'pickaxe', RARITY_COLORS[pickaxeDef.rarity].hex, this.textures, pickaxeDef);
      } else {
        setRigWeapon(this.lobbyCharRig, 'ar', RARITY_COLORS.legendary.hex, this.textures);
      }
      this.lobbyCharRig.root.position.set(0, stageY + 0.16, 6);
      this.lobbyCharRig.root.rotation.y = this.lobbyYaw;
      this.scene.add(this.lobbyCharRig.root);
    }
  }

  private clearMatchActors(): void {
    if (this.player) {
      this.scene.remove(this.player.rig.root);
      this.player = null;
    }
    for (const b of this.bots) {
      this.scene.remove(b.rig.root);
    }
    this.bots = [];
    for (const v of this.vehicles) {
      this.scene.remove(v.rig.root);
    }
    this.vehicles = [];
    for (const rk of this.rockets) {
      this.scene.remove(rk.mesh);
    }
    this.rockets = [];
    for (const tr of this.tracers) {
      this.scene.remove(tr.mesh);
    }
    this.tracers = [];
  }

  private populateWorld(): void {
    while (this.worldGroup.children.length > 0) {
      this.worldGroup.remove(this.worldGroup.children[0]);
    }
    for (const v of this.vehicles) {
      this.scene.remove(v.rig.root);
    }
    this.vehicles = [];
    this.boxColliders = [];
    this.rampColliders = [];
    this.roofColliders = [];
    this.lootItems = [];
    this.chests = [];
    this.launchPads = [];

    const res = createWorldProps(
      this.worldGroup,
      this.textures,
      this.currentQuality,
      this.boxColliders,
      this.rampColliders,
      this.roofColliders,
      this.chests,
      this.launchPads,
      this.spawnLoot,
      this.spawnRandomLoot
    );
    this.treeTrunkInst = res.treeTrunkInst;
    this.treeLeavesInst = res.treeLeavesInst;
    this.rockInst = res.rockInst;

    // Spawn drivable vehicles
    const playerCarSkin = VEHICLE_SKINS.find((s) => s.id === this.profile.equippedCarSkin) || VEHICLE_SKINS[0];
    res.vehicleSpawns.forEach((sp, idx) => {
      const mDef = VEHICLE_MODELS.find((m) => m.id === sp.type) || VEHICLE_MODELS[0];
      const skin = idx === 0 ? playerCarSkin : VEHICLE_SKINS[(idx + 1) % VEHICLE_SKINS.length];
      const rig = createVehicleRig(sp.type, skin, this.textures.contactShadow, !this.isSoftwareGl);
      const y = getTerrainHeight(sp.x, sp.z);
      rig.root.position.set(sp.x, y, sp.z);
      rig.root.rotation.y = sp.yaw;
      this.scene.add(rig.root);
      this.vehicles.push({
        id: idx + 1,
        type: sp.type,
        x: sp.x,
        y,
        z: sp.z,
        yaw: sp.yaw,
        speed: 0,
        boost: 100,
        hp: mDef.maxHp,
        maxHp: mDef.maxHp,
        driver: null,
        lastDriver: null,
        lastDriverTimer: 0,
        rig,
      });
    });
  }

  private spawnLoot = (itemType: string, rarityIdx: number, x: number, y: number, z: number, ammoOverride?: number, count = 1): void => {
    const def = WEAPON_DEFS[itemType];
    const rarId = RARITY_LIST[rarityIdx] || 'common';
    const rarHex = RARITY_COLORS[rarId].hex;

    const group = new THREE.Group();
    group.position.set(x, y + 0.45, z);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.28, 2.2, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: itemType === 'token_drop' ? 0x38bdf8 : rarHex,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    pillar.position.y = 0.8;
    group.add(pillar);

    let itemMesh: THREE.Object3D;
    if (itemType === 'token_drop') {
      itemMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    } else {
      itemMesh = createWeaponMesh(itemType, rarHex, this.textures);
      itemMesh.scale.setScalar(1.22);
    }
    group.add(itemMesh);

    this.worldGroup.add(group);
    this.lootItems.push({
      id: this.nextLootId++,
      itemType,
      rarityIdx,
      ammo: ammoOverride !== undefined ? ammoOverride : def ? def.magSize || 1 : 1,
      count,
      x,
      y,
      z,
      mesh: group,
      itemMesh,
    });
  };

  private spawnRandomLoot = (x: number, y: number, z: number, minRarity = 0): void => {
    const pool = ['ar', 'shotgun', 'smg', 'sniper', 'rpg', 'shield_pot', 'slurp', 'medkit'];
    const weights = [0.24, 0.21, 0.2, 0.09, 0.06, 0.08, 0.07, 0.05];
    let r = Math.random();
    let chosen = 'ar';
    for (let i = 0; i < pool.length; i++) {
      if (r < weights[i]) {
        chosen = pool[i];
        break;
      }
      r -= weights[i];
    }
    const rarRoll = Math.random();
    let rarIdx = rarRoll < 0.4 ? 0 : rarRoll < 0.7 ? 1 : rarRoll < 0.88 ? 2 : rarRoll < 0.96 ? 3 : 4;
    rarIdx = Math.max(minRarity, rarIdx);
    this.spawnLoot(chosen, rarIdx, x, y, z);
  };

  // =========================================================================
  // COMBATANT CREATION & BATTLE BUS
  // =========================================================================
  private createPlayer(): Combatant {
    const skinDef = SKINS.find((s) => s.id === this.profile.equippedSkin) || SKINS[0];
    const styleId = this.profile.equippedSkinStyles[skinDef.id];
    const style = skinDef.styles.find((st) => st.id === styleId) || skinDef.styles[0];
    const pickaxeDef = PICKAXES.find((p) => p.id === this.profile.equippedPickaxe) || PICKAXES[0];
    const gliderDef = GLIDERS.find((g) => g.id === this.profile.equippedGlider) || GLIDERS[0];
    const backblingDef = BACKBLINGS.find((b) => b.id === this.profile.equippedBackbling) || BACKBLINGS[0];

    const rig = createCharacterRig(skinDef, style, this.textures.contactShadow, !this.isSoftwareGl, this.textures, {
      pickaxeDef,
      gliderDef,
      backblingDef,
    });
    setRigWeapon(rig, 'ar', RARITY_COLORS.uncommon.hex, this.textures, pickaxeDef);
    this.scene.add(rig.root);

    const sx = STARTER_ISLAND_CENTER.x + (Math.random() - 0.5) * 14;
    const sz = STARTER_ISLAND_CENTER.z + (Math.random() - 0.5) * 14;
    const sy = getTerrainHeight(sx, sz);

    return {
      isPlayer: true,
      isAlly: false,
      teamId: 1,
      name: this.profile.nickname || 'RoyaleHero',
      alive: true,
      x: sx,
      y: sy,
      z: sz,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,
      pitch: -0.1,
      hp: 100,
      maxHp: 100,
      shield: this.profile.perkStartShield ? 100 : 50,
      maxShield: 100,
      wood: this.profile.perkStartWood ? 350 : 180,
      grounded: true,
      gliding: false,
      freefalling: false,
      inBus: false,
      busJumpTime: 0,
      crouching: false,
      sprinting: false,
      aiming: false,
      reloading: false,
      reloadTimer: 0,
      fireCooldown: 0,
      recoilSpread: 0,
      activeSlot: 1,
      inventory: [
        { itemType: 'pickaxe', rarityIdx: 0, ammo: Infinity, count: 1 },
        { itemType: 'ar', rarityIdx: 1, ammo: 30, count: 1 },
        null,
        null,
        null,
      ],
      activeEmoteId: null,
      emoteTimer: 0,
      vehicleId: null,
      aiState: 'roam',
      aiTimer: 0,
      targetPos: new THREE.Vector3(),
      targetEnemy: null,
      strafeDir: 1,
      stuckTimer: 0,
      lastCheckX: sx,
      lastCheckZ: sz,
      allyColor: '#facc15',
      allyMarker: null,
      ramCooldown: 0,
      enemyScanTimer: 0,
      rig,
    };
  }

  private createBot(index: number, isAlly: boolean, allyColor: string, totalBots: number): Combatant {
    const skinDef = SKINS[(index + 1) % SKINS.length];
    const style = skinDef.styles[index % skinDef.styles.length];
    const pickaxeDef = PICKAXES[index % PICKAXES.length];
    const gliderDef = GLIDERS[index % GLIDERS.length];
    const allowShadow = !this.isSoftwareGl && totalBots <= 35;
    const rig = createCharacterRig(skinDef, style, this.textures.contactShadow, allowShadow, this.textures, {
      pickaxeDef,
      gliderDef,
    });
    this.scene.add(rig.root);

    const spawnAng = (index / Math.max(1, totalBots)) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const spawnRad = 6 + Math.random() * 24;
    const sx = STARTER_ISLAND_CENTER.x + Math.cos(spawnAng) * spawnRad;
    const sz = STARTER_ISLAND_CENTER.z + Math.sin(spawnAng) * spawnRad;
    const sy = getTerrainHeight(sx, sz);

    const roamAng = Math.random() * Math.PI * 2;
    const roamRad = 8 + Math.random() * (STARTER_ISLAND_CENTER.radius - 16);
    const starterTarget = new THREE.Vector3(
      STARTER_ISLAND_CENTER.x + Math.cos(roamAng) * roamRad,
      0,
      STARTER_ISLAND_CENTER.z + Math.sin(roamAng) * roamRad
    );

    const starterWeapons = ['ar', 'shotgun', 'smg', 'ar'];
    const wType = starterWeapons[index % starterWeapons.length];
    const rarIdx = Math.random() < 0.4 ? 0 : Math.random() < 0.78 ? 1 : 2;
    const rarId = RARITY_LIST[rarIdx] || 'common';
    setRigWeapon(rig, wType, RARITY_COLORS[rarId].hex, this.textures, pickaxeDef);
    const poi = POIS[index % POIS.length];
    const displayName = getBotDisplayName(index);
    const diff = this.botDifficulty;

    return {
      isPlayer: false,
      isAlly,
      teamId: isAlly ? 1 : index + 10,
      name: isAlly ? `[ALLY] ${displayName}` : displayName,
      alive: true,
      x: sx,
      y: sy,
      z: sz,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      pitch: 0,
      hp: 100,
      maxHp: 100,
      shield: Math.random() < 0.35 + diff.tier * 0.6 ? diff.startShield : 0,
      maxShield: 100,
      wood: diff.startWood,
      grounded: true,
      gliding: false,
      freefalling: false,
      inBus: false,
      busJumpTime: getBusBotJumpProgress(index, totalBots, Math.random()),
      crouching: false,
      sprinting: false,
      aiming: false,
      reloading: false,
      reloadTimer: 0,
      fireCooldown: 0.4 + Math.random() * 0.6,
      recoilSpread: 0,
      activeSlot: 0,
      inventory: [],
      weapon: { itemType: wType, rarityIdx: rarIdx, ammo: WEAPON_DEFS[wType].magSize, count: 1 },
      activeEmoteId: Math.random() < 0.28 ? EMOTES[index % EMOTES.length].id : null,
      emoteTimer: 0,
      vehicleId: null,
      aiState: 'roam',
      aiTimer: 0.6 + Math.random() * 2.4,
      targetPos: starterTarget,
      targetEnemy: null,
      strafeDir: Math.random() < 0.5 ? 1 : -1,
      stuckTimer: 0,
      lastCheckX: sx,
      lastCheckZ: sz,
      allyColor,
      allyMarker: isAlly ? { x: poi.x + (Math.random() - 0.5) * 35, z: poi.z + (Math.random() - 0.5) * 35, label: poi.nameRu, color: allyColor } : null,
      ramCooldown: 0,
      enemyScanTimer: Math.random() * 0.35,
      rig,
    };
  }

  private launchBattleBus(): void {
    this.matchPhase = 'battle_bus';
    this.busActive = true;
    this.sound.playBusHorn();

    const angle = Math.random() * Math.PI * 2;
    const dist = WORLD_RADIUS * 0.92;
    this.busStart.set(Math.cos(angle) * dist, 88, Math.sin(angle) * dist);
    this.busEnd.set(-Math.cos(angle) * dist, 88, -Math.sin(angle) * dist);
    this.busPos.copy(this.busStart);
    this.busProgress = 0;

    this.battleBusMesh.visible = true;
    this.battleBusMesh.position.copy(this.busPos);
    const busHeading = Math.atan2(-(this.busEnd.x - this.busStart.x), -(this.busEnd.z - this.busStart.z));
    this.battleBusMesh.rotation.y = busHeading;

    if (this.player) {
      this.player.inBus = true;
      this.player.activeEmoteId = null;
      this.player.rig.root.visible = false;
      this.player.yaw = busHeading + 0.65;
      this.player.pitch = -0.22;
      this.player.x = this.busPos.x;
      this.player.y = this.busPos.y;
      this.player.z = this.busPos.z;
    }
    this.bots.forEach((bot, idx) => {
      const poi = POIS[idx % POIS.length];
      bot.inBus = true;
      bot.activeEmoteId = null;
      bot.rig.root.visible = false;
      bot.x = this.busPos.x;
      bot.y = this.busPos.y;
      bot.z = this.busPos.z;
      bot.targetPos.set(poi.x + (Math.random() - 0.5) * 52, 0, poi.z + (Math.random() - 0.5) * 52);
    });
  }

  // =========================================================================
  // PHYSICS, COLLISIONS & RAYCASTING
  // =========================================================================
  private resolveEntityPhysics(ent: Combatant, dt: number): void {
    const subSteps = ent.isPlayer ? 2 : 1;
    const subDt = dt / subSteps;

    for (let step = 0; step < subSteps; step++) {
      const grav = ent.gliding ? 5.0 : ent.freefalling ? 16.0 : 28.0;
      ent.vy -= grav * subDt;
      if (ent.gliding && ent.vy < -7.5) ent.vy = -7.5;
      if (ent.freefalling && ent.vy < -32.0) ent.vy = -32.0;

      ent.x += ent.vx * subDt;
      ent.z += ent.vz * subDt;
      ent.y += ent.vy * subDt;

      // Stay on Starter Island during starter_island phase
      if (this.matchPhase === 'starter_island') {
        const dx = ent.x - STARTER_ISLAND_CENTER.x;
        const dz = ent.z - STARTER_ISLAND_CENTER.z;
        const dist = Math.hypot(dx, dz);
        if (dist > STARTER_ISLAND_CENTER.radius - 4) {
          const r = (STARTER_ISLAND_CENTER.radius - 4) / dist;
          ent.x = STARTER_ISLAND_CENTER.x + dx * r;
          ent.z = STARTER_ISLAND_CENTER.z + dz * r;
        }
      } else {
        const distFromOrigin = Math.hypot(ent.x, ent.z);
        if (distFromOrigin > WORLD_RADIUS - 4) {
          const ratio = (WORLD_RADIUS - 4) / distFromOrigin;
          ent.x *= ratio;
          ent.z *= ratio;
        }
      }

      const radius = 0.48;
      const height = ent.crouching ? 1.3 : 1.95;
      let supportY = getTerrainHeight(ent.x, ent.z);

      // Auto-deploy glider when approaching ground from freefall
      if (ent.freefalling && ent.y - supportY < 26) {
        ent.freefalling = false;
        ent.gliding = true;
        ent.rig.gliderGroup.visible = true;
      }

      const skipStructures = (ent.freefalling || ent.gliding) && ent.y - supportY > 22;

      if (!skipStructures) {
        for (let i = 0; i < this.boxColliders.length; i++) {
          const b = this.boxColliders[i];
          if (b.hp <= 0) continue;
          if (ent.x + radius < b.minX || ent.x - radius > b.maxX || ent.z + radius < b.minZ || ent.z - radius > b.maxZ) continue;
          if (ent.y + height > b.minY + 0.05 && ent.y < b.maxY - 0.35) {
            const closestX = Math.max(b.minX, Math.min(ent.x, b.maxX));
            const closestZ = Math.max(b.minZ, Math.min(ent.z, b.maxZ));
            const dx = ent.x - closestX;
            const dz = ent.z - closestZ;
            const distSq = dx * dx + dz * dz;
            if (distSq < radius * radius) {
              const dist = Math.sqrt(distSq);
              if (dist > 0.0001) {
                const push = radius - dist;
                ent.x += (dx / dist) * push;
                ent.z += (dz / dist) * push;
              } else {
                ent.x += radius;
              }
            }
          }
          if (ent.x + radius * 0.6 > b.minX && ent.x - radius * 0.6 < b.maxX && ent.z + radius * 0.6 > b.minZ && ent.z - radius * 0.6 < b.maxZ) {
            if (ent.y >= b.maxY - 0.45 && b.maxY > supportY) supportY = b.maxY;
          }
        }

        for (let i = 0; i < this.rampColliders.length; i++) {
          const r = this.rampColliders[i];
          if (r.hp <= 0) continue;
          if (ent.x >= r.minX - 0.25 && ent.x <= r.maxX + 0.25 && ent.z >= r.minZ - 0.25 && ent.z <= r.maxZ + 0.25) {
            let t = 0;
            if (r.dir === 0) t = (r.maxZ - ent.z) / (r.maxZ - r.minZ);
            else if (r.dir === 1) t = (ent.x - r.minX) / (r.maxX - r.minX);
            else if (r.dir === 2) t = (ent.z - r.minZ) / (r.maxZ - r.minZ);
            else if (r.dir === 3) t = (r.maxX - ent.x) / (r.maxX - r.minX);
            t = Math.max(0, Math.min(1, t));
            const rampSurfaceY = r.baseY + t * (r.topY - r.baseY);
            if (ent.y >= rampSurfaceY - 0.85 && ent.y <= rampSurfaceY + 0.75 && rampSurfaceY > supportY) {
              supportY = rampSurfaceY;
            }
          }
        }

        for (let i = 0; i < this.roofColliders.length; i++) {
          const rc = this.roofColliders[i];
          if (rc.hp <= 0) continue;
          const roofSurfaceY = getRoofSurfaceY(ent.x, ent.z, rc);
          if (roofSurfaceY !== null && ent.y >= roofSurfaceY - 0.9 && ent.y <= roofSurfaceY + 1.0 && roofSurfaceY > supportY) {
            supportY = roofSurfaceY;
          }
        }
      }

      if (ent.y <= supportY) {
        ent.y = supportY;
        ent.vy = 0;
        ent.grounded = true;
        if (ent.gliding || ent.freefalling) {
          ent.gliding = false;
          ent.freefalling = false;
          ent.rig.gliderGroup.visible = false;
          if (ent.isPlayer && this.matchPhase === 'skydiving') {
            this.matchPhase = 'combat';
          }
        }
      } else {
        ent.grounded = false;
      }
    }

    // Launch pads
    for (let i = 0; i < this.launchPads.length; i++) {
      const lp = this.launchPads[i];
      if (Math.hypot(ent.x - lp.x, ent.z - lp.z) < lp.radius && Math.abs(ent.y - lp.y) < 1.3) {
        ent.vy = 28.0;
        ent.y += 0.5;
        ent.grounded = false;
        ent.gliding = true;
        ent.freefalling = false;
        ent.rig.gliderGroup.visible = true;
        if (ent.isPlayer) this.sound.playLaunchPad();
      }
    }
  }

  private intersectRayAABB(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    minX: number, minY: number, minZ: number,
    maxX: number, maxY: number, maxZ: number,
    maxDist: number
  ): number {
    let tmin = 0;
    let tmax = maxDist;
    if (Math.abs(dx) < 1e-6) { if (ox < minX || ox > maxX) return -1; }
    else {
      const inv = 1 / dx;
      let t1 = (minX - ox) * inv; let t2 = (maxX - ox) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }
    if (Math.abs(dy) < 1e-6) { if (oy < minY || oy > maxY) return -1; }
    else {
      const inv = 1 / dy;
      let t1 = (minY - oy) * inv; let t2 = (maxY - oy) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }
    if (Math.abs(dz) < 1e-6) { if (oz < minZ || oz > maxZ) return -1; }
    else {
      const inv = 1 / dz;
      let t1 = (minZ - oz) * inv; let t2 = (maxZ - oz) * inv;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return -1;
    }
    return tmin;
  }

  private traceBullet(
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    maxDist: number,
    shooter: Combatant | null,
    allCombatants: Combatant[]
  ) {
    let bestDist = maxDist;
    let hitType: 'none' | 'box' | 'ramp' | 'roof' | 'terrain' | 'combatant' = 'none';
    let hitTarget: BoxCollider | RampCollider | Combatant | null = null;
    let isHeadshot = false;

    for (let i = 0; i < this.boxColliders.length; i++) {
      const b = this.boxColliders[i];
      if (b.hp <= 0) continue;
      const t = this.intersectRayAABB(ox, oy, oz, dx, dy, dz, b.minX, b.minY, b.minZ, b.maxX, b.maxY, b.maxZ, bestDist);
      if (t >= 0 && t < bestDist) { bestDist = t; hitType = 'box'; hitTarget = b; }
    }

    for (let i = 0; i < this.rampColliders.length; i++) {
      const r = this.rampColliders[i];
      if (r.hp <= 0) continue;
      const t = this.intersectRayAABB(ox, oy, oz, dx, dy, dz, r.minX, r.baseY, r.minZ, r.maxX, r.topY, r.maxZ, bestDist);
      if (t >= 0 && t < bestDist) { bestDist = t; hitType = 'ramp'; hitTarget = r; }
    }

    for (let i = 0; i < this.roofColliders.length; i++) {
      const rc = this.roofColliders[i];
      if (rc.hp <= 0) continue;
      const tEnter = this.intersectRayAABB(ox, oy, oz, dx, dy, dz, rc.minX, rc.baseY, rc.minZ, rc.maxX, rc.topY, rc.maxZ, bestDist);
      if (tEnter >= 0 && tEnter < bestDist) {
        const span = Math.min(bestDist, tEnter + 20);
        for (let td = tEnter; td <= span; td += 0.4) {
          const px = ox + dx * td;
          const py = oy + dy * td;
          const pz = oz + dz * td;
          const ry = getRoofSurfaceY(px, pz, rc);
          if (ry !== null && py <= ry && py >= rc.baseY - 0.35) {
            bestDist = td;
            hitType = 'roof';
            hitTarget = null;
            break;
          }
        }
      }
    }

    const steps = Math.min(140, Math.ceil(bestDist / 1.8));
    for (let s = 1; s <= steps; s++) {
      const d = (s / steps) * bestDist;
      const px = ox + dx * d;
      const py = oy + dy * d;
      const pz = oz + dz * d;
      if (py <= getTerrainHeight(px, pz)) {
        bestDist = d;
        hitType = 'terrain';
        hitTarget = null;
        break;
      }
    }

    for (let i = 0; i < allCombatants.length; i++) {
      const c = allCombatants[i];
      if (!c.alive || c === shooter || c.inBus) continue;
      if (shooter && c.teamId === shooter.teamId) continue;
      const h = c.crouching ? 1.35 : 2.02;
      const t = this.intersectRayAABB(ox, oy, oz, dx, dy, dz, c.x - 0.45, c.y, c.z - 0.45, c.x + 0.45, c.y + h, c.z + 0.45, bestDist);
      if (t >= 0 && t < bestDist) {
        bestDist = t;
        hitType = 'combatant';
        hitTarget = c;
        isHeadshot = oy + dy * t >= c.y + h - 0.44;
      }
    }

    return {
      dist: bestDist,
      hitX: ox + dx * bestDist,
      hitY: oy + dy * bestDist,
      hitZ: oz + dz * bestDist,
      hitType,
      hitTarget,
      isHeadshot,
    };
  }

  // =========================================================================
  // COMBAT, BUILDING & VEHICLE ACTIONS
  // =========================================================================
  private selectSlot(idx: number): void {
    if (!this.player) return;
    this.buildState.active = false;
    this.player.activeSlot = idx;
    this.player.reloading = false;
    this.player.reloadTimer = 0;
  }

  private startReload(ent: Combatant): void {
    const slotItem = ent.isPlayer ? ent.inventory[ent.activeSlot] : ent.weapon;
    if (!slotItem) return;
    const def = WEAPON_DEFS[slotItem.itemType];
    if ((def.type !== 'gun' && def.type !== 'launcher') || ent.reloading || slotItem.ammo >= def.magSize) return;
    ent.reloading = true;
    ent.reloadTimer = def.reloadTime;
    if (ent.isPlayer) this.sound.playReload();
  }

  private applyStructureDamageVisual(struct: { hp: number; maxHp: number; mesh?: THREE.Mesh }): void {
    if (!struct.mesh) return;
    const mat = struct.mesh.material as THREE.MeshLambertMaterial | THREE.MeshStandardMaterial | undefined;
    if (!mat) return;
    mat.transparent = true;
    mat.opacity = getStructureOpacity(struct.hp, struct.maxHp);
    mat.needsUpdate = true;
  }

  private placeBuildStructure(piece: BuildPiece, gx: number, gy: number, gz: number, cardinal: number, owner: Combatant): boolean {
    if (owner.wood < 10) return false;
    owner.wood -= 10;

    if (piece === 'wall') {
      const isZ = cardinal % 2 === 0;
      const w = isZ ? GRID_SIZE : 0.3;
      const d = isZ ? 0.3 : GRID_SIZE;
      const ox = cardinal === 1 ? GRID_SIZE / 2 : cardinal === 3 ? -GRID_SIZE / 2 : 0;
      const oz = cardinal === 0 ? -GRID_SIZE / 2 : cardinal === 2 ? GRID_SIZE / 2 : 0;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, WALL_HEIGHT, d),
        new THREE.MeshLambertMaterial({ color: 0xeab308, map: this.textures.woodPlanks, transparent: true, opacity: 1 })
      );
      mesh.position.set(gx + ox, gy + WALL_HEIGHT / 2, gz + oz);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = true;
      this.worldGroup.add(mesh);
      this.boxColliders.push({
        minX: gx + ox - w / 2,
        maxX: gx + ox + w / 2,
        minY: gy,
        maxY: gy + WALL_HEIGHT,
        minZ: gz + oz - d / 2,
        maxZ: gz + oz + d / 2,
        destructible: true,
        hp: 150,
        maxHp: 150,
        mesh,
        type: 'player_build',
      });
    } else if (piece === 'floor') {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(GRID_SIZE, 0.25, GRID_SIZE),
        new THREE.MeshLambertMaterial({ color: 0xeab308, map: this.textures.woodPlanks, transparent: true, opacity: 1 })
      );
      mesh.position.set(gx, gy + 0.125, gz);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = true;
      this.worldGroup.add(mesh);
      this.boxColliders.push({
        minX: gx - GRID_SIZE / 2,
        maxX: gx + GRID_SIZE / 2,
        minY: gy,
        maxY: gy + 0.25,
        minZ: gz - GRID_SIZE / 2,
        maxZ: gz + GRID_SIZE / 2,
        destructible: true,
        hp: 150,
        maxHp: 150,
        mesh,
        type: 'player_build',
      });
    } else {
      const rampGeo = new THREE.BoxGeometry(GRID_SIZE, 0.25, Math.hypot(GRID_SIZE, WALL_HEIGHT));
      const rampMesh = new THREE.Mesh(
        rampGeo,
        new THREE.MeshLambertMaterial({ color: 0xeab308, map: this.textures.woodPlanks, transparent: true, opacity: 1 })
      );
      rampMesh.rotation.order = 'YXZ';
      rampMesh.position.set(gx, gy + WALL_HEIGHT / 2, gz);
      rampMesh.rotation.y = -cardinal * (Math.PI / 2);
      rampMesh.rotation.x = Math.atan2(WALL_HEIGHT, GRID_SIZE);
      rampMesh.castShadow = !this.isSoftwareGl;
      rampMesh.receiveShadow = true;
      this.worldGroup.add(rampMesh);
      this.rampColliders.push({
        minX: gx - GRID_SIZE / 2,
        maxX: gx + GRID_SIZE / 2,
        minZ: gz - GRID_SIZE / 2,
        maxZ: gz + GRID_SIZE / 2,
        baseY: gy,
        topY: gy + WALL_HEIGHT,
        dir: cardinal,
        hp: 150,
        maxHp: 150,
        mesh: rampMesh,
      });
    }
    return true;
  }

  private handlePrimaryAction(): void {
    if (!this.player || !this.player.alive || this.player.gliding || this.player.freefalling || this.player.inBus || this.player.vehicleId !== null) return;

    if (this.buildState.active) {
      const p = computeBuildGridPlacement(
        this.player.x,
        this.player.y,
        this.player.z,
        this.player.yaw,
        this.buildState.rotStep,
        getTerrainHeight,
        WALL_HEIGHT
      );
      if (this.placeBuildStructure(this.buildState.piece, p.gx, p.gy, p.gz, p.cardinal, this.player)) {
        this.sound.playBuild();
      }
      return;
    }

    const slotItem = this.player.inventory[this.player.activeSlot];
    if (!slotItem) return;
    const def = WEAPON_DEFS[slotItem.itemType];

    if (def.type === 'consumable') {
      const canHealHp = (def.healHp || 0) > 0 && this.player.hp < this.player.maxHp;
      const canHealShield = (def.healShield || 0) > 0 && this.player.shield < this.player.maxShield;
      if (canHealHp || canHealShield) {
        if (def.healHp) this.player.hp = Math.min(this.player.maxHp, this.player.hp + def.healHp);
        if (def.healShield) this.player.shield = Math.min(this.player.maxShield, this.player.shield + def.healShield);
        slotItem.count--;
        if (slotItem.count <= 0) this.player.inventory[this.player.activeSlot] = null;
        this.sound.playPickup();
        const name = this.profile.language === 'ru' ? def.nameRu : def.nameEn;
        this.emitFloatingText(this.player.x, this.player.y + 1.9, this.player.z, `+${name}`, '#4ade80', true);
      }
      return;
    }

    this.fireCombatantWeapon(this.player);
  }

  private fireCombatantWeapon(shooter: Combatant): void {
    if (shooter.fireCooldown > 0 || shooter.reloading || shooter.gliding || shooter.freefalling || shooter.inBus) return;
    const slotItem = shooter.isPlayer ? shooter.inventory[shooter.activeSlot] : shooter.weapon;
    if (!slotItem) return;
    const def = WEAPON_DEFS[slotItem.itemType];
    const rarId = RARITY_LIST[slotItem.rarityIdx] || 'common';
    const rarMult = RARITY_COLORS[rarId].mult;

    if (def.type === 'gun' || def.type === 'launcher') {
      if (slotItem.ammo <= 0) {
        this.startReload(shooter);
        return;
      }
      slotItem.ammo--;
      if (slotItem.ammo === 0) {
        setTimeout(() => {
          if (shooter.alive) this.startReload(shooter);
        }, 120);
      }
    }

    shooter.fireCooldown = def.fireRate;
    shooter.rig.flashTimer = 0.05;
    shooter.rig.muzzleFlash.visible = true;

    const distToPlayer = shooter.isPlayer || !this.player ? 0 : Math.hypot(shooter.x - this.player.x, shooter.z - this.player.z);
    if (def.type === 'gun' || def.type === 'launcher') {
      this.sound.playShoot(def.id, distToPlayer);
    }

    if (shooter.isPlayer) {
      this.cameraTrauma = Math.min(0.45, this.cameraTrauma + (def.id === 'shotgun' || def.id === 'rpg' ? 0.25 : 0.08));
    }

    const allCombatants = this.player ? [this.player, ...this.bots] : this.bots;

    if (shooter.isPlayer) {
      this.camera.getWorldPosition(_v1);
      this.camera.getWorldDirection(_v2);
      const aimTrace = this.traceBullet(_v1.x, _v1.y, _v1.z, _v2.x, _v2.y, _v2.z, def.range, shooter, allCombatants);
      _v3.set(aimTrace.hitX, aimTrace.hitY, aimTrace.hitZ);
      shooter.rig.muzzleFlash.getWorldPosition(_v1);
      _v2.subVectors(_v3, _v1).normalize();
      shooter.recoilSpread = Math.min(0.05, shooter.recoilSpread + 0.008);
    } else {
      _v1.set(shooter.x, shooter.y + 1.45, shooter.z);
      _v2.set(
        -Math.sin(shooter.yaw) * Math.cos(shooter.pitch),
        Math.sin(shooter.pitch),
        -Math.cos(shooter.yaw) * Math.cos(shooter.pitch)
      ).normalize();
    }

    if (def.type === 'launcher') {
      const rMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      rMesh.position.copy(_v1);
      this.scene.add(rMesh);
      this.rockets.push({
        mesh: rMesh,
        x: _v1.x,
        y: _v1.y,
        z: _v1.z,
        vx: _v2.x * 48,
        vy: _v2.y * 48,
        vz: _v2.z * 48,
        damage: def.damage * rarMult,
        shooter,
        life: 4.5,
      });
      return;
    }

    const pellets = def.pellets || 1;
    const baseSpread = def.spread * (shooter.aiming ? 0.45 : 1.0) * (shooter.crouching ? 0.75 : 1.0) + (shooter.recoilSpread || 0);

    for (let p = 0; p < pellets; p++) {
      _v3.copy(_v2);
      _v3.x += (Math.random() - 0.5) * baseSpread;
      _v3.y += (Math.random() - 0.5) * baseSpread;
      _v3.z += (Math.random() - 0.5) * baseSpread;
      _v3.normalize();

      const res = this.traceBullet(_v1.x, _v1.y, _v1.z, _v3.x, _v3.y, _v3.z, def.range, shooter, allCombatants);

      if (def.type === 'gun') {
        this.spawnTracer(_v1.x, _v1.y, _v1.z, res.hitX, res.hitY, res.hitZ);
      }

      if (res.hitType === 'combatant' && res.hitTarget) {
        if (this.matchPhase !== 'starter_island') {
          this.applyDamage(res.hitTarget as Combatant, def.damage * rarMult, shooter, res.isHeadshot);
        }
        this.spawnImpactParticles(res.hitX, res.hitY, res.hitZ, 0xef4444, 6);
      } else if ((res.hitType === 'box' || res.hitType === 'ramp') && res.hitTarget) {
        const struct = res.hitTarget as BoxCollider | RampCollider;
        if ('destructible' in struct && struct.destructible) {
          this.damageStructure(struct, def.type === 'melee' ? 42 : def.damage * 0.75, shooter);
          if (def.type === 'melee' && shooter.isPlayer) this.sound.playBuild();
        } else if (!('destructible' in struct) && struct.hp < 9000) {
          struct.hp -= def.type === 'melee' ? 42 : def.damage * 0.75;
          if (struct.hp <= 0 && struct.mesh) {
            this.worldGroup.remove(struct.mesh);
          } else {
            this.applyStructureDamageVisual(struct);
          }
        }
        this.spawnImpactParticles(res.hitX, res.hitY, res.hitZ, 0xfbbf24, 4);
      } else if (res.hitType === 'roof') {
        this.spawnImpactParticles(res.hitX, res.hitY, res.hitZ, 0xfbbf24, 4);
      } else if (res.hitType === 'terrain') {
        this.spawnImpactParticles(res.hitX, res.hitY, res.hitZ, 0x86efac, 3);
      }
    }
  }

  private buildBotCover(bot: Combatant, enemy: Combatant | null): void {
    if (!canBotBuildCover(bot)) return;
    if (enemy) {
      bot.yaw = Math.atan2(-(enemy.x - bot.x), -(enemy.z - bot.z));
    }
    const p = computeBuildGridPlacement(bot.x, bot.y, bot.z, bot.yaw, 0, getTerrainHeight, WALL_HEIGHT);
    const placedWall = this.placeBuildStructure('wall', p.gx, p.gy, p.gz, p.cardinal, bot);
    if (placedWall && bot.wood >= 10 && Math.random() < this.botDifficulty.rampChance) {
      this.placeBuildStructure('ramp', p.gx, p.gy, p.gz, p.cardinal, bot);
    }
    if (bot.wood >= 20 && Math.random() < this.botDifficulty.boxChance) {
      this.placeBuildStructure('wall', p.gx, p.gy, p.gz, (p.cardinal + 1) & 3, bot);
      this.placeBuildStructure('wall', p.gx, p.gy, p.gz, (p.cardinal + 3) & 3, bot);
    }
  }

  private applyDamage(target: Combatant, rawDamage: number, attacker: Combatant | null, isHeadshot: boolean): void {
    if (!target.alive || this.matchPhase === 'starter_island') return;
    const res = applyDamageMath(target.hp, target.shield, rawDamage, isHeadshot);
    target.shield = res.newShield;
    target.hp = res.newHp;

    if (attacker && attacker.isPlayer) {
      this.matchStats.damage += res.totalDealt;
      this.emitFloatingText(
        target.x,
        target.y + 1.85,
        target.z,
        String(Math.round(res.totalDealt)),
        isHeadshot ? '#facc15' : res.shieldLoss > 0 && res.hpLoss === 0 ? '#38bdf8' : '#ffffff',
        isHeadshot
      );
      this.callbacks.onHitmarker();
      this.sound.playHit(res.shieldLoss > 0 && res.hpLoss === 0, target.hp <= 0);
      if (target.hp <= 0) {
        this.hitstopTimer = 0.05;
        this.cameraTrauma = Math.min(0.6, this.cameraTrauma + 0.3);
      }
    }

    if (target.isPlayer) {
      this.callbacks.onDamageVignette();
      this.cameraTrauma = Math.min(0.6, this.cameraTrauma + 0.25);
    } else if (attacker && target.alive && target.teamId !== attacker.teamId) {
      target.targetEnemy = attacker;
      target.aiState = 'combat';
      if (canBotBuildCover(target) && Math.random() < this.botDifficulty.wallChance) {
        this.buildBotCover(target, attacker);
      }
    }

    if (target.hp <= 0) {
      this.eliminateCombatant(target, attacker);
    }
  }

  private eliminateCombatant(victim: Combatant, killer: Combatant | null): void {
    if (!victim.alive) return;
    victim.alive = false;
    victim.rig.root.visible = false;

    if (victim.vehicleId !== null) {
      const veh = this.vehicles.find((v) => v.id === victim.vehicleId);
      if (veh) veh.driver = null;
      victim.vehicleId = null;
    }

    if (victim.isPlayer) {
      for (const item of victim.inventory) {
        if (item && item.itemType !== 'pickaxe') {
          this.spawnLoot(item.itemType, item.rarityIdx, victim.x + (Math.random() - 0.5) * 2, victim.y, victim.z + (Math.random() - 0.5) * 2);
        }
      }
    } else if (victim.weapon) {
      this.spawnLoot(victim.weapon.itemType, victim.weapon.rarityIdx, victim.x, victim.y, victim.z);
      this.spawnLoot('token_drop', 4, victim.x + 0.7, victim.y, victim.z + 0.5, 5, 5);
    }

    const killerName = killer ? killer.name : this.profile.language === 'ru' ? 'Буря' : 'The Storm';
    const elimWord = this.profile.language === 'ru' ? 'устранил' : 'eliminated';
    this.callbacks.onKillFeed(`${killerName} ${elimWord} ${victim.name}`);

    if (killer && killer.isPlayer) {
      this.matchStats.kills++;
    }

    const aliveEnemies = this.bots.filter((b) => b.alive && !b.isAlly).length;
    const aliveAllies = this.bots.filter((b) => b.alive && b.isAlly).length;
    const aliveTotal = (this.player?.alive ? 1 : 0) + aliveEnemies + aliveAllies;

    if (victim.isPlayer) {
      this.finishMatch(false, aliveTotal + 1);
    } else if (aliveEnemies === 0 && this.player?.alive) {
      this.finishMatch(true, 1);
    }
  }

  private damageStructure(target: BoxCollider, dmg: number, harvester: Combatant | null): void {
    target.hp -= dmg;
    if (target.hp <= 0) {
      if (target.isSlurpBarrel) {
        const cx = (target.minX + target.maxX) / 2;
        const cz = (target.minZ + target.maxZ) / 2;
        this.spawnImpactParticles(cx, target.minY + 0.6, cz, 0x38bdf8, 12);
        if (harvester) {
          harvester.hp = Math.min(harvester.maxHp, harvester.hp + 20);
          harvester.shield = Math.min(harvester.maxShield, harvester.shield + 25);
          if (harvester.isPlayer) {
            this.sound.playPickup();
            this.emitFloatingText(harvester.x, harvester.y + 1.9, harvester.z, '+25 SLURP', '#38bdf8', true);
          }
        }
        if (target.mesh) this.worldGroup.remove(target.mesh);
      } else if (target.isTree && this.treeTrunkInst && this.treeLeavesInst && target.instanceId !== undefined) {
        _dummy.position.set(0, -500, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.treeTrunkInst.setMatrixAt(target.instanceId, _dummy.matrix);
        this.treeLeavesInst.setMatrixAt(target.instanceId, _dummy.matrix);
        this.treeTrunkInst.instanceMatrix.needsUpdate = true;
        this.treeLeavesInst.instanceMatrix.needsUpdate = true;
        if (harvester) harvester.wood += target.woodYield || 40;
      } else if (target.isRock && this.rockInst && target.instanceId !== undefined) {
        _dummy.position.set(0, -500, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        this.rockInst.setMatrixAt(target.instanceId, _dummy.matrix);
        this.rockInst.instanceMatrix.needsUpdate = true;
        if (harvester) harvester.wood += target.woodYield || 30;
      } else if (target.mesh) {
        this.worldGroup.remove(target.mesh);
      }
    } else {
      this.applyStructureDamageVisual(target);
      if (target.isTree && harvester) {
        harvester.wood += 10;
      }
    }
  }

  private tryInteract(): void {
    if (!this.player || !this.player.alive) return;

    // 1. Exit vehicle if driving
    if (this.player.vehicleId !== null) {
      const veh = this.vehicles.find((v) => v.id === this.player!.vehicleId);
      if (veh) {
        veh.lastDriver = this.player;
        veh.lastDriverTimer = 2.0;
        veh.driver = null;
        this.player.vehicleId = null;
        this.player.x = veh.x + Math.cos(veh.yaw) * 2.4;
        this.player.z = veh.z - Math.sin(veh.yaw) * 2.4;
        this.player.y = getTerrainHeight(this.player.x, this.player.z) + 0.2;
        this.player.rig.root.visible = true;
        this.sound.playPickup();
      }
      return;
    }

    // 2. Enter nearby vehicle
    for (const veh of this.vehicles) {
      if (veh.hp > 0 && !veh.driver && Math.hypot(veh.x - this.player.x, veh.z - this.player.z) < 4.2 && Math.abs(veh.y - this.player.y) < 3.0) {
        veh.driver = this.player;
        veh.lastDriver = this.player;
        veh.lastDriverTimer = 2.0;
        this.player.vehicleId = veh.id;
        this.player.aiming = false;
        this.buildState.active = false;
        this.player.activeEmoteId = null;
        this.player.rig.root.visible = false;
        this.profile.stats.vehiclesDriven++;
        this.sound.playPickup();
        return;
      }
    }

    // 3. Open Chests
    for (const ch of this.chests) {
      if (!ch.opened && Math.hypot(ch.x - this.player.x, ch.z - this.player.z) < 3.5 && Math.abs(ch.y - this.player.y) < 2.6) {
        ch.opened = true;
        ch.lidPivot.rotation.x = -1.15;
        ch.beacon.visible = false;
        if (ch.tokenOrb) ch.tokenOrb.visible = false;
        this.sound.playChestOpen(ch.isTokenChest);

        if (ch.isTokenChest) {
          const bonus = 20;
          this.matchStats.tokensEarned += bonus;
          this.profile.tokens += bonus;
          this.profile.stats.chestsOpened++;
          this.callbacks.onTokensChanged(bonus, true);
          this.emitFloatingText(ch.x, ch.y + 1.6, ch.z, `+${bonus} TOKENS!`, '#facc15', true);
          this.spawnImpactParticles(ch.x, ch.y + 1.0, ch.z, 0x38bdf8, 16);
          this.spawnRandomLoot(ch.x + 0.9, ch.y, ch.z + 0.6, 3);
          this.spawnLoot('slurp', 3, ch.x - 0.8, ch.y, ch.z + 0.6, 1, 2);
          this.player.wood += 80;
        } else {
          this.profile.stats.chestsOpened++;
          this.callbacks.onTokensChanged(0, true);
          this.spawnImpactParticles(ch.x, ch.y + 1.0, ch.z, 0xfacc15, 10);
          this.spawnRandomLoot(ch.x + 0.9, ch.y, ch.z + 0.6, 1);
          this.spawnLoot('shield_pot', 2, ch.x - 0.8, ch.y, ch.z + 0.6);
          this.player.wood += 40;
        }
        return;
      }
    }

    // 4. Pick up Ground Loot
    let nearest: LootDrop | null = null;
    let bestD = 3.5;
    for (const item of this.lootItems) {
      const d = Math.hypot(item.x - this.player.x, item.z - this.player.z);
      if (d < bestD && Math.abs(item.y - this.player.y) < 2.4) {
        bestD = d;
        nearest = item;
      }
    }
    if (!nearest) return;

    if (nearest.itemType === 'token_drop') {
      const amt = nearest.count || 5;
      this.matchStats.tokensEarned += amt;
      this.profile.tokens += amt;
      this.callbacks.onTokensChanged(amt, false);
      this.sound.playChestOpen(false);
      this.emitFloatingText(this.player.x, this.player.y + 1.9, this.player.z, `+${amt} TOKENS`, '#38bdf8', true);
      this.worldGroup.remove(nearest.mesh);
      this.lootItems = this.lootItems.filter((l) => l.id !== nearest!.id);
      return;
    }

    const def = WEAPON_DEFS[nearest.itemType];
    if (def.type === 'consumable') {
      for (let s = 1; s < 5; s++) {
        const inv = this.player.inventory[s];
        if (inv && inv.itemType === nearest.itemType && inv.count < (def.maxStack || 3)) {
          inv.count += nearest.count || 1;
          this.worldGroup.remove(nearest.mesh);
          this.lootItems = this.lootItems.filter((l) => l.id !== nearest!.id);
          this.sound.playPickup();
          return;
        }
      }
    }

    let targetSlot = -1;
    for (let s = 1; s < 5; s++) {
      if (!this.player.inventory[s]) {
        targetSlot = s;
        break;
      }
    }
    if (targetSlot === -1) {
      targetSlot = this.player.activeSlot === 0 ? 1 : this.player.activeSlot;
      const old = this.player.inventory[targetSlot];
      if (old) this.spawnLoot(old.itemType, old.rarityIdx, this.player.x, this.player.y, this.player.z, old.ammo, old.count);
    }

    this.player.inventory[targetSlot] = {
      itemType: nearest.itemType,
      rarityIdx: nearest.rarityIdx,
      ammo: nearest.ammo,
      count: nearest.count || 1,
    };
    this.worldGroup.remove(nearest.mesh);
    this.lootItems = this.lootItems.filter((l) => l.id !== nearest!.id);
    this.sound.playPickup();
    this.selectSlot(targetSlot);
  }

  // =========================================================================
  // VEHICLES, BOTS & STORM UPDATES
  // =========================================================================
  private updateVehicles(dt: number): void {
    const allCombatants = this.player ? [this.player, ...this.bots] : this.bots;
    for (let i = 0; i < allCombatants.length; i++) {
      if (allCombatants[i].ramCooldown > 0) {
        allCombatants[i].ramCooldown = Math.max(0, allCombatants[i].ramCooldown - dt);
      }
    }

    for (const veh of this.vehicles) {
      if (veh.hp <= 0) continue;
      const mDef = VEHICLE_MODELS.find((m) => m.id === veh.type) || VEHICLE_MODELS[0];

      if (veh.driver) {
        veh.lastDriver = veh.driver;
        veh.lastDriverTimer = 2.0;
      } else if (veh.lastDriverTimer > 0) {
        veh.lastDriverTimer = Math.max(0, veh.lastDriverTimer - dt);
        if (veh.lastDriverTimer <= 0) veh.lastDriver = null;
      }

      if (veh.driver && veh.driver.isPlayer) {
        const forward = (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0) - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
        const steer = (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0) - (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0);
        const boosting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && veh.boost > 2 && forward > 0;
        const braking = this.keys.has('Space');

        if (boosting) {
          veh.boost = Math.max(0, veh.boost - dt * 28);
        } else {
          veh.boost = Math.min(100, veh.boost + dt * 10);
        }

        const topSpeed = boosting ? mDef.boostSpeed : mDef.maxSpeed;
        if (braking) {
          veh.speed *= Math.max(0, 1 - dt * 5.5);
        } else if (forward !== 0) {
          veh.speed += forward * (boosting ? mDef.accel * 1.6 : mDef.accel) * dt;
        } else {
          veh.speed *= Math.max(0, 1 - dt * 2.2);
        }
        veh.speed = Math.max(-mDef.maxSpeed * 0.45, Math.min(topSpeed, veh.speed));

        if (Math.abs(veh.speed) > 0.6) {
          const dirSign = veh.speed >= 0 ? 1 : -1;
          veh.yaw += steer * mDef.turnRate * dirSign * dt;
        }

        veh.rig.flames.forEach((f) => {
          f.visible = boosting;
          if (boosting) f.scale.y = 0.8 + Math.random() * 0.6;
        });
      } else {
        veh.speed *= Math.max(0, 1 - dt * 3.0);
        veh.rig.flames.forEach((f) => (f.visible = false));
      }

      if (Math.abs(veh.speed) > 0.1) {
        const nextX = veh.x - Math.sin(veh.yaw) * veh.speed * dt;
        const nextZ = veh.z - Math.cos(veh.yaw) * veh.speed * dt;
        const dist = Math.hypot(nextX, nextZ);
        if (dist < WORLD_RADIUS - 8) {
          veh.x = nextX;
          veh.z = nextZ;
        } else {
          veh.speed *= -0.3;
        }

        // Spin wheels
        const wheelRot = (veh.speed * dt) / 0.45;
        veh.rig.wheels.forEach((w) => {
          w.rotation.x -= wheelRot;
        });

        // Oriented vehicle bumper collision & speed-scaled ramming damage
        const fx = -Math.sin(veh.yaw);
        const fz = -Math.cos(veh.yaw);
        const rx = Math.cos(veh.yaw);
        const rz = -Math.sin(veh.yaw);
        const attacker = veh.driver || (veh.lastDriverTimer > 0 ? veh.lastDriver : null);
        const dmg = attacker ? computeVehicleImpactDamage(veh.speed) : 0;

        for (const c of allCombatants) {
          if (!c.alive || c === veh.driver || c.inBus || c.vehicleId !== null) continue;
          const dx = c.x - veh.x;
          const dz = c.z - veh.z;
          const localFwd = dx * fx + dz * fz;
          const localSide = dx * rx + dz * rz;
          if (
            Math.abs(localFwd) < 2.85 + Math.abs(veh.speed) * dt &&
            Math.abs(localSide) < 1.55 &&
            Math.abs(c.y - veh.y) < 2.4
          ) {
            const sideSign = localSide >= 0 ? 1 : -1;
            const fwdDir = veh.speed >= 0 ? 1 : -1;
            // Push out laterally & forward so characters never clip through cars
            c.x += rx * sideSign * 0.9 + fx * fwdDir * 0.65;
            c.z += rz * sideSign * 0.9 + fz * fwdDir * 0.65;

            if (attacker && c.teamId !== attacker.teamId && dmg > 0 && c.ramCooldown <= 0) {
              this.applyDamage(c, dmg, attacker, false);
              c.ramCooldown = 0.45;
              c.vy = 7.5 + Math.min(4.5, Math.abs(veh.speed) * 0.12);
              c.y += 0.25;
              c.grounded = false;
              c.x += rx * sideSign * 1.15 + fx * fwdDir * 1.45;
              c.z += rz * sideSign * 1.15 + fz * fwdDir * 1.45;
              this.spawnImpactParticles(c.x, c.y + 1.1, c.z, 0xfacc15, 8);
              if (attacker.isPlayer) {
                this.cameraTrauma = Math.min(0.45, this.cameraTrauma + 0.16);
              }
              veh.speed *= 0.86;
            }
          }
        }
      }

      const groundY = getTerrainHeight(veh.x, veh.z);
      veh.y = groundY;
      veh.rig.root.position.set(veh.x, veh.y, veh.z);
      veh.rig.root.rotation.y = veh.yaw;

      // Tilt vehicle slightly to match terrain slope
      const hAhead = getTerrainHeight(veh.x - Math.sin(veh.yaw) * 1.5, veh.z - Math.cos(veh.yaw) * 1.5);
      const hBehind = getTerrainHeight(veh.x + Math.sin(veh.yaw) * 1.5, veh.z + Math.cos(veh.yaw) * 1.5);
      veh.rig.chassisGroup.rotation.x = THREE.MathUtils.clamp(Math.atan2(hAhead - hBehind, 3.0), -0.45, 0.45);

      if (veh.driver) {
        veh.driver.x = veh.x;
        veh.driver.y = veh.y + 0.5;
        veh.driver.z = veh.z;
        veh.driver.yaw = veh.yaw;
      }
    }
  }

  private updateBots(dt: number): void {
    this.simFrame++;
    const allCombatants = this.player ? [this.player, ...this.bots] : this.bots;
    const camX = this.player ? this.player.x : this.camera.position.x;
    const camZ = this.player ? this.player.z : this.camera.position.z;

    for (let idx = 0; idx < this.bots.length; idx++) {
      const bot = this.bots[idx];
      if (!bot.alive) continue;

      if (bot.inBus) {
        if (this.busActive && this.busProgress >= bot.busJumpTime) {
          bot.inBus = false;
          bot.x = this.busPos.x + (Math.random() - 0.5) * 9;
          bot.y = this.busPos.y - 4;
          bot.z = this.busPos.z + (Math.random() - 0.5) * 9;
          bot.vy = -12;
          bot.freefalling = true;
          bot.rig.root.visible = true;
        }
        continue;
      }

      const distToCam = Math.hypot(bot.x - camX, bot.z - camZ);
      bot.rig.shadowDisc.visible = distToCam < 85 && bot.grounded;

      if (bot.fireCooldown > 0) bot.fireCooldown -= dt;
      if (bot.reloading && bot.weapon) {
        bot.reloadTimer -= dt;
        if (bot.reloadTimer <= 0) {
          bot.reloading = false;
          bot.weapon.ammo = WEAPON_DEFS[bot.weapon.itemType].magSize;
        }
      }

      if (bot.freefalling || bot.gliding) {
        const dx = bot.targetPos.x - bot.x;
        const dz = bot.targetPos.z - bot.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 2) {
          bot.yaw = Math.atan2(-dx, -dz);
          bot.vx = -Math.sin(bot.yaw) * 16;
          bot.vz = -Math.cos(bot.yaw) * 16;
        }
        this.resolveEntityPhysics(bot, dt);
        if (shouldBotAnimateThisFrame(distToCam, this.simFrame, idx)) {
          animateCharacterPose(bot.rig, dt, {
            vx: bot.vx,
            vz: bot.vz,
            grounded: bot.grounded,
            gliding: bot.gliding,
            freefalling: bot.freefalling,
            crouching: false,
            pitch: 0,
            emoteId: null,
            weaponType: bot.weapon?.itemType || 'ar',
          });
        }
        bot.rig.root.position.set(bot.x, bot.y, bot.z);
        bot.rig.root.rotation.y = bot.yaw;
        continue;
      }

      // On Starter Island bots scatter in all directions and dance playfully
      if (this.matchPhase === 'starter_island') {
        bot.aiTimer -= dt;
        if (bot.aiTimer <= 0) {
          bot.aiTimer = 1.8 + Math.random() * 2.8;
          const ang = Math.random() * Math.PI * 2;
          const rad = 8 + Math.random() * (STARTER_ISLAND_CENTER.radius - 14);
          bot.targetPos.set(
            STARTER_ISLAND_CENTER.x + Math.cos(ang) * rad,
            0,
            STARTER_ISLAND_CENTER.z + Math.sin(ang) * rad
          );
          bot.activeEmoteId = Math.random() < 0.35 ? EMOTES[Math.floor(Math.random() * EMOTES.length)].id : null;
        }
      } else {
        let closestEnemy: Combatant | null = null;
        const maxScanDist = 82 + this.botDifficulty.tier * 28;
        bot.enemyScanTimer -= dt;
        if (bot.enemyScanTimer <= 0) {
          bot.enemyScanTimer = 0.28 + (idx % 5) * 0.04;
          let closestDist = maxScanDist;
          for (let j = 0; j < allCombatants.length; j++) {
            const other = allCombatants[j];
            if (!other.alive || other === bot || other.teamId === bot.teamId || other.inBus) continue;
            const dx = other.x - bot.x;
            const dz = other.z - bot.z;
            if (Math.abs(dx) > closestDist || Math.abs(dz) > closestDist) continue;
            const d = Math.hypot(dx, dz);
            if (d < closestDist) {
              closestDist = d;
              closestEnemy = other;
            }
          }
          bot.targetEnemy = closestEnemy;
        } else if (
          bot.targetEnemy &&
          bot.targetEnemy.alive &&
          !bot.targetEnemy.inBus &&
          Math.hypot(bot.targetEnemy.x - bot.x, bot.targetEnemy.z - bot.z) < 115
        ) {
          closestEnemy = bot.targetEnemy;
        } else {
          bot.targetEnemy = null;
        }

        const inStorm = Math.hypot(bot.x - this.storm.x, bot.z - this.storm.z) > this.storm.radius - 10;
        if (inStorm) {
          bot.aiState = 'flee_storm';
          bot.targetPos.set(this.storm.nextX, 0, this.storm.nextZ);
        } else if (closestEnemy) {
          bot.aiState = 'combat';
          bot.targetEnemy = closestEnemy;
        } else if (bot.isAlly && this.player && this.player.alive && Math.hypot(this.player.x - bot.x, this.player.z - bot.z) > 22) {
          bot.aiState = 'roam';
          bot.targetPos.set(this.player.x + (Math.random() - 0.5) * 10, 0, this.player.z + (Math.random() - 0.5) * 10);
        } else {
          bot.aiState = 'roam';
          bot.aiTimer -= dt;
          if (bot.aiTimer <= 0) {
            bot.aiTimer = 2.5 + Math.random() * 3.5;
            const ang = Math.random() * Math.PI * 2;
            const rad = Math.random() * Math.max(20, this.storm.radius * 0.72);
            bot.targetPos.set(this.storm.x + Math.cos(ang) * rad, 0, this.storm.z + Math.sin(ang) * rad);
          }
        }
      }

      let moveX = 0;
      let moveZ = 0;
      const speed = this.botDifficulty.moveSpeed;

      if (bot.aiState === 'combat' && bot.targetEnemy && bot.targetEnemy.alive && this.matchPhase !== 'starter_island') {
        bot.activeEmoteId = null;
        const dx = bot.targetEnemy.x - bot.x;
        const dz = bot.targetEnemy.z - bot.z;
        const dist = Math.hypot(dx, dz);
        bot.yaw = Math.atan2(-dx, -dz);
        const dy = bot.targetEnemy.y + 1.3 - (bot.y + 1.45);
        bot.pitch = Math.atan2(dy, Math.max(1, dist));

        const wId = bot.weapon ? bot.weapon.itemType : 'ar';
        const idealDist = wId === 'shotgun' ? 11 : wId === 'sniper' ? 42 : 22;
        const forward = dist > idealDist + 4 ? 1 : dist < idealDist - 4 ? -0.6 : 0;
        const strafe = bot.strafeDir * (0.7 + this.botDifficulty.tier * 0.35);
        const fx = -Math.sin(bot.yaw);
        const fz = -Math.cos(bot.yaw);
        const rx = Math.cos(bot.yaw);
        const rz = -Math.sin(bot.yaw);

        moveX = (fx * forward + rx * strafe) * speed;
        moveZ = (fz * forward + rz * strafe) * speed;

        if (Math.random() < 0.015 + this.botDifficulty.tier * 0.025) bot.strafeDir *= -1;
        if (bot.grounded && Math.random() < 0.018 + this.botDifficulty.tier * 0.022) bot.vy = 10.8;

        // Proactive tactical building in Ranked / Tournament combat (strictly grounded)
        bot.aiTimer -= dt;
        if (canBotBuildCover(bot) && bot.aiTimer <= 0) {
          bot.aiTimer = 1.6 + (1 - this.botDifficulty.tier) * 2.4 + Math.random();
          if (Math.random() < this.botDifficulty.wallChance * 0.65 || (bot.hp + bot.shield < 95 && Math.random() < this.botDifficulty.wallChance)) {
            this.buildBotCover(bot, bot.targetEnemy);
          }
        }

        if (dist < WEAPON_DEFS[wId].range && bot.fireCooldown <= 0) {
          const origYaw = bot.yaw;
          const origPitch = bot.pitch;
          bot.yaw += (Math.random() - 0.5) * this.botDifficulty.aimJitter;
          bot.pitch += (Math.random() - 0.5) * this.botDifficulty.aimJitter * 0.72;
          this.fireCombatantWeapon(bot);
          bot.fireCooldown *= this.botDifficulty.fireDelayMult;
          bot.yaw = origYaw;
          bot.pitch = origPitch;
        }
      } else if (!bot.activeEmoteId) {
        const dx = bot.targetPos.x - bot.x;
        const dz = bot.targetPos.z - bot.z;
        if (Math.hypot(dx, dz) > 2.2) {
          bot.yaw = Math.atan2(-dx, -dz);
          moveX = -Math.sin(bot.yaw) * speed;
          moveZ = -Math.cos(bot.yaw) * speed;
        }
      }

      bot.stuckTimer += dt;
      if (bot.stuckTimer >= 0.8) {
        if (Math.hypot(bot.x - bot.lastCheckX, bot.z - bot.lastCheckZ) < 0.8 && Math.hypot(moveX, moveZ) > 1.0) {
          if (bot.grounded) bot.vy = 11.0;
          if (this.matchPhase === 'starter_island') {
            const ang = Math.random() * Math.PI * 2;
            const rad = 8 + Math.random() * (STARTER_ISLAND_CENTER.radius - 14);
            bot.targetPos.set(STARTER_ISLAND_CENTER.x + Math.cos(ang) * rad, 0, STARTER_ISLAND_CENTER.z + Math.sin(ang) * rad);
          } else {
            const ang = Math.random() * Math.PI * 2;
            bot.targetPos.set(bot.x + Math.cos(ang) * 25, 0, bot.z + Math.sin(ang) * 25);
          }
        }
        bot.lastCheckX = bot.x;
        bot.lastCheckZ = bot.z;
        bot.stuckTimer = 0;
      }

      bot.vx = moveX;
      bot.vz = moveZ;
      this.resolveEntityPhysics(bot, dt);
      bot.rig.root.position.set(bot.x, bot.y, bot.z);
      bot.rig.root.rotation.y = bot.yaw;
      if (shouldBotAnimateThisFrame(distToCam, this.simFrame, idx)) {
        animateCharacterPose(bot.rig, dt, {
          vx: bot.vx,
          vz: bot.vz,
          grounded: bot.grounded,
          gliding: bot.gliding,
          freefalling: bot.freefalling,
          crouching: bot.crouching,
          pitch: bot.pitch,
          emoteId: bot.activeEmoteId,
          sprinting: bot.aiState !== 'combat' && Math.hypot(bot.vx, bot.vz) > 6.5,
          aiming: bot.aiState === 'combat' && !bot.reloading,
          weaponType: bot.weapon?.itemType || 'ar',
        });
      }
    }
  }

  private resetStorm(): void {
    this.storm.x = 0;
    this.storm.z = 0;
    this.storm.radius = WORLD_RADIUS * 1.04;
    this.storm.nextX = (Math.random() - 0.5) * 85;
    this.storm.nextZ = (Math.random() - 0.5) * 85;
    this.storm.nextRadius = WORLD_RADIUS * 0.58;
    this.storm.phase = 1;
    this.storm.timer = 40;
    this.storm.shrinking = false;
    this.storm.dps = 2;
  }

  private updateStorm(dt: number, allCombatants: Combatant[]): void {
    if (this.matchPhase === 'starter_island' || this.matchPhase === 'battle_bus') return;
    this.storm.timer -= dt;
    if (this.storm.timer <= 0) {
      if (!this.storm.shrinking) {
        this.storm.shrinking = true;
        this.storm.timer = 26;
      } else {
        this.storm.shrinking = false;
        this.storm.phase++;
        this.storm.timer = 30;
        this.storm.dps = Math.min(14, this.storm.phase * 2);
        this.storm.x = this.storm.nextX;
        this.storm.z = this.storm.nextZ;
        this.storm.radius = this.storm.nextRadius;
        this.storm.nextRadius = Math.max(16, this.storm.radius * 0.52);
        const shift = this.storm.radius * 0.35;
        this.storm.nextX = this.storm.x + (Math.random() - 0.5) * shift;
        this.storm.nextZ = this.storm.z + (Math.random() - 0.5) * shift;
      }
    }

    if (this.storm.shrinking) {
      const rate = dt / Math.max(0.5, this.storm.timer + dt);
      this.storm.x += (this.storm.nextX - this.storm.x) * rate;
      this.storm.z += (this.storm.nextZ - this.storm.z) * rate;
      this.storm.radius += (this.storm.nextRadius - this.storm.radius) * rate;
    }

    if (this.storm.mesh) {
      this.storm.mesh.position.set(this.storm.x, 65, this.storm.z);
      this.storm.mesh.scale.set(this.storm.radius, 1, this.storm.radius);
    }

    this.storm.tickAccum += dt;
    if (this.storm.tickAccum >= 1.0) {
      this.storm.tickAccum -= 1.0;
      for (const c of allCombatants) {
        if (!c.alive || c.inBus) continue;
        if (Math.hypot(c.x - this.storm.x, c.z - this.storm.z) > this.storm.radius) {
          this.applyDamage(c, this.storm.dps, null, false);
        }
      }
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;
    if (!p || !p.alive) return;

    const held = p.inventory[p.activeSlot];
    const pickaxeDef = PICKAXES.find((pk) => pk.id === this.profile.equippedPickaxe) || PICKAXES[0];
    if (held) {
      const rarHex = RARITY_COLORS[RARITY_LIST[held.rarityIdx] || 'common'].hex;
      setRigWeapon(p.rig, held.itemType, rarHex, this.textures, held.itemType === 'pickaxe' ? pickaxeDef : undefined);
    } else {
      setRigWeapon(p.rig, 'pickaxe', RARITY_COLORS.common.hex, this.textures, pickaxeDef);
    }

    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    p.recoilSpread = Math.max(0, p.recoilSpread - dt * 0.14);

    if (p.reloading) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.reloading = false;
        const item = p.inventory[p.activeSlot];
        if (item) item.ammo = WEAPON_DEFS[item.itemType].magSize;
      }
    }

    // Battle Bus Camera Tracking
    if (this.matchPhase === 'battle_bus' && p.inBus) {
      p.x = this.busPos.x;
      p.y = this.busPos.y;
      p.z = this.busPos.z;
      const fx = -Math.sin(p.yaw) * Math.cos(p.pitch);
      const fy = Math.sin(p.pitch);
      const fz = -Math.cos(p.yaw) * Math.cos(p.pitch);
      this.camDesiredPos.set(this.busPos.x - fx * 36, this.busPos.y + 11 - fy * 16, this.busPos.z - fz * 36);
      this.camera.position.lerp(this.camDesiredPos, Math.min(1, dt * 8));
      this.camera.lookAt(this.busPos.x, this.busPos.y + 5.5, this.busPos.z);
      return;
    }

    // Driving Vehicle Camera & Control
    if (p.vehicleId !== null) {
      const veh = this.vehicles.find((v) => v.id === p.vehicleId);
      if (veh) {
        const targetFov = Math.abs(veh.speed) > 36 ? 78 : 68;
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 10, dt);
        this.camera.updateProjectionMatrix();

        const backX = Math.sin(veh.yaw) * 8.5;
        const backZ = Math.cos(veh.yaw) * 8.5;
        this.camDesiredPos.set(veh.x + backX, veh.y + 4.0, veh.z + backZ);
        this.camera.position.lerp(this.camDesiredPos, Math.min(1, dt * 10));
        this.camera.lookAt(veh.x - Math.sin(veh.yaw) * 6, veh.y + 1.4, veh.z - Math.cos(veh.yaw) * 6);
        this.dirLight.position.set(veh.x + 90, veh.y + 140, veh.z + 70);
        this.dirLight.target.position.set(veh.x, veh.y, veh.z);
        return;
      }
    }

    if (this.mouseDownLeft && !this.buildState.active && !p.gliding && !p.freefalling) {
      const slotItem = p.inventory[p.activeSlot];
      if (slotItem && WEAPON_DEFS[slotItem.itemType].auto) {
        this.fireCombatantWeapon(p);
      }
    }

    let forward = 0;
    let strafe = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) forward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) forward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;

    if (forward !== 0 || strafe !== 0) {
      p.activeEmoteId = null;
    }
    if (p.activeEmoteId) {
      p.emoteTimer -= dt;
      this.sound.tickDanceBeat(dt, p.activeEmoteId);
      if (p.emoteTimer <= 0) p.activeEmoteId = null;
    }

    p.sprinting = !!(this.keys.has('ShiftLeft') && forward > 0 && !p.aiming && !p.crouching);
    const moveSpeed = p.freefalling ? 20.0 : p.gliding ? 16.5 : p.crouching ? 4.4 : p.aiming ? 5.6 : p.sprinting ? 11.6 : 8.4;

    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe);
      forward /= len;
      strafe /= len;
    }

    const fx = -Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const rx = Math.cos(p.yaw);
    const rz = -Math.sin(p.yaw);

    p.vx = (fx * forward + rx * strafe) * moveSpeed;
    p.vz = (fz * forward + rz * strafe) * moveSpeed;

    if (this.keys.has('Space')) {
      if (p.gliding) {
        p.vy = -18.0;
      } else if (p.grounded && !p.freefalling) {
        p.vy = 11.2;
        p.grounded = false;
        p.crouching = false;
        p.activeEmoteId = null;
      }
    }

    this.resolveEntityPhysics(p, dt);
    p.rig.shadowDisc.visible = p.grounded;
    p.rig.root.position.set(p.x, p.y, p.z);
    p.rig.root.rotation.y = p.yaw;
    animateCharacterPose(p.rig, dt, {
      vx: p.vx,
      vz: p.vz,
      grounded: p.grounded,
      gliding: p.gliding,
      freefalling: p.freefalling,
      crouching: p.crouching,
      pitch: p.pitch,
      emoteId: p.activeEmoteId,
      inVehicle: false,
      sprinting: p.sprinting,
      aiming: p.aiming && !this.buildState.active && !p.reloading && !p.gliding && !p.freefalling,
      weaponType: held?.itemType || 'pickaxe',
    });

    // Build Ghost Preview
    if (this.buildState.active && !p.gliding && !p.freefalling) {
      this.ghostGroup.visible = true;
      const gp = computeBuildGridPlacement(p.x, p.y, p.z, p.yaw, this.buildState.rotStep, getTerrainHeight, WALL_HEIGHT);
      this.ghostGroup.position.set(gp.gx, gp.gy, gp.gz);
      this.ghostGroup.rotation.y = -gp.cardinal * (Math.PI / 2);
      this.ghostWallMesh.visible = this.buildState.piece === 'wall';
      this.ghostFloorMesh.visible = this.buildState.piece === 'floor';
      this.ghostRampMesh.visible = this.buildState.piece === 'ramp';
      this.ghostWallMesh.position.set(0, WALL_HEIGHT / 2, -GRID_SIZE / 2);
      this.ghostFloorMesh.position.set(0, 0.12, 0);
      this.ghostRampMesh.position.set(0, WALL_HEIGHT / 2, 0);
      this.ghostMat.color.setHex(p.wood >= 10 ? 0x38bdf8 : 0xef4444);
    } else {
      this.ghostGroup.visible = false;
    }

    // Camera Framing & Wall Pull-In
    const slotItem = p.inventory[p.activeSlot];
    const def = slotItem ? WEAPON_DEFS[slotItem.itemType] : WEAPON_DEFS.pickaxe;
    const targetFov = p.aiming ? def.zoomFov : p.sprinting || p.gliding || p.freefalling ? 74 : 65;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
    this.camera.updateProjectionMatrix();

    const showScope = !!(p.aiming && def.scope && !p.gliding && !p.freefalling && !this.buildState.active);
    p.rig.root.visible = !showScope;

    const shoulderOffset = showScope ? 0 : p.aiming ? 0.78 : 0.92;
    const camDist = showScope ? 0.2 : p.freefalling || p.gliding ? 6.4 : p.aiming ? 2.35 : 4.8;
    const eyeHeight = p.crouching ? 1.35 : 1.78;

    this.camTargetPos.set(p.x + rx * shoulderOffset, p.y + eyeHeight, p.z + rz * shoulderOffset);
    const backX = Math.sin(p.yaw) * Math.cos(p.pitch);
    const backY = -Math.sin(p.pitch);
    const backZ = Math.cos(p.yaw) * Math.cos(p.pitch);

    let safeCamDist = camDist;
    if (!showScope) {
      const camCheck = this.traceBullet(this.camTargetPos.x, this.camTargetPos.y, this.camTargetPos.z, backX, backY, backZ, camDist, p, []);
      if (camCheck.hitType !== 'none') {
        safeCamDist = Math.max(0.6, camCheck.dist - 0.35);
      }
    }

    this.camDesiredPos.set(
      this.camTargetPos.x + backX * safeCamDist,
      this.camTargetPos.y + backY * safeCamDist,
      this.camTargetPos.z + backZ * safeCamDist
    );

    this.camera.position.lerp(this.camDesiredPos, Math.min(1, dt * 22));
    if (this.cameraTrauma > 0) {
      const shake = this.cameraTrauma * this.cameraTrauma * 0.25;
      this.camera.position.x += (Math.random() - 0.5) * shake;
      this.camera.position.y += (Math.random() - 0.5) * shake;
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.8);
    }

    _v1.set(this.camTargetPos.x - backX * 20, this.camTargetPos.y - backY * 20, this.camTargetPos.z - backZ * 20);
    this.camera.lookAt(_v1);

    this.dirLight.position.set(p.x + 90, p.y + 140, p.z + 70);
    this.dirLight.target.position.set(p.x, p.y, p.z);
  }

  private finishMatch(victory: boolean, place: number): void {
    this.appMode = 'ended';
    this.matchPhase = 'ended';
    this.mouseDownLeft = false;
    this.keys.clear();
    document.exitPointerLock?.();

    const placementBonus = victory ? 35 : place <= 5 ? 15 : 5;
    this.matchStats.tokensEarned += placementBonus;
    this.profile.tokens += placementBonus;
    this.profile.stats.matches++;
    if (victory) this.profile.stats.wins++;
    if (place <= 5) this.profile.stats.top5++;
    this.profile.stats.kills += this.matchStats.kills;
    this.profile.stats.damage += Math.round(this.matchStats.damage);

    let rpDelta = 0;
    const oldRank = getRankForRp(this.profile.rankedPoints);
    let newRank = oldRank;
    if (this.matchConfig.mode === 'ranked') {
      const rRes = calculateRankedDelta(place, this.matchStats.totalPlayers, this.matchStats.kills, this.profile.rankedPoints);
      rpDelta = rRes.delta;
      this.profile.rankedPoints = rRes.newRp;
      this.profile.bestRankedPoints = Math.max(this.profile.bestRankedPoints, rRes.newRp);
      newRank = getRankForRp(rRes.newRp);
      this.profile.stats.rankedMatches++;
      if (victory) this.profile.stats.rankedWins++;
      if (place <= 10) this.profile.stats.rankedTop10++;
      this.profile.stats.rankedKills += this.matchStats.kills;
    }

    let tournamentPointsEarned = 0;
    let unlockedTournamentSkinId: string | undefined;
    if (this.matchConfig.mode === 'tournament') {
      const cup = TOURNAMENTS.find((t) => t.id === this.profile.activeTournamentId) || TOURNAMENTS[0];
      tournamentPointsEarned = calculateTournamentMatchPoints(cup, place, this.matchStats.kills);
      const cur = this.profile.tournamentScores[cup.id] || { points: 0, wins: 0, kills: 0 };
      cur.points += tournamentPointsEarned;
      cur.kills += this.matchStats.kills;
      if (victory) {
        cur.wins++;
        if (cup.rewardSkinId && !this.profile.unlockedSkins.includes(cup.rewardSkinId)) {
          this.profile.unlockedSkins.push(cup.rewardSkinId);
          unlockedTournamentSkinId = cup.rewardSkinId;
        }
      }
      this.profile.tournamentScores[cup.id] = cur;
    }

    if (victory) {
      this.sound.playVictoryFanfare();
      // Spawn golden confetti burst around player
      if (this.player) {
        this.spawnImpactParticles(this.player.x, this.player.y + 2.5, this.player.z, 0xfacc15, 24);
        this.spawnImpactParticles(this.player.x, this.player.y + 2.8, this.player.z, 0x38bdf8, 16);
        this.player.activeEmoteId = 'hyper_jump';
        this.player.emoteTimer = 10;
      }
    }

    this.callbacks.onMatchEnd({
      victory,
      place,
      totalPlayers: this.matchStats.totalPlayers,
      kills: this.matchStats.kills,
      damage: Math.round(this.matchStats.damage),
      tokensEarned: this.matchStats.tokensEarned,
      mode: this.matchConfig.mode,
      rpDelta,
      oldRankId: oldRank.id,
      newRankId: newRank.id,
      tournamentPointsEarned,
      unlockedTournamentSkinId,
    });
  }

  // =========================================================================
  // EFFECTS & HUD SNAPSHOT
  // =========================================================================
  private spawnTracer(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    const dist = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    if (dist < 0.5) return;
    const geo = new THREE.CylinderGeometry(0.03, 0.03, dist, 5);
    geo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geo, this.tracerMat);
    mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    mesh.lookAt(x2, y2, z2);
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: 0.07 });
  }

  private spawnImpactParticles(x: number, y: number, z: number, colorHex: number, count = 6): void {
    let mat = this.particleMatCache.get(colorHex);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({ color: colorHex });
      this.particleMatCache.set(colorHex, mat);
    }
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.particleGeo, mat);
      m.position.set(x, y, z);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 9,
        vy: 2 + Math.random() * 7,
        vz: (Math.random() - 0.5) * 9,
        life: 0.35 + Math.random() * 0.25,
      });
    }
  }

  private detonateRocket(x: number, y: number, z: number, damage: number, shooter: Combatant): void {
    const distP = this.player ? Math.hypot(x - this.player.x, z - this.player.z) : 0;
    this.sound.playExplosion(distP);
    this.spawnImpactParticles(x, y, z, 0xf97316, 18);
    this.spawnImpactParticles(x, y, z, 0xfacc15, 12);

    const blastRadius = 7.5;
    const allCombatants = this.player ? [this.player, ...this.bots] : this.bots;
    for (const c of allCombatants) {
      if (!c.alive || c.inBus) continue;
      const d = Math.hypot(c.x - x, c.y + 1.0 - y, c.z - z);
      if (d <= blastRadius) {
        this.applyDamage(c, damage * (1 - (d / blastRadius) * 0.5), shooter, false);
      }
    }
    for (const b of this.boxColliders) {
      if (b.hp <= 0 || !b.destructible) continue;
      if (Math.hypot((b.minX + b.maxX) / 2 - x, (b.minY + b.maxY) / 2 - y, (b.minZ + b.maxZ) / 2 - z) <= blastRadius) {
        this.damageStructure(b, 250, shooter);
      }
    }
    for (const r of this.rampColliders) {
      if (r.hp <= 0 || r.hp >= 9000) continue;
      if (Math.hypot((r.minX + r.maxX) / 2 - x, (r.baseY + r.topY) / 2 - y, (r.minZ + r.maxZ) / 2 - z) <= blastRadius) {
        r.hp -= 120;
        if (r.hp <= 0 && r.mesh) this.worldGroup.remove(r.mesh);
        else this.applyStructureDamageVisual(r);
      }
    }
  }

  private emitFloatingText(x: number, y: number, z: number, text: string, color: string, big: boolean): void {
    _v1.set(x, y, z).project(this.camera);
    if (_v1.z >= -1 && _v1.z <= 1) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.callbacks.onFloatingText((_v1.x * 0.5 + 0.5) * w, (-_v1.y * 0.5 + 0.5) * h, text, color, big);
    }
  }

  private emitHudSnapshot(): void {
    const p = this.player;
    if (!p) return;

    const lang = this.profile.language;
    let prompt = '';
    if (p.vehicleId !== null) {
      prompt = lang === 'ru' ? '[E] Выйти из машины' : '[E] Exit Vehicle';
    } else if (!p.inBus && !p.freefalling && !p.gliding) {
      for (const veh of this.vehicles) {
        if (veh.hp > 0 && !veh.driver && Math.hypot(veh.x - p.x, veh.z - p.z) < 4.2 && Math.abs(veh.y - p.y) < 3.0) {
          const m = VEHICLE_MODELS.find((vm) => vm.id === veh.type) || VEHICLE_MODELS[0];
          prompt = lang === 'ru' ? `[E] Сесть: ${m.nameRu}` : `[E] Drive: ${m.nameEn}`;
          break;
        }
      }
      if (!prompt) {
        for (const ch of this.chests) {
          if (!ch.opened && Math.hypot(ch.x - p.x, ch.z - p.z) < 3.5 && Math.abs(ch.y - p.y) < 2.6) {
            prompt = ch.isTokenChest
              ? lang === 'ru'
                ? '[E] Открыть ТОКЕН-СУНДУК 💎'
                : '[E] Open TOKEN CHEST 💎'
              : lang === 'ru'
                ? '[E] Открыть сундук'
                : '[E] Open Chest';
            break;
          }
        }
      }
      if (!prompt) {
        for (const item of this.lootItems) {
          if (Math.hypot(item.x - p.x, item.z - p.z) < 3.5 && Math.abs(item.y - p.y) < 2.4) {
            if (item.itemType === 'token_drop') {
              prompt = lang === 'ru' ? `[E] Подобрать +${item.count} Токенов` : `[E] Pick up +${item.count} Tokens`;
            } else {
              const def = WEAPON_DEFS[item.itemType];
              prompt = lang === 'ru' ? `[E] Взять: ${def.nameRu}` : `[E] Equip: ${def.nameEn}`;
            }
            break;
          }
        }
      }
    }

    const activeItem = p.inventory[p.activeSlot];
    const activeDef = activeItem ? WEAPON_DEFS[activeItem.itemType] : null;
    const sniperScoped = !!(p.aiming && activeDef?.scope && !p.gliding && !p.freefalling && !this.buildState.active && p.vehicleId === null);

    const veh = p.vehicleId !== null ? this.vehicles.find((v) => v.id === p.vehicleId) : null;
    const vehDef = veh ? VEHICLE_MODELS.find((m) => m.id === veh.type) : null;

    const aliveCount = (p.alive ? 1 : 0) + this.bots.filter((b) => b.alive).length;

    this.callbacks.onHudUpdate({
      phase: this.matchPhase,
      starterTimer: Math.max(0, Math.ceil(this.starterTimer)),
      alive: aliveCount,
      totalPlayers: this.matchStats.totalPlayers,
      kills: this.matchStats.kills,
      damage: Math.round(this.matchStats.damage),
      tokens: this.profile.tokens,
      hp: p.hp,
      maxHp: p.maxHp,
      shield: p.shield,
      maxShield: p.maxShield,
      wood: p.wood,
      stormPhase: this.storm.phase,
      stormTimer: Math.max(0, Math.ceil(this.storm.timer)),
      stormShrinking: this.storm.shrinking,
      inStorm: this.matchPhase !== 'starter_island' && !p.inBus && Math.hypot(p.x - this.storm.x, p.z - this.storm.z) > this.storm.radius,
      fps: this.currentFps,
      activeSlot: p.activeSlot,
      inventory: p.inventory.map((s) => (s ? { ...s } : null)),
      reloading: p.reloading,
      aiming: !!(p.aiming && !this.buildState.active && !p.gliding && !p.freefalling && p.vehicleId === null),
      sniperScoped,
      gliding: p.gliding,
      freefalling: p.freefalling,
      inBus: p.inBus,
      canJumpBus: this.matchPhase === 'battle_bus' && p.inBus && this.busProgress > 0.08,
      thankedBusDriver: this.thankedBusDriver,
      buildActive: this.buildState.active,
      buildPiece: this.buildState.piece,
      inVehicle: !!veh,
      vehicleName: vehDef ? (lang === 'ru' ? vehDef.nameRu : vehDef.nameEn) : '',
      vehicleSpeedKmh: veh ? Math.round(Math.abs(veh.speed) * 3.2) : 0,
      vehicleBoost: veh ? Math.round(veh.boost) : 0,
      vehicleHp: veh ? Math.round(veh.hp) : 0,
      vehicleMaxHp: veh ? veh.maxHp : 100,
      interactPrompt: prompt,
      activeEmoteId: p.activeEmoteId,
      playerX: p.x,
      playerZ: p.z,
      playerYaw: p.yaw,
      stormX: this.storm.x,
      stormZ: this.storm.z,
      stormRadius: this.storm.radius,
      stormNextX: this.storm.nextX,
      stormNextZ: this.storm.nextZ,
      stormNextRadius: this.storm.nextRadius,
      busStart: { x: this.busStart.x, z: this.busStart.z },
      busEnd: { x: this.busEnd.x, z: this.busEnd.z },
      busPos: { x: this.busPos.x, z: this.busPos.z },
      playerMarker: this.playerMarker,
      markerDistance: getDistanceToMarker(p.x, p.z, this.playerMarker),
      teammates: this.bots
        .filter((b) => b.isAlly)
        .map((b) => ({
          name: b.name,
          x: b.x,
          z: b.z,
          hp: Math.round(b.hp),
          alive: b.alive,
          color: b.allyColor,
          marker: b.allyMarker,
        })),
      nearbyEnemies: this.bots
        .filter((b) => b.alive && !b.isAlly && !b.inBus && Math.hypot(b.x - p.x, b.z - p.z) < 65)
        .map((b) => ({ x: b.x, z: b.z })),
      tokenChests: this.chests.filter((c) => c.isTokenChest).map((c) => ({ x: c.x, z: c.z, opened: c.opened })),
      vehiclesOnMap: this.vehicles.filter((v) => v.hp > 0).map((v) => ({ x: v.x, z: v.z, type: v.type })),
      launchPads: this.launchPads.map((lp) => ({ x: lp.x, z: lp.z })),
    });
  }

  // =========================================================================
  // MAIN SIMULATION & RENDER LOOP (GPU rAF vs Software WebGL afterDraw)
  // =========================================================================
  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      this.frameCounter++;
      this.fpsTimer += rawDt;
      if (this.fpsTimer >= 0.5) {
        this.currentFps = Math.round(this.frameCounter / this.fpsTimer);
        this.frameCounter = 0;
        this.fpsTimer = 0;
      }

      // World ambient animations
      this.cloudGroup.rotation.y += dt * 0.006;
      for (let i = 0; i < this.lootItems.length; i++) {
        const item = this.lootItems[i];
        item.itemMesh.rotation.y += dt * 2.2;
        item.itemMesh.position.y = Math.sin(now * 0.004 + item.id) * 0.12;
      }
      for (let i = 0; i < this.chests.length; i++) {
        const ch = this.chests[i];
        if (!ch.opened && ch.tokenOrb) {
          ch.tokenOrb.rotation.y += dt * 2.4;
          ch.tokenOrb.position.y = 1.65 + Math.sin(now * 0.005 + i) * 0.14;
        }
      }

      if (this.appMode === 'menu') {
        const py = getTerrainHeight(0, 6);
        const gliderPreview = !!this.shopPreview?.gliderId;
        this.camera.fov = this.lobbyPreviewMode === 'vehicle' ? 50 : gliderPreview ? 50 : 45;
        this.camera.updateProjectionMatrix();
        const dist = this.lobbyPreviewMode === 'vehicle' ? 7.6 : gliderPreview ? 6.2 : 4.5;
        const lookX = this.lobbyPreviewMode === 'vehicle' ? 0.6 : 0;
        const lookY = this.lobbyPreviewMode === 'vehicle' ? py + 1.0 : gliderPreview ? py + 1.85 : py + 1.3;
        this.camera.position.set(
          lookX,
          py + (this.lobbyPreviewMode === 'vehicle' ? 2.25 : gliderPreview ? 2.15 : 1.68),
          6 + dist
        );
        this.camera.lookAt(lookX, lookY, 6);

        if (this.lobbyEmoteId) {
          this.lobbyEmoteTimer -= dt;
          this.sound.tickDanceBeat(dt, this.lobbyEmoteId);
          if (this.lobbyEmoteTimer <= 0) this.lobbyEmoteId = null;
        }

        if (this.lobbyCharRig) {
          animateCharacterPose(this.lobbyCharRig, dt, {
            vx: 0,
            vz: 0,
            grounded: true,
            gliding: false,
            freefalling: false,
            crouching: false,
            pitch: 0,
            emoteId: this.lobbyEmoteId,
          });
        }
        if (this.lobbyVehicleRig && !this.isDraggingLobby) {
          this.lobbyYaw += dt * 0.25;
          this.lobbyVehicleRig.root.rotation.y = this.lobbyYaw;
        }
      } else if (this.appMode === 'playing') {
        if (this.hitstopTimer > 0) {
          this.hitstopTimer -= dt;
        } else {
          // Match Phase State Machine
          if (this.matchPhase === 'starter_island') {
            this.starterTimer -= dt;
            this.starterWaitTime += dt;
            if (this.starterTimer <= 0) {
              this.launchBattleBus();
            }
          }

          // Battle Bus flies independently even after player jumps
          if (this.busActive) {
            this.busProgress += dt / 18;
            this.busPos.lerpVectors(this.busStart, this.busEnd, Math.min(1.15, this.busProgress));
            this.battleBusMesh.position.copy(this.busPos);
            this.busBotThankTimer -= dt;
            if (this.busBotThankTimer <= 0 && this.bots.length > 0) {
              this.busBotThankTimer = 2.4 + Math.random() * 2.5;
              const bot = this.bots[Math.floor(Math.random() * this.bots.length)];
              if (bot && bot.inBus) {
                this.callbacks.onChatMessage({
                  id: this.nextChatId++,
                  sender: bot.name,
                  text:
                    this.profile.language === 'ru'
                      ? 'поблагодарил водителя автобуса!'
                      : 'thanked the bus driver!',
                  kind: 'bus',
                });
              }
            }
            if (this.busProgress >= 0.96) {
              if (this.player?.inBus) this.jumpFromBus();
              for (const bot of this.bots) {
                if (bot.alive && bot.inBus) {
                  bot.inBus = false;
                  bot.x = this.busPos.x + (Math.random() - 0.5) * 10;
                  bot.y = this.busPos.y - 4;
                  bot.z = this.busPos.z + (Math.random() - 0.5) * 10;
                  bot.vy = -12;
                  bot.freefalling = true;
                  bot.rig.root.visible = true;
                }
              }
            }
            if (this.busProgress >= 1.12) {
              this.battleBusMesh.visible = false;
              this.busActive = false;
            }
          }

          this.updatePlayer(dt);
          this.updateBots(dt);
          this.updateVehicles(dt);
          this.updateStorm(dt, this.player ? [this.player, ...this.bots] : this.bots);
        }

        // Update RPG Rockets
        const allCombatants = this.player ? [this.player, ...this.bots] : this.bots;
        for (let i = this.rockets.length - 1; i >= 0; i--) {
          const rk = this.rockets[i];
          rk.life -= dt;
          const stepDist = Math.hypot(rk.vx * dt, rk.vy * dt, rk.vz * dt);
          _v1.set(rk.vx, rk.vy, rk.vz).normalize();
          const hit = this.traceBullet(rk.x, rk.y, rk.z, _v1.x, _v1.y, _v1.z, stepDist, rk.shooter, allCombatants);
          if (hit.hitType !== 'none' || rk.life <= 0) {
            this.detonateRocket(hit.hitX, hit.hitY, hit.hitZ, rk.damage, rk.shooter);
            this.scene.remove(rk.mesh);
            this.rockets.splice(i, 1);
          } else {
            rk.x += rk.vx * dt;
            rk.y += rk.vy * dt;
            rk.z += rk.vz * dt;
            rk.mesh.position.set(rk.x, rk.y, rk.z);
          }
        }

        // Update Tracers & Particles
        for (let i = this.tracers.length - 1; i >= 0; i--) {
          this.tracers[i].life -= dt;
          if (this.tracers[i].life <= 0) {
            this.scene.remove(this.tracers[i].mesh);
            this.tracers[i].mesh.geometry.dispose();
            this.tracers.splice(i, 1);
          }
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const pt = this.particles[i];
          pt.life -= dt;
          pt.vy -= 18 * dt;
          pt.mesh.position.x += pt.vx * dt;
          pt.mesh.position.y += pt.vy * dt;
          pt.mesh.position.z += pt.vz * dt;
          if (pt.life <= 0) {
            this.scene.remove(pt.mesh);
            this.particles.splice(i, 1);
          }
        }

        this.hudThrottle += dt;
        if (this.hudThrottle >= 0.08) {
          this.hudThrottle = 0;
          this.emitHudSnapshot();
        }
      }

      this.renderer.render(this.scene, this.camera);
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }
}
