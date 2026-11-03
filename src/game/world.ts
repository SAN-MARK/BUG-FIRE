import * as THREE from 'three';
import { CONFIG, MAPS_CONFIG, WEAPONS_CONFIG } from './config';
import { LootItem, MapId, WeaponType } from './types';
import { TerrainManager } from './terrain';
import {
  createBuildingFacadeTexture,
  createRoadTexture,
  createRunwayTexture,
  createProceduralPalmTree,
} from './procedural';

export interface BoxCollider {
  min: THREE.Vector3;
  max: THREE.Vector3;
  type: 'BUILDING' | 'WALL' | 'ROOF' | 'VEHICLE';
  roofY?: number;
}

export interface BuildingData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  baseY: number;
  color: string;
}

export class WorldManager {
  public terrain: TerrainManager;
  public mapId: MapId;
  public colliders: BoxCollider[] = [];
  public buildings: BuildingData[] = [];
  public lootItems: LootItem[] = [];
  public worldGroup: THREE.Group;
  public lootGroup: THREE.Group;
  private roadTexture: THREE.CanvasTexture;
  private runwayTexture: THREE.CanvasTexture;

  constructor(terrain: TerrainManager, mapId: MapId = 'BERMUDA') {
    this.terrain = terrain;
    this.mapId = mapId;
    this.worldGroup = new THREE.Group();
    this.lootGroup = new THREE.Group();
    this.worldGroup.add(this.lootGroup);
    this.roadTexture = createRoadTexture();
    this.runwayTexture = createRunwayTexture();
  }

  public generateWorld() {
    this.colliders = [];
    this.buildings = [];
    this.lootItems = [];

    // 1. Build Airfield & Runway
    this.buildAirfield();

    // 2. Build 30 Urban & Resort Buildings across 4 distinct settlement clusters
    this.buildSettlements();

    // 3. Build Streets & Roads between clusters
    this.buildRoadNetwork();

    // 4. Populate Foliage (Palm trees, rocks)
    this.populateFoliage();

    // 5. Spawn Loot items inside and around buildings
    this.spawnLoot();
  }

  private buildAirfield() {
    // Airfield runway at (x: 0, z: -160)
    const rwLength = 220;
    const rwWidth = 32;
    const rwY = 3.51; // Just above terrain

    const runwayGeo = new THREE.PlaneGeometry(rwWidth, rwLength);
    runwayGeo.rotateX(-Math.PI / 2);
    const runwayMat = new THREE.MeshStandardMaterial({
      map: this.runwayTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const runway = new THREE.Mesh(runwayGeo, runwayMat);
    runway.position.set(0, rwY, -160);
    runway.receiveShadow = true;
    this.worldGroup.add(runway);

    // Airfield Hangar
    this.createBuilding(-40, -160, 24, 30, 9, '#3a0ca3', '#4cc9f0');
    // Control Tower
    this.createBuilding(35, -200, 12, 12, 22, '#f72585', '#ffd166');
  }

  private buildSettlements() {
    const mapConfig = MAPS_CONFIG[this.mapId];
    const colors = mapConfig.buildingColors;

    // 4 Cluster Centers:
    // Cluster A: "Ocean Beach Strip" (x: -160 to -60, z: 80 to 200)
    // Cluster B: "Vice City Center" (x: 40 to 180, z: -60 to 60)
    // Cluster C: "Harbor Docks" (x: 140 to 240, z: 100 to 220)
    // Cluster D: "Highland Outpost" (x: -140 to -40, z: -40 to 40)

    const clusters = [
      { name: 'Beach Strip', cx: -110, cz: 140, count: 8, spreadX: 90, spreadZ: 90 },
      { name: 'Vice Center', cx: 110, cz: 0, count: 10, spreadX: 110, spreadZ: 100 },
      { name: 'Harbor Docks', cx: 180, cz: 150, count: 7, spreadX: 80, spreadZ: 70 },
      { name: 'Highland Outpost', cx: -90, cz: 0, count: 6, spreadX: 70, spreadZ: 70 },
    ];

    let colorIdx = 0;

    clusters.forEach((cluster) => {
      for (let i = 0; i < cluster.count; i++) {
        const angle = (i / cluster.count) * Math.PI * 2;
        const dist = 25 + (i % 3) * 20;
        const x = cluster.cx + Math.cos(angle) * dist;
        const z = cluster.cz + Math.sin(angle) * dist;

        const w = 14 + (i % 3) * 6;
        const d = 14 + ((i + 1) % 3) * 6;
        const h = 8 + (i % 4) * 6; // 8m to 26m high

        const c1 = colors[colorIdx % colors.length];
        const c2 = colors[(colorIdx + 2) % colors.length];
        colorIdx++;

        this.createBuilding(x, z, w, d, h, c1, c2);
      }
    });
  }

  private createBuilding(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    baseColor: string,
    neonColor: string
  ) {
    const terrainY = this.terrain.getHeight(x, z);
    const halfW = width / 2;
    const halfD = depth / 2;

    const bData: BuildingData = {
      x,
      z,
      width,
      depth,
      height,
      baseY: terrainY,
      color: baseColor,
    };
    this.buildings.push(bData);

    // Visual building mesh
    const texture = createBuildingFacadeTexture(baseColor, neonColor, '#10002b');
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, terrainY + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.worldGroup.add(mesh);

    // Roof border lip
    const lipMat = new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 0.5,
      roughness: 0.2,
    });
    const lipGeo = new THREE.BoxGeometry(width + 0.4, 0.4, depth + 0.4);
    const lip = new THREE.Mesh(lipGeo, lipMat);
    lip.position.set(x, terrainY + height + 0.2, z);
    this.worldGroup.add(lip);

    // Box Collider for collision engine
    this.colliders.push({
      min: new THREE.Vector3(x - halfW, terrainY, z - halfD),
      max: new THREE.Vector3(x + halfW, terrainY + height, z + halfD),
      type: 'BUILDING',
      roofY: terrainY + height,
    });
  }

  private buildRoadNetwork() {
    // Road strips connecting clusters
    const roadSegments = [
      { x1: 0, z1: -60, x2: 110, z2: 0, width: 10 },
      { x1: 110, z1: 0, x2: 180, z2: 150, width: 10 },
      { x1: 110, z1: 0, x2: -110, z2: 140, width: 10 },
      { x1: 0, z1: -60, x2: -90, z2: 0, width: 10 },
      { x1: -90, z1: 0, x2: -110, z2: 140, width: 10 },
    ];

    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.8,
      metalness: 0.1,
    });

    roadSegments.forEach((seg) => {
      const dx = seg.x2 - seg.x1;
      const dz = seg.z2 - seg.z1;
      const len = Math.hypot(dx, dz);
      const angle = Math.atan2(dx, dz);

      const mx = (seg.x1 + seg.x2) / 2;
      const mz = (seg.z1 + seg.z2) / 2;
      const my = this.terrain.getHeight(mx, mz) + 0.05;

      const rGeo = new THREE.PlaneGeometry(seg.width, len);
      rGeo.rotateX(-Math.PI / 2);
      const roadMesh = new THREE.Mesh(rGeo, roadMat);
      roadMesh.position.set(mx, my, mz);
      roadMesh.rotation.y = angle;
      roadMesh.receiveShadow = true;
      this.worldGroup.add(roadMesh);
    });
  }

  private populateFoliage() {
    // Spawn 140 instanced palm trees along beach / road margins
    const treeCount = 140;
    for (let i = 0; i < treeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 320;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = this.terrain.getHeight(x, z);

      // Don't spawn trees underwater or on high snowy peaks
      if (y > CONFIG.WATER_LEVEL + 0.8 && y < 35) {
        const tree = createProceduralPalmTree();
        tree.position.set(x, y, z);
        const s = 0.8 + Math.random() * 0.4;
        tree.scale.set(s, s, s);
        tree.rotation.y = Math.random() * Math.PI * 2;
        this.worldGroup.add(tree);
      }
    }
  }

  public spawnLoot() {
    this.lootItems = [];
    while (this.lootGroup.children.length > 0) {
      this.lootGroup.remove(this.lootGroup.children[0]);
    }

    const weaponTypes: WeaponType[] = ['RIFLE', 'SHOTGUN', 'PISTOL', 'SNIPER'];

    // Spawn loot at every building (at ground level and on roof!)
    this.buildings.forEach((b, idx) => {
      // Ground loot near entrance
      this.addLootItem(
        `loot_${idx}_g1`,
        'WEAPON',
        b.x + (Math.random() - 0.5) * (b.width - 4),
        b.baseY + 0.4,
        b.z + (Math.random() - 0.5) * (b.depth - 4),
        weaponTypes[idx % weaponTypes.length]
      );

      this.addLootItem(
        `loot_${idx}_g2`,
        'AMMO',
        b.x + b.width / 2 + 2,
        b.baseY + 0.3,
        b.z,
        undefined,
        60
      );

      this.addLootItem(
        `loot_${idx}_med`,
        'MEDKIT',
        b.x - b.width / 2 - 2,
        b.baseY + 0.3,
        b.z,
        undefined,
        50
      );

      // Roof loot (reward for landing on roofs!)
      this.addLootItem(
        `loot_${idx}_roof1`,
        'WEAPON',
        b.x,
        b.baseY + b.height + 0.3,
        b.z,
        weaponTypes[(idx + 1) % weaponTypes.length]
      );

      this.addLootItem(
        `loot_${idx}_roof2`,
        'ARMOR',
        b.x + 3,
        b.baseY + b.height + 0.3,
        b.z + 3,
        undefined,
        100
      );

      this.addLootItem(
        `loot_${idx}_gloo`,
        'GLOO_WALL',
        b.x - 3,
        b.baseY + b.height + 0.3,
        b.z - 3,
        undefined,
        2
      );
    });

    // Airfield runway crate spawns
    for (let r = 0; r < 5; r++) {
      this.addLootItem(
        `airfield_loot_${r}`,
        'WEAPON',
        (Math.random() - 0.5) * 16,
        3.5 + 0.4,
        -220 + r * 30,
        'SNIPER'
      );
    }
  }

  private addLootItem(
    id: string,
    type: LootItem['type'],
    x: number,
    y: number,
    z: number,
    weaponType?: WeaponType,
    amount: number = 30
  ) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    let color = '#ffd166';
    if (type === 'WEAPON') {
      color = weaponType ? WEAPONS_CONFIG[weaponType].color : '#00ffff';
    } else if (type === 'MEDKIT') {
      color = '#06d6a0';
    } else if (type === 'ARMOR') {
      color = '#118ab2';
    } else if (type === 'GLOO_WALL') {
      color = '#48cae4';
    }

    // Glowing pickup indicator
    const beaconGeo = new THREE.CylinderGeometry(0.04, 0.3, 0.7, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      wireframe: true,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 0.5;
    group.add(beacon);

    // Glow ring on ground
    const ringGeo = new THREE.RingGeometry(0.35, 0.45, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.05;
    group.add(ring);

    this.lootGroup.add(group);

    const item: LootItem = {
      id,
      type,
      weaponType,
      amount,
      x,
      y,
      z,
      mesh: group,
      collected: false,
    };
    this.lootItems.push(item);
  }

  public updateLootAnimation(time: number) {
    this.lootItems.forEach((item) => {
      if (item.mesh && !item.collected) {
        item.mesh.rotation.y = time * 2;
        item.mesh.position.y = item.y + Math.sin(time * 3 + item.x) * 0.1;
      }
    });
  }

  /**
   * Kinematic Swept-AABB & Raycast collision detection against terrain and buildings.
   * Allows standing on roofs, prevents wall clipping.
   */
  public checkCollision(
    pos: THREE.Vector3,
    radius: number = 0.4,
    height: number = 1.8
  ): { collided: boolean; groundY: number; onRoof: boolean } {
    let groundY = this.terrain.getHeight(pos.x, pos.z);
    let onRoof = false;
    let collided = false;

    for (const b of this.colliders) {
      if (
        pos.x + radius > b.min.x &&
        pos.x - radius < b.max.x &&
        pos.z + radius > b.min.z &&
        pos.z - radius < b.max.z
      ) {
        // Check if player is standing on the roof!
        if (b.roofY !== undefined && pos.y >= b.roofY - 0.5) {
          if (b.roofY > groundY) {
            groundY = b.roofY;
            onRoof = true;
          }
        } else if (pos.y < (b.roofY || b.max.y) && pos.y + height > b.min.y) {
          // Push player out horizontally along shallowest penetration axis
          collided = true;
          const leftPen = Math.abs(pos.x + radius - b.min.x);
          const rightPen = Math.abs(b.max.x - (pos.x - radius));
          const frontPen = Math.abs(pos.z + radius - b.min.z);
          const backPen = Math.abs(b.max.z - (pos.z - radius));

          const minPen = Math.min(leftPen, rightPen, frontPen, backPen);
          if (minPen === leftPen) pos.x = b.min.x - radius;
          else if (minPen === rightPen) pos.x = b.max.x + radius;
          else if (minPen === frontPen) pos.z = b.min.z - radius;
          else pos.z = b.max.z + radius;
        }
      }
    }

    return { collided, groundY, onRoof };
  }
}
