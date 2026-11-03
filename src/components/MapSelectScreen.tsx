import React from 'react';
import { MapId } from '../game/types';
import { MAPS_CONFIG } from '../game/config';
import { soundEngine } from '../game/audio';

interface Props {
  currentMap: MapId;
  onSelectMap: (mapId: MapId) => void;
  onBack: () => void;
}

export const MapSelectScreen: React.FC<Props> = ({ currentMap, onSelectMap, onBack }) => {
  const mapKeys: MapId[] = ['BERMUDA', 'PURGATORY', 'KALAHARI'];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-[#0a0a1a]/95 via-[#1a0633]/95 to-[#240046]/95">
      <div className="w-full max-w-4xl bg-[#10002b] border-2 border-[#f72585] rounded-2xl p-6 sm:p-8 shadow-[0_0_40px_rgba(247,37,133,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-[#7209b7]/50 mb-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ffd166] via-[#f72585] to-[#4cc9f0] font-['Orbitron',sans-serif]">
              ARENA DEPLOYMENT ZONE
            </h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
              Select your battle royale battlefield
            </p>
          </div>
          <button
            onClick={() => {
              soundEngine.playPickup();
              onBack();
            }}
            className="px-4 py-2 rounded-xl bg-[#1a0a33] hover:bg-[#280a4a] border border-slate-500 text-slate-300 font-bold text-xs uppercase cursor-pointer"
          >
            ← BACK TO LOBBY
          </button>
        </div>

        {/* 3 Map Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {mapKeys.map((mapId) => {
            const data = MAPS_CONFIG[mapId];
            const isSelected = currentMap === mapId;

            return (
              <div
                key={mapId}
                onClick={() => {
                  soundEngine.playPickup();
                  onSelectMap(mapId);
                }}
                className={`p-5 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#240046] border-4 border-[#ffd166] shadow-[0_0_25px_rgba(255,209,102,0.8)] scale-102'
                    : 'bg-[#18082e] border-2 border-[#7209b7]/60 hover:border-[#4cc9f0] hover:scale-101'
                }`}
              >
                <div>
                  {/* Generated Stylized Mini Canvas Preview */}
                  <div
                    className="w-full h-32 rounded-lg mb-4 flex flex-col justify-end p-3 relative overflow-hidden shadow-inner border border-white/10"
                    style={{
                      background: `linear-gradient(to bottom, ${data.skyColorTop}, ${data.skyColorBottom})`,
                    }}
                  >
                    {/* Retro Sun Disc */}
                    <div
                      className="absolute top-3 right-6 w-12 h-12 rounded-full opacity-90 blur-[1px]"
                      style={{ background: data.sunColor }}
                    />

                    {/* Low-poly mountain silhouettes */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                      <polygon
                        points="0,128 30,70 70,128 110,60 160,128 200,80 260,128"
                        fill={data.terrainColors.rock}
                        opacity="0.85"
                      />
                      <polygon
                        points="0,128 40,95 80,128 140,85 200,128 260,105 300,128"
                        fill={data.terrainColors.grass}
                        opacity="0.95"
                      />
                    </svg>

                    <span className="relative z-10 text-[10px] font-black uppercase tracking-widest text-[#ffd166] px-2 py-0.5 rounded bg-black/60 w-max">
                      {mapId}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white font-['Orbitron',sans-serif]">
                    {data.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#4cc9f0] mt-0.5">{data.subtitle}</p>

                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                    {data.description}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400">50 Players · Solo/Squad</span>
                  {isSelected ? (
                    <span className="px-2.5 py-1 bg-[#ffd166] text-black font-black text-[11px] rounded uppercase tracking-wider">
                      SELECTED ✅
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 font-semibold uppercase">
                      Click to Select
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => {
              soundEngine.playPickup();
              onBack();
            }}
            className="px-8 py-3 bg-gradient-to-r from-[#f72585] to-[#7209b7] hover:brightness-110 text-white font-bold text-sm rounded-xl uppercase tracking-wider shadow-[0_0_20px_rgba(247,37,133,0.6)] cursor-pointer font-['Orbitron',sans-serif]"
          >
            CONFIRM SELECTION
          </button>
        </div>
      </div>
    </div>
  );
};
