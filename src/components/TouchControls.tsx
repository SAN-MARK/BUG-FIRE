import React, { useState, useRef, useEffect } from 'react';
import { GameEngine } from '../game/engine';

interface Props {
  engine: GameEngine;
}

/**
 * ════ TOUCH & GYROSCOPE MOBILE CONTROLS ════
 * - Left side: Virtual Touch Joystick for player movement & vehicle throttle/steering
 * - Right side: Touch Drag for camera look rotation
 * - Action buttons: Fire, ADS, Jump, Crouch, Reload, Gloo Wall, Skill, Interact (F)
 * - Gyro Aim toggle with iOS permission request handler and sensitivity slider
 */

export const TouchControls: React.FC<Props> = ({ engine }) => {
  const [gyroActive, setGyroActive] = useState(engine.gyroEnabled);
  const [gyroSensitivity, setGyroSensitivity] = useState(engine.gyroSensitivity);

  // Left joystick touch state
  const joystickRef = useRef<HTMLDivElement | null>(null);
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const joystickTouchId = useRef<number | null>(null);
  const joystickCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Right touch look state
  const lookTouchId = useRef<number | null>(null);
  const lookLastPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Request Gyroscope Permission (iOS 13+ requires explicit user gesture)
  const enableGyro = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          engine.gyroEnabled = true;
          setGyroActive(true);
        }
      } catch (err) {
        console.warn('Gyro permission rejected:', err);
      }
    } else {
      engine.gyroEnabled = !gyroActive;
      setGyroActive(!gyroActive);
    }
  };

  const handleSensitivityChange = (val: number) => {
    setGyroSensitivity(val);
    engine.gyroSensitivity = val;
  };

  // Touch Handlers for Virtual Joystick (Left)
  const onJoystickTouchStart = (e: React.TouchEvent) => {
    if (joystickTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    joystickTouchId.current = touch.identifier;

    const rect = joystickRef.current?.getBoundingClientRect();
    if (rect) {
      joystickCenter.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    }
  };

  const onJoystickTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        const dx = touch.clientX - joystickCenter.current.x;
        const dy = touch.clientY - joystickCenter.current.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 45;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
        }

        // Map to game inputs
        const normX = knobX / maxDist;
        const normY = knobY / maxDist;

        engine.inputs.left = normX < -0.3;
        engine.inputs.right = normX > 0.3;
        engine.inputs.forward = normY < -0.3;
        engine.inputs.backward = normY > 0.3;
        engine.inputs.sprint = normY < -0.7; // Hard push forward sprints
      }
    }
  };

  const onJoystickTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId.current) {
        joystickTouchId.current = null;
        if (joystickKnobRef.current) {
          joystickKnobRef.current.style.transform = 'translate(0px, 0px)';
        }
        engine.inputs.left = false;
        engine.inputs.right = false;
        engine.inputs.forward = false;
        engine.inputs.backward = false;
        engine.inputs.sprint = false;
      }
    }
  };

  // Touch Handlers for Drag-to-Look (Right Screen Area)
  const onLookTouchStart = (e: React.TouchEvent) => {
    if (lookTouchId.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lookLastPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const onLookTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current && engine.player) {
        const dx = touch.clientX - lookLastPos.current.x;
        const dy = touch.clientY - lookLastPos.current.y;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };

        engine.player.yaw -= dx * 0.006;
        engine.player.pitch -= dy * 0.006;
      }
    }
  };

  const onLookTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  };

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none flex justify-between p-4">
      {/* LEFT: Virtual Movement Joystick */}
      <div className="self-end pointer-events-auto pb-4 pl-2">
        <div
          ref={joystickRef}
          onTouchStart={onJoystickTouchStart}
          onTouchMove={onJoystickTouchMove}
          onTouchEnd={onJoystickTouchEnd}
          onTouchCancel={onJoystickTouchEnd}
          className="relative w-32 h-32 rounded-full bg-[#10002b]/60 border-2 border-[#4cc9f0]/40 flex items-center justify-center shadow-lg"
        >
          <div
            ref={joystickKnobRef}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f72585] to-[#7209b7] border border-[#ffd166] shadow-[0_0_15px_rgba(247,37,133,0.8)] pointer-events-none"
          />
        </div>
      </div>

      {/* RIGHT: Look Zone + Action Buttons Array */}
      <div
        onTouchStart={onLookTouchStart}
        onTouchMove={onLookTouchMove}
        onTouchEnd={onLookTouchEnd}
        onTouchCancel={onLookTouchEnd}
        className="self-end pointer-events-auto flex flex-col items-end gap-3 pb-4 pr-2"
      >
        {/* Gyro Toggle & Sensitivity Pill */}
        <div className="flex items-center gap-2 bg-[#10002b]/80 border border-slate-700 p-1.5 rounded-lg mb-2">
          <button
            onClick={enableGyro}
            className={`px-2 py-1 text-[10px] font-bold rounded cursor-pointer ${
              gyroActive ? 'bg-[#4cc9f0] text-black' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {gyroActive ? 'GYRO ON' : 'ENABLE GYRO'}
          </button>
          {gyroActive && (
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={gyroSensitivity}
              onChange={(e) => handleSensitivityChange(parseFloat(e.target.value))}
              className="w-16 accent-[#4cc9f0]"
            />
          )}
        </div>

        {/* Action Buttons Cluster */}
        <div className="grid grid-cols-3 gap-2">
          {/* Reload Button */}
          <button
            onTouchStart={() => (engine.inputs.reload = true)}
            onTouchEnd={() => (engine.inputs.reload = false)}
            className="w-12 h-12 rounded-full bg-[#10002b]/90 border border-slate-500 font-bold text-xs text-slate-300 flex items-center justify-center active:scale-90 shadow-md"
          >
            RELOAD
          </button>

          {/* Gloo Wall */}
          <button
            onTouchStart={() => (engine.inputs.useGloo = true)}
            onTouchEnd={() => (engine.inputs.useGloo = false)}
            className="w-12 h-12 rounded-full bg-[#10002b]/90 border border-[#4cc9f0] font-bold text-xs text-[#4cc9f0] flex items-center justify-center active:scale-90 shadow-md"
          >
            GLOO
          </button>

          {/* Skill Button */}
          <button
            onTouchStart={() => (engine.inputs.useSkill = true)}
            onTouchEnd={() => (engine.inputs.useSkill = false)}
            className="w-12 h-12 rounded-full bg-[#10002b]/90 border border-[#ffd166] font-bold text-xs text-[#ffd166] flex items-center justify-center active:scale-90 shadow-md"
          >
            SKILL
          </button>

          {/* Crouch Button */}
          <button
            onTouchStart={() => (engine.inputs.crouch = true)}
            onTouchEnd={() => (engine.inputs.crouch = false)}
            className="w-12 h-12 rounded-full bg-[#10002b]/90 border border-slate-500 font-bold text-xs text-slate-300 flex items-center justify-center active:scale-90 shadow-md"
          >
            CROUCH
          </button>

          {/* Jump Button */}
          <button
            onTouchStart={() => (engine.inputs.jump = true)}
            onTouchEnd={() => (engine.inputs.jump = false)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7209b7] to-[#3a0ca3] border border-white font-black text-sm text-white flex items-center justify-center active:scale-90 shadow-lg"
          >
            JUMP
          </button>

          {/* Interact (F) Button */}
          <button
            onTouchStart={() => (engine.inputs.interact = true)}
            onTouchEnd={() => (engine.inputs.interact = false)}
            className="w-12 h-12 rounded-full bg-[#10002b]/90 border border-[#ffd166] font-bold text-xs text-[#ffd166] flex items-center justify-center active:scale-90 shadow-md"
          >
            USE (F)
          </button>
        </div>

        {/* Primary Fire & ADS Row */}
        <div className="flex items-center gap-3 mt-1">
          {/* ADS Aim Button */}
          <button
            onTouchStart={() => (engine.inputs.aim = true)}
            onTouchEnd={() => (engine.inputs.aim = false)}
            className="w-14 h-14 rounded-full bg-[#10002b]/90 border-2 border-[#4cc9f0] font-black text-xs text-[#4cc9f0] flex items-center justify-center active:scale-90 shadow-lg"
          >
            ADS
          </button>

          {/* Fire Trigger Button */}
          <button
            onTouchStart={() => (engine.inputs.fire = true)}
            onTouchEnd={() => (engine.inputs.fire = false)}
            className="w-18 h-18 rounded-full bg-gradient-to-br from-[#f72585] to-[#ff007f] border-2 border-[#ffd166] font-black text-base text-white flex items-center justify-center active:scale-90 shadow-[0_0_20px_rgba(247,37,133,0.9)]"
          >
            FIRE
          </button>
        </div>
      </div>
    </div>
  );
};
