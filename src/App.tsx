import { useCallback, useEffect, useRef, useState } from 'react';
import { EmoteWheelModal } from './components/EmoteWheelModal';
import { FloatingDamage, GameHUD } from './components/GameHUD';
import { InventoryModal } from './components/InventoryModal';
import { LobbyOverlay } from './components/LobbyOverlay';
import { MatchmakingModal } from './components/MatchmakingModal';
import { TacticalMapModal } from './components/TacticalMapModal';
import { loadProfile, saveProfile } from './game/data';
import { RoyaleEngine } from './game/engine';
import { t } from './game/i18n';
import {
  AppScreenState,
  ChatMessage,
  GameModeId,
  GraphicsQuality,
  HudSnapshot,
  LobbyTabId,
  MatchResultSnapshot,
  PlayerProfile,
  TeamSizeId,
} from './game/types';
import { useOnlineStatus } from './hooks/usePWAInstall';

function isEmoteKey(e: KeyboardEvent): boolean {
  return e.code === 'KeyB' || e.key.toLowerCase() === 'б';
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RoyaleEngine | null>(null);
  const floatingIdRef = useRef(1);
  const emoteHoldStartRef = useRef<number | null>(null);
  const hoveredEmoteRef = useRef<string | null>(null);
  const hudPhaseRef = useRef<string>('starter_island');

  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [screenState, setScreenState] = useState<AppScreenState>('title');
  const [activeTab, setActiveTab] = useState<LobbyTabId>('play');
  const [selectedMode, setSelectedMode] = useState<GameModeId>('br');
  const [selectedTeamSize, setSelectedTeamSize] = useState<TeamSizeId>('solo');
  const [quality, setQuality] = useState<GraphicsQuality>('medium');
  const [botCount, setBotCount] = useState<number>(23);
  const [sensitivity, setSensitivity] = useState<number>(1.0);
  const [volume, setVolume] = useState<number>(65);
  const [muted, setMuted] = useState<boolean>(false);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [killFeed, setKillFeed] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingDamage[]>([]);
  const [hitmarkerActive, setHitmarkerActive] = useState(false);
  const [damageFlash, setDamageFlash] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
  const [emoteHoldMode, setEmoteHoldMode] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResultSnapshot | null>(null);

  const isOnline = useOnlineStatus();
  const tr = t(profile.language);

  useEffect(() => {
    document.body.dataset.state = screenState;
  }, [screenState]);

  const syncProfileFromEngine = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const p = eng.getProfile();
    const cloned: PlayerProfile = {
      ...p,
      stats: { ...p.stats },
      tournamentScores: { ...p.tournamentScores },
      equippedSkinStyles: { ...p.equippedSkinStyles },
      unlockedSkins: [...p.unlockedSkins],
      unlockedPickaxes: [...p.unlockedPickaxes],
      unlockedGliders: [...p.unlockedGliders],
      unlockedBackblings: [...p.unlockedBackblings],
      unlockedCarSkins: [...p.unlockedCarSkins],
      unlockedEmotes: [...p.unlockedEmotes],
      emoteWheel: [...p.emoteWheel],
      friends: (p.friends || []).map((f) => ({ ...f })),
    };
    saveProfile(cloned);
    setProfile(cloned);
  }, []);

  const handleUpdateProfile = useCallback((next: PlayerProfile) => {
    saveProfile(next);
    setProfile(next);
    engineRef.current?.updateProfile(next);
  }, []);

  const launchMatchNow = useCallback(
    (modeOverride?: GameModeId, teamOverride?: TeamSizeId, botsOverride?: number, qualOverride?: GraphicsQuality) => {
      const eng = engineRef.current;
      if (!eng) return;
      setMatchResult(null);
      setKillFeed([]);
      setChatMessages([]);
      setMapOpen(false);
      setInventoryOpen(false);
      setChatOpen(false);
      setEmoteWheelOpen(false);
      setEmoteHoldMode(false);
      emoteHoldStartRef.current = null;
      eng.setUiModalOpen(false);
      setScreenState('playing');
      eng.startMatch({
        mode: modeOverride ?? selectedMode,
        teamSize: teamOverride ?? selectedTeamSize,
        botCount: botsOverride ?? botCount,
        quality: qualOverride ?? quality,
      });
    },
    [selectedMode, selectedTeamSize, botCount, quality]
  );

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const initial = loadProfile();
    const engine = new RoyaleEngine(mount, initial, {
      onHudUpdate: (snapshot) => {
        hudPhaseRef.current = snapshot.phase;
        setHud(snapshot);
      },
      onKillFeed: (msg) => {
        setKillFeed((prev) => [msg, ...prev].slice(0, 4));
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-14), msg]);
      },
      onFloatingText: (x, y, text, color, big) => {
        const id = floatingIdRef.current++;
        setFloatingTexts((prev) => [...prev.slice(-10), { id, x, y, text, color, big }]);
        window.setTimeout(() => {
          setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
        }, 850);
      },
      onHitmarker: () => {
        setHitmarkerActive(true);
        window.setTimeout(() => setHitmarkerActive(false), 120);
      },
      onDamageVignette: () => {
        setDamageFlash(true);
        window.setTimeout(() => setDamageFlash(false), 180);
      },
      onPauseChange: (isPaused) => {
        setScreenState((prev) => {
          if (prev === 'gameover' || prev === 'title') return prev;
          return isPaused ? 'paused' : 'playing';
        });
      },
      onTokensChanged: () => {
        syncProfileFromEngine();
      },
      onMatchEnd: (res) => {
        syncProfileFromEngine();
        setMapOpen(false);
        setInventoryOpen(false);
        setChatOpen(false);
        setEmoteWheelOpen(false);
        setEmoteHoldMode(false);
        emoteHoldStartRef.current = null;
        setMatchResult(res);
        setScreenState('gameover');
      },
    });

    engine.sound.setVolume(0.65);
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setScreenState('playing');
      engine.startMatch({
        mode: 'br',
        teamSize: 'solo',
        botCount: 23,
        quality: 'medium',
      });
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [syncProfileFromEngine]);

  useEffect(() => {
    if (screenState !== 'loading') return;
    const id = window.setTimeout(() => {
      launchMatchNow();
    }, 1100);
    return () => window.clearTimeout(id);
  }, [screenState, launchMatchNow]);

  const handleTabChange = useCallback((tab: LobbyTabId) => {
    setActiveTab(tab);
    engineRef.current?.clearShopPreview();
    engineRef.current?.setLobbyPreviewMode(tab === 'garage' ? 'vehicle' : 'character');
  }, []);

  const handleStartMatchmaking = useCallback(() => {
    engineRef.current?.sound.init();
    setEmoteWheelOpen(false);
    setEmoteHoldMode(false);
    emoteHoldStartRef.current = null;
    setScreenState('matchmaking');
  }, []);

  const handleCloseSubModals = useCallback(() => {
    setMapOpen(false);
    setInventoryOpen(false);
    setChatOpen(false);
    setEmoteWheelOpen(false);
    setEmoteHoldMode(false);
    emoteHoldStartRef.current = null;
    hoveredEmoteRef.current = null;
    engineRef.current?.setUiModalOpen(false);
    if (
      screenState === 'playing' &&
      hudPhaseRef.current !== 'starter_island' &&
      hudPhaseRef.current !== 'battle_bus'
    ) {
      engineRef.current?.requestPointerLock();
    }
  }, [screenState]);

  const handleToggleMap = useCallback(() => {
    if (screenState !== 'playing' || matchResult) return;
    setMapOpen((prev) => {
      const next = !prev;
      if (next) {
        setInventoryOpen(false);
        setChatOpen(false);
        setEmoteWheelOpen(false);
        setEmoteHoldMode(false);
        emoteHoldStartRef.current = null;
        engineRef.current?.setUiModalOpen(true);
        document.exitPointerLock?.();
      } else {
        engineRef.current?.setUiModalOpen(false);
        if (hudPhaseRef.current !== 'starter_island' && hudPhaseRef.current !== 'battle_bus') {
          engineRef.current?.requestPointerLock();
        }
      }
      return next;
    });
  }, [screenState, matchResult]);

  const handleToggleInventory = useCallback(() => {
    if (screenState !== 'playing' || matchResult) return;
    setInventoryOpen((prev) => {
      const next = !prev;
      if (next) {
        setMapOpen(false);
        setChatOpen(false);
        setEmoteWheelOpen(false);
        setEmoteHoldMode(false);
        emoteHoldStartRef.current = null;
        engineRef.current?.setUiModalOpen(true);
        document.exitPointerLock?.();
      } else {
        engineRef.current?.setUiModalOpen(false);
        if (hudPhaseRef.current !== 'starter_island' && hudPhaseRef.current !== 'battle_bus') {
          engineRef.current?.requestPointerLock();
        }
      }
      return next;
    });
  }, [screenState, matchResult]);

  const handleOpenChat = useCallback(() => {
    if (screenState !== 'playing' || matchResult) return;
    setMapOpen(false);
    setInventoryOpen(false);
    setEmoteWheelOpen(false);
    setChatOpen(true);
    engineRef.current?.setUiModalOpen(true);
    document.exitPointerLock?.();
  }, [screenState, matchResult]);

  const handleCloseChat = useCallback(() => {
    setChatOpen(false);
    engineRef.current?.setUiModalOpen(false);
    if (
      screenState === 'playing' &&
      hudPhaseRef.current !== 'starter_island' &&
      hudPhaseRef.current !== 'battle_bus'
    ) {
      engineRef.current?.requestPointerLock();
    }
  }, [screenState]);

  const handleToggleEmoteWheel = useCallback(() => {
    if ((screenState !== 'playing' && screenState !== 'title') || matchResult) return;
    if (screenState === 'playing' && hudPhaseRef.current === 'battle_bus') {
      engineRef.current?.thankBusDriver();
      return;
    }
    setEmoteWheelOpen((prev) => {
      const next = !prev;
      setEmoteHoldMode(false);
      emoteHoldStartRef.current = null;
      if (next) {
        setMapOpen(false);
        setInventoryOpen(false);
        setChatOpen(false);
        if (screenState === 'playing') {
          engineRef.current?.setUiModalOpen(true);
          document.exitPointerLock?.();
        }
      } else {
        if (screenState === 'playing') {
          engineRef.current?.setUiModalOpen(false);
          if (hudPhaseRef.current !== 'starter_island' && hudPhaseRef.current !== 'battle_bus') {
            engineRef.current?.requestPointerLock();
          }
        }
      }
      return next;
    });
  }, [screenState, matchResult]);

  // Global keyboard shortcuts (Title start, Map, Inventory Tab, Bus Thank B, Hold-B Radial Emotes, Chat Enter, Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      if (isTyping) return;

      if (isEmoteKey(e)) {
        if (e.repeat) return;
        if (screenState === 'playing' && hudPhaseRef.current === 'battle_bus' && !matchResult) {
          e.preventDefault();
          engineRef.current?.thankBusDriver();
          return;
        }
        const canOpenWheel =
          screenState === 'title' ||
          (screenState === 'playing' && !matchResult && !mapOpen && !inventoryOpen && !chatOpen);
        if (!canOpenWheel) return;
        e.preventDefault();

        if (!emoteWheelOpen) {
          emoteHoldStartRef.current = performance.now();
          hoveredEmoteRef.current = null;
          setEmoteHoldMode(true);
          setEmoteWheelOpen(true);
          if (screenState === 'playing') {
            engineRef.current?.setUiModalOpen(true);
            document.exitPointerLock?.();
          }
        } else if (!emoteHoldMode) {
          handleCloseSubModals();
        }
        return;
      }

      if (screenState === 'title') {
        if (e.code === 'Escape' && emoteWheelOpen) {
          e.preventDefault();
          handleCloseSubModals();
          return;
        }
        if ((e.code === 'Enter' || e.code === 'Space') && !emoteWheelOpen) {
          e.preventDefault();
          handleStartMatchmaking();
          return;
        }
      }

      if (screenState === 'playing' && !matchResult) {
        if (e.code === 'Tab' || e.code === 'KeyI') {
          e.preventDefault();
          handleToggleInventory();
          return;
        }
        if (e.code === 'Enter' && !mapOpen && !inventoryOpen && !emoteWheelOpen && !chatOpen) {
          e.preventDefault();
          handleOpenChat();
          return;
        }
        if (e.code === 'KeyM') {
          e.preventDefault();
          handleToggleMap();
          return;
        }
        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          if (mapOpen || emoteWheelOpen || inventoryOpen || chatOpen) {
            handleCloseSubModals();
          } else {
            engineRef.current?.pause();
          }
          return;
        }
      } else if (screenState === 'paused') {
        if (e.code === 'KeyP' || e.code === 'Escape') {
          e.preventDefault();
          engineRef.current?.resume();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!isEmoteKey(e) || emoteHoldStartRef.current === null) return;
      const heldMs = performance.now() - emoteHoldStartRef.current;
      emoteHoldStartRef.current = null;

      const selectedEmote = hoveredEmoteRef.current;
      if (selectedEmote || heldMs > 160) {
        if (selectedEmote) {
          engineRef.current?.triggerEmote(selectedEmote);
        }
        handleCloseSubModals();
      } else {
        // Quick tap without dragging to a sector keeps wheel open for click selection
        setEmoteHoldMode(false);
      }
    };

    const onWindowBlur = () => {
      emoteHoldStartRef.current = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [
    screenState,
    matchResult,
    mapOpen,
    inventoryOpen,
    chatOpen,
    emoteWheelOpen,
    emoteHoldMode,
    handleStartMatchmaking,
    handleToggleMap,
    handleToggleInventory,
    handleOpenChat,
    handleCloseSubModals,
  ]);

  const handleExitToLobby = useCallback(() => {
    setMatchResult(null);
    setHud(null);
    setChatMessages([]);
    setMapOpen(false);
    setInventoryOpen(false);
    setChatOpen(false);
    setEmoteWheelOpen(false);
    setEmoteHoldMode(false);
    emoteHoldStartRef.current = null;
    setActiveTab('play');
    setScreenState('title');
    engineRef.current?.setUiModalOpen(false);
    engineRef.current?.setLobbyPreviewMode('character');
    engineRef.current?.enterLobby();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#091224]">
      {/* Dedicated WebGL Mount Layer */}
      <div ref={canvasMountRef} className="fixed inset-0 h-full w-full" />

      {/* Offline PWA Badge */}
      {!isOnline && (
        <div className="pointer-events-none fixed left-1/2 top-2 z-50 -translate-x-1/2 rounded-full border border-amber-400/60 bg-amber-950/90 px-3 py-1 text-[11px] font-black text-amber-200">
          ⚡ {tr.offlineNotice}
        </div>
      )}

      {/* Lobby Screen */}
      {screenState === 'title' && (
        <LobbyOverlay
          profile={profile}
          activeTab={activeTab}
          selectedMode={selectedMode}
          selectedTeamSize={selectedTeamSize}
          quality={quality}
          botCount={botCount}
          sensitivity={sensitivity}
          volume={volume}
          onTabChange={handleTabChange}
          onModeChange={setSelectedMode}
          onTeamSizeChange={setSelectedTeamSize}
          onQualityChange={(q) => {
            setQuality(q);
            engineRef.current?.applyGraphicsQuality(q);
          }}
          onBotCountChange={setBotCount}
          onSensitivityChange={(s) => {
            setSensitivity(s);
            engineRef.current?.setSensitivity(s);
          }}
          onVolumeChange={(v) => {
            setVolume(v);
            engineRef.current?.sound.setVolume(v / 100);
          }}
          onUpdateProfile={handleUpdateProfile}
          onPreviewEmote={(id) => engineRef.current?.triggerEmote(id)}
          onShopPreview={(preview) => engineRef.current?.setShopPreview(preview)}
          onOpenEmoteWheel={handleToggleEmoteWheel}
          onStartMatchmaking={handleStartMatchmaking}
        />
      )}

      {/* Matchmaking & Loading Modals */}
      {(screenState === 'matchmaking' || screenState === 'loading') && (
        <MatchmakingModal
          stage={screenState}
          lang={profile.language}
          mode={selectedMode}
          teamSize={selectedTeamSize}
          totalPlayers={botCount + 1}
          onCancel={() => setScreenState('title')}
          onReadyToDeploy={() => setScreenState('loading')}
        />
      )}

      {/* In-Game HUD, Pause & End Screens */}
      {(screenState === 'playing' || screenState === 'paused' || screenState === 'gameover') && (
        <GameHUD
          lang={profile.language}
          profile={profile}
          quality={quality}
          botCount={botCount}
          sensitivity={sensitivity}
          volume={volume}
          hud={hud}
          killFeed={killFeed}
          chatMessages={chatMessages}
          chatOpen={chatOpen}
          floatingTexts={floatingTexts}
          hitmarkerActive={hitmarkerActive}
          damageFlash={damageFlash}
          muted={muted}
          emoteWheelOpen={emoteWheelOpen}
          emoteWheelIds={profile.emoteWheel}
          paused={screenState === 'paused'}
          matchResult={matchResult}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            engineRef.current?.sound.setMuted(next);
          }}
          onQualityChange={(q) => {
            setQuality(q);
            engineRef.current?.applyGraphicsQuality(q);
          }}
          onBotCountChange={setBotCount}
          onSensitivityChange={(s) => {
            setSensitivity(s);
            engineRef.current?.setSensitivity(s);
          }}
          onVolumeChange={(v) => {
            setVolume(v);
            engineRef.current?.sound.setVolume(v / 100);
          }}
          onUpdateProfile={handleUpdateProfile}
          onToggleMap={handleToggleMap}
          onToggleInventory={handleToggleInventory}
          onToggleEmoteWheel={handleToggleEmoteWheel}
          onSelectEmote={(emoteId) => {
            engineRef.current?.triggerEmote(emoteId);
            handleCloseSubModals();
          }}
          onSkipStarter={() => engineRef.current?.skipStarterWait()}
          onJumpBus={() => engineRef.current?.jumpFromBus()}
          onThankBusDriver={() => engineRef.current?.thankBusDriver()}
          onSendChat={(text) => engineRef.current?.sendPlayerChat(text)}
          onCloseChat={handleCloseChat}
          onPause={() => engineRef.current?.pause()}
          onResume={() => engineRef.current?.resume()}
          onPlayAgain={() => {
            setMatchResult(null);
            setScreenState('matchmaking');
          }}
          onExitToLobby={handleExitToLobby}
        />
      )}

      {/* Fortnite-Style Inventory & Loadout Modal */}
      <InventoryModal
        open={inventoryOpen && screenState === 'playing' && !matchResult}
        lang={profile.language}
        hud={hud}
        profile={profile}
        onSwapSlots={(a, b) => engineRef.current?.swapInventorySlots(a, b)}
        onDropSlot={(idx) => engineRef.current?.dropInventorySlot(idx)}
        onEquipSlot={(idx) => engineRef.current?.equipSlot(idx)}
        onClose={handleCloseSubModals}
      />

      {/* Radial Hold-B / Click Emote Wheel (Works in both Lobby & Match) */}
      <EmoteWheelModal
        open={emoteWheelOpen && (screenState === 'title' || (screenState === 'playing' && !matchResult))}
        lang={profile.language}
        emoteWheelIds={profile.emoteWheel}
        isHoldMode={emoteHoldMode}
        onHoverEmoteChange={(id) => {
          hoveredEmoteRef.current = id;
        }}
        onSelectEmote={(emoteId) => {
          engineRef.current?.triggerEmote(emoteId);
          handleCloseSubModals();
        }}
        onClose={handleCloseSubModals}
      />

      {/* Tactical Fullscreen Map & Marker System */}
      <TacticalMapModal
        open={mapOpen && screenState === 'playing' && !matchResult}
        lang={profile.language}
        hud={hud}
        onPlaceMarker={(x, z) => engineRef.current?.setPlayerMarker(x, z)}
        onClearMarker={() => engineRef.current?.clearPlayerMarker()}
        onClose={handleCloseSubModals}
      />
    </div>
  );
}
