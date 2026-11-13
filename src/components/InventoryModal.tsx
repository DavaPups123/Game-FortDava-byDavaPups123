import React, { useState } from 'react';
import { BACKBLINGS, GLIDERS, PICKAXES, RARITY_COLORS, RARITY_LIST, SKINS, WEAPON_DEFS } from '../game/data';
import { t } from '../game/i18n';
import { HudSnapshot, Language, PlayerProfile } from '../game/types';

interface InventoryModalProps {
  open: boolean;
  lang: Language;
  hud: HudSnapshot | null;
  profile?: PlayerProfile;
  onSwapSlots: (idxA: number, idxB: number) => void;
  onDropSlot: (idx: number) => void;
  onEquipSlot: (idx: number) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  open,
  lang,
  hud,
  profile,
  onSwapSlots,
  onDropSlot,
  onEquipSlot,
  onClose,
}) => {
  const [selectedSwapSlot, setSelectedSwapSlot] = useState<number | null>(null);
  const tr = t(lang);

  if (!open || !hud) return null;

  const handleSlotClick = (idx: number) => {
    if (idx === 0) {
      setSelectedSwapSlot(null);
      onEquipSlot(0);
      return;
    }
    if (selectedSwapSlot === null) {
      setSelectedSwapSlot(idx);
    } else if (selectedSwapSlot === idx) {
      setSelectedSwapSlot(null);
    } else {
      onSwapSlots(selectedSwapSlot, idx);
      setSelectedSwapSlot(null);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#060d1c]/82 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={tr.inventoryTitle}
    >
      <div className="w-full max-w-3xl rounded-2xl border-2 border-sky-400/50 bg-[#0c1830] p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-2xl font-black italic tracking-wide text-yellow-400">
              🎒 {tr.inventoryTitle}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-300">
              {selectedSwapSlot !== null ? tr.swapModeHint : tr.inventoryHint}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-yellow-400/40 bg-[#081124] px-3 py-1.5 text-xs font-black tabular-nums text-yellow-300">
              🪵 {tr.wood}: {hud.wood}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedSwapSlot(null);
                onClose();
              }}
              className="rounded-lg border border-white/20 bg-slate-800 px-3 py-1.5 text-xs font-black text-white hover:bg-slate-700"
            >
              ✕ [TAB]
            </button>
          </div>
        </div>

        {/* 5-Slot Fortnite Loadout Grid */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-5">
          {hud.inventory.map((slot, idx) => {
            const def = slot ? WEAPON_DEFS[slot.itemType] : null;
            const rarId = slot ? RARITY_LIST[slot.rarityIdx] || 'common' : 'common';
            const rarColor = RARITY_COLORS[rarId].css;
            const isEquipped = hud.activeSlot === idx;
            const isSwapSource = selectedSwapSlot === idx;
            const isPickaxe = idx === 0;

            return (
              <div
                key={idx}
                className={`flex flex-col justify-between rounded-xl border-2 bg-[#081124] p-3 transition ${
                  isSwapSource
                    ? 'border-yellow-400 ring-2 ring-yellow-400/50'
                    : isEquipped
                      ? 'border-sky-400'
                      : 'border-white/15'
                }`}
                style={{
                  borderTopColor: slot ? rarColor : undefined,
                  borderTopWidth: slot ? '4px' : undefined,
                }}
              >
                <button
                  type="button"
                  onClick={() => handleSlotClick(idx)}
                  className="flex flex-col items-center text-center"
                >
                  <div className="flex w-full items-center justify-between text-[10px] font-black text-slate-400">
                    <span>#{idx + 1}</span>
                    {isPickaxe ? (
                      <span className="text-slate-500">🔒</span>
                    ) : isSwapSource ? (
                      <span className="text-yellow-400">⇄</span>
                    ) : null}
                  </div>
                  <div className="my-2 text-3xl">{def ? def.icon : '—'}</div>
                  <div className="w-full truncate text-xs font-black text-white">
                    {def ? (lang === 'ru' ? def.nameRu : def.nameEn) : tr.empty}
                  </div>
                  {slot && def ? (
                    <>
                      <div className="mt-0.5 text-[10px] font-extrabold uppercase" style={{ color: rarColor }}>
                        {tr.rarities[rarId]}
                      </div>
                      <div className="mt-2 w-full rounded bg-slate-900/90 px-2 py-1 text-[10px] font-bold tabular-nums text-slate-300">
                        {def.type === 'consumable' ? (
                          <span>
                            {def.healHp ? `+${def.healHp} HP ` : ''}
                            {def.healShield ? `+${def.healShield} 🛡️ ` : ''}
                            (×{slot.count})
                          </span>
                        ) : def.type === 'melee' ? (
                          <span>
                            DMG {def.damage} · ∞
                          </span>
                        ) : (
                          <span>
                            DMG {Math.round(def.damage * RARITY_COLORS[rarId].mult)}
                            {def.pellets > 1 ? `×${def.pellets}` : ''} · {slot.ammo}/{def.magSize}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mt-2 text-[10px] text-slate-500">
                      {lang === 'ru' ? 'Свободный слот' : 'Empty slot'}
                    </div>
                  )}
                </button>

                <div className="mt-3 flex gap-1.5">
                  <button
                    type="button"
                    disabled={!slot}
                    onClick={() => {
                      setSelectedSwapSlot(null);
                      onEquipSlot(idx);
                      onClose();
                    }}
                    className="flex-1 rounded-lg bg-sky-500/20 py-1 text-[10px] font-black text-sky-300 hover:bg-sky-500/35 disabled:opacity-35"
                  >
                    {tr.equipItem}
                  </button>
                  {!isPickaxe && (
                    <button
                      type="button"
                      disabled={!slot}
                      onClick={() => {
                        if (selectedSwapSlot === idx) setSelectedSwapSlot(null);
                        onDropSlot(idx);
                      }}
                      className="flex-1 rounded-lg bg-red-500/20 py-1 text-[10px] font-black text-red-300 hover:bg-red-500/35 disabled:opacity-35"
                    >
                      {tr.dropItem}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Equipped Loadout Cosmetics Strip (Fortnite Style) */}
        {profile && (() => {
          const skin = SKINS.find((s) => s.id === profile.equippedSkin) || SKINS[0];
          const back = BACKBLINGS.find((b) => b.id === profile.equippedBackbling) || BACKBLINGS[0];
          const pick = PICKAXES.find((p) => p.id === profile.equippedPickaxe) || PICKAXES[0];
          const glid = GLIDERS.find((g) => g.id === profile.equippedGlider) || GLIDERS[0];
          const items = [
            { label: tr.shopFilterSkins, name: lang === 'ru' ? skin.nameRu : skin.nameEn, rarity: skin.rarity },
            { label: tr.shopFilterBackblings, name: lang === 'ru' ? back.nameRu : back.nameEn, rarity: back.rarity },
            { label: tr.shopFilterPickaxes, name: lang === 'ru' ? pick.nameRu : pick.nameEn, rarity: pick.rarity },
            { label: tr.shopFilterGliders, name: lang === 'ru' ? glid.nameRu : glid.nameEn, rarity: glid.rarity },
          ];
          return (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 sm:grid-cols-4">
              {items.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-white/10 bg-[#081124] px-3 py-2"
                  style={{ borderLeft: `3px solid ${RARITY_COLORS[item.rarity].css}` }}
                >
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">{item.label}</div>
                  <div className="truncate text-xs font-black text-white">{item.name}</div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
};
