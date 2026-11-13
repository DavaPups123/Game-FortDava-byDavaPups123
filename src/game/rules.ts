import { GRID_SIZE, RANK_DIVISIONS, TOURNAMENTS } from './data';
import {
  GameModeId,
  MapMarker,
  RankDivision,
  TeamSizeId,
  TournamentDef,
  TournamentEntry,
} from './types';

export function getRankForRp(rp: number): RankDivision {
  let current = RANK_DIVISIONS[0];
  for (const div of RANK_DIVISIONS) {
    if (rp >= div.minRp) {
      current = div;
    }
  }
  return current;
}

export function getNextRank(rp: number): RankDivision | null {
  for (const div of RANK_DIVISIONS) {
    if (div.minRp > rp) return div;
  }
  return null;
}

export function calculateRankedDelta(
  place: number,
  totalPlayers: number,
  kills: number,
  currentRp: number
): { delta: number; newRp: number } {
  const placementRatio = 1 - (place - 1) / Math.max(1, totalPlayers - 1);
  const placementGain =
    place === 1 ? 85 : place <= 3 ? 55 : place <= 5 ? 35 : place <= 10 ? 18 : Math.round(placementRatio * 10);

  const elimGain = kills * 14;
  const divisionIndex = RANK_DIVISIONS.findIndex((d) => d.id === getRankForRp(currentRp).id);
  const busFare = divisionIndex <= 0 ? 0 : divisionIndex * 7;

  const delta = placementGain + elimGain - busFare;
  const newRp = Math.max(0, currentRp + delta);
  return { delta, newRp };
}

export function calculateTournamentMatchPoints(
  tournament: TournamentDef,
  place: number,
  kills: number
): number {
  let pts = kills * tournament.killPoints;
  if (place === 1) {
    pts += tournament.winBonus;
  } else if (place <= 5) {
    pts += tournament.top5Bonus;
  } else if (place <= 10) {
    pts += Math.round(tournament.top5Bonus * 0.4);
  }
  return pts;
}

export function buildTournamentLeaderboard(
  tournamentId: string,
  playerName: string,
  playerScore: { points: number; wins: number; kills: number }
): { entries: TournamentEntry[]; playerPlace: number } {
  const def = TOURNAMENTS.find((t) => t.id === tournamentId) || TOURNAMENTS[0];
  const combined: TournamentEntry[] = [
    ...def.entries.map((e) => ({ ...e, isPlayer: false })),
    {
      name: playerName || 'RoyaleHero',
      points: playerScore.points,
      wins: playerScore.wins,
      kills: playerScore.kills,
      isPlayer: true,
    },
  ];
  combined.sort((a, b) => b.points - a.points || b.wins - a.wins || b.kills - a.kills);
  const playerPlace = combined.findIndex((e) => e.isPlayer) + 1;
  return { entries: combined, playerPlace };
}

export function applyDamageMath(
  hp: number,
  shield: number,
  rawDamage: number,
  isHeadshot: boolean
): { newHp: number; newShield: number; hpLoss: number; shieldLoss: number; totalDealt: number } {
  const dmg = Math.max(0, isHeadshot ? rawDamage * 1.65 : rawDamage);
  const shieldLoss = Math.min(shield, dmg);
  const rem = dmg - shieldLoss;
  const hpLoss = Math.min(hp, rem);
  return {
    newShield: Math.max(0, shield - shieldLoss),
    newHp: Math.max(0, hp - hpLoss),
    hpLoss,
    shieldLoss,
    totalDealt: dmg,
  };
}

export function computeBuildGridPlacement(
  entityX: number,
  entityY: number,
  entityZ: number,
  yaw: number,
  rotStep: number,
  groundHeightAt: (x: number, z: number) => number,
  wallHeight: number
): { gx: number; gy: number; gz: number; cardinal: number } {
  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const reach = GRID_SIZE * 0.85;
  const targetX = entityX + forwardX * reach;
  const targetZ = entityZ + forwardZ * reach;

  const gx = Math.round(targetX / GRID_SIZE) * GRID_SIZE;
  const gz = Math.round(targetZ / GRID_SIZE) * GRID_SIZE;
  const groundY = groundHeightAt(gx, gz);
  const gy = Math.max(groundY, Math.floor((entityY + 0.5) / wallHeight) * wallHeight);
  const cardinal = (Math.round(-yaw / (Math.PI / 2)) + rotStep) & 3;
  return { gx, gy, gz, cardinal };
}

export function getDistanceToMarker(
  playerX: number,
  playerZ: number,
  marker: MapMarker | null
): number | null {
  if (!marker) return null;
  return Math.round(Math.hypot(marker.x - playerX, marker.z - playerZ));
}

export function getMatchmakingProgress(elapsedSec: number, maxWaitSec = 30, targetPlayers = 24): {
  foundPlayers: number;
  ready: boolean;
} {
  const clamped = Math.max(0, Math.min(elapsedSec, maxWaitSec));
  const fillDuration = Math.min(4.2, maxWaitSec);
  const ratio = Math.min(1, clamped / fillDuration);
  const eased = 1 - Math.pow(1 - ratio, 2);
  const foundPlayers = Math.max(1, Math.min(targetPlayers, Math.round(1 + eased * (targetPlayers - 1))));
  return {
    foundPlayers,
    ready: foundPlayers >= targetPlayers || clamped >= maxWaitSec,
  };
}

export function getRoofSurfaceY(
  x: number,
  z: number,
  roof: { minX: number; maxX: number; minZ: number; maxZ: number; baseY: number; topY: number }
): number | null {
  if (x < roof.minX || x > roof.maxX || z < roof.minZ || z > roof.maxZ) return null;
  const cx = (roof.minX + roof.maxX) * 0.5;
  const cz = (roof.minZ + roof.maxZ) * 0.5;
  const halfW = Math.max(0.01, (roof.maxX - roof.minX) * 0.5);
  const halfD = Math.max(0.01, (roof.maxZ - roof.minZ) * 0.5);
  const nx = Math.abs(x - cx) / halfW;
  const nz = Math.abs(z - cz) / halfD;
  const slopeT = Math.max(0, 1 - Math.max(nx, nz));
  return roof.baseY + slopeT * (roof.topY - roof.baseY);
}

export function swapInventoryArray<T>(
  inventory: (T | null)[],
  idxA: number,
  idxB: number
): (T | null)[] {
  if (idxA < 1 || idxB < 1 || idxA >= inventory.length || idxB >= inventory.length || idxA === idxB) {
    return inventory;
  }
  const next = [...inventory];
  const tmp = next[idxA];
  next[idxA] = next[idxB];
  next[idxB] = tmp;
  return next;
}

export function getStructureOpacity(hp: number, maxHp: number): number {
  if (hp <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
  return Number((0.24 + ratio * 0.76).toFixed(3));
}

export function getAllyCountForTeamSize(teamSize: TeamSizeId): number {
  switch (teamSize) {
    case 'duo':
      return 1;
    case 'trio':
      return 2;
    case 'squad':
      return 3;
    default:
      return 0;
  }
}

export interface BotDifficultyProfile {
  tier: number;
  aimJitter: number;
  wallChance: number;
  rampChance: number;
  boxChance: number;
  fireDelayMult: number;
  moveSpeed: number;
  startWood: number;
  startShield: number;
}

export function getBotDifficultyProfile(mode: GameModeId, rankedPoints: number): BotDifficultyProfile {
  let tier = 0.25;
  if (mode === 'ranked') {
    const rankIdx = RANK_DIVISIONS.findIndex((d) => d.id === getRankForRp(rankedPoints).id);
    const maxIdx = Math.max(1, RANK_DIVISIONS.length - 1);
    tier = 0.2 + (Math.max(0, rankIdx) / maxIdx) * 0.75;
  } else if (mode === 'tournament') {
    tier = 0.92;
  }

  return {
    tier: Number(tier.toFixed(2)),
    aimJitter: Number((0.18 - tier * 0.135).toFixed(4)),
    wallChance: Number((0.22 + tier * 0.68).toFixed(2)),
    rampChance: Number((0.06 + tier * 0.56).toFixed(2)),
    boxChance: Number((tier >= 0.55 ? (tier - 0.45) * 0.85 : 0.04).toFixed(2)),
    fireDelayMult: Number((1.25 - tier * 0.45).toFixed(2)),
    moveSpeed: Number((7.2 + tier * 1.9).toFixed(2)),
    startWood: Math.round(80 + tier * 240),
    startShield: Math.round(25 + tier * 75),
  };
}

export function getBusBotJumpProgress(botIndex: number, totalBots: number, jitter = 0): number {
  const safeTotal = Math.max(1, totalBots);
  const base = 0.08 + ((botIndex + 0.5) / safeTotal) * 0.78;
  const offset = (jitter - 0.5) * 0.08;
  return Math.max(0.06, Math.min(0.9, Number((base + offset).toFixed(3))));
}

export function computeVehicleImpactDamage(speedMs: number): number {
  const absSpeed = Math.abs(speedMs);
  if (absSpeed < 5.5) return 0;
  return Math.min(115, Math.round(16 + absSpeed * 2.15));
}

export function canBotBuildCover(state: {
  alive: boolean;
  grounded: boolean;
  inBus: boolean;
  freefalling: boolean;
  gliding: boolean;
  wood: number;
}): boolean {
  return (
    state.alive &&
    state.grounded &&
    !state.inBus &&
    !state.freefalling &&
    !state.gliding &&
    state.wood >= 10
  );
}

export function shouldBotAnimateThisFrame(
  distToCam: number,
  frameIndex: number,
  botIndex: number
): boolean {
  if (distToCam <= 85) return true;
  if (distToCam <= 170) return ((frameIndex + botIndex) & 1) === 0;
  return ((frameIndex + botIndex) & 3) === 0;
}

