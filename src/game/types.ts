export type Language = 'ru' | 'en';
export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type GameModeId = 'br' | 'ranked' | 'tournament';
export type TeamSizeId = 'solo' | 'duo' | 'trio' | 'squad';
export type MapBiomeTheme = 'multi' | 'valley' | 'desert' | 'snow';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type AppScreenState = 'title' | 'matchmaking' | 'loading' | 'playing' | 'paused' | 'gameover';
export type MatchPhase = 'starter_island' | 'battle_bus' | 'skydiving' | 'combat' | 'ended';
export type BuildPiece = 'wall' | 'ramp' | 'floor';
export type VehicleTypeId = 'sports' | 'suv' | 'buggy';
export type LobbyTabId = 'play' | 'locker' | 'shop' | 'emotes' | 'garage' | 'compete' | 'profile' | 'settings';
export type BackblingStyleId = 'pack' | 'wings' | 'cape' | 'jetpack' | 'shield' | 'katana' | 'prism';
export type PickaxeStyleId = 'classic' | 'scythe' | 'halberd' | 'scepter' | 'hammer' | 'katana';
export type GliderStyleId = 'classic' | 'jet' | 'wings' | 'sail' | 'manta' | 'dragon';

export interface SkinStyle {
  id: string;
  nameRu: string;
  nameEn: string;
  primary: number;
  secondary: number;
  accent: number;
  visor: number;
  hair: number;
  pack: number;
  swatch: string;
}

export interface SkinDef {
  id: string;
  nameRu: string;
  nameEn: string;
  rarity: RarityId;
  price: number;
  headgear: 'cap' | 'visor' | 'horns' | 'hood' | 'crown' | 'cyber_helm' | 'goggles' | 'mask';
  backbling: BackblingStyleId;
  tournamentRewardId?: string;
  styles: SkinStyle[];
}

export interface PickaxeDef {
  id: string;
  nameRu: string;
  nameEn: string;
  rarity: RarityId;
  price: number;
  style: PickaxeStyleId;
  primary: number;
  accent: number;
  glow: number;
  swatch: string;
}

export interface GliderDef {
  id: string;
  nameRu: string;
  nameEn: string;
  rarity: RarityId;
  price: number;
  style: GliderStyleId;
  primary: number;
  accent: number;
  glow: number;
  swatch: string;
}

export interface BackblingDef {
  id: string;
  nameRu: string;
  nameEn: string;
  rarity: RarityId;
  price: number;
  style: BackblingStyleId | 'skin_default';
  primary: number;
  accent: number;
  glow: number;
  swatch: string;
}

export interface VehicleSkinDef {
  id: string;
  nameRu: string;
  nameEn: string;
  rarity: RarityId;
  price: number;
  bodyColor: number;
  stripeColor: number;
  trimColor: number;
  rimColor: number;
  neonColor: number;
  swatch: string;
}

export interface VehicleModelDef {
  id: VehicleTypeId;
  nameRu: string;
  nameEn: string;
  maxSpeed: number;
  boostSpeed: number;
  accel: number;
  turnRate: number;
  maxHp: number;
}

export interface EmoteDef {
  id: string;
  nameRu: string;
  nameEn: string;
  rarity: RarityId;
  price: number;
  icon: string;
  tempo: number;
  descRu: string;
  descEn: string;
}

export interface RankDivision {
  id: string;
  nameRu: string;
  nameEn: string;
  minRp: number;
  color: string;
  badgeBg: string;
}

export interface TournamentEntry {
  name: string;
  points: number;
  wins: number;
  kills: number;
  isPlayer?: boolean;
}

export interface TournamentDef {
  id: string;
  nameRu: string;
  nameEn: string;
  descRu: string;
  descEn: string;
  winBonus: number;
  top5Bonus: number;
  killPoints: number;
  prizeTokens: number;
  rewardSkinId: string;
  color: string;
  entries: TournamentEntry[];
}

export interface PlayerStats {
  matches: number;
  wins: number;
  top5: number;
  kills: number;
  damage: number;
  chestsOpened: number;
  vehiclesDriven: number;
  rankedMatches: number;
  rankedWins: number;
  rankedKills: number;
  rankedTop10: number;
}

export interface FriendEntry {
  id: string;
  name: string;
  status: 'online' | 'in_lobby' | 'in_match';
  rankLabelRu: string;
  rankLabelEn: string;
  skinNameRu: string;
  skinNameEn: string;
  invited?: boolean;
}

export interface PlayerProfile {
  nickname: string;
  language: Language;
  tokens: number;
  unlockedSkins: string[];
  equippedSkin: string;
  equippedSkinStyles: Record<string, string>;
  unlockedPickaxes: string[];
  equippedPickaxe: string;
  unlockedGliders: string[];
  equippedGlider: string;
  unlockedBackblings: string[];
  equippedBackbling: string;
  unlockedCarSkins: string[];
  equippedCarModel: VehicleTypeId;
  equippedCarSkin: string;
  unlockedEmotes: string[];
  emoteWheel: string[];
  perkStartShield: boolean;
  perkStartWood: boolean;
  rankedPoints: number;
  bestRankedPoints: number;
  activeTournamentId: string;
  tournamentScores: Record<string, { points: number; wins: number; kills: number }>;
  friends: FriendEntry[];
  stats: PlayerStats;
}

export interface MapMarker {
  x: number;
  z: number;
  label: string;
  color: string;
  isPlayerPing?: boolean;
}

export interface PoiInfo {
  id: string;
  nameRu: string;
  nameEn: string;
  x: number;
  z: number;
  biome: 'city' | 'forest' | 'snow' | 'desert' | 'river';
}

export interface HudSnapshot {
  phase: MatchPhase;
  starterTimer: number;
  alive: number;
  totalPlayers: number;
  kills: number;
  damage: number;
  tokens: number;
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  wood: number;
  stormPhase: number;
  stormTimer: number;
  stormShrinking: boolean;
  inStorm: boolean;
  fps: number;
  activeSlot: number;
  inventory: Array<{
    itemType: string;
    rarityIdx: number;
    ammo: number;
    count: number;
  } | null>;
  reloading: boolean;
  aiming: boolean;
  sniperScoped: boolean;
  gliding: boolean;
  freefalling: boolean;
  inBus: boolean;
  canJumpBus: boolean;
  thankedBusDriver: boolean;
  buildActive: boolean;
  buildPiece: BuildPiece;
  inVehicle: boolean;
  vehicleName: string;
  vehicleSpeedKmh: number;
  vehicleBoost: number;
  vehicleHp: number;
  vehicleMaxHp: number;
  interactPrompt: string;
  activeEmoteId: string | null;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  stormX: number;
  stormZ: number;
  stormRadius: number;
  stormNextX: number;
  stormNextZ: number;
  stormNextRadius: number;
  busStart: { x: number; z: number };
  busEnd: { x: number; z: number };
  busPos: { x: number; z: number };
  playerMarker: MapMarker | null;
  markerDistance: number | null;
  teammates: Array<{
    name: string;
    x: number;
    z: number;
    hp: number;
    alive: boolean;
    color: string;
    marker: MapMarker | null;
  }>;
  nearbyEnemies: Array<{ x: number; z: number }>;
  tokenChests: Array<{ x: number; z: number; opened: boolean }>;
  vehiclesOnMap: Array<{ x: number; z: number; type: VehicleTypeId }>;
  launchPads: Array<{ x: number; z: number }>;
}

export interface MatchResultSnapshot {
  victory: boolean;
  place: number;
  totalPlayers: number;
  kills: number;
  damage: number;
  tokensEarned: number;
  mode: GameModeId;
  rpDelta: number;
  oldRankId: string;
  newRankId: string;
  tournamentPointsEarned: number;
  unlockedTournamentSkinId?: string;
}

export interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  kind: 'bus' | 'system' | 'player' | 'squad';
}
