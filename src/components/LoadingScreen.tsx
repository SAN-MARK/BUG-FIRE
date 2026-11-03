import React, { useState, useEffect } from 'react';
import { assetManager } from '../game/assets';
import { soundEngine } from '../game/audio';
import { gameEngine } from '../game/engine';

interface Props {
  onEnter: () => void;
}

const TIPS = [
  '🌴 Land on rooftops for rare sniper rifles and high-tier armor!',
  '⚡ Press G to deploy a Gloo Wall and block incoming enemy bullet fire.',
  '🎯 Headshots with the M4 Rifle deal 1.8x critical damage.',
  '✈️ Flyable planes are stationed at the airfield runway and coastal meadows.',
  '🚨 The Storm Zone deals increasing damage each phase. Keep moving inward!',
  '🛡️ Teammates in Duo and Squad can be revived within 30 seconds of being downed.',
  '🚗 Jump into buggy vehicles with F for high-speed cross-island rotation.',
];

export const LoadingScreen: React.FC<Props> = ({ onEnter }) => {
  const [progress, setProgress] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [statusText, setStatusText] = useState('Initializing Vice City 3D engine...');
  const [isReady, setIsReady] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    // Rotate tips every 3.5 seconds
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 3500);

    // Load assets
    assetManager.loadAll((prog, text) => {
      setProgress(prog);
      setStatusText(text);
    }).then(() => {
      setProgress(1.0);
      setStatusText('Vice City Battleground Ready!');
      setIsReady(true);
      setWarnings(assetManager.loadWarnings);
      gameEngine.refreshLobbyCharacter();
    });

    return () => clearInterval(tipTimer);
  }, []);

  const handleStart = () => {
    soundEngine.init();
    soundEngine.playPickup();
    soundEngine.startLobbyMusic();
    onEnter();
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#0a0a1a] via-[#1a0933] to-[#2b0938] text-white">
      {/* Top Banner */}
      <div className="pt-8 text-center">
        <span className="px-3 py-1 text-xs tracking-widest uppercase bg-[#f72585]/20 border border-[#f72585] rounded-full text-[#f72585] font-bold">
          PS2 Retro 3D Battle Royale
        </span>
      </div>

      {/* Center Neon Title Lockup */}
      <div className="flex flex-col items-center text-center">
        <h1 className="text-6xl sm:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#f72585] via-[#ffd166] to-[#4cc9f0] drop-shadow-[0_0_35px_rgba(247,37,133,0.7)] font-['Orbitron',sans-serif]">
          BUG FIRE
        </h1>
        <p className="mt-2 text-sm sm:text-base font-semibold tracking-widest text-[#ffd166] uppercase">
          50-Player Survival Arena · Vice Sunset Edition
        </p>

        {/* Loading Progress & Tip Box */}
        <div className="w-80 sm:w-96 mt-10">
          <div className="flex justify-between text-xs font-mono text-[#4cc9f0] mb-2">
            <span>{statusText}</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>

          {/* Retro Progress Bar */}
          <div className="w-full h-3 bg-[#10002b] rounded-full border border-[#f72585]/40 overflow-hidden p-0.5 shadow-[0_0_15px_rgba(76,201,240,0.3)]">
            <div
              className="h-full bg-gradient-to-r from-[#f72585] to-[#ffd166] rounded-full transition-all duration-300 shadow-[0_0_10px_#ffd166]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Model Fallback Warning Banner */}
          {warnings.length > 0 && (
            <div className="mt-3 px-3 py-1.5 bg-[#ffd166]/10 border border-[#ffd166]/30 rounded text-[11px] text-[#ffd166] text-left">
              <span className="font-bold">Notice:</span> Loaded procedural 3D models ({warnings.length} items configured).
            </div>
          )}

          {/* Rotating Tip */}
          <div className="mt-6 p-3 bg-[#10002b]/70 border border-[#4cc9f0]/30 rounded-lg text-xs text-slate-300 italic min-h-[44px] flex items-center justify-center">
            {TIPS[tipIndex]}
          </div>

          {/* Enter Button */}
          {isReady && (
            <button
              onClick={handleStart}
              className="mt-6 w-full py-3.5 px-6 bg-gradient-to-r from-[#f72585] to-[#7209b7] hover:from-[#ff007f] hover:to-[#9d4edd] text-white font-bold text-lg rounded-xl tracking-wider uppercase shadow-[0_0_25px_rgba(247,37,133,0.8)] border border-[#f72585] transition-transform active:scale-95 cursor-pointer font-['Orbitron',sans-serif]"
            >
              ENTER ARENA
            </button>
          )}
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="text-[11px] text-slate-400 font-mono tracking-wider">
        THREE.JS R160+ · WEBAUDIO PROCEDURAL SYNTH · 60 FPS ENGINE
      </div>
    </div>
  );
};
