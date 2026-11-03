import { MapConfig, MapId, WeaponStats, WeaponType } from './types';

export const CONFIG = {
  // World dimensions
  WORLD_SIZE: 1000,
  TERRAIN_SEGMENTS: 128,
  WATER_LEVEL: 1.5,
  MAX_TERRAIN_HEIGHT: 65,

  // Player motion
  PLAYER_HEIGHT: 1.8,
  WALK_SPEED: 4.5,
  RUN_SPEED: 7.2,
  SPRINT_SPEED: 10.5,
  CROUCH_SPEED: 2.5,
  SWIM_SPEED: 3.2,
  DOWNED_SPEED: 1.4,
  JUMP_FORCE: 7.5,
  GRAVITY: 22.0,
  COYOTE_TIME: 0.13, // seconds
  JUMP_BUFFER_TIME: 0.15, // seconds
  VAULT_MAX_HEIGHT: 1.6, // meters to vault over
  VAULT_SPEED: 4.0,

  // Camera
  CAMERA_DISTANCE: 3.6,
  CAMERA_DISTANCE_ADS: 1.6,
  CAMERA_HEIGHT: 1.7,
  CAMERA_FOV_NORMAL: 65,
  CAMERA_FOV_SPRINT: 72,
  CAMERA_FOV_ADS: 45,
  MOUSE_SENSITIVITY: 0.0022,
  GYRO_SENSITIVITY: 1.0,

  // Drop & Freefall
  PLANE_HEIGHT: 180,
  PLANE_SPEED: 45,
  FREEFALL_MIN_SPEED: 25,
  FREEFALL_MAX_SPEED: 55, // diving
  FREEFALL_HORIZONTAL_SPEED: 22,
  PARACHUTE_DESCENT_SPEED: 8.5,
  PARACHUTE_HORIZONTAL_SPEED: 14,
  AUTO_PARACHUTE_ALTITUDE: 30,

  // Storm Zone
  ZONE_PHASES: [
    { delay: 30, shrinkDuration: 40, radius: 360, dps: 1.0 },
    { delay: 30, shrinkDuration: 35, radius: 240, dps: 2.0 },
    { delay: 25, shrinkDuration: 30, radius: 140, dps: 4.0 },
    { delay: 20, shrinkDuration: 25, radius: 60, dps: 7.5 },
    { delay: 15, shrinkDuration: 20, radius: 10, dps: 15.0 },
  ],

  // Bot Counts & Combat
  TOTAL_PLAYERS: 50,
  BOT_COUNT: 49,
  BOT_HEARING_RANGE: 55,
  BOT_VISION_RANGE: 65,
  BOT_VISION_ANGLE: 110 * (Math.PI / 180),
  
  // Difficulty profiles
  DIFFICULTY_TUNING: {
    EASY: {
      accuracy: 0.14,
      reactionTime: 1.1,
      burstSize: [2, 3],
      burstPause: [1.2, 2.0],
      damageMult: 0.7,
    },
    NORMAL: {
      accuracy: 0.22,
      reactionTime: 0.85,
      burstSize: [2, 4],
      burstPause: [0.8, 1.5],
      damageMult: 1.0,
    },
    HARD: {
      accuracy: 0.32,
      reactionTime: 0.55,
      burstSize: [3, 5],
      burstPause: [0.6, 1.1],
      damageMult: 1.3,
    },
  },

  // Aircraft & Vehicles
  FLYABLE_PLANES_COUNT: 4,
  VEHICLES_COUNT: 4,
  PLANE_STALL_SPEED: 18,
  PLANE_MAX_SPEED: 70,
  PLANE_TAKEOFF_SPEED: 22,
  CAR_MAX_SPEED: 28,
  CAR_ACCELERATION: 18,
  CAR_STEER_SPEED: 2.2,

  // Gloo wall & Skill
  GLOO_WALL_DURATION: 10, // seconds
  GLOO_WALL_MAX_CHARGES: 3,
  SKILL_COOLDOWN: 25, // seconds
  SKILL_DURATION: 6, // speed burst & heal pulse
  DOWNED_BLEEDOUT_TIME: 30, // seconds
  REVIVE_TIME: 5.0, // seconds
};

export const WEAPONS_CONFIG: Record<WeaponType, WeaponStats> = {
  RIFLE: {
    id: 'RIFLE',
    name: 'M4-NEON RIFLE',
    damage: 18,
    fireRate: 9.0, // 9 shots/sec
    clipSize: 30,
    reloadTime: 2.0,
    spread: 0.022,
    recoil: 0.018,
    range: 120,
    bulletSpeed: 240,
    headshotMultiplier: 1.8,
    color: '#00ffff',
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'SPAS-12 SUNSET',
    damage: 9, // per pellet (8 pellets = 72)
    fireRate: 1.4,
    clipSize: 6,
    reloadTime: 2.6,
    spread: 0.075,
    recoil: 0.05,
    range: 45,
    bulletSpeed: 180,
    headshotMultiplier: 1.5,
    color: '#ff007f',
  },
  PISTOL: {
    id: 'PISTOL',
    name: 'VICE GLOCK',
    damage: 14,
    fireRate: 4.5,
    clipSize: 15,
    reloadTime: 1.5,
    spread: 0.035,
    recoil: 0.015,
    range: 60,
    bulletSpeed: 200,
    headshotMultiplier: 1.8,
    color: '#ffd700',
  },
  SNIPER: {
    id: 'SNIPER',
    name: 'AWM PALM',
    damage: 85,
    fireRate: 0.8,
    clipSize: 5,
    reloadTime: 3.0,
    spread: 0.005,
    recoil: 0.07,
    range: 250,
    bulletSpeed: 380,
    headshotMultiplier: 2.2,
    color: '#a855f7',
  },
};

export const MAPS_CONFIG: Record<MapId, MapConfig> = {
  BERMUDA: {
    id: 'BERMUDA',
    name: 'BERMUDA',
    subtitle: 'Vice City Tropical Coast',
    description: 'Golden beaches, pastel art-deco resorts, neon strip clubs, swaying palms, and a bustling coastal airfield.',
    skyColorTop: '#ff4d6d',
    skyColorBottom: '#ff9e00',
    sunColor: '#ffd166',
    sunIntensity: 1.8,
    fogColor: '#ff758f',
    fogNear: 150,
    fogFar: 600,
    waterColor: '#00b4d8',
    terrainColors: {
      sand: '#ffe3a8',
      grass: '#48bfe3',
      rock: '#7209b7',
    },
    buildingColors: ['#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0'],
    ambientColor: '#3a0ca3',
  },
  PURGATORY: {
    id: 'PURGATORY',
    name: 'PURGATORY',
    subtitle: 'Alpine Frost Peaks',
    description: 'Snow-capped ridges, glacial lakes, sharp radar towers, and long sniper sight lines across mountain gorges.',
    skyColorTop: '#3a0ca3',
    skyColorBottom: '#b5179e',
    sunColor: '#e0aaff',
    sunIntensity: 1.6,
    fogColor: '#7209b7',
    fogNear: 120,
    fogFar: 550,
    waterColor: '#10002b',
    terrainColors: {
      sand: '#9d4edd',
      grass: '#e0aaff',
      rock: '#3c096c',
      snow: '#ffffff',
    },
    buildingColors: ['#240046', '#3c096c', '#5a189a', '#7b2cbf', '#9d4edd'],
    ambientColor: '#240046',
  },
  KALAHARI: {
    id: 'KALAHARI',
    name: 'KALAHARI',
    subtitle: 'Dune Ruins & Canyons',
    description: 'Endless desert sandstone, sun-baked oil derricks, ancient canyon walls, and high-intensity open skirmishes.',
    skyColorTop: '#d00000',
    skyColorBottom: '#ffba08',
    sunColor: '#fff3b0',
    sunIntensity: 2.1,
    fogColor: '#e85d04',
    fogNear: 140,
    fogFar: 620,
    waterColor: '#3f88c5',
    terrainColors: {
      sand: '#faa307',
      grass: '#e85d04',
      rock: '#9d0208',
    },
    buildingColors: ['#dc2f02', '#e85d04', '#f48c06', '#faa307', '#ffba08'],
    ambientColor: '#6a040f',
  },
};
