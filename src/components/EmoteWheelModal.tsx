import React, { useCallback, useEffect, useState } from 'react';
import { EMOTES, RARITY_COLORS } from '../game/data';
import { t } from '../game/i18n';
import { EmoteDef, Language } from '../game/types';

interface EmoteWheelModalProps {
  open: boolean;
  lang: Language;
  emoteWheelIds: string[];
  isHoldMode: boolean;
  onHoverEmoteChange: (emoteId: string | null) => void;
  onSelectEmote: (emoteId: string) => void;
  onClose: () => void;
}

export const EmoteWheelModal: React.FC<EmoteWheelModalProps> = ({
  open,
  lang,
  emoteWheelIds,
  isHoldMode,
  onHoverEmoteChange,
  onSelectEmote,
  onClose,
}) => {
  const tr = t(lang);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [pointerAngleDeg, setPointerAngleDeg] = useState<number | null>(null);

  const items: EmoteDef[] = emoteWheelIds.map((id) => EMOTES.find((e) => e.id === id) || EMOTES[0]);
  const count = items.length;

  const setHovered = useCallback(
    (idx: number | null) => {
      setActiveIdx(idx);
      onHoverEmoteChange(idx !== null ? items[idx].id : null);
    },
    [items, onHoverEmoteChange]
  );

  useEffect(() => {
    if (!open) {
      setActiveIdx(null);
      setPointerAngleDeg(null);
      onHoverEmoteChange(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < 32) {
        setPointerAngleDeg(null);
        setHovered(null);
        return;
      }

      // Angle in degrees where 0 = top (-90 deg in standard atan2), clockwise [0, 360)
      let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (deg < 0) deg += 360;
      setPointerAngleDeg(deg);

      const sectorSize = 360 / count;
      const shifted = (deg + sectorSize / 2) % 360;
      const idx = Math.floor(shifted / sectorSize) % count;
      setHovered(idx);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [open, count, setHovered, onHoverEmoteChange]);

  if (!open) return null;

  const size = 400;
  const half = size / 2;
  const outerR = 178;
  const innerR = 58;
  const sectorAngle = (Math.PI * 2) / count;

  const buildWedgePath = (idx: number) => {
    // Center sector 0 at top (-PI/2)
    const startA = -Math.PI / 2 + idx * sectorAngle - sectorAngle / 2 + 0.03;
    const endA = -Math.PI / 2 + idx * sectorAngle + sectorAngle / 2 - 0.03;
    const x1 = half + Math.cos(startA) * outerR;
    const y1 = half + Math.sin(startA) * outerR;
    const x2 = half + Math.cos(endA) * outerR;
    const y2 = half + Math.sin(endA) * outerR;
    const x3 = half + Math.cos(endA) * innerR;
    const y3 = half + Math.sin(endA) * innerR;
    const x4 = half + Math.cos(startA) * innerR;
    const y4 = half + Math.sin(startA) * innerR;
    const largeArc = endA - startA > Math.PI ? 1 : 0;

    return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060d1c]/55"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mb-3 rounded-full border border-yellow-400/50 bg-[#0b162c]/95 px-5 py-1.5 text-center shadow-xl">
        <span className="text-xs font-black tracking-wider text-yellow-400">{tr.emoteWheelTitle}</span>
        <span className="ml-2 text-[11px] font-bold text-slate-300">
          {isHoldMode
            ? lang === 'ru'
              ? 'Наведите мышью и отпустите [B / Б]'
              : 'Aim with mouse & release [B]'
            : lang === 'ru'
              ? 'Выберите танец мышью · [B / ESC] Закрыть'
              : 'Click or aim to dance · [B / ESC] Close'}
        </span>
      </div>

      <div className="relative select-none" style={{ width: size, height: size }}>
        {/* SVG Radial Sectors */}
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block drop-shadow-2xl">
          {items.map((em, idx) => {
            const selected = activeIdx === idx;
            const rarityColor = RARITY_COLORS[em.rarity].css;
            return (
              <path
                key={em.id + idx}
                d={buildWedgePath(idx)}
                fill={selected ? 'rgba(250, 204, 21, 0.28)' : 'rgba(13, 23, 42, 0.92)'}
                stroke={selected ? '#facc15' : rarityColor}
                strokeWidth={selected ? 3.5 : 1.75}
                className="cursor-pointer transition-colors duration-75"
                onMouseEnter={() => setHovered(idx)}
                onClick={() => onSelectEmote(em.id)}
              />
            );
          })}

          {/* Pointer Direction Needle */}
          {pointerAngleDeg !== null && (
            <g transform={`translate(${half}, ${half}) rotate(${pointerAngleDeg})`}>
              <line x1={0} y1={-32} x2={0} y2={-innerR + 6} stroke="#facc15" strokeWidth={3} strokeLinecap="round" />
              <polygon points="-6,-46 6,-46 0,-56" fill="#facc15" />
            </g>
          )}
        </svg>

        {/* Sector Icons & Labels */}
        {items.map((em, idx) => {
          const midA = -Math.PI / 2 + idx * sectorAngle;
          const labelR = (outerR + innerR) / 2;
          const lx = half + Math.cos(midA) * labelR;
          const ly = half + Math.sin(midA) * labelR;
          const selected = activeIdx === idx;
          return (
            <button
              key={em.id + '-label-' + idx}
              type="button"
              onMouseEnter={() => setHovered(idx)}
              onClick={() => onSelectEmote(em.id)}
              style={{ left: lx, top: ly }}
              className={`absolute flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-xl p-1 text-center transition-transform ${
                selected ? 'scale-110' : 'scale-100'
              }`}
            >
              <span className="text-3xl leading-none drop-shadow">{em.icon}</span>
              <span className={`mt-1 text-[11px] font-black leading-tight ${selected ? 'text-yellow-300' : 'text-white'}`}>
                {lang === 'ru' ? em.nameRu : em.nameEn}
              </span>
            </button>
          );
        })}

        {/* Center Cancel / Active Preview Hub */}
        <button
          type="button"
          onMouseEnter={() => setHovered(null)}
          onClick={onClose}
          className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-sky-400/60 bg-[#081124] p-2 text-center shadow-xl hover:border-red-400"
        >
          {activeItem ? (
            <>
              <span className="text-2xl">{activeItem.icon}</span>
              <span className="mt-0.5 line-clamp-1 text-[10px] font-black text-yellow-300">
                {lang === 'ru' ? activeItem.nameRu : activeItem.nameEn}
              </span>
            </>
          ) : (
            <>
              <span className="text-base font-black text-slate-300">✕</span>
              <span className="text-[10px] font-bold text-slate-400">{lang === 'ru' ? 'Отмена' : 'Cancel'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
