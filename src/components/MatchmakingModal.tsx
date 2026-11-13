import React, { useEffect, useState } from 'react';
import { t } from '../game/i18n';
import { getMatchmakingProgress } from '../game/rules';
import { GameModeId, Language, TeamSizeId } from '../game/types';

interface MatchmakingModalProps {
  stage: 'matchmaking' | 'loading';
  lang: Language;
  mode: GameModeId;
  teamSize: TeamSizeId;
  totalPlayers: number;
  onCancel: () => void;
  onReadyToDeploy: () => void;
}

export const MatchmakingModal: React.FC<MatchmakingModalProps> = ({
  stage,
  lang,
  mode,
  teamSize,
  totalPlayers,
  onCancel,
  onReadyToDeploy,
}) => {
  const tr = t(lang);
  const [elapsed, setElapsed] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const [tipIdx] = useState(() => Math.floor(Math.random() * tr.loadingTips.length));

  useEffect(() => {
    if (stage !== 'matchmaking') return;
    setElapsed(0);
    const id = window.setInterval(() => {
      setElapsed((prev) => prev + 0.25);
    }, 250);
    return () => window.clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'matchmaking') return;
    const prog = getMatchmakingProgress(elapsed, 30, totalPlayers);
    if (prog.ready) {
      onReadyToDeploy();
    }
  }, [elapsed, stage, totalPlayers, onReadyToDeploy]);

  useEffect(() => {
    if (stage !== 'loading') return;
    setLoadProgress(12);
    const id = window.setInterval(() => {
      setLoadProgress((p) => Math.min(100, p + 18));
    }, 180);
    return () => window.clearInterval(id);
  }, [stage]);

  const modeLabel = mode === 'ranked' ? tr.modeRanked : mode === 'tournament' ? tr.modeTournament : tr.modeBr;
  const teamLabel =
    teamSize === 'squad'
      ? tr.squad
      : teamSize === 'trio'
        ? tr.trio
        : teamSize === 'duo'
          ? tr.duo
          : tr.solo;
  const mmProg = getMatchmakingProgress(elapsed, 30, totalPlayers);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060d1c]/92 p-4">
      <div className="w-full max-w-lg rounded-2xl border-2 border-sky-400/50 bg-[#0f1c38] p-8 text-center shadow-2xl">
        {stage === 'matchmaking' ? (
          <>
            <div className="mx-auto mb-5 h-16 w-16 animate-spin rounded-full border-4 border-sky-400/25 border-t-yellow-400" />
            <h2 className="text-3xl font-black italic tracking-wide text-yellow-400">{tr.searchingTitle}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-300">{tr.searchingSub}</p>

            <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl bg-[#091224] p-4 text-left">
              <div>
                <div className="text-[11px] font-extrabold uppercase text-slate-400">{tr.modeLabel}</div>
                <div className="text-sm font-black text-sky-300">{modeLabel}</div>
              </div>
              <div>
                <div className="text-[11px] font-extrabold uppercase text-slate-400">{tr.teamLabel}</div>
                <div className="text-sm font-black text-white">{teamLabel}</div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-sm font-extrabold">
              <span className="text-slate-300">{tr.playersFound}:</span>
              <span className="tabular-nums text-green-400">
                {mmProg.foundPlayers} / {totalPlayers}
              </span>
            </div>

            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-sky-400 transition-all duration-200"
                style={{ width: `${(mmProg.foundPlayers / totalPlayers) * 100}%` }}
              />
            </div>

            <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
              <span>{tr.waitCap}</span>
              <span className="tabular-nums">{elapsed.toFixed(0)}s / 30s</span>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="mt-6 w-full rounded-xl border border-white/20 bg-slate-800 py-3 text-sm font-black tracking-wider text-white hover:bg-slate-700"
            >
              {tr.cancelSearch}
            </button>
          </>
        ) : (
          <>
            <div className="mb-2 inline-block rounded-md bg-sky-500/20 px-3 py-1 text-xs font-black uppercase tracking-widest text-sky-300">
              {modeLabel} • {teamLabel}
            </div>
            <h2 className="text-3xl font-black italic tracking-wide text-white">{tr.loadingTitle}</h2>

            <div className="mt-6 h-4 w-full overflow-hidden rounded-full border border-white/20 bg-slate-900">
              <div
                className="h-full bg-yellow-400 transition-all duration-150"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <div className="mt-2 text-right text-xs font-black tabular-nums text-yellow-400">{loadProgress}%</div>

            <div className="mt-6 rounded-xl border-l-4 border-yellow-400 bg-[#091224] p-4 text-left">
              <div className="text-[11px] font-black uppercase tracking-wider text-yellow-400">{tr.loadingTipLabel}</div>
              <p className="mt-1 text-sm font-semibold text-slate-200">{tr.loadingTips[tipIdx]}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
