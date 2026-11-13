import React, { useEffect, useRef, useState } from 'react';
import { BACKBLINGS, GLIDERS, PICKAXES, RANK_DIVISIONS, RARITY_LIST, SKINS, WORLD_RADIUS, WEAPON_DEFS } from '../game/data';
import { t } from '../game/i18n';
import { getRankForRp } from '../game/rules';
import {
  ChatMessage,
  GraphicsQuality,
  HudSnapshot,
  Language,
  MatchResultSnapshot,
  PlayerProfile,
} from '../game/types';

export interface FloatingDamage {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  big: boolean;
}

interface GameHUDProps {
  lang: Language;
  profile: PlayerProfile;
  quality: GraphicsQuality;
  botCount: number;
  sensitivity: number;
  volume: number;
  hud: HudSnapshot | null;
  killFeed: string[];
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  floatingTexts: FloatingDamage[];
  hitmarkerActive: boolean;
  damageFlash: boolean;
  muted: boolean;
  emoteWheelOpen: boolean;
  emoteWheelIds: string[];
  paused: boolean;
  matchResult: MatchResultSnapshot | null;
  onToggleMute: () => void;
  onQualityChange: (q: GraphicsQuality) => void;
  onBotCountChange: (count: number) => void;
  onSensitivityChange: (sens: number) => void;
  onVolumeChange: (vol: number) => void;
  onUpdateProfile: (next: PlayerProfile) => void;
  onToggleMap: () => void;
  onToggleInventory: () => void;
  onToggleEmoteWheel: () => void;
  onSelectEmote: (emoteId: string) => void;
  onSkipStarter: () => void;
  onJumpBus: () => void;
  onThankBusDriver: () => void;
  onSendChat: (text: string) => void;
  onCloseChat: () => void;
  onPause: () => void;
  onResume: () => void;
  onPlayAgain: () => void;
  onExitToLobby: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  lang,
  profile,
  quality,
  botCount,
  sensitivity,
  volume,
  hud,
  killFeed,
  chatMessages,
  chatOpen,
  floatingTexts,
  hitmarkerActive,
  damageFlash,
  muted,
  emoteWheelOpen,
  emoteWheelIds,
  paused,
  matchResult,
  onToggleMute,
  onQualityChange,
  onBotCountChange,
  onSensitivityChange,
  onVolumeChange,
  onUpdateProfile,
  onToggleMap,
  onToggleInventory,
  onToggleEmoteWheel,
  onSelectEmote,
  onSkipStarter,
  onJumpBus,
  onThankBusDriver,
  onSendChat,
  onCloseChat,
  onPause,
  onResume,
  onPlayAgain,
  onExitToLobby,
}) => {
  const tr = t(lang);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const [chatDraft, setChatDraft] = useState('');
  const [pausePanel, setPausePanel] = useState<'friends' | 'profile' | 'settings'>('friends');
  const [newFriendName, setNewFriendName] = useState('');

  useEffect(() => {
    if (chatOpen) {
      window.setTimeout(() => chatInputRef.current?.focus(), 10);
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!hud || !minimapRef.current) return;
    const canvas = minimapRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = w / (WORLD_RADIUS * 2.15);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#38b864';
    ctx.beginPath();
    ctx.arc(cx, cy, WORLD_RADIUS * scale * 0.92, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 48 * scale, cy - 48 * scale, 96 * scale, 96 * scale);

    // Token chests
    hud.tokenChests.forEach((ch) => {
      if (!ch.opened) {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(cx + ch.x * scale - 2, cy + ch.z * scale - 2, 4, 4);
      }
    });

    // Next safe zone + Storm
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + hud.stormNextX * scale, cy + hud.stormNextZ * scale, hud.stormNextRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx + hud.stormX * scale, cy + hud.stormZ * scale, hud.stormRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Teammates
    hud.teammates.forEach((tm) => {
      if (!tm.alive) return;
      ctx.fillStyle = tm.color;
      ctx.beginPath();
      ctx.arc(cx + tm.x * scale, cy + tm.z * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player Marker
    if (hud.playerMarker) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx + hud.playerMarker.x * scale, cy + hud.playerMarker.z * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nearby enemies
    hud.nearbyEnemies.forEach((en) => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx + en.x * scale, cy + en.z * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player arrow
    const px = cx + hud.playerX * scale;
    const py = cy + hud.playerZ * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-hud.playerYaw);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4.5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-4.5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud]);

  if (!hud && !paused && !matchResult) return null;

  const activeSlot = hud?.inventory[hud.activeSlot] || null;
  const activeWeaponDef = activeSlot ? WEAPON_DEFS[activeSlot.itemType] : null;
  const stormMins = hud ? Math.floor(hud.stormTimer / 60) : 0;
  const stormSecs = hud ? hud.stormTimer % 60 : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {/* Low-HP / Damage Vignette */}
      <div
        className="pointer-events-none fixed inset-0 transition-shadow duration-150"
        style={{
          boxShadow: damageFlash
            ? 'inset 0 0 85px rgba(239, 68, 68, 0.8)'
            : hud?.inStorm
              ? 'inset 0 0 65px rgba(168, 85, 247, 0.55)'
              : 'none',
        }}
      />

      {/* Sniper Scope */}
      {hud?.sniperScoped && (
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_26%,rgba(5,10,20,0.96)_27%)]">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-red-500/75" />
          <div className="absolute bottom-0 left-1/2 top-0 w-px bg-red-500/75" />
        </div>
      )}

      {/* Floating Damage Numbers */}
      {floatingTexts.map((ft) => (
        <div
          key={ft.id}
          className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 font-black drop-shadow-[0_2px_3px_#000]"
          style={{ left: ft.x, top: ft.y, color: ft.color, fontSize: ft.big ? '24px' : '18px' }}
        >
          {ft.text}
        </div>
      ))}

      {/* Active Gameplay HUD */}
      {hud && !matchResult && (
        <>
          {/* Top-Left Status Cluster */}
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg border border-white/20 bg-[#0b1426]/85 px-3 py-1.5 text-sm font-black tabular-nums">
                {tr.alive}: <span className="text-emerald-400">{hud.alive}</span>
              </div>
              <div className="rounded-lg border border-white/20 bg-[#0b1426]/85 px-3 py-1.5 text-sm font-black tabular-nums">
                {tr.kills}: <span className="text-yellow-400">{hud.kills}</span>
              </div>
              <div className="rounded-lg border border-white/20 bg-[#0b1426]/85 px-3 py-1.5 text-sm font-black tabular-nums">
                {tr.tokens}: <span className="text-sky-400">{hud.tokens}</span>
              </div>
              <div className="rounded-lg border border-white/20 bg-[#0b1426]/85 px-3 py-1.5 text-sm font-black tabular-nums">
                {tr.storm}:{' '}
                <span className="text-purple-400">
                  {String(stormMins).padStart(2, '0')}:{String(stormSecs).padStart(2, '0')}
                </span>
              </div>
              {hud.markerDistance !== null && (
                <div className="rounded-lg border border-sky-400/60 bg-[#0b1e36]/90 px-3 py-1.5 text-sm font-black tabular-nums text-sky-300">
                  📍 {tr.markerDist}: {hud.markerDistance}m
                </div>
              )}
            </div>

            {/* Teammates Panel in Squads */}
            {hud.teammates.length > 0 && (
              <div className="flex flex-col gap-1">
                {hud.teammates.map((tm) => (
                  <div
                    key={tm.name}
                    className="flex w-52 items-center justify-between rounded-md border border-white/15 bg-[#0b1426]/85 px-2.5 py-1 text-xs font-bold"
                  >
                    <span className="truncate" style={{ color: tm.color }}>
                      ● {tm.name}
                    </span>
                    <span className="tabular-nums text-white">{tm.alive ? `${tm.hp} HP` : 'KO'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top-Right Minimap & Utility Controls */}
          <div className="absolute right-4 top-4 flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleInventory();
                }}
                className="rounded-lg border border-white/20 bg-[#0b1426]/90 px-2.5 py-1.5 text-xs font-black text-emerald-300 hover:bg-slate-800"
              >
                🎒 [TAB]
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMap();
                }}
                className="rounded-lg border border-white/20 bg-[#0b1426]/90 px-2.5 py-1.5 text-xs font-black text-sky-300 hover:bg-slate-800"
              >
                🗺️ [M]
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleEmoteWheel();
                }}
                className="rounded-lg border border-white/20 bg-[#0b1426]/90 px-2.5 py-1.5 text-xs font-black text-yellow-300 hover:bg-slate-800"
              >
                🕺 [B]
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label="Toggle Mute"
                className="rounded-lg border border-white/20 bg-[#0b1426]/90 px-2.5 py-1.5 text-xs font-black text-white hover:bg-slate-800"
              >
                {muted ? '🔇' : '🔊'}
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onPause();
                }}
                aria-label="Pause"
                className="rounded-lg border border-white/20 bg-[#0b1426]/90 px-2.5 py-1.5 text-xs font-black text-white hover:bg-slate-800"
              >
                ⏸ [P]
              </button>
            </div>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMap();
              }}
              aria-label="Open Tactical Map"
              className="pointer-events-auto overflow-hidden rounded-xl border-2 border-white/30 bg-[#0a1220] shadow-xl"
            >
              <canvas ref={minimapRef} width={168} height={168} className="block h-40 w-40" />
            </button>

            <div className="flex max-w-xs flex-col items-end gap-1">
              {killFeed.map((msg, i) => (
                <div
                  key={i}
                  className="rounded border-l-4 border-yellow-400 bg-[#0b1426]/85 px-2.5 py-1 text-xs font-bold text-white"
                >
                  {msg}
                </div>
              ))}
            </div>
          </div>

          {/* Starter Island Banner */}
          {hud.phase === 'starter_island' && (
            <div className="pointer-events-auto absolute left-1/2 top-20 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl border-2 border-yellow-400 bg-[#0d1a35]/95 px-6 py-3 text-center shadow-2xl">
              <div className="text-xs font-black uppercase tracking-widest text-sky-400">{tr.starterIslandTitle}</div>
              <div className="text-2xl font-black tabular-nums text-yellow-400">00:{String(hud.starterTimer).padStart(2, '0')}</div>
              <div className="text-xs font-semibold text-slate-300">{tr.starterIslandSub}</div>
              <button
                type="button"
                onClick={onSkipStarter}
                className="mt-1 rounded-lg bg-yellow-400 px-4 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
              >
                {tr.skipWait}
              </button>
            </div>
          )}

          {/* Battle Bus Banner */}
          {hud.phase === 'battle_bus' && (
            <div className="pointer-events-auto absolute left-1/2 top-12 flex -translate-x-1/2 flex-col items-center gap-2 rounded-2xl border-2 border-sky-400 bg-[#0b2347]/95 px-6 py-3 text-center shadow-2xl">
              <div className="text-sm font-black tracking-wide text-white">🚌 {tr.busBanner}</div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onJumpBus}
                  className="rounded-xl bg-yellow-400 px-6 py-2 text-sm font-black text-slate-950 shadow hover:brightness-105"
                >
                  {tr.busJumpBtn}
                </button>
                {!hud.thankedBusDriver ? (
                  <button
                    type="button"
                    onClick={onThankBusDriver}
                    className="rounded-xl border border-sky-300/60 bg-sky-500/20 px-4 py-2 text-xs font-black text-sky-200 hover:bg-sky-500/35"
                  >
                    🚌 {tr.thankDriverBtn}
                  </button>
                ) : (
                  <div className="rounded-xl border border-emerald-400/50 bg-emerald-950/80 px-4 py-2 text-xs font-black text-emerald-300">
                    {tr.thankedDriverBadge}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skydiving / Glider Banner */}
          {(hud.freefalling || hud.gliding) && (
            <div className="absolute left-1/2 top-12 -translate-x-1/2 rounded-xl border-2 border-cyan-300 bg-cyan-900/90 px-5 py-2 text-xs font-black tracking-wide text-white">
              🪂 {hud.gliding ? tr.gliderBanner : tr.skydiveBanner}
            </div>
          )}

          {/* Center Crosshair (Contracts smoothly while ADS aiming) */}
          {!hud.inBus && !hud.inVehicle && !hud.sniperScoped && (
            <div
              className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-100 ${
                hud.aiming ? 'h-5 w-5' : 'h-8 w-8'
              }`}
            >
              <div className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-white shadow" />
              <div className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-white shadow" />
              <div className="absolute left-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white shadow" />
              <div className="absolute right-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white shadow" />
              <div
                className={`absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  hud.aiming ? 'bg-cyan-300' : 'bg-yellow-400'
                }`}
              />
              {hitmarkerActive && (
                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rotate-45">
                  <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-red-500" />
                  <div className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-red-500" />
                </div>
              )}
            </div>
          )}

          {/* Reload & Interact Prompt */}
          {hud.reloading && (
            <div className="absolute left-1/2 top-[56%] -translate-x-1/2 text-xs font-black tracking-widest text-yellow-400 drop-shadow">
              {tr.reloading}
            </div>
          )}
          {hud.interactPrompt && (
            <div className="absolute left-1/2 top-[60%] -translate-x-1/2 rounded-lg border-2 border-sky-400 bg-[#0b1426]/95 px-4 py-1.5 text-sm font-black text-white shadow-xl">
              {hud.interactPrompt}
            </div>
          )}

          {/* Vehicle HUD */}
          {hud.inVehicle && (
            <div className="absolute bottom-28 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 rounded-2xl border-2 border-yellow-400/70 bg-[#0b1426]/90 px-6 py-3">
              <div className="text-xs font-black uppercase text-sky-400">{hud.vehicleName}</div>
              <div className="flex items-baseline gap-4">
                <span className="text-3xl font-black tabular-nums text-white">
                  {hud.vehicleSpeedKmh} <span className="text-xs text-slate-400">{tr.speedUnit}</span>
                </span>
                <div className="w-28">
                  <div className="text-[10px] font-black text-yellow-400">{tr.boostLabel}</div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-yellow-400" style={{ width: `${hud.vehicleBoost}%` }} />
                  </div>
                </div>
              </div>
              <div className="text-[11px] font-bold text-slate-300">{tr.carControls}</div>
            </div>
          )}

          {/* Match Chat Feed & Input (above Health & Shield) */}
          <div className="absolute bottom-24 left-5 flex w-80 flex-col gap-1">
            <div className="flex max-h-32 flex-col gap-1 overflow-hidden">
              {chatMessages.slice(-5).map((msg) => (
                <div
                  key={msg.id}
                  data-chat-msg="true"
                  className={`rounded-md border px-2.5 py-1 text-xs font-bold shadow ${
                    msg.kind === 'bus'
                      ? 'border-yellow-400/50 bg-[#1a2238]/90 text-yellow-300'
                      : msg.kind === 'system'
                        ? 'border-sky-400/40 bg-[#0c1d36]/85 text-sky-300'
                        : 'border-white/15 bg-[#0b1426]/85 text-white'
                  }`}
                >
                  {msg.kind === 'bus' ? '🚌 ' : ''}
                  <span className="font-black text-white">{msg.sender}</span>{' '}
                  <span>{msg.text}</span>
                </div>
              ))}
            </div>
            {chatOpen ? (
              <form
                className="pointer-events-auto mt-1 flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (chatDraft.trim()) onSendChat(chatDraft);
                  setChatDraft('');
                  onCloseChat();
                }}
              >
                <input
                  ref={chatInputRef}
                  type="text"
                  maxLength={80}
                  value={chatDraft}
                  onChange={(e) => setChatDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setChatDraft('');
                      onCloseChat();
                    }
                  }}
                  placeholder={tr.chatPlaceholder}
                  className="flex-1 rounded-lg border border-sky-400 bg-[#081124]/95 px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-black text-slate-950"
                >
                  OK
                </button>
              </form>
            ) : (
              <div className="inline-block self-start rounded border border-white/15 bg-[#0b1426]/85 px-2 py-0.5 text-[10px] font-bold text-slate-200 shadow">
                {tr.chatPrompt}
              </div>
            )}
          </div>

          {/* Bottom-Left Health & Shield */}
          <div className="absolute bottom-5 left-5 flex w-72 flex-col gap-2">
            <div className="relative h-6 overflow-hidden rounded-md border-2 border-white/25 bg-[#0b1426]/90">
              <div className="h-full bg-sky-500 transition-all duration-100" style={{ width: `${(hud.shield / hud.maxShield) * 100}%` }} />
              <div className="absolute inset-0 flex items-center justify-between px-2.5 text-xs font-black tabular-nums">
                <span>{tr.shield}</span>
                <span>
                  {Math.ceil(hud.shield)} / {hud.maxShield}
                </span>
              </div>
            </div>
            <div className="relative h-6 overflow-hidden rounded-md border-2 border-white/25 bg-[#0b1426]/90">
              <div className="h-full bg-emerald-500 transition-all duration-100" style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }} />
              <div className="absolute inset-0 flex items-center justify-between px-2.5 text-xs font-black tabular-nums">
                <span>{tr.health}</span>
                <span>
                  {Math.ceil(hud.hp)} / {hud.maxHp}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom-Center Build Banner & Ammo */}
          {!hud.inVehicle && !hud.inBus && (
            <div className="absolute bottom-28 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
              {hud.buildActive && (
                <div className="rounded-lg border-2 border-sky-300 bg-blue-700/90 px-4 py-1 text-xs font-black text-white">
                  {tr.buildBanner}: {hud.buildPiece.toUpperCase()} (10 🪵) |{' '}
                  {lang === 'ru'
                    ? '[Z] Стена [X] Рампа [V] Пол [R] Поворот [Q] Выход'
                    : '[Z] Wall [X] Ramp [V] Floor [R] Rotate [Q] Exit'}
                </div>
              )}
              <div className="rounded-lg border-2 border-white/20 bg-[#0b1426]/90 px-4 py-1 text-sm font-black tabular-nums">
                <span className="text-slate-300">
                  {activeWeaponDef ? (lang === 'ru' ? activeWeaponDef.nameRu : activeWeaponDef.nameEn) : tr.empty}
                </span>{' '}
                —{' '}
                <span className="text-yellow-400">
                  {activeSlot && activeWeaponDef
                    ? activeWeaponDef.type === 'gun' || activeWeaponDef.type === 'launcher'
                      ? `${activeSlot.ammo} / ${activeWeaponDef.magSize}`
                      : activeWeaponDef.type === 'consumable'
                        ? `×${activeSlot.count}`
                        : '∞'
                    : '—'}
                </span>
              </div>
            </div>
          )}

          {/* Bottom-Right Wood + 5-Slot Hotbar */}
          <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2">
            <div className="rounded-lg border-2 border-yellow-400/50 bg-[#0b1426]/90 px-3 py-1 text-xs font-black tabular-nums text-yellow-300">
              🪵 {tr.wood}: {hud.wood}
            </div>
            <div className="flex gap-1.5">
              {hud.inventory.map((slot, idx) => {
                const def = slot ? WEAPON_DEFS[slot.itemType] : null;
                const rar = slot ? RARITY_LIST[slot.rarityIdx] || 'common' : 'common';
                const isSelected = hud.activeSlot === idx;
                return (
                  <div
                    key={idx}
                    className={`relative flex h-16 w-16 flex-col items-center justify-center rounded-xl border-2 bg-[#0f172a]/90 p-1 transition ${
                      isSelected ? '-translate-y-1.5 scale-105 border-yellow-400' : 'border-white/20'
                    }`}
                    style={{
                      borderBottomColor: slot
                        ? rar === 'legendary'
                          ? '#facc15'
                          : rar === 'epic'
                            ? '#c084fc'
                            : rar === 'rare'
                              ? '#38bdf8'
                              : rar === 'uncommon'
                                ? '#4ade80'
                                : '#94a3b8'
                        : undefined,
                    }}
                  >
                    <span className="absolute left-1.5 top-0.5 text-[10px] font-black text-slate-400">{idx + 1}</span>
                    {slot && def && def.type === 'consumable' && slot.count > 1 && (
                      <span className="absolute right-1.5 top-0.5 text-[10px] font-black text-yellow-400">×{slot.count}</span>
                    )}
                    <div className="text-xl">{def ? def.icon : '—'}</div>
                    <div className="w-full truncate text-center text-[10px] font-bold text-white">
                      {def ? (lang === 'ru' ? def.nameRu : def.nameEn) : tr.empty}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </>
      )}

      {/* Fortnite-Style Left Side Escape Menu Drawer (Friends / Profile / Settings) */}
      {paused && !matchResult && (() => {
        const curRank = getRankForRp(profile.rankedPoints);
        const curRankIdx = RANK_DIVISIONS.findIndex((d) => d.id === curRank.id);
        const nextRank = curRankIdx >= 0 && curRankIdx < RANK_DIVISIONS.length - 1 ? RANK_DIVISIONS[curRankIdx + 1] : null;
        const rpProgress = nextRank
          ? Math.min(100, Math.round(((profile.rankedPoints - curRank.minRp) / Math.max(1, nextRank.minRp - curRank.minRp)) * 100))
          : 100;
        const eqSkin = SKINS.find((s) => s.id === profile.equippedSkin) || SKINS[0];
        const eqPickaxe = PICKAXES.find((p) => p.id === profile.equippedPickaxe) || PICKAXES[0];
        const eqGlider = GLIDERS.find((g) => g.id === profile.equippedGlider) || GLIDERS[0];
        const eqBackbling = BACKBLINGS.find((b) => b.id === profile.equippedBackbling) || BACKBLINGS[0];
        const friendsList = profile.friends || [];
        const onlineFriendsCount = friendsList.length;

        return (
          <div className="pointer-events-auto fixed inset-0 z-50 flex bg-[#040a16]/65">
            {/* Left Fortnite Navigation Blade */}
            <aside className="flex h-full w-72 shrink-0 flex-col justify-between border-r-2 border-sky-400/35 bg-[#091224]/96 p-5 shadow-2xl sm:w-80">
              <div>
                {/* Player Mini-Card */}
                <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-[#0f1d38] p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-yellow-400 bg-sky-600 text-lg font-black text-white">
                    {(profile.nickname || 'R').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base font-black text-white">{profile.nickname}</div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold" style={{ color: curRank.color }}>
                      <span>🏆</span>
                      <span>{lang === 'ru' ? curRank.nameRu : curRank.nameEn}</span>
                      <span className="text-slate-400">· {profile.rankedPoints} RP</span>
                    </div>
                  </div>
                </div>

                {/* Drawer Section Tabs */}
                <div className="mt-4 flex flex-col gap-1.5">
                  <button
                    type="button"
                    data-pause-tab="friends"
                    onClick={() => setPausePanel('friends')}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-black transition ${
                      pausePanel === 'friends'
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-white/10 bg-[#0d1930] text-slate-300 hover:bg-[#132342]'
                    }`}
                  >
                    <span>👥 {tr.pauseFriends}</span>
                    <span className="rounded bg-emerald-500/25 px-2 py-0.5 text-xs font-black text-emerald-300">
                      {onlineFriendsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    data-pause-tab="profile"
                    onClick={() => setPausePanel('profile')}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-black transition ${
                      pausePanel === 'profile'
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-white/10 bg-[#0d1930] text-slate-300 hover:bg-[#132342]'
                    }`}
                  >
                    <span>👤 {tr.pauseProfile}</span>
                    <span className="text-xs font-bold text-yellow-400">💎 {profile.tokens}</span>
                  </button>
                  <button
                    type="button"
                    data-pause-tab="settings"
                    onClick={() => setPausePanel('settings')}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm font-black transition ${
                      pausePanel === 'settings'
                        ? 'border-sky-400 bg-sky-500/20 text-white'
                        : 'border-white/10 bg-[#0d1930] text-slate-300 hover:bg-[#132342]'
                    }`}
                  >
                    <span>⚙️ {tr.pauseSettings}</span>
                    <span className="text-xs font-bold text-slate-400">{quality.toUpperCase()}</span>
                  </button>
                </div>

                <div className="mt-4 rounded-lg border border-sky-400/20 bg-[#070f20] px-3 py-2 text-[11px] font-bold text-sky-300">
                  📍 {lang === 'ru' ? 'СКМ — 3D-метка · [TAB] Инвентарь · [ESC] Назад' : 'MMB — 3D Ping · [TAB] Inventory · [ESC] Back'}
                </div>
              </div>

              {/* Bottom Match Action Buttons */}
              <div className="flex flex-col gap-2 pt-4">
                <button
                  type="button"
                  onClick={onResume}
                  className="w-full rounded-xl bg-yellow-400 py-3 text-base font-black text-slate-950 shadow-[0_4px_0_#a16207] hover:bg-yellow-300"
                >
                  ▶ {tr.resume}
                </button>
                <button
                  type="button"
                  onClick={onPlayAgain}
                  className="w-full rounded-xl border border-white/20 bg-slate-800 py-2.5 text-sm font-black text-white hover:bg-slate-700"
                >
                  🔄 {tr.restartMatch}
                </button>
                <button
                  type="button"
                  onClick={onExitToLobby}
                  className="w-full rounded-xl border border-red-400/35 bg-red-950/60 py-2.5 text-sm font-black text-red-200 hover:bg-red-900/60"
                >
                  🚪 {tr.exitToLobby}
                </button>
              </div>
            </aside>

            {/* Adjacent Contextual Side Panel (Friends / Profile / Settings) */}
            <section className="flex h-full w-80 flex-col overflow-y-auto border-r border-white/15 bg-[#0c172e]/96 p-5 shadow-2xl sm:w-96">
              {pausePanel === 'friends' && (
                <div data-pause-panel="friends" className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black italic text-sky-400">{tr.pauseFriends.toUpperCase()}</h3>
                    <span className="text-xs font-black text-emerald-300">
                      {onlineFriendsCount} {tr.pauseOnline}
                    </span>
                  </div>

                  {/* Add Friend Input */}
                  <form
                    className="flex gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const clean = newFriendName.trim();
                      if (!clean) return;
                      onUpdateProfile({
                        ...profile,
                        friends: [
                          {
                            id: `f_${Date.now()}`,
                            name: clean.slice(0, 18),
                            status: 'online',
                            rankLabelRu: 'Золото II',
                            rankLabelEn: 'Gold II',
                            skinNameRu: 'Штурмовик Дельта',
                            skinNameEn: 'Delta Vanguard',
                            invited: false,
                          },
                          ...friendsList,
                        ],
                      });
                      setNewFriendName('');
                    }}
                  >
                    <input
                      type="text"
                      value={newFriendName}
                      onChange={(e) => setNewFriendName(e.target.value)}
                      placeholder={tr.pauseFriendPlaceholder}
                      className="flex-1 rounded-lg border border-white/20 bg-[#070f20] px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-sky-400"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-sky-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-sky-300"
                    >
                      + {tr.pauseAddFriend}
                    </button>
                  </form>

                  {/* Squadmates in current match */}
                  {hud && hud.teammates.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-[11px] font-black tracking-wider text-yellow-400">{tr.pauseSquadInMatch}</div>
                      <div className="flex flex-col gap-1.5">
                        {hud.teammates.map((tm, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-lg border border-yellow-400/30 bg-[#12203f] px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ background: tm.color }} />
                              <span className="text-xs font-black text-white">{tm.name}</span>
                            </div>
                            <span className={`text-xs font-black tabular-nums ${tm.alive ? 'text-emerald-400' : 'text-red-400'}`}>
                              {tm.alive ? `${tm.hp} HP` : 'KO'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Friends List */}
                  <div>
                    <div className="mb-1.5 text-[11px] font-black tracking-wider text-slate-400">{tr.pauseFriendsOnline}</div>
                    <div className="flex flex-col gap-2">
                      {friendsList.map((fr) => {
                        const statusColor =
                          fr.status === 'online'
                            ? 'bg-emerald-400'
                            : fr.status === 'in_match'
                              ? 'bg-amber-400'
                              : 'bg-sky-400';
                        const statusText =
                          fr.status === 'online'
                            ? tr.pauseOnline
                            : fr.status === 'in_match'
                              ? tr.pauseInMatch
                              : tr.pauseInLobby;
                        return (
                          <div
                            key={fr.id}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-[#091326] px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                                <span className="truncate text-xs font-black text-white">{fr.name}</span>
                              </div>
                              <div className="mt-0.5 text-[10px] font-bold text-slate-400">
                                {lang === 'ru' ? fr.rankLabelRu : fr.rankLabelEn} · {lang === 'ru' ? fr.skinNameRu : fr.skinNameEn} · {statusText}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateProfile({
                                  ...profile,
                                  friends: friendsList.map((item) =>
                                    item.id === fr.id ? { ...item, invited: !item.invited } : item
                                  ),
                                });
                              }}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-black transition ${
                                fr.invited
                                  ? 'border border-emerald-400/50 bg-emerald-900/50 text-emerald-300'
                                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                              }`}
                            >
                              {fr.invited ? tr.pauseInvited : tr.pauseInvite}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {pausePanel === 'profile' && (
                <div data-pause-panel="profile" className="flex flex-col gap-4">
                  <h3 className="text-xl font-black italic text-sky-400">{tr.pauseProfile.toUpperCase()}</h3>

                  <div className="rounded-xl border border-white/15 bg-[#091326] p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black" style={{ color: curRank.color }}>
                        🏆 {lang === 'ru' ? curRank.nameRu : curRank.nameEn}
                      </span>
                      <span className="text-xs font-black tabular-nums text-white">{profile.rankedPoints} RP</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full bg-yellow-400" style={{ width: `${rpProgress}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] font-bold text-slate-400">
                      <span>{lang === 'ru' ? 'Макс. RP' : 'Peak RP'}: {profile.bestRankedPoints}</span>
                      <span>💎 {profile.tokens}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl border border-white/10 bg-[#091326] p-2.5">
                      <div className="text-[10px] font-bold text-slate-400">{lang === 'ru' ? 'ПОБЕДЫ' : 'WINS'}</div>
                      <div className="text-xl font-black tabular-nums text-yellow-400">{profile.stats.wins}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#091326] p-2.5">
                      <div className="text-[10px] font-bold text-slate-400">{lang === 'ru' ? 'МАТЧИ' : 'MATCHES'}</div>
                      <div className="text-xl font-black tabular-nums text-white">{profile.stats.matches}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#091326] p-2.5">
                      <div className="text-[10px] font-bold text-slate-400">{tr.elimsLabel}</div>
                      <div className="text-xl font-black tabular-nums text-sky-400">{profile.stats.kills}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#091326] p-2.5">
                      <div className="text-[10px] font-bold text-slate-400">TOP 5</div>
                      <div className="text-xl font-black tabular-nums text-emerald-400">{profile.stats.top5}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#091326] p-3 text-xs font-bold">
                    <div className="mb-2 text-[11px] font-black uppercase text-slate-400">
                      {lang === 'ru' ? 'Экипировка' : 'Equipped Loadout'}
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">{lang === 'ru' ? 'Скин' : 'Skin'}</span>
                      <span className="text-white">{lang === 'ru' ? eqSkin.nameRu : eqSkin.nameEn}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">{lang === 'ru' ? 'Рюкзак' : 'Back Bling'}</span>
                      <span className="text-white">{lang === 'ru' ? eqBackbling.nameRu : eqBackbling.nameEn}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">{lang === 'ru' ? 'Кирка' : 'Pickaxe'}</span>
                      <span className="text-white">{lang === 'ru' ? eqPickaxe.nameRu : eqPickaxe.nameEn}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">{lang === 'ru' ? 'Дельтаплан' : 'Glider'}</span>
                      <span className="text-white">{lang === 'ru' ? eqGlider.nameRu : eqGlider.nameEn}</span>
                    </div>
                  </div>
                </div>
              )}

              {pausePanel === 'settings' && (
                <div data-pause-panel="settings" className="flex flex-col gap-4">
                  <h3 className="text-xl font-black italic text-sky-400">{tr.pauseSettings.toUpperCase()}</h3>

                  {/* Graphics Quality */}
                  <div>
                    <div className="mb-1.5 text-xs font-black text-slate-300">
                      {lang === 'ru' ? 'Качество графики' : 'Graphics Quality'}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['low', 'medium', 'high'] as GraphicsQuality[]).map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => onQualityChange(q)}
                          className={`rounded-lg border py-2 text-xs font-black uppercase ${
                            quality === q
                              ? 'border-yellow-400 bg-yellow-400 text-slate-950'
                              : 'border-white/15 bg-[#091326] text-white hover:bg-slate-800'
                          }`}
                        >
                          {q === 'low' ? (lang === 'ru' ? 'Низк.' : 'Low') : q === 'medium' ? (lang === 'ru' ? 'Средн.' : 'Med') : lang === 'ru' ? 'Высок.' : 'High'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mouse Sensitivity */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-black">
                      <span className="text-slate-300">{lang === 'ru' ? 'Чувствительность' : 'Sensitivity'}</span>
                      <span className="tabular-nums text-yellow-400">{sensitivity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.3}
                      max={2.5}
                      step={0.05}
                      value={sensitivity}
                      onChange={(e) => onSensitivityChange(Number(e.target.value))}
                      className="w-full accent-yellow-400"
                    />
                  </div>

                  {/* Audio Volume + Mute */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs font-black">
                      <span className="text-slate-300">{lang === 'ru' ? 'Громкость' : 'Volume'}</span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-sky-400">{volume}%</span>
                        <button
                          type="button"
                          onClick={onToggleMute}
                          className="rounded border border-white/20 bg-slate-800 px-2 py-0.5 text-[11px] font-black text-white"
                        >
                          {muted ? '🔇 OFF' : '🔊 ON'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={volume}
                      onChange={(e) => onVolumeChange(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  {/* Next-match Bot Count */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-black">
                      <span className="text-slate-300">{lang === 'ru' ? 'Игроков (след. матч)' : 'Players (Next Match)'}</span>
                      <span className="tabular-nums text-emerald-400">{botCount + 1}</span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={99}
                      step={1}
                      value={botCount}
                      onChange={(e) => onBotCountChange(Number(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                  </div>

                  {/* Language Switch */}
                  <div>
                    <div className="mb-1.5 text-xs font-black text-slate-300">{lang === 'ru' ? 'Язык / Language' : 'Language'}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(['ru', 'en'] as Language[]).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => onUpdateProfile({ ...profile, language: l })}
                          className={`rounded-lg border py-2 text-xs font-black uppercase ${
                            profile.language === l
                              ? 'border-sky-400 bg-sky-500 text-slate-950'
                              : 'border-white/15 bg-[#091326] text-white'
                          }`}
                        >
                          {l === 'ru' ? '🇷🇺 Русский' : '🇺🇸 English'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        );
      })()}

      {/* Match End & Victory Royale Screen */}
      {matchResult && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#060d1c]/88 p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border-4 p-8 text-center shadow-2xl ${
              matchResult.victory ? 'border-yellow-400 bg-[#142347]' : 'border-red-400/60 bg-[#0f1a33]'
            }`}
          >
            {matchResult.victory && <div className="mb-2 text-5xl animate-bounce">👑</div>}
            <h2
              className={`text-4xl font-black italic tracking-wide ${
                matchResult.victory ? 'text-yellow-400' : 'text-red-400'
              }`}
            >
              {matchResult.victory ? tr.victoryTitle : tr.defeatTitle}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              {matchResult.victory ? tr.victorySub : tr.defeatSub}
            </p>

            <div className="mt-6 grid grid-cols-4 gap-2 rounded-xl bg-[#081124] p-4">
              <div>
                <div className="text-[10px] font-black text-slate-400">{tr.placeLabel}</div>
                <div className="mt-1 text-2xl font-black tabular-nums text-yellow-400">
                  TOP {matchResult.place}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400">{tr.elimsLabel}</div>
                <div className="mt-1 text-2xl font-black tabular-nums text-sky-400">{matchResult.kills}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400">{tr.damageLabel}</div>
                <div className="mt-1 text-2xl font-black tabular-nums text-white">{matchResult.damage}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-slate-400">{tr.tokensLabel}</div>
                <div className="mt-1 text-2xl font-black tabular-nums text-emerald-400">
                  +{matchResult.tokensEarned}
                </div>
              </div>
            </div>

            {matchResult.mode === 'ranked' && (
              <div className="mt-3 rounded-xl border border-sky-400/30 bg-[#081124] p-3 text-sm font-black">
                <span className="text-slate-300">{tr.rpLabel}: </span>
                <span className={matchResult.rpDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {matchResult.rpDelta >= 0 ? `+${matchResult.rpDelta}` : matchResult.rpDelta} RP
                </span>
                {(() => {
                  const oldDiv = RANK_DIVISIONS.find((r) => r.id === matchResult.oldRankId) || RANK_DIVISIONS[0];
                  const newDiv = RANK_DIVISIONS.find((r) => r.id === matchResult.newRankId) || RANK_DIVISIONS[0];
                  return (
                    <span className="ml-2 text-yellow-300">
                      ({lang === 'ru' ? oldDiv.nameRu : oldDiv.nameEn} →{' '}
                      {lang === 'ru' ? newDiv.nameRu : newDiv.nameEn})
                    </span>
                  );
                })()}
              </div>
            )}

            {matchResult.mode === 'tournament' && (
              <div className="mt-3 rounded-xl border border-purple-400/40 bg-[#081124] p-3 text-sm font-black text-purple-300">
                {tr.tourneyPtsLabel}: +{matchResult.tournamentPointsEarned}
              </div>
            )}

            {matchResult.unlockedTournamentSkinId && (() => {
              const unlockedSkin = SKINS.find((s) => s.id === matchResult.unlockedTournamentSkinId);
              if (!unlockedSkin) return null;
              return (
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-yellow-400 bg-yellow-400/15 px-4 py-2.5 text-sm font-black text-yellow-300">
                  <span>🏆</span>
                  <span>
                    {tr.unlockedTournamentSkinMsg}:{' '}
                    <span className="text-white">{lang === 'ru' ? unlockedSkin.nameRu : unlockedSkin.nameEn}</span>
                  </span>
                </div>
              );
            })()}

            <button
              type="button"
              data-start="true"
              onClick={onPlayAgain}
              className="mt-6 w-full rounded-xl bg-yellow-400 py-3.5 text-lg font-black text-slate-950 shadow-[0_5px_0_#a16207] hover:brightness-105"
            >
              {tr.restartMatch}
            </button>
            <button
              type="button"
              onClick={onExitToLobby}
              className="mt-3 w-full rounded-xl border border-white/20 bg-slate-800 py-3 text-sm font-black text-white hover:bg-slate-700"
            >
              {tr.exitToLobby}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
