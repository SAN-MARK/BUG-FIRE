import React from 'react';
import { soundEngine } from '../game/audio';

interface Props {
  onClose: () => void;
}

export const HelpModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
      <div className="w-full max-w-2xl bg-[#10002b] border-2 border-[#4cc9f0] rounded-2xl p-6 sm:p-8 shadow-[0_0_40px_rgba(76,201,240,0.5)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#7209b7] mb-6">
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ffd166] to-[#f72585] font-['Orbitron',sans-serif]">
            OPERATOR FIELD MANUAL
          </h2>
          <button
            onClick={() => {
              soundEngine.playPickup();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-[#1a0a33] text-slate-300 font-bold hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content sections */}
        <div className="space-y-6 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Mouse & Pointer Lock Advice */}
          <div className="p-3 bg-[#ffd166]/10 border border-[#ffd166]/30 rounded-xl text-[#ffd166]">
            <span className="font-bold">Mouse Look / Pointer Lock:</span> Click inside the viewport to capture your mouse cursor. If pointer lock is restricted by the preview iframe, open the game in a dedicated full tab for maximum 360° mouse look!
          </div>

          {/* Infantry Controls */}
          <div>
            <h3 className="text-base font-bold text-[#4cc9f0] uppercase tracking-wider mb-2 font-['Orbitron',sans-serif]">
              INFANTRY COMBAT CONTROLS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">W A S D</span> — Move</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Shift</span> — Sprint</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Space</span> — Jump / Vault</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">C</span> — Crouch</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Left Click</span> — Fire</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Right Click</span> — Aim (ADS)</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">R</span> — Reload</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">F</span> — Pickup / Board / Revive</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">G</span> — Gloo Wall</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">E</span> — Hyper Rush Skill</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">M</span> — Mute Sound</div>
            </div>
          </div>

          {/* Airplane Flight Controls */}
          <div>
            <h3 className="text-base font-bold text-[#f72585] uppercase tracking-wider mb-2 font-['Orbitron',sans-serif]">
              FLYABLE AIRCRAFT CONTROLS
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">F</span> — Enter / Exit (Parachute Jump)</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Shift / Ctrl</span> — Throttle Up / Down</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">W / S</span> — Pitch Down / Up</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">A / D</span> — Bank & Roll</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Q / E</span> — Rudder Yaw</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">G</span> — Landing Gear Up / Down</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">B</span> — Wing Flaps</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Space</span> — Wheel Brakes</div>
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              *Safe Landing: Lower gear with G, reduce speed below 20 m/s with flaps, and touch down gently on land. Water impact results in an instant crash.
            </p>
          </div>

          {/* Drivable Buggies */}
          <div>
            <h3 className="text-base font-bold text-[#06d6a0] uppercase tracking-wider mb-2 font-['Orbitron',sans-serif]">
              DRIVABLE VEHICLES
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">F</span> — Enter / Exit Buggy</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">W / S</span> — Gas / Reverse</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">A / D</span> — Steer</div>
              <div className="p-2 bg-[#1a0a33] rounded"><span className="text-[#ffd166]">Space</span> — Handbrake Drift</div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              soundEngine.playPickup();
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] text-white font-bold rounded-xl text-xs uppercase cursor-pointer"
          >
            DISMISS MANUAL
          </button>
        </div>
      </div>
    </div>
  );
};
