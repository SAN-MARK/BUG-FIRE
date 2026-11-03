import * as THREE from 'three';
import { CONFIG } from './config';
import { createProceduralVehicle } from './procedural';
import { TerrainManager } from './terrain';
import { soundEngine } from './audio';

export class DrivableVehicle {
  public id: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw: number = 0;
  public speed: number = 0; // m/s
  public steerAngle: number = 0;
  public health: number = 300;
  public maxHealth: number = 300;
  public isDestroyed: boolean = false;
  private terrain: TerrainManager;
  private scene: THREE.Scene;

  constructor(id: string, startPos: THREE.Vector3, scene: THREE.Scene, terrain: TerrainManager) {
    this.id = id;
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3();
    this.scene = scene;
    this.terrain = terrain;

    this.mesh = createProceduralVehicle();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  public update(
    dt: number,
    inputs: { throttle: number; steer: number; brake: boolean },
    isOccupied: boolean
  ) {
    if (this.isDestroyed) return;

    if (isOccupied) {
      // Accelerate / Reverse
      if (inputs.throttle !== 0) {
        this.speed += inputs.throttle * CONFIG.CAR_ACCELERATION * dt;
        this.speed = Math.max(-CONFIG.CAR_MAX_SPEED * 0.4, Math.min(CONFIG.CAR_MAX_SPEED, this.speed));
      } else {
        // Friction
        this.speed *= Math.exp(-dt * 2.0);
      }

      if (inputs.brake) {
        this.speed *= Math.exp(-dt * 6.0);
      }

      // Steering
      if (Math.abs(this.speed) > 0.5) {
        const turnDir = this.speed > 0 ? 1 : -1;
        this.yaw -= inputs.steer * CONFIG.CAR_STEER_SPEED * dt * turnDir;
      }
    } else {
      // Natural rolling stop
      this.speed *= Math.exp(-dt * 2.5);
    }

    // Forward direction from yaw
    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);

    this.position.x += forwardX * this.speed * dt;
    this.position.z += forwardZ * this.speed * dt;

    // Follow terrain height
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY + 0.1;

    // Orient mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;

    // Animate wheels
    const wheels = (this.mesh as any).wheels as THREE.Mesh[];
    if (wheels && Math.abs(this.speed) > 0.1) {
      wheels.forEach((w) => {
        w.rotation.x += (this.speed / 0.48) * dt;
      });
    }

    // Water hazard
    if (groundY <= CONFIG.WATER_LEVEL) {
      this.takeDamage(dt * 60);
    }
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    if (this.health <= 0 && !this.isDestroyed) {
      this.isDestroyed = true;
      soundEngine.playExplosion();
      this.scene.remove(this.mesh);
    }
  }
}
