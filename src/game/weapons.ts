import * as THREE from 'three';
import { CONFIG, WEAPONS_CONFIG } from './config';
import { WeaponStats, WeaponType } from './types';
import { createProceduralGlooWall } from './procedural';
import { soundEngine } from './audio';

export interface BulletTracer {
  start: THREE.Vector3;
  end: THREE.Vector3;
  current: THREE.Vector3;
  progress: number; // 0 to 1
  speed: number;
  color: THREE.Color;
  mesh: THREE.Line;
}

export interface ImpactSpark {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number; // 0 to 1
  color: THREE.Color;
}

export interface ActiveGlooWall {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  rotationY: number;
  health: number;
  maxHealth: number;
  createdAt: number;
  duration: number; // seconds
}

export class WeaponManager {
  public scene: THREE.Scene;
  public tracers: BulletTracer[] = [];
  public sparks: ImpactSpark[] = [];
  public glooWalls: ActiveGlooWall[] = [];
  private sparkPoints: THREE.Points | null = null;
  private sparkGeo: THREE.BufferGeometry | null = null;
  private sparkMat: THREE.PointsMaterial | null = null;
  private muzzleFlashLight: THREE.PointLight;
  private muzzleFlashTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Short-lived point light for muzzle flash punch
    this.muzzleFlashLight = new THREE.PointLight(0xffeedd, 0, 15);
    this.scene.add(this.muzzleFlashLight);

    this.initSparkPool();
  }

  private initSparkPool() {
    const maxSparks = 100;
    const positions = new Float32Array(maxSparks * 3);
    const colors = new Float32Array(maxSparks * 3);

    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.sparkMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
    this.scene.add(this.sparkPoints);
  }

  public fireBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    weapon: WeaponStats,
    isPlayer: boolean = false
  ) {
    // 1. Play synthesized gunshot
    soundEngine.playGunshot(weapon.id);

    // 2. Muzzle flash lighting
    this.muzzleFlashLight.position.copy(origin);
    this.muzzleFlashLight.color.set(weapon.color);
    this.muzzleFlashLight.intensity = isPlayer ? 4.0 : 1.5;
    this.muzzleFlashTimer = 0.05;

    // 3. Bullet tracer
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(weapon.color),
      linewidth: 2,
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      direction.clone().multiplyScalar(1.5),
    ]);
    const lineMesh = new THREE.Line(lineGeo, lineMat);
    lineMesh.position.copy(origin);
    this.scene.add(lineMesh);

    const hitPoint = origin.clone().add(direction.clone().multiplyScalar(weapon.range));

    this.tracers.push({
      start: origin.clone(),
      end: hitPoint,
      current: origin.clone(),
      progress: 0,
      speed: weapon.bulletSpeed,
      color: new THREE.Color(weapon.color),
      mesh: lineMesh,
    });
  }

  public spawnSparks(pos: THREE.Vector3, normal: THREE.Vector3, colorHex: string = '#ffd166', count = 8) {
    const c = new THREE.Color(colorHex);
    for (let i = 0; i < count; i++) {
      const vel = normal.clone()
        .multiplyScalar(2 + Math.random() * 4)
        .add(new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4));

      this.sparks.push({
        position: pos.clone(),
        velocity: vel,
        life: 1.0,
        color: c,
      });
    }
  }

  public placeGlooWall(playerPos: THREE.Vector3, playerYaw: number): ActiveGlooWall | null {
    // Spawn 2.2m ahead of player facing player
    const spawnDist = 2.2;
    const wx = playerPos.x - Math.sin(playerYaw) * spawnDist;
    const wz = playerPos.z - Math.cos(playerYaw) * spawnDist;

    const wallGroup = createProceduralGlooWall();
    wallGroup.position.set(wx, playerPos.y, wz);
    wallGroup.rotation.y = playerYaw + Math.PI; // Face the oncoming threat
    this.scene.add(wallGroup);

    soundEngine.playGlooWallPlace();

    const wall: ActiveGlooWall = {
      id: `gloo_${Date.now()}_${Math.random()}`,
      mesh: wallGroup,
      position: wallGroup.position.clone(),
      rotationY: wallGroup.rotation.y,
      health: 300,
      maxHealth: 300,
      createdAt: performance.now(),
      duration: CONFIG.GLOO_WALL_DURATION,
    };

    this.glooWalls.push(wall);
    return wall;
  }

  public update(dt: number) {
    // 1. Muzzle flash decay
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashLight.intensity = 0;
      }
    }

    // 2. Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      const dist = t.start.distanceTo(t.end);
      const step = (t.speed * dt) / dist;
      t.progress += step;

      t.current.lerpVectors(t.start, t.end, t.progress);
      t.mesh.position.copy(t.current);

      if (t.progress >= 1.0) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
      }
    }

    // 3. Update Sparks
    const posAttr = this.sparkGeo?.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.sparkGeo?.getAttribute('color') as THREE.BufferAttribute;

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt * 3.0; // Decay over ~0.33s
      s.position.addScaledVector(s.velocity, dt);
      s.velocity.y -= 9.8 * dt; // Gravity on sparks

      if (s.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }

    if (posAttr && colAttr) {
      const pArr = posAttr.array as Float32Array;
      const cArr = colAttr.array as Float32Array;

      for (let i = 0; i < 100; i++) {
        if (i < this.sparks.length) {
          const s = this.sparks[i];
          pArr[i * 3] = s.position.x;
          pArr[i * 3 + 1] = s.position.y;
          pArr[i * 3 + 2] = s.position.z;

          cArr[i * 3] = s.color.r * s.life;
          cArr[i * 3 + 1] = s.color.g * s.life;
          cArr[i * 3 + 2] = s.color.b * s.life;
        } else {
          pArr[i * 3 + 1] = -9999; // Offscreen
        }
      }
      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    }

    // 4. Update Gloo Walls lifetime
    const now = performance.now();
    for (let i = this.glooWalls.length - 1; i >= 0; i--) {
      const wall = this.glooWalls[i];
      const ageSec = (now - wall.createdAt) / 1000;

      if (ageSec > wall.duration || wall.health <= 0) {
        this.scene.remove(wall.mesh);
        this.glooWalls.splice(i, 1);
      }
    }
  }

  public checkGlooWallHit(rayOrigin: THREE.Vector3, rayDir: THREE.Vector3, maxDist: number): { hit: boolean; wall?: ActiveGlooWall; point?: THREE.Vector3 } {
    for (const wall of this.glooWalls) {
      const toWall = wall.position.clone().sub(rayOrigin);
      const dist = toWall.length();
      if (dist < maxDist && toWall.normalize().dot(rayDir) > 0.85) {
        return {
          hit: true,
          wall,
          point: wall.position.clone(),
        };
      }
    }
    return { hit: false };
  }
}
