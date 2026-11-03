import * as THREE from 'three';
import { CONFIG } from './config';
import { createProceduralPlane } from './procedural';
import { soundEngine } from './audio';
import { TerrainManager } from './terrain';

export interface DropPlanePath {
  start: THREE.Vector3;
  end: THREE.Vector3;
  direction: THREE.Vector3;
  totalDistance: number;
}

export class DropPlane {
  public mesh: THREE.Group;
  public path: DropPlanePath;
  public progress: number = 0; // 0 to 1
  public position: THREE.Vector3;
  public speed: number = CONFIG.PLANE_SPEED;
  public isFinished: boolean = false;

  constructor(scene: THREE.Scene) {
    // Traverse from one side of island to the other through center
    const angle = Math.random() * Math.PI * 2;
    const radius = 550;
    const startX = Math.cos(angle) * radius;
    const startZ = Math.sin(angle) * radius;
    const endX = -startX;
    const endZ = -startZ;

    const start = new THREE.Vector3(startX, CONFIG.PLANE_HEIGHT, startZ);
    const end = new THREE.Vector3(endX, CONFIG.PLANE_HEIGHT, endZ);
    const dir = end.clone().sub(start).normalize();

    this.path = {
      start,
      end,
      direction: dir,
      totalDistance: start.distanceTo(end),
    };

    this.position = start.clone();
    this.mesh = createProceduralPlane();
    this.mesh.scale.set(3.5, 3.5, 3.5); // Big cargo drop plane
    this.mesh.position.copy(this.position);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

    scene.add(this.mesh);
  }

  public update(dt: number): THREE.Vector3 {
    if (this.isFinished) return this.position;

    const moveDist = this.speed * dt;
    const step = moveDist / this.path.totalDistance;
    this.progress = Math.min(1.0, this.progress + step);

    this.position.lerpVectors(this.path.start, this.path.end, this.progress);
    this.mesh.position.copy(this.position);

    // Spin propeller
    const prop = this.mesh.getObjectByName('propeller');
    if (prop) {
      prop.rotation.z += dt * 35;
    }

    if (this.progress >= 1.0) {
      this.isFinished = true;
    }

    return this.position;
  }
}

export class FlyablePlane {
  public id: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public quaternion: THREE.Quaternion;

  public throttle: number = 0; // 0 to 1
  public speed: number = 0; // m/s
  public pitch: number = 0;
  public roll: number = 0;
  public yaw: number = 0;
  public gearDown: boolean = true;
  public flapsDown: boolean = false;
  public isStalling: boolean = false;
  public isGrounded: boolean = true;
  public isDestroyed: boolean = false;
  public health: number = 250;
  public maxHealth: number = 250;

  private terrain: TerrainManager;
  private scene: THREE.Scene;

  constructor(id: string, startPos: THREE.Vector3, scene: THREE.Scene, terrain: TerrainManager) {
    this.id = id;
    this.position = startPos.clone();
    this.velocity = new THREE.Vector3();
    this.quaternion = new THREE.Quaternion();
    this.scene = scene;
    this.terrain = terrain;

    this.mesh = createProceduralPlane();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  public update(
    dt: number,
    inputs: {
      pitchUp: boolean;
      pitchDown: boolean;
      rollLeft: boolean;
      rollRight: boolean;
      yawLeft: boolean;
      yawRight: boolean;
      throttleUp: boolean;
      throttleDown: boolean;
      brake: boolean;
      toggleGear: boolean;
      toggleFlaps: boolean;
    },
    isOccupied: boolean
  ) {
    if (this.isDestroyed) return;

    if (isOccupied) {
      // Inputs
      if (inputs.throttleUp) this.throttle = Math.min(1.0, this.throttle + dt * 0.4);
      if (inputs.throttleDown) this.throttle = Math.max(0.0, this.throttle - dt * 0.4);

      if (inputs.toggleGear) this.gearDown = !this.gearDown;
      if (inputs.toggleFlaps) this.flapsDown = !this.flapsDown;

      // Update engine audio
      soundEngine.updatePlaneEngine(this.throttle, this.speed);
    } else {
      // Idle engine drag
      this.throttle = Math.max(0, this.throttle - dt * 0.2);
    }

    // Aerodynamic thrust & drag
    const maxThrust = CONFIG.PLANE_MAX_SPEED;
    const targetSpeed = this.throttle * maxThrust * (this.flapsDown ? 0.75 : 1.0);
    this.speed = THREE.MathUtils.damp(this.speed, targetSpeed, 1.2, dt);

    if (inputs.brake && this.isGrounded) {
      this.speed = Math.max(0, this.speed - dt * 25);
    }

    // Flight attitude control
    if (isOccupied) {
      const controlAuthority = Math.min(1.0, this.speed / 15);
      if (inputs.pitchUp) this.pitch += dt * 1.5 * controlAuthority;
      if (inputs.pitchDown) this.pitch -= dt * 1.5 * controlAuthority;
      if (inputs.rollLeft) this.roll += dt * 2.2 * controlAuthority;
      if (inputs.rollRight) this.roll -= dt * 2.2 * controlAuthority;
      if (inputs.yawLeft) this.yaw += dt * 0.8 * controlAuthority;
      if (inputs.yawRight) this.yaw -= dt * 0.8 * controlAuthority;
    }

    // Aerodynamic stability damping
    this.roll *= Math.exp(-dt * 1.5);
    this.pitch *= Math.exp(-dt * 1.0);

    // Build rotation
    const euler = new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ');
    this.quaternion.setFromEuler(euler);
    this.mesh.quaternion.copy(this.quaternion);

    // Lift vs Gravity
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quaternion);
    const lift = Math.max(0, (this.speed / CONFIG.PLANE_TAKEOFF_SPEED) * CONFIG.GRAVITY);
    this.isStalling = this.speed < CONFIG.PLANE_STALL_SPEED && !this.isGrounded;

    const gravityDrop = this.isGrounded ? 0 : (this.isStalling ? CONFIG.GRAVITY * 1.5 : CONFIG.GRAVITY - lift);

    this.velocity.copy(forward).multiplyScalar(this.speed);
    this.velocity.y -= gravityDrop;

    this.position.addScaledVector(this.velocity, dt);

    // Ground check & landing evaluation
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    const planeBottom = this.position.y - 0.5;

    if (planeBottom <= groundY) {
      // Touchdown!
      const descentRate = -this.velocity.y;
      const pitchDeg = Math.abs(this.pitch * (180 / Math.PI));

      // Check water crash
      if (groundY <= CONFIG.WATER_LEVEL + 0.3) {
        this.crash('Water impact!');
        return;
      }

      // Safe landing criteria: Gear down, descent < 8m/s, pitch < 22 degrees
      if (!this.gearDown || descentRate > 10.0 || pitchDeg > 25.0) {
        this.crash('Rough landing crash!');
        return;
      }

      // Safe landing
      this.position.y = groundY + 0.5;
      this.velocity.y = 0;
      this.pitch = 0;
      this.roll = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.mesh.position.copy(this.position);

    // Propeller spinning animation
    const prop = this.mesh.getObjectByName('propeller');
    if (prop) {
      prop.rotation.z += (this.throttle * 30 + 5) * dt;
    }
  }

  public crash(reason: string) {
    this.isDestroyed = true;
    this.health = 0;
    soundEngine.playExplosion();
    this.scene.remove(this.mesh);
  }
}
