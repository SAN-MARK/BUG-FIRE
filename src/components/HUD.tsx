import React, { useState, useEffect } from 'react';
import { GameEngine } from '../game/engine';
import { KillFeedEntry, TeammateInfo } from '../game/types';
import { Minimap } from './Minimap';

interface Props {
  engine: GameEngine;
}

export const HUD: React.FC<Props> = ({ engine }) => {
  const [health, setHealth] = useState(100);
  const [armor, setArmor] = useState(0);
  const [stamina, setStamina] = useState(100);
  const [clip, setClip] = useState(30);
  const [reserve, setReserve] = useState(120);
  const [weaponName, setWeaponName] = useState('M4-NEON RIFLE');
  const [aliveCount, setAliveCount] = useState(50);
  const [kills, setKills] = useState(0);
  const [zoneTimer, setZoneTimer] = useState(30);
  const [isZoneShrinking, setIsZoneShrinking] = useState(false);
  const [zonePhase, setZonePhase] = useState(1);
  const [glooCharges, setGlooCharges] = useState(2);
  const [skillCd, setSkillCd] = useState(0);
  const [skillActive, setSkillActive] = useState(false);
  const [killFeed, setKillFeed] = useState<KillFeedEntry[]>([]);
  const [teammates, setTeammates] = useState<TeammateInfo[]>([]);
  const [flightData, setFlightData] = useState<{
    speed: number;
    altitude: number;
    throttle: number;
    gear: boolean;
    flaps: boolean;
    stalling: boolean;
  } | null>(null);
  const [vehicleSpeed, setVehicleSpeed] = useState<number | null>(null);
  const [damageAngle, setDamageAngle] = useState<number | null>(null);

  useEffect(() => {
    // Damage indicator listener
    const onDamageIndicator = (e: any) => {
      if (!engine.player) return;
      const attPos = e.detail.attackerPos;
      if (!attPos) return;

      const pPos = engine.player.position;
      const dx = attPos.x - pPos.x;
      const dz = attPos.z - pPos.z;
      const hitAngle = Math.atan2(dx, dz) - engine.player.yaw;
      setDamageAngle(hitAngle);

      setTimeout(() => setDamageAngle(null), 800);
    };

    window.addEventListener('player-hit-indicator', onDamageIndicator);

    // Refresh HUD loop at 20Hz (every 50ms)
    const interval = setInterval(() => {
      if (!engine.player) return;

      setHealth(Math.round(engine.player.health));
      setArmor(Math.round(engine.player.armor));
      setStamina(Math.round(engine.player.stamina));
      setClip(engine.player.currentClip);
      setReserve(engine.player.ammoReserve);
      setWeaponName(engine.player.activeWeapon.name);
      setGlooCharges(engine.player.glooWallCharges);
      setSkillCd(Math.ceil(engine.player.skillCooldown));
      setSkillActive(engine.player.skillActiveTimer > 0);

      setAliveCount(engine.botMgr.getAliveCount());
      setKills(engine.stats.kills);
      setZoneTimer(Math.ceil(engine.zoneMgr.phaseTimer));
      setIsZoneShrinking(engine.zoneMgr.isShrinking);
      setZonePhase(engine.zoneMgr.currentPhase + 1);

      setKillFeed([...engine.killFeed]);
      setTeammates(engine.botMgr.getTeammatesInfo());

      // Plane telemetry
      if (engine.player.occupiedPlane) {
        const p = engine.player.occupiedPlane;
        const groundY = engine.terrain.getHeight(p.position.x, p.position.z);
        setFlightData({
          speed: Math.round(p.speed),
          altitude: Math.round(p.position.y - groundY),
          throttle: Math.round(p.throttle * 100),
          gear: p.gearDown,
          flaps: p.flapsDown,
          stalling: p.isStalling,
        });
      } else {
        setFlightData(null);
      }

      // Vehicle telemetry
      if (engine.player.occupiedVehicle) {
        setVehicleSpeed(Math.round(Math.abs(engine.player.occupiedVehicle.speed) * 3.6)); // km/h
      } else {
        setVehicleSpeed(null);
      }
    }, 50);

    return () => {
      window.removeEventListener('player-hit-indicator', onDamageIndicator);
      clearInterval(interval);
    };
  }, [engine]);

  // Compass degrees
  const compassAngle = engine.player ? Math.round((-engine.player.yaw * 180) / Math.PI) % 360 : 0;
  const compassNorm = ((compassAngle % 360) + 360) % 360;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30 flex flex-col justify-between p-3 sm:p-5">
      {/* Low Health Screen Vignette */}
      {health < 35 && (
        <div className="absolute inset-0 border-[16px] border-red-600/60 animate-pulse pointer-events-none shadow-[inset_0_0_80px_rgba(255,0,0,0.6)]" />
      )}

      {/* Directional Damage Hit Arc */}
      {damageAngle !== null && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ transform: `rotate(${damageAngle}rad)` }}
        >
          <div className="w-48 h-48 border-t-8 border-red-500 rounded-full blur-[1px] opacity-80" />
        </div>
      )}

      {/* TOP HEADER: Compass Bar, Zone Timer, Alive Count, Killfeed */}
      <div className="flex items-start justify-between">
        {/* Top-Left: Minimap & Zone Timer */}
        <div className="flex flex-col gap-2">
          <Minimap engine={engine} />

          {/* Zone Phase & Timer Pill */}
          <div className="flex items-center gap-2 bg-[#10002b]/85 border border-[#4cc9f0] px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-[0_0_12px_rgba(76,201,240,0.4)] w-max">
            <span className={isZoneShrinking ? 'text-red-400 animate-pulse' : 'text-[#ffd166]'}>
              {isZoneShrinking ? '⚠️ STORM CLOSING:' : `SAFE ZONE [P${zonePhase}]:`}
            </span>
            <span className="text-white text-sm font-black">{zoneTimer}s</span>
          </div>
        </div>

        {/* Top-Center: Compass & Alive Readout */}
        <div className="flex flex-col items-center">
          {/* Compass Ribbon */}
          <div className="px-5 py-1 bg-[#10002b]/90 border border-[#ffd166]/50 rounded-full text-xs font-mono font-bold text-[#ffd166] shadow-[0_0_15px_rgba(255,209,102,0.4)] flex items-center gap-3">
            <span>{compassNorm}°</span>
            <span className="text-white">|</span>
            <span className="tracking-widest">
              {compassNorm > 337 || compassNorm <= 22
                ? 'N'
                : compassNorm <= 67
                ? 'NE'
                : compassNorm <= 112
                ? 'E'
                : compassNorm <= 157
                ? 'SE'
                : compassNorm <= 202
                ? 'S'
                : compassNorm <= 247
                ? 'SW'
                : compassNorm <= 292
                ? 'W'
                : 'NW'}
            </span>
          </div>

          {/* Center Alive & Kills Badge */}
          <div className="mt-2 flex items-center gap-4 bg-[#10002b]/80 border border-[#f72585] px-4 py-1.5 rounded-xl shadow-[0_0_15px_rgba(247,37,133,0.5)]">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">ALIVE</span>
              <span className="text-xl font-black text-[#4cc9f0] font-['Orbitron',sans-serif]">
                {aliveCount}
              </span>
            </div>
            <div className="w-[1px] h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">KILLS</span>
              <span className="text-xl font-black text-[#ffd166] font-['Orbitron',sans-serif]">
                {kills}
              </span>
            </div>
          </div>

          {/* Plane Drop Jumping Instruction */}
          {engine.state === 'DROP' && (
            <div className="mt-4 px-6 py-2 bg-gradient-to-r from-[#f72585] to-[#7209b7] border-2 border-[#ffd166] rounded-xl text-sm font-black text-white uppercase tracking-wider shadow-[0_0_20px_rgba(247,37,133,0.8)] animate-bounce font-['Orbitron',sans-serif]">
              PRESS SPACE TO JUMP FROM PLANE
            </div>
          )}
        </div>

        {/* Top-Right: Kill Feed */}
        <div className="w-56 sm:w-72 flex flex-col gap-1 items-end pointer-events-none">
          {killFeed.map((kf) => (
            <div
              key={kf.id}
              className={`px-2.5 py-1 rounded text-[11px] font-mono tracking-tight flex items-center gap-1.5 shadow-md border ${
                kf.isPlayerKiller
                  ? 'bg-[#f72585]/90 border-[#ffd166] text-white font-bold'
                  : kf.isTeammateVictim
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-[#10002b]/70 border-[#7209b7]/50 text-slate-300'
              }`}
            >
              <span className="truncate max-w-[85px]">{kf.killerName}</span>
              <span className="text-xs text-[#ffd166]">
                {kf.isHeadshot ? '🎯💥' : '🔫'}
              </span>
              <span className="truncate max-w-[85px]">{kf.victimName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MIDDLE FLIGHT & VEHICLE TELEMETRY OVERLAYS */}
      {flightData && (
        <div className="self-center bg-[#10002b]/90 border-2 border-[#4cc9f0] p-4 rounded-2xl shadow-[0_0_30px_rgba(76,201,240,0.6)] flex gap-6 text-center font-mono">
          <div>
            <div className="text-[10px] text-slate-400">SPEED</div>
            <div className="text-2xl font-black text-[#ffd166]">{flightData.speed} m/s</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">ALTITUDE</div>
            <div className="text-2xl font-black text-white">{flightData.altitude} m</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">THROTTLE</div>
            <div className="text-2xl font-black text-[#4cc9f0]">{flightData.throttle}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">GEAR (G)</div>
            <div className={`text-sm font-bold ${flightData.gear ? 'text-green-400' : 'text-slate-500'}`}>
              {flightData.gear ? 'DOWN' : 'UP'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">FLAPS (B)</div>
            <div className={`text-sm font-bold ${flightData.flaps ? 'text-cyan-400' : 'text-slate-500'}`}>
              {flightData.flaps ? 'EXTENDED' : 'RETRACTED'}
            </div>
          </div>
          {flightData.stalling && (
            <div className="px-2 py-1 bg-red-600 text-white font-black text-xs rounded animate-ping self-center">
              STALL WARNING!
            </div>
          )}
        </div>
      )}

      {vehicleSpeed !== null && (
        <div className="self-center bg-[#10002b]/90 border border-[#ffd166] px-5 py-2 rounded-xl text-center font-mono shadow-[0_0_20px_rgba(255,209,102,0.5)]">
          <span className="text-[10px] uppercase text-slate-400">BUGGY SPEED</span>
          <div className="text-3xl font-black text-[#ffd166]">{vehicleSpeed} KM/H</div>
        </div>
      )}

      {/* BOTTOM CLUSTER: Teammates, Health/Armor, Gloo/Skill, Weapon & Ammo */}
      <div className="flex items-end justify-between">
        {/* Bottom-Left: Teammate Squad Cards (in Duo/Squad) */}
        <div className="flex flex-col gap-1.5 w-44 sm:w-52">
          {teammates.map((tm) => (
            <div
              key={tm.id}
              className="p-1.5 bg-[#10002b]/85 border border-[#06d6a0]/60 rounded-lg text-xs"
            >
              <div className="flex justify-between items-center text-[11px] font-bold text-white mb-0.5">
                <span className="truncate">{tm.name}</span>
                <span className={tm.isDowned ? 'text-red-400 animate-pulse' : 'text-[#06d6a0]'}>
                  {tm.isDead ? 'DEAD' : tm.isDowned ? 'DOWNED!' : `${tm.health} HP`}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#06d6a0] transition-all"
                  style={{ width: `${(tm.health / tm.maxHealth) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {/* Player Health & Armor Bars */}
          <div className="p-3 bg-[#10002b]/90 border border-[#f72585] rounded-xl shadow-[0_0_20px_rgba(247,37,133,0.4)] w-60 sm:w-72 mt-1">
            {/* Health */}
            <div className="mb-2">
              <div className="flex justify-between text-xs font-black text-white font-mono mb-1">
                <span className="flex items-center gap-1 text-red-400">❤️ HP</span>
                <span>{health} / 100</span>
              </div>
              <div className="w-full h-3 bg-red-950/80 rounded-full border border-red-500/50 p-0.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    health < 30 ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-r from-red-600 to-[#f72585]'
                  }`}
                  style={{ width: `${Math.max(0, health)}%` }}
                />
              </div>
            </div>

            {/* Armor */}
            <div className="mb-2">
              <div className="flex justify-between text-xs font-black text-white font-mono mb-1">
                <span className="flex items-center gap-1 text-[#4cc9f0]">🛡️ ARMOR</span>
                <span>{armor} / 100</span>
              </div>
              <div className="w-full h-2 bg-blue-950/80 rounded-full border border-blue-500/50 p-0.5 overflow-hidden">
                <div
                  className="h-full bg-[#4cc9f0] rounded-full transition-all duration-200"
                  style={{ width: `${Math.max(0, armor)}%` }}
                />
              </div>
            </div>

            {/* Stamina */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono mb-0.5">
                <span>⚡ STAMINA</span>
                <span>{stamina}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#ffd166] transition-all"
                  style={{ width: `${stamina}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-Center: Gloo Wall & Character Skill Pills */}
        <div className="flex items-center gap-3">
          {/* Gloo Wall Pill */}
          <div className="flex flex-col items-center bg-[#10002b]/90 border border-[#4cc9f0] px-3 py-2 rounded-xl text-center shadow-[0_0_15px_rgba(76,201,240,0.4)]">
            <span className="text-[10px] font-bold text-slate-400">[G] GLOO WALL</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xl font-black text-[#4cc9f0]">{glooCharges}</span>
              <span className="text-[10px] text-slate-500">/ 3</span>
            </div>
          </div>

          {/* Active Skill Pill */}
          <div
            className={`flex flex-col items-center px-3 py-2 rounded-xl text-center border transition-all ${
              skillActive
                ? 'bg-[#06d6a0]/80 border-white text-white shadow-[0_0_20px_#06d6a0]'
                : skillCd > 0
                ? 'bg-[#10002b]/90 border-slate-700 text-slate-500'
                : 'bg-[#10002b]/90 border-[#ffd166] text-[#ffd166] shadow-[0_0_15px_rgba(255,209,102,0.4)]'
            }`}
          >
            <span className="text-[10px] font-bold">[E] HYPER RUSH</span>
            <div className="text-lg font-black font-['Orbitron',sans-serif]">
              {skillActive ? 'ACTIVE! 🔥' : skillCd > 0 ? `${skillCd}s` : 'READY'}
            </div>
          </div>
        </div>

        {/* Bottom-Right: Weapon & Ammo Card */}
        <div className="p-4 bg-[#10002b]/90 border-2 border-[#ffd166] rounded-2xl shadow-[0_0_25px_rgba(255,209,102,0.4)] text-right font-mono">
          <span className="text-xs font-black uppercase text-[#4cc9f0] tracking-wider block font-['Orbitron',sans-serif]">
            {weaponName}
          </span>
          <div className="flex items-baseline justify-end gap-1 mt-1">
            <span className="text-4xl font-black text-white font-['Orbitron',sans-serif]">
              {clip}
            </span>
            <span className="text-lg font-bold text-slate-500">/ {reserve}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            [R] Reload · [Right Click] Aim
          </div>
        </div>
      </div>
    </div>
  );
};
