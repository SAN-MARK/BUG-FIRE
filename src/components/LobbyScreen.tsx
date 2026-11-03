import React from 'react';
import { Difficulty, GameMode, MapId, QualityTier } from '../game/types';
import { MAPS_CONFIG } from '../game/config';
import { soundEngine } from '../game/audio';

interface Props {
  username: string;
  selectedMap: MapId;
  gameMode: GameMode;
  difficulty: Difficulty;
  quality: QualityTier;
  isMuted: boolean;
  onStartMatch: () => void;
  onOpenMapSelect: () => void;
  onChangeMode: (mode: GameMode) => void;
  onChangeDifficulty: (diff: Difficulty) => void;
  onChangeQuality: (q: QualityTier) => void;
  onToggleMute: () => void;
  onOpenHelp: () => void;
}

export const LobbyScreen: React.FC<Props> = ({
  username,
  selectedMap,
  gameMode,
  difficulty,
  quality,
  isMuted,
  onStartMatch,
  onOpenMapSelect,
  onChangeMode,
  onChangeDifficulty,
  onChangeQuality,
  onToggleMute,
  onOpenHelp,
}) => {
  const mapData = MAPS_CONFIG[selectedMap];

  return (
    <div className="absolute inset-0 z-40 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f72585] to-[#7209b7] flex items-center justify-center font-black text-xl text-white shadow-[0_0_15px_rgba(247,37,133,0.8)] border border-[#ffd166]">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-wide text-white font-['Orbitron',sans-serif]">
                {username}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-[#ffd166]/20 text-[#ffd166] border border-[#ffd166]/40">
                Lvl 42 Elite
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">Rank: Platinum V · Season 3</p>
          </div>
        </div>

        {/* Quick Toggles: Sound, Help */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              onToggleMute();
              soundEngine.playPickup();
            }}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-950/80 border-red-500 text-red-300'
                : 'bg-[#10002b]/80 border-[#4cc9f0] text-[#4cc9f0]'
            }`}
          >
            {isMuted ? '🔇 MUTED' : '🔊 AUDIO ON'}
          </button>

          <button
            onClick={() => {
              soundEngine.playPickup();
              onOpenHelp();
            }}
            className="px-3 py-1.5 rounded-lg bg-[#10002b]/80 border border-[#ffd166] text-[#ffd166] hover:bg-[#ffd166]/20 text-xs font-bold transition-all cursor-pointer"
          >
            ❓ CONTROLS
          </button>
        </div>
      </div>

      {/* Middle Center Logo Branding */}
      <div className="text-center my-auto">
        <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#f72585] via-[#ffd166] to-[#4cc9f0] drop-shadow-[0_0_25px_rgba(247,37,133,0.7)] font-['Orbitron',sans-serif]">
          BUG FIRE
        </h1>
        <p className="text-xs sm:text-sm font-semibold tracking-widest text-[#ffd166] uppercase mt-1">
          3D Vice City Battle Royale
        </p>
      </div>

      {/* Bottom Control Dock */}
      <div className="pointer-events-auto w-full max-w-4xl mx-auto bg-[#10002b]/90 border-2 border-[#f72585] rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(247,37,133,0.4)] backdrop-blur-none">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
          {/* 1. Map Card Preview */}
          <div
            onClick={() => {
              soundEngine.playPickup();
              onOpenMapSelect();
            }}
            className="p-3 bg-[#1a0a33] hover:bg-[#280a4a] border border-[#4cc9f0] hover:border-[#ffd166] rounded-xl cursor-pointer transition-all flex flex-col justify-between"
          >
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-[#4cc9f0]">SELECTED MAP</span>
              <span className="text-xs text-[#ffd166]">CHANGE ➔</span>
            </div>
            <div className="mt-1 text-base font-black text-white font-['Orbitron',sans-serif]">
              {mapData.name}
            </div>
            <p className="text-[11px] text-slate-400 truncate">{mapData.subtitle}</p>
          </div>

          {/* 2. Mode Selector: Solo / Duo / Squad */}
          <div className="p-3 bg-[#1a0a33] border border-[#7209b7] rounded-xl">
            <span className="block text-[10px] font-bold text-[#ffd166] uppercase tracking-wider mb-1.5">
              TEAM MODE
            </span>
            <div className="grid grid-cols-3 gap-1">
              {(['SOLO', 'DUO', 'SQUAD'] as GameMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    onChangeMode(m);
                    soundEngine.playPickup();
                  }}
                  className={`py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    gameMode === m
                      ? 'bg-[#f72585] text-white shadow-[0_0_10px_#f72585]'
                      : 'bg-[#10002b] text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Difficulty & Quality Toggles */}
          <div className="p-3 bg-[#1a0a33] border border-[#7209b7] rounded-xl flex flex-col justify-between gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">DIFFICULTY</span>
              <div className="flex gap-1">
                {(['EASY', 'NORMAL', 'HARD'] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      onChangeDifficulty(d);
                      soundEngine.playPickup();
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      difficulty === d ? 'bg-[#ffd166] text-black font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    {d[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">GRAPHICS</span>
              <div className="flex gap-1">
                {(['LOW', 'MEDIUM', 'HIGH'] as QualityTier[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      onChangeQuality(q);
                      soundEngine.playPickup();
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      quality === q ? 'bg-[#4cc9f0] text-black font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    {q[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Giant START MATCH CTA */}
          <button
            onClick={() => {
              soundEngine.playPickup();
              onStartMatch();
            }}
            className="w-full py-4 bg-gradient-to-r from-[#f72585] via-[#ff007f] to-[#7209b7] hover:brightness-110 active:scale-95 text-white font-black text-xl rounded-xl tracking-wider uppercase shadow-[0_0_30px_rgba(247,37,133,0.9)] border-2 border-[#ffd166] transition-transform cursor-pointer font-['Orbitron',sans-serif]"
          >
            START MATCH
          </button>
        </div>
      </div>
    </div>
  );
};
