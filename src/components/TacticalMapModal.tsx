import React, { useEffect, useRef } from 'react';
import { POIS, WORLD_RADIUS } from '../game/data';
import { t } from '../game/i18n';
import { HudSnapshot, Language } from '../game/types';

interface TacticalMapModalProps {
  open: boolean;
  lang: Language;
  hud: HudSnapshot | null;
  onPlaceMarker: (x: number, z: number) => void;
  onClearMarker: () => void;
  onClose: () => void;
}

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({
  open,
  lang,
  hud,
  onPlaceMarker,
  onClearMarker,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tr = t(lang);

  useEffect(() => {
    if (!open || !hud || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = w / (WORLD_RADIUS * 2.15);

    ctx.clearRect(0, 0, w, h);
    // Ocean
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, w, h);

    // Island base
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, WORLD_RADIUS * scale * 0.94, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#38b864';
    ctx.fillRect(0, 0, w, h);

    // Snow Biome (NW)
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx - 125 * scale, cy - 135 * scale, 130 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Desert Biome (SE)
    ctx.fillStyle = '#e6a856';
    ctx.beginPath();
    ctx.arc(cx + 145 * scale, cy + 125 * scale, 125 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Winding River
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 14 * scale;
    ctx.beginPath();
    for (let z = -WORLD_RADIUS; z <= WORLD_RADIUS; z += 20) {
      const rx = 78 + Math.sin(z * 0.015) * 32;
      if (z === -WORLD_RADIUS) ctx.moveTo(cx + rx * scale, cy + z * scale);
      else ctx.lineTo(cx + rx * scale, cy + z * scale);
    }
    ctx.stroke();

    // East-West Highway
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - (WORLD_RADIUS - 40) * scale, cy);
    ctx.lineTo(cx + (WORLD_RADIUS - 40) * scale, cy);
    ctx.stroke();

    // Central Plaza
    ctx.fillStyle = '#475569';
    ctx.fillRect(cx - 52 * scale, cy - 52 * scale, 104 * scale, 104 * scale);

    ctx.restore();

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((w / 8) * i, 0);
      ctx.lineTo((w / 8) * i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (h / 8) * i);
      ctx.lineTo(w, (h / 8) * i);
      ctx.stroke();
    }

    // POI Labels
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    POIS.forEach((poi) => {
      const px = cx + poi.x * scale;
      const py = cy + poi.z * scale;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      const label = lang === 'ru' ? poi.nameRu : poi.nameEn;
      const tw = ctx.measureText(label).width + 12;
      ctx.fillRect(px - tw / 2, py - 9, tw, 18);
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(label, px, py + 4);
    });

    // Vehicles
    hud.vehiclesOnMap.forEach((v) => {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(cx + v.x * scale - 3, cy + v.z * scale - 3, 6, 6);
    });

    // Token Chests
    hud.tokenChests.forEach((ch) => {
      if (ch.opened) return;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(cx + ch.x * scale, cy + ch.z * scale, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Battle Bus Flight Line
    if (hud.phase === 'battle_bus' || hud.phase === 'skydiving') {
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + hud.busStart.x * scale, cy + hud.busStart.z * scale);
      ctx.lineTo(cx + hud.busEnd.x * scale, cy + hud.busEnd.z * scale);
      ctx.stroke();
      ctx.setLineDash([]);

      if (hud.phase === 'battle_bus') {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(cx + hud.busPos.x * scale, cy + hud.busPos.z * scale, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Next Safe Zone & Storm Circle
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + hud.stormNextX * scale, cy + hud.stormNextZ * scale, hud.stormNextRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + hud.stormX * scale, cy + hud.stormZ * scale, hud.stormRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Teammates & Teammate Markers
    hud.teammates.forEach((tm) => {
      if (tm.marker) {
        const mx = cx + tm.marker.x * scale;
        const my = cy + tm.marker.z * scale;
        ctx.fillStyle = tm.color;
        ctx.beginPath();
        ctx.moveTo(mx, my - 10);
        ctx.lineTo(mx + 6, my);
        ctx.lineTo(mx - 6, my);
        ctx.closePath();
        ctx.fill();
      }
      if (tm.alive) {
        const tx = cx + tm.x * scale;
        const ty = cy + tm.z * scale;
        ctx.fillStyle = tm.color;
        ctx.beginPath();
        ctx.arc(tx, ty, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Player Marker Pin
    if (hud.playerMarker) {
      const mx = cx + hud.playerMarker.x * scale;
      const my = cy + hud.playerMarker.z * scale;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(mx, my - 12, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 5, my - 6);
      ctx.lineTo(mx + 5, my - 6);
      ctx.lineTo(mx, my + 2);
      ctx.closePath();
      ctx.fill();
    }

    // Player Arrow
    const px = cx + hud.playerX * scale;
    const py = cy + hud.playerZ * scale;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-hud.playerYaw);
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6.5, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-6.5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [open, hud, lang]);

  if (!open || !hud) return null;

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const ly = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const scale = canvas.width / (WORLD_RADIUS * 2.15);
    const wx = (lx - canvas.width / 2) / scale;
    const wz = (ly - canvas.height / 2) / scale;
    onPlaceMarker(wx, wz);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060d1c]/85 p-4"
      onContextMenu={(e) => {
        e.preventDefault();
        onClearMarker();
      }}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-sky-400/50 bg-[#0d172a] p-5 shadow-2xl">
        <div className="flex w-full items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black italic tracking-wide text-yellow-400">{tr.mapTitle}</h2>
            <p className="text-xs font-semibold text-slate-300">{tr.mapHint}</p>
          </div>
          <div className="flex items-center gap-2">
            {hud.playerMarker && (
              <button
                type="button"
                onClick={onClearMarker}
                className="rounded-lg border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-extrabold text-red-200 hover:bg-red-500/35"
              >
                {tr.removeMarker} ({hud.markerDistance ?? 0} m)
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Map"
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-600"
            >
              ✕ [M]
            </button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          width={560}
          height={560}
          onClick={handleCanvasClick}
          onMouseDown={(e) => {
            if (e.button === 1) {
              e.preventDefault();
              handleCanvasClick(e);
            }
          }}
          onAuxClick={(e) => {
            if (e.button === 1) e.preventDefault();
          }}
          className="h-[min(70vh,540px)] w-[min(70vh,540px)] cursor-crosshair rounded-xl border-2 border-white/25"
        />

        <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-400" /> {lang === 'ru' ? 'Вы / Авто' : 'You / Cars'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-sky-400" /> {lang === 'ru' ? 'Метка / Токен-сундук' : 'Ping / Token Chest'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-green-400" /> {lang === 'ru' ? 'Отряд' : 'Squadmates'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full bg-purple-400" /> {lang === 'ru' ? 'Буря' : 'Storm'}
          </span>
        </div>
      </div>
    </div>
  );
};
