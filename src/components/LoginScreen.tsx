import React, { useState, useEffect } from 'react';
import { soundEngine } from '../game/audio';

interface Props {
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('bugfire_username');
      if (savedUser) {
        setUsername(savedUser);
      }
    } catch (e) {
      console.warn('localStorage read error', e);
    }
  }, []);

  const validateAndSubmit = (nameToUse?: string) => {
    const finalName = (nameToUse || username).trim();

    if (finalName.length < 3) {
      setError('Callsign must be at least 3 characters long.');
      return;
    }
    if (finalName.length > 14) {
      setError('Callsign cannot exceed 14 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(finalName)) {
      setError('Only letters, numbers, and underscores allowed.');
      return;
    }

    setError(null);
    try {
      if (rememberMe) {
        localStorage.setItem('bugfire_username', finalName);
      } else {
        localStorage.removeItem('bugfire_username');
      }
    } catch (e) {}

    soundEngine.playPickup();
    onLoginSuccess(finalName);
  };

  const handleGuest = () => {
    const randomGuest = `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    validateAndSubmit(randomGuest);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-b from-[#0a0a1a]/95 via-[#16062b]/95 to-[#240046]/95">
      <div className="w-full max-w-md p-8 bg-[#10002b] border-2 border-[#f72585] rounded-2xl shadow-[0_0_40px_rgba(247,37,133,0.5)]">
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#ffd166] via-[#f72585] to-[#4cc9f0] font-['Orbitron',sans-serif]">
            OPERATOR LOGIN
          </h2>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
            Enter your battle pass callsign
          </p>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-[#4cc9f0] uppercase mb-1 tracking-wider">
            Callsign / Handle
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Vance_Rider"
            className="w-full px-4 py-3 bg-[#1a0a33] border border-[#7209b7] focus:border-[#ffd166] focus:outline-none rounded-xl text-white font-mono placeholder-slate-500 text-sm transition-all"
            maxLength={14}
            onKeyDown={(e) => {
              if (e.key === 'Enter') validateAndSubmit();
            }}
          />
          {error && (
            <p className="mt-1.5 text-xs text-[#ff0055] font-semibold flex items-center gap-1">
              <span>⚠️</span> {error}
            </p>
          )}
        </div>

        {/* Remember me checkbox */}
        <div className="flex items-center justify-between mb-6 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="accent-[#f72585] w-4 h-4 rounded cursor-pointer"
            />
            <span>Remember my callsign</span>
          </label>
          <span className="text-slate-500 text-[11px]">3–14 chars</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => validateAndSubmit()}
            className="w-full py-3.5 bg-gradient-to-r from-[#f72585] to-[#7209b7] hover:from-[#ff007f] hover:to-[#9d4edd] text-white font-bold rounded-xl tracking-wider uppercase shadow-[0_0_20px_rgba(247,37,133,0.6)] border border-[#f72585] cursor-pointer transition-transform active:scale-95 font-['Orbitron',sans-serif]"
          >
            LOGIN
          </button>

          <button
            onClick={handleGuest}
            className="w-full py-3 bg-[#1e1038] hover:bg-[#2b1752] text-[#ffd166] font-semibold rounded-xl tracking-wider uppercase border border-[#ffd166]/40 cursor-pointer transition-all text-xs"
          >
            QUICK GUEST LOGIN
          </button>
        </div>
      </div>
    </div>
  );
};
