import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createProceduralCharacter,
  createProceduralRifle,
  createProceduralPlane,
  createProceduralVehicle,
  createProceduralPalmTree,
  createProceduralGlooWall,
  createProceduralAirdrop,
  createCrateTexture,
} from './procedural';

/**
 * ═══ 1. MODEL MANIFEST (SINGLE CONFIG FOR ALL 3D ASSETS) ═══
 * Modify file paths here in one centralized spot!
 */
export const MODEL_MANIFEST: Record<string, { path: string; targetHeight: number; fallback: () => THREE.Group }> = {
  player: {
    path: '/player.glb',
    targetHeight: 1.8,
    fallback: () => createProceduralCharacter('#ffd166', '#f72585', '#3a0ca3'),
  },
  bot: {
    path: '/bot.glb',
    targetHeight: 1.8,
    fallback: () => createProceduralCharacter('#4cc9f0', '#7209b7', '#10002b'),
  },
  rifle: {
    path: '/rifle.glb',
    targetHeight: 0.35,
    fallback: () => createProceduralRifle(),
  },
  plane: {
    path: '/plane.glb',
    targetHeight: 2.5,
    fallback: () => createProceduralPlane(),
  },
  vehicle: {
    path: '/vehicle.glb',
    targetHeight: 1.8,
    fallback: () => createProceduralVehicle(),
  },
  tree: {
    path: '/tree.glb',
    targetHeight: 6.0,
    fallback: () => createProceduralPalmTree(),
  },
  crate: {
    path: '/crate.glb',
    targetHeight: 1.0,
    fallback: () => {
      const g = new THREE.Group();
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ map: createCrateTexture(), roughness: 0.7 })
      );
      m.position.y = 0.5;
      m.castShadow = true;
      g.add(m);
      return g;
    },
  },
  glooWall: {
    path: '/gloo_wall.glb',
    targetHeight: 2.4,
    fallback: () => createProceduralGlooWall(),
  },
  airdrop: {
    path: '/airdrop.glb',
    targetHeight: 1.8,
    fallback: () => createProceduralAirdrop(),
  },
};

export interface LoadedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  isProcedural: boolean;
  mixer?: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
}

export class AssetManager {
  private loader: GLTFLoader;
  public models: Record<string, LoadedModel> = {};
  public loadWarnings: string[] = [];
  public loadProgress: number = 0; // 0 to 1

  constructor() {
    this.loader = new GLTFLoader();
  }

  public async loadAll(onProgress?: (progress: number, label: string) => void): Promise<void> {
    const keys = Object.keys(MODEL_MANIFEST);
    let loadedCount = 0;

    for (const key of keys) {
      const item = MODEL_MANIFEST[key];
      if (onProgress) {
        onProgress(loadedCount / keys.length, `Loading ${key} model...`);
      }

      try {
        const gltf = await this.loadGLTFWithTimeout(item.path, 1500);
        const root = gltf.scene;

        // Auto-scale to target real-world height & normalize pivot to feet
        this.normalizeModel(root, item.targetHeight);

        // Map animation clips if present
        const actions: Record<string, THREE.AnimationAction> = {};
        let mixer: THREE.AnimationMixer | undefined;

        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(root);
          for (const clip of gltf.animations) {
            const name = clip.name.toLowerCase();
            actions[name] = mixer.clipAction(clip);
          }
        }

        this.models[key] = {
          scene: root,
          animations: gltf.animations || [],
          isProcedural: false,
          mixer,
          actions,
        };
      } catch (err) {
        // Fallback to stylized procedural 3D model without breaking
        this.loadWarnings.push(`Using procedural model for '${key}'`);
        const fallbackGroup = item.fallback();
        this.models[key] = {
          scene: fallbackGroup,
          animations: [],
          isProcedural: true,
          actions: {},
        };
      }

      loadedCount++;
      this.loadProgress = loadedCount / keys.length;
      if (onProgress) {
        onProgress(this.loadProgress, `Processed ${key}`);
      }
    }
  }

  private loadGLTFWithTimeout(url: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Timeout loading ${url}`));
        }
      }, timeoutMs);

      this.loader.load(
        url,
        (gltf) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(gltf);
          }
        },
        undefined,
        (err) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            reject(err);
          }
        }
      );
    });
  }

  /**
   * Auto-scale model to specified real-world height and put pivot at bottom center (feet)
   */
  private normalizeModel(object: THREE.Object3D, targetHeight: number) {
    const bbox = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    if (size.y > 0.0001) {
      const scale = targetHeight / size.y;
      object.scale.set(scale, scale, scale);

      // Recompute bbox with scale
      const scaledBbox = new THREE.Box3().setFromObject(object);
      const center = new THREE.Vector3();
      scaledBbox.getCenter(center);

      // Offset so feet are at Y = 0 and centered on X/Z
      object.position.x -= center.x;
      object.position.y -= scaledBbox.min.y;
      object.position.z -= center.z;

      // Wrap in a parent group so local transforms work predictably
      const wrapper = new THREE.Group();
      wrapper.add(object);
    }

    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  public getModel(name: string): THREE.Group {
    const entry = this.models[name];
    if (entry) {
      return entry.scene.clone(true);
    }
    // Return empty fallback
    return new THREE.Group();
  }
}

export const assetManager = new AssetManager();
