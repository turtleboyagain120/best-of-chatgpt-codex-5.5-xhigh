import * as THREE from "three";

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1800);
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const mouseWorld = new THREE.Vector3();

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const ui = {
  startScreen: document.getElementById("startScreen"),
  startButton: document.getElementById("startButton"),
  hud: document.getElementById("hud"),
  ending: document.getElementById("ending"),
  restartButton: document.getElementById("restartButton"),
  zoneName: document.getElementById("zoneName"),
  objective: document.getElementById("objective"),
  systemState: document.getElementById("systemState"),
  healthBar: document.getElementById("healthBar"),
  energyBar: document.getElementById("energyBar"),
  glitchBar: document.getElementById("glitchBar"),
  prompt: document.getElementById("prompt"),
  toast: document.getElementById("toast")
};

const keys = new Set();
const pressed = Object.create(null);
const pointer = { hasTarget: false };
const tempVector = new THREE.Vector3();
const tempVectorTwo = new THREE.Vector3();
const worldGroup = new THREE.Group();
const actorGroup = new THREE.Group();
const effectGroup = new THREE.Group();
scene.add(worldGroup, actorGroup, effectGroup);

const colors = {
  cyan: 0x63f3ff,
  green: 0x74ffb7,
  pink: 0xff4edb,
  gold: 0xffd166,
  red: 0xff335f,
  white: 0xffffff
};

const levels = [
  {
    name: "Stable Simulation Zone",
    system: "STABLE",
    objective: "Rewrite the clean physics nodes and open the first portal.",
    size: 62,
    spawn: new THREE.Vector3(-20, 0, 16),
    portal: new THREE.Vector3(22, 0, -18),
    nodes: [new THREE.Vector3(-12, 0, 2), new THREE.Vector3(4, 0, 13), new THREE.Vector3(15, 0, -6)],
    enemies: [new THREE.Vector3(-1, 0, 3), new THREE.Vector3(12, 0, 10), new THREE.Vector3(17, 0, -14)],
    hazards: [new THREE.Vector3(-3, 0, -12), new THREE.Vector3(20, 0, 5)],
    palette: {
      sky: 0x061019,
      fog: 0x0b2b35,
      floor: 0x102b35,
      grid: 0x63f3ff,
      accent: 0x63f3ff,
      secondary: 0x74ffb7,
      enemy: 0xff4edb,
      danger: 0xffd166
    }
  },
  {
    name: "Corrupted Zone",
    system: "CORRUPTING",
    objective: "Shift the broken nodes before the geometry loses itself.",
    size: 68,
    spawn: new THREE.Vector3(-23, 0, 18),
    portal: new THREE.Vector3(24, 0, -21),
    nodes: [new THREE.Vector3(-16, 0, -5), new THREE.Vector3(2, 0, 16), new THREE.Vector3(17, 0, -3)],
    enemies: [new THREE.Vector3(-7, 0, -8), new THREE.Vector3(6, 0, 5), new THREE.Vector3(18, 0, -12), new THREE.Vector3(19, 0, 12)],
    hazards: [new THREE.Vector3(-2, 0, 9), new THREE.Vector3(10, 0, -15), new THREE.Vector3(23, 0, 4)],
    palette: {
      sky: 0x130611,
      fog: 0x2a1030,
      floor: 0x25112c,
      grid: 0xff4edb,
      accent: 0xff4edb,
      secondary: 0x63f3ff,
      enemy: 0xffd166,
      danger: 0xff335f
    }
  },
  {
    name: "Core System Layer",
    system: "CRITICAL",
    objective: "Wake every core node, fracture Rickr, and escape.",
    size: 72,
    spawn: new THREE.Vector3(-25, 0, 20),
    portal: new THREE.Vector3(23, 0, -22),
    nodes: [new THREE.Vector3(-18, 0, 0), new THREE.Vector3(0, 0, 17), new THREE.Vector3(17, 0, -2)],
    enemies: [new THREE.Vector3(-9, 0, 4), new THREE.Vector3(5, 0, 8), new THREE.Vector3(14, 0, 12), new THREE.Vector3(23, 0, -8)],
    hazards: [new THREE.Vector3(-9, 0, 14), new THREE.Vector3(8, 0, -10), new THREE.Vector3(18, 0, 5)],
    boss: new THREE.Vector3(22, 0, -22),
    palette: {
      sky: 0x070508,
      fog: 0x35100f,
      floor: 0x2d1012,
      grid: 0xffd166,
      accent: 0xffd166,
      secondary: 0xff4edb,
      enemy: 0x63f3ff,
      danger: 0xff335f
    }
  }
];

const state = {
  mode: "title",
  elapsed: 0,
  levelIndex: 0,
  currentLevel: null,
  player: null,
  carlos: null,
  cameraShake: 0,
  toastTimer: 0,
  projectiles: [],
  particles: [],
  ringEffects: [],
  enemies: [],
  nodes: [],
  hazards: [],
  portal: null,
  boss: null,
  lights: []
};

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function smooth(current, target, rate, deltaTime) {
  return current + (target - current) * (1 - Math.exp(-rate * deltaTime));
}

function makeStandard(color, emissive = 0x000000, intensity = 0.2, roughness = 0.48) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    metalness: 0.2,
    roughness
  });
}

function makeBasic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending
  });
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    disposeObject(child);
  }
}

function createCarlos() {
  const group = new THREE.Group();
  const bodyMaterial = makeStandard(0x152637, colors.cyan, 0.45, 0.36);
  const skinMaterial = makeStandard(0xf3bf9f, 0xffd166, 0.08, 0.55);
  const energyMaterial = makeBasic(colors.pink, 0.92);
  const limbMaterial = makeStandard(colors.green, colors.green, 0.38, 0.4);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.2, 6, 14), bodyMaterial);
  body.castShadow = true;
  body.position.y = 1.3;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), skinMaterial);
  head.castShadow = true;
  head.position.y = 2.32;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 30), energyMaterial);
  ring.position.set(0.72, 1.48, -0.42);
  ring.rotation.set(Math.PI * 0.5, 0, 0);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.025, 10, 54), makeBasic(colors.cyan, 0.42));
  halo.position.y = 1.45;
  halo.rotation.x = Math.PI * 0.5;

  const limbGeometry = new THREE.CapsuleGeometry(0.11, 0.75, 4, 10);
  const leftArm = new THREE.Mesh(limbGeometry, limbMaterial);
  const rightArm = new THREE.Mesh(limbGeometry, limbMaterial);
  const leftLeg = new THREE.Mesh(limbGeometry, limbMaterial);
  const rightLeg = new THREE.Mesh(limbGeometry, limbMaterial);
  [leftArm, rightArm, leftLeg, rightLeg].forEach((limb) => {
    limb.castShadow = true;
    group.add(limb);
  });

  group.add(body, head, ring, halo);
  actorGroup.add(group);
  return { group, body, head, ring, halo, leftArm, rightArm, leftLeg, rightLeg, bodyMaterial, energyMaterial, limbMaterial };
}

function createNode(position, palette, nodeIndex) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData = { active: false, pulse: 0, nodeIndex };

  const coreMaterial = makeStandard(palette.accent, palette.accent, 1.4, 0.24);
  const ringMaterial = makeBasic(palette.secondary, 0.68);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.68, 2), coreMaterial);
  core.position.y = 1.45;
  core.castShadow = true;

  const ringOne = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.035, 10, 64), ringMaterial);
  ringOne.position.y = 1.45;
  ringOne.rotation.x = Math.PI * 0.5;

  const ringTwo = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.025, 10, 64), makeBasic(palette.accent, 0.42));
  ringTwo.position.y = 1.45;
  ringTwo.rotation.y = Math.PI * 0.5;

  const light = new THREE.PointLight(palette.accent, 1.5, 10);
  light.position.y = 2.2;
  group.add(core, ringOne, ringTwo, light);
  worldGroup.add(group);
  return { group, core, ringOne, ringTwo, light, active: false, pulse: 0 };
}

function createEnemy(position, palette, enemyIndex) {
  const group = new THREE.Group();
  group.position.copy(position);
  const bodyMaterial = makeStandard(palette.enemy, palette.enemy, 0.9, 0.34);
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 1), bodyMaterial);
  body.position.y = 1.1;
  body.castShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.035, 8, 36), makeBasic(palette.enemy, 0.44));
  ring.position.y = 1.1;
  ring.rotation.x = Math.PI * 0.5;

  const light = new THREE.PointLight(palette.enemy, 0.75, 9);
  light.position.y = 1.6;
  group.add(body, ring, light);
  actorGroup.add(group);

  return {
    group,
    body,
    ring,
    bodyMaterial,
    velocity: new THREE.Vector3(),
    health: enemyIndex % 3 === 2 ? 78 : 48,
    maxHealth: enemyIndex % 3 === 2 ? 78 : 48,
    attackTimer: 0.4 + enemyIndex * 0.22,
    hurtTimer: 0,
    speed: enemyIndex % 3 === 2 ? 8.6 : 11.5,
    radius: enemyIndex % 3 === 2 ? 1.05 : 0.82
  };
}

function createPortal(position, palette) {
  const group = new THREE.Group();
  group.position.copy(position);
  const materialOne = makeBasic(palette.danger, 0.68);
  const materialTwo = makeBasic(palette.accent, 0.42);
  const outer = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.07, 12, 90), materialOne);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.045, 12, 90), materialTwo);
  outer.position.y = 2.25;
  inner.position.y = 2.25;
  outer.rotation.y = Math.PI * 0.5;
  inner.rotation.x = Math.PI * 0.5;
  const light = new THREE.PointLight(palette.danger, 0.2, 18);
  light.position.y = 2.4;
  group.add(outer, inner, light);
  worldGroup.add(group);
  return { group, outer, inner, light, active: false };
}

function createHazard(position, palette, hazardIndex) {
  const group = new THREE.Group();
  group.position.copy(position);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.06, 12, 82), makeBasic(hazardIndex % 2 ? palette.danger : palette.secondary, 0.46));
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = 0.07;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.65, 0.08, 48), makeBasic(palette.danger, 0.2));
  core.position.y = 0.04;
  group.add(core, ring);
  worldGroup.add(group);
  return { group, ring, radius: 2.25, phase: hazardIndex * 1.7 };
}

function createBoss(position, palette) {
  const group = new THREE.Group();
  group.position.copy(position);
  const coreMaterial = makeStandard(colors.red, colors.red, 1.9, 0.24);
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.65, 48, 32), coreMaterial);
  core.position.y = 2.35;
  core.castShadow = true;

  const ringMaterial = makeBasic(colors.gold, 0.64);
  const rings = [];
  for (let ringIndex = 0; ringIndex < 3; ringIndex += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.3 + ringIndex * 0.34, 0.045, 12, 96), ringMaterial.clone());
    ring.position.y = 2.35;
    ring.rotation.x = ringIndex * 0.7;
    ring.rotation.y = Math.PI * 0.5;
    group.add(ring);
    rings.push(ring);
  }

  const light = new THREE.PointLight(colors.red, 4, 24);
  light.position.y = 2.5;
  group.add(core, light);
  actorGroup.add(group);
  return { group, core, rings, light, health: 240, maxHealth: 240, attackTimer: 1.1, hurtTimer: 0, dead: false };
}

function createWorld(levelIndex) {
  clearGroup(worldGroup);
  clearGroup(actorGroup);
  clearGroup(effectGroup);
  state.projectiles = [];
  state.particles = [];
  state.ringEffects = [];
  state.enemies = [];
  state.nodes = [];
  state.hazards = [];
  state.portal = null;
  state.boss = null;
  state.carlos = null;

  const level = levels[levelIndex];
  state.currentLevel = level;
  scene.background = new THREE.Color(level.palette.sky);
  scene.fog = new THREE.FogExp2(level.palette.fog, levelIndex === 0 ? 0.018 : 0.024);

  const ambient = new THREE.HemisphereLight(0xd8fbff, level.palette.fog, 1.75);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-9, 18, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 80;
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  worldGroup.add(ambient, sun);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(level.size, level.size, 1, 1),
    makeStandard(level.palette.floor, level.palette.floor, 0.2, 0.62)
  );
  floor.rotation.x = -Math.PI * 0.5;
  floor.receiveShadow = true;
  worldGroup.add(floor);

  const grid = new THREE.GridHelper(level.size, levelIndex === 0 ? 24 : 28, level.palette.grid, level.palette.grid);
  grid.material.transparent = true;
  grid.material.opacity = levelIndex === 0 ? 0.34 : 0.27;
  grid.position.y = 0.03;
  worldGroup.add(grid);

  createFloatingGeometry(level, levelIndex);
  level.nodes.forEach((position, nodeIndex) => state.nodes.push(createNode(position, level.palette, nodeIndex)));
  level.enemies.forEach((position, enemyIndex) => state.enemies.push(createEnemy(position, level.palette, enemyIndex)));
  level.hazards.forEach((position, hazardIndex) => state.hazards.push(createHazard(position, level.palette, hazardIndex)));
  state.portal = createPortal(level.portal, level.palette);
  state.boss = level.boss ? createBoss(level.boss, level.palette) : null;
  state.carlos = createCarlos();
}

function createFloatingGeometry(level, levelIndex) {
  const random = seededRandom(2000 + levelIndex * 917);
  const geometries = [
    new THREE.BoxGeometry(1.4, 0.34, 3.2),
    new THREE.OctahedronGeometry(1.1, 0),
    new THREE.TetrahedronGeometry(1.25, 0),
    new THREE.TorusGeometry(1.2, 0.06, 8, 36)
  ];
  const decorMaterial = makeStandard(level.palette.accent, level.palette.secondary, 0.35, 0.3);
  const wireMaterial = makeBasic(level.palette.secondary, 0.28);
  const count = levelIndex === 0 ? 32 : levelIndex === 1 ? 46 : 58;
  for (let decorIndex = 0; decorIndex < count; decorIndex += 1) {
    const geometry = geometries[Math.floor(random() * geometries.length)];
    const material = random() > 0.35 ? decorMaterial.clone() : wireMaterial.clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set((random() - 0.5) * level.size * 0.95, 2 + random() * 9, (random() - 0.5) * level.size * 0.95);
    mesh.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    const scale = 0.58 + random() * 1.8;
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.userData = {
      spin: new THREE.Vector3((random() - 0.5) * 0.7, (random() - 0.5) * 0.9, (random() - 0.5) * 0.7),
      baseY: mesh.position.y,
      phase: random() * Math.PI * 2
    };
    worldGroup.add(mesh);
  }
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return function nextRandom() {
    value += 0x6d2b79f5;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function resetPlayer() {
  const spawn = levels[state.levelIndex].spawn;
  state.player = {
    position: spawn.clone(),
    velocity: new THREE.Vector3(),
    verticalVelocity: 0,
    height: 0,
    angle: 0,
    health: 100,
    energy: 100,
    glitch: 0,
    dashTimer: 0,
    dashCooldown: 0,
    attackCooldown: 0,
    jumpCooldown: 0,
    hurtCooldown: 0,
    invulnerable: 0,
    timeSlow: 0,
    timeCooldown: 0,
    transformTimer: 0,
    runCycle: 0
  };
}

function startGame() {
  state.mode = "play";
  state.levelIndex = 0;
  resetPlayer();
  createWorld(0);
  placeCarlos();
  ui.startScreen.hidden = true;
  ui.ending.hidden = true;
  ui.hud.hidden = false;
  showToast("The 3D simulation accepts Carlos.");
  updateHud();
}

function restartGame() {
  startGame();
}

function loadLevel(levelIndex) {
  state.levelIndex = levelIndex;
  createWorld(levelIndex);
  resetPlayer();
  state.player.health = clamp(state.player.health + 20, 0, 100);
  state.player.energy = 100;
  state.cameraShake = 0.45;
  placeCarlos();
  showToast(levels[levelIndex].name);
}

function placeCarlos() {
  const player = state.player;
  const carlos = state.carlos;
  if (!carlos) return;
  carlos.group.position.set(player.position.x, player.height, player.position.z);
}

function keyName(event) {
  return event.key.length === 1 ? event.key.toLowerCase() : event.key;
}

function onKeyDown(event) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  if (state.mode === "title" && (event.key === "Enter" || event.key === " ")) {
    startGame();
    return;
  }
  const name = keyName(event);
  keys.add(name);
  if (!event.repeat) pressed[name] = true;
}

function onKeyUp(event) {
  keys.delete(keyName(event));
}

function onPointerMove(event) {
  const bounds = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  mouse.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
  pointer.hasTarget = true;
}

function onPointerDown(event) {
  onPointerMove(event);
  if (state.mode === "title") {
    startGame();
    return;
  }
  pressed.attack = true;
}

function update(deltaTime) {
  state.elapsed += deltaTime;
  if (state.mode === "play") {
    updatePlayer(deltaTime);
    updateNodes(deltaTime);
    updateEnemies(deltaTime);
    updateBoss(deltaTime);
    updateHazards(deltaTime);
    updateProjectiles(deltaTime);
    updateParticles(deltaTime);
    updateRingEffects(deltaTime);
    updateCamera(deltaTime);
    updateHud();
  } else {
    updateAmbient(deltaTime);
  }

  animateWorld(deltaTime);
  clearPressed();
}

function updatePlayer(deltaTime) {
  const player = state.player;
  const level = state.currentLevel;
  const movement = new THREE.Vector3();

  if (keys.has("w") || keys.has("ArrowUp")) movement.z -= 1;
  if (keys.has("s") || keys.has("ArrowDown")) movement.z += 1;
  if (keys.has("a") || keys.has("ArrowLeft")) movement.x -= 1;
  if (keys.has("d") || keys.has("ArrowRight")) movement.x += 1;

  if (movement.lengthSq() > 0) {
    movement.normalize();
    player.angle = Math.atan2(movement.x, movement.z);
  }

  player.dashCooldown = Math.max(0, player.dashCooldown - deltaTime);
  player.attackCooldown = Math.max(0, player.attackCooldown - deltaTime);
  player.jumpCooldown = Math.max(0, player.jumpCooldown - deltaTime);
  player.hurtCooldown = Math.max(0, player.hurtCooldown - deltaTime);
  player.invulnerable = Math.max(0, player.invulnerable - deltaTime);
  player.timeCooldown = Math.max(0, player.timeCooldown - deltaTime);
  player.timeSlow = Math.max(0, player.timeSlow - deltaTime);
  player.transformTimer = Math.max(0, player.transformTimer - deltaTime);

  const transformed = player.transformTimer > 0;
  const targetSpeed = transformed ? 19 : 14;
  const targetVelocity = movement.multiplyScalar(targetSpeed);
  player.velocity.x = smooth(player.velocity.x, targetVelocity.x, movement.lengthSq() > 0 ? 13 : 9, deltaTime);
  player.velocity.z = smooth(player.velocity.z, targetVelocity.z, movement.lengthSq() > 0 ? 13 : 9, deltaTime);

  if ((pressed.Shift || pressed.shift) && player.energy >= 12 && player.dashCooldown <= 0) {
    const dashDirection = movement.lengthSq() > 0 ? movement.clone().normalize() : new THREE.Vector3(Math.sin(player.angle), 0, Math.cos(player.angle));
    player.velocity.addScaledVector(dashDirection, 34);
    player.energy -= 12;
    player.dashCooldown = transformed ? 0.42 : 0.62;
    player.invulnerable = 0.22;
    player.dashTimer = 0.22;
    state.cameraShake = Math.max(state.cameraShake, 0.18);
    spawnBurst(player.position, transformed ? colors.pink : colors.cyan, 24, 13);
    spawnRing(player.position, transformed ? colors.pink : colors.cyan, 1.1, 7.8, 0.32);
  }

  if (pressed[" "] && player.height <= 0.02 && player.jumpCooldown <= 0) {
    player.verticalVelocity = 12.5;
    player.jumpCooldown = 0.58;
    spawnRing(player.position, colors.green, 0.8, 4.6, 0.38);
  }

  if ((pressed.q || pressed.Q) && player.energy >= 30 && player.timeCooldown <= 0) {
    player.energy -= 30;
    player.timeSlow = transformed ? 5.6 : 3.8;
    player.timeCooldown = 8;
    state.cameraShake = Math.max(state.cameraShake, 0.3);
    spawnRing(player.position, colors.cyan, 1.4, 15, 0.8);
    showToast("Time distortion online.");
  }

  if ((pressed.j || pressed.attack) && player.attackCooldown <= 0) {
    fireRingPulse();
  }

  if ((pressed.e || pressed.Enter) && interact()) {
    return;
  }

  player.position.addScaledVector(player.velocity, deltaTime);
  player.velocity.multiplyScalar(Math.pow(0.02, deltaTime));
  player.height += player.verticalVelocity * deltaTime;
  player.verticalVelocity -= 32 * deltaTime;
  if (player.height < 0) {
    player.height = 0;
    player.verticalVelocity = 0;
  }

  const halfSize = level.size * 0.5 - 2.5;
  player.position.x = clamp(player.position.x, -halfSize, halfSize);
  player.position.z = clamp(player.position.z, -halfSize, halfSize);
  player.energy = clamp(player.energy + deltaTime * (transformed ? 13 : 7), 0, 100);
  player.runCycle += Math.max(1.8, player.velocity.length() * 1.4) * deltaTime;

  if (player.glitch >= 100 && player.transformTimer <= 0) {
    player.glitch = 0;
    player.transformTimer = 9;
    player.energy = 100;
    player.health = clamp(player.health + 20, 0, 100);
    state.cameraShake = 0.66;
    spawnBurst(player.position, colors.pink, 100, 18);
    spawnRing(player.position, colors.pink, 1.6, 18, 1);
    showToast("Glitch transformation online.");
  }

  placeCarlos();
  animateCarlos(deltaTime);

  if (player.health <= 0) {
    showToast("Carlos recompiled at the layer edge.");
    loadLevel(state.levelIndex);
  }
}

function fireRingPulse() {
  const player = state.player;
  const transformed = player.transformTimer > 0;
  const cost = transformed ? 5 : 16;
  if (player.energy < cost) {
    showToast("The ring needs charge.");
    return;
  }

  player.energy -= cost;
  player.attackCooldown = transformed ? 0.18 : 0.35;
  updateMouseWorld();
  const aim = pointer.hasTarget ? mouseWorld.clone().sub(player.position) : new THREE.Vector3(Math.sin(player.angle), 0, Math.cos(player.angle));
  aim.y = 0;
  if (aim.lengthSq() < 0.01) aim.set(Math.sin(player.angle), 0, Math.cos(player.angle));
  aim.normalize();
  player.angle = Math.atan2(aim.x, aim.z);

  const range = transformed ? 9.6 : 7.4;
  const damage = transformed ? 42 : 25;
  spawnRing(player.position, transformed ? colors.pink : colors.cyan, 0.9, range, 0.28);
  spawnBurst(player.position.clone().addScaledVector(aim, 1.2), transformed ? colors.pink : colors.cyan, 28, 16);

  state.enemies.forEach((enemy) => {
    const enemyOffset = enemy.group.position.clone().sub(player.position);
    enemyOffset.y = 0;
    const distance = enemyOffset.length();
    const dot = enemyOffset.normalize().dot(aim);
    if (distance < range && dot > 0.12) {
      damageEnemy(enemy, damage, aim);
    }
  });

  if (state.boss && !state.boss.dead) {
    const bossOffset = state.boss.group.position.clone().sub(player.position);
    bossOffset.y = 0;
    const bossDistance = bossOffset.length();
    const bossDot = bossOffset.normalize().dot(aim);
    if (bossDistance < range + 2.4 && bossDot > -0.18) {
      state.boss.health -= transformed ? 28 : 16;
      state.boss.hurtTimer = 0.22;
      state.cameraShake = Math.max(state.cameraShake, 0.35);
      spawnBurst(state.boss.group.position, colors.red, 42, 18);
      if (state.boss.health <= 0) {
        state.boss.dead = true;
        state.boss.group.visible = false;
        player.glitch = 100;
        spawnBurst(state.boss.group.position, colors.gold, 140, 28);
        spawnRing(state.boss.group.position, colors.gold, 2, 24, 1.1);
        showToast("Rickr has been destabilized.");
      }
    }
  }
}

function interact() {
  const player = state.player;
  for (const node of state.nodes) {
    if (node.active) continue;
    if (node.group.position.distanceTo(player.position) < 3.2) {
      activateNode(node);
      return true;
    }
  }

  if (portalReady() && state.portal.group.position.distanceTo(player.position) < 3.5) {
    if (state.levelIndex >= levels.length - 1) {
      finishGame();
    } else {
      loadLevel(state.levelIndex + 1);
    }
    return true;
  }

  return false;
}

function activateNode(node) {
  node.active = true;
  node.pulse = 1;
  node.core.material.color.setHex(colors.white);
  node.core.material.emissive.setHex(state.currentLevel.palette.secondary);
  node.light.color.setHex(state.currentLevel.palette.secondary);
  node.light.intensity = 3.6;
  state.player.energy = clamp(state.player.energy + 24, 0, 100);
  state.player.glitch = clamp(state.player.glitch + 28, 0, 100);
  state.cameraShake = Math.max(state.cameraShake, 0.28);
  spawnBurst(node.group.position, state.currentLevel.palette.secondary, 48, 12);
  spawnRing(node.group.position, state.currentLevel.palette.secondary, 0.8, 6.5, 0.72);
  showToast("Physics node rewritten.");
}

function updateNodes(deltaTime) {
  state.nodes.forEach((node) => {
    node.pulse = Math.max(0, node.pulse - deltaTime * 1.7);
    node.group.position.y = Math.sin(state.elapsed * 1.7 + node.group.userData.nodeIndex) * 0.18;
    node.core.rotation.y += deltaTime * (node.active ? 1.8 : 0.8);
    node.ringOne.rotation.z += deltaTime * (node.active ? 1.9 : 0.7);
    node.ringTwo.rotation.x += deltaTime * (node.active ? 1.3 : 0.5);
    const scale = 1 + node.pulse * 0.55 + Math.sin(state.elapsed * 3) * 0.025;
    node.group.scale.setScalar(scale);
  });

  state.portal.active = portalReady();
  state.portal.light.intensity = state.portal.active ? 4.2 : 0.28;
  state.portal.outer.material.opacity = state.portal.active ? 0.86 : 0.25;
  state.portal.inner.material.opacity = state.portal.active ? 0.6 : 0.18;
}

function updateEnemies(deltaTime) {
  const player = state.player;
  const timeScale = player.timeSlow > 0 ? 0.34 : 1;
  const scaledDelta = deltaTime * timeScale;
  const survivors = [];

  state.enemies.forEach((enemy) => {
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - deltaTime);
    enemy.attackTimer -= scaledDelta;
    const enemyPosition = enemy.group.position;
    const toPlayer = player.position.clone().sub(enemyPosition);
    toPlayer.y = 0;
    const distance = Math.max(0.001, toPlayer.length());
    const pursuitDirection = toPlayer.normalize();
    const desired = distance > 3.1 ? pursuitDirection.clone().multiplyScalar(enemy.speed) : pursuitDirection.clone().multiplyScalar(-enemy.speed * 0.35);
    enemy.velocity.x = smooth(enemy.velocity.x, desired.x, 4.8, scaledDelta);
    enemy.velocity.z = smooth(enemy.velocity.z, desired.z, 4.8, scaledDelta);
    enemyPosition.addScaledVector(enemy.velocity, scaledDelta);
    enemy.group.rotation.y = smooth(enemy.group.rotation.y, Math.atan2(enemy.velocity.x, enemy.velocity.z), 8, deltaTime);
    enemy.body.rotation.y += scaledDelta * 2;
    enemy.ring.rotation.z += scaledDelta * 2.4;
    enemy.group.position.y = Math.sin(state.elapsed * 3 + enemy.maxHealth) * 0.18;
    enemy.body.material.emissiveIntensity = enemy.hurtTimer > 0 ? 2.8 : 0.9;

    if (distance < 1.75 && player.invulnerable <= 0 && player.height < 1.4) {
      hurtPlayer(10);
      player.velocity.addScaledVector(pursuitDirection, 14);
    }

    if (enemy.attackTimer <= 0 && distance < 24) {
      enemy.attackTimer = enemy.maxHealth > 70 ? 1.1 : 1.55;
      spawnProjectile(enemy.group.position.clone().add(new THREE.Vector3(0, 1.2, 0)), pursuitDirection, state.currentLevel.palette.enemy, enemy.maxHealth > 70 ? 13 : 9);
    }

    if (enemy.health > 0) survivors.push(enemy);
    else {
      actorGroup.remove(enemy.group);
      disposeObject(enemy.group);
      player.energy = clamp(player.energy + 12, 0, 100);
      player.glitch = clamp(player.glitch + 18, 0, 100);
      spawnBurst(enemy.group.position, state.currentLevel.palette.secondary, 50, 17);
    }
  });

  state.enemies = survivors;
}

function damageEnemy(enemy, damage, direction) {
  enemy.health -= damage;
  enemy.hurtTimer = 0.18;
  enemy.velocity.addScaledVector(direction, 16);
  spawnBurst(enemy.group.position, state.currentLevel.palette.enemy, 18, 12);
  state.cameraShake = Math.max(state.cameraShake, 0.2);
}

function updateBoss(deltaTime) {
  const boss = state.boss;
  if (!boss || boss.dead) return;
  const player = state.player;
  const timeScale = player.timeSlow > 0 ? 0.34 : 1;
  boss.attackTimer -= deltaTime * timeScale;
  boss.hurtTimer = Math.max(0, boss.hurtTimer - deltaTime);
  boss.group.position.y = Math.sin(state.elapsed * 2.2) * 0.35;
  boss.core.rotation.y += deltaTime * 0.8;
  boss.core.material.emissiveIntensity = boss.hurtTimer > 0 ? 3.5 : 1.9;
  boss.rings.forEach((ring, ringIndex) => {
    ring.rotation.x += deltaTime * (0.65 + ringIndex * 0.18);
    ring.rotation.y += deltaTime * (0.35 + ringIndex * 0.12);
  });

  if (boss.attackTimer <= 0) {
    boss.attackTimer = boss.health < boss.maxHealth * 0.45 ? 0.78 : 1.2;
    const count = boss.health < boss.maxHealth * 0.45 ? 14 : 10;
    const baseAngle = Math.atan2(player.position.x - boss.group.position.x, player.position.z - boss.group.position.z);
    for (let shotIndex = 0; shotIndex < count; shotIndex += 1) {
      const angle = baseAngle + (shotIndex / count - 0.5) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
      spawnProjectile(boss.group.position.clone().add(new THREE.Vector3(0, 2.1, 0)), direction, colors.red, 12);
    }
    spawnRing(boss.group.position, colors.red, 1.4, 10, 0.56);
    state.cameraShake = Math.max(state.cameraShake, 0.25);
  }

  if (boss.group.position.distanceTo(player.position) < 3.5 && player.invulnerable <= 0 && player.height < 1.6) {
    hurtPlayer(15);
  }
}

function updateHazards(deltaTime) {
  const player = state.player;
  state.hazards.forEach((hazard) => {
    hazard.phase += deltaTime * (player.timeSlow > 0 ? 0.55 : 1.7);
    const pulse = 0.78 + Math.sin(hazard.phase) * 0.22;
    hazard.ring.scale.setScalar(pulse);
    hazard.ring.rotation.z += deltaTime * 0.9;
    if (hazard.group.position.distanceTo(player.position) < hazard.radius * pulse && player.invulnerable <= 0 && player.height < 1.2) {
      hurtPlayer(deltaTime * 34);
    }
  });
}

function spawnProjectile(position, direction, color, damage) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), makeBasic(color, 0.92));
  mesh.position.copy(position);
  effectGroup.add(mesh);
  state.projectiles.push({
    mesh,
    velocity: direction.clone().multiplyScalar(15 + damage * 0.3),
    life: 3.5,
    damage,
    color
  });
}

function updateProjectiles(deltaTime) {
  const player = state.player;
  const timeScale = player.timeSlow > 0 ? 0.34 : 1;
  const scaledDelta = deltaTime * timeScale;
  const survivors = [];
  state.projectiles.forEach((projectile) => {
    projectile.life -= deltaTime;
    projectile.mesh.position.addScaledVector(projectile.velocity, scaledDelta);
    projectile.mesh.scale.setScalar(1 + Math.sin(state.elapsed * 12) * 0.16);
    const hitDistance = projectile.mesh.position.distanceTo(player.position.clone().add(new THREE.Vector3(0, 1, 0)));
    if (projectile.life > 0 && hitDistance < 1.05 && player.invulnerable <= 0) {
      hurtPlayer(projectile.damage);
      projectile.life = 0;
      spawnBurst(projectile.mesh.position, projectile.color, 16, 9);
    }
    if (projectile.life > 0) survivors.push(projectile);
    else {
      effectGroup.remove(projectile.mesh);
      disposeObject(projectile.mesh);
    }
  });
  state.projectiles = survivors;
}

function hurtPlayer(amount) {
  const player = state.player;
  if (player.invulnerable > 0 || player.transformTimer > 0) return;
  player.health = clamp(player.health - amount, 0, 100);
  player.hurtCooldown = 0.24;
  player.invulnerable = 0.22;
  state.cameraShake = Math.max(state.cameraShake, 0.34);
  spawnBurst(player.position, colors.red, 18, 11);
}

function spawnParticle(position, color, velocity, life, size) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), makeBasic(color, 0.82));
  mesh.position.copy(position).add(new THREE.Vector3(0, 0.5 + Math.random() * 1.2, 0));
  effectGroup.add(mesh);
  state.particles.push({ mesh, velocity, life, age: 0, color });
}

function spawnBurst(position, color, count, speed) {
  for (let particleIndex = 0; particleIndex < count; particleIndex += 1) {
    const angle = Math.random() * Math.PI * 2;
    const upward = 2 + Math.random() * 8;
    const velocity = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(speed * (0.25 + Math.random() * 0.75));
    velocity.y = upward;
    spawnParticle(position, color, velocity, 0.45 + Math.random() * 0.45, 0.055 + Math.random() * 0.08);
  }
}

function updateParticles(deltaTime) {
  const survivors = [];
  state.particles.forEach((particle) => {
    particle.age += deltaTime;
    particle.mesh.position.addScaledVector(particle.velocity, deltaTime);
    particle.velocity.y -= 18 * deltaTime;
    particle.velocity.multiplyScalar(Math.pow(0.12, deltaTime));
    const lifeRatio = 1 - particle.age / particle.life;
    particle.mesh.material.opacity = clamp(lifeRatio, 0, 1) * 0.82;
    particle.mesh.scale.setScalar(0.65 + lifeRatio * 0.75);
    if (particle.age < particle.life) survivors.push(particle);
    else {
      effectGroup.remove(particle.mesh);
      disposeObject(particle.mesh);
    }
  });
  state.particles = survivors;
}

function spawnRing(position, color, fromScale, toScale, life) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 10, 90), makeBasic(color, 0.72));
  mesh.rotation.x = Math.PI * 0.5;
  mesh.position.copy(position);
  mesh.position.y = 0.12;
  mesh.scale.setScalar(fromScale);
  effectGroup.add(mesh);
  state.ringEffects.push({ mesh, fromScale, toScale, age: 0, life });
}

function updateRingEffects(deltaTime) {
  const survivors = [];
  state.ringEffects.forEach((ringEffect) => {
    ringEffect.age += deltaTime;
    const progress = clamp(ringEffect.age / ringEffect.life, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    ringEffect.mesh.scale.setScalar(ringEffect.fromScale + (ringEffect.toScale - ringEffect.fromScale) * eased);
    ringEffect.mesh.material.opacity = (1 - progress) * 0.72;
    if (ringEffect.age < ringEffect.life) survivors.push(ringEffect);
    else {
      effectGroup.remove(ringEffect.mesh);
      disposeObject(ringEffect.mesh);
    }
  });
  state.ringEffects = survivors;
}

function animateCarlos(deltaTime) {
  const player = state.player;
  const carlos = state.carlos;
  if (!carlos) return;
  const transformed = player.transformTimer > 0;
  const speed = player.velocity.length();
  const swing = Math.sin(player.runCycle) * clamp(speed / 12, 0, 1);
  carlos.group.position.set(player.position.x, player.height, player.position.z);
  carlos.group.rotation.y = smooth(carlos.group.rotation.y, player.angle, 10, deltaTime);
  carlos.body.position.y = 1.3 + Math.sin(state.elapsed * 3) * 0.03;
  carlos.head.position.y = 2.32 + Math.sin(state.elapsed * 2.2) * 0.035;
  carlos.halo.rotation.z += deltaTime * (transformed ? 3.2 : 1.4);
  carlos.halo.material.opacity = transformed ? 0.78 : 0.42;
  carlos.energyMaterial.color.setHex(transformed ? colors.gold : colors.pink);
  carlos.bodyMaterial.emissive.setHex(transformed ? colors.pink : colors.cyan);
  carlos.bodyMaterial.emissiveIntensity = transformed ? 1.2 : player.hurtCooldown > 0 ? 1.8 : 0.45;

  carlos.leftArm.position.set(-0.5, 1.35, -0.04);
  carlos.rightArm.position.set(0.62, 1.35, -0.07);
  carlos.leftLeg.position.set(-0.24, 0.56, 0.02);
  carlos.rightLeg.position.set(0.24, 0.56, 0.02);
  carlos.leftArm.rotation.set(0.15 + swing * 0.5, 0, 0.45);
  carlos.rightArm.rotation.set(-0.25 - swing * 0.5, 0, -0.55);
  carlos.leftLeg.rotation.set(-swing * 0.55, 0, 0.08);
  carlos.rightLeg.rotation.set(swing * 0.55, 0, -0.08);
  carlos.ring.rotation.z += deltaTime * (transformed ? 8 : 4);
}

function animateWorld(deltaTime) {
  worldGroup.children.forEach((child) => {
    if (!child.userData || !child.userData.spin) return;
    child.rotation.x += child.userData.spin.x * deltaTime;
    child.rotation.y += child.userData.spin.y * deltaTime;
    child.rotation.z += child.userData.spin.z * deltaTime;
    child.position.y = child.userData.baseY + Math.sin(state.elapsed * 1.4 + child.userData.phase) * 0.28;
  });

  if (state.portal) {
    const portalSpeed = state.portal.active ? 1.8 : 0.45;
    state.portal.outer.rotation.z += deltaTime * portalSpeed;
    state.portal.inner.rotation.y += deltaTime * portalSpeed * 1.5;
    state.portal.group.scale.setScalar(state.portal.active ? 1 + Math.sin(state.elapsed * 3) * 0.06 : 0.9);
  }
}

function updateCamera(deltaTime) {
  const player = state.player;
  const forward = new THREE.Vector3(Math.sin(player.angle), 0, Math.cos(player.angle));
  const side = new THREE.Vector3(forward.z, 0, -forward.x);
  const target = player.position.clone().add(new THREE.Vector3(0, 2.2, 0));
  const cameraTarget = player.position.clone()
    .addScaledVector(forward, -9.5)
    .addScaledVector(side, 2.1)
    .add(new THREE.Vector3(0, 7.4, 0));
  const shake = state.cameraShake * state.cameraShake;
  state.cameraShake = Math.max(0, state.cameraShake - deltaTime * 0.65);
  cameraTarget.x += (Math.random() - 0.5) * shake;
  cameraTarget.y += (Math.random() - 0.5) * shake;
  cameraTarget.z += (Math.random() - 0.5) * shake;
  camera.position.lerp(cameraTarget, 1 - Math.exp(-5.4 * deltaTime));
  camera.lookAt(target);
}

function updateAmbient(deltaTime) {
  camera.position.x = smooth(camera.position.x, Math.sin(state.elapsed * 0.25) * 18, 1.2, deltaTime);
  camera.position.y = smooth(camera.position.y, 11 + Math.sin(state.elapsed * 0.2) * 1.2, 1.2, deltaTime);
  camera.position.z = smooth(camera.position.z, 22 + Math.cos(state.elapsed * 0.18) * 8, 1.2, deltaTime);
  camera.lookAt(0, 1.6, 0);
}

function updateMouseWorld() {
  if (!pointer.hasTarget) return;
  raycaster.setFromCamera(mouse, camera);
  raycaster.ray.intersectPlane(groundPlane, mouseWorld);
}

function portalReady() {
  const nodesReady = state.nodes.length > 0 && state.nodes.every((node) => node.active);
  const bossReady = !state.boss || state.boss.dead;
  return nodesReady && bossReady;
}

function updateHud() {
  const player = state.player;
  const level = state.currentLevel;
  if (!player || !level) return;
  const activeNodes = state.nodes.filter((node) => node.active).length;
  ui.zoneName.textContent = level.name;
  ui.healthBar.style.transform = `scaleX(${clamp(player.health / 100, 0, 1)})`;
  ui.energyBar.style.transform = `scaleX(${clamp(player.energy / 100, 0, 1)})`;
  ui.glitchBar.style.transform = `scaleX(${clamp(player.glitch / 100, 0, 1)})`;

  if (player.transformTimer > 0) {
    ui.systemState.textContent = "GLITCH FORM";
    ui.systemState.style.color = "#ff4edb";
  } else if (player.timeSlow > 0) {
    ui.systemState.textContent = "TIME BENT";
    ui.systemState.style.color = "#63f3ff";
  } else {
    ui.systemState.textContent = level.system;
    ui.systemState.style.color = level.system === "CRITICAL" ? "#ff335f" : level.system === "CORRUPTING" ? "#ffd166" : "#74ffb7";
  }

  if (state.boss && !state.boss.dead && activeNodes === state.nodes.length) {
    ui.objective.textContent = `Rickr exposed. Core integrity ${Math.ceil((state.boss.health / state.boss.maxHealth) * 100)}%.`;
  } else if (portalReady()) {
    ui.objective.textContent = "Portal unlocked. Cross to the next simulation layer.";
  } else {
    ui.objective.textContent = `${level.objective} ${activeNodes}/${state.nodes.length}`;
  }

  ui.prompt.textContent = findPrompt();
  state.toastTimer = Math.max(0, state.toastTimer - 1 / 60);
  ui.toast.classList.toggle("visible", state.toastTimer > 0);
}

function findPrompt() {
  const player = state.player;
  for (const node of state.nodes) {
    if (!node.active && node.group.position.distanceTo(player.position) < 3.2) {
      return "Rewrite physics node";
    }
  }
  if (portalReady() && state.portal.group.position.distanceTo(player.position) < 3.5) {
    return state.levelIndex === levels.length - 1 ? "Exit Core System Layer" : "Enter next layer";
  }
  if (state.boss && !state.boss.dead && state.boss.group.position.distanceTo(player.position) < 8) {
    return "Rickr core is watching";
  }
  return "";
}

function showToast(message) {
  ui.toast.textContent = message;
  state.toastTimer = 2.4;
}

function finishGame() {
  state.mode = "ending";
  ui.hud.hidden = true;
  ui.ending.hidden = false;
  state.cameraShake = 0.72;
  spawnBurst(state.player.position, colors.gold, 140, 24);
  spawnRing(state.player.position, colors.gold, 2, 26, 1.1);
}

function clearPressed() {
  Object.keys(pressed).forEach((name) => {
    pressed[name] = false;
  });
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function render() {
  const deltaTime = Math.min(clock.getDelta(), 0.033);
  update(deltaTime);
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function init() {
  resize();
  resetPlayer();
  createWorld(0);
  placeCarlos();
  camera.position.set(-12, 10, 24);
  camera.lookAt(0, 1.5, 0);
  ui.startButton.addEventListener("click", startGame);
  ui.restartButton.addEventListener("click", restartGame);
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerdown", onPointerDown);
  requestAnimationFrame(render);
}

init();
