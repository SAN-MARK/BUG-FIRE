import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../game/engine';

interface Props {
  engine: GameEngine;
}

export const Minimap: React.FC<Props> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;

    const renderMinimap = () => {
      animId = requestAnimationFrame(renderMinimap);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const halfSize = size / 2;
      const worldScale = size / 1000; // 1000m world mapped to canvas size

      ctx.clearRect(0, 0, size, size);

      // Clip to circular viewport
      ctx.save();
      ctx.beginPath();
      ctx.arc(halfSize, halfSize, halfSize - 4, 0, Math.PI * 2);
      ctx.clip();

      // Ocean Background
      ctx.fillStyle = '#0f2027';
      ctx.fillRect(0, 0, size, size);

      // Island Landmass Contour (Centered at halfSize, radius ~440m)
      ctx.beginPath();
      ctx.arc(halfSize, halfSize, 440 * worldScale, 0, Math.PI * 2);
      ctx.fillStyle = '#203a43';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2c5364';
      ctx.stroke();

      // Airfield Runway
      const rwX = halfSize + 0 * worldScale;
      const rwZ = halfSize + -160 * worldScale;
      ctx.fillStyle = '#4a4e69';
      ctx.fillRect(rwX - 8, rwZ - 40, 16, 80);

      // Buildings
      ctx.fillStyle = '#f72585';
      engine.world.buildings.forEach((b) => {
        const bx = halfSize + b.x * worldScale;
        const bz = halfSize + b.z * worldScale;
        const bw = Math.max(3, b.width * worldScale);
        const bd = Math.max(3, b.depth * worldScale);
        ctx.fillRect(bx - bw / 2, bz - bd / 2, bw, bd);
      });

      // Current Safe Storm Zone
      const zcX = halfSize + engine.zoneMgr.currentCenter.x * worldScale;
      const zcZ = halfSize + engine.zoneMgr.currentCenter.y * worldScale;
      const zr = engine.zoneMgr.currentRadius * worldScale;

      ctx.beginPath();
      ctx.arc(zcX, zcZ, zr, 0, Math.PI * 2);
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Next Target Safe Zone (White dashed line)
      if (engine.zoneMgr.isShrinking) {
        const nzcX = halfSize + engine.zoneMgr.targetCenter.x * worldScale;
        const nzcZ = halfSize + engine.zoneMgr.targetCenter.y * worldScale;
        const nzr = engine.zoneMgr.targetRadius * worldScale;

        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.arc(nzcX, nzcZ, nzr, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Drop Plane Path Line
      if (engine.dropPlane) {
        const p1X = halfSize + engine.dropPlane.path.start.x * worldScale;
        const p1Z = halfSize + engine.dropPlane.path.start.z * worldScale;
        const p2X = halfSize + engine.dropPlane.path.end.x * worldScale;
        const p2Z = halfSize + engine.dropPlane.path.end.z * worldScale;

        ctx.beginPath();
        ctx.moveTo(p1X, p1Z);
        ctx.lineTo(p2X, p2Z);
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Drop plane marker
        if (engine.state === 'DROP') {
          const planeX = halfSize + engine.dropPlane.position.x * worldScale;
          const planeZ = halfSize + engine.dropPlane.position.z * worldScale;
          ctx.fillStyle = '#ffd166';
          ctx.beginPath();
          ctx.arc(planeX, planeZ, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Airdrops
      engine.zoneMgr.airdrops.forEach((drop) => {
        const ax = halfSize + drop.position.x * worldScale;
        const az = halfSize + drop.position.z * worldScale;
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(ax, az, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Teammates (Green dots)
      engine.botMgr.bots.forEach((b) => {
        if (b.isTeammate && !b.isDead) {
          const tx = halfSize + b.position.x * worldScale;
          const tz = halfSize + b.position.z * worldScale;
          ctx.fillStyle = '#06d6a0';
          ctx.beginPath();
          ctx.arc(tx, tz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Player marker & vision cone
      if (engine.player) {
        const px = halfSize + engine.player.position.x * worldScale;
        const pz = halfSize + engine.player.position.z * worldScale;

        // Vision cone
        ctx.beginPath();
        ctx.moveTo(px, pz);
        const coneAngle = 0.5;
        ctx.arc(px, pz, 22, engine.player.yaw - Math.PI / 2 - coneAngle, engine.player.yaw - Math.PI / 2 + coneAngle);
        ctx.closePath();
        ctx.fillStyle = 'rgba(76, 201, 240, 0.25)';
        ctx.fill();

        // Player dot
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(px, pz, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();

      // Outer Circular Border
      ctx.beginPath();
      ctx.arc(halfSize, halfSize, halfSize - 3, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f72585';
      ctx.stroke();

      // Cardinal N Indicator
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('N', halfSize, 14);
    };

    renderMinimap();
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-[0_0_20px_rgba(247,37,133,0.5)] border border-[#ffd166]/40 pointer-events-auto bg-[#10002b]/60">
      <canvas ref={canvasRef} width={180} height={180} className="w-full h-full" />
    </div>
  );
};
