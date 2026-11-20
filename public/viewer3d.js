import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

function seededRandom(seed = 1) {
  let value = Math.abs(Math.floor(seed)) || 1;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function canvasTexture(size, draw, { repeat = [1, 1], srgb = false } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  draw(context, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = 4;
  texture.userData.shared = true;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeWoodTexture(seed = 3) {
  return canvasTexture(512, (context, size) => {
    const random = seededRandom(seed);
    context.fillStyle = "#d8d2c9";
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 190; index += 1) {
      const y = random() * size;
      const amplitude = 2 + random() * 9;
      const alpha = 0.06 + random() * 0.14;
      context.strokeStyle = `rgba(92, 66, 47, ${alpha})`;
      context.lineWidth = 0.5 + random() * 1.6;
      context.beginPath();
      for (let x = 0; x <= size; x += 12) {
        const wave = Math.sin((x / size) * Math.PI * (2 + random() * 2) + y) * amplitude;
        if (x === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.stroke();
    }
    for (let index = 0; index < 16; index += 1) {
      const x = random() * size;
      const y = random() * size;
      context.strokeStyle = "rgba(70, 50, 36, 0.1)";
      context.lineWidth = 1;
      context.beginPath();
      context.ellipse(x, y, 3 + random() * 10, 1 + random() * 3, random() * Math.PI, 0, Math.PI * 2);
      context.stroke();
    }
  }, { repeat: [2, 1] });
}

function makeFabricTexture(seed = 8) {
  return canvasTexture(256, (context, size) => {
    const random = seededRandom(seed);
    context.fillStyle = "#c8c3bb";
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < size; index += 3) {
      context.strokeStyle = "rgba(255,255,255,0.09)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, index + 0.5);
      context.lineTo(size, index + 0.5);
      context.stroke();
      context.strokeStyle = "rgba(66,60,54,0.07)";
      context.beginPath();
      context.moveTo(index + 0.5, 0);
      context.lineTo(index + 0.5, size);
      context.stroke();
    }
    for (let index = 0; index < 1200; index += 1) {
      context.fillStyle = random() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(60,54,48,0.05)";
      context.fillRect(random() * size, random() * size, 1, 1);
    }
  }, { repeat: [3, 3] });
}

function makeBrushedMetalTexture(seed = 5) {
  return canvasTexture(256, (context, size) => {
    const random = seededRandom(seed);
    context.fillStyle = "#b9b5ae";
    context.fillRect(0, 0, size, size);
    for (let index = 0; index < 900; index += 1) {
      const y = random() * size;
      context.strokeStyle = random() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(60,58,54,0.1)";
      context.lineWidth = 0.4 + random() * 0.7;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size, y + (random() - 0.5) * 0.8);
      context.stroke();
    }
  }, { repeat: [2, 2] });
}

function makeGrilleTexture() {
  return canvasTexture(256, (context, size) => {
    context.fillStyle = "#35322e";
    context.fillRect(0, 0, size, size);
    const step = 8;
    for (let y = step / 2; y < size; y += step) {
      for (let x = step / 2; x < size; x += step) {
        context.fillStyle = "#171614";
        context.beginPath();
        context.arc(x, y, 2.1, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "rgba(255,255,255,0.12)";
        context.beginPath();
        context.arc(x - 0.7, y - 0.7, 0.7, 0, Math.PI * 2);
        context.fill();
      }
    }
  }, { repeat: [3, 4], srgb: true });
}

const TEXTURES = {
  wood: makeWoodTexture(),
  fabric: makeFabricTexture(),
  metal: makeBrushedMetalTexture(),
  grille: makeGrilleTexture(),
};

const COLORS = {
  linen: 0xd8d1c7,
  linenLight: 0xe7e1d8,
  sage: 0xa3a8a0,
  clay: 0xc4a69b,
  clayDeep: 0xb39a90,
  wood: 0x9a8775,
  woodLight: 0xb3a08f,
  woodDark: 0x7e6f61,
  charcoal: 0x57524d,
  metal: 0x96918a,
  brass: 0xb08a52,
  cream: 0xece7df,
  white: 0xf7f4ef,
  shadow: 0x4f4a44,
};

function material(color, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.75,
    ...options,
  });
}

const materials = {
  wood: material(COLORS.wood, {
    roughness: 0.64,
    bumpMap: TEXTURES.wood,
    bumpScale: 0.0016,
    roughnessMap: TEXTURES.wood,
    clearcoat: 0.06,
    clearcoatRoughness: 0.72,
    envMapIntensity: 0.18,
  }),
  woodLight: material(COLORS.woodLight, {
    roughness: 0.68,
    bumpMap: TEXTURES.wood,
    bumpScale: 0.0014,
    roughnessMap: TEXTURES.wood,
    envMapIntensity: 0.18,
  }),
  woodDark: material(COLORS.woodDark, {
    roughness: 0.6,
    bumpMap: TEXTURES.wood,
    bumpScale: 0.0018,
    roughnessMap: TEXTURES.wood,
    envMapIntensity: 0.16,
  }),
  linen: material(COLORS.linen, {
    roughness: 0.95,
    bumpMap: TEXTURES.fabric,
    bumpScale: 0.0012,
    roughnessMap: TEXTURES.fabric,
    sheen: 0.55,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0xfff8ee),
    envMapIntensity: 0.12,
  }),
  linenLight: material(COLORS.linenLight, {
    roughness: 0.97,
    bumpMap: TEXTURES.fabric,
    bumpScale: 0.001,
    roughnessMap: TEXTURES.fabric,
    sheen: 0.42,
    sheenRoughness: 0.85,
    sheenColor: new THREE.Color(0xfffaf3),
    envMapIntensity: 0.12,
  }),
  sage: material(COLORS.sage, {
    roughness: 0.86,
    bumpMap: TEXTURES.fabric,
    bumpScale: 0.0008,
    envMapIntensity: 0.16,
  }),
  clay: material(COLORS.clay, {
    roughness: 0.84,
    bumpMap: TEXTURES.fabric,
    bumpScale: 0.0007,
    envMapIntensity: 0.16,
  }),
  charcoal: material(COLORS.charcoal, {
    roughness: 0.54,
    clearcoat: 0.16,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.32,
  }),
  metal: material(COLORS.metal, {
    roughness: 0.32,
    metalness: 0.82,
    bumpMap: TEXTURES.metal,
    bumpScale: 0.0005,
    roughnessMap: TEXTURES.metal,
    envMapIntensity: 1.15,
  }),
  brass: material(COLORS.brass, {
    roughness: 0.28,
    metalness: 0.9,
    bumpMap: TEXTURES.metal,
    bumpScale: 0.0004,
    envMapIntensity: 1.25,
  }),
  cream: material(COLORS.cream, {
    roughness: 0.88,
    clearcoat: 0.12,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.18,
  }),
  white: material(COLORS.white, {
    roughness: 0.84,
    clearcoat: 0.08,
    clearcoatRoughness: 0.6,
    envMapIntensity: 0.18,
  }),
  line: material(0x6f6861, { roughness: 0.7, envMapIntensity: 0.1 }),
  rubber: material(0x4b4742, { roughness: 0.92, metalness: 0, envMapIntensity: 0.08 }),
  glass: material(0x384240, {
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.78,
    clearcoat: 0.8,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.4,
  }),
  lens: material(0x171d1c, {
    roughness: 0.06,
    metalness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.5,
  }),
  grille: material(0x393530, {
    roughness: 0.88,
    map: TEXTURES.grille,
    bumpMap: TEXTURES.grille,
    bumpScale: 0.001,
    envMapIntensity: 0.08,
  }),
};

for (const [name, value] of Object.entries(materials)) {
  value.name = name;
}

function makeStudioEnvironment() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#fffdf8");
  gradient.addColorStop(0.33, "#eee7dc");
  gradient.addColorStop(0.62, "#cfc7bc");
  gradient.addColorStop(0.82, "#928b82");
  gradient.addColorStop(1, "#514c47");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1024, 512);

  const softbox = (x, y, rx, ry, alpha) => {
    const glow = context.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
    glow.addColorStop(0, `rgba(255, 251, 240, ${alpha})`);
    glow.addColorStop(0.55, `rgba(255, 248, 233, ${alpha * 0.42})`);
    glow.addColorStop(1, "rgba(255, 248, 233, 0)");
    context.save();
    context.translate(x, y);
    context.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
    context.fill();
    context.restore();
  };
  softbox(255, 150, 220, 130, 0.9);
  softbox(735, 130, 190, 110, 0.72);
  softbox(520, 315, 280, 80, 0.28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.userData.shared = true;
  return texture;
}

function makeContactShadowTexture() {
  return canvasTexture(256, (context, size) => {
    const center = size / 2;
    const gradient = context.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, "rgba(60, 53, 46, 0.48)");
    gradient.addColorStop(0.32, "rgba(60, 53, 46, 0.28)");
    gradient.addColorStop(0.7, "rgba(60, 53, 46, 0.08)");
    gradient.addColorStop(1, "rgba(60, 53, 46, 0)");
    context.clearRect(0, 0, size, size);
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

const STUDIO_ENVIRONMENT = makeStudioEnvironment();
const CONTACT_SHADOW_TEXTURE = makeContactShadowTexture();
const CONTACT_SHADOW_MATERIAL = new THREE.MeshBasicMaterial({
  map: CONTACT_SHADOW_TEXTURE,
  transparent: true,
  opacity: 0.52,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
});
CONTACT_SHADOW_MATERIAL.userData.shared = true;
CONTACT_SHADOW_MATERIAL.name = "contactShadow";

const FINISH_PALETTES = {
  oak: {
    wood: 0xb08f70,
    woodLight: 0xc3a98f,
    woodDark: 0x8b6f55,
    linen: 0xe3d9cc,
    linenLight: 0xede6da,
    clay: 0xc9a58f,
    sage: 0xaea99f,
    metal: 0xa39c93,
    charcoal: 0x5e5750,
    cream: 0xefe9df,
    white: 0xf8f4ee,
  },
  sage: {
    wood: 0x8e968c,
    woodLight: 0xa8afa5,
    woodDark: 0x757c73,
    linen: 0xd9ddd4,
    linenLight: 0xe6e9e2,
    clay: 0xb9bdb4,
    sage: 0xa3a8a0,
    metal: 0x8a8f87,
    charcoal: 0x535852,
    cream: 0xe9ebe5,
    white: 0xf5f6f1,
  },
  clay: {
    wood: 0xa98272,
    woodLight: 0xc2a091,
    woodDark: 0x866354,
    linen: 0xe6d8d0,
    linenLight: 0xf0e6df,
    clay: 0xc4a69b,
    sage: 0xb7afa8,
    metal: 0x9c8e85,
    charcoal: 0x5a504b,
    cream: 0xeee6df,
    white: 0xf8f1eb,
  },
  graphite: {
    wood: 0x6e6761,
    woodLight: 0x8b837c,
    woodDark: 0x544e49,
    linen: 0xcec8c0,
    linenLight: 0xded9d2,
    clay: 0xa69a92,
    sage: 0x8f948c,
    metal: 0xa5a19c,
    charcoal: 0x3f3b37,
    cream: 0xe5e0d9,
    white: 0xf2eee8,
  },
};

function applyFinish(root, finish) {
  const palette = FINISH_PALETTES[finish];
  if (!palette) return;
  root.traverse((node) => {
    if (!node.isMesh) return;
    const apply = (source) => {
      if (!source || !source.name || palette[source.name] === undefined) return source;
      const clone = source.clone();
      clone.color.set(palette[source.name]);
      clone.userData.owned = true;
      return clone;
    };
    if (Array.isArray(node.material)) node.material = node.material.map(apply);
    else node.material = apply(node.material);
  });
}

function roundedBoxGeometry(width, height, depth, radius = 0.035) {
  const r = Math.min(radius, width / 2 - 0.001, depth / 2 - 0.001);
  const x = -width / 2;
  const y = -depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + depth - r);
  shape.quadraticCurveTo(x + width, y + depth, x + width - r, y + depth);
  shape.lineTo(x + r, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const bevel = Math.min(0.02, height * 0.16, r * 0.46);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, height - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 12,
    steps: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function mesh(geometry, mat, x = 0, y = 0, z = 0) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.set(x, y, z);
  item.castShadow = true;
  item.receiveShadow = true;
  return item;
}

function box(width, height, depth, mat, x = 0, y = 0, z = 0, radius = 0.035) {
  return mesh(roundedBoxGeometry(width, height, depth, radius), mat, x, y, z);
}

function cylinder(radiusTop, radiusBottom, height, mat, x = 0, y = 0, z = 0, segments = 48) {
  return mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    mat,
    x,
    y + height / 2,
    z,
  );
}

function cylinderBetween(a, b, radius, mat, segments = 24) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const length = direction.length();
  const item = mesh(new THREE.CylinderGeometry(radius, radius, length, segments), mat);
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return item;
}

function torus(radius, tube, mat, x = 0, y = 0, z = 0, rotationX = 0) {
  const item = mesh(new THREE.TorusGeometry(radius, tube, 20, 72), mat, x, y, z);
  item.rotation.x = rotationX;
  return item;
}

function addLegs(group, count, seatY, spread, materialRef, radius = 0.026) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + 0.4;
    const top = [Math.cos(angle) * spread * 0.5, seatY, Math.sin(angle) * spread * 0.5];
    const foot = [Math.cos(angle) * spread, 0.02, Math.sin(angle) * spread];
    group.add(cylinderBetween(top, foot, radius, materialRef));
    group.add(cylinder(radius * 0.9, radius * 1.08, 0.018, materials.rubber, foot[0], 0, foot[2], 16));
  }
}

function addFoot(group, x, z, radius = 0.04, height = 0.016, mat = materials.rubber) {
  group.add(cylinder(radius, radius * 1.04, height, mat, x, 0.001, z, 20));
}

function addScrew(group, x, y, z, radius = 0.009, axis = "z") {
  const head = mesh(
    new THREE.CylinderGeometry(radius, radius * 0.92, 0.008, 14),
    materials.metal,
    x,
    y,
    z,
  );
  if (axis === "z") head.rotation.x = Math.PI / 2;
  if (axis === "x") head.rotation.z = Math.PI / 2;
  head.castShadow = false;
  group.add(head);

  const slot = mesh(new THREE.BoxGeometry(radius * 1.25, 0.0018, 0.0018), materials.line, x, y, z);
  if (axis === "z") slot.position.z += 0.0046;
  if (axis === "x") {
    slot.rotation.y = Math.PI / 2;
    slot.position.x += 0.0046;
  }
  slot.castShadow = false;
  group.add(slot);
}

function addPanelGap(group, width, height, x, y, z, rotationY = 0, mat = materials.line) {
  const gap = mesh(new THREE.BoxGeometry(width, height, 0.005), mat, x, y, z);
  gap.rotation.y = rotationY;
  gap.castShadow = false;
  group.add(gap);
}

function addVentSlots(group, {
  x = 0,
  y = 0,
  z = 0,
  width = 0.28,
  height = 0.016,
  count = 6,
  gap = 0.026,
  rotationY = 0,
  mat = materials.charcoal,
} = {}) {
  for (let index = 0; index < count; index += 1) {
    const slot = mesh(
      new THREE.BoxGeometry(width, height, 0.006),
      mat,
      x,
      y + (index - (count - 1) / 2) * gap,
      z,
    );
    slot.rotation.y = rotationY;
    slot.castShadow = false;
    group.add(slot);
  }
}

function addGrille(group, {
  x = 0,
  y = 0,
  z = 0,
  radius = 0.2,
  rings = 4,
  perRing = 14,
  holeRadius = 0.007,
  mat = materials.charcoal,
  rotationY = 0,
} = {}) {
  const geometry = new THREE.CylinderGeometry(holeRadius, holeRadius, 0.004, 8);
  geometry.rotateX(Math.PI / 2);
  const count = rings * perRing;
  const holes = new THREE.InstancedMesh(geometry, mat, count);
  holes.userData.detail = true;
  holes.castShadow = false;
  holes.receiveShadow = false;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  let index = 0;
  for (let ring = 1; ring <= rings; ring += 1) {
    const ringRadius = radius * (ring / (rings + 0.25));
    for (let step = 0; step < perRing; step += 1) {
      const angle = (step / perRing) * Math.PI * 2 + ring * 0.35;
      position.set(x + Math.cos(angle) * ringRadius, y + Math.sin(angle) * ringRadius, z);
      quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
      matrix.compose(position, quaternion, scale);
      holes.setMatrixAt(index++, matrix);
    }
  }
  group.add(holes);
}

function addBadge(group, x, y, z, width = 0.13, height = 0.035, rotationY = 0) {
  const plate = mesh(new THREE.BoxGeometry(width, height, 0.008), materials.brass, x, y, z);
  plate.rotation.y = rotationY;
  plate.castShadow = false;
  group.add(plate);
  const inset = mesh(
    new THREE.BoxGeometry(width * 0.78, height * 0.42, 0.002),
    materials.charcoal,
    x,
    y,
    z + 0.0055,
  );
  inset.rotation.y = rotationY;
  inset.castShadow = false;
  group.add(inset);
}

function addStitchLine(group, points, radius = 0.006, mat = materials.linenLight) {
  const geometry = new THREE.SphereGeometry(radius, 8, 6);
  const stitches = new THREE.InstancedMesh(geometry, mat, points.length);
  stitches.userData.detail = true;
  stitches.castShadow = false;
  const matrix = new THREE.Matrix4();
  points.forEach((point, index) => {
    matrix.makeTranslation(point[0], point[1], point[2]);
    stitches.setMatrixAt(index, matrix);
  });
  group.add(stitches);
}

function addContactShadow(model) {
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) return;
  const size = bounds.getSize(new THREE.Vector3());
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.max(0.5, size.x * 1.55), Math.max(0.5, size.z * 1.55)),
    CONTACT_SHADOW_MATERIAL,
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  shadow.renderOrder = -1;
  shadow.castShadow = false;
  shadow.receiveShadow = false;
  shadow.userData.contactShadow = true;
  model.add(shadow);
}

function buildLoungeChair() {
  const group = new THREE.Group();
  group.add(box(1.24, 0.16, 1.02, materials.wood, 0, 0.43, 0, 0.08));
  group.add(box(1.09, 0.11, 0.87, materials.linen, 0, 0.58, 0.015, 0.06));

  const back = box(1.22, 0.82, 0.16, materials.wood, 0, 0.64, -0.43, 0.075);
  back.rotation.x = -0.1;
  group.add(back);
  const backCushion = box(1.06, 0.63, 0.09, materials.linen, 0, 0.75, -0.33, 0.05);
  backCushion.rotation.x = -0.1;
  group.add(backCushion);

  for (const side of [-1, 1]) {
    group.add(box(0.12, 0.1, 0.92, materials.wood, side * 0.62, 0.69, -0.01, 0.04));
    group.add(box(0.09, 0.34, 0.09, materials.wood, side * 0.62, 0.4, 0.38, 0.025));
    group.add(box(0.09, 0.22, 0.09, materials.wood, side * 0.62, 0.51, -0.36, 0.025));
    group.add(cylinderBetween(
      [side * 0.5, 0.49, -0.34],
      [side * 0.5, 0.82, -0.42],
      0.035,
      materials.woodDark,
    ));
  }

  addLegs(group, 4, 0.43, 0.52, materials.woodDark, 0.03);
  for (const x of [-0.28, 0, 0.28]) {
    const button = cylinder(0.024, 0.024, 0.011, materials.woodDark, x, 0.685, 0.015);
    group.add(button);
  }
  group.add(box(1.0, 0.016, 0.018, materials.linenLight, 0, 0.645, 0.445, 0.007));
  group.add(box(0.018, 0.016, 0.78, materials.linenLight, 0.535, 0.645, 0.015, 0.007));
  group.add(box(0.018, 0.016, 0.78, materials.linenLight, -0.535, 0.645, 0.015, 0.007));
  for (const x of [-0.32, 0, 0.32]) {
    addPanelGap(group, 0.006, 0.52, x, 0.75, -0.278, 0, materials.linenLight);
  }
  return group;
}

function buildDiningChair() {
  const group = new THREE.Group();
  group.add(box(0.92, 0.085, 0.87, materials.wood, 0, 0.43, 0, 0.045));
  group.add(box(0.82, 0.06, 0.76, materials.linenLight, 0, 0.515, 0.01, 0.045));

  for (const side of [-1, 1]) {
    group.add(box(0.07, 0.78, 0.07, materials.wood, side * 0.37, 0.51, -0.36, 0.025));
  }
  group.add(box(0.79, 0.37, 0.055, materials.linenLight, 0, 0.73, -0.36, 0.03));
  group.add(box(0.78, 0.055, 0.055, materials.wood, 0, 1.04, -0.36, 0.02));

  addLegs(group, 4, 0.43, 0.39, materials.woodDark, 0.024);
  group.add(box(0.76, 0.014, 0.016, materials.linenLight, 0, 0.55, 0.39, 0.006));
  for (const x of [-0.26, 0, 0.26]) {
    addPanelGap(group, 0.006, 0.3, x, 0.73, -0.328, 0, materials.linenLight);
  }
  return group;
}

function buildStool() {
  const group = new THREE.Group();
  group.add(cylinder(0.49, 0.47, 0.12, materials.linen, 0, 0.54, 0, 60));
  group.add(cylinder(0.5, 0.5, 0.035, materials.wood, 0, 0.51, 0, 60));
  addLegs(group, 3, 0.52, 0.35, materials.woodDark, 0.031);
  group.add(torus(0.3, 0.012, materials.wood, 0, 0.22, 0, -Math.PI / 2));
  group.add(torus(0.44, 0.007, materials.linenLight, 0, 0.665, 0, Math.PI / 2));
  const stitches = [];
  for (let index = 0; index < 22; index += 1) {
    const angle = (index / 22) * Math.PI * 2;
    stitches.push([Math.cos(angle) * 0.415, 0.666, Math.sin(angle) * 0.415]);
  }
  addStitchLine(group, stitches, 0.005, materials.linenLight);
  return group;
}

function makeLampShade(radiusTop, radiusBottom, height, y) {
  const shadeMaterial = materials.clay.clone();
  shadeMaterial.side = THREE.DoubleSide;
  shadeMaterial.roughness = 0.9;
  shadeMaterial.color.set(0xe8d8c8);
  shadeMaterial.emissive = new THREE.Color(0x6f5139);
  shadeMaterial.emissiveIntensity = 0.1;
  shadeMaterial.transparent = true;
  shadeMaterial.opacity = 0.97;
  shadeMaterial.userData.owned = true;
  const shade = mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 56, 1, true),
    shadeMaterial,
    0,
    y + height / 2,
    0,
  );
  shade.castShadow = true;
  const bulbColor = 0xf1e5d4;
  const bulbMaterial = new THREE.MeshBasicMaterial({ color: bulbColor });
  bulbMaterial.userData.owned = true;
  const bulb = mesh(
    new THREE.SphereGeometry(0.055, 20, 16),
    bulbMaterial,
    0,
    y + height * 0.44,
    0,
  );
  const light = new THREE.PointLight(0xf2e3ce, 1.5, 2.4, 2);
  light.position.set(0, y + height * 0.38, 0.05);
  const group = new THREE.Group();
  group.add(shade);
  group.add(bulb);
  group.add(light);
  group.add(torus(radiusTop, 0.005, materials.brass, 0, y + height, 0, -Math.PI / 2));
  group.add(torus(radiusBottom, 0.006, materials.brass, 0, y, 0, -Math.PI / 2));
  return group;
}

function buildTableLamp() {
  const group = new THREE.Group();
  group.add(cylinder(0.29, 0.31, 0.055, materials.wood, 0, 0.01, 0, 56));
  group.add(cylinder(0.25, 0.25, 0.018, materials.rubber, 0, 0.0, 0, 40));
  group.add(cylinder(0.035, 0.045, 0.48, materials.metal, 0, 0.06, 0, 24));
  group.add(torus(0.28, 0.012, materials.woodDark, 0, 0.055, 0, -Math.PI / 2));
  group.add(makeLampShade(0.18, 0.38, 0.43, 0.6));
  group.add(buildTube([
    [0.17, 0.055, 0.02],
    [0.31, 0.02, 0.12],
    [0.42, 0.016, 0.08],
  ], 0.006, materials.charcoal));
  group.add(box(0.06, 0.018, 0.045, materials.charcoal, 0.42, 0.016, 0.08, 0.008));
  return group;
}

function buildFloorLamp() {
  const group = new THREE.Group();
  group.add(cylinder(0.39, 0.41, 0.05, materials.woodDark, 0, 0.01, 0, 60));
  group.add(cylinder(0.33, 0.33, 0.016, materials.rubber, 0, 0.0, 0, 48));
  group.add(cylinder(0.021, 0.026, 1.86, materials.metal, 0, 0.06, 0, 24));
  group.add(makeLampShade(0.33, 0.37, 0.4, 1.86));
  group.add(torus(0.37, 0.01, materials.metal, 0, 1.87, 0, -Math.PI / 2));
  group.add(torus(0.33, 0.009, materials.metal, 0, 2.26, 0, -Math.PI / 2));
  group.add(buildTube([
    [0.33, 0.05, 0.04],
    [0.48, 0.015, 0.16],
    [0.58, 0.012, 0.05],
  ], 0.006, materials.charcoal));
  group.add(box(0.06, 0.018, 0.045, materials.charcoal, 0.58, 0.012, 0.05, 0.008));
  return group;
}

function buildSpeaker() {
  const group = new THREE.Group();
  group.add(box(0.98, 1.28, 0.56, materials.woodDark, 0, 0.045, 0, 0.055));
  group.add(box(0.84, 1.12, 0.022, materials.grille, 0, 0.12, 0.292, 0.035));
  addPanelGap(group, 0.006, 1.08, -0.475, 0.685, 0.283);
  addPanelGap(group, 0.006, 1.08, 0.475, 0.685, 0.283);

  const woofer = mesh(
    new THREE.CylinderGeometry(0.245, 0.245, 0.045, 64),
    materials.wood,
    0,
    0.72,
    0.32,
  );
  woofer.rotation.x = Math.PI / 2;
  group.add(woofer);
  group.add(torus(0.245, 0.012, materials.metal, 0, 0.72, 0.344, 0));
  const surround = torus(0.205, 0.018, materials.rubber, 0, 0.72, 0.361, 0);
  surround.castShadow = false;
  group.add(surround);
  const wooferCone = mesh(
    new THREE.CylinderGeometry(0.19, 0.15, 0.05, 64),
    materials.charcoal,
    0,
    0.72,
    0.343,
  );
  wooferCone.rotation.x = Math.PI / 2;
  group.add(wooferCone);
  const dustCap = mesh(
    new THREE.SphereGeometry(0.065, 32, 18),
    materials.charcoal,
    0,
    0.72,
    0.372,
  );
  dustCap.scale.z = 0.45;
  group.add(dustCap);

  const tweeter = mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.04, 48),
    materials.metal,
    0,
    1.13,
    0.32,
  );
  tweeter.rotation.x = Math.PI / 2;
  group.add(tweeter);
  const tweeterCone = mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.035, 40),
    materials.charcoal,
    0,
    1.13,
    0.344,
  );
  tweeterCone.rotation.x = Math.PI / 2;
  group.add(tweeterCone);
  group.add(torus(0.108, 0.008, materials.metal, 0, 1.13, 0.365, 0));

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    addScrew(group, Math.cos(angle) * 0.272, 0.72 + Math.sin(angle) * 0.272, 0.352, 0.009);
  }

  addGrille(group, { y: 0.72, z: 0.302, radius: 0.35, rings: 4, perRing: 18, holeRadius: 0.0065 });
  for (let index = 0; index < 14; index += 1) {
    const slat = mesh(
      new THREE.BoxGeometry(0.78, 0.0022, 0.004),
      materials.line,
      0,
      0.16 + index * 0.074,
      0.305,
    );
    slat.castShadow = false;
    group.add(slat);
  }
  addBadge(group, 0, 0.16, 0.307, 0.15, 0.042);
  addVentSlots(group, { y: 1.28, z: 0.03, width: 0.34, count: 4, gap: 0.024, mat: materials.line });

  for (const x of [-0.35, 0.35]) {
    for (const z of [-0.2, 0.2]) {
      addFoot(group, x, z, 0.045, 0.022);
    }
  }
  group.add(cylinder(0.031, 0.031, 0.035, materials.metal, 0.31, 1.295, 0.05, 24));
  return group;
}

function buildTurntable() {
  const group = new THREE.Group();
  group.add(box(1.08, 0.15, 0.82, materials.wood, 0, 0.02, 0, 0.045));
  group.add(box(0.99, 0.028, 0.73, materials.woodDark, 0, 0.17, 0, 0.03));
  group.add(cylinder(0.345, 0.345, 0.045, materials.metal, -0.08, 0.2, 0, 72));
  group.add(cylinder(0.31, 0.31, 0.012, materials.charcoal, -0.08, 0.247, 0, 72));
  group.add(cylinder(0.105, 0.105, 0.014, materials.clay, -0.08, 0.26, 0, 56));
  group.add(cylinder(0.009, 0.009, 0.028, materials.metal, -0.08, 0.274, 0, 16));
  for (const radius of [0.17, 0.22, 0.27, 0.305]) {
    const groove = torus(radius, 0.0014, materials.line, -0.08, 0.267, 0, Math.PI / 2);
    groove.castShadow = false;
    group.add(groove);
  }

  const pivot = cylinder(0.05, 0.058, 0.13, materials.metal, 0.39, 0.2, -0.24, 28);
  group.add(pivot);
  group.add(cylinder(0.055, 0.055, 0.06, materials.charcoal, 0.39, 0.3, -0.24, 28));
  group.add(cylinderBetween([0.39, 0.36, -0.24], [0.1, 0.3, 0.08], 0.012, materials.metal, 18));
  group.add(cylinderBetween([0.39, 0.35, -0.24], [0.47, 0.35, -0.35], 0.011, materials.metal, 14));
  group.add(box(0.07, 0.035, 0.09, materials.charcoal, 0.075, 0.275, 0.12, 0.01));
  group.add(box(0.035, 0.012, 0.045, materials.brass, 0.075, 0.297, 0.14, 0.006));

  group.add(cylinder(0.025, 0.025, 0.018, materials.metal, 0.4, 0.2, 0.3, 20));
  group.add(box(0.1, 0.012, 0.05, materials.charcoal, 0.4, 0.205, 0.16, 0.01));
  for (const x of [-0.24, 0, 0.24]) {
    group.add(cylinder(0.018, 0.018, 0.01, materials.metal, x, 0.19, 0.31, 16));
  }
  for (const x of [-0.36, 0.36]) {
    for (const z of [-0.25, 0.25]) {
      addFoot(group, x, z, 0.042, 0.018);
    }
  }
  return group;
}

function buildCamera() {
  const group = new THREE.Group();
  group.add(box(0.97, 0.62, 0.35, materials.charcoal, 0, 0.1, 0, 0.05));
  group.add(box(0.86, 0.075, 0.32, materials.metal, 0, 0.72, -0.005, 0.025));
  group.add(box(0.17, 0.52, 0.36, materials.woodDark, -0.4, 0.12, 0, 0.035));
  for (let index = 0; index < 7; index += 1) {
    addPanelGap(group, 0.28, 0.004, -0.02, 0.18 + index * 0.055, 0.181, 0, materials.rubber);
  }

  const lensBarrel = mesh(
    new THREE.CylinderGeometry(0.245, 0.275, 0.25, 64),
    materials.charcoal,
    0.09,
    0.43,
    0.28,
  );
  lensBarrel.rotation.x = Math.PI / 2;
  group.add(lensBarrel);
  group.add(torus(0.258, 0.012, materials.metal, 0.09, 0.43, 0.395, 0));
  group.add(torus(0.25, 0.018, materials.charcoal, 0.09, 0.43, 0.405, 0));
  const aperture = torus(0.228, 0.008, materials.metal, 0.09, 0.43, 0.414, 0);
  aperture.castShadow = false;
  group.add(aperture);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    group.add(cylinderBetween(
      [0.09 + Math.cos(angle) * 0.263, 0.43 + Math.sin(angle) * 0.263, 0.384],
      [0.09 + Math.cos(angle) * 0.263, 0.43 + Math.sin(angle) * 0.263, 0.396],
      0.0035,
      materials.line,
      8,
    ));
  }
  const glass = mesh(new THREE.CircleGeometry(0.215, 56), materials.lens, 0.09, 0.43, 0.418);
  group.add(glass);

  group.add(box(0.28, 0.14, 0.2, materials.charcoal, 0.18, 0.78, -0.025, 0.025));
  group.add(cylinder(0.045, 0.045, 0.035, materials.metal, -0.29, 0.795, 0.055, 28));
  group.add(cylinder(0.025, 0.025, 0.03, materials.clay, -0.29, 0.83, 0.055, 24));
  group.add(cylinder(0.024, 0.024, 0.05, materials.metal, -0.48, 0.36, 0.13, 18));
  group.add(cylinder(0.024, 0.024, 0.05, materials.metal, 0.48, 0.36, 0.13, 18));
  addScrew(group, 0.36, 0.32, 0.18, 0.012);
  addScrew(group, 0.36, 0.24, 0.18, 0.012);
  return group;
}

function buildProjector() {
  const group = new THREE.Group();
  group.add(box(0.84, 0.46, 0.53, materials.woodLight, 0, 0.07, 0, 0.085));
  group.add(box(0.77, 0.055, 0.48, materials.cream, 0, 0.52, 0, 0.04));
  const lens = mesh(
    new THREE.CylinderGeometry(0.115, 0.135, 0.14, 56),
    materials.metal,
    0.16,
    0.31,
    0.27,
  );
  lens.rotation.x = Math.PI / 2;
  group.add(lens);
  group.add(cylinder(0.095, 0.095, 0.02, materials.charcoal, 0.16, 0.295, 0.345, 48));
  group.add(torus(0.12, 0.012, materials.metal, 0.16, 0.31, 0.35, 0));
  group.add(torus(0.1, 0.006, materials.metal, 0.16, 0.31, 0.36, 0));
  group.add(mesh(new THREE.CircleGeometry(0.088, 48), materials.lens, 0.16, 0.31, 0.365));
  addVentSlots(group, { x: -0.27, y: 0.3, z: 0.285, width: 0.17, count: 5, gap: 0.028, mat: materials.line });
  addVentSlots(group, { x: 0.27, y: 0.3, z: 0.285, width: 0.17, count: 5, gap: 0.028, mat: materials.line });
  addPanelGap(group, 0.76, 0.004, 0, 0.53, 0.245, 0, materials.line);
  group.add(cylinder(0.055, 0.055, 0.027, materials.charcoal, -0.2, 0.575, -0.02, 32));
  group.add(cylinder(0.02, 0.02, 0.045, materials.metal, 0.23, 0.575, -0.02, 18));
  for (const x of [-0.29, 0.29]) {
    for (const z of [-0.16, 0.16]) {
      addFoot(group, x, z, 0.035, 0.022);
    }
  }
  addBadge(group, 0, 0.545, -0.02, 0.16, 0.038);
  return group;
}

function buildCoffeeTable() {
  const group = new THREE.Group();
  group.add(box(1.56, 0.115, 0.86, materials.wood, 0, 0.51, 0, 0.055));
  group.add(box(1.34, 0.05, 0.66, materials.woodDark, 0, 0.16, 0, 0.03));
  group.add(box(1.42, 0.045, 0.74, materials.woodDark, 0, 0.43, 0, 0.03));
  addPanelGap(group, 1.5, 0.004, 0, 0.57, 0.43, 0, materials.line);
  for (const x of [-0.67, 0.67]) {
    for (const z of [-0.32, 0.32]) {
      group.add(cylinder(0.033, 0.028, 0.51, materials.woodDark, x, 0, z, 24));
      addFoot(group, x, z, 0.036, 0.014);
    }
  }
  group.add(box(0.42, 0.09, 0.27, materials.clay, -0.28, 0.625, 0, 0.02));
  group.add(box(0.3, 0.045, 0.4, materials.linen, 0.28, 0.625, 0.03, 0.02));
  group.add(box(0.12, 0.004, 0.12, materials.brass, 0.28, 0.65, 0.03, 0.006));
  return group;
}

function buildSideTable() {
  const group = new THREE.Group();
  group.add(cylinder(0.46, 0.46, 0.075, materials.wood, 0, 0.51, 0, 60));
  group.add(cylinder(0.43, 0.43, 0.025, materials.woodDark, 0, 0.485, 0, 60));
  addLegs(group, 3, 0.5, 0.34, materials.woodDark, 0.027);
  group.add(cylinder(0.12, 0.13, 0.07, materials.clay, 0, 0.585, 0, 36));
  group.add(torus(0.455, 0.004, materials.woodDark, 0, 0.548, 0, Math.PI / 2));
  return group;
}

function buildLoveseat() {
  const group = new THREE.Group();
  group.add(box(1.82, 0.18, 0.92, materials.wood, 0, 0.36, 0, 0.07));
  group.add(box(1.68, 0.14, 0.8, materials.linen, 0, 0.54, 0.02, 0.06));

  const back = box(1.78, 0.7, 0.17, materials.wood, 0, 0.57, -0.39, 0.07);
  back.rotation.x = -0.08;
  group.add(back);
  const backCushion = box(1.58, 0.53, 0.1, materials.linen, 0, 0.7, -0.3, 0.055);
  backCushion.rotation.x = -0.08;
  group.add(backCushion);

  for (const x of [-0.4, 0.4]) {
    group.add(box(0.7, 0.09, 0.68, materials.linenLight, x, 0.69, 0.02, 0.045));
    group.add(box(0.66, 0.014, 0.018, materials.linen, x, 0.74, 0.36, 0.006));
  }
  for (const x of [-0.22, 0.22]) {
    addPanelGap(group, 0.006, 0.4, x, 0.7, -0.246, 0, materials.linenLight);
  }

  for (const side of [-1, 1]) {
    group.add(box(0.14, 0.12, 0.83, materials.wood, side * 0.92, 0.64, 0, 0.045));
    group.add(box(0.11, 0.27, 0.11, materials.wood, side * 0.92, 0.37, 0.35, 0.025));
    group.add(box(0.12, 0.022, 0.38, materials.linenLight, side * 0.92, 0.71, 0.02, 0.008));
  }

  addLegs(group, 4, 0.36, 0.7, materials.woodDark, 0.03);
  return group;
}

function buildOfficeChair() {
  const group = new THREE.Group();
  group.add(box(1.02, 0.13, 0.92, materials.linen, 0, 0.58, 0, 0.07));
  group.add(box(1.06, 0.055, 0.94, materials.woodDark, 0, 0.52, 0, 0.04));

  const back = box(0.88, 0.8, 0.13, materials.linenLight, 0, 0.76, -0.42, 0.11);
  back.rotation.x = -0.12;
  group.add(back);
  const backFrame = box(0.94, 0.84, 0.025, materials.charcoal, 0, 0.76, -0.49, 0.04);
  backFrame.rotation.x = -0.12;
  group.add(backFrame);
  for (const x of [-0.27, 0, 0.27]) {
    addPanelGap(group, 0.006, 0.64, x, 0.76, -0.352, 0, materials.linen);
  }
  group.add(box(0.52, 0.08, 0.06, materials.linen, 0, 0.64, -0.3, 0.025));
  const spine = box(0.075, 0.78, 0.075, materials.woodDark, 0, 0.63, -0.48, 0.02);
  group.add(spine);
  const headrest = box(0.52, 0.22, 0.13, materials.linen, 0, 1.62, -0.47, 0.07);
  headrest.rotation.x = -0.12;
  group.add(headrest);
  group.add(box(0.07, 0.36, 0.065, materials.woodDark, 0, 1.31, -0.49, 0.02));
  addBadge(group, 0, 0.95, -0.508, 0.11, 0.026);

  for (const side of [-1, 1]) {
    group.add(box(0.13, 0.06, 0.62, materials.charcoal, side * 0.59, 0.75, 0.02, 0.04));
    group.add(box(0.14, 0.028, 0.5, materials.linenLight, side * 0.59, 0.786, 0.02, 0.012));
    group.add(cylinderBetween(
      [side * 0.59, 0.55, 0.18],
      [side * 0.59, 0.72, 0.18],
      0.03,
      materials.metal,
    ));
    group.add(cylinderBetween(
      [side * 0.48, 0.55, -0.05],
      [side * 0.48, 0.72, 0.02],
      0.025,
      materials.metal,
    ));
  }

  group.add(cylinder(0.045, 0.055, 0.34, materials.metal, 0, 0.24, 0, 28));
  group.add(box(0.5, 0.08, 0.42, materials.charcoal, 0, 0.52, 0, 0.03));
  group.add(cylinder(0.08, 0.08, 0.05, materials.metal, 0, 0.18, 0, 24));

  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2 - 0.3;
    const end = [Math.cos(angle) * 0.58, 0.03, Math.sin(angle) * 0.58];
    group.add(cylinderBetween([0, 0.16, 0], end, 0.035, materials.metal, 16));
    const caster = mesh(
      new THREE.SphereGeometry(0.055, 18, 14),
      materials.charcoal,
      end[0],
      0.055,
      end[2],
    );
    group.add(caster);
  }
  return group;
}

function buildMonitor() {
  const group = new THREE.Group();
  group.add(box(1.3, 0.76, 0.075, materials.charcoal, 0, 0.55, -0.02, 0.04));
  group.add(box(1.18, 0.64, 0.018, materials.white, 0, 0.61, 0.03, 0.015));
  group.add(box(1.16, 0.62, 0.004, materials.glass, 0, 0.61, 0.041, 0.01));
  group.add(box(0.48, 0.04, 0.34, materials.metal, 0, 0.02, 0.02, 0.02));
  group.add(cylinder(0.035, 0.045, 0.35, materials.metal, 0, 0.29, -0.02, 24));
  group.add(box(0.34, 0.12, 0.05, materials.metal, 0, 0.37, -0.02, 0.02));
  group.add(box(0.08, 0.08, 0.025, materials.sage, 1.2, 0.53, -0.065, 0.01));
  for (let index = 0; index < 4; index += 1) {
    group.add(box(0.055, 0.012, 0.018, materials.line, 0.47, 0.22 + index * 0.032, -0.055, 0.004));
  }
  for (const x of [-0.18, 0.18]) {
    addFoot(group, x, 0.16, 0.035, 0.012);
  }
  return group;
}

function buildLaptop() {
  const group = new THREE.Group();
  group.add(box(1.12, 0.06, 0.76, materials.metal, 0, 0.02, 0, 0.025));
  group.add(box(1.0, 0.012, 0.5, materials.charcoal, 0, 0.08, -0.07, 0.012));
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 11; column += 1) {
      group.add(box(0.065, 0.012, 0.042, materials.cream, -0.43 + column * 0.086, 0.086, -0.24 + row * 0.085, 0.006));
    }
  }
  group.add(box(0.38, 0.012, 0.27, materials.metal, 0, 0.087, 0.24, 0.015));
  group.add(box(0.3, 0.002, 0.19, materials.white, 0, 0.094, 0.24, 0.008));
  for (const x of [-0.46, 0.46]) {
    for (const z of [-0.28, 0.28]) {
      addFoot(group, x, z, 0.028, 0.008);
    }
  }
  group.add(box(0.05, 0.018, 0.02, materials.line, 0.53, 0.06, 0.16, 0.004));
  group.add(box(0.05, 0.018, 0.02, materials.line, 0.53, 0.06, 0.1, 0.004));

  const lid = new THREE.Group();
  lid.position.set(0, 0.08, -0.38);
  lid.rotation.x = -1.34;
  const shell = box(1.12, 0.76, 0.05, materials.metal, 0, 0, 0.02, 0.025);
  lid.add(shell);
  const screen = box(1.02, 0.66, 0.018, materials.charcoal, 0, 0.05, 0.045, 0.015);
  lid.add(screen);
  lid.add(box(0.96, 0.6, 0.003, materials.glass, 0, 0.05, 0.056, 0.008));
  lid.add(box(0.012, 0.012, 0.003, materials.charcoal, 0, 0.35, 0.058, 0.002));
  group.add(lid);
  return group;
}

function buildCabinet() {
  const group = new THREE.Group();
  group.add(box(1.0, 1.48, 0.52, materials.wood, 0, 0.08, 0, 0.045));
  group.add(box(0.92, 0.7, 0.025, materials.linenLight, 0, 0.78, 0.265, 0.015));
  group.add(box(0.92, 0.7, 0.025, materials.linen, 0, 0.78, 0.265, 0.015));
  group.add(box(0.012, 1.3, 0.018, materials.woodDark, 0, 0.87, 0.287, 0.005));
  addPanelGap(group, 0.84, 0.005, 0, 1.43, 0.278, 0, materials.line);
  for (const side of [-1, 1]) {
    group.add(box(0.07, 0.26, 0.035, materials.brass, side * 0.08, 0.9, 0.29, 0.012));
    group.add(box(0.012, 0.18, 0.012, materials.charcoal, side * 0.08, 0.9, 0.31, 0.005));
  }
  for (const x of [-0.38, 0.38]) {
    group.add(cylinder(0.04, 0.04, 0.09, materials.woodDark, x, 0, 0.17, 18));
    addFoot(group, x, 0.17, 0.045, 0.016);
  }
  return group;
}

function buildBed() {
  const group = new THREE.Group();
  group.add(box(1.78, 0.32, 1.18, materials.woodDark, 0, 0.08, 0, 0.06));
  group.add(box(1.68, 0.22, 1.08, materials.linenLight, 0, 0.42, 0, 0.08));
  group.add(box(1.78, 0.8, 0.12, materials.wood, 0, 0.22, -0.62, 0.06));
  for (const x of [-0.66, -0.33, 0, 0.33, 0.66]) {
    addPanelGap(group, 0.018, 0.62, x, 0.36, -0.555, 0, materials.woodDark);
  }
  group.add(box(1.5, 0.05, 0.85, materials.linen, 0, 0.63, 0.08, 0.05));
  group.add(box(1.48, 0.02, 0.02, materials.linenLight, 0, 0.66, 0.49, 0.006));
  for (const x of [-0.45, 0.45]) {
    group.add(box(0.55, 0.11, 0.32, materials.white, x, 0.64, -0.33, 0.05));
    group.add(box(0.5, 0.018, 0.02, materials.linenLight, x, 0.695, -0.17, 0.006));
  }
  addFoot(group, -0.72, 0.45, 0.045, 0.018);
  addFoot(group, 0.72, 0.45, 0.045, 0.018);
  addFoot(group, -0.72, -0.45, 0.045, 0.018);
  addFoot(group, 0.72, -0.45, 0.045, 0.018);
  return group;
}

function buildPlant() {
  const group = new THREE.Group();
  group.add(cylinder(0.33, 0.28, 0.42, materials.clay, 0, 0.02, 0, 48));
  group.add(torus(0.325, 0.012, materials.clay, 0, 0.43, 0, -Math.PI / 2));
  group.add(cylinder(0.28, 0.28, 0.025, materials.woodDark, 0, 0.44, 0, 48));
  group.add(cylinder(0.022, 0.03, 0.38, materials.woodDark, 0, 0.44, 0, 18));
  const leafData = [
    [-0.22, 0.82, 0.02, 0.3, -0.5, 0.15],
    [0.18, 0.9, -0.03, 0.34, 0.45, -0.2],
    [-0.05, 1.05, 0.08, 0.32, 0.2, 0.4],
    [0.3, 0.76, 0.1, 0.26, 0.7, -0.4],
    [-0.3, 0.7, -0.08, 0.26, -0.75, -0.2],
    [0.02, 0.92, -0.18, 0.24, 0.25, 0.8],
    [-0.14, 1.12, -0.04, 0.22, -0.2, -0.6],
  ];
  leafData.forEach(([x, y, z, size, tilt, turn]) => {
    const leaf = mesh(new THREE.SphereGeometry(size * 0.28, 20, 14), materials.sage, x, y, z);
    leaf.scale.set(0.65, 1.75, 1);
    leaf.rotation.z = tilt;
    leaf.rotation.y = turn;
    group.add(leaf);
  });
  addFoot(group, -0.18, 0.18, 0.035, 0.014);
  addFoot(group, 0.18, 0.18, 0.035, 0.014);
  addFoot(group, 0, -0.2, 0.035, 0.014);
  return group;
}

function buildAppliance() {
  const group = new THREE.Group();
  group.add(box(0.72, 0.86, 0.6, materials.cream, 0, 0.03, 0, 0.08));
  group.add(box(0.78, 0.08, 0.64, materials.woodDark, 0, 0.89, 0, 0.04));
  group.add(box(0.52, 0.28, 0.02, materials.charcoal, 0, 0.57, 0.31, 0.02));
  group.add(box(0.46, 0.2, 0.004, materials.glass, 0, 0.58, 0.323, 0.012));
  group.add(cylinder(0.07, 0.07, 0.05, materials.metal, 0, 0.52, 0.34, 28));
  group.add(box(0.48, 0.04, 0.22, materials.metal, 0, 0.12, 0.29, 0.02));
  group.add(cylinder(0.08, 0.07, 0.16, materials.white, -0.16, 0.16, 0.3, 24));
  group.add(cylinder(0.024, 0.024, 0.22, materials.metal, 0.22, 0.18, 0.34, 18));
  group.add(box(0.09, 0.025, 0.09, materials.clay, 0.22, 0.4, 0.34, 0.015));
  for (let index = 0; index < 5; index += 1) {
    addPanelGap(group, 0.42, 0.004, 0, 0.2 + index * 0.035, 0.31, 0, materials.line);
  }
  addFoot(group, -0.28, 0.2, 0.04, 0.018);
  addFoot(group, 0.28, 0.2, 0.04, 0.018);
  addFoot(group, -0.28, -0.2, 0.04, 0.018);
  addFoot(group, 0.28, -0.2, 0.04, 0.018);
  return group;
}

function buildVessel() {
  const group = new THREE.Group();
  const material = materials.clay.clone();
  material.side = THREE.DoubleSide;
  material.userData.owned = true;
  material.name = "clay";
  const points = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.18, 0.0),
    new THREE.Vector2(0.3, 0.14),
    new THREE.Vector2(0.34, 0.4),
    new THREE.Vector2(0.28, 0.65),
    new THREE.Vector2(0.18, 0.78),
    new THREE.Vector2(0.22, 0.92),
    new THREE.Vector2(0.19, 1.0),
  ];
  group.add(mesh(new THREE.LatheGeometry(points, 64), material, 0, 0.02, 0));
  group.add(torus(0.195, 0.012, materials.brass, 0, 1.02, 0, -Math.PI / 2));
  group.add(torus(0.17, 0.008, materials.brass, 0, 0.03, 0, Math.PI / 2));
  group.add(box(0.07, 0.05, 0.004, materials.brass, 0, 0.56, 0.325, 0.012));
  return group;
}

function buildGeneratedModel(seed = 1) {
  const random = (() => {
    let value = Math.abs(Math.floor(seed)) || 1;
    return () => {
      value = (value * 1664525 + 1013904223) % 4294967296;
      return value / 4294967296;
    };
  })();
  const group = new THREE.Group();
  const palette = [materials.sage, materials.clay, materials.woodLight, materials.cream];
  group.add(cylinder(0.42, 0.46, 0.08, materials.woodDark, 0, 0.01, 0, 40));
  let y = 0.09;
  const layers = 3 + Math.floor(random() * 3);
  for (let index = 0; index < layers; index += 1) {
    const width = 0.32 + random() * 0.42;
    const height = 0.16 + random() * 0.3;
    const depth = 0.3 + random() * 0.34;
    const materialRef = palette[index % palette.length];
    const item = index % 2
      ? cylinder(width / 2, width / 2, height, materialRef, 0, y, 0, 36)
      : box(width, height, depth, materialRef, 0, y, 0, 0.06);
    item.rotation.y = random() * Math.PI;
    item.position.x = (random() - 0.5) * 0.18;
    group.add(item);
    y += height + 0.02;
  }
  group.add(mesh(new THREE.SphereGeometry(0.13, 24, 18), materials.clay, 0, y + 0.1, 0));
  return group;
}

function buildEarClip() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(buildTube([
      [side * 0.05, 1.22, 0],
      [side * 0.3, 1.1, 0.04],
      [side * 0.32, 0.82, 0.04],
      [side * 0.08, 0.88, 0],
    ], 0.028, materials.metal));
    group.add(mesh(new THREE.SphereGeometry(0.12, 24, 18), materials.cream, side * 0.3, 1.2, 0.02));
    group.add(cylinder(0.07, 0.06, 0.16, materials.cream, side * 0.22, 0.82, 0.02, 20));
  }
  return group;
}

function buildEarHook() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    group.add(buildTube([
      [side * 0.2, 1.24, 0],
      [side * 0.43, 1.08, 0.08],
      [side * 0.47, 0.8, 0.1],
      [side * 0.3, 0.7, 0.05],
    ], 0.03, materials.charcoal));
    group.add(mesh(new THREE.SphereGeometry(0.1, 24, 18), materials.clay, side * 0.27, 0.83, 0.02));
    group.add(cylinder(0.055, 0.045, 0.16, materials.charcoal, side * 0.23, 0.66, 0.02, 20));
  }
  return group;
}

function buildBoneConduction() {
  const group = new THREE.Group();
  group.add(buildTube([
    [-0.55, 0.38, 0],
    [-0.62, 0.76, 0.04],
    [0, 1.02, 0.06],
    [0.62, 0.76, 0.04],
    [0.55, 0.38, 0],
  ], 0.035, materials.charcoal));
  for (const side of [-1, 1]) {
    group.add(box(0.2, 0.15, 0.13, materials.clay, side * 0.56, 0.42, 0.04, 0.05));
    group.add(mesh(new THREE.SphereGeometry(0.06, 18, 14), materials.metal, side * 0.57, 0.58, 0.05));
  }
  return group;
}

function buildKeyboard() {
  const group = new THREE.Group();
  group.add(box(1.42, 0.06, 0.55, materials.charcoal, 0, 0.02, 0, 0.035));
  addPanelGap(group, 1.3, 0.004, 0, 0.052, 0.278, 0, materials.line);
  for (let row = 0; row < 5; row += 1) {
    const columns = row === 4 ? 8 : 14;
    for (let column = 0; column < columns; column += 1) {
      const x = (column - (columns - 1) / 2) * 0.087;
      const z = -0.19 + row * 0.085;
      group.add(box(0.068, 0.035, 0.055, materials.cream, x, 0.085, z, 0.008));
    }
  }
  group.add(box(0.38, 0.04, 0.055, materials.cream, 0, 0.085, 0.16, 0.008));
  group.add(box(0.22, 0.03, 0.09, materials.clay, 0.5, 0.085, -0.12, 0.008));
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.2, 0.2]) addFoot(group, x, z, 0.035, 0.01);
  }
  for (let index = 0; index < 3; index += 1) {
    group.add(cylinder(0.008, 0.008, 0.003, materials.sage, 0.52 + index * 0.024, 0.053, -0.23, 10));
  }
  group.add(box(0.06, 0.018, 0.02, materials.line, 0.62, 0.04, 0.22, 0.006));
  return group;
}

function buildMouse() {
  const group = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.33, 48, 32), materials.charcoal, 0, 0.23, 0);
  body.scale.set(0.85, 0.63, 1.22);
  group.add(body);
  group.add(box(0.5, 0.04, 0.58, materials.charcoal, 0, 0.01, 0, 0.06));
  addPanelGap(group, 0.004, 0.24, 0, 0.29, 0.14, 0, materials.line);
  const wheel = mesh(new THREE.TorusGeometry(0.035, 0.014, 12, 28), materials.metal, 0, 0.39, -0.2);
  wheel.rotation.y = Math.PI / 2;
  group.add(wheel);
  group.add(box(0.018, 0.018, 0.002, materials.sage, 0.018, 0.39, -0.2, 0.004));
  for (const side of [-1, 1]) {
    group.add(box(0.03, 0.02, 0.1, materials.sage, side * 0.3, 0.2, -0.02, 0.008));
    group.add(box(0.025, 0.012, 0.045, materials.line, side * 0.31, 0.2, 0.1, 0.005));
  }
  group.add(box(0.045, 0.008, 0.02, materials.line, 0, 0.1, 0.32, 0.004));
  return group;
}

function buildMousepad() {
  const group = new THREE.Group();
  group.add(box(1.5, 0.025, 0.78, materials.charcoal, 0, 0.01, 0, 0.1));
  group.add(box(1.48, 0.006, 0.76, materials.woodDark, 0, 0.033, 0, 0.1));
  group.add(mesh(new THREE.TorusGeometry(0.12, 0.006, 8, 32), materials.clay, 0.45, 0.043, 0.14));
  return group;
}

function buildMonitorArm() {
  const group = new THREE.Group();
  group.add(box(0.48, 0.08, 0.32, materials.charcoal, 0, 0.02, 0, 0.03));
  group.add(cylinder(0.06, 0.08, 0.72, materials.metal, 0, 0.08, 0, 24));
  group.add(cylinderBetween([0, 0.78, 0], [-0.38, 1.02, 0.1], 0.045, materials.metal));
  group.add(cylinderBetween([-0.38, 1.02, 0.1], [0.18, 1.18, 0.2], 0.04, materials.metal));
  group.add(box(0.28, 0.34, 0.06, materials.charcoal, 0.22, 1.02, 0.22, 0.03));
  return group;
}

function buildTV() {
  const group = new THREE.Group();
  group.add(box(1.85, 1.02, 0.055, materials.charcoal, 0, 0.43, -0.02, 0.035));
  group.add(box(1.74, 0.91, 0.016, materials.white, 0, 0.48, 0.02, 0.012));
  group.add(box(0.55, 0.035, 0.22, materials.metal, -0.56, 0.03, 0, 0.02));
  group.add(box(0.55, 0.035, 0.22, materials.metal, 0.56, 0.03, 0, 0.02));
  return group;
}

function buildPowerBank() {
  const group = new THREE.Group();
  group.add(box(0.7, 0.12, 1.0, materials.charcoal, 0, 0.02, 0, 0.08));
  group.add(mesh(new THREE.TorusGeometry(0.19, 0.018, 12, 48), materials.sage, 0, 0.15, -0.2));
  group.add(box(0.17, 0.015, 0.07, materials.white, 0, 0.145, 0.36, 0.008));
  group.add(box(0.06, 0.04, 0.07, materials.metal, 0.26, 0.06, 0.5, 0.01));
  return group;
}

function buildCharger() {
  const group = new THREE.Group();
  group.add(box(0.38, 0.34, 0.3, materials.cream, 0, 0.02, 0, 0.04));
  group.add(box(0.1, 0.22, 0.025, materials.metal, -0.1, 0.08, -0.16, 0.008));
  group.add(box(0.1, 0.22, 0.025, materials.metal, 0.1, 0.08, -0.16, 0.008));
  for (const x of [-0.08, 0.08]) {
    group.add(box(0.08, 0.03, 0.02, materials.charcoal, x, 0.17, 0.17, 0.005));
  }
  return group;
}

function buildPhoneCooler() {
  const group = new THREE.Group();
  group.add(box(0.52, 0.07, 0.52, materials.charcoal, 0, 0.02, 0, 0.08));
  group.add(mesh(new THREE.TorusGeometry(0.18, 0.025, 12, 48), materials.metal, 0, 0.12, 0));
  for (let index = 0; index < 6; index += 1) {
    const blade = box(0.14, 0.012, 0.035, materials.sage, 0, 0.1, 0, 0.01);
    blade.rotation.y = (index / 6) * Math.PI * 2;
    blade.position.x = Math.cos(blade.rotation.y) * 0.07;
    blade.position.z = Math.sin(blade.rotation.y) * 0.07;
    group.add(blade);
  }
  for (const side of [-1, 1]) {
    group.add(box(0.04, 0.1, 0.18, materials.metal, side * 0.3, 0.02, 0, 0.015));
  }
  return group;
}

function buildController() {
  const group = new THREE.Group();
  group.add(box(0.72, 0.22, 0.42, materials.charcoal, 0, 0.1, 0, 0.1));
  for (const side of [-1, 1]) {
    const grip = mesh(new THREE.SphereGeometry(0.22, 28, 18), materials.charcoal, side * 0.38, 0.1, 0.1);
    grip.scale.set(0.8, 1.5, 0.85);
    group.add(grip);
    const stick = cylinder(0.06, 0.06, 0.03, materials.sage, side * 0.18, 0.3, 0.06, 24);
    group.add(stick);
  }
  group.add(box(0.2, 0.02, 0.08, materials.sage, 0, 0.32, 0.08, 0.01));
  group.add(cylinder(0.035, 0.035, 0.025, materials.clay, 0.32, 0.3, 0.02, 16));
  return group;
}

function buildSSD() {
  const group = new THREE.Group();
  group.add(box(0.62, 0.11, 0.36, materials.metal, 0, 0.02, 0, 0.06));
  group.add(box(0.5, 0.01, 0.24, materials.sage, 0, 0.135, 0, 0.02));
  group.add(box(0.08, 0.045, 0.02, materials.charcoal, 0.31, 0.055, 0.02, 0.005));
  return group;
}

function buildPhone() {
  const group = new THREE.Group();
  group.add(box(0.48, 0.96, 0.07, materials.charcoal, 0, 0.08, 0, 0.07));
  group.add(box(0.44, 0.9, 0.012, materials.white, 0, 0.11, 0.04, 0.05));
  group.add(box(0.2, 0.18, 0.035, materials.charcoal, -0.1, 0.72, -0.04, 0.04));
  group.add(mesh(new THREE.TorusGeometry(0.045, 0.01, 12, 24), materials.metal, -0.1, 0.8, -0.015));
  return group;
}

function buildTablet() {
  const group = new THREE.Group();
  group.add(box(0.78, 1.04, 0.045, materials.metal, 0, 0.06, 0, 0.06));
  group.add(box(0.72, 0.98, 0.01, materials.white, 0, 0.09, 0.025, 0.04));
  group.add(mesh(new THREE.CircleGeometry(0.035, 24), materials.charcoal, 0, 0.95, 0.035));
  return group;
}

function buildRobotVacuum() {
  const group = new THREE.Group();
  group.add(cylinder(0.5, 0.5, 0.12, materials.cream, 0, 0.03, 0, 72));
  group.add(cylinder(0.47, 0.47, 0.012, materials.line, 0, 0.145, 0, 64));
  group.add(cylinder(0.13, 0.13, 0.08, materials.charcoal, 0, 0.15, -0.02, 36));
  group.add(torus(0.13, 0.018, materials.metal, 0, 0.2, -0.02));
  group.add(box(0.5, 0.05, 0.06, materials.charcoal, 0, 0.07, 0.47, 0.02));
  group.add(box(0.18, 0.012, 0.08, materials.sage, 0, 0.155, 0.22, 0.02));
  for (let index = 0; index < 5; index += 1) {
    group.add(box(0.18, 0.008, 0.02, materials.line, 0, 0.155, 0.28 + index * 0.03, 0.006));
  }
  for (const x of [-0.38, 0.38]) {
    group.add(cylinder(0.055, 0.055, 0.04, materials.rubber, x, 0.01, -0.3, 18));
  }
  addBadge(group, 0, 0.158, 0.36, 0.11, 0.025);
  return group;
}

function buildVacuum() {
  const group = new THREE.Group();
  group.add(box(0.6, 0.18, 0.34, materials.charcoal, 0, 0.02, 0.1, 0.05));
  group.add(cylinder(0.035, 0.045, 1.1, materials.metal, 0, 0.18, -0.06, 18));
  group.add(box(0.28, 0.07, 0.16, materials.charcoal, 0, 1.23, -0.12, 0.04));
  group.add(cylinder(0.1, 0.1, 0.36, materials.sage, 0, 0.55, -0.18, 24));
  group.add(box(0.34, 0.1, 0.2, materials.woodDark, 0, 0.02, 0.1, 0.03));
  return group;
}

function buildFridge() {
  const group = new THREE.Group();
  group.add(box(0.95, 1.85, 0.72, materials.cream, 0, 0.03, 0, 0.04));
  group.add(box(0.012, 1.7, 0.012, materials.line, 0, 0.12, 0.365, 0.004));
  group.add(box(0.88, 0.86, 0.02, materials.cream, 0, 0.9, 0.37, 0.015));
  addPanelGap(group, 0.9, 0.006, 0, 0.47, 0.372, 0, materials.line);
  addPanelGap(group, 0.9, 0.006, 0, 1.33, 0.372, 0, materials.line);
  group.add(box(0.06, 0.26, 0.035, materials.metal, 0.36, 1.08, 0.39, 0.015));
  group.add(box(0.06, 0.26, 0.035, materials.metal, 0.36, 0.55, 0.39, 0.015));
  group.add(box(0.025, 0.2, 0.012, materials.charcoal, 0.36, 1.08, 0.409, 0.008));
  group.add(box(0.025, 0.2, 0.012, materials.charcoal, 0.36, 0.55, 0.409, 0.008));
  group.add(box(0.7, 0.04, 0.04, materials.charcoal, 0, 0.02, 0.3, 0.01));
  for (const x of [-0.36, 0.36]) {
    addFoot(group, x, 0.28, 0.045, 0.018);
  }
  return group;
}

function buildAirConditioner() {
  const group = new THREE.Group();
  group.add(box(1.5, 0.38, 0.34, materials.cream, 0, 0.08, 0, 0.07));
  group.add(box(1.34, 0.08, 0.02, materials.charcoal, 0, 0.14, 0.18, 0.03));
  group.add(box(0.16, 0.06, 0.02, materials.sage, 0.55, 0.35, 0.18, 0.01));
  for (let index = 0; index < 4; index += 1) {
    group.add(box(1.3, 0.008, 0.02, materials.line, 0, 0.1 + index * 0.035, 0.19, 0.006));
  }
  addVentSlots(group, { x: 0, y: 0.28, z: 0.186, width: 1.15, count: 4, gap: 0.02, mat: materials.line });
  return group;
}

function buildToothbrush() {
  const group = new THREE.Group();
  group.add(cylinder(0.065, 0.075, 0.8, materials.cream, 0, 0.18, 0, 24));
  group.add(cylinder(0.04, 0.04, 0.16, materials.metal, 0, 0.98, 0, 16));
  group.add(box(0.12, 0.2, 0.06, materials.white, 0, 1.14, 0, 0.03));
  for (let index = 0; index < 5; index += 1) {
    group.add(cylinder(0.012, 0.012, 0.07, materials.sage, -0.035 + index * 0.018, 1.27, 0.02, 10));
  }
  group.add(cylinder(0.13, 0.15, 0.05, materials.metal, 0, 0.02, 0, 24));
  return group;
}

function buildShaver() {
  const group = new THREE.Group();
  group.add(box(0.34, 0.62, 0.24, materials.charcoal, 0, 0.12, 0, 0.06));
  group.add(box(0.38, 0.08, 0.28, materials.metal, 0, 0.74, 0, 0.03));
  for (const x of [-0.12, 0, 0.12]) {
    group.add(cylinder(0.075, 0.075, 0.04, materials.metal, x, 0.82, 0, 24));
    group.add(cylinder(0.06, 0.06, 0.02, materials.charcoal, x, 0.86, 0, 20));
  }
  group.add(box(0.18, 0.05, 0.02, materials.sage, 0, 0.55, 0.13, 0.01));
  return group;
}

function buildBloodPressure() {
  const group = new THREE.Group();
  group.add(box(0.55, 0.32, 0.38, materials.cream, 0, 0.02, 0, 0.05));
  group.add(box(0.36, 0.2, 0.02, materials.charcoal, -0.04, 0.09, 0.2, 0.02));
  group.add(mesh(new THREE.TorusGeometry(0.28, 0.055, 16, 40), materials.linen, 0.38, 0.22, 0, 0));
  group.add(buildTube([
    [0.18, 0.12, 0.02],
    [0.32, 0.2, 0.06],
    [0.48, 0.2, 0.04],
  ], 0.012, materials.charcoal));
  group.add(cylinder(0.045, 0.045, 0.04, materials.clay, -0.18, 0.3, 0.02, 20));
  return group;
}

function buildHearingAid() {
  const group = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.18, 28, 20), materials.cream, -0.18, 0.22, 0);
  body.scale.set(1.25, 0.7, 0.8);
  group.add(body);
  group.add(buildTube([
    [-0.04, 0.24, 0],
    [0.1, 0.4, 0.02],
    [0.28, 0.3, 0.03],
    [0.35, 0.12, 0.02],
  ], 0.012, materials.metal));
  group.add(mesh(new THREE.SphereGeometry(0.07, 20, 16), materials.sage, 0.36, 0.1, 0.02));
  group.add(cylinder(0.025, 0.025, 0.03, materials.clay, -0.3, 0.3, 0.02, 14));
  return group;
}

function buildMassager() {
  const group = new THREE.Group();
  const ring = mesh(new THREE.TorusGeometry(0.48, 0.08, 16, 64, Math.PI * 1.3), materials.clay, 0, 0.58, 0);
  ring.rotation.z = -0.3;
  group.add(ring);
  for (const angle of [Math.PI * 0.22, Math.PI * 0.78]) {
    group.add(mesh(
      new THREE.SphereGeometry(0.11, 20, 16),
      materials.metal,
      Math.cos(angle) * 0.46,
      0.58 + Math.sin(angle) * 0.46,
      0.04,
    ));
  }
  return group;
}

function buildMassageChair() {
  const group = new THREE.Group();
  group.add(box(1.0, 0.18, 0.9, materials.clay, 0, 0.4, 0, 0.08));
  const back = box(0.9, 1.05, 0.18, materials.clay, 0, 0.56, -0.4, 0.08);
  back.rotation.x = -0.12;
  group.add(back);
  const foot = box(0.82, 0.18, 0.55, materials.linen, 0, 0.06, 0.62, 0.08);
  foot.rotation.x = 0.2;
  group.add(foot);
  for (const side of [-1, 1]) {
    group.add(box(0.16, 0.2, 0.9, materials.linen, side * 0.58, 0.48, 0, 0.06));
  }
  group.add(box(1.05, 0.1, 0.95, materials.woodDark, 0, 0.32, 0, 0.04));
  group.add(box(0.8, 0.08, 0.3, materials.charcoal, 0, 0.34, 0.6, 0.04));
  for (const x of [-0.3, 0, 0.3]) {
    addPanelGap(group, 0.006, 0.8, x, 0.56, -0.31, 0, materials.linenLight);
  }
  group.add(box(0.12, 0.22, 0.06, materials.charcoal, 0.63, 0.55, 0.22, 0.02));
  group.add(box(0.08, 0.12, 0.02, materials.white, 0.63, 0.58, 0.25, 0.012));
  for (const x of [-0.42, 0.42]) {
    addFoot(group, x, 0.4, 0.04, 0.018);
  }
  return group;
}

function buildTreadmill() {
  const group = new THREE.Group();
  group.add(box(1.55, 0.16, 0.78, materials.charcoal, 0, 0.12, 0, 0.08));
  group.add(box(1.3, 0.03, 0.55, materials.woodDark, 0, 0.28, 0, 0.04));
  for (let index = 0; index < 8; index += 1) {
    addPanelGap(group, 1.24, 0.003, 0, 0.29, -0.22 + index * 0.065, 0, materials.line);
  }
  for (const side of [-1, 1]) {
    group.add(cylinderBetween([side * 0.66, 0.2, -0.3], [side * 0.66, 1.3, -0.34], 0.035, materials.metal));
    group.add(cylinderBetween([side * 0.66, 0.95, -0.34], [side * 0.66, 1.0, 0.3], 0.035, materials.charcoal));
  }
  group.add(box(0.75, 0.35, 0.08, materials.charcoal, 0, 1.22, -0.34, 0.04));
  group.add(box(0.62, 0.22, 0.02, materials.white, 0, 1.28, -0.29, 0.02));
  for (let index = 0; index < 3; index += 1) {
    group.add(box(0.12, 0.04, 0.02, materials.sage, -0.14 + index * 0.14, 1.1, -0.28, 0.008));
  }
  for (const x of [-0.62, 0.62]) {
    group.add(cylinder(0.055, 0.055, 0.06, materials.rubber, x, 0.01, -0.28, 18));
  }
  return group;
}

function buildStandingDesk() {
  const group = new THREE.Group();
  group.add(box(1.55, 0.08, 0.78, materials.woodLight, 0, 0.82, 0, 0.04));
  addPanelGap(group, 1.48, 0.004, 0, 0.865, 0.39, 0, materials.line);
  for (const side of [-1, 1]) {
    group.add(box(0.12, 0.72, 0.12, materials.metal, side * 0.58, 0.1, 0, 0.02));
    group.add(box(0.08, 0.16, 0.6, materials.metal, side * 0.58, 0.02, 0, 0.02));
    addFoot(group, side * 0.58, 0.24, 0.045, 0.016);
  }
  group.add(box(1.0, 0.07, 0.08, materials.metal, 0, 0.48, -0.02, 0.02));
  group.add(box(0.18, 0.045, 0.08, materials.charcoal, 0.55, 0.88, 0.28, 0.015));
  group.add(cylinder(0.03, 0.03, 0.01, materials.metal, -0.55, 0.865, 0.2, 18));
  return group;
}

function buildLuggage() {
  const group = new THREE.Group();
  group.add(box(0.66, 1.05, 0.42, materials.charcoal, 0, 0.1, 0, 0.08));
  group.add(box(0.6, 0.95, 0.02, materials.sage, 0, 0.15, 0.22, 0.02));
  for (const x of [-0.2, -0.06, 0.06, 0.2]) {
    group.add(box(0.035, 0.85, 0.014, materials.line, x, 0.16, 0.235, 0.01));
  }
  addPanelGap(group, 0.6, 0.004, 0, 0.62, 0.236, 0, materials.line);
  group.add(box(0.42, 0.03, 0.04, materials.metal, 0, 1.2, -0.03, 0.01));
  for (const side of [-1, 1]) {
    group.add(cylinderBetween([side * 0.18, 1.2, -0.03], [side * 0.18, 1.45, -0.03], 0.018, materials.metal, 12));
  }
  group.add(box(0.4, 0.04, 0.04, materials.metal, 0, 1.45, -0.03, 0.01));
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.14, 0.14]) {
      group.add(cylinder(0.055, 0.055, 0.055, materials.metal, x, 0.03, z, 18));
      addFoot(group, x, z, 0.03, 0.012);
    }
  }
  return group;
}

function buildClothing() {
  const group = new THREE.Group();
  group.add(cylinder(0.3, 0.34, 0.06, materials.woodDark, 0, 0.01, 0, 32));
  group.add(cylinder(0.055, 0.07, 0.78, materials.metal, 0, 0.07, 0, 18));
  const torso = mesh(new THREE.SphereGeometry(0.42, 32, 24), materials.linen, 0, 1.15, 0);
  torso.scale.set(1, 1.15, 0.6);
  group.add(torso);
  group.add(box(0.9, 0.18, 0.42, materials.linen, 0, 1.18, 0, 0.08));
  group.add(cylinder(0.045, 0.055, 0.16, materials.cream, 0, 1.5, 0, 16));
  return group;
}

function buildCup() {
  const group = new THREE.Group();
  group.add(cylinder(0.2, 0.17, 0.62, materials.cream, 0, 0.05, 0, 48));
  group.add(cylinder(0.2, 0.2, 0.07, materials.clay, 0, 0.67, 0, 48));
  group.add(torus(0.16, 0.028, materials.clay, 0, 0.73, 0, -Math.PI / 2));
  addPanelGap(group, 0.36, 0.004, 0, 0.71, 0.195, 0, materials.line);
  const handle = mesh(new THREE.TorusGeometry(0.14, 0.025, 14, 48, Math.PI * 1.4), materials.cream, 0.22, 0.38, 0);
  handle.rotation.z = -0.4;
  group.add(handle);
  group.add(torus(0.15, 0.008, materials.brass, 0, 0.05, 0, Math.PI / 2));
  return group;
}

function buildRouter() {
  const group = new THREE.Group();
  group.add(box(0.78, 0.09, 0.48, materials.charcoal, 0, 0.02, 0, 0.05));
  group.add(box(0.7, 0.015, 0.4, materials.sage, 0, 0.12, 0, 0.02));
  for (let index = 0; index < 4; index += 1) {
    const x = -0.27 + index * 0.18;
    group.add(cylinderBetween([x, 0.1, -0.2], [x - 0.1, 0.6, -0.36], 0.012, materials.metal, 14));
  }
  group.add(box(0.08, 0.012, 0.08, materials.clay, 0.27, 0.13, 0.15, 0.02));
  for (let index = 0; index < 4; index += 1) {
    group.add(box(0.035, 0.012, 0.02, materials.line, 0.18 + index * 0.045, 0.08, 0.235, 0.004));
  }
  addVentSlots(group, { x: -0.18, y: 0.06, z: 0.235, width: 0.22, count: 3, gap: 0.018, mat: materials.line });
  for (let index = 0; index < 3; index += 1) {
    group.add(cylinder(0.007, 0.007, 0.003, materials.sage, -0.26 + index * 0.03, 0.135, 0.16, 10));
  }
  return group;
}

function buildTube(points, radius, mat) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
  );
  return mesh(new THREE.TubeGeometry(curve, 48, radius, 8, false), mat);
}

function earbud(matBody, matTip) {
  const group = new THREE.Group();
  const head = mesh(new THREE.SphereGeometry(0.11, 28, 20), matBody, 0, 0.14, 0);
  head.scale.set(1.05, 0.9, 0.9);
  group.add(head);
  group.add(cylinder(0.045, 0.035, 0.2, matBody, 0, -0.06, 0, 20));
  const tip = mesh(new THREE.SphereGeometry(0.06, 20, 16), matTip, 0.08, 0.15, 0.02);
  tip.scale.set(1.2, 0.9, 1);
  group.add(tip);
  return group;
}

function buildWirelessEarbuds() {
  const group = new THREE.Group();
  group.add(box(0.92, 0.4, 0.62, materials.cream, 0, 0.02, 0.02, 0.12));
  group.add(box(0.8, 0.03, 0.5, materials.sage, 0, 0.42, 0.03, 0.05));
  addPanelGap(group, 0.76, 0.005, 0, 0.21, 0.335, 0, materials.line);
  addPanelGap(group, 0.76, 0.005, 0, 0.21, -0.295, 0, materials.line);
  group.add(cylinder(0.012, 0.012, 0.004, materials.brass, 0.26, 0.215, 0.338, 12));
  group.add(box(0.11, 0.018, 0.012, materials.charcoal, -0.26, 0.215, 0.338, 0.005));

  const lid = new THREE.Group();
  lid.position.set(0, 0.07, -0.31);
  const lidBody = box(0.92, 0.09, 0.62, materials.cream, 0, 0, 0.31, 0.11);
  lidBody.rotation.x = -0.04;
  lid.add(lidBody);
  lid.rotation.x = -1.48;
  group.add(lid);

  for (const side of [-1, 1]) {
    const bud = earbud(materials.white, materials.sage);
    bud.position.set(side * 0.2, 0.4, 0.07);
    bud.rotation.z = side * 0.12;
    bud.scale.setScalar(0.84);
    group.add(bud);
  }
  group.add(cylinder(0.018, 0.018, 0.035, materials.metal, 0, 0.45, 0.03, 18));
  return group;
}

function buildWiredEarbuds() {
  const group = new THREE.Group();
  for (const side of [-1, 1]) {
    const bud = earbud(materials.charcoal, materials.sage);
    bud.position.set(side * 0.34, 1.12, 0);
    bud.rotation.z = side * -0.35;
    group.add(bud);

    const cable = buildTube(
      [
        [side * 0.34, 0.94, 0],
        [side * 0.5, 0.7, 0.06],
        [side * 0.16, 0.46, 0.12],
        [side * 0.33, 0.16, 0.2],
        [side * 0.05, 0.04, 0.28],
      ],
      0.014,
      materials.charcoal,
    );
    group.add(cable);
  }
  group.add(box(0.14, 0.18, 0.1, materials.metal, 0, 0.02, 0.33, 0.025));
  group.add(cylinder(0.028, 0.018, 0.13, materials.metal, 0, 0.18, 0.33, 20));
  group.add(cylinder(0.021, 0.021, 0.07, materials.metal, 0, 0.29, 0.33, 18));
  return group;
}

function headphoneBand(mat) {
  const band = mesh(
    new THREE.TorusGeometry(0.56, 0.055, 20, 72, Math.PI),
    mat,
    0,
    1.18,
    0,
  );
  band.rotation.z = 0;
  return band;
}

function buildGamingHeadphones() {
  const group = new THREE.Group();
  group.add(headphoneBand(materials.charcoal));
  const cushionBand = mesh(
    new THREE.TorusGeometry(0.55, 0.028, 14, 64, Math.PI),
    materials.clay,
    0,
    1.17,
    -0.045,
  );
  group.add(cushionBand);

  for (const side of [-1, 1]) {
    const cup = mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.2, 40),
      materials.charcoal,
      side * 0.56,
      1.02,
      0,
    );
    cup.rotation.z = Math.PI / 2;
    cup.scale.set(1, 1, 1.15);
    group.add(cup);

    const pad = mesh(
      new THREE.TorusGeometry(0.235, 0.075, 16, 48),
      materials.clay,
      side * 0.44,
      1.02,
      0,
    );
    pad.rotation.y = Math.PI / 2;
    pad.scale.set(1.15, 1, 1);
    group.add(pad);
    const padStitches = [];
    for (let index = 0; index < 18; index += 1) {
      const angle = (index / 18) * Math.PI * 2;
      padStitches.push([
        side * 0.445,
        1.02 + Math.cos(angle) * 0.207,
        Math.sin(angle) * 0.207,
      ]);
    }
    addStitchLine(group, padStitches, 0.0045, materials.linenLight);

    const plate = mesh(
      new THREE.CircleGeometry(0.22, 40),
      materials.sage,
      side * 0.665,
      1.02,
      0,
    );
    plate.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(plate);
    group.add(box(0.045, 0.018, 0.003, materials.charcoal, side * 0.671, 0.94, 0.16, 0.004));
    group.add(box(0.07, 0.012, 0.02, materials.line, side * 0.54, 0.84, 0.25, 0.004));

    group.add(cylinderBetween(
      [side * 0.56, 1.18, 0],
      [side * 0.56, 1.3, 0],
      0.035,
      materials.charcoal,
      16,
    ));
  }

  group.add(cylinderBetween([-0.56, 0.88, 0.04], [-0.38, 0.7, 0.33], 0.024, materials.charcoal, 16));
  group.add(cylinderBetween([-0.38, 0.7, 0.33], [-0.18, 0.65, 0.38], 0.024, materials.charcoal, 16));
  group.add(cylinder(0.06, 0.06, 0.08, materials.charcoal, -0.14, 0.63, 0.38, 24));
  return group;
}

function buildAncHeadphones() {
  const group = new THREE.Group();
  group.add(headphoneBand(materials.clay));
  const paddedBand = mesh(
    new THREE.TorusGeometry(0.55, 0.032, 14, 64, Math.PI),
    materials.linen,
    0,
    1.17,
    -0.04,
  );
  group.add(paddedBand);

  for (const side of [-1, 1]) {
    const cup = mesh(
      new THREE.CylinderGeometry(0.31, 0.295, 0.18, 40),
      materials.clay,
      side * 0.55,
      1.02,
      0,
    );
    cup.rotation.z = Math.PI / 2;
    cup.scale.set(1, 1, 1.22);
    group.add(cup);

    const cushion = mesh(
      new THREE.TorusGeometry(0.24, 0.09, 18, 48),
      materials.linen,
      side * 0.43,
      1.02,
      0,
    );
    cushion.rotation.y = Math.PI / 2;
    cushion.scale.set(1.2, 1, 1);
    group.add(cushion);
    const cushionStitches = [];
    for (let index = 0; index < 20; index += 1) {
      const angle = (index / 20) * Math.PI * 2;
      cushionStitches.push([
        side * 0.435,
        1.02 + Math.cos(angle) * 0.235,
        Math.sin(angle) * 0.235,
      ]);
    }
    addStitchLine(group, cushionStitches, 0.0045, materials.linenLight);

    const cap = mesh(
      new THREE.CircleGeometry(0.215, 40),
      materials.sage,
      side * 0.645,
      1.02,
      0,
    );
    cap.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(cap);
    group.add(box(0.05, 0.018, 0.003, materials.charcoal, side * 0.651, 0.93, 0.15, 0.004));
    group.add(box(0.07, 0.012, 0.02, materials.line, side * 0.53, 0.84, 0.25, 0.004));

    const capRing = mesh(
      new THREE.TorusGeometry(0.215, 0.012, 12, 48),
      materials.metal,
      side * 0.648,
      1.02,
      0,
    );
    capRing.rotation.y = Math.PI / 2;
    group.add(capRing);

    group.add(cylinderBetween(
      [side * 0.55, 1.18, 0],
      [side * 0.55, 1.3, 0],
      0.035,
      materials.clay,
      16,
    ));
  }
  return group;
}

function buildFallbackChair() {
  const group = new THREE.Group();
  group.add(box(1.1, 0.12, 0.9, materials.linen, 0, 0.45, 0, 0.05));
  group.add(box(1.1, 0.75, 0.12, materials.wood, 0, 0.55, -0.39, 0.05));
  addLegs(group, 4, 0.45, 0.42, materials.woodDark, 0.03);
  return group;
}

const BUILDERS = {
  "lounge-chair": buildLoungeChair,
  "dining-chair": buildDiningChair,
  stool: buildStool,
  "table-lamp": buildTableLamp,
  "floor-lamp": buildFloorLamp,
  speaker: buildSpeaker,
  turntable: buildTurntable,
  camera: buildCamera,
  projector: buildProjector,
  "coffee-table": buildCoffeeTable,
  "side-table": buildSideTable,
  loveseat: buildLoveseat,
  "office-chair": buildOfficeChair,
  monitor: buildMonitor,
  laptop: buildLaptop,
  cabinet: buildCabinet,
  bed: buildBed,
  plant: buildPlant,
  appliance: buildAppliance,
  vessel: buildVessel,
  "ear-clip": buildEarClip,
  "ear-hook": buildEarHook,
  "bone-conduction": buildBoneConduction,
  keyboard: buildKeyboard,
  mouse: buildMouse,
  mousepad: buildMousepad,
  "monitor-arm": buildMonitorArm,
  tv: buildTV,
  "power-bank": buildPowerBank,
  charger: buildCharger,
  "phone-cooler": buildPhoneCooler,
  controller: buildController,
  ssd: buildSSD,
  phone: buildPhone,
  tablet: buildTablet,
  "robot-vacuum": buildRobotVacuum,
  vacuum: buildVacuum,
  fridge: buildFridge,
  "air-conditioner": buildAirConditioner,
  toothbrush: buildToothbrush,
  shaver: buildShaver,
  "blood-pressure": buildBloodPressure,
  "hearing-aid": buildHearingAid,
  massager: buildMassager,
  "massage-chair": buildMassageChair,
  treadmill: buildTreadmill,
  "standing-desk": buildStandingDesk,
  luggage: buildLuggage,
  clothing: buildClothing,
  cup: buildCup,
  router: buildRouter,
  "wireless-earbuds": buildWirelessEarbuds,
  "wired-earbuds": buildWiredEarbuds,
  "gaming-headphones": buildGamingHeadphones,
  "anc-headphones": buildAncHeadphones,
};

const FINISH_KEYS = new Set(["default", "oak", "sage", "clay", "graphite"]);

function clampScale(value) {
  const number = Number.parseFloat(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(1.25, Math.max(0.75, number));
}

export function parseModelUrl(url) {
  const raw = String(url || "");
  const [path, queryString = ""] = raw.split("?");
  const key = path.split("/").pop().replace(/\.(glb|gltf)$/i, "");
  const params = new URLSearchParams(queryString);
  const finish = params.get("finish");
  return {
    key,
    seed: Math.max(1, Number.parseInt(params.get("seed") || "1", 10) || 1),
    scale: {
      x: clampScale(params.get("sx")),
      y: clampScale(params.get("sy")),
      z: clampScale(params.get("sz")),
    },
    finish: FINISH_KEYS.has(finish) ? finish : "default",
  };
}

export function modelKeyFromUrl(url) {
  return parseModelUrl(url).key;
}

function disposeObject(root) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry) node.geometry.dispose();
    const list = Array.isArray(node.material) ? node.material : [node.material];
    for (const item of list) {
      if (!item || !item.userData?.owned) continue;
      for (const value of Object.values(item)) {
        if (value && value.isTexture && !value.userData?.shared) value.dispose();
      }
      item.dispose();
    }
  });
}

function normalizeModel(root, proportions = { x: 1, y: 1, z: 1 }) {
  root.scale.set(proportions.x, proportions.y, proportions.z);
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  if (!size.y || !size.x || !size.z) return;
  const fit = Math.min(1.95 / size.y, 2.5 / size.x, 2.2 / size.z, 1.55);
  root.scale.set(
    proportions.x * fit,
    proportions.y * fit,
    proportions.z * fit,
  );
  root.updateMatrixWorld(true);
  bounds.setFromObject(root);
  const center = bounds.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= bounds.min.y;
}

export class ProductViewer {
  constructor(canvas, fallbackElement) {
    this.canvas = canvas;
    this.fallback = fallbackElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
    this.cameraTarget = new THREE.Vector3(0, 0.97, 0);
    this.baseDirection = new THREE.Vector3(3.35, 2.42, 5.1).normalize();
    this.baseDistance = 6.45;
    this.distance = this.baseDistance;
    this.targetDistance = this.baseDistance;
    this.modelRoot = null;
    this.currentSignature = "";
    this.loadToken = 0;
    this.gltfLoader = new GLTFLoader();
    this.onModelError = null;
    this.dragging = false;
    this.lastPointerX = 0;
    this.lastActivity = performance.now();
    this.lastFrame = performance.now();
    this.intro = 1;
    this.visible = true;

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("WebGL unavailable", error);
      if (this.fallback) this.fallback.hidden = false;
      this.renderer = null;
      return;
    }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.setupScene();
    this.bindEvents();
    this.resize();
    this.loop = this.loop.bind(this);
    this.animationFrame = requestAnimationFrame(this.loop);
    this.ready = true;
  }

  setupScene() {
    this.scene.environment = STUDIO_ENVIRONMENT;

    const hemisphere = new THREE.HemisphereLight(0xfffdf8, 0x8b837a, 0.75);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff8ee, 2.15);
    key.position.set(4.2, 7.2, 5.4);
    key.castShadow = true;
    const shadowSize = window.matchMedia("(max-width: 700px)").matches ? 1024 : 2048;
    key.shadow.mapSize.set(shadowSize, shadowSize);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 18;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd5cfc7, 0.68);
    fill.position.set(-5, 4.2, 2.5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xfff3e4, 0.82);
    rim.position.set(0.5, 3.4, -5.8);
    this.scene.add(rim);

    const bounce = new THREE.DirectionalLight(0xfff8ee, 0.24);
    bounce.position.set(0.2, -2.2, 4.4);
    this.scene.add(bounce);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9e5df,
      roughness: 0.96,
      metalness: 0,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.5, 96), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.012;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.495, 2.508, 96),
      new THREE.MeshBasicMaterial({ color: 0xddd9d4, transparent: true, opacity: 0.9 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.009;
    this.scene.add(ring);

    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 96),
      new THREE.MeshBasicMaterial({ color: 0xf8f5f0, transparent: true, opacity: 0.26 }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.011;
    this.scene.add(glow);
  }

  bindEvents() {
    this.onPointerDown = (event) => {
      if (event.button !== 0) return;
      this.dragging = true;
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.lastActivity = performance.now();
      this.canvas.classList.add("is-dragging");
      this.canvas.setPointerCapture?.(event.pointerId);
    };

    this.onPointerMove = (event) => {
      if (!this.dragging || !this.modelRoot) return;
      const delta = event.clientX - this.lastPointerX;
      const deltaY = event.clientY - this.lastPointerY;
      this.modelRoot.rotation.y += delta * 0.0085;
      this.modelRoot.rotation.x = THREE.MathUtils.clamp(
        this.modelRoot.rotation.x - deltaY * 0.0015,
        -0.09,
        0.09,
      );
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.lastActivity = performance.now();
    };

    this.onPointerUp = (event) => {
      this.dragging = false;
      this.lastActivity = performance.now();
      this.canvas.classList.remove("is-dragging");
      this.canvas.releasePointerCapture?.(event.pointerId);
    };

    this.onWheel = (event) => {
      // 默认让滚轮滚动页面，只有按住 Ctrl / ⌘ 时才缩放模型，避免进入页面就被 3D 画布拦住。
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      this.targetDistance = THREE.MathUtils.clamp(
        this.targetDistance + event.deltaY * 0.0035,
        4.35,
        8.7,
      );
      this.lastActivity = performance.now();
    };

    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
    this.canvas.addEventListener("pointerup", this.onPointerUp);
    this.canvas.addEventListener("pointercancel", this.onPointerUp);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: false });
    this.canvas.addEventListener("pointerleave", () => {
      if (this.dragging) {
        this.dragging = false;
        this.canvas.classList.remove("is-dragging");
      }
    });

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas.parentElement);
    window.addEventListener("resize", () => this.resize());
  }

  mountModel(model) {
    if (this.modelRoot) {
      this.scene.remove(this.modelRoot);
      disposeObject(this.modelRoot);
    }
    this.modelRoot = new THREE.Group();
    this.modelRoot.add(model);
    addContactShadow(model);
    this.modelRoot.rotation.y = -0.42;
    this.modelRoot.rotation.x = 0;
    this.modelRoot.scale.setScalar(0.94);
    this.scene.add(this.modelRoot);
    this.intro = 0;
    this.targetDistance = this.baseDistance;
    this.distance = this.baseDistance;
    this.canvas.dataset.modelStatus = "loaded";
  }

  loadCustomModel(url, parsed, token) {
    this.canvas.dataset.modelStatus = "loading";
    this.gltfLoader.load(
      url,
      (gltf) => {
        if (token !== this.loadToken) {
          disposeObject(gltf.scene);
          return;
        }
        gltf.scene.traverse((node) => {
          if (!node.isMesh) return;
          node.castShadow = true;
          node.receiveShadow = true;
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of materials) {
            if (!material) continue;
            material.userData.owned = true;
            if (material.envMapIntensity !== undefined) material.envMapIntensity = 0.9;
            material.needsUpdate = true;
          }
        });
        normalizeModel(gltf.scene, parsed.scale);
        this.mountModel(gltf.scene);
        this.updateModelStats(parsed.key);
        this.canvas.dataset.modelKind = "external";
      },
      undefined,
      (error) => {
        if (token !== this.loadToken) return;
        console.warn("External model failed", error);
        this.onModelError?.("外部模型加载失败，请检查 GLB 文件");
        const fallback = buildFallbackChair();
        normalizeModel(fallback, parsed.scale);
        this.mountModel(fallback);
        this.canvas.dataset.modelStatus = "error";
      },
    );
  }

  setProduct(product) {
    if (!this.renderer) return;
    const parsed = parseModelUrl(product.model_url);
    const signature = `${parsed.key}|${parsed.seed}|${parsed.scale.x}|${parsed.scale.y}|${parsed.scale.z}|${parsed.finish}`;
    if (signature === this.currentSignature && this.modelRoot) return;
    this.currentSignature = signature;
    const token = ++this.loadToken;
    const custom = parsed.key.startsWith("custom-") || product.model_url.includes("/uploads/");
    if (custom) {
      this.loadCustomModel(product.model_url, parsed, token);
      return;
    }

    const builder = parsed.key === "generated"
      ? () => buildGeneratedModel(parsed.seed)
      : (BUILDERS[parsed.key] || buildFallbackChair);
    const model = builder();
    applyFinish(model, parsed.finish);
    normalizeModel(model, parsed.scale);
    this.mountModel(model);
    this.updateModelStats(parsed.key);
    this.canvas.dataset.modelKind = "builtin";
  }

  updateModelStats(key) {
    if (!this.modelRoot) return;
    let meshes = 0;
    let triangles = 0;
    this.modelRoot.traverse((node) => {
      if (!node.isMesh || node.isInstancedMesh || !node.geometry) return;
      meshes += 1;
      const index = node.geometry.getIndex();
      const position = node.geometry.getAttribute("position");
      triangles += index ? index.count / 3 : (position?.count || 0) / 3;
    });
    const bounds = new THREE.Box3();
    this.modelRoot.updateMatrixWorld(true);
    this.modelRoot.traverse((node) => {
      if (!node.isMesh || node.userData.contactShadow) return;
      bounds.expandByObject(node);
    });
    this.canvas.dataset.modelKey = key;
    this.canvas.dataset.modelMeshes = String(meshes);
    this.canvas.dataset.modelTriangles = String(Math.round(triangles));
    this.canvas.dataset.modelBottom = bounds.isEmpty() ? "" : bounds.min.y.toFixed(4);
  }

  clearProduct() {
    if (!this.renderer) return;
    this.loadToken += 1;
    this.currentSignature = "";
    if (!this.modelRoot) return;
    this.scene.remove(this.modelRoot);
    disposeObject(this.modelRoot);
    this.modelRoot = null;
  }

  resize() {
    if (!this.renderer || !this.canvas.parentElement) return;
    const { clientWidth: width, clientHeight: height } = this.canvas.parentElement;
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    const aspectBoost = this.camera.aspect < 1.25 ? 1 + (1.25 - this.camera.aspect) * 0.55 : 1;
    this.baseDistance = 6.45 * aspectBoost;
    this.targetDistance = Math.max(this.targetDistance, this.baseDistance * 0.94);
    this.camera.updateProjectionMatrix();
  }

  setVisible(visible) {
    this.visible = visible;
    if (visible) {
      this.resize();
      this.lastActivity = performance.now();
    }
  }

  loop(now) {
    this.animationFrame = requestAnimationFrame(this.loop);
    if (!this.renderer) return;
    if (!this.visible) return;

    const delta = Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;

    if (this.modelRoot) {
      if (!this.dragging && now - this.lastActivity > 2400) {
        this.modelRoot.rotation.y += delta * 0.105;
      }
      const introScale = 0.94 + 0.06 * (1 - Math.pow(1 - this.intro, 3));
      this.intro = Math.min(1, this.intro + delta * 4.2);
      this.modelRoot.scale.setScalar(introScale);
    }

    this.distance += (this.targetDistance - this.distance) * Math.min(1, delta * 7.5);
    const offset = this.baseDirection.clone().multiplyScalar(this.distance);
    this.camera.position.copy(this.cameraTarget).add(offset);
    this.camera.lookAt(this.cameraTarget);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    if (this.modelRoot) disposeObject(this.modelRoot);
    this.renderer?.dispose();
  }
}
