import * as THREE from 'three';
import { CONFIG } from './config';
import { createProceduralAirdrop } from './procedural';
import { soundEngine } from './audio';
import { TerrainManager } from './terrain';

export interface Airdrop {
  id: string;
  position: THREE.Vector3;
  targetY: number;
  mesh: THREE.Group;
  parachuteMesh: THREE.Mesh;
  isLanded: boolean;
  isLooted: boolean;
}

export class ZoneManager {
  public currentCenter: THREE.Vector2 = new THREE.Vector2(0, 0);
  public currentRadius: number = 420;
  public targetCenter: THREE.Vector2 = new THREE.Vector2(0, 0);
  public targetRadius: number = 360;

  public currentPhase: number = 0;
  public phaseTimer: number = 0;
  public isShrinking: boolean = false;
  public dps: number = 1.0;

  public airdrops: Airdrop[] = [];

  private zoneMesh: THREE.Mesh;
  private scene: THREE.Scene;
  private terrain: TerrainManager;

  constructor(scene: THREE.Scene, terrain: TerrainManager) {
    this.scene = scene;
    this.terrain = terrain;

    // Glowing translucent cylinder for safe zone boundary
    const geo = new THREE.CylinderGeometry(this.currentRadius, this.currentRadius, 180, 64, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4cc9f0,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.zoneMesh = new THREE.Mesh(geo, mat);
    this.zoneMesh.position.set(0, 90, 0);
    this.scene.add(this.zoneMesh);

    this.startPhase(0);
  }

  public startPhase(phaseIdx: number) {
    if (phaseIdx >= CONFIG.ZONE_PHASES.length) return;
    this.currentPhase = phaseIdx;
    const p = CONFIG.ZONE_PHASES[phaseIdx];
    this.phaseTimer = p.delay;
    this.isShrinking = false;
    this.dps = p.dps;

    // Pick next center inside current zone
    const maxShift = Math.max(0, this.currentRadius - p.radius) * 0.7;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * maxShift;

    this.targetCenter.set(
      this.currentCenter.x + Math.cos(angle) * dist,
      this.currentCenter.y + Math.sin(angle) * dist
    );
    this.targetRadius = p.radius;

    // Spawn an airdrop for this phase!
    this.spawnAirdrop();
  }

  public update(dt: number) {
    const currentPhaseConfig = CONFIG.ZONE_PHASES[this.currentPhase] || CONFIG.ZONE_PHASES[CONFIG.ZONE_PHASES.length - 1];

    if (!this.isShrinking) {
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0) {
        // Start shrinking!
        this.isShrinking = true;
        this.phaseTimer = currentPhaseConfig.shrinkDuration;
        soundEngine.playZoneAlarm();
      }
    } else {
      // Shrinking active
      this.phaseTimer -= dt;
      const progress = 1 - Math.max(0, this.phaseTimer / currentPhaseConfig.shrinkDuration);

      // Smooth step radius and center
      this.currentRadius = THREE.MathUtils.lerp(this.currentRadius, this.targetRadius, 0.08);
      this.currentCenter.lerp(this.targetCenter, 0.08);

      if (this.phaseTimer <= 0) {
        // Phase complete, next phase!
        if (this.currentPhase + 1 < CONFIG.ZONE_PHASES.length) {
          this.startPhase(this.currentPhase + 1);
        }
      }
    }

    // Update 3D zone boundary mesh
    this.zoneMesh.position.set(this.currentCenter.x, 90, this.currentCenter.y);
    this.zoneMesh.scale.set(this.currentRadius / 420, 1, this.currentRadius / 420);

    // Update airdrops
    this.updateAirdrops(dt);
  }

  public isOutside(x: number, z: number): boolean {
    const dx = x - this.currentCenter.x;
    const dz = z - this.currentCenter.y;
    return Math.sqrt(dx * dx + dz * dz) > this.currentRadius;
  }

  private spawnAirdrop() {
    // Pick random location inside safe zone
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * this.currentRadius * 0.7;
    const x = this.currentCenter.x + Math.cos(angle) * dist;
    const z = this.currentCenter.y + Math.sin(angle) * dist;
    const targetY = this.terrain.getHeight(x, z);

    const airdropGroup = createProceduralAirdrop();
    airdropGroup.position.set(x, 140, z);

    // Parachute canopy
    const paraGeo = new THREE.ConeGeometry(2.5, 1.8, 12, 1, true);
    paraGeo.rotateX(Math.PI);
    const paraMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      side: THREE.DoubleSide,
      roughness: 0.7,
    });
    const paraMesh = new THREE.Mesh(paraGeo, paraMat);
    paraMesh.position.set(0, 3.2, 0);
    airdropGroup.add(paraMesh);

    this.scene.add(airdropGroup);

    this.airdrops.push({
      id: `airdrop_${Date.now()}`,
      position: airdropGroup.position,
      targetY,
      mesh: airdropGroup,
      parachuteMesh: paraMesh,
      isLanded: false,
      isLooted: false,
    });
  }

  private updateAirdrops(dt: number) {
    this.airdrops.forEach((drop) => {
      if (!drop.isLanded) {
        drop.position.y -= dt * 9.0; // Parachute descent
        if (drop.position.y <= drop.targetY) {
          drop.position.y = drop.targetY;
          drop.isLanded = true;
          // Detach parachute
          drop.mesh.remove(drop.parachuteMesh);
          soundEngine.playLand(true);
        }
      }
    });
  }
}
