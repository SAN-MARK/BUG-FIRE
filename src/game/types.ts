export type GameState = 
  | 'LOADING' 
  | 'LOGIN' 
  | 'LOBBY' 
  | 'MAP_SELECT' 
  | 'MATCHMAKING' 
  | 'DROP' 
  | 'PLAYING' 
  | 'GAME_OVER' 
  | 'BOOYAH';

export type GameMode = 'SOLO' | 'DUO' | 'SQUAD';
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';
export type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH';

export type MapId = 'BERMUDA' | 'PURGATORY' | 'KALAHARI';

export interface MapConfig {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  skyColorTop: string;
  skyColorBottom: string;
  sunColor: string;
  sunIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  waterColor: string;
  terrainColors: {
    sand: string;
    grass: string;
    rock: string;
    snow?: string;
  };
  buildingColors: string[];
  ambientColor: string;
}

export type PlayerAnimState = 
  | 'idle' 
  | 'walk' 
  | 'run' 
  | 'sprint' 
  | 'crouch' 
  | 'jump' 
  | 'fall' 
  | 'land' 
  | 'aim' 
  | 'shoot' 
  | 'reload' 
  | 'swim' 
  | 'parachute' 
  | 'freefall' 
  | 'downed'
  | 'death';

export type WeaponType = 'RIFLE' | 'SHOTGUN' | 'PISTOL' | 'SNIPER';

export interface WeaponStats {
  id: WeaponType;
  name: string;
  damage: number;
  fireRate: number; // shots per sec
  clipSize: number;
  reloadTime: number; // seconds
  spread: number; // radians
  recoil: number;
  range: number;
  bulletSpeed: number;
  headshotMultiplier: number;
  color: string;
}

export interface LootItem {
  id: string;
  type: 'WEAPON' | 'AMMO' | 'MEDKIT' | 'ARMOR' | 'GLOO_WALL';
  weaponType?: WeaponType;
  amount?: number;
  x: number;
  y: number;
  z: number;
  mesh?: any;
  collected?: boolean;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  victimName: string;
  weapon: string;
  isHeadshot: boolean;
  isPlayerKiller: boolean;
  isTeammateVictim: boolean;
  timestamp: number;
}

export interface TeammateInfo {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  armor: number;
  isDowned: boolean;
  isDead: boolean;
  kills: number;
  x: number;
  z: number;
}

export interface MatchStats {
  kills: number;
  assists: number;
  damage: number;
  survivalTime: number; // seconds
  placement: number;
  totalPlayers: number;
  rankPoints: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
}
