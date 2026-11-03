import * as THREE from 'three';

/**
 * Procedural Canvas Texture & Model Generators for BUG FIRE
 * Authentic 2002 PS2 Vice City low-poly aesthetic.
 * All textures generated in HTML5 2D Canvas with nearest-neighbor filtering.
 */

// --- Canvas Textures ---

export function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt
  ctx.fillStyle = '#1e1e28';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle asphalt grain
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? '#2a2a38' : '#14141e';
    ctx.fillRect(x, y, 2, 2);
  }

  // Yellow dashed center line
  ctx.fillStyle = '#ffd166';
  for (let y = 10; y < 256; y += 40) {
    ctx.fillRect(124, y, 8, 24);
  }

  // White road borders
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(4, 0, 8, 256);
  ctx.fillRect(244, 0, 8, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRunwayTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Tarmac concrete
  ctx.fillStyle = '#2b2d42';
  ctx.fillRect(0, 0, 256, 512);

  // Runway threshold stripes
  ctx.fillStyle = '#ffffff';
  for (let x = 30; x < 226; x += 22) {
    ctx.fillRect(x, 15, 12, 60);
    ctx.fillRect(x, 437, 12, 60);
  }

  // Dashed centerline
  for (let y = 90; y < 420; y += 50) {
    ctx.fillRect(120, y, 16, 32);
  }

  // Runway designation numbers '24'
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('24', 128, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBuildingFacadeTexture(
  baseColor: string = '#f72585',
  neonColor: string = '#4cc9f0',
  stripeColor: string = '#7209b7'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Base art-deco pastel wall
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);

  // Horizontal trim stripes
  ctx.fillStyle = stripeColor;
  ctx.fillRect(0, 0, 128, 12);
  ctx.fillRect(0, 80, 128, 8);
  ctx.fillRect(0, 160, 128, 8);
  ctx.fillRect(0, 244, 128, 12);

  // Pixelated neon grid windows
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      const wx = 16 + col * 38;
      const wy = 24 + row * 38;

      // Window frame
      ctx.fillStyle = '#10002b';
      ctx.fillRect(wx - 2, wy - 2, 24, 28);

      // Lit/unlit neon window glass
      const isLit = Math.random() > 0.35;
      ctx.fillStyle = isLit ? neonColor : '#240046';
      ctx.fillRect(wx, wy, 20, 24);

      if (isLit) {
        // Window mullion
        ctx.fillStyle = '#10002b';
        ctx.fillRect(wx + 9, wy, 2, 24);
        ctx.fillRect(wx, wy + 11, 20, 2);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createCrateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Military/vice crate wood or metal
  ctx.fillStyle = '#b08968';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#583101';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 118);

  // Diagonal brace
  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(118, 118);
  ctx.stroke();

  // Stencil text
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BUG FIRE', 64, 70);

  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// --- Composite 3-12 Part Procedural Models ---

export function createProceduralCharacter(
  colorHead: string = '#ffd166',
  colorVest: string = '#f72585',
  colorPants: string = '#3a0ca3'
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'ProceduralCharacter';

  // Mat materials
  const matSkin = new THREE.MeshStandardMaterial({ color: colorHead, roughness: 0.6 });
  const matVest = new THREE.MeshStandardMaterial({ color: colorVest, roughness: 0.4, metalness: 0.2 });
  const matPants = new THREE.MeshStandardMaterial({ color: colorPants, roughness: 0.7 });
  const matBoot = new THREE.MeshStandardMaterial({ color: '#1a1a24', roughness: 0.8 });
  const matVisor = new THREE.MeshStandardMaterial({ color: '#00ffff', roughness: 0.1, metalness: 0.9, emissive: '#00ffff', emissiveIntensity: 0.3 });

  // 1. Torso & Tactical Vest
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), matVest);
  torso.position.y = 1.15;
  torso.castShadow = true;
  root.add(torso);

  // Tactical pouch / backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.15), matBoot);
  backpack.position.set(0, 1.2, -0.2);
  backpack.castShadow = true;
  root.add(backpack);

  // 2. Head & Neon Visor
  const headGroup = new THREE.Group();
  headGroup.name = 'head';
  headGroup.position.set(0, 1.65, 0);

  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), matSkin);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Sunglasses / Visor
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.08), matVisor);
  visor.position.set(0, 0.02, 0.16);
  headGroup.add(visor);

  // Retro headband / cap
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.32), matVest);
  cap.position.set(0, 0.14, 0);
  headGroup.add(cap);

  root.add(headGroup);

  // 3. Left Leg & Boot (Pivot at hip)
  const leftLeg = new THREE.Group();
  leftLeg.name = 'leftLeg';
  leftLeg.position.set(-0.15, 0.85, 0);

  const leftPants = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), matPants);
  leftPants.position.y = -0.25;
  leftPants.castShadow = true;
  leftLeg.add(leftPants);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.26), matBoot);
  leftBoot.position.set(0, -0.65, 0.03);
  leftBoot.castShadow = true;
  leftLeg.add(leftBoot);
  root.add(leftLeg);

  // 4. Right Leg & Boot
  const rightLeg = new THREE.Group();
  rightLeg.name = 'rightLeg';
  rightLeg.position.set(0.15, 0.85, 0);

  const rightPants = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.2), matPants);
  rightPants.position.y = -0.25;
  rightPants.castShadow = true;
  rightLeg.add(rightPants);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.26), matBoot);
  rightBoot.position.set(0, -0.65, 0.03);
  rightBoot.castShadow = true;
  rightLeg.add(rightBoot);
  root.add(rightLeg);

  // 5. Left Arm (Pivot at shoulder)
  const leftArm = new THREE.Group();
  leftArm.name = 'leftArm';
  leftArm.position.set(-0.35, 1.4, 0);

  const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.16), matSkin);
  leftArmMesh.position.y = -0.26;
  leftArmMesh.castShadow = true;
  leftArm.add(leftArmMesh);
  root.add(leftArm);

  // 6. Right Arm (Pivot at shoulder)
  const rightArm = new THREE.Group();
  rightArm.name = 'rightArm';
  rightArm.position.set(0.35, 1.4, 0);

  const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.16), matSkin);
  rightArmMesh.position.y = -0.26;
  rightArmMesh.castShadow = true;
  rightArm.add(rightArmMesh);

  // Weapon holder on right hand
  const gunGroup = new THREE.Group();
  gunGroup.name = 'weaponMount';
  gunGroup.position.set(0, -0.5, 0.2);
  rightArm.add(gunGroup);

  root.add(rightArm);

  // Contact shadow disc on the ground
  const shadowGeo = new THREE.CircleGeometry(0.45, 16);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.position.y = 0.02;
  root.add(shadow);

  return root;
}

export function createProceduralRifle(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Rifle';

  const matBody = new THREE.MeshStandardMaterial({ color: '#2b2d42', roughness: 0.3, metalness: 0.8 });
  const matNeon = new THREE.MeshStandardMaterial({ color: '#00ffff', roughness: 0.2, emissive: '#00ffff', emissiveIntensity: 0.6 });
  const matStock = new THREE.MeshStandardMaterial({ color: '#f72585', roughness: 0.5 });

  // Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.45), matBody);
  receiver.position.set(0, 0, 0);
  root.add(receiver);

  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), matBody);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, 0.45);
  root.add(barrel);

  // Muzzle break
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), matNeon);
  muzzle.position.set(0, 0.02, 0.72);
  root.add(muzzle);

  // Mag
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.12), matStock);
  mag.position.set(0, -0.12, 0.1);
  mag.rotation.x = 0.2;
  root.add(mag);

  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), matStock);
  stock.position.set(0, -0.02, -0.32);
  root.add(stock);

  // Scope / Sight
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.18), matNeon);
  sight.position.set(0, 0.09, 0.05);
  root.add(sight);

  root.scale.set(1.2, 1.2, 1.2);
  return root;
}

export function createProceduralPlane(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Airplane';

  const matFuselage = new THREE.MeshStandardMaterial({ color: '#f72585', roughness: 0.3, metalness: 0.4 });
  const matCanopy = new THREE.MeshStandardMaterial({ color: '#4cc9f0', roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.7 });
  const matTrim = new THREE.MeshStandardMaterial({ color: '#ffd166', roughness: 0.4 });
  const matProp = new THREE.MeshStandardMaterial({ color: '#1a1a24', roughness: 0.8 });

  // 1. Fuselage
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 6.5), matFuselage);
  fuselage.position.y = 1.2;
  fuselage.castShadow = true;
  root.add(fuselage);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.2, 8), matTrim);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 1.2, 3.8);
  nose.castShadow = true;
  root.add(nose);

  // Cockpit glass canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 2.2), matCanopy);
  canopy.position.set(0, 1.9, 0.8);
  root.add(canopy);

  // 2. Wings (Main wingspan ~9m)
  const wing = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 1.8), matFuselage);
  wing.position.set(0, 1.3, 0.5);
  wing.castShadow = true;
  root.add(wing);

  // Wingtip neon pods
  const leftTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.8), matTrim);
  leftTip.position.set(-4.5, 1.3, 0.5);
  root.add(leftTip);
  const rightTip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.8), matTrim);
  rightTip.position.set(4.5, 1.3, 0.5);
  root.add(rightTip);

  // 3. Tail: Vertical Fin & Horizontal Stabilizer
  const vFin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 1.2), matFuselage);
  vFin.position.set(0, 2.3, -2.8);
  vFin.castShadow = true;
  root.add(vFin);

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.0), matTrim);
  hStab.position.set(0, 1.5, -2.9);
  hStab.castShadow = true;
  root.add(hStab);

  // 4. Propeller (Animated spinning)
  const propGroup = new THREE.Group();
  propGroup.name = 'propeller';
  propGroup.position.set(0, 1.2, 4.45);
  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.0, 0.05), matProp);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.16, 0.05), matProp);
  propGroup.add(blade1);
  propGroup.add(blade2);
  root.add(propGroup);

  // 5. Landing Gear (Trike wheels)
  const frontStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.8), matProp);
  frontStrut.position.set(0, 0.6, 2.5);
  root.add(frontStrut);
  const frontWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), matProp);
  frontWheel.rotation.z = Math.PI / 2;
  frontWheel.position.set(0, 0.3, 2.5);
  frontWheel.castShadow = true;
  root.add(frontWheel);

  const leftWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 12), matProp);
  leftWheel.rotation.z = Math.PI / 2;
  leftWheel.position.set(-1.4, 0.35, -0.2);
  leftWheel.castShadow = true;
  root.add(leftWheel);

  const rightWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.24, 12), matProp);
  rightWheel.rotation.z = Math.PI / 2;
  rightWheel.position.set(1.4, 0.35, -0.2);
  rightWheel.castShadow = true;
  root.add(rightWheel);

  return root;
}

export function createProceduralVehicle(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Buggy';

  const matBody = new THREE.MeshStandardMaterial({ color: '#7209b7', roughness: 0.3, metalness: 0.5 });
  const matRollCage = new THREE.MeshStandardMaterial({ color: '#f72585', roughness: 0.4, metalness: 0.7 });
  const matWheel = new THREE.MeshStandardMaterial({ color: '#1a1a24', roughness: 0.9 });
  const matLight = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffd166', emissiveIntensity: 0.8 });

  // Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 3.4), matBody);
  chassis.position.y = 0.7;
  chassis.castShadow = true;
  root.add(chassis);

  // Roll cage
  const cageTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 1.8), matRollCage);
  cageTop.position.set(0, 1.7, -0.2);
  root.add(cageTop);

  // 4 Roll bars
  const barGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9);
  const flBar = new THREE.Mesh(barGeo, matRollCage);
  flBar.position.set(-0.7, 1.25, 0.6);
  root.add(flBar);
  const frBar = new THREE.Mesh(barGeo, matRollCage);
  frBar.position.set(0.7, 1.25, 0.6);
  root.add(frBar);
  const rlBar = new THREE.Mesh(barGeo, matRollCage);
  rlBar.position.set(-0.7, 1.25, -1.0);
  root.add(rlBar);
  const rrBar = new THREE.Mesh(barGeo, matRollCage);
  rrBar.position.set(0.7, 1.25, -1.0);
  root.add(rrBar);

  // Headlights
  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.1), matLight);
  hlLeft.position.set(-0.6, 0.8, 1.72);
  root.add(hlLeft);
  const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.1), matLight);
  hlRight.position.set(0.6, 0.8, 1.72);
  root.add(hlRight);

  // 4 Big All-terrain wheels
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.4, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const wheels: THREE.Mesh[] = [];
  const wheelOffsets = [
    [-1.05, 0.48, 1.1],
    [1.05, 0.48, 1.1],
    [-1.05, 0.48, -1.1],
    [1.05, 0.48, -1.1],
  ];

  wheelOffsets.forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, matWheel);
    w.position.set(x, y, z);
    w.castShadow = true;
    root.add(w);
    wheels.push(w);
  });

  (root as any).wheels = wheels;
  return root;
}

export function createProceduralPalmTree(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'PalmTree';

  const matTrunk = new THREE.MeshStandardMaterial({ color: '#7f5539', roughness: 0.9 });
  const matFronds = new THREE.MeshStandardMaterial({
    color: '#06d6a0',
    roughness: 0.5,
    side: THREE.DoubleSide,
  });

  // Curved segmented trunk
  let prevPos = new THREE.Vector3(0, 0, 0);
  const trunkSegments = 6;
  const heightStep = 1.3;

  for (let i = 0; i < trunkSegments; i++) {
    const nextPos = new THREE.Vector3(
      Math.sin(i * 0.4) * 0.35,
      (i + 1) * heightStep,
      Math.cos(i * 0.3) * 0.25
    );

    const length = prevPos.distanceTo(nextPos);
    const segGeo = new THREE.CylinderGeometry(
      0.22 - i * 0.02,
      0.3 - i * 0.02,
      length,
      6
    );
    const seg = new THREE.Mesh(segGeo, matTrunk);
    seg.position.copy(prevPos).lerp(nextPos, 0.5);
    seg.lookAt(nextPos);
    seg.rotateX(Math.PI / 2);
    seg.castShadow = true;
    root.add(seg);

    prevPos = nextPos;
  }

  // Palm fronds (8 fan blades radiating from top)
  const topPos = prevPos;
  const numFronds = 8;
  for (let f = 0; f < numFronds; f++) {
    const angle = (f / numFronds) * Math.PI * 2;
    const frondGroup = new THREE.Group();
    frondGroup.position.copy(topPos);
    frondGroup.rotation.y = angle;

    // Curved frond blade
    const bladeGeo = new THREE.BoxGeometry(0.4, 0.04, 2.6);
    bladeGeo.translate(0, -0.4, 1.3);
    const frond = new THREE.Mesh(bladeGeo, matFronds);
    frond.rotation.x = -0.35;
    frond.castShadow = true;
    frondGroup.add(frond);

    root.add(frondGroup);
  }

  return root;
}

export function createProceduralGlooWall(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'GlooWall';

  // Curved ice-crystal barrier
  const matGloo = new THREE.MeshStandardMaterial({
    color: '#48cae4',
    emissive: '#0077b6',
    emissiveIntensity: 0.4,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
  });

  const wallCurve = new THREE.CylinderGeometry(3.5, 3.5, 2.4, 12, 1, true, -Math.PI / 3, (2 * Math.PI) / 3);
  const wallMesh = new THREE.Mesh(wallCurve, matGloo);
  wallMesh.position.set(0, 1.2, 0);
  wallMesh.castShadow = true;
  root.add(wallMesh);

  return root;
}

export function createProceduralAirdrop(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'AirdropCrate';

  const matCrate = new THREE.MeshStandardMaterial({ color: '#d90429', roughness: 0.4, metalness: 0.3 });
  const matBeacon = new THREE.MeshStandardMaterial({ color: '#ffb703', emissive: '#ffb703', emissiveIntensity: 1.0 });

  const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), matCrate);
  crateMesh.position.y = 0.8;
  crateMesh.castShadow = true;
  root.add(crateMesh);

  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.4, 8), matBeacon);
  beacon.position.set(0, 1.8, 0);
  root.add(beacon);

  return root;
}
