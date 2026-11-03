import * as THREE from 'three';
import { CONFIG, MAPS_CONFIG } from './config';
import { MapId } from './types';

/**
 * Procedural Island Terrain with Analytic Height Function
 * Provides exact heights at any (x, z) coordinate for kinematic physics & bot nav.
 */

export class TerrainManager {
  public mesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public mapId: MapId = 'BERMUDA';
  private size: number = CONFIG.WORLD_SIZE;
  private segments: number = CONFIG.TERRAIN_SEGMENTS;

  constructor(mapId: MapId = 'BERMUDA') {
    this.mapId = mapId;
  }

  /**
   * Analytic height equation for the 1000m x 1000m island.
   * Island drops off into ocean around radius 420m.
   * Flat plateaus reserved for airfield (around x: -120 to +120, z: -200 to -50)
   * and urban town clusters.
   */
  public getHeight(x: number, z: number): number {
    const distFromCenter = Math.sqrt(x * x + z * z);
    const maxRadius = this.size * 0.44; // 440m radius island

    // Ocean boundary
    if (distFromCenter > maxRadius) {
      const drop = (distFromCenter - maxRadius) * 0.15;
      return Math.max(-10, 0.5 - drop);
    }

    // Airfield flat plateau: around (x: 0, z: -160), 240m long, 60m wide
    const distToRunwayX = Math.abs(x);
    const distToRunwayZ = Math.abs(z - (-160));
    if (distToRunwayX < 50 && distToRunwayZ < 130) {
      return 3.5; // perfectly flat runway
    }

    // Base island dome falloff (smooth cosine curve from center)
    const islandFactor = Math.cos((distFromCenter / maxRadius) * (Math.PI / 2));
    const domeHeight = Math.pow(Math.max(0, islandFactor), 1.4) * 28;

    // Mountainous features depending on map
    let mountainHeight = 0;
    if (this.mapId === 'PURGATORY') {
      // Steeper high peaks
      mountainHeight = (Math.sin(x * 0.012) * Math.cos(z * 0.012) * 22) +
                       (Math.sin(x * 0.03 + z * 0.02) * 8);
    } else if (this.mapId === 'KALAHARI') {
      // Dunes & ridges
      mountainHeight = (Math.sin(x * 0.018 + z * 0.01) * 16) +
                       (Math.sin(x * 0.04) * 5);
    } else {
      // Bermuda rolling hills & beaches
      mountainHeight = (Math.sin(x * 0.015) * Math.cos(z * 0.015) * 12) +
                       (Math.sin(x * 0.035 + z * 0.025) * 4);
    }

    // Beach smoothing near edge
    let finalHeight = Math.max(0.4, (domeHeight + mountainHeight) * islandFactor);

    // Harbor basin near x: 180, z: 120
    const harborDist = Math.sqrt(Math.pow(x - 180, 2) + Math.pow(z - 120, 2));
    if (harborDist < 70) {
      const harborDepth = (1 - harborDist / 70) * 8;
      finalHeight -= harborDepth;
    }

    return Math.max(0.2, finalHeight);
  }

  /**
   * Get surface normal vector at (x, z)
   */
  public getNormal(x: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z);
    const hR = this.getHeight(x + eps, z);
    const hD = this.getHeight(x, z - eps);
    const hU = this.getHeight(x, z + eps);

    out.set(hL - hR, 2 * eps, hD - hU).normalize();
    return out;
  }

  /**
   * Build procedural terrain geometry with vertex colors for sand/grass/rock/snow
   */
  public createTerrainMesh(): THREE.Mesh {
    const mapConfig = MAPS_CONFIG[this.mapId];
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const sandColor = new THREE.Color(mapConfig.terrainColors.sand);
    const grassColor = new THREE.Color(mapConfig.terrainColors.grass);
    const rockColor = new THREE.Color(mapConfig.terrainColors.rock);
    const snowColor = mapConfig.terrainColors.snow ? new THREE.Color(mapConfig.terrainColors.snow) : rockColor;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getHeight(x, z);
      pos.setY(i, y);

      // Height and slope based vertex coloration
      let c: THREE.Color;
      if (y < CONFIG.WATER_LEVEL + 1.2) {
        c = sandColor;
      } else if (y < 16) {
        c = grassColor;
      } else if (y < 35) {
        c = rockColor;
      } else {
        c = snowColor;
      }

      // Add slight noise to color for retro texture feel
      const noise = 0.9 + Math.random() * 0.2;
      colors[i * 3] = c.r * noise;
      colors[i * 3 + 1] = c.g * noise;
      colors[i * 3 + 2] = c.b * noise;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: true, // Chunky readable low-poly PS2 retro look
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'Terrain';
    this.mesh = mesh;
    return mesh;
  }

  /**
   * Build animated retro ocean water plane
   */
  public createWaterMesh(): THREE.Mesh {
    const mapConfig = MAPS_CONFIG[this.mapId];
    const geo = new THREE.PlaneGeometry(this.size * 1.5, this.size * 1.5, 48, 48);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(mapConfig.waterColor),
      roughness: 0.2,
      metalness: 0.6,
      transparent: true,
      opacity: 0.85,
      flatShading: true,
    });

    const water = new THREE.Mesh(geo, mat);
    water.position.y = CONFIG.WATER_LEVEL;
    water.name = 'Water';
    this.waterMesh = water;
    return water;
  }

  public updateWater(time: number) {
    if (!this.waterMesh) return;
    this.waterMesh.position.y = CONFIG.WATER_LEVEL + Math.sin(time * 1.5) * 0.15;
  }
}
