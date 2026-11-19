import * as THREE from "./vendor/three.module.min.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";

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
  cream: 0xece7df,
  white: 0xf7f4ef,
  shadow: 0x4f4a44,
};

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.02,
    ...options,
  });
}

const materials = {
  wood: material(COLORS.wood, { roughness: 0.58 }),
  woodLight: material(COLORS.woodLight, { roughness: 0.62 }),
  woodDark: material(COLORS.woodDark, { roughness: 0.56 }),
  linen: material(COLORS.linen, { roughness: 0.9 }),
  linenLight: material(COLORS.linenLight, { roughness: 0.94 }),
  sage: material(COLORS.sage, { roughness: 0.82 }),
  clay: material(COLORS.clay, { roughness: 0.78 }),
  charcoal: material(COLORS.charcoal, { roughness: 0.6 }),
  metal: material(COLORS.metal, { roughness: 0.36, metalness: 0.55 }),
  cream: material(COLORS.cream, { roughness: 0.86 }),
  white: material(COLORS.white, { roughness: 0.8 }),
};

for (const [name, value] of Object.entries(materials)) {
  value.name = name;
}

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

  const bevel = Math.min(0.018, height * 0.14, r * 0.42);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, height - bevel * 2),
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 10,
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

function cylinder(radiusTop, radiusBottom, height, mat, x = 0, y = 0, z = 0, segments = 40) {
  return mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    mat,
    x,
    y + height / 2,
    z,
  );
}

function cylinderBetween(a, b, radius, mat, segments = 20) {
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
  const item = mesh(new THREE.TorusGeometry(radius, tube, 16, 56), mat, x, y, z);
  item.rotation.x = rotationX;
  return item;
}

function addLegs(group, count, seatY, spread, materialRef, radius = 0.026) {
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + 0.4;
    const top = [Math.cos(angle) * spread * 0.5, seatY, Math.sin(angle) * spread * 0.5];
    const foot = [Math.cos(angle) * spread, 0.02, Math.sin(angle) * spread];
    group.add(cylinderBetween(top, foot, radius, materialRef));
  }
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
  const cushionButton = cylinder(0.027, 0.027, 0.012, materials.woodDark, 0, 0.685, 0.015);
  group.add(cushionButton);
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
  return group;
}

function buildStool() {
  const group = new THREE.Group();
  group.add(cylinder(0.49, 0.47, 0.12, materials.linen, 0, 0.54, 0, 52));
  group.add(cylinder(0.5, 0.5, 0.035, materials.wood, 0, 0.51, 0, 52));
  addLegs(group, 3, 0.52, 0.35, materials.woodDark, 0.031);
  group.add(torus(0.3, 0.012, materials.wood, 0, 0.22, 0, -Math.PI / 2));
  return group;
}

function makeLampShade(radiusTop, radiusBottom, height, y) {
  const shadeMaterial = materials.clay.clone();
  shadeMaterial.side = THREE.DoubleSide;
  shadeMaterial.roughness = 0.9;
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
  return group;
}

function buildTableLamp() {
  const group = new THREE.Group();
  group.add(cylinder(0.29, 0.31, 0.055, materials.wood, 0, 0.01, 0, 48));
  group.add(cylinder(0.035, 0.045, 0.48, materials.metal, 0, 0.06, 0, 20));
  group.add(torus(0.28, 0.012, materials.woodDark, 0, 0.055, 0, -Math.PI / 2));
  group.add(makeLampShade(0.18, 0.38, 0.43, 0.6));
  return group;
}

function buildFloorLamp() {
  const group = new THREE.Group();
  group.add(cylinder(0.39, 0.41, 0.05, materials.woodDark, 0, 0.01, 0, 56));
  group.add(cylinder(0.021, 0.026, 1.86, materials.metal, 0, 0.06, 0, 18));
  group.add(makeLampShade(0.33, 0.37, 0.4, 1.86));
  group.add(torus(0.37, 0.01, materials.metal, 0, 1.87, 0, -Math.PI / 2));
  group.add(torus(0.33, 0.009, materials.metal, 0, 2.26, 0, -Math.PI / 2));
  return group;
}

function buildSpeaker() {
  const group = new THREE.Group();
  group.add(box(0.98, 1.28, 0.56, materials.woodDark, 0, 0.045, 0, 0.055));
  group.add(box(0.84, 1.12, 0.022, materials.charcoal, 0, 0.12, 0.292, 0.035));

  const woofer = mesh(
    new THREE.CylinderGeometry(0.245, 0.245, 0.045, 48),
    materials.wood,
    0,
    0.72,
    0.32,
  );
  woofer.rotation.x = Math.PI / 2;
  group.add(woofer);
  group.add(torus(0.245, 0.012, materials.metal, 0, 0.72, 0.344, 0));
  const wooferCone = mesh(
    new THREE.CylinderGeometry(0.19, 0.15, 0.05, 48),
    materials.charcoal,
    0,
    0.72,
    0.343,
  );
  wooferCone.rotation.x = Math.PI / 2;
  group.add(wooferCone);

  const tweeter = mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.04, 40),
    materials.metal,
    0,
    1.13,
    0.32,
  );
  tweeter.rotation.x = Math.PI / 2;
  group.add(tweeter);
  const tweeterCone = mesh(
    new THREE.CylinderGeometry(0.075, 0.06, 0.035, 32),
    materials.charcoal,
    0,
    1.13,
    0.344,
  );
  tweeterCone.rotation.x = Math.PI / 2;
  group.add(tweeterCone);

  const knob = cylinder(0.031, 0.031, 0.035, materials.metal, 0.31, 1.295, 0.05, 22);
  group.add(knob);

  for (const x of [-0.37, 0.37]) {
    for (const z of [-0.2, 0.2]) {
      group.add(cylinder(0.035, 0.035, 0.045, materials.charcoal, x, 0, z, 16));
    }
  }
  return group;
}

function buildTurntable() {
  const group = new THREE.Group();
  group.add(box(1.08, 0.15, 0.82, materials.wood, 0, 0.02, 0, 0.045));
  group.add(box(0.99, 0.028, 0.73, materials.woodDark, 0, 0.17, 0, 0.03));
  group.add(cylinder(0.345, 0.345, 0.045, materials.metal, -0.08, 0.2, 0, 64));
  group.add(cylinder(0.31, 0.31, 0.012, materials.charcoal, -0.08, 0.247, 0, 64));
  group.add(cylinder(0.105, 0.105, 0.014, materials.clay, -0.08, 0.26, 0, 48));
  group.add(cylinder(0.009, 0.009, 0.028, materials.metal, -0.08, 0.274, 0, 14));

  const pivot = cylinder(0.05, 0.058, 0.13, materials.metal, 0.39, 0.2, -0.24, 24);
  group.add(pivot);
  group.add(cylinderBetween([0.39, 0.36, -0.24], [0.1, 0.3, 0.08], 0.012, materials.metal, 14));
  group.add(cylinderBetween([0.39, 0.35, -0.24], [0.47, 0.35, -0.35], 0.011, materials.metal, 12));
  group.add(box(0.07, 0.035, 0.09, materials.charcoal, 0.075, 0.275, 0.12, 0.01));

  group.add(cylinder(0.025, 0.025, 0.018, materials.metal, 0.4, 0.2, 0.3, 18));
  group.add(box(0.1, 0.012, 0.05, materials.charcoal, 0.4, 0.205, 0.16, 0.01));
  return group;
}

function buildCamera() {
  const group = new THREE.Group();
  group.add(box(0.97, 0.62, 0.35, materials.charcoal, 0, 0.1, 0, 0.05));
  group.add(box(0.86, 0.075, 0.32, materials.metal, 0, 0.72, -0.005, 0.025));
  group.add(box(0.17, 0.52, 0.36, materials.woodDark, -0.4, 0.12, 0, 0.035));

  const lensBarrel = mesh(
    new THREE.CylinderGeometry(0.245, 0.275, 0.25, 56),
    materials.metal,
    0.09,
    0.43,
    0.28,
  );
  lensBarrel.rotation.x = Math.PI / 2;
  group.add(lensBarrel);
  group.add(torus(0.25, 0.018, materials.charcoal, 0.09, 0.43, 0.405, 0));
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f4342,
    roughness: 0.15,
    metalness: 0.35,
  });
  glassMaterial.userData.owned = true;
  const glass = mesh(
    new THREE.CircleGeometry(0.215, 48),
    glassMaterial,
    0.09,
    0.43,
    0.408,
  );
  group.add(glass);

  group.add(box(0.28, 0.14, 0.2, materials.charcoal, 0.18, 0.78, -0.025, 0.025));
  group.add(cylinder(0.045, 0.045, 0.035, materials.metal, -0.29, 0.795, 0.055, 24));
  group.add(cylinder(0.025, 0.025, 0.03, materials.clay, -0.29, 0.83, 0.055, 20));
  group.add(cylinder(0.024, 0.024, 0.05, materials.metal, -0.48, 0.36, 0.13, 14));
  group.add(cylinder(0.024, 0.024, 0.05, materials.metal, 0.48, 0.36, 0.13, 14));
  return group;
}

function buildProjector() {
  const group = new THREE.Group();
  group.add(box(0.84, 0.46, 0.53, materials.woodLight, 0, 0.07, 0, 0.085));
  group.add(box(0.77, 0.055, 0.48, materials.cream, 0, 0.52, 0, 0.04));
  const lens = mesh(
    new THREE.CylinderGeometry(0.115, 0.135, 0.14, 48),
    materials.metal,
    0.16,
    0.31,
    0.27,
  );
  lens.rotation.x = Math.PI / 2;
  group.add(lens);
  group.add(cylinder(0.095, 0.095, 0.02, materials.charcoal, 0.16, 0.295, 0.345, 40));
  group.add(torus(0.12, 0.012, materials.metal, 0.16, 0.31, 0.35, 0));

  for (let index = 0; index < 5; index += 1) {
    group.add(box(0.012, 0.17, 0.015, materials.woodDark, -0.27, 0.2, 0.23 - index * 0.07, 0.004));
  }
  group.add(cylinder(0.055, 0.055, 0.027, materials.charcoal, -0.2, 0.575, -0.02, 28));
  group.add(cylinder(0.02, 0.02, 0.045, materials.metal, 0.23, 0.575, -0.02, 16));
  for (const x of [-0.29, 0.29]) {
    for (const z of [-0.16, 0.16]) {
      group.add(cylinder(0.03, 0.03, 0.028, materials.charcoal, x, 0.04, z, 14));
    }
  }
  return group;
}

function buildCoffeeTable() {
  const group = new THREE.Group();
  group.add(box(1.56, 0.115, 0.86, materials.wood, 0, 0.51, 0, 0.055));
  group.add(box(1.34, 0.05, 0.66, materials.woodDark, 0, 0.16, 0, 0.03));
  for (const x of [-0.67, 0.67]) {
    for (const z of [-0.32, 0.32]) {
      group.add(cylinder(0.033, 0.028, 0.51, materials.woodDark, x, 0, z, 20));
    }
  }
  group.add(box(0.42, 0.09, 0.27, materials.clay, -0.28, 0.625, 0, 0.02));
  group.add(box(0.3, 0.045, 0.4, materials.linen, 0.28, 0.625, 0.03, 0.02));
  return group;
}

function buildSideTable() {
  const group = new THREE.Group();
  group.add(cylinder(0.46, 0.46, 0.075, materials.wood, 0, 0.51, 0, 56));
  group.add(cylinder(0.43, 0.43, 0.025, materials.woodDark, 0, 0.485, 0, 56));
  addLegs(group, 3, 0.5, 0.34, materials.woodDark, 0.027);
  group.add(cylinder(0.12, 0.13, 0.07, materials.clay, 0, 0.585, 0, 32));
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
  }

  for (const side of [-1, 1]) {
    group.add(box(0.14, 0.12, 0.83, materials.wood, side * 0.92, 0.64, 0, 0.045));
    group.add(box(0.11, 0.27, 0.11, materials.wood, side * 0.92, 0.37, 0.35, 0.025));
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
  const spine = box(0.075, 0.78, 0.075, materials.woodDark, 0, 0.63, -0.48, 0.02);
  group.add(spine);
  const headrest = box(0.52, 0.22, 0.13, materials.linen, 0, 1.62, -0.47, 0.07);
  headrest.rotation.x = -0.12;
  group.add(headrest);
  group.add(box(0.07, 0.36, 0.065, materials.woodDark, 0, 1.31, -0.49, 0.02));

  for (const side of [-1, 1]) {
    group.add(box(0.13, 0.06, 0.62, materials.charcoal, side * 0.59, 0.75, 0.02, 0.04));
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
  group.add(box(0.48, 0.04, 0.34, materials.metal, 0, 0.02, 0.02, 0.02));
  group.add(cylinder(0.035, 0.045, 0.35, materials.metal, 0, 0.29, -0.02, 20));
  group.add(box(0.34, 0.12, 0.05, materials.metal, 0, 0.37, -0.02, 0.02));
  group.add(box(0.08, 0.08, 0.025, materials.sage, 1.2, 0.53, -0.065, 0.01));
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

  const lid = new THREE.Group();
  lid.position.set(0, 0.08, -0.38);
  lid.rotation.x = -1.34;
  const shell = box(1.12, 0.76, 0.05, materials.metal, 0, 0, 0.02, 0.025);
  lid.add(shell);
  const screen = box(1.02, 0.66, 0.018, materials.charcoal, 0, 0.05, 0.045, 0.015);
  lid.add(screen);
  group.add(lid);
  return group;
}

function buildCabinet() {
  const group = new THREE.Group();
  group.add(box(1.0, 1.48, 0.52, materials.wood, 0, 0.08, 0, 0.045));
  group.add(box(0.92, 0.7, 0.025, materials.linenLight, 0, 0.78, 0.265, 0.015));
  group.add(box(0.92, 0.7, 0.025, materials.linen, 0, 0.78, 0.265, 0.015));
  group.add(box(0.012, 1.3, 0.018, materials.woodDark, 0, 0.87, 0.287, 0.005));
  for (const side of [-1, 1]) {
    group.add(cylinder(0.014, 0.014, 0.12, materials.metal, 0, 0, 0, 12));
    const handle = group.children[group.children.length - 1];
    handle.position.set(side * 0.08, 1.05, 0.29);
  }
  for (const x of [-0.38, 0.38]) {
    group.add(cylinder(0.04, 0.04, 0.09, materials.woodDark, x, 0, 0.17, 14));
  }
  return group;
}

function buildBed() {
  const group = new THREE.Group();
  group.add(box(1.78, 0.32, 1.18, materials.woodDark, 0, 0.08, 0, 0.06));
  group.add(box(1.68, 0.22, 1.08, materials.linenLight, 0, 0.42, 0, 0.08));
  group.add(box(1.78, 0.8, 0.12, materials.wood, 0, 0.22, -0.62, 0.06));
  group.add(box(1.5, 0.05, 0.85, materials.linen, 0, 0.63, 0.08, 0.05));
  for (const x of [-0.45, 0.45]) {
    group.add(box(0.55, 0.11, 0.32, materials.white, x, 0.64, -0.33, 0.05));
  }
  return group;
}

function buildPlant() {
  const group = new THREE.Group();
  group.add(cylinder(0.33, 0.28, 0.42, materials.clay, 0, 0.02, 0, 36));
  group.add(cylinder(0.28, 0.28, 0.025, materials.woodDark, 0, 0.44, 0, 32));
  group.add(cylinder(0.022, 0.03, 0.38, materials.woodDark, 0, 0.44, 0, 14));
  const leafData = [
    [-0.22, 0.82, 0.02, 0.28, -0.5, 0.15],
    [0.18, 0.9, -0.03, 0.32, 0.45, -0.2],
    [-0.05, 1.05, 0.08, 0.3, 0.2, 0.4],
    [0.3, 0.76, 0.1, 0.24, 0.7, -0.4],
    [-0.3, 0.7, -0.08, 0.24, -0.75, -0.2],
  ];
  leafData.forEach(([x, y, z, size, tilt, turn]) => {
    const leaf = mesh(new THREE.SphereGeometry(size * 0.28, 16, 12), materials.sage, x, y, z);
    leaf.scale.set(0.65, 1.75, 1);
    leaf.rotation.z = tilt;
    leaf.rotation.y = turn;
    group.add(leaf);
  });
  return group;
}

function buildAppliance() {
  const group = new THREE.Group();
  group.add(box(0.72, 0.86, 0.6, materials.cream, 0, 0.03, 0, 0.08));
  group.add(box(0.78, 0.08, 0.64, materials.woodDark, 0, 0.89, 0, 0.04));
  group.add(box(0.52, 0.28, 0.02, materials.charcoal, 0, 0.57, 0.31, 0.02));
  group.add(cylinder(0.07, 0.07, 0.05, materials.metal, 0, 0.52, 0.34, 24));
  group.add(box(0.48, 0.04, 0.22, materials.metal, 0, 0.12, 0.29, 0.02));
  group.add(cylinder(0.08, 0.07, 0.16, materials.white, -0.16, 0.16, 0.3, 20));
  group.add(cylinder(0.024, 0.024, 0.22, materials.metal, 0.22, 0.18, 0.34, 14));
  group.add(box(0.09, 0.025, 0.09, materials.clay, 0.22, 0.4, 0.34, 0.015));
  return group;
}

function buildVessel() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xc4a69b,
    roughness: 0.84,
    side: THREE.DoubleSide,
  });
  material.name = "clay";
  material.userData.owned = true;
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
  group.add(mesh(new THREE.LatheGeometry(points, 56), material, 0, 0.02, 0));
  group.add(torus(0.195, 0.012, materials.metal, 0, 1.02, 0, -Math.PI / 2));
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
  return group;
}

function buildMouse() {
  const group = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.33, 36, 24), materials.charcoal, 0, 0.23, 0);
  body.scale.set(0.85, 0.63, 1.22);
  group.add(body);
  group.add(box(0.5, 0.04, 0.58, materials.charcoal, 0, 0.01, 0, 0.06));
  group.add(mesh(new THREE.TorusGeometry(0.035, 0.015, 12, 24), materials.metal, 0, 0.39, -0.2));
  for (const side of [-1, 1]) {
    group.add(box(0.03, 0.02, 0.1, materials.sage, side * 0.3, 0.2, -0.02, 0.008));
  }
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
  group.add(cylinder(0.5, 0.5, 0.12, materials.cream, 0, 0.03, 0, 64));
  group.add(cylinder(0.13, 0.13, 0.08, materials.charcoal, 0, 0.15, -0.02, 32));
  group.add(mesh(new THREE.TorusGeometry(0.13, 0.018, 12, 40), materials.metal, 0, 0.2, -0.02));
  group.add(box(0.5, 0.05, 0.06, materials.charcoal, 0, 0.07, 0.47, 0.02));
  group.add(box(0.18, 0.012, 0.08, materials.sage, 0, 0.155, 0.22, 0.02));
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
  group.add(box(0.012, 1.7, 0.012, materials.line || materials.metal, 0, 0.12, 0.365, 0.004));
  group.add(box(0.88, 0.86, 0.02, materials.cream, 0, 0.9, 0.37, 0.015));
  group.add(box(0.06, 0.26, 0.035, materials.metal, 0.36, 1.08, 0.39, 0.015));
  group.add(box(0.06, 0.26, 0.035, materials.metal, 0.36, 0.55, 0.39, 0.015));
  group.add(box(0.7, 0.04, 0.04, materials.charcoal, 0, 0.02, 0.3, 0.01));
  return group;
}

function buildAirConditioner() {
  const group = new THREE.Group();
  group.add(box(1.5, 0.38, 0.34, materials.cream, 0, 0.08, 0, 0.07));
  group.add(box(1.34, 0.08, 0.02, materials.charcoal, 0, 0.14, 0.18, 0.03));
  group.add(box(0.16, 0.06, 0.02, materials.sage, 0.55, 0.35, 0.18, 0.01));
  group.add(box(1.3, 0.03, 0.12, materials.charcoal, 0, 0.08, 0.2, 0.02));
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
  return group;
}

function buildTreadmill() {
  const group = new THREE.Group();
  group.add(box(1.55, 0.16, 0.78, materials.charcoal, 0, 0.12, 0, 0.08));
  group.add(box(1.3, 0.03, 0.55, materials.woodDark, 0, 0.28, 0, 0.04));
  for (const side of [-1, 1]) {
    group.add(cylinderBetween([side * 0.66, 0.2, -0.3], [side * 0.66, 1.3, -0.34], 0.035, materials.metal));
    group.add(cylinderBetween([side * 0.66, 0.95, -0.34], [side * 0.66, 1.0, 0.3], 0.035, materials.charcoal));
  }
  group.add(box(0.75, 0.35, 0.08, materials.charcoal, 0, 1.22, -0.34, 0.04));
  group.add(box(0.62, 0.22, 0.02, materials.white, 0, 1.28, -0.29, 0.02));
  return group;
}

function buildStandingDesk() {
  const group = new THREE.Group();
  group.add(box(1.55, 0.08, 0.78, materials.woodLight, 0, 0.82, 0, 0.04));
  for (const side of [-1, 1]) {
    group.add(box(0.12, 0.72, 0.12, materials.metal, side * 0.58, 0.1, 0, 0.02));
    group.add(box(0.08, 0.16, 0.6, materials.metal, side * 0.58, 0.02, 0, 0.02));
  }
  group.add(box(1.0, 0.07, 0.08, materials.metal, 0, 0.48, -0.02, 0.02));
  group.add(box(0.18, 0.045, 0.08, materials.charcoal, 0.55, 0.88, 0.28, 0.015));
  return group;
}

function buildLuggage() {
  const group = new THREE.Group();
  group.add(box(0.66, 1.05, 0.42, materials.charcoal, 0, 0.1, 0, 0.08));
  group.add(box(0.6, 0.95, 0.02, materials.sage, 0, 0.15, 0.22, 0.02));
  group.add(box(0.42, 0.03, 0.04, materials.metal, 0, 1.2, -0.03, 0.01));
  for (const side of [-1, 1]) {
    group.add(cylinderBetween([side * 0.18, 1.2, -0.03], [side * 0.18, 1.45, -0.03], 0.018, materials.metal, 12));
  }
  group.add(box(0.4, 0.04, 0.04, materials.metal, 0, 1.45, -0.03, 0.01));
  for (const x of [-0.22, 0.22]) {
    for (const z of [-0.14, 0.14]) {
      group.add(cylinder(0.055, 0.055, 0.055, materials.metal, x, 0.03, z, 16));
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
  group.add(cylinder(0.2, 0.17, 0.62, materials.cream, 0, 0.05, 0, 40));
  group.add(cylinder(0.2, 0.2, 0.07, materials.clay, 0, 0.67, 0, 40));
  group.add(torus(0.16, 0.028, materials.clay, 0, 0.73, 0, -Math.PI / 2));
  const handle = mesh(new THREE.TorusGeometry(0.14, 0.025, 12, 40, Math.PI * 1.4), materials.cream, 0.22, 0.38, 0);
  handle.rotation.z = -0.4;
  group.add(handle);
  return group;
}

function buildRouter() {
  const group = new THREE.Group();
  group.add(box(0.78, 0.09, 0.48, materials.charcoal, 0, 0.02, 0, 0.05));
  group.add(box(0.7, 0.015, 0.4, materials.sage, 0, 0.12, 0, 0.02));
  for (let index = 0; index < 4; index += 1) {
    const x = -0.27 + index * 0.18;
    group.add(cylinderBetween([x, 0.1, -0.2], [x - 0.1, 0.6, -0.36], 0.012, materials.metal, 12));
  }
  group.add(box(0.08, 0.012, 0.08, materials.clay, 0.27, 0.13, 0.15, 0.02));
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

    const plate = mesh(
      new THREE.CircleGeometry(0.22, 40),
      materials.sage,
      side * 0.665,
      1.02,
      0,
    );
    plate.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(plate);

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

    const cap = mesh(
      new THREE.CircleGeometry(0.215, 40),
      materials.sage,
      side * 0.645,
      1.02,
      0,
    );
    cap.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(cap);

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
        if (value && value.isTexture) value.dispose();
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
    this.renderer.toneMappingExposure = 1.08;

    this.setupScene();
    this.bindEvents();
    this.resize();
    this.loop = this.loop.bind(this);
    this.animationFrame = requestAnimationFrame(this.loop);
    this.ready = true;
  }

  setupScene() {
    const hemisphere = new THREE.HemisphereLight(0xfffdf8, 0x8b837a, 1.7);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff8ee, 2.7);
    key.position.set(4.2, 7.2, 5.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 18;
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0007;
    key.shadow.normalBias = 0.018;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd5cfc7, 1.15);
    fill.position.set(-5, 4.2, 2.5);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffffff, 0.92);
    rim.position.set(0.5, 3.4, -5.8);
    this.scene.add(rim);

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
            if (material) material.userData.owned = true;
          }
        });
        normalizeModel(gltf.scene, parsed.scale);
        this.mountModel(gltf.scene);
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
    this.canvas.dataset.modelKind = "builtin";
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
