import * as THREE from 'three';
import { CONFIG, WEAPONS_CONFIG } from './config';
import { Difficulty, GameMode, KillFeedEntry, LootItem, TeammateInfo, WeaponStats, WeaponType } from './types';
import { createProceduralCharacter } from './procedural';
import { TerrainManager } from './terrain';
import { WorldManager } from './world';
import { WeaponManager } from './weapons';
import { soundEngine } from './audio';

export type BotState = 
  | 'IN_PLANE' 
  | 'PARACHUTING' 
  | 'PATROL' 
  | 'ALERT' 
  | 'CHASE' 
  | 'ATTACK' 
  | 'SEARCH' 
  | 'FLEE' 
  | 'DOWNED' 
  | 'DEAD';

const BOT_NAMES = [
  'Vance_Crook', 'NeonRider', 'Tommy_V', 'Diaz_86', 'Sonny_F', 
  'Ken_Lawyer', 'Candy_Suxxx', 'Avery_C', 'Phil_Cassidy', 'Mercedes_C',
  'Ricardo_D', 'Cortez_Col', 'Lance_V', 'Cam_Jones', 'Hilary_King',
  'Leo_Teal', 'Victor_V', 'Steve_Scott', 'Mitch_Baker', 'Biker_Bob',
  'Shark_Fin', 'Ocean_Drive', 'Starfish_Ace', 'Prawn_King', 'Little_Haiti',
  'Havana_Gun', 'Escobar_Run', 'Leaf_Link', 'Washington_V', 'Vice_Cop_42',
  'Swat_Enforcer', 'Marina_Sniper', 'Vice_Point_X', 'Sunken_Ship', 'Gator_Bite',
  'Flamingo_Kid', 'Pastel_Ghost', 'Turbo_Countach', 'Wave_103', 'Flash_FM',
  'V-Rock_Hero', 'Espantoso_DJ', 'K-Chat_Fan', 'Wildstyle_Pro', 'Radio_Vice',
  'Love_Fist_Fan', 'Jethro_Fix', 'Dwight_Pit', 'Mr_Black'
];

export class BotActor {
  public id: string;
  public name: string;
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public yaw: number = 0;
  public state: BotState = 'IN_PLANE';

  public health: number = 100;
  public maxHealth: number = 100;
  public armor: number = 0;
  public isDowned: boolean = false;
  public bleedoutTimer: number = CONFIG.DOWNED_BLEEDOUT_TIME;
  public isDead: boolean = false;
  public isTeammate: boolean = false;

  public equippedWeapon: WeaponStats = WEAPONS_CONFIG.RIFLE;
  public ammoInClip: number = 30;

  // AI Timers & Combat Memory
  public jumpDropDistance: number = 0; // Where along plane route it drops
  public dropTarget: THREE.Vector3 = new THREE.Vector3();
  public currentTarget: { id: string; position: THREE.Vector3; isPlayer: boolean } | null = null;
  public reactionTimer: number = 0;
  public burstCount: number = 0;
  public burstTimer: number = 0;
  public searchTimer: number = 0;
  public lastHeardPos: THREE.Vector3 | null = null;
  public strafeDir: number = 1;
  public strafeTimer: number = 0;
  public hopTimer: number = 0;
  public isHopping: boolean = false;

  constructor(id: string, name: string, isTeammate: boolean = false) {
    this.id = id;
    this.name = name;
    this.isTeammate = isTeammate;
    this.position = new THREE.Vector3(0, 200, 0);
    this.velocity = new THREE.Vector3();

    // Visual: Teammates get glowing cyan/green accents, enemies get dark vice magenta/purple
    const vestColor = isTeammate ? '#06d6a0' : '#7209b7';
    const pantsColor = isTeammate ? '#118ab2' : '#240046';
    const headColor = isTeammate ? '#48cae4' : '#f72585';

    this.mesh = createProceduralCharacter(headColor, vestColor, pantsColor);
    this.mesh.position.copy(this.position);

    // Randomize drop plane trigger
    this.jumpDropDistance = 80 + Math.random() * 800;
  }

  public takeDamage(
    amount: number,
    attackerName: string,
    isHeadshot: boolean = false,
    weaponName: string = 'M4-NEON RIFLE'
  ): { died: boolean; downed: boolean } {
    if (this.isDead) return { died: false, downed: false };

    // Armor absorbs 65% of damage
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.65);
      this.armor -= absorbed;
      amount -= absorbed;
    }

    this.health = Math.max(0, this.health - amount);

    if (this.health <= 0) {
      if (this.isTeammate && !this.isDowned) {
        // Downed first for teammate!
        this.isDowned = true;
        this.health = 50;
        this.state = 'DOWNED';
        this.bleedoutTimer = CONFIG.DOWNED_BLEEDOUT_TIME;
        return { died: false, downed: true };
      }

      this.isDead = true;
      this.state = 'DEAD';
      return { died: true, downed: false };
    }

    return { died: false, downed: false };
  }
}

export class BotManager {
  public bots: BotActor[] = [];
  public difficulty: Difficulty = 'NORMAL';
  public gameMode: GameMode = 'SOLO';

  private scene: THREE.Scene;
  private terrain: TerrainManager;
  private world: WorldManager;
  private weaponMgr: WeaponManager;
  private killFeedCallback: (entry: KillFeedEntry) => void;

  constructor(
    scene: THREE.Scene,
    terrain: TerrainManager,
    world: WorldManager,
    weaponMgr: WeaponManager,
    killFeedCallback: (entry: KillFeedEntry) => void
  ) {
    this.scene = scene;
    this.terrain = terrain;
    this.world = world;
    this.weaponMgr = weaponMgr;
    this.killFeedCallback = killFeedCallback;
  }

  public spawnBots(mode: GameMode, difficulty: Difficulty) {
    this.gameMode = mode;
    this.difficulty = difficulty;
    this.bots = [];

    // How many teammates? Duo: 1 teammate, Squad: 3 teammates, Solo: 0
    const teammateCount = mode === 'DUO' ? 1 : mode === 'SQUAD' ? 3 : 0;
    const totalBots = CONFIG.BOT_COUNT;

    for (let i = 0; i < totalBots; i++) {
      const isTeammate = i < teammateCount;
      const name = isTeammate ? `ALLY_${BOT_NAMES[i]}` : BOT_NAMES[i];
      const bot = new BotActor(`bot_${i}`, name, isTeammate);
      this.bots.push(bot);
      this.scene.add(bot.mesh);
    }
  }

  public update(
    dt: number,
    planePos: THREE.Vector3,
    planeProgress: number,
    playerPos: THREE.Vector3,
    playerDead: boolean,
    zoneCenter: THREE.Vector2,
    zoneRadius: number
  ) {
    const diffTuning = CONFIG.DIFFICULTY_TUNING[this.difficulty];

    // Stagger checks: slice bot processing so 60 FPS is maintained
    for (let i = 0; i < this.bots.length; i++) {
      const bot = this.bots[i];
      if (bot.isDead) continue;

      // 1. IN PLANE -> DROP -> PARACHUTE
      if (bot.state === 'IN_PLANE') {
        bot.position.copy(planePos);
        bot.mesh.position.copy(bot.position);

        // Check drop trigger
        if (planeProgress * 900 >= bot.jumpDropDistance) {
          bot.state = 'PARACHUTING';
          // Aim toward a building or safe point
          const targetBuilding = this.world.buildings[Math.floor(Math.random() * this.world.buildings.length)];
          if (targetBuilding) {
            bot.dropTarget.set(targetBuilding.x, targetBuilding.baseY, targetBuilding.z);
          } else {
            bot.dropTarget.set(0, 3, 0);
          }
        }
        continue;
      }

      if (bot.state === 'PARACHUTING') {
        // Glide toward dropTarget
        const toTarget = bot.dropTarget.clone().sub(bot.position);
        toTarget.y = 0;
        toTarget.normalize();

        bot.position.x += toTarget.x * CONFIG.PARACHUTE_HORIZONTAL_SPEED * dt;
        bot.position.z += toTarget.z * CONFIG.PARACHUTE_HORIZONTAL_SPEED * dt;
        bot.position.y -= CONFIG.PARACHUTE_DESCENT_SPEED * dt;

        const groundY = this.terrain.getHeight(bot.position.x, bot.position.z);
        if (bot.position.y <= groundY) {
          bot.position.y = groundY;
          bot.state = 'PATROL';
        }

        bot.mesh.position.copy(bot.position);
        continue;
      }

      // 2. DOWNED STATE
      if (bot.state === 'DOWNED') {
        bot.bleedoutTimer -= dt;
        bot.mesh.rotation.z = Math.PI / 2; // Lie on side/crawl

        if (bot.bleedoutTimer <= 0) {
          bot.isDead = true;
          bot.state = 'DEAD';
          this.scene.remove(bot.mesh);
          this.killFeedCallback({
            id: `kf_${Date.now()}_${Math.random()}`,
            killerName: 'Bleedout',
            victimName: bot.name,
            weapon: 'Bleedout',
            isHeadshot: false,
            isPlayerKiller: false,
            isTeammateVictim: bot.isTeammate,
            timestamp: Date.now(),
          });
        }
        continue;
      }

      // 3. GROUND STATE MACHINE (Patrol, Alert, Chase, Attack, Flee)
      this.updateBotGroundAI(bot, dt, playerPos, playerDead, zoneCenter, zoneRadius, diffTuning);
    }
  }

  private updateBotGroundAI(
    bot: BotActor,
    dt: number,
    playerPos: THREE.Vector3,
    playerDead: boolean,
    zoneCenter: THREE.Vector2,
    zoneRadius: number,
    tuning: any
  ) {
    // Teammates stick near player
    if (bot.isTeammate) {
      const distToPlayer = bot.position.distanceTo(playerPos);
      if (distToPlayer > 18) {
        // Follow player
        const followDir = playerPos.clone().sub(bot.position).normalize();
        bot.yaw = Math.atan2(followDir.x, followDir.z);
        bot.position.addScaledVector(followDir, CONFIG.RUN_SPEED * dt);
      }
    }

    // Zone avoidance: If outside safe circle, sprint inward!
    const distToZoneCenter = Math.hypot(bot.position.x - zoneCenter.x, bot.position.z - zoneCenter.y);
    if (distToZoneCenter > zoneRadius * 0.9) {
      const inDir = new THREE.Vector3(zoneCenter.x - bot.position.x, 0, zoneCenter.y - bot.position.z).normalize();
      bot.yaw = Math.atan2(inDir.x, inDir.z);
      bot.position.addScaledVector(inDir, CONFIG.SPRINT_SPEED * dt);
    }

    // Flee if low HP (< 30)
    if (bot.health < 30 && bot.state !== 'FLEE') {
      bot.state = 'FLEE';
    }

    // Scan for nearest visible enemy (Player or another Bot!)
    let bestTarget: { id: string; pos: THREE.Vector3; isPlayer: boolean; dist: number } | null = null;
    let minDistance = CONFIG.BOT_VISION_RANGE;

    // Check player visibility (if player is alive and bot is enemy)
    if (!playerDead && !bot.isTeammate) {
      const dist = bot.position.distanceTo(playerPos);
      if (dist < minDistance && this.checkVisionCone(bot, playerPos)) {
        bestTarget = { id: 'player', pos: playerPos.clone(), isPlayer: true, dist };
        minDistance = dist;
      }
    }

    // Check other bots
    for (const other of this.bots) {
      if (other.id === bot.id || other.isDead || other.state === 'IN_PLANE' || other.state === 'PARACHUTING') continue;
      // Teammates do not target each other
      if (bot.isTeammate && other.isTeammate) continue;

      const dist = bot.position.distanceTo(other.position);
      if (dist < minDistance && this.checkVisionCone(bot, other.position)) {
        bestTarget = { id: other.id, pos: other.position.clone(), isPlayer: false, dist };
        minDistance = dist;
      }
    }

    // Combat State Transition
    if (bestTarget) {
      bot.currentTarget = { id: bestTarget.id, position: bestTarget.pos, isPlayer: bestTarget.isPlayer };
      bot.state = 'ATTACK';
    } else if (bot.state === 'ATTACK') {
      bot.state = 'SEARCH';
      bot.searchTimer = 8.0;
    }

    // Action according to state
    if (bot.state === 'ATTACK' && bot.currentTarget) {
      const targetPos = bot.currentTarget.position;
      const toTarget = targetPos.clone().sub(bot.position);
      const dist = toTarget.length();

      // Look at target
      bot.yaw = Math.atan2(toTarget.x, toTarget.z);

      // Strafing and hopping
      bot.strafeTimer -= dt;
      if (bot.strafeTimer <= 0) {
        bot.strafeDir *= -1;
        bot.strafeTimer = 1.0 + Math.random() * 1.5;
      }

      bot.hopTimer -= dt;
      if (bot.hopTimer <= 0) {
        bot.isHopping = true;
        bot.velocity.y = CONFIG.JUMP_FORCE * 0.7;
        bot.hopTimer = 3.0 + Math.random() * 4.0;
      }

      // Move sideways while firing
      const sideDir = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
      bot.position.addScaledVector(sideDir, bot.strafeDir * CONFIG.WALK_SPEED * 0.7 * dt);

      // Fire in bursts
      bot.burstTimer -= dt;
      if (bot.burstTimer <= 0) {
        const shotsInBurst = Math.floor(tuning.burstSize[0] + Math.random() * (tuning.burstSize[1] - tuning.burstSize[0]));
        this.botFireBurst(bot, targetPos, shotsInBurst, tuning);
        const pauseTime = tuning.burstPause[0] + Math.random() * (tuning.burstPause[1] - tuning.burstPause[0]);
        bot.burstTimer = pauseTime;
      }
    } else if (bot.state === 'SEARCH') {
      bot.searchTimer -= dt;
      bot.yaw += dt * 1.2; // Look around
      if (bot.searchTimer <= 0) {
        bot.state = 'PATROL';
      }
    } else if (bot.state === 'PATROL') {
      // Wander near flat ground or buildings
      bot.position.x += Math.sin(bot.yaw) * CONFIG.WALK_SPEED * dt;
      bot.position.z += Math.cos(bot.yaw) * CONFIG.WALK_SPEED * dt;

      if (Math.random() < 0.02) {
        bot.yaw += (Math.random() - 0.5) * 1.5;
      }
    }

    // Gravity & Ground collision
    if (bot.isHopping) {
      bot.velocity.y -= CONFIG.GRAVITY * dt;
      bot.position.y += bot.velocity.y * dt;
    }

    const collision = this.world.checkCollision(bot.position, 0.4, CONFIG.PLAYER_HEIGHT);
    if (bot.position.y <= collision.groundY) {
      bot.position.y = collision.groundY;
      bot.velocity.y = 0;
      bot.isHopping = false;
    }

    // Update mesh position & procedural limb animation
    bot.mesh.position.copy(bot.position);
    bot.mesh.rotation.y = bot.yaw;

    // Procedural leg swing
    const leftLeg = bot.mesh.getObjectByName('leftLeg');
    const rightLeg = bot.mesh.getObjectByName('rightLeg');
    if (leftLeg && rightLeg) {
      const walkCycle = Math.sin(performance.now() * 0.012) * 0.45;
      leftLeg.rotation.x = walkCycle;
      rightLeg.rotation.x = -walkCycle;
    }
  }

  private checkVisionCone(bot: BotActor, targetPos: THREE.Vector3): boolean {
    const toTarget = targetPos.clone().sub(bot.position);
    toTarget.y = 0;
    toTarget.normalize();

    const forward = new THREE.Vector3(Math.sin(bot.yaw), 0, Math.cos(bot.yaw));
    const angle = forward.angleTo(toTarget);
    return angle < CONFIG.BOT_VISION_ANGLE / 2;
  }

  private botFireBurst(bot: BotActor, targetPos: THREE.Vector3, count: number, tuning: any) {
    const shotOrigin = bot.position.clone().add(new THREE.Vector3(0, 1.4, 0));

    for (let s = 0; s < count; s++) {
      setTimeout(() => {
        if (bot.isDead || bot.state === 'DOWNED') return;

        // Realistic inaccuracy: bots miss 70-85% at normal difficulty!
        const hitRoll = Math.random();
        const willHit = hitRoll < tuning.accuracy;

        let aimDir = targetPos.clone().sub(shotOrigin).normalize();
        if (!willHit) {
          // Spread inaccuracy
          aimDir.x += (Math.random() - 0.5) * 0.14;
          aimDir.y += (Math.random() - 0.5) * 0.12;
          aimDir.z += (Math.random() - 0.5) * 0.14;
          aimDir.normalize();
        }

        this.weaponMgr.fireBullet(shotOrigin, aimDir, bot.equippedWeapon, false);

        if (willHit && bot.currentTarget) {
          const dmg = (4 + Math.random() * 4) * tuning.damageMult;
          if (bot.currentTarget.isPlayer) {
            // Signal hit to player
            window.dispatchEvent(
              new CustomEvent('player-damaged', {
                detail: {
                  damage: dmg,
                  attackerPos: bot.position.clone(),
                  attackerName: bot.name,
                },
              })
            );
          } else {
            // Bot-vs-bot damage!
            const victim = this.bots.find((b) => b.id === bot.currentTarget?.id);
            if (victim) {
              const res = victim.takeDamage(dmg, bot.name, false, bot.equippedWeapon.name);
              if (res.died) {
                this.scene.remove(victim.mesh);
                this.killFeedCallback({
                  id: `kf_${Date.now()}_${Math.random()}`,
                  killerName: bot.name,
                  victimName: victim.name,
                  weapon: bot.equippedWeapon.name,
                  isHeadshot: false,
                  isPlayerKiller: false,
                  isTeammateVictim: victim.isTeammate,
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
      }, s * 140);
    }
  }

  public getAliveCount(): number {
    return this.bots.filter((b) => !b.isDead).length + 1; // +1 for player
  }

  public getTeammatesInfo(): TeammateInfo[] {
    return this.bots
      .filter((b) => b.isTeammate)
      .map((b) => ({
        id: b.id,
        name: b.name,
        health: b.health,
        maxHealth: b.maxHealth,
        armor: b.armor,
        isDowned: b.isDowned,
        isDead: b.isDead,
        kills: 0,
        x: b.position.x,
        z: b.position.z,
      }));
  }
}
