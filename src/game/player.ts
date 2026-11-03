import * as THREE from 'three';
import { CONFIG, WEAPONS_CONFIG } from './config';
import { PlayerAnimState, WeaponStats, WeaponType } from './types';
import { createProceduralCharacter, createProceduralRifle } from './procedural';
import { TerrainManager } from './terrain';
import { WorldManager } from './world';
import { WeaponManager } from './weapons';
import { soundEngine } from './audio';
import { FlyablePlane } from './aircraft';
import { DrivableVehicle } from './vehicles';

export class PlayerController {
  public mesh: THREE.Group;
  public camera: THREE.PerspectiveCamera;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  public yaw: number = 0;
  public pitch: number = 0;

  // Health, Armor, Stamina
  public health: number = 100;
  public maxHealth: number = 100;
  public armor: number = 0;
  public maxArmor: number = 100;
  public stamina: number = 100;
  public isDowned: boolean = false;
  public isDead: boolean = false;
  public bleedoutTimer: number = CONFIG.DOWNED_BLEEDOUT_TIME;

  // Weapons & Inventory
  public weapons: WeaponStats[] = [WEAPONS_CONFIG.RIFLE, WEAPONS_CONFIG.PISTOL];
  public currentWeaponIndex: number = 0;
  public currentClip: number = 30;
  public ammoReserve: number = 120;
  public glooWallCharges: number = 2;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public isAiming: boolean = false; // ADS
  public recoilOffset: THREE.Vector2 = new THREE.Vector2();

  // Active Skill (E key): Heal pulse + Speed sprint
  public skillCooldown: number = 0;
  public skillActiveTimer: number = 0;

  // Jump physics, Coyote time & Jump buffering
  public isGrounded: boolean = false;
  public onRoof: boolean = false;
  public coyoteTimer: number = 0;
  public jumpBufferTimer: number = 0;
  public isVaulting: boolean = false;
  public vaultProgress: number = 0;
  public vaultStartPos: THREE.Vector3 = new THREE.Vector3();
  public vaultEndPos: THREE.Vector3 = new THREE.Vector3();

  // Flight & Vehicle occupation
  public isFreefalling: boolean = false;
  public isParachuting: boolean = false;
  public isSwimming: boolean = false;
  public occupiedPlane: FlyablePlane | null = null;
  public occupiedVehicle: DrivableVehicle | null = null;

  // Animation State
  public animState: PlayerAnimState = 'idle';

  // Camera Collision & Shake
  public cameraShake: number = 0;
  private currentCameraDist: number = CONFIG.CAMERA_DISTANCE;

  // References
  private scene: THREE.Scene;
  private terrain: TerrainManager;
  private world: WorldManager;
  private weaponMgr: WeaponManager;

  // Procedural body parts
  private leftLeg: THREE.Object3D | null = null;
  private rightLeg: THREE.Object3D | null = null;
  private leftArm: THREE.Object3D | null = null;
  private rightArm: THREE.Object3D | null = null;
  private head: THREE.Object3D | null = null;
  private parachuteMesh: THREE.Mesh | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    terrain: TerrainManager,
    world: WorldManager,
    weaponMgr: WeaponManager
  ) {
    this.scene = scene;
    this.camera = camera;
    this.terrain = terrain;
    this.world = world;
    this.weaponMgr = weaponMgr;

    this.position = new THREE.Vector3(0, CONFIG.PLANE_HEIGHT, 0);
    this.velocity = new THREE.Vector3();

    this.mesh = createProceduralCharacter('#ffd166', '#f72585', '#3a0ca3');
    this.scene.add(this.mesh);

    // Attach procedural rifle
    const weaponMount = this.mesh.getObjectByName('weaponMount');
    if (weaponMount) {
      const rifleMesh = createProceduralRifle();
      weaponMount.add(rifleMesh);
    }

    // Cache animatable limbs
    this.leftLeg = this.mesh.getObjectByName('leftLeg') || null;
    this.rightLeg = this.mesh.getObjectByName('rightLeg') || null;
    this.leftArm = this.mesh.getObjectByName('leftArm') || null;
    this.rightArm = this.mesh.getObjectByName('rightArm') || null;
    this.head = this.mesh.getObjectByName('head') || null;

    // Build parachute canopy mesh (hidden until deployed)
    const paraGeo = new THREE.ConeGeometry(3.2, 1.8, 16, 1, true);
    paraGeo.rotateX(Math.PI);
    const paraMat = new THREE.MeshStandardMaterial({
      color: 0x4cc9f0,
      side: THREE.DoubleSide,
      roughness: 0.6,
    });
    this.parachuteMesh = new THREE.Mesh(paraGeo, paraMat);
    this.parachuteMesh.position.set(0, 3.2, 0);
    this.parachuteMesh.visible = false;
    this.mesh.add(this.parachuteMesh);
  }

  public get activeWeapon(): WeaponStats {
    return this.weapons[this.currentWeaponIndex];
  }

  public jumpFromPlane(startPos: THREE.Vector3) {
    this.position.copy(startPos);
    this.velocity.set(0, -CONFIG.FREEFALL_MIN_SPEED, 0);
    this.isFreefalling = true;
    this.isParachuting = false;
    this.animState = 'freefall';
    soundEngine.startWindSound();
  }

  public deployParachute() {
    if (this.isParachuting || this.isGrounded) return;
    this.isFreefalling = false;
    this.isParachuting = true;
    this.animState = 'parachute';
    if (this.parachuteMesh) this.parachuteMesh.visible = true;
    soundEngine.playLand(false);
  }

  public update(
    dt: number,
    inputs: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      sprint: boolean;
      crouch: boolean;
      jump: boolean;
      aim: boolean;
      fire: boolean;
      reload: boolean;
      interact: boolean;
      useGloo: boolean;
      useSkill: boolean;
    }
  ) {
    if (this.isDead) return;

    // Update skill cooldown & active timer
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    if (this.skillActiveTimer > 0) {
      this.skillActiveTimer = Math.max(0, this.skillActiveTimer - dt);
      // Continuous heal pulse: restore 4 HP/sec during skill
      this.health = Math.min(this.maxHealth, this.health + dt * 4);
    }

    if (inputs.useSkill && this.skillCooldown <= 0) {
      this.activateSkill();
    }

    // Downed handling
    if (this.isDowned) {
      this.bleedoutTimer -= dt;
      if (this.bleedoutTimer <= 0) {
        this.die();
        return;
      }
      this.updateDownedState(dt, inputs);
      this.updateCamera(dt);
      return;
    }

    // In-Plane or In-Vehicle update
    if (this.occupiedPlane) {
      this.updateInPlane(dt, inputs);
      this.updateCamera(dt);
      return;
    }

    if (this.occupiedVehicle) {
      this.updateInVehicle(dt, inputs);
      this.updateCamera(dt);
      return;
    }

    // Freefall & Parachute stages
    if (this.isFreefalling || this.isParachuting) {
      this.updateAerialDrop(dt, inputs);
      this.updateCamera(dt);
      return;
    }

    // Ground & Swimming Controls
    this.updateGroundMovement(dt, inputs);
    this.updateWeaponsAndCombat(dt, inputs);
    this.updateCamera(dt);
    this.updateProceduralAnimation(dt);
  }

  private activateSkill() {
    this.skillCooldown = CONFIG.SKILL_COOLDOWN;
    this.skillActiveTimer = CONFIG.SKILL_DURATION;
    soundEngine.playPickup();
  }

  private updateAerialDrop(dt: number, inputs: any) {
    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    const altitude = this.position.y - groundY;

    // Auto-open parachute near ground
    if (altitude < CONFIG.AUTO_PARACHUTE_ALTITUDE && !this.isParachuting) {
      this.deployParachute();
    }

    if (inputs.jump && !this.isParachuting) {
      this.deployParachute();
    }

    if (this.isFreefalling) {
      // Dive faster with W, slow with S
      let vertSpeed = CONFIG.FREEFALL_MIN_SPEED;
      if (inputs.forward) vertSpeed = CONFIG.FREEFALL_MAX_SPEED;
      if (inputs.backward) vertSpeed = CONFIG.FREEFALL_MIN_SPEED * 0.8;

      this.velocity.y = -vertSpeed;
      soundEngine.updateWindSound(vertSpeed);

      // Horizontal steer
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      this.position.x += forwardX * CONFIG.FREEFALL_HORIZONTAL_SPEED * dt;
      this.position.z += forwardZ * CONFIG.FREEFALL_HORIZONTAL_SPEED * dt;
    } else if (this.isParachuting) {
      // Parachute glide
      this.velocity.y = -CONFIG.PARACHUTE_DESCENT_SPEED;
      soundEngine.updateWindSound(CONFIG.PARACHUTE_DESCENT_SPEED);

      let moveX = 0;
      let moveZ = 0;
      if (inputs.forward) moveZ -= 1;
      if (inputs.backward) moveZ += 1;
      if (inputs.left) moveX -= 1;
      if (inputs.right) moveX += 1;

      const steerDir = new THREE.Vector3(moveX, 0, moveZ).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.position.x += steerDir.x * CONFIG.PARACHUTE_HORIZONTAL_SPEED * dt;
      this.position.z += steerDir.z * CONFIG.PARACHUTE_HORIZONTAL_SPEED * dt;
    }

    this.position.y += this.velocity.y * dt;

    // Check Landing Touchdown anywhere on map (roofs, sand, grass, water)
    const collision = this.world.checkCollision(this.position, 0.4, CONFIG.PLAYER_HEIGHT);
    if (this.position.y <= collision.groundY) {
      this.position.y = collision.groundY;
      this.velocity.set(0, 0, 0);
      this.isFreefalling = false;
      this.isParachuting = false;
      this.isGrounded = true;
      this.onRoof = collision.onRoof;
      if (this.parachuteMesh) this.parachuteMesh.visible = false;
      soundEngine.stopWindSound();
      soundEngine.playLand(true);

      // Land in water?
      if (collision.groundY <= CONFIG.WATER_LEVEL + 0.3) {
        this.isSwimming = true;
      }
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
  }

  private updateGroundMovement(dt: number, inputs: any) {
    // Water check
    const currentGroundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.isSwimming = this.position.y <= CONFIG.WATER_LEVEL + 0.3;

    // Coyote time & Jump buffer
    if (this.isGrounded) {
      this.coyoteTimer = CONFIG.COYOTE_TIME;
    } else {
      this.coyoteTimer -= dt;
    }

    if (inputs.jump) {
      this.jumpBufferTimer = CONFIG.JUMP_BUFFER_TIME;
    } else {
      this.jumpBufferTimer -= dt;
    }

    // Vault obstacle check
    if (inputs.jump && this.isGrounded && !this.isVaulting) {
      this.checkVault();
    }

    if (this.isVaulting) {
      this.vaultProgress += dt * CONFIG.VAULT_SPEED;
      this.position.lerpVectors(this.vaultStartPos, this.vaultEndPos, this.vaultProgress);
      if (this.vaultProgress >= 1.0) {
        this.isVaulting = false;
      }
      this.mesh.position.copy(this.position);
      return;
    }

    // Calculate movement speed
    let speed = CONFIG.RUN_SPEED;
    if (inputs.crouch) speed = CONFIG.CROUCH_SPEED;
    else if (inputs.sprint && inputs.forward && this.stamina > 0) {
      speed = CONFIG.SPRINT_SPEED;
      if (this.skillActiveTimer > 0) speed *= 1.35; // Skill speed burst!
      this.stamina = Math.max(0, this.stamina - dt * 15);
    } else {
      // Regenerate stamina
      this.stamina = Math.min(100, this.stamina + dt * 25);
    }

    if (this.isSwimming) speed = CONFIG.SWIM_SPEED;

    // Calculate move vector from inputs
    let moveX = 0;
    let moveZ = 0;
    if (inputs.forward) moveZ -= 1;
    if (inputs.backward) moveZ += 1;
    if (inputs.left) moveX -= 1;
    if (inputs.right) moveX += 1;

    const isMoving = moveX !== 0 || moveZ !== 0;
    const moveDir = new THREE.Vector3(moveX, 0, moveZ).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    this.position.x += moveDir.x * speed * dt;
    this.position.z += moveDir.z * speed * dt;

    // Jump execution (Coyote time + Buffered jump)
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && !this.isSwimming) {
      this.velocity.y = CONFIG.JUMP_FORCE;
      this.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      soundEngine.playJump();
    }

    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y -= CONFIG.GRAVITY * dt;
      this.position.y += this.velocity.y * dt;
    }

    // World & Building Collisions (Allows standing on roofs!)
    const collision = this.world.checkCollision(this.position, 0.4, CONFIG.PLAYER_HEIGHT);
    if (this.position.y <= collision.groundY) {
      this.position.y = collision.groundY;
      this.velocity.y = 0;
      if (!this.isGrounded) {
        soundEngine.playLand(false);
      }
      this.isGrounded = true;
      this.onRoof = collision.onRoof;
    } else {
      this.isGrounded = false;
    }

    // Footstep audio
    if (this.isGrounded && isMoving) {
      if (Math.sin(performance.now() * 0.012) > 0.95) {
        soundEngine.playFootstep(this.isSwimming);
      }
    }

    // Update mesh transform
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;

    // Interact (F key): pickup loot, enter plane, enter car
    if (inputs.interact) {
      this.handleInteraction();
    }

    // Gloo wall placement (G key)
    if (inputs.useGloo && this.glooWallCharges > 0) {
      this.weaponMgr.placeGlooWall(this.position, this.yaw);
      this.glooWallCharges--;
    }
  }

  private checkVault() {
    // Check if a low wall is directly ahead
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const probe = this.position.clone().addScaledVector(forward, 1.2);
    const col = this.world.checkCollision(probe, 0.4, CONFIG.PLAYER_HEIGHT);

    if (col.groundY > this.position.y && col.groundY <= this.position.y + CONFIG.VAULT_MAX_HEIGHT) {
      this.isVaulting = true;
      this.vaultProgress = 0;
      this.vaultStartPos.copy(this.position);
      this.vaultEndPos.copy(probe);
      this.vaultEndPos.y = col.groundY;
      soundEngine.playJump();
    }
  }

  private updateWeaponsAndCombat(dt: number, inputs: any) {
    this.isAiming = inputs.aim;

    // Reloading
    if (inputs.reload && !this.isReloading && this.currentClip < this.activeWeapon.clipSize && this.ammoReserve > 0) {
      this.startReload();
    }

    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        const needed = this.activeWeapon.clipSize - this.currentClip;
        const available = Math.min(needed, this.ammoReserve);
        this.currentClip += available;
        this.ammoReserve -= available;
        this.isReloading = false;
      }
    }

    // Firing
    if (inputs.fire && !this.isReloading && !this.isSwimming) {
      this.fireWeapon();
    }

    // Recoil recovery
    this.recoilOffset.x = THREE.MathUtils.damp(this.recoilOffset.x, 0, 8.0, dt);
    this.recoilOffset.y = THREE.MathUtils.damp(this.recoilOffset.y, 0, 8.0, dt);
  }

  private fireWeapon() {
    if (this.currentClip <= 0) {
      this.startReload();
      return;
    }

    this.currentClip--;

    // Camera recoil kick
    this.pitch += this.activeWeapon.recoil * 0.5;
    this.cameraShake = 0.08;

    // Raycast direction from camera center + spread
    const spread = this.isAiming ? this.activeWeapon.spread * 0.4 : this.activeWeapon.spread;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -1
    ).applyQuaternion(this.camera.quaternion).normalize();

    const origin = this.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    this.weaponMgr.fireBullet(origin, dir, this.activeWeapon, true);

    // Hit test against Gloo Walls
    const glooHit = this.weaponMgr.checkGlooWallHit(origin, dir, this.activeWeapon.range);
    if (glooHit.hit && glooHit.wall) {
      glooHit.wall.health -= this.activeWeapon.damage;
      this.weaponMgr.spawnSparks(glooHit.point!, new THREE.Vector3(0, 1, 0), '#48cae4');
      return;
    }

    // Hit test against Bots
    window.dispatchEvent(
      new CustomEvent('player-fired-bullet', {
        detail: {
          origin,
          direction: dir,
          weapon: this.activeWeapon,
        },
      })
    );
  }

  private startReload() {
    this.isReloading = true;
    this.reloadTimer = this.activeWeapon.reloadTime;
    soundEngine.playReload();
  }

  private handleInteraction() {
    // 1. Loot pickup
    this.world.lootItems.forEach((loot) => {
      if (!loot.collected) {
        const dist = this.position.distanceTo(new THREE.Vector3(loot.x, loot.y, loot.z));
        if (dist < 2.5) {
          loot.collected = true;
          this.world.lootGroup.remove(loot.mesh);
          soundEngine.playPickup();

          if (loot.type === 'WEAPON' && loot.weaponType) {
            this.weapons[0] = WEAPONS_CONFIG[loot.weaponType];
            this.currentClip = this.weapons[0].clipSize;
          } else if (loot.type === 'AMMO') {
            this.ammoReserve += loot.amount || 60;
          } else if (loot.type === 'MEDKIT') {
            this.health = Math.min(this.maxHealth, this.health + (loot.amount || 50));
          } else if (loot.type === 'ARMOR') {
            this.armor = Math.min(this.maxArmor, this.armor + (loot.amount || 100));
          } else if (loot.type === 'GLOO_WALL') {
            this.glooWallCharges = Math.min(CONFIG.GLOO_WALL_MAX_CHARGES, this.glooWallCharges + (loot.amount || 1));
          }
        }
      }
    });

    // 2. Flyable Plane boarding
    window.dispatchEvent(new CustomEvent('request-plane-interaction', { detail: { player: this } }));

    // 3. Vehicle boarding
    window.dispatchEvent(new CustomEvent('request-vehicle-interaction', { detail: { player: this } }));
  }

  private updateInPlane(dt: number, inputs: any) {
    if (!this.occupiedPlane) return;
    this.position.copy(this.occupiedPlane.position);
    this.mesh.position.copy(this.position);

    // Eject / Exit with F key in the air = parachute jump!
    if (inputs.interact) {
      if (!this.occupiedPlane.isGrounded) {
        this.occupiedPlane = null;
        soundEngine.stopPlaneEngine();
        this.deployParachute();
      } else {
        this.occupiedPlane = null;
        soundEngine.stopPlaneEngine();
      }
    }
  }

  private updateInVehicle(dt: number, inputs: any) {
    if (!this.occupiedVehicle) return;
    this.position.copy(this.occupiedVehicle.position);
    this.mesh.position.copy(this.position);

    if (inputs.interact) {
      this.occupiedVehicle = null;
    }
  }

  private updateDownedState(dt: number, inputs: any) {
    this.animState = 'downed';
    let moveX = 0;
    let moveZ = 0;
    if (inputs.forward) moveZ -= 1;
    if (inputs.backward) moveZ += 1;
    if (inputs.left) moveX -= 1;
    if (inputs.right) moveX += 1;

    const moveDir = new THREE.Vector3(moveX, 0, moveZ).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    this.position.x += moveDir.x * CONFIG.DOWNED_SPEED * dt;
    this.position.z += moveDir.z * CONFIG.DOWNED_SPEED * dt;

    const groundY = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = groundY;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.yaw;
    this.mesh.rotation.z = Math.PI / 2; // Crawling on ground
  }

  private updateProceduralAnimation(dt: number) {
    const isMoving = this.isGrounded && this.velocity.lengthSq() > 0.1;
    const time = performance.now() * 0.01;

    if (this.leftLeg && this.rightLeg) {
      if (this.isGrounded) {
        const walkCycle = Math.sin(time * (inputsAreSprinting() ? 1.6 : 1.0)) * 0.5;
        this.leftLeg.rotation.x = walkCycle;
        this.rightLeg.rotation.x = -walkCycle;
      } else {
        // Legs tucked while falling
        this.leftLeg.rotation.x = 0.3;
        this.rightLeg.rotation.x = 0.3;
      }
    }

    function inputsAreSprinting() {
      return false;
    }
  }

  private updateCamera(dt: number) {
    // Camera collision check: Raycast backwards from player eye position
    const eyePos = this.position.clone().add(new THREE.Vector3(0, CONFIG.CAMERA_HEIGHT, 0));
    const targetDist = this.isAiming ? CONFIG.CAMERA_DISTANCE_ADS : CONFIG.CAMERA_DISTANCE;

    // Pitch clamped
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

    // Direction vector behind player
    const camDir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    let actualDist = targetDist;
    // Check if camera intersects buildings
    const testPos = eyePos.clone().addScaledVector(camDir, targetDist);
    const col = this.world.checkCollision(testPos, 0.3, 0.5);
    if (col.collided) {
      actualDist = Math.max(0.6, targetDist * 0.5);
    }

    this.currentCameraDist = THREE.MathUtils.damp(this.currentCameraDist, actualDist, 10.0, dt);

    const camPos = eyePos.clone().addScaledVector(camDir, this.currentCameraDist);

    // Apply camera shake
    if (this.cameraShake > 0) {
      camPos.x += (Math.random() - 0.5) * this.cameraShake;
      camPos.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.5);
    }

    this.camera.position.copy(camPos);
    this.camera.lookAt(eyePos);

    // Dynamic FOV (Sprint kick vs ADS zoom)
    const targetFOV = this.isAiming ? CONFIG.CAMERA_FOV_ADS : CONFIG.CAMERA_FOV_NORMAL;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFOV, 8.0, dt);
    this.camera.updateProjectionMatrix();
  }

  public takeDamage(amount: number, attackerPos: THREE.Vector3) {
    if (this.isDead) return;

    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.65);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health = Math.max(0, this.health - amount);
    this.cameraShake = 0.2;

    // Damage indicator event for HUD
    window.dispatchEvent(
      new CustomEvent('player-hit-indicator', {
        detail: { attackerPos },
      })
    );

    if (this.health <= 0) {
      if (!this.isDowned) {
        this.isDowned = true;
        this.health = 50;
        this.bleedoutTimer = CONFIG.DOWNED_BLEEDOUT_TIME;
      } else {
        this.die();
      }
    }
  }

  public die() {
    this.isDead = true;
    this.health = 0;
    this.animState = 'death';
    window.dispatchEvent(new CustomEvent('player-killed'));
  }
}
