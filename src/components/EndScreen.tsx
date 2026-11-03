import React from 'react';
import { MatchStats } from '../game/types';
import { soundEngine } from '../game/audio';

interface Props {
  isBooyah: boolean;
  stats: MatchStats;
  onPlayAgain: () => void;
  onLobby: () => void;
}

export const EndScreen: React.FC<Props> = ({ isBooyah, stats, onPlayAgain, onLobby }) => {
  const minutes = Math.floor(stats.survivalTime / 60);
  const seconds = stats.survivalTime % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#0a0a1a]/95 via-[#1a0633]/95 to-[#240046]/95">
      <div className="w-full max-w-xl p-8 bg-[#10002b] border-4 border-[#ffd166] rounded-3xl shadow-[0_0_50px_rgba(255,209,102,0.6)] text-center">
        {/* Banner Title */}
        <div className="mb-6">
          <h1
            className={`text-6xl sm:text-7xl font-black italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,209,102,0.8)] font-['Orbitron',sans-serif] ${
              isBooyah ? 'text-[#ffd166]' : 'text-[#f72585]'
            }`}
          >
            {isBooyah ? 'BOOYAH!' : 'GAME OVER'}
          </h1>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4cc9f0] mt-1">
            {isBooyah ? 'CHAMPION OF VICE ISLAND' : 'ELIMINATED IN COMBAT'}
          </p>
        </div>

        {/* Placement Badge */}
        <div className="inline-block px-6 py-2 bg-[#1a0a33] border-2 border-[#ffd166] rounded-2xl mb-8 shadow-inner">
          <span className="text-xs uppercase font-bold text-slate-400 block">PLACEMENT</span>
          <span className="text-3xl sm:text-4xl font-black text-white font-['Orbitron',sans-serif]">
            #{stats.placement}{' '}
            <span className="text-sm text-slate-400 font-normal">/ {stats.totalPlayers}</span>
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 font-mono">
          <div className="p-3 bg-[#18082e] border border-slate-700 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">KILLS</span>
            <span className="text-2xl font-black text-[#f72585]">{stats.kills}</span>
          </div>

          <div className="p-3 bg-[#18082e] border border-slate-700 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">DAMAGE</span>
            <span className="text-2xl font-black text-[#ffd166]">{stats.damage}</span>
          </div>

          <div className="p-3 bg-[#18082e] border border-slate-700 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">SURVIVED</span>
            <span className="text-2xl font-black text-[#4cc9f0]">{timeFormatted}</span>
          </div>

          <div className="p-3 bg-[#18082e] border border-slate-700 rounded-xl">
            <span className="text-[10px] text-slate-400 block uppercase">RANK POINTS</span>
            <span className="text-2xl font-black text-green-400">+{stats.rankPoints}</span>
          </div>
        </div>

        {/* Action Buttons: Play Again & Lobby */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => {
              soundEngine.playPickup();
              onPlayAgain();
            }}
            className="flex-1 py-4 bg-gradient-to-r from-[#f72585] to-[#7209b7] hover:brightness-110 active:scale-95 text-white font-black text-lg rounded-xl tracking-wider uppercase shadow-[0_0_25px_rgba(247,37,133,0.8)] border border-[#ffd166] cursor-pointer transition-transform font-['Orbitron',sans-serif]"
          >
            PLAY AGAIN
          </button>

          <button
            onClick={() => {
              soundEngine.playPickup();
              onLobby();
            }}
            className="flex-1 py-4 bg-[#1a0a33] hover:bg-[#280a4a] text-[#ffd166] font-bold text-base rounded-xl tracking-wider uppercase border border-[#ffd166]/50 cursor-pointer transition-all"
          >
            RETURN TO LOBBY
          </button>
        </div>
      </div>
    </div>
  );
};
