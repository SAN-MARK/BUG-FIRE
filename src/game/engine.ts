import * as THREE from 'three';
import { CONFIG, MAPS_CONFIG } from './config';
import {
  Difficulty,
  GameMode,
  GameState,
  KillFeedEntry,
  MapId,
  MatchStats,
  QualityTier,
} from './types';
import { assetManager } from './assets';
import { TerrainManager } from './terrain';
import { WorldManager } from './world';
import { WeaponManager } from './weapons';
import { DropPlane, FlyablePlane } from './aircraft';
import { DrivableVehicle } from './vehicles';
import { ZoneManager } from './zone';
import { BotManager } from './bots';
import { PlayerController } from './player';
import { soundEngine } from './audio';

export class GameEngine {
  public renderer: THREE.WebGLRenderer | null = null;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // States
  public state: GameState = 'LOADING';
  public mapId: MapId = 'BERMUDA';
  public mode: GameMode = 'SOLO';
  public difficulty: Difficulty = 'NORMAL';
  public quality: QualityTier = 'MEDIUM';
  public username: string = 'Vance_Rider';

  // Subsystems
  public terrain: TerrainManager;
  public world: WorldManager;
  public weaponMgr: WeaponManager;
  public zoneMgr: ZoneManager;
  public botMgr: BotManager;
  public player: PlayerController | null = null;
  public dropPlane: DropPlane | null = null;
  public flyablePlanes: FlyablePlane[] = [];
  public vehicles: DrivableVehicle[] = [];

  // Match statistics
  public stats: MatchStats = {
    kills: 0,
    assists: 0,
    damage: 0,
    survivalTime: 0,
    placement: 50,
    totalPlayers: 50,
    rankPoints: 0,
    shotsFired: 0,
    shotsHit: 0,
    headshots: 0,
  };

  // Lighting & Sky
  private sunLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;

  // Input state
  public inputs = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    crouch: false,
    jump: false,
    aim: false,
    fire: false,
    reload: false,
    interact: false,
    useGloo: false,
    useSkill: false,
    // Flight inputs
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    yawLeft: false,
    yawRight: false,
    throttleUp: false,
    throttleDown: false,
    brake: false,
    toggleGear: false,
    toggleFlaps: false,
  };

  public gyroEnabled: boolean = false;
  public gyroSensitivity: number = 1.0;

  // Killfeed list
  public killFeed: KillFeedEntry[] = [];
  public onStateChange?: (state: GameState) => void;
  public onKillFeed?: (feed: KillFeedEntry[]) => void;
  public onStatsUpdate?: (stats: MatchStats) => void;

  private isRunning: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private matchStartTime: number = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.CAMERA_FOV_NORMAL, window.innerWidth / window.innerHeight, 0.1, 1200);

    this.terrain = new TerrainManager(this.mapId);
    this.world = new WorldManager(this.terrain, this.mapId);
    this.weaponMgr = new WeaponManager(this.scene);
    this.zoneMgr = new ZoneManager(this.scene, this.terrain);
    this.botMgr = new BotManager(
      this.scene,
      this.terrain,
      this.world,
      this.weaponMgr,
      (entry) => this.handleBotKillFeed(entry)
    );

    this.setupEventListeners();
  }

  public initRenderer(container: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.quality !== 'LOW',
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === 'HIGH' ? 2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = this.quality !== 'LOW';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onResize);
    this.setupLighting();
    this.setupLobbyPreview();
    this.startLoop();
  }

  public lobbyPreviewGroup: THREE.Group = new THREE.Group();

  public setupLobbyPreview() {
    this.scene.add(this.lobbyPreviewGroup);

    // Neon rotating pedestal
    const pedestalGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.35, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1a0a33,
      roughness: 0.2,
      metalness: 0.8,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.y = 0.175;
    pedestal.receiveShadow = true;
    this.lobbyPreviewGroup.add(pedestal);

    // Neon edge ring
    const ringGeo = new THREE.TorusGeometry(1.7, 0.05, 12, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xf72585,
      emissive: 0xf72585,
      emissiveIntensity: 0.8,
      roughness: 0.1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.35;
    this.lobbyPreviewGroup.add(ring);

    // Floor terrace
    const floorGeo = new THREE.CircleGeometry(30, 32);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1b0833,
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.lobbyPreviewGroup.add(floor);

    // Studio spotlight on character pedestal
    const lobbySpot = new THREE.SpotLight(0xffeedd, 5.0, 25, Math.PI / 3, 0.2);
    lobbySpot.position.set(2, 5, 4);
    lobbySpot.target = pedestal;
    this.lobbyPreviewGroup.add(lobbySpot);

    // Preview character standing on platform
    this.refreshLobbyCharacter();
  }

  public refreshLobbyCharacter() {
    // Remove old preview character if present
    const existing = this.lobbyPreviewGroup.getObjectByName('ProceduralCharacter');
    if (existing) this.lobbyPreviewGroup.remove(existing);

    const previewChar = assetManager.getModel('player');
    previewChar.position.y = 0.35;
    previewChar.scale.set(1.3, 1.3, 1.3);
    this.lobbyPreviewGroup.add(previewChar);
  }

  public setQuality(quality: QualityTier) {
    this.quality = quality;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = quality !== 'LOW';
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'HIGH' ? 2 : 1.2));
    }
  }

  public setMap(mapId: MapId) {
    this.mapId = mapId;
    this.terrain.mapId = mapId;
    this.world.mapId = mapId;
    this.setupLighting();
  }

  private setupLighting() {
    const mapConfig = MAPS_CONFIG[this.mapId];

    // Sky & Fog
    this.scene.background = new THREE.Color(mapConfig.skyColorBottom);
    this.scene.fog = new THREE.FogExp2(mapConfig.fogColor, 0.0022);

    // Sun directional key light with long sunset shadows
    if (this.sunLight) this.scene.remove(this.sunLight);
    this.sunLight = new THREE.DirectionalLight(mapConfig.sunColor, mapConfig.sunIntensity);
    this.sunLight.position.set(160, 140, 220);
    this.sunLight.castShadow = this.quality !== 'LOW';
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 600;
    const d = 160;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0004;
    this.scene.add(this.sunLight);

    // Cool hemisphere fill light
    if (this.hemiLight) this.scene.remove(this.hemiLight);
    this.hemiLight = new THREE.HemisphereLight(mapConfig.skyColorTop, mapConfig.ambientColor, 0.7);
    this.scene.add(this.hemiLight);
  }

  public startMatch() {
    this.setState('MATCHMAKING');

    setTimeout(() => {
      this.setupWorldAndEntities();
      this.setState('DROP');
      this.matchStartTime = performance.now();

      // Start lobby / engine audio
      soundEngine.startPlaneEngine();
    }, 1800);
  }

  public setupWorldAndEntities() {
    this.lobbyPreviewGroup.visible = false;
    // 1. Clear previous entities
    if (this.terrain.mesh) this.scene.remove(this.terrain.mesh);
    if (this.terrain.waterMesh) this.scene.remove(this.terrain.waterMesh);
    this.scene.remove(this.world.worldGroup);

    // 2. Build Terrain & Water
    const tMesh = this.terrain.createTerrainMesh();
    this.scene.add(tMesh);
    const wMesh = this.terrain.createWaterMesh();
    this.scene.add(wMesh);

    // 3. Build World Objects & Loot
    this.world.generateWorld();
    this.scene.add(this.world.worldGroup);

    // 4. Initialize Player
    this.player = new PlayerController(this.scene, this.camera, this.terrain, this.world, this.weaponMgr);

    // 5. Initialize Drop Plane
    if (this.dropPlane) this.scene.remove(this.dropPlane.mesh);
    this.dropPlane = new DropPlane(this.scene);

    // 6. Spawn Flyable Planes (4 across airfield and flat meadows)
    this.flyablePlanes.forEach((p) => this.scene.remove(p.mesh));
    this.flyablePlanes = [];
    const planeSpawns = [
      new THREE.Vector3(-15, 3.5, -230),
      new THREE.Vector3(15, 3.5, -110),
      new THREE.Vector3(-80, 5.0, 110),
      new THREE.Vector3(120, 4.0, -40),
    ];
    planeSpawns.forEach((pos, idx) => {
      this.flyablePlanes.push(new FlyablePlane(`flyer_${idx}`, pos, this.scene, this.terrain));
    });

    // 7. Spawn Drivable Buggies (4 across roads)
    this.vehicles.forEach((v) => this.scene.remove(v.mesh));
    this.vehicles = [];
    const carSpawns = [
      new THREE.Vector3(-45, 4.0, -140),
      new THREE.Vector3(100, 3.5, 20),
      new THREE.Vector3(-95, 4.0, 120),
      new THREE.Vector3(160, 4.0, 140),
    ];
    carSpawns.forEach((pos, idx) => {
      this.vehicles.push(new DrivableVehicle(`car_${idx}`, pos, this.scene, this.terrain));
    });

    // 8. Spawn 49 Bots
    this.botMgr.spawnBots(this.mode, this.difficulty);

    // 9. Reset Stats
    this.stats = {
      kills: 0,
      assists: 0,
      damage: 0,
      survivalTime: 0,
      placement: 50,
      totalPlayers: 50,
      rankPoints: 0,
      shotsFired: 0,
      shotsHit: 0,
      headshots: 0,
    };
    this.killFeed = [];
  }

  public playerJumpFromDropPlane() {
    if (!this.dropPlane || !this.player || this.state !== 'DROP') return;
    this.player.jumpFromPlane(this.dropPlane.position);
    this.setState('PLAYING');
    soundEngine.stopPlaneEngine();
  }

  public setState(newState: GameState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
  }

  private handleBotKillFeed(entry: KillFeedEntry) {
    this.killFeed.unshift(entry);
    if (this.killFeed.length > 6) this.killFeed.pop();
    if (this.onKillFeed) this.onKillFeed([...this.killFeed]);

    const alive = this.botMgr.getAliveCount();
    this.stats.placement = alive;
    this.checkMatchEnd();
  }

  private checkMatchEnd() {
    if (!this.player) return;

    if (this.player.isDead && this.state === 'PLAYING') {
      this.stats.survivalTime = Math.round((performance.now() - this.matchStartTime) / 1000);
      this.stats.rankPoints = Math.max(10, this.stats.kills * 25 + Math.round(this.stats.damage * 0.1) - this.stats.placement * 2);
      this.setState('GAME_OVER');
      return;
    }

    const alive = this.botMgr.getAliveCount();
    if (alive === 1 && !this.player.isDead && this.state === 'PLAYING') {
      this.stats.placement = 1;
      this.stats.survivalTime = Math.round((performance.now() - this.matchStartTime) / 1000);
      this.stats.rankPoints = 150 + this.stats.kills * 30 + Math.round(this.stats.damage * 0.15);
      soundEngine.playWinFanfare();
      this.setState('BOOYAH');
    }
  }

  public resetMatch() {
    // Clean reset without page reload!
    soundEngine.stopPlaneEngine();
    soundEngine.stopWindSound();
    soundEngine.stopLobbyMusic();

    this.startMatch();
  }

  public returnToLobby() {
    this.lobbyPreviewGroup.visible = true;
    soundEngine.stopPlaneEngine();
    soundEngine.stopWindSound();
    soundEngine.startLobbyMusic();
    this.setState('LOBBY');
  }

  private startLoop() {
    this.isRunning = true;
    this.lastTime = performance.now();

    const loop = (time: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      const dt = Math.min((time - this.lastTime) / 1000, 0.05);
      this.lastTime = time;

      this.update(dt, time / 1000);
      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number, time: number) {
    // Water wave & loot animations
    this.terrain.updateWater(time);
    this.world.updateLootAnimation(time);
    this.weaponMgr.update(dt);

    if (this.state === 'LOBBY' || this.state === 'LOADING' || this.state === 'LOGIN' || this.state === 'MAP_SELECT') {
      this.lobbyPreviewGroup.visible = true;
      this.lobbyPreviewGroup.rotation.y = time * 0.4;
      // Frame rotating character hero cleanly in lobby center
      const camRadius = 3.4;
      this.camera.position.x = Math.sin(time * 0.15) * camRadius;
      this.camera.position.z = Math.cos(time * 0.15) * camRadius;
      this.camera.position.y = 1.35;
      this.camera.lookAt(0, 1.05, 0);
      return;
    }

    if (this.state === 'DROP' && this.dropPlane && this.player) {
      this.dropPlane.update(dt);

      // Camera flies behind and above drop plane along flight path
      const backDir = this.dropPlane.path.direction.clone().multiplyScalar(-24);
      this.camera.position.copy(this.dropPlane.position).add(backDir).add(new THREE.Vector3(0, 7, 0));
      this.camera.lookAt(this.dropPlane.position.clone().add(new THREE.Vector3(0, 1, 0)));

      // Auto jump player if plane reaches end
      if (this.dropPlane.isFinished) {
        this.playerJumpFromDropPlane();
      }
      return;
    }

    if (this.state === 'PLAYING' && this.player) {
      // 1. Update Player
      this.player.update(dt, this.inputs);

      // 2. Update Zone
      this.zoneMgr.update(dt);

      // Storm zone damage ticks
      if (this.zoneMgr.isOutside(this.player.position.x, this.player.position.z)) {
        this.player.takeDamage(this.zoneMgr.dps * dt, new THREE.Vector3());
      }

      // 3. Update Flyable Planes
      this.flyablePlanes.forEach((plane) => {
        plane.update(
          dt,
          {
            pitchUp: this.inputs.pitchUp,
            pitchDown: this.inputs.pitchDown,
            rollLeft: this.inputs.rollLeft,
            rollRight: this.inputs.rollRight,
            yawLeft: this.inputs.yawLeft,
            yawRight: this.inputs.yawRight,
            throttleUp: this.inputs.throttleUp,
            throttleDown: this.inputs.throttleDown,
            brake: this.inputs.brake,
            toggleGear: this.inputs.toggleGear,
            toggleFlaps: this.inputs.toggleFlaps,
          },
          this.player?.occupiedPlane?.id === plane.id
        );
      });

      // 4. Update Vehicles
      this.vehicles.forEach((car) => {
        const isOcc = this.player?.occupiedVehicle?.id === car.id;
        car.update(
          dt,
          {
            throttle: this.inputs.forward ? 1 : this.inputs.backward ? -1 : 0,
            steer: this.inputs.left ? -1 : this.inputs.right ? 1 : 0,
            brake: this.inputs.jump, // Space = handbrake in car
          },
          isOcc
        );
      });

      // 5. Update Bots
      this.botMgr.update(
        dt,
        this.dropPlane ? this.dropPlane.position : new THREE.Vector3(),
        this.dropPlane ? this.dropPlane.progress : 1,
        this.player.position,
        this.player.isDead,
        this.zoneMgr.currentCenter,
        this.zoneMgr.currentRadius
      );

      // Check match win/loss
      this.checkMatchEnd();

      if (this.onStatsUpdate) {
        this.stats.survivalTime = Math.round((performance.now() - this.matchStartTime) / 1000);
        this.onStatsUpdate({ ...this.stats });
      }
    }
  }

  private setupEventListeners() {
    // Player fired bullet event
    window.addEventListener('player-fired-bullet', ((e: CustomEvent) => {
      this.stats.shotsFired++;
      const { origin, direction, weapon } = e.detail;

      // Raycast against all alive bots
      let closestHit: { bot: any; dist: number; isHeadshot: boolean } | null = null;
      let minDist = weapon.range;

      for (const bot of this.botMgr.bots) {
        if (bot.isDead || bot.isTeammate || bot.state === 'IN_PLANE') continue;

        const toBot = bot.position.clone().add(new THREE.Vector3(0, 1.0, 0)).sub(origin);
        const projection = toBot.dot(direction);

        if (projection > 0 && projection < minDist) {
          const closestPoint = origin.clone().addScaledVector(direction, projection);
          const distToBot = closestPoint.distanceTo(bot.position.clone().add(new THREE.Vector3(0, 1.0, 0)));

          if (distToBot < 0.6) {
            // Check headshot (top 0.35m of character)
            const headY = bot.position.y + 1.5;
            const isHeadshot = Math.abs(closestPoint.y - headY) < 0.25;

            closestHit = { bot, dist: projection, isHeadshot };
            minDist = projection;
          }
        }
      }

      if (closestHit) {
        this.stats.shotsHit++;
        let dmg = weapon.damage;
        if (closestHit.isHeadshot) {
          dmg *= weapon.headshotMultiplier;
          this.stats.headshots++;
          soundEngine.playHitMarker(true);
        } else {
          soundEngine.playHitMarker(false);
        }

        this.stats.damage += Math.round(dmg);
        const res = closestHit.bot.takeDamage(dmg, this.username, closestHit.isHeadshot, weapon.name);

        this.weaponMgr.spawnSparks(
          closestHit.bot.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
          new THREE.Vector3(0, 1, 0),
          '#ff0055'
        );

        if (res.died) {
          this.stats.kills++;
          this.scene.remove(closestHit.bot.mesh);
          this.handleBotKillFeed({
            id: `kf_${Date.now()}_${Math.random()}`,
            killerName: this.username,
            victimName: closestHit.bot.name,
            weapon: weapon.name,
            isHeadshot: closestHit.isHeadshot,
            isPlayerKiller: true,
            isTeammateVictim: false,
            timestamp: Date.now(),
          });
        }
      }
    }) as EventListener);

    // Player damaged by bot
    window.addEventListener('player-damaged', ((e: CustomEvent) => {
      if (this.player) {
        this.player.takeDamage(e.detail.damage, e.detail.attackerPos);
      }
    }) as EventListener);

    // Plane interaction request
    window.addEventListener('request-plane-interaction', ((e: CustomEvent) => {
      const player = e.detail.player;
      for (const plane of this.flyablePlanes) {
        if (!plane.isDestroyed && player.position.distanceTo(plane.position) < 4.0) {
          player.occupiedPlane = plane;
          soundEngine.startPlaneEngine();
          break;
        }
      }
    }) as EventListener);

    // Vehicle interaction request
    window.addEventListener('request-vehicle-interaction', ((e: CustomEvent) => {
      const player = e.detail.player;
      for (const car of this.vehicles) {
        if (!car.isDestroyed && player.position.distanceTo(car.position) < 3.5) {
          player.occupiedVehicle = car;
          break;
        }
      }
    }) as EventListener);

    // Keyboard inputs
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Device orientation for Gyro Aiming
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (!this.gyroEnabled || !this.player) return;
        if (e.gamma !== null && e.beta !== null) {
          this.player.yaw += (e.gamma * 0.0005) * this.gyroSensitivity;
          this.player.pitch += (e.beta * 0.0005) * this.gyroSensitivity;
        }
      });
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.state === 'DROP' && e.code === 'Space') {
      this.playerJumpFromDropPlane();
      return;
    }

    switch (e.code) {
      case 'KeyW': this.inputs.forward = true; this.inputs.pitchDown = true; break;
      case 'KeyS': this.inputs.backward = true; this.inputs.pitchUp = true; break;
      case 'KeyA': this.inputs.left = true; this.inputs.rollLeft = true; break;
      case 'KeyD': this.inputs.right = true; this.inputs.rollRight = true; break;
      case 'KeyQ': this.inputs.yawLeft = true; break;
      case 'KeyE':
        this.inputs.yawRight = true;
        this.inputs.useSkill = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.inputs.sprint = true;
        this.inputs.throttleUp = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.inputs.throttleDown = true;
        break;
      case 'KeyC': this.inputs.crouch = true; break;
      case 'Space': this.inputs.jump = true; this.inputs.brake = true; break;
      case 'KeyR': this.inputs.reload = true; break;
      case 'KeyF': this.inputs.interact = true; break;
      case 'KeyG':
        this.inputs.useGloo = true;
        this.inputs.toggleGear = true;
        break;
      case 'KeyB': this.inputs.toggleFlaps = true; break;
      case 'KeyM': soundEngine.toggleMute(); break;
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    switch (e.code) {
      case 'KeyW': this.inputs.forward = false; this.inputs.pitchDown = false; break;
      case 'KeyS': this.inputs.backward = false; this.inputs.pitchUp = false; break;
      case 'KeyA': this.inputs.left = false; this.inputs.rollLeft = false; break;
      case 'KeyD': this.inputs.right = false; this.inputs.rollRight = false; break;
      case 'KeyQ': this.inputs.yawLeft = false; break;
      case 'KeyE':
        this.inputs.yawRight = false;
        this.inputs.useSkill = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.inputs.sprint = false;
        this.inputs.throttleUp = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.inputs.throttleDown = false;
        break;
      case 'KeyC': this.inputs.crouch = false; break;
      case 'Space': this.inputs.jump = false; this.inputs.brake = false; break;
      case 'KeyR': this.inputs.reload = false; break;
      case 'KeyF': this.inputs.interact = false; break;
      case 'KeyG': this.inputs.useGloo = false; break;
    }
  }

  private handleMouseMove(e: MouseEvent) {
    if (document.pointerLockElement && this.player) {
      this.player.yaw -= e.movementX * CONFIG.MOUSE_SENSITIVITY;
      this.player.pitch -= e.movementY * CONFIG.MOUSE_SENSITIVITY;
    }
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button === 0) this.inputs.fire = true;
    if (e.button === 2) this.inputs.aim = true;
  }

  private handleMouseUp(e: MouseEvent) {
    if (e.button === 0) this.inputs.fire = false;
    if (e.button === 2) this.inputs.aim = false;
  }

  private onResize = () => {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };
}

export const gameEngine = new GameEngine();
