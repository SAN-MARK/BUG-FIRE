import React, { useState, useEffect } from 'react';

export const MatchmakingScreen: React.FC = () => {
  const [dotsFound, setDotsFound] = useState(1);
  const [isFound, setIsFound] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDotsFound((prev) => {
        if (prev >= 49) {
          setIsFound(true);
          return 49;
        }
        return prev + Math.floor(6 + Math.random() * 8);
      });
    }, 200);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0a1a]/95">
      <div className="flex flex-col items-center text-center p-8 bg-[#10002b] border-2 border-[#4cc9f0] rounded-2xl shadow-[0_0_40px_rgba(76,201,240,0.5)]">
        {/* Radar Spinner */}
        <div className="relative w-28 h-28 rounded-full border-2 border-[#4cc9f0]/40 flex items-center justify-center mb-6 overflow-hidden">
          <div className="absolute inset-2 rounded-full border border-[#4cc9f0]/20" />
          <div className="absolute inset-6 rounded-full border border-[#4cc9f0]/10" />

          {/* Sweeper ray */}
          <div className="absolute inset-0 origin-center animate-spin [animation-duration:2s]">
            <div className="w-1/2 h-1/2 bg-gradient-to-br from-[#4cc9f0]/60 to-transparent rounded-tl-full" />
          </div>

          {/* Center blip */}
          <div className="w-3 h-3 bg-[#ffd166] rounded-full shadow-[0_0_10px_#ffd166] z-10" />
        </div>

        <h3 className="text-2xl sm:text-3xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-[#ffd166] to-[#f72585] font-['Orbitron',sans-serif]">
          {isFound ? 'MATCH FOUND!' : `MATCHMAKING... (${dotsFound}/49)`}
        </h3>

        <p className="text-xs font-mono text-[#4cc9f0] mt-2 tracking-widest uppercase">
          {isFound ? 'PREPARING DROP PLANE TRANSPORTER' : 'GATHERING BOT OPERATORS ON GRID'}
        </p>

        {/* Small Progress Dots */}
        <div className="flex gap-1.5 mt-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i < Math.floor((dotsFound / 49) * 8)
                  ? 'bg-[#ffd166] shadow-[0_0_8px_#ffd166]'
                  : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
