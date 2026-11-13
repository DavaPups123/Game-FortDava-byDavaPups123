import React, { useState } from 'react';
import {
  BACKBLINGS,
  EMOTES,
  GLIDERS,
  PICKAXES,
  RARITY_COLORS,
  SKINS,
  TOURNAMENTS,
  VEHICLE_MODELS,
  VEHICLE_SKINS,
} from '../game/data';
import { t } from '../game/i18n';
import { buildTournamentLeaderboard, getNextRank, getRankForRp } from '../game/rules';
import {
  GameModeId,
  GraphicsQuality,
  Language,
  LobbyTabId,
  PlayerProfile,
  RarityId,
  TeamSizeId,
  VehicleTypeId,
} from '../game/types';
import { usePWAInstall } from '../hooks/usePWAInstall';

type ShopPreviewPayload = {
  mode: 'character' | 'vehicle';
  skinId?: string;
  carSkinId?: string;
  emoteId?: string;
  pickaxeId?: string;
  gliderId?: string;
  backblingId?: string;
};

type ShopFilterId = 'all' | 'skins' | 'backblings' | 'pickaxes' | 'gliders' | 'cars' | 'emotes' | 'perks';
type PreviewItemState =
  | { kind: 'skin' | 'backbling' | 'pickaxe' | 'glider' | 'car' | 'emote'; id: string }
  | null;

interface LobbyOverlayProps {
  profile: PlayerProfile;
  activeTab: LobbyTabId;
  selectedMode: GameModeId;
  selectedTeamSize: TeamSizeId;
  quality: GraphicsQuality;
  botCount: number;
  sensitivity: number;
  volume: number;
  onTabChange: (tab: LobbyTabId) => void;
  onModeChange: (mode: GameModeId) => void;
  onTeamSizeChange: (team: TeamSizeId) => void;
  onQualityChange: (q: GraphicsQuality) => void;
  onBotCountChange: (c: number) => void;
  onSensitivityChange: (s: number) => void;
  onVolumeChange: (v: number) => void;
  onUpdateProfile: (next: PlayerProfile) => void;
  onPreviewEmote: (emoteId: string) => void;
  onShopPreview?: (preview: ShopPreviewPayload | null) => void;
  onOpenEmoteWheel?: () => void;
  onStartMatchmaking: () => void;
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  profile,
  activeTab,
  selectedMode,
  selectedTeamSize,
  quality,
  botCount,
  sensitivity,
  volume,
  onTabChange,
  onModeChange,
  onTeamSizeChange,
  onQualityChange,
  onBotCountChange,
  onSensitivityChange,
  onVolumeChange,
  onUpdateProfile,
  onPreviewEmote,
  onShopPreview,
  onOpenEmoteWheel,
  onStartMatchmaking,
}) => {
  const lang: Language = profile.language;
  const tr = t(lang);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [selectedEmoteSlot, setSelectedEmoteSlot] = useState<number>(0);
  const [lockerSubtab, setLockerSubtab] = useState<'skins' | 'backblings' | 'pickaxes' | 'gliders'>('skins');
  const [shopFilter, setShopFilter] = useState<ShopFilterId>('all');
  const [previewItem, setPreviewItem] = useState<PreviewItemState>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const showToast = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 2600);
  };

  const currentRank = getRankForRp(profile.rankedPoints);
  const nextRank = getNextRank(profile.rankedPoints);
  const rankProgressPct = nextRank
    ? Math.min(100, Math.round(((profile.rankedPoints - currentRank.minRp) / (nextRank.minRp - currentRank.minRp)) * 100))
    : 100;

  const activeTournament = TOURNAMENTS.find((c) => c.id === profile.activeTournamentId) || TOURNAMENTS[0];
  const playerTourneyScore = profile.tournamentScores[activeTournament.id] || { points: 0, wins: 0, kills: 0 };
  const leaderboard = buildTournamentLeaderboard(activeTournament.id, profile.nickname, playerTourneyScore);

  const tabs: Array<{ id: LobbyTabId; label: string }> = [
    { id: 'play', label: tr.tabPlay },
    { id: 'locker', label: tr.tabLocker },
    { id: 'shop', label: tr.tabShop },
    { id: 'emotes', label: tr.tabEmotes },
    { id: 'garage', label: tr.tabGarage },
    { id: 'compete', label: tr.tabCompete },
    { id: 'profile', label: tr.tabProfile },
    { id: 'settings', label: tr.tabSettings },
  ];

  const handleBuySkin = (skinId: string, price: number) => {
    const sk = SKINS.find((s) => s.id === skinId);
    if (profile.unlockedSkins.includes(skinId)) {
      onUpdateProfile({ ...profile, equippedSkin: skinId });
      return;
    }
    if (sk?.tournamentRewardId) {
      showToast(lang === 'ru' ? 'Скин открывается за победу в турнире!' : 'Win the Tournament to unlock this skin!');
      return;
    }
    if (profile.tokens < price) {
      showToast(lang === 'ru' ? `Нужно ${price} Токенов!` : `Need ${price} Tokens!`);
      return;
    }
    onUpdateProfile({
      ...profile,
      tokens: profile.tokens - price,
      unlockedSkins: [...profile.unlockedSkins, skinId],
      equippedSkin: skinId,
    });
  };

  const handleBuyBackbling = (id: string, price: number) => {
    if (profile.unlockedBackblings.includes(id)) {
      onUpdateProfile({ ...profile, equippedBackbling: id });
      return;
    }
    if (profile.tokens < price) {
      showToast(lang === 'ru' ? `Нужно ${price} Токенов!` : `Need ${price} Tokens!`);
      return;
    }
    onUpdateProfile({
      ...profile,
      tokens: profile.tokens - price,
      unlockedBackblings: [...profile.unlockedBackblings, id],
      equippedBackbling: id,
    });
  };

  const handleBuyPickaxe = (id: string, price: number) => {
    if (profile.unlockedPickaxes.includes(id)) {
      onUpdateProfile({ ...profile, equippedPickaxe: id });
      return;
    }
    if (profile.tokens < price) {
      showToast(lang === 'ru' ? `Нужно ${price} Токенов!` : `Need ${price} Tokens!`);
      return;
    }
    onUpdateProfile({
      ...profile,
      tokens: profile.tokens - price,
      unlockedPickaxes: [...profile.unlockedPickaxes, id],
      equippedPickaxe: id,
    });
  };

  const handleBuyGlider = (id: string, price: number) => {
    if (profile.unlockedGliders.includes(id)) {
      onUpdateProfile({ ...profile, equippedGlider: id });
      return;
    }
    if (profile.tokens < price) {
      showToast(lang === 'ru' ? `Нужно ${price} Токенов!` : `Need ${price} Tokens!`);
      return;
    }
    onUpdateProfile({
      ...profile,
      tokens: profile.tokens - price,
      unlockedGliders: [...profile.unlockedGliders, id],
      equippedGlider: id,
    });
  };

  const handleBuyCarSkin = (skinId: string, price: number) => {
    if (profile.unlockedCarSkins.includes(skinId)) {
      onUpdateProfile({ ...profile, equippedCarSkin: skinId });
      return;
    }
    if (profile.tokens < price) {
      showToast(lang === 'ru' ? `Нужно ${price} Токенов!` : `Need ${price} Tokens!`);
      return;
    }
    onUpdateProfile({
      ...profile,
      tokens: profile.tokens - price,
      unlockedCarSkins: [...profile.unlockedCarSkins, skinId],
      equippedCarSkin: skinId,
    });
  };

  const handleBuyEmote = (emoteId: string, price: number) => {
    if (profile.unlockedEmotes.includes(emoteId)) {
      onPreviewEmote(emoteId);
      return;
    }
    if (profile.tokens < price) {
      showToast(lang === 'ru' ? `Нужно ${price} Токенов!` : `Need ${price} Tokens!`);
      return;
    }
    const nextWheel = [...profile.emoteWheel];
    nextWheel[selectedEmoteSlot] = emoteId;
    onUpdateProfile({
      ...profile,
      tokens: profile.tokens - price,
      unlockedEmotes: [...profile.unlockedEmotes, emoteId],
      emoteWheel: nextWheel,
    });
    onPreviewEmote(emoteId);
  };

  const equippedSkinDef = SKINS.find((s) => s.id === profile.equippedSkin) || SKINS[0];

  const renderShopCard = (opts: {
    keyId: string;
    kind: NonNullable<PreviewItemState>['kind'];
    id: string;
    title: string;
    subtitle: string;
    rarity: RarityId;
    swatch: string;
    icon: string;
    price: number;
    owned: boolean;
    featured?: boolean;
    tournamentLocked?: boolean;
    onPreview: () => void;
  }) => {
    const isPreviewing = previewItem?.kind === opts.kind && previewItem.id === opts.id;
    const rarInfo = RARITY_COLORS[opts.rarity];
    return (
      <button
        key={opts.keyId}
        type="button"
        onClick={opts.onPreview}
        className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border-2 p-2.5 text-left transition ${
          opts.featured ? 'min-h-[126px]' : 'min-h-[108px]'
        } ${
          isPreviewing
            ? 'border-yellow-400 ring-2 ring-yellow-400/50'
            : opts.owned
              ? 'border-emerald-400/75 hover:border-yellow-400'
              : 'border-white/20 hover:border-sky-300'
        }`}
        style={{ background: rarInfo.gradient }}
      >
        {/* Top Rarity & Icon Strip */}
        <div className="flex items-start justify-between gap-1.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/30 text-lg shadow"
            style={{ background: opts.swatch }}
          >
            {opts.icon}
          </div>
          <span
            className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
            style={{ color: rarInfo.css }}
          >
            {tr.rarities[opts.rarity]}
          </span>
        </div>

        {/* Item Name & Type */}
        <div className="mt-2">
          <div className="truncate text-xs font-black uppercase tracking-wide text-white drop-shadow">
            {opts.title}
          </div>
          <div className="truncate text-[10px] font-bold text-slate-200/80">{opts.subtitle}</div>
        </div>

        {/* Fortnite Price Bar */}
        <div className="mt-2 flex items-center justify-between border-t border-white/15 pt-1.5 text-[11px] font-black">
          {isPreviewing ? (
            <span className="text-yellow-300">{lang === 'ru' ? '👁️ НА СЦЕНЕ' : '👁️ PREVIEW'}</span>
          ) : opts.owned ? (
            <span className="text-emerald-300">{lang === 'ru' ? '✔ КУПЛЕНО' : '✔ OWNED'}</span>
          ) : opts.tournamentLocked ? (
            <span className="text-amber-300">🏆 {lang === 'ru' ? 'ТУРНИР' : 'CUP PRIZE'}</span>
          ) : (
            <span className="text-yellow-300">💎 {opts.price}</span>
          )}
          <span className="text-[9px] font-extrabold text-white/60 group-hover:text-white">3D →</span>
        </div>
      </button>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between bg-[radial-gradient(circle_at_50%_45%,transparent_30%,rgba(6,13,28,0.75)_100%)]">
      {/* Top Navigation Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-gradient-to-b from-[#070f22]/95 to-transparent px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs font-black italic tracking-wider text-slate-950 shadow">
            {tr.chapterBadge}
          </div>
          <span className="text-lg font-black italic tracking-wider text-white drop-shadow">{tr.appTitle}</span>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-white/15 bg-[#0b1630]/90 p-1">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => {
                setPreviewItem(null);
                onTabChange(tb.id);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition ${
                activeTab === tb.id
                  ? 'bg-yellow-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUpdateProfile({ ...profile, language: lang === 'ru' ? 'en' : 'ru' })}
            className="rounded-lg border border-white/20 bg-slate-800/90 px-2.5 py-1.5 text-xs font-black text-white hover:bg-slate-700"
            title="Switch Language / Сменить язык"
          >
            {lang === 'ru' ? '🇷🇺 RU' : '🇺🇸 EN'}
          </button>

          {isInstallable && !isInstalled && (
            <button
              type="button"
              onClick={() => install()}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-400"
            >
              📲 {tr.installApp}
            </button>
          )}
          {!isInstallable && isIOS && !isInstalled && (
            <button
              type="button"
              onClick={() => setShowIOSHint(true)}
              className="rounded-lg border border-emerald-400/50 bg-emerald-950/70 px-3 py-1.5 text-xs font-black text-emerald-300"
            >
              📲 iOS App
            </button>
          )}

          <div className="flex items-center gap-1.5 rounded-xl border-2 border-sky-400 bg-[#0c274d] px-3.5 py-1.5 text-sm font-black tabular-nums text-white shadow">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white bg-sky-400 text-[11px] font-black text-slate-950">
              T
            </span>
            <span>{profile.tokens}</span>
          </div>
        </div>
      </div>

      {notice && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl border border-yellow-400 bg-[#0d172a] px-5 py-2 text-sm font-black text-yellow-300 shadow-xl">
          {notice}
        </div>
      )}

      {/* Middle Area: Left Mode / Rank Summary + Right Active Drawer */}
      <div className="relative flex flex-1 items-center justify-between px-6 py-2">
        {/* Left Player & Mode Card */}
        <div className="pointer-events-auto hidden w-76 flex-col gap-3 rounded-2xl border-2 border-sky-400/35 bg-[#0b162c]/90 p-4 shadow-2xl lg:flex">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase text-sky-400">{profile.nickname}</div>
              <div className="text-base font-black text-white">
                {lang === 'ru' ? equippedSkinDef.nameRu : equippedSkinDef.nameEn}
              </div>
            </div>
            <button
              type="button"
              onClick={() => (onOpenEmoteWheel ? onOpenEmoteWheel() : onPreviewEmote(profile.emoteWheel[0] || 'floss'))}
              className="rounded-lg bg-yellow-400/20 px-2.5 py-1 text-xs font-black text-yellow-300 hover:bg-yellow-400/30"
            >
              🕺 [B]
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#081124] p-3">
            <div className="flex items-center justify-between text-xs font-black">
              <span style={{ color: currentRank.color }}>
                🏆 {lang === 'ru' ? currentRank.nameRu : currentRank.nameEn}
              </span>
              <span className="tabular-nums text-slate-300">{profile.rankedPoints} RP</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-sky-400" style={{ width: `${rankProgressPct}%` }} />
            </div>
          </div>

          <div className="text-xs font-semibold leading-relaxed text-slate-300">
            <div className="mb-1 text-[11px] font-black uppercase text-sky-400">
              {lang === 'ru' ? 'УПРАВЛЕНИЕ' : 'CONTROLS'}
            </div>
            <div>
              <b className="text-yellow-300">WASD</b> {lang === 'ru' ? 'Бег / Руль' : 'Move / Drive'} •{' '}
              <b className="text-yellow-300">Shift</b> {lang === 'ru' ? 'Спринт / Нитро' : 'Sprint / Nitro'}
            </div>
            <div>
              <b className="text-yellow-300">M</b> {lang === 'ru' ? 'Карта' : 'Map'} •{' '}
              <b className="text-yellow-300">{lang === 'ru' ? 'СКМ' : 'MMB'}</b> {lang === 'ru' ? 'Метка' : 'Ping'} •{' '}
              <b className="text-yellow-300">TAB</b> {lang === 'ru' ? 'Инвентарь' : 'Inventory'}
            </div>
            <div>
              <b className="text-yellow-300">E</b> {lang === 'ru' ? 'Лут / Авто / Сундук' : 'Loot / Car / Chest'} •{' '}
              <b className="text-yellow-300">Q</b> {lang === 'ru' ? 'Стройка' : 'Build'} •{' '}
              <b className="text-yellow-300">B</b> {lang === 'ru' ? 'Танцы' : 'Emotes'}
            </div>
          </div>
        </div>

        {/* Center 3D Drag Hint */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-[#0a1428]/80 px-4 py-1 text-xs font-bold text-slate-300">
          ↔ {tr.dragHint}
        </div>

        {/* Right Active Tab Drawer */}
        {activeTab !== 'play' && (
          <div
            className={`pointer-events-auto ml-auto max-h-[65vh] w-full overflow-y-auto rounded-2xl border-2 border-sky-400/45 bg-[#0b162c]/95 p-5 shadow-2xl ${
              activeTab === 'shop' ? 'max-w-xl' : 'max-w-md'
            }`}
          >
            {/* LOCKER TAB (Skins, Backblings, Pickaxes, Gliders) */}
            {activeTab === 'locker' && (
              <div>
                <h2 className="text-xl font-black italic text-yellow-400">{tr.tabLocker}</h2>
                <p className="mb-2.5 text-xs font-semibold text-slate-400">
                  {lang === 'ru'
                    ? 'Выбирайте скины, бекпаки, кирки и дельтапланы с просмотром в 3D'
                    : 'Equip skins, back bling, pickaxes, and gliders with 3D preview'}
                </p>

                <div className="mb-3 flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'skins', label: tr.shopFilterSkins },
                      { id: 'backblings', label: tr.shopFilterBackblings },
                      { id: 'pickaxes', label: tr.shopFilterPickaxes },
                      { id: 'gliders', label: tr.shopFilterGliders },
                    ] as const
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setLockerSubtab(sub.id);
                        if (sub.id === 'pickaxes') {
                          onShopPreview?.({ mode: 'character', pickaxeId: profile.equippedPickaxe });
                        } else if (sub.id === 'gliders') {
                          onShopPreview?.({ mode: 'character', gliderId: profile.equippedGlider });
                        } else if (sub.id === 'backblings') {
                          onShopPreview?.({ mode: 'character', backblingId: profile.equippedBackbling });
                        } else {
                          onShopPreview?.(null);
                        }
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase ${
                        lockerSubtab === sub.id ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>

                {lockerSubtab === 'skins' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {SKINS.filter((s) => profile.unlockedSkins.includes(s.id)).map((skin) => {
                      const equipped = profile.equippedSkin === skin.id;
                      const curStyleId = profile.equippedSkinStyles[skin.id] || skin.styles[0].id;
                      const curStyle = skin.styles.find((st) => st.id === curStyleId) || skin.styles[0];
                      return (
                        <div
                          key={skin.id}
                          className={`rounded-xl border-2 p-2.5 transition ${
                            equipped ? 'border-yellow-400 bg-slate-800/95' : 'border-white/15 bg-slate-900/85 hover:border-sky-400'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onShopPreview?.(null);
                              onUpdateProfile({ ...profile, equippedSkin: skin.id });
                            }}
                            className="w-full text-left"
                          >
                            <div className="mb-2 h-8 w-full rounded-md border border-white/25" style={{ background: curStyle.swatch }} />
                            <div className="text-xs font-black text-white">{lang === 'ru' ? skin.nameRu : skin.nameEn}</div>
                            <div className="text-[10px] font-extrabold uppercase" style={{ color: RARITY_COLORS[skin.rarity].css }}>
                              {tr.rarities[skin.rarity]}
                            </div>
                          </button>
                          <div className="mt-2 flex gap-1">
                            {skin.styles.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  onShopPreview?.(null);
                                  onUpdateProfile({
                                    ...profile,
                                    equippedSkin: skin.id,
                                    equippedSkinStyles: { ...profile.equippedSkinStyles, [skin.id]: st.id },
                                  });
                                }}
                                className={`flex-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  curStyleId === st.id ? 'bg-sky-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {lang === 'ru' ? st.nameRu : st.nameEn}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {lockerSubtab === 'backblings' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {BACKBLINGS.filter((b) => profile.unlockedBackblings.includes(b.id)).map((bb) => {
                      const equipped = profile.equippedBackbling === bb.id;
                      return (
                        <button
                          key={bb.id}
                          type="button"
                          onClick={() => {
                            onUpdateProfile({ ...profile, equippedBackbling: bb.id });
                            onShopPreview?.({ mode: 'character', backblingId: bb.id });
                          }}
                          className={`rounded-xl border-2 p-2.5 text-left transition ${
                            equipped ? 'border-yellow-400 bg-slate-800' : 'border-white/15 bg-slate-900 hover:border-sky-400'
                          }`}
                        >
                          <div className="mb-2 h-7 w-full rounded" style={{ background: bb.swatch }} />
                          <div className="text-xs font-black text-white">{lang === 'ru' ? bb.nameRu : bb.nameEn}</div>
                          <div className="mt-0.5 text-[10px] font-extrabold uppercase" style={{ color: RARITY_COLORS[bb.rarity].css }}>
                            {equipped ? '✔ EQUIPPED' : tr.rarities[bb.rarity]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {lockerSubtab === 'pickaxes' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {PICKAXES.filter((pk) => profile.unlockedPickaxes.includes(pk.id)).map((pk) => {
                      const equipped = profile.equippedPickaxe === pk.id;
                      return (
                        <button
                          key={pk.id}
                          type="button"
                          onClick={() => {
                            onUpdateProfile({ ...profile, equippedPickaxe: pk.id });
                            onShopPreview?.({ mode: 'character', pickaxeId: pk.id });
                          }}
                          className={`rounded-xl border-2 p-2.5 text-left transition ${
                            equipped ? 'border-yellow-400 bg-slate-800' : 'border-white/15 bg-slate-900 hover:border-sky-400'
                          }`}
                        >
                          <div className="mb-2 h-7 w-full rounded" style={{ background: pk.swatch }} />
                          <div className="text-xs font-black text-white">{lang === 'ru' ? pk.nameRu : pk.nameEn}</div>
                          <div className="mt-0.5 text-[10px] font-extrabold uppercase" style={{ color: RARITY_COLORS[pk.rarity].css }}>
                            {equipped ? '✔ EQUIPPED' : tr.rarities[pk.rarity]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {lockerSubtab === 'gliders' && (
                  <div className="grid grid-cols-2 gap-2.5">
                    {GLIDERS.filter((gl) => profile.unlockedGliders.includes(gl.id)).map((gl) => {
                      const equipped = profile.equippedGlider === gl.id;
                      return (
                        <button
                          key={gl.id}
                          type="button"
                          onClick={() => {
                            onUpdateProfile({ ...profile, equippedGlider: gl.id });
                            onShopPreview?.({ mode: 'character', gliderId: gl.id });
                          }}
                          className={`rounded-xl border-2 p-2.5 text-left transition ${
                            equipped ? 'border-yellow-400 bg-slate-800' : 'border-white/15 bg-slate-900 hover:border-sky-400'
                          }`}
                        >
                          <div className="mb-2 h-7 w-full rounded" style={{ background: gl.swatch }} />
                          <div className="text-xs font-black text-white">{lang === 'ru' ? gl.nameRu : gl.nameEn}</div>
                          <div className="mt-0.5 text-[10px] font-extrabold uppercase" style={{ color: RARITY_COLORS[gl.rarity].css }}>
                            {equipped ? '✔ EQUIPPED' : tr.rarities[gl.rarity]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FORTNITE-STYLE ITEM SHOP WITH LIVE 3D PREVIEW */}
            {activeTab === 'shop' && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-black italic tracking-wide text-yellow-400">{tr.tabShop}</h2>
                    <p className="text-[11px] font-semibold text-sky-300">{tr.shopPreviewHint}</p>
                  </div>
                  <div className="rounded-lg border border-sky-400/40 bg-[#081329] px-2.5 py-1 text-[10px] font-black text-sky-300">
                    💎 {profile.tokens}
                  </div>
                </div>

                <div className="my-3 flex flex-wrap gap-1">
                  {(
                    [
                      { id: 'all', label: tr.shopFilterAll },
                      { id: 'skins', label: tr.shopFilterSkins },
                      { id: 'backblings', label: tr.shopFilterBackblings },
                      { id: 'pickaxes', label: tr.shopFilterPickaxes },
                      { id: 'gliders', label: tr.shopFilterGliders },
                      { id: 'cars', label: tr.shopFilterCars },
                      { id: 'emotes', label: tr.shopFilterEmotes },
                      { id: 'perks', label: tr.shopFilterPerks },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setShopFilter(f.id);
                        setPreviewItem(null);
                        onShopPreview?.(null);
                      }}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-black uppercase ${
                        shopFilter === f.id ? 'bg-yellow-400 text-slate-950 shadow' : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Active 3D Preview Inspection Bar */}
                {previewItem && (() => {
                  const closePreview = () => {
                    setPreviewItem(null);
                    onShopPreview?.(null);
                  };

                  if (previewItem.kind === 'skin') {
                    const sk = SKINS.find((s) => s.id === previewItem.id);
                    if (!sk) return null;
                    const owned = profile.unlockedSkins.includes(sk.id);
                    const cupName = sk.tournamentRewardId
                      ? TOURNAMENTS.find((c) => c.id === sk.tournamentRewardId)?.[lang === 'ru' ? 'nameRu' : 'nameEn']
                      : undefined;
                    return (
                      <div className="mb-3 rounded-xl border-2 border-yellow-400 bg-[#081329] p-3 shadow-lg">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                          <span>👁️ {tr.shopPreviewTitle}</span>
                          <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-white">{lang === 'ru' ? sk.nameRu : sk.nameEn}</div>
                            <div className="text-[10px] font-bold uppercase" style={{ color: RARITY_COLORS[sk.rarity].css }}>
                              {tr.rarities[sk.rarity]} {cupName ? `• 🏆 ${cupName}` : ''}
                            </div>
                          </div>
                          {sk.tournamentRewardId && !owned ? (
                            <button
                              type="button"
                              onClick={() => onTabChange('compete')}
                              className="rounded-lg bg-purple-500 px-3 py-1.5 text-xs font-black text-white hover:bg-purple-400"
                            >
                              🏆 {lang === 'ru' ? 'К ТУРНИРАМ' : 'GO TO CUP'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleBuySkin(sk.id, sk.price);
                                if (owned) closePreview();
                              }}
                              className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
                            >
                              {owned ? (lang === 'ru' ? 'ВЫБРАТЬ' : 'EQUIP') : `${tr.shopBuyBtn} 💎 ${sk.price}`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (previewItem.kind === 'backbling') {
                    const bb = BACKBLINGS.find((b) => b.id === previewItem.id);
                    if (!bb) return null;
                    const owned = profile.unlockedBackblings.includes(bb.id);
                    return (
                      <div className="mb-3 rounded-xl border-2 border-yellow-400 bg-[#081329] p-3 shadow-lg">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                          <span>👁️ {tr.shopPreviewTitle} · {tr.shopFilterBackblings}</span>
                          <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-white">{lang === 'ru' ? bb.nameRu : bb.nameEn}</div>
                            <div className="text-[10px] font-bold uppercase" style={{ color: RARITY_COLORS[bb.rarity].css }}>
                              {tr.rarities[bb.rarity]}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleBuyBackbling(bb.id, bb.price);
                              if (owned) closePreview();
                            }}
                            className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
                          >
                            {owned ? (lang === 'ru' ? 'НАДЕТЬ' : 'EQUIP') : `${tr.shopBuyBtn} 💎 ${bb.price}`}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (previewItem.kind === 'pickaxe') {
                    const pk = PICKAXES.find((p) => p.id === previewItem.id);
                    if (!pk) return null;
                    const owned = profile.unlockedPickaxes.includes(pk.id);
                    return (
                      <div className="mb-3 rounded-xl border-2 border-yellow-400 bg-[#081329] p-3 shadow-lg">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                          <span>👁️ {tr.shopPreviewTitle} · {tr.shopFilterPickaxes}</span>
                          <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-white">{lang === 'ru' ? pk.nameRu : pk.nameEn}</div>
                            <div className="text-[10px] font-bold uppercase" style={{ color: RARITY_COLORS[pk.rarity].css }}>
                              {tr.rarities[pk.rarity]}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleBuyPickaxe(pk.id, pk.price);
                              if (owned) closePreview();
                            }}
                            className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
                          >
                            {owned ? (lang === 'ru' ? 'ВЫБРАТЬ' : 'EQUIP') : `${tr.shopBuyBtn} 💎 ${pk.price}`}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (previewItem.kind === 'glider') {
                    const gl = GLIDERS.find((g) => g.id === previewItem.id);
                    if (!gl) return null;
                    const owned = profile.unlockedGliders.includes(gl.id);
                    return (
                      <div className="mb-3 rounded-xl border-2 border-yellow-400 bg-[#081329] p-3 shadow-lg">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                          <span>👁️ {tr.shopPreviewTitle} · {tr.shopFilterGliders}</span>
                          <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-white">{lang === 'ru' ? gl.nameRu : gl.nameEn}</div>
                            <div className="text-[10px] font-bold uppercase" style={{ color: RARITY_COLORS[gl.rarity].css }}>
                              {tr.rarities[gl.rarity]}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleBuyGlider(gl.id, gl.price);
                              if (owned) closePreview();
                            }}
                            className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
                          >
                            {owned ? (lang === 'ru' ? 'ВЫБРАТЬ' : 'EQUIP') : `${tr.shopBuyBtn} 💎 ${gl.price}`}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (previewItem.kind === 'car') {
                    const cs = VEHICLE_SKINS.find((s) => s.id === previewItem.id);
                    if (!cs) return null;
                    const owned = profile.unlockedCarSkins.includes(cs.id);
                    return (
                      <div className="mb-3 rounded-xl border-2 border-yellow-400 bg-[#081329] p-3 shadow-lg">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                          <span>👁️ {tr.shopPreviewTitle}</span>
                          <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-black text-white">{lang === 'ru' ? cs.nameRu : cs.nameEn}</div>
                            <div className="text-[10px] font-bold uppercase" style={{ color: RARITY_COLORS[cs.rarity].css }}>
                              {tr.rarities[cs.rarity]}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              handleBuyCarSkin(cs.id, cs.price);
                              closePreview();
                            }}
                            className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
                          >
                            {owned ? (lang === 'ru' ? 'ВЫБРАТЬ' : 'EQUIP') : `${tr.shopBuyBtn} 💎 ${cs.price}`}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const em = EMOTES.find((e) => e.id === previewItem.id);
                  if (!em) return null;
                  const owned = profile.unlockedEmotes.includes(em.id);
                  return (
                    <div className="mb-3 rounded-xl border-2 border-yellow-400 bg-[#081329] p-3 shadow-lg">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase text-sky-400">
                        <span>👁️ {tr.shopPreviewTitle}</span>
                        <button type="button" onClick={closePreview} className="text-slate-400 hover:text-white">
                          ✕
                        </button>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-black text-white">
                            {em.icon} {lang === 'ru' ? em.nameRu : em.nameEn}
                          </div>
                          <div className="text-[10px] font-bold text-slate-300">{lang === 'ru' ? em.descRu : em.descEn}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleBuyEmote(em.id, em.price);
                            closePreview();
                          }}
                          className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950 hover:brightness-105"
                        >
                          {owned ? (lang === 'ru' ? 'ТАНЦЕВАТЬ' : 'DANCE') : `${tr.shopBuyBtn} 💎 ${em.price}`}
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ALL (FORTNITE FEATURED + DAILY SECTIONS) */}
                {shopFilter === 'all' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-yellow-400">
                        <span>★ {tr.shopFeatured}</span>
                        <span className="text-slate-400">EPIC & LEGENDARY</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {SKINS.filter((s) => ['golden_midas', 'mecha_strike', 'astral_nova'].includes(s.id)).map((sk) =>
                          renderShopCard({
                            keyId: `feat_sk_${sk.id}`,
                            kind: 'skin',
                            id: sk.id,
                            title: lang === 'ru' ? sk.nameRu : sk.nameEn,
                            subtitle: tr.shopFilterSkins,
                            rarity: sk.rarity,
                            swatch: sk.styles[0].swatch,
                            icon: '🦸',
                            price: sk.price,
                            owned: profile.unlockedSkins.includes(sk.id),
                            featured: true,
                            onPreview: () => {
                              setPreviewItem({ kind: 'skin', id: sk.id });
                              onShopPreview?.({ mode: 'character', skinId: sk.id });
                            },
                          })
                        )}
                        {GLIDERS.filter((g) => g.id === 'dragon_glide').map((gl) =>
                          renderShopCard({
                            keyId: `feat_gl_${gl.id}`,
                            kind: 'glider',
                            id: gl.id,
                            title: lang === 'ru' ? gl.nameRu : gl.nameEn,
                            subtitle: tr.shopFilterGliders,
                            rarity: gl.rarity,
                            swatch: gl.swatch,
                            icon: '🪂',
                            price: gl.price,
                            owned: profile.unlockedGliders.includes(gl.id),
                            featured: true,
                            onPreview: () => {
                              setPreviewItem({ kind: 'glider', id: gl.id });
                              onShopPreview?.({ mode: 'character', gliderId: gl.id });
                            },
                          })
                        )}
                        {PICKAXES.filter((p) => p.id === 'midas_scepter').map((pk) =>
                          renderShopCard({
                            keyId: `feat_pk_${pk.id}`,
                            kind: 'pickaxe',
                            id: pk.id,
                            title: lang === 'ru' ? pk.nameRu : pk.nameEn,
                            subtitle: tr.shopFilterPickaxes,
                            rarity: pk.rarity,
                            swatch: pk.swatch,
                            icon: '⛏️',
                            price: pk.price,
                            owned: profile.unlockedPickaxes.includes(pk.id),
                            featured: true,
                            onPreview: () => {
                              setPreviewItem({ kind: 'pickaxe', id: pk.id });
                              onShopPreview?.({ mode: 'character', pickaxeId: pk.id });
                            },
                          })
                        )}
                        {BACKBLINGS.filter((b) => b.id === 'crystal_core').map((bb) =>
                          renderShopCard({
                            keyId: `feat_bb_${bb.id}`,
                            kind: 'backbling',
                            id: bb.id,
                            title: lang === 'ru' ? bb.nameRu : bb.nameEn,
                            subtitle: tr.shopFilterBackblings,
                            rarity: bb.rarity,
                            swatch: bb.swatch,
                            icon: '🎒',
                            price: bb.price,
                            owned: profile.unlockedBackblings.includes(bb.id),
                            featured: true,
                            onPreview: () => {
                              setPreviewItem({ kind: 'backbling', id: bb.id });
                              onShopPreview?.({ mode: 'character', backblingId: bb.id });
                            },
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[11px] font-black uppercase tracking-wider text-sky-400">
                        ◆ {tr.shopDaily}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {SKINS.filter((s) => s.price > 0 && !['golden_midas', 'mecha_strike', 'astral_nova'].includes(s.id)).map((sk) =>
                          renderShopCard({
                            keyId: `daily_sk_${sk.id}`,
                            kind: 'skin',
                            id: sk.id,
                            title: lang === 'ru' ? sk.nameRu : sk.nameEn,
                            subtitle: tr.shopFilterSkins,
                            rarity: sk.rarity,
                            swatch: sk.styles[0].swatch,
                            icon: '🦸',
                            price: sk.price,
                            owned: profile.unlockedSkins.includes(sk.id),
                            onPreview: () => {
                              setPreviewItem({ kind: 'skin', id: sk.id });
                              onShopPreview?.({ mode: 'character', skinId: sk.id });
                            },
                          })
                        )}
                        {BACKBLINGS.filter((b) => b.price > 0 && b.id !== 'crystal_core').map((bb) =>
                          renderShopCard({
                            keyId: `daily_bb_${bb.id}`,
                            kind: 'backbling',
                            id: bb.id,
                            title: lang === 'ru' ? bb.nameRu : bb.nameEn,
                            subtitle: tr.shopFilterBackblings,
                            rarity: bb.rarity,
                            swatch: bb.swatch,
                            icon: '🎒',
                            price: bb.price,
                            owned: profile.unlockedBackblings.includes(bb.id),
                            onPreview: () => {
                              setPreviewItem({ kind: 'backbling', id: bb.id });
                              onShopPreview?.({ mode: 'character', backblingId: bb.id });
                            },
                          })
                        )}
                        {PICKAXES.filter((p) => p.price > 0 && p.id !== 'midas_scepter').map((pk) =>
                          renderShopCard({
                            keyId: `daily_pk_${pk.id}`,
                            kind: 'pickaxe',
                            id: pk.id,
                            title: lang === 'ru' ? pk.nameRu : pk.nameEn,
                            subtitle: tr.shopFilterPickaxes,
                            rarity: pk.rarity,
                            swatch: pk.swatch,
                            icon: '⛏️',
                            price: pk.price,
                            owned: profile.unlockedPickaxes.includes(pk.id),
                            onPreview: () => {
                              setPreviewItem({ kind: 'pickaxe', id: pk.id });
                              onShopPreview?.({ mode: 'character', pickaxeId: pk.id });
                            },
                          })
                        )}
                        {GLIDERS.filter((g) => g.price > 0 && g.id !== 'dragon_glide').map((gl) =>
                          renderShopCard({
                            keyId: `daily_gl_${gl.id}`,
                            kind: 'glider',
                            id: gl.id,
                            title: lang === 'ru' ? gl.nameRu : gl.nameEn,
                            subtitle: tr.shopFilterGliders,
                            rarity: gl.rarity,
                            swatch: gl.swatch,
                            icon: '🪂',
                            price: gl.price,
                            owned: profile.unlockedGliders.includes(gl.id),
                            onPreview: () => {
                              setPreviewItem({ kind: 'glider', id: gl.id });
                              onShopPreview?.({ mode: 'character', gliderId: gl.id });
                            },
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {shopFilter === 'skins' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {SKINS.filter((s) => s.price > 0 || s.tournamentRewardId).map((skin) =>
                      renderShopCard({
                        keyId: `sk_${skin.id}`,
                        kind: 'skin',
                        id: skin.id,
                        title: lang === 'ru' ? skin.nameRu : skin.nameEn,
                        subtitle: skin.tournamentRewardId ? tr.tournamentRewardBadge : tr.shopFilterSkins,
                        rarity: skin.rarity,
                        swatch: skin.styles[0].swatch,
                        icon: skin.tournamentRewardId ? '🏆' : '🦸',
                        price: skin.price,
                        owned: profile.unlockedSkins.includes(skin.id),
                        tournamentLocked: !!skin.tournamentRewardId,
                        onPreview: () => {
                          setPreviewItem({ kind: 'skin', id: skin.id });
                          onShopPreview?.({ mode: 'character', skinId: skin.id });
                        },
                      })
                    )}
                  </div>
                )}

                {shopFilter === 'backblings' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {BACKBLINGS.filter((b) => b.price > 0).map((bb) =>
                      renderShopCard({
                        keyId: `bb_${bb.id}`,
                        kind: 'backbling',
                        id: bb.id,
                        title: lang === 'ru' ? bb.nameRu : bb.nameEn,
                        subtitle: tr.shopFilterBackblings,
                        rarity: bb.rarity,
                        swatch: bb.swatch,
                        icon: '🎒',
                        price: bb.price,
                        owned: profile.unlockedBackblings.includes(bb.id),
                        onPreview: () => {
                          setPreviewItem({ kind: 'backbling', id: bb.id });
                          onShopPreview?.({ mode: 'character', backblingId: bb.id });
                        },
                      })
                    )}
                  </div>
                )}

                {shopFilter === 'pickaxes' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {PICKAXES.filter((p) => p.price > 0).map((pk) =>
                      renderShopCard({
                        keyId: `pk_${pk.id}`,
                        kind: 'pickaxe',
                        id: pk.id,
                        title: lang === 'ru' ? pk.nameRu : pk.nameEn,
                        subtitle: tr.shopFilterPickaxes,
                        rarity: pk.rarity,
                        swatch: pk.swatch,
                        icon: '⛏️',
                        price: pk.price,
                        owned: profile.unlockedPickaxes.includes(pk.id),
                        onPreview: () => {
                          setPreviewItem({ kind: 'pickaxe', id: pk.id });
                          onShopPreview?.({ mode: 'character', pickaxeId: pk.id });
                        },
                      })
                    )}
                  </div>
                )}

                {shopFilter === 'gliders' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {GLIDERS.filter((g) => g.price > 0).map((gl) =>
                      renderShopCard({
                        keyId: `gl_${gl.id}`,
                        kind: 'glider',
                        id: gl.id,
                        title: lang === 'ru' ? gl.nameRu : gl.nameEn,
                        subtitle: tr.shopFilterGliders,
                        rarity: gl.rarity,
                        swatch: gl.swatch,
                        icon: '🪂',
                        price: gl.price,
                        owned: profile.unlockedGliders.includes(gl.id),
                        onPreview: () => {
                          setPreviewItem({ kind: 'glider', id: gl.id });
                          onShopPreview?.({ mode: 'character', gliderId: gl.id });
                        },
                      })
                    )}
                  </div>
                )}

                {shopFilter === 'cars' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {VEHICLE_SKINS.filter((s) => s.price > 0).map((cs) =>
                      renderShopCard({
                        keyId: `car_${cs.id}`,
                        kind: 'car',
                        id: cs.id,
                        title: lang === 'ru' ? cs.nameRu : cs.nameEn,
                        subtitle: tr.shopFilterCars,
                        rarity: cs.rarity,
                        swatch: cs.swatch,
                        icon: '🏎️',
                        price: cs.price,
                        owned: profile.unlockedCarSkins.includes(cs.id),
                        onPreview: () => {
                          setPreviewItem({ kind: 'car', id: cs.id });
                          onShopPreview?.({ mode: 'vehicle', carSkinId: cs.id });
                        },
                      })
                    )}
                  </div>
                )}

                {shopFilter === 'emotes' && (
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {EMOTES.filter((em) => em.price > 0).map((em) =>
                      renderShopCard({
                        keyId: `em_${em.id}`,
                        kind: 'emote',
                        id: em.id,
                        title: lang === 'ru' ? em.nameRu : em.nameEn,
                        subtitle: tr.shopFilterEmotes,
                        rarity: em.rarity,
                        swatch: RARITY_COLORS[em.rarity].gradient,
                        icon: em.icon,
                        price: em.price,
                        owned: profile.unlockedEmotes.includes(em.id),
                        onPreview: () => {
                          setPreviewItem({ kind: 'emote', id: em.id });
                          onShopPreview?.({ mode: 'character', emoteId: em.id });
                        },
                      })
                    )}
                  </div>
                )}

                {shopFilter === 'perks' && (
                  <div className="flex flex-col gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (profile.perkStartShield) return;
                        if (profile.tokens < 120) {
                          showToast(lang === 'ru' ? 'Нужно 120 Токенов!' : 'Need 120 Tokens!');
                          return;
                        }
                        onUpdateProfile({ ...profile, tokens: profile.tokens - 120, perkStartShield: true });
                      }}
                      className="rounded-xl border-2 border-sky-400/40 bg-slate-900 p-3 text-left"
                    >
                      <div className="text-sm font-black text-sky-300">
                        {lang === 'ru' ? 'Стартовый Щит 100' : 'Start with 100 Shield'}
                      </div>
                      <div className="text-xs text-slate-300">
                        {profile.perkStartShield ? '✔ ACTIVE' : '💎 120 Tokens'}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (profile.perkStartWood) return;
                        if (profile.tokens < 90) {
                          showToast(lang === 'ru' ? 'Нужно 90 Токенов!' : 'Need 90 Tokens!');
                          return;
                        }
                        onUpdateProfile({ ...profile, tokens: profile.tokens - 90, perkStartWood: true });
                      }}
                      className="rounded-xl border-2 border-yellow-400/40 bg-slate-900 p-3 text-left"
                    >
                      <div className="text-sm font-black text-yellow-300">
                        {lang === 'ru' ? 'Набор Строителя (350 дерева)' : 'Builder Kit (350 Wood)'}
                      </div>
                      <div className="text-xs text-slate-300">
                        {profile.perkStartWood ? '✔ ACTIVE' : '💎 90 Tokens'}
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* EMOTES / DANCES TAB */}
            {activeTab === 'emotes' && (
              <div>
                <h2 className="text-xl font-black italic text-yellow-400">{tr.tabEmotes}</h2>
                <p className="mb-3 text-xs font-semibold text-slate-400">
                  {lang === 'ru'
                    ? 'Выберите слот быстрого меню (1-4), затем нажмите на танец для привязки и 3D-превью'
                    : 'Select a Quick Wheel slot (1-4), then click a dance to assign & preview in 3D'}
                </p>

                <div className="mb-3 grid grid-cols-4 gap-1.5">
                  {profile.emoteWheel.map((emId, idx) => {
                    const em = EMOTES.find((e) => e.id === emId) || EMOTES[0];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedEmoteSlot(idx)}
                        className={`rounded-lg border-2 p-2 text-center ${
                          selectedEmoteSlot === idx ? 'border-yellow-400 bg-slate-800' : 'border-white/15 bg-slate-900'
                        }`}
                      >
                        <div className="text-[10px] font-black text-sky-400">#{idx + 1}</div>
                        <div className="text-xl">{em.icon}</div>
                        <div className="truncate text-[10px] font-bold text-white">{lang === 'ru' ? em.nameRu : em.nameEn}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {EMOTES.map((em) => {
                    const unlocked = profile.unlockedEmotes.includes(em.id);
                    return (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => {
                          if (!unlocked) {
                            handleBuyEmote(em.id, em.price);
                            return;
                          }
                          const nextWheel = [...profile.emoteWheel];
                          nextWheel[selectedEmoteSlot] = em.id;
                          onUpdateProfile({ ...profile, emoteWheel: nextWheel });
                          onPreviewEmote(em.id);
                        }}
                        className={`rounded-xl border-2 p-2.5 text-left ${
                          unlocked ? 'border-sky-400/50 bg-slate-800/80 hover:border-yellow-400' : 'border-white/15 bg-slate-900/80 opacity-85'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{em.icon}</span>
                          <span className="text-[10px] font-black" style={{ color: RARITY_COLORS[em.rarity].css }}>
                            {unlocked ? (lang === 'ru' ? 'ИГРАТЬ' : 'PLAY') : `💎 ${em.price}`}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-black text-white">{lang === 'ru' ? em.nameRu : em.nameEn}</div>
                        <div className="text-[10px] text-slate-400">{lang === 'ru' ? em.descRu : em.descEn}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* GARAGE TAB */}
            {activeTab === 'garage' && (
              <div>
                <h2 className="text-xl font-black italic text-yellow-400">{tr.tabGarage}</h2>
                <p className="mb-3 text-xs font-semibold text-slate-400">
                  {lang === 'ru' ? 'Осматривайте 3D-машины и выбирайте расцветку' : 'Inspect 3D vehicles and equip paint skins'}
                </p>

                <div className="mb-3 flex gap-1.5">
                  {VEHICLE_MODELS.map((vm) => (
                    <button
                      key={vm.id}
                      type="button"
                      onClick={() => onUpdateProfile({ ...profile, equippedCarModel: vm.id as VehicleTypeId })}
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs font-black ${
                        profile.equippedCarModel === vm.id
                          ? 'border-yellow-400 bg-yellow-400 text-slate-950'
                          : 'border-white/15 bg-slate-800 text-slate-200'
                      }`}
                    >
                      {lang === 'ru' ? vm.nameRu.split(' ')[0] : vm.nameEn.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {VEHICLE_SKINS.map((cs) => {
                    const owned = profile.unlockedCarSkins.includes(cs.id);
                    const equipped = profile.equippedCarSkin === cs.id;
                    return (
                      <button
                        key={cs.id}
                        type="button"
                        onClick={() => handleBuyCarSkin(cs.id, cs.price)}
                        className={`rounded-xl border-2 p-2.5 text-left ${
                          equipped
                            ? 'border-yellow-400 bg-slate-800'
                            : owned
                              ? 'border-sky-400/50 bg-slate-900'
                              : 'border-white/15 bg-slate-900/80'
                        }`}
                      >
                        <div className="mb-2 h-7 w-full rounded" style={{ background: cs.swatch }} />
                        <div className="text-xs font-black text-white">{lang === 'ru' ? cs.nameRu : cs.nameEn}</div>
                        <div className="mt-1 text-[11px] font-black text-yellow-400">
                          {equipped
                            ? '✔ EQUIPPED'
                            : owned
                              ? lang === 'ru' ? 'ВЫБРАТЬ' : 'EQUIP'
                              : `💎 ${cs.price}`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* RANKED & TOURNAMENTS TAB */}
            {activeTab === 'compete' && (
              <div>
                <h2 className="text-xl font-black italic text-yellow-400">{tr.tabCompete}</h2>

                <div className="mt-2 rounded-xl border border-white/15 bg-[#081124] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black" style={{ color: currentRank.color }}>
                      {lang === 'ru' ? currentRank.nameRu : currentRank.nameEn}
                    </span>
                    <span className="text-sm font-black tabular-nums text-white">{profile.rankedPoints} RP</span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-yellow-400" style={{ width: `${rankProgressPct}%` }} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded bg-slate-900 p-1.5">
                      <div className="text-[10px] text-slate-400">{lang === 'ru' ? 'МАТЧИ' : 'MATCHES'}</div>
                      <div className="font-black text-white">{profile.stats.rankedMatches}</div>
                    </div>
                    <div className="rounded bg-slate-900 p-1.5">
                      <div className="text-[10px] text-slate-400">{lang === 'ru' ? 'ПОБЕДЫ' : 'WINS'}</div>
                      <div className="font-black text-yellow-400">{profile.stats.rankedWins}</div>
                    </div>
                    <div className="rounded bg-slate-900 p-1.5">
                      <div className="text-[10px] text-slate-400">{lang === 'ru' ? 'УБИЙСТВА' : 'ELIMS'}</div>
                      <div className="font-black text-sky-400">{profile.stats.rankedKills}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs font-black uppercase text-sky-400">
                  {lang === 'ru' ? 'ТУРНИРЫ С ЭКСКЛЮЗИВНЫМИ СКИНАМИ' : 'TOURNAMENTS & EXCLUSIVE SKINS'}
                </div>
                <div className="mt-1.5 flex flex-col gap-2">
                  {TOURNAMENTS.map((cup) => {
                    const selected = profile.activeTournamentId === cup.id;
                    const prizeSkin = SKINS.find((s) => s.id === cup.rewardSkinId);
                    const skinUnlocked = prizeSkin && profile.unlockedSkins.includes(prizeSkin.id);
                    return (
                      <button
                        key={cup.id}
                        type="button"
                        onClick={() => {
                          onUpdateProfile({ ...profile, activeTournamentId: cup.id });
                          if (prizeSkin) onShopPreview?.({ mode: 'character', skinId: prizeSkin.id });
                        }}
                        className={`rounded-xl border-2 p-2.5 text-left ${
                          selected ? 'border-yellow-400 bg-slate-800' : 'border-white/10 bg-slate-900/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">{lang === 'ru' ? cup.nameRu : cup.nameEn}</span>
                          <span className="text-[11px] font-black text-yellow-400">💎 +{cup.prizeTokens}</span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-300">{lang === 'ru' ? cup.descRu : cup.descEn}</div>
                        {prizeSkin && (
                          <div className="mt-1.5 flex items-center justify-between rounded-lg bg-[#081124] px-2 py-1 text-[10px] font-black">
                            <span className="text-amber-300">
                              🏆 {lang === 'ru' ? 'Скин за победу:' : 'Winner Skin:'}{' '}
                              {lang === 'ru' ? prizeSkin.nameRu : prizeSkin.nameEn}
                            </span>
                            <span className={skinUnlocked ? 'text-emerald-400' : 'text-slate-400'}>
                              {skinUnlocked ? '✔ UNLOCKED' : '🔒 TOP 1'}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-[#081124] p-3">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-black text-yellow-400">
                    <span>{lang === 'ru' ? 'ТАБЛИЦА ЛИДЕРОВ' : 'LEADERBOARD'}</span>
                    <span>
                      {lang === 'ru' ? `Ваше место: #${leaderboard.playerPlace}` : `Your Rank: #${leaderboard.playerPlace}`}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {leaderboard.entries.map((row, idx) => (
                      <div
                        key={row.name + idx}
                        className={`flex items-center justify-between rounded px-2 py-1 text-xs ${
                          row.isPlayer ? 'bg-sky-500/25 font-black text-yellow-300' : 'bg-slate-900/70 font-semibold text-slate-300'
                        }`}
                      >
                        <span>
                          #{idx + 1} {row.name}
                        </span>
                        <span className="tabular-nums">
                          {row.points} {lang === 'ru' ? 'оч.' : 'pts'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE & STATS TAB */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-xl font-black italic text-yellow-400">{tr.tabProfile}</h2>
                <div className="mt-3">
                  <label className="block text-[11px] font-black uppercase text-slate-400">
                    {lang === 'ru' ? 'Никнейм игрока' : 'Player Nickname'}
                  </label>
                  <input
                    type="text"
                    maxLength={18}
                    value={profile.nickname}
                    onChange={(e) => onUpdateProfile({ ...profile, nickname: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm font-black text-white outline-none focus:border-sky-400"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 text-center">
                  {[
                    { label: lang === 'ru' ? 'МАТЧИ' : 'MATCHES', val: profile.stats.matches },
                    { label: lang === 'ru' ? 'ПОБЕДЫ' : 'WINS', val: profile.stats.wins },
                    { label: lang === 'ru' ? 'УСТРАНЕНИЯ' : 'ELIMS', val: profile.stats.kills },
                    {
                      label: 'K/D',
                      val: (profile.stats.kills / Math.max(1, profile.stats.matches - profile.stats.wins)).toFixed(2),
                    },
                    { label: lang === 'ru' ? 'СУНДУКИ' : 'CHESTS', val: profile.stats.chestsOpened },
                    { label: lang === 'ru' ? 'ПОЕЗДКИ' : 'DRIVES', val: profile.stats.vehiclesDriven },
                  ].map((st) => (
                    <div key={st.label} className="rounded-xl border border-white/10 bg-[#081124] p-3">
                      <div className="text-[10px] font-extrabold text-slate-400">{st.label}</div>
                      <div className="mt-1 text-xl font-black tabular-nums text-sky-400">{st.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-black italic text-yellow-400">{tr.tabSettings}</h2>
                <div className="mt-3 flex flex-col gap-3">
                  <div className="rounded-xl bg-[#081124] p-3">
                    <label className="block text-[11px] font-black uppercase text-slate-400">
                      {lang === 'ru' ? 'Язык / Language' : 'Language / Язык'}
                    </label>
                    <select
                      value={profile.language}
                      onChange={(e) => onUpdateProfile({ ...profile, language: e.target.value as Language })}
                      className="mt-1 w-full rounded bg-slate-800 px-2.5 py-1.5 text-sm font-bold text-white"
                    >
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  <div className="rounded-xl bg-[#081124] p-3">
                    <label className="block text-[11px] font-black uppercase text-slate-400">
                      {lang === 'ru' ? 'Качество графики' : 'Graphics Quality'}
                    </label>
                    <select
                      value={quality}
                      onChange={(e) => onQualityChange(e.target.value as GraphicsQuality)}
                      className="mt-1 w-full rounded bg-slate-800 px-2.5 py-1.5 text-sm font-bold text-white"
                    >
                      <option value="low">Low (Max FPS)</option>
                      <option value="medium">Medium (Balanced)</option>
                      <option value="high">High (Shadows + Max Detail)</option>
                    </select>
                  </div>

                  <div className="rounded-xl bg-[#081124] p-3">
                    <label className="block text-[11px] font-black uppercase text-slate-400">
                      {lang === 'ru' ? 'Количество игроков / ботов в матче' : 'Players / Bots per Match'}
                    </label>
                    <select
                      value={botCount}
                      onChange={(e) => onBotCountChange(Number(e.target.value))}
                      className="mt-1 w-full rounded bg-slate-800 px-2.5 py-1.5 text-sm font-bold text-white"
                    >
                      <option value={15}>16 ({lang === 'ru' ? '15 ботов' : '15 bots'})</option>
                      <option value={23}>24 ({lang === 'ru' ? '23 бота' : '23 bots'})</option>
                      <option value={31}>32 ({lang === 'ru' ? '31 бот' : '31 bots'})</option>
                      <option value={49}>50 ({lang === 'ru' ? '49 ботов — Больше' : '49 bots — Large'})</option>
                      <option value={74}>75 ({lang === 'ru' ? '74 бота — Масштаб' : '74 bots — Mega'})</option>
                      <option value={99}>100 ({lang === 'ru' ? '99 ботов — Полный сервер' : '99 bots — Full Island'})</option>
                    </select>
                  </div>

                  <div className="rounded-xl bg-[#081124] p-3">
                    <label className="block text-[11px] font-black uppercase text-slate-400">
                      {lang === 'ru' ? 'Чувствительность' : 'Mouse Sensitivity'}: {sensitivity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="2.5"
                      step="0.1"
                      value={sensitivity}
                      onChange={(e) => onSensitivityChange(parseFloat(e.target.value))}
                      className="mt-1 w-full"
                    />
                  </div>

                  <div className="rounded-xl bg-[#081124] p-3">
                    <label className="block text-[11px] font-black uppercase text-slate-400">
                      {lang === 'ru' ? 'Громкость звука' : 'Audio Volume'}: {volume}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={volume}
                      onChange={(e) => onVolumeChange(parseInt(e.target.value, 10))}
                      className="mt-1 w-full"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Bar: Mode Selector + Team Toggle (Solo/Duo/Trio/Squad) + Bot Count + PLAY Button */}
      <div className="pointer-events-auto flex flex-wrap items-end justify-between gap-4 bg-gradient-to-t from-[#060d1c]/95 to-transparent px-6 pb-5 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          {(
            [
              { id: 'br', title: tr.modeBr, desc: tr.modeBrDesc, tag: 'CLASSIC', color: 'bg-emerald-600' },
              { id: 'ranked', title: tr.modeRanked, desc: tr.modeRankedDesc, tag: 'RANKED', color: 'bg-sky-600' },
              { id: 'tournament', title: tr.modeTournament, desc: tr.modeTournamentDesc, tag: 'CUP', color: 'bg-purple-600' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              className={`w-48 rounded-xl border-2 p-2.5 text-left transition ${
                selectedMode === m.id
                  ? 'border-yellow-400 bg-[#172c58] shadow-lg'
                  : 'border-white/20 bg-[#0d1a35]/90 hover:border-sky-400'
              }`}
            >
              <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black text-white ${m.color}`}>
                {m.tag}
              </span>
              <div className="mt-1 text-sm font-black text-white">{m.title}</div>
              <div className="line-clamp-2 text-[11px] text-slate-300">{m.desc}</div>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Bot Count Quick Selector ("Больше ботов") */}
            <div className="flex items-center gap-1 rounded-xl border border-emerald-400/40 bg-[#0e1b36] px-2.5 py-1.5 text-xs font-black">
              <span className="mr-1 text-emerald-300">🤖 {tr.botCountLabel}:</span>
              {[23, 49, 74, 99].map((bc) => (
                <button
                  key={bc}
                  type="button"
                  onClick={() => onBotCountChange(bc)}
                  className={`rounded-md px-2 py-0.5 tabular-nums ${
                    botCount === bc ? 'bg-emerald-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {bc + 1}
                </button>
              ))}
            </div>

            {/* Team Selector: Solo / Duo / Trio / Squad */}
            <div className="flex items-center gap-1 rounded-xl border border-sky-400/40 bg-[#0e1b36] px-2.5 py-1.5 text-xs font-black">
              <span className="mr-1 text-slate-300">{tr.teamLabel}:</span>
              {(
                [
                  { id: 'solo', label: tr.solo },
                  { id: 'duo', label: tr.duo },
                  { id: 'trio', label: tr.trio },
                  { id: 'squad', label: tr.squad },
                ] as const
              ).map((tm) => (
                <button
                  key={tm.id}
                  type="button"
                  onClick={() => onTeamSizeChange(tm.id)}
                  className={`rounded-md px-2 py-0.5 ${
                    selectedTeamSize === tm.id ? 'bg-sky-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {tm.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            data-start="true"
            onClick={onStartMatchmaking}
            className="w-64 rounded-2xl bg-yellow-400 px-8 py-4 text-2xl font-black italic tracking-wider text-slate-950 shadow-[0_6px_0_#a16207] transition hover:brightness-105 active:translate-y-1 active:shadow-[0_2px_0_#a16207]"
          >
            {tr.readyBtn}
          </button>
        </div>
      </div>

      {showIOSHint && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-w-sm rounded-2xl border border-sky-400 bg-[#0f1c38] p-6 text-center">
            <h3 className="text-lg font-black text-white">iOS / iPadOS</h3>
            <p className="mt-2 text-sm text-slate-300">
              {lang === 'ru'
                ? 'Нажмите «Поделиться» в Safari и выберите «На экран «Домой»».'
                : 'Tap Share in Safari toolbar and choose Add to Home Screen.'}
            </p>
            <button
              type="button"
              onClick={() => setShowIOSHint(false)}
              className="mt-4 w-full rounded-xl bg-yellow-400 py-2 text-sm font-black text-slate-950"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
