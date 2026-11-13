import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDamageMath,
  buildTournamentLeaderboard,
  calculateRankedDelta,
  calculateTournamentMatchPoints,
  canBotBuildCover,
  computeBuildGridPlacement,
  computeVehicleImpactDamage,
  getAllyCountForTeamSize,
  getBotDifficultyProfile,
  getBusBotJumpProgress,
  getDistanceToMarker,
  getMatchmakingProgress,
  getNextRank,
  getRankForRp,
  getRoofSurfaceY,
  getStructureOpacity,
  shouldBotAnimateThisFrame,
  swapInventoryArray,
} from './rules';
import { GRID_SIZE, TOURNAMENTS } from './data';

test('rank progression maps RP to correct divisions and handles promotion/demotion', () => {
  assert.equal(getRankForRp(0).id, 'bronze_1');
  assert.equal(getRankForRp(450).id, 'silver_1');
  assert.equal(getRankForRp(5200).id, 'unreal');
  assert.equal(getNextRank(0)?.id, 'bronze_2');
  assert.equal(getNextRank(5200), null);

  const winRes = calculateRankedDelta(1, 24, 5, 2000);
  assert.ok(winRes.delta > 0);
  assert.ok(winRes.newRp > 2000);

  const lossRes = calculateRankedDelta(24, 24, 0, 2615);
  assert.ok(lossRes.delta < 0);
  assert.ok(lossRes.newRp < 2600);
  assert.equal(getRankForRp(lossRes.newRp).id, 'platinum');
});

test('tournament scoring and leaderboard sorting rank player accurately', () => {
  const cup = TOURNAMENTS[0];
  const winPts = calculateTournamentMatchPoints(cup, 1, 4);
  assert.equal(winPts, cup.winBonus + 4 * cup.killPoints);

  const board = buildTournamentLeaderboard(cup.id, 'Tester', { points: 130, wins: 1, kills: 10 });
  assert.equal(board.playerPlace, 2);
  assert.equal(board.entries[1].name, 'Tester');
});

test('damage math absorbs shield before HP and amplifies headshots', () => {
  const body = applyDamageMath(100, 50, 30, false);
  assert.equal(body.newShield, 20);
  assert.equal(body.newHp, 100);

  const overflow = applyDamageMath(100, 20, 40, false);
  assert.equal(overflow.newShield, 0);
  assert.equal(overflow.newHp, 80);

  const head = applyDamageMath(100, 0, 40, true);
  assert.equal(head.totalDealt, 66);
  assert.equal(head.newHp, 34);
});

test('building placement snaps to enlarged grid and calculates marker distance', () => {
  const placement = computeBuildGridPlacement(1.1, 0, 1.2, 0, 0, () => 0, 4.2);
  assert.equal(placement.gx, 0);
  assert.equal(placement.gz, -GRID_SIZE);
  assert.equal(placement.gy, 0);
  assert.equal(placement.cardinal, 0);

  assert.equal(getDistanceToMarker(0, 0, { x: 30, z: 40, label: 'Test', color: '#fff' }), 50);
  assert.equal(getDistanceToMarker(0, 0, null), null);
});

test('matchmaking fills within 30s cap', () => {
  const start = getMatchmakingProgress(0, 30, 24);
  assert.equal(start.ready, false);
  const done = getMatchmakingProgress(5, 30, 24);
  assert.equal(done.foundPlayers, 24);
  assert.equal(done.ready, true);
});

test('sloped roof collision computes peak, slope, and bounds accurately', () => {
  const roof = { minX: -6, maxX: 6, minZ: -6, maxZ: 6, baseY: 7.6, topY: 10.2 };
  assert.equal(getRoofSurfaceY(0, 0, roof), 10.2);
  assert.equal(getRoofSurfaceY(-6, 0, roof), 7.6);
  const mid = getRoofSurfaceY(3, 0, roof);
  assert.ok(mid !== null && Math.abs(mid - 8.9) < 0.01);
  assert.equal(getRoofSurfaceY(7, 0, roof), null);
});

test('inventory slot swapping preserves slot 0 pickaxe and swaps slots 1-4', () => {
  const inv = ['pickaxe', 'ar', 'shotgun', null, 'medkit'];
  const blocked = swapInventoryArray(inv, 0, 1);
  assert.deepEqual(blocked, inv);
  const swapped = swapInventoryArray(inv, 1, 3);
  assert.deepEqual(swapped, ['pickaxe', null, 'shotgun', 'ar', 'medkit']);
});

test('structure opacity scales down progressively with damage', () => {
  assert.equal(getStructureOpacity(150, 150), 1);
  const half = getStructureOpacity(75, 150);
  const low = getStructureOpacity(15, 150);
  assert.ok(half < 1 && half > low);
  assert.ok(low >= 0.24 && low < 0.4);
  assert.equal(getStructureOpacity(0, 150), 0);
});

test('team size maps solo/duo/trio/squad to exact ally counts', () => {
  assert.equal(getAllyCountForTeamSize('solo'), 0);
  assert.equal(getAllyCountForTeamSize('duo'), 1);
  assert.equal(getAllyCountForTeamSize('trio'), 2);
  assert.equal(getAllyCountForTeamSize('squad'), 3);
});

test('bot difficulty scales with ranked points and peaks in tournaments', () => {
  const bronze = getBotDifficultyProfile('ranked', 50);
  const diamond = getBotDifficultyProfile('ranked', 2700);
  const unreal = getBotDifficultyProfile('ranked', 5200);
  const cup = getBotDifficultyProfile('tournament', 50);

  assert.ok(diamond.aimJitter < bronze.aimJitter);
  assert.ok(unreal.wallChance > diamond.wallChance);
  assert.ok(unreal.rampChance > bronze.rampChance);
  assert.ok(cup.tier >= 0.9);
  assert.ok(cup.boxChance > bronze.boxChance);
});

test('bus jump progress distributes all bots evenly before bus exit', () => {
  for (let i = 0; i < 40; i++) {
    const p = getBusBotJumpProgress(i, 40, (i % 7) / 7);
    assert.ok(p >= 0.06 && p <= 0.9);
  }
});

test('vehicle impact damage scales with speed above threshold and ignores slow bumps', () => {
  assert.equal(computeVehicleImpactDamage(3.2), 0);
  const mediumHit = computeVehicleImpactDamage(10);
  const boostHit = computeVehicleImpactDamage(50);
  assert.ok(mediumHit >= 30 && mediumHit < boostHit);
  assert.equal(boostHit, 115);
});

test('bots cannot build cover while in bus, skydiving, gliding, or airborne', () => {
  assert.equal(canBotBuildCover({ alive: true, grounded: false, inBus: false, freefalling: true, gliding: false, wood: 100 }), false);
  assert.equal(canBotBuildCover({ alive: true, grounded: false, inBus: false, freefalling: false, gliding: true, wood: 100 }), false);
  assert.equal(canBotBuildCover({ alive: true, grounded: false, inBus: true, freefalling: false, gliding: false, wood: 100 }), false);
  assert.equal(canBotBuildCover({ alive: true, grounded: false, inBus: false, freefalling: false, gliding: false, wood: 100 }), false);
  assert.equal(canBotBuildCover({ alive: true, grounded: true, inBus: false, freefalling: false, gliding: false, wood: 5 }), false);
  assert.equal(canBotBuildCover({ alive: true, grounded: true, inBus: false, freefalling: false, gliding: false, wood: 30 }), true);
});

test('bot animation LOD throttles distant bots smoothly while keeping close bots full rate', () => {
  for (let f = 0; f < 8; f++) {
    assert.equal(shouldBotAnimateThisFrame(40, f, 3), true);
  }
  const midFrames = [0, 1, 2, 3].filter((f) => shouldBotAnimateThisFrame(120, f, 0)).length;
  const farFrames = [0, 1, 2, 3].filter((f) => shouldBotAnimateThisFrame(220, f, 0)).length;
  assert.equal(midFrames, 2);
  assert.equal(farFrames, 1);
});

