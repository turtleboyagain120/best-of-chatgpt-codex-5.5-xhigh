import * as THREE from "three";

const canvas = document.querySelector("#game");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const bootScreen = document.querySelector("#boot-screen");
const endScreen = document.querySelector("#end-screen");
const hud = document.querySelector("#hud");
const reticle = document.querySelector("#reticle");
const healthBar = document.querySelector("#health-bar");
const energyBar = document.querySelector("#energy-bar");
const runTimeEl = document.querySelector("#run-time");
const zoneNameEl = document.querySelector("#zone-name");
const objectiveTextEl = document.querySelector("#objective-text");
const nodeCountEl = document.querySelector("#node-count");
const interactPrompt = document.querySelector("#interact-prompt");
const dialogueEl = document.querySelector("#dialogue");
const powerStateEl = document.querySelector("#power-state");
const shiftStateEl = document.querySelector("#shift-state");
const endSummaryEl = document.querySelector("#end-summary");
const debugStateEl = document.querySelector("#carlos-debug");
const debugPreviewEl = document.querySelector("#carlos-preview");

const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const smoothstep = THREE.MathUtils.smoothstep;
const tmpVec = new THREE.Vector3();
const tmpVec2 = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(64, window.innerWidth / window.innerHeight, 0.1, 900);
const clock = new THREE.Clock();
let frameCount = 0;

const materials = {
  carlosSuit: new THREE.MeshStandardMaterial({
    color: 0x151e2d,
    metalness: 0.72,
    roughness: 0.28,
    emissive: 0x071526,
    emissiveIntensity: 0.6
  }),
  carlosGlow: new THREE.MeshStandardMaterial({
    color: 0x5beaff,
    emissive: 0x36e7ff,
    emissiveIntensity: 2.8,
    roughness: 0.18,
    metalness: 0.5
  }),
  ring: new THREE.MeshStandardMaterial({
    color: 0xffd86b,
    emissive: 0xffa300,
    emissiveIntensity: 2.7,
    roughness: 0.16,
    metalness: 0.95
  }),
  pulse: new THREE.MeshBasicMaterial({
    color: 0x70f7ff,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }),
  node: new THREE.MeshStandardMaterial({
    color: 0x62f7ff,
    emissive: 0x00d9ff,
    emissiveIntensity: 2.2,
    roughness: 0.25,
    metalness: 0.5
  }),
  nodeDone: new THREE.MeshStandardMaterial({
    color: 0xffd15c,
    emissive: 0xffa000,
    emissiveIntensity: 2.4,
    roughness: 0.18,
    metalness: 0.5
  }),
  enemy: new THREE.MeshStandardMaterial({
    color: 0x221322,
    emissive: 0xff225c,
    emissiveIntensity: 1.9,
    roughness: 0.36,
    metalness: 0.55
  }),
  hazard: new THREE.MeshBasicMaterial({
    color: 0xff2458,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }),
  portal: new THREE.MeshBasicMaterial({
    color: 0x9bf6ff,
    transparent: true,
    opacity: 0.74,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
};

const storyLines = [
  "The notepad equation wakes: 2=l symbolic stuff x.2=l.",
  "A voice under the earth names itself Rickr. The simulation pretends not to hear.",
  "The cosmic AI army is moving physics like pieces on a board.",
  "Carlos is not escaping the collapse. He is rewriting it."
];

const levelDefs = [
  {
    name: "Stable Simulation Zone",
    objective: "Stabilize the citylike simulation grid",
    sky: 0x07131f,
    fog: 0x0b1a2d,
    floor: 0x11263f,
    accent: 0x5beaff,
    accent2: 0xffd15c,
    start: new THREE.Vector3(0, 3, 18),
    portal: new THREE.Vector3(0, 2, -86),
    nodes: [
      [-18, 1.8, -12],
      [22, 1.8, -30],
      [-30, 1.8, -51],
      [25, 1.8, -66],
      [0, 1.8, -76]
    ],
    enemies: [
      [-22, 3, -31, "drone"],
      [24, 3, -50, "sentinel"],
      [-4, 3, -70, "drone"]
    ],
    hazards: [
      [0, 0.25, -42, 4.2],
      [16, 0.25, -72, 3.2]
    ],
    platforms: [
      [0, -0.35, -34, 76, 0.7, 112],
      [0, 1.2, -62, 22, 0.7, 16],
      [-24, 2.2, -44, 18, 0.7, 14],
      [27, 1.8, -25, 20, 0.7, 16]
    ],
    shiftPlatforms: [
      [0, 6.5, -25, 16, 0.55, 12],
      [-15, 7.8, -67, 14, 0.55, 12]
    ],
    quote: "<strong>Notepad Kid:</strong> The grid is too clean. That means it is lying."
  },
  {
    name: "Corrupted Zone",
    objective: "Reassemble broken physics from glitch nodes",
    sky: 0x150716,
    fog: 0x22051d,
    floor: 0x2a1633,
    accent: 0xff4fe1,
    accent2: 0x63ff9c,
    start: new THREE.Vector3(0, 5, 12),
    portal: new THREE.Vector3(7, 6, -105),
    nodes: [
      [-24, 3.4, -8],
      [16, 5.2, -28],
      [-34, 7.8, -47],
      [30, 8.8, -60],
      [-12, 10.6, -82],
      [11, 7.2, -96]
    ],
    enemies: [
      [4, 6, -24, "drone"],
      [-28, 9, -50, "sentinel"],
      [26, 10, -74, "drone"],
      [-4, 9, -92, "sentinel"]
    ],
    hazards: [
      [-8, 3.2, -25, 5.3],
      [21, 5.2, -44, 4],
      [-21, 8.2, -72, 5]
    ],
    platforms: [
      [0, 1.5, -18, 64, 0.8, 52],
      [-28, 5.8, -48, 22, 0.7, 20],
      [26, 7.0, -62, 22, 0.7, 20],
      [-8, 9.2, -84, 30, 0.7, 18],
      [12, 6.0, -100, 24, 0.7, 16]
    ],
    shiftPlatforms: [
      [6, 7.2, -38, 14, 0.55, 12],
      [-19, 9.4, -63, 16, 0.55, 12],
      [14, 11.5, -84, 12, 0.55, 12]
    ],
    quote: "<strong>Rickr:</strong> WE TRIED, IT WAS MELTING."
  },
  {
    name: "Core System Layer",
    objective: "Wake every core node and survive Rickr",
    sky: 0x060509,
    fog: 0x190509,
    floor: 0x291011,
    accent: 0xff3d58,
    accent2: 0x55e9ff,
    start: new THREE.Vector3(0, 8, 20),
    portal: new THREE.Vector3(0, 7.6, -118),
    nodes: [
      [-28, 7.8, -13],
      [30, 8.2, -26],
      [-32, 10.8, -48],
      [28, 11.8, -66],
      [-16, 13.4, -84],
      [17, 12.4, -101],
      [0, 14.2, -116]
    ],
    enemies: [
      [-12, 10, -23, "sentinel"],
      [22, 10, -41, "drone"],
      [-30, 13, -70, "drone"],
      [26, 14, -88, "sentinel"],
      [0, 16, -108, "drone"]
    ],
    hazards: [
      [0, 7.4, -18, 5.6],
      [0, 9.0, -54, 7.2],
      [0, 12.0, -96, 6.5]
    ],
    platforms: [
      [0, 5.7, -22, 70, 0.8, 62],
      [-30, 8.8, -52, 22, 0.7, 18],
      [30, 9.8, -66, 22, 0.7, 18],
      [-18, 11.6, -88, 24, 0.7, 18],
      [18, 10.6, -104, 24, 0.7, 18],
      [0, 12.2, -119, 32, 0.7, 18]
    ],
    shiftPlatforms: [
      [0, 9.5, -41, 18, 0.55, 12],
      [-2, 12.8, -74, 18, 0.55, 12],
      [0, 15.0, -102, 16, 0.55, 12]
    ],
    quote: "<strong>Rickr:</strong> Shall the light be darkened by 40%."
  }
];

const input = {
  keys: new Set(),
  mouseDown: false,
  locked: false,
  yaw: 0,
  pitch: -0.25,
  interact: false,
  justPulse: false,
  justShift: false,
  justSlow: false,
  justDash: false
};

const game = {
  started: false,
  completed: false,
  time: 0,
  realTime: 0,
  levelIndex: 0,
  levelTime: 0,
  timeScale: 1,
  slowTimer: 0,
  shiftTimer: 0,
  survivalTimer: 0,
  survivalGoal: 80,
  finalPhase: false,
  cameraShake: 0,
  interactTarget: null,
  audio: null,
  dialogueTimer: 0,
  currentDialogue: "",
  world: new THREE.Group(),
  decor: new THREE.Group(),
  dynamic: new THREE.Group(),
  platforms: [],
  shiftPlatforms: [],
  nodes: [],
  enemies: [],
  hazards: [],
  projectiles: [],
  particles: [],
  player: null,
  portal: null,
  rickr: null,
  ambientParticles: null,
  grid: null
};

scene.add(game.world);
game.world.add(game.decor);
game.world.add(game.dynamic);

const hemi = new THREE.HemisphereLight(0xbfeeff, 0x160818, 1.1);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffffff, 2.7);
sun.position.set(36, 72, 42);
sun.castShadow = true;
sun.shadow.camera.left = -130;
sun.shadow.camera.right = 130;
sun.shadow.camera.top = 130;
sun.shadow.camera.bottom = -130;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const playerLight = new THREE.PointLight(0x6feeff, 8, 22, 1.8);
scene.add(playerLight);

function makeGlitchMaterial(colorA, colorB, intensity = 1.2) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uIntensity: { value: intensity }
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vPulse;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float band = step(0.82, fract(pos.y * 1.7 + uTime * 2.3));
        pos.x += sin(pos.y * 6.0 + uTime * 4.0) * 0.035 * band;
        pos.z += cos(pos.x * 5.0 + uTime * 3.1) * 0.03;
        vPulse = band;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uIntensity;
      varying vec2 vUv;
      varying float vPulse;
      void main() {
        float scan = smoothstep(0.45, 0.52, sin((vUv.y + uTime * 0.16) * 78.0));
        vec3 color = mix(uColorA, uColorB, scan * 0.7 + vPulse * 0.3);
        float alpha = 0.34 + scan * 0.18 + vPulse * 0.22;
        gl_FragColor = vec4(color * uIntensity, alpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function makeStandard(color, emissive = color, emissiveIntensity = 0.3, metalness = 0.35, roughness = 0.38) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity,
    metalness,
    roughness
  });
}

function createCarlos() {
  const root = new THREE.Group();
  root.position.copy(levelDefs[0].start);
  root.rotation.y = Math.PI;

  const rig = {
    root,
    body: new THREE.Group(),
    leftArm: new THREE.Group(),
    rightArm: new THREE.Group(),
    leftLeg: new THREE.Group(),
    rightLeg: new THREE.Group(),
    ring: null,
    glowCore: null,
    velocity: new THREE.Vector3(),
    onGround: false,
    health: 100,
    energy: 55,
    maxEnergy: 100,
    power: 0,
    dashCooldown: 0,
    pulseCooldown: 0,
    invulnerable: 0,
    syncProgress: 0
  };

  root.add(rig.body);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.05, 7, 16), materials.carlosSuit);
  torso.position.y = 1.55;
  torso.castShadow = true;
  torso.receiveShadow = true;
  rig.body.add(torso);

  rig.glowCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), materials.carlosGlow);
  rig.glowCore.position.set(0, 1.72, 0.45);
  rig.body.add(rig.glowCore);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.43, 24, 18), materials.carlosSuit);
  head.position.y = 2.55;
  head.castShadow = true;
  rig.body.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.06), materials.carlosGlow);
  visor.position.set(0, 2.59, 0.38);
  rig.body.add(visor);

  addLimb(rig.leftArm, -0.72, 2.05, 0.04, 0.23, 0.92);
  addLimb(rig.rightArm, 0.72, 2.05, 0.04, 0.23, 0.92);
  addLimb(rig.leftLeg, -0.28, 0.86, 0, 0.27, 1.04);
  addLimb(rig.rightLeg, 0.28, 0.86, 0, 0.27, 1.04);
  rig.body.add(rig.leftArm, rig.rightArm, rig.leftLeg, rig.rightLeg);

  rig.ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.036, 10, 32), materials.ring);
  rig.ring.position.set(0.72, 1.62, 0.42);
  rig.ring.rotation.x = Math.PI / 2;
  rig.body.add(rig.ring);

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.015, 10, 72), materials.pulse.clone());
  halo.position.y = 1.58;
  halo.rotation.x = Math.PI / 2;
  halo.material.opacity = 0.24;
  rig.body.add(halo);
  rig.halo = halo;

  scene.add(root);
  return rig;
}

function addLimb(group, x, y, z, radius, length) {
  group.position.set(x, y, z);
  const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 5, 12), materials.carlosSuit);
  limb.position.y = -length * 0.42;
  limb.castShadow = true;
  group.add(limb);
  const strip = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, length * 0.8, 8), materials.carlosGlow);
  strip.position.set(0, -length * 0.42, radius * 0.94);
  strip.scale.x = 0.28;
  group.add(strip);
}

function createLevel(index) {
  const def = levelDefs[index];
  game.levelIndex = index;
  game.levelTime = 0;
  game.finalPhase = false;
  game.survivalTimer = 0;
  game.interactTarget = null;
  game.platforms = [];
  game.shiftPlatforms = [];
  game.nodes = [];
  game.enemies = [];
  game.hazards = [];
  game.projectiles = [];
  game.particles = [];
  game.rickr = null;
  game.portal = null;
  game.world.clear();
  game.decor = new THREE.Group();
  game.dynamic = new THREE.Group();
  game.world.add(game.decor, game.dynamic);

  scene.background = new THREE.Color(def.sky);
  scene.fog = new THREE.FogExp2(def.fog, index === 0 ? 0.011 : 0.015);
  sun.color.set(def.accent2);
  hemi.color.set(def.accent);
  hemi.groundColor.set(def.fog);

  createFloor(def);
  createPlatforms(def);
  createLevelDecor(def, index);
  createNodes(def);
  createEnemies(def);
  createHazards(def);
  createPortal(def);
  createAmbientParticles(def);

  if (index === 2) {
    createRickr(def);
  }

  if (!game.player) {
    game.player = createCarlos();
  }

  game.player.root.position.copy(def.start);
  game.player.velocity.set(0, 0, 0);
  game.player.onGround = false;
  game.player.syncProgress = 0;
  input.yaw = 0;
  input.pitch = -0.28;
  showDialogue(def.quote, 5.6);
  updateHud();
}

function createFloor(def) {
  const groundMat = makeStandard(def.floor, def.floor, 0.25, 0.4, 0.42);
  const ground = new THREE.Mesh(new THREE.BoxGeometry(140, 0.7, 170), groundMat);
  ground.position.set(0, -0.35, -46);
  ground.receiveShadow = true;
  game.decor.add(ground);
  game.platforms.push({ center: ground.position.clone(), size: new THREE.Vector3(140, 0.7, 170), active: true });

  game.grid = new THREE.GridHelper(140, 28, def.accent, def.accent2);
  game.grid.position.y = 0.035;
  game.grid.position.z = -46;
  game.grid.material.transparent = true;
  game.grid.material.opacity = 0.28;
  game.decor.add(game.grid);
}

function createPlatforms(def) {
  def.platforms.forEach((p, idx) => {
    const [x, y, z, w, h, d] = p;
    const mat = makeStandard(def.floor, def.accent, 0.42 + idx * 0.08, 0.42, 0.36);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    game.decor.add(mesh);
    game.platforms.push({ center: mesh.position.clone(), size: new THREE.Vector3(w, h, d), active: true, mesh });

    const edge = new THREE.EdgesGeometry(mesh.geometry);
    const lines = new THREE.LineSegments(
      edge,
      new THREE.LineBasicMaterial({ color: def.accent, transparent: true, opacity: 0.35 })
    );
    mesh.add(lines);
  });

  def.shiftPlatforms.forEach((p) => {
    const [x, y, z, w, h, d] = p;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      makeGlitchMaterial(def.accent2, def.accent, 1.8)
    );
    mesh.position.set(x, y, z);
    mesh.userData.baseY = y;
    mesh.castShadow = false;
    game.decor.add(mesh);
    game.shiftPlatforms.push({ center: mesh.position.clone(), size: new THREE.Vector3(w, h, d), active: false, mesh });
  });
}

function createLevelDecor(def, index) {
  const rngOffset = index * 991;
  const accentMat = makeStandard(def.accent, def.accent, 1.5, 0.55, 0.25);
  const secondMat = makeStandard(def.accent2, def.accent2, 1.3, 0.42, 0.28);
  const glassMat = makeGlitchMaterial(def.accent, def.accent2, 1.2);

  for (let i = 0; i < 28; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (44 + seeded(i + rngOffset) * 28);
    const z = -4 - seeded(i * 5 + rngOffset) * 120;
    const h = 5 + seeded(i * 7 + rngOffset) * (index === 0 ? 26 : 40);
    const w = 2 + seeded(i * 11 + rngOffset) * 4;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), i % 3 === 0 ? accentMat : secondMat);
    mesh.position.set(x, h * 0.5 - 0.2 + index * 1.5, z);
    mesh.rotation.y = index === 0 ? 0 : (seeded(i + 77) - 0.5) * 0.8;
    mesh.castShadow = true;
    game.decor.add(mesh);
  }

  for (let i = 0; i < 24; i++) {
    const geo = i % 3 === 0 ? new THREE.OctahedronGeometry(1.2 + seeded(i) * 1.4) : new THREE.TetrahedronGeometry(1.4 + seeded(i) * 1.3);
    const shard = new THREE.Mesh(geo, glassMat.clone());
    shard.position.set((seeded(i + 9) - 0.5) * 86, 6 + seeded(i + 5) * 24, -8 - seeded(i + 2) * 126);
    shard.rotation.set(seeded(i + 3) * TAU, seeded(i + 4) * TAU, seeded(i + 8) * TAU);
    shard.userData.spin = new THREE.Vector3(
      0.1 + seeded(i + 33) * 0.4,
      0.1 + seeded(i + 45) * 0.55,
      0.1 + seeded(i + 51) * 0.32
    );
    game.decor.add(shard);
  }

  if (index === 0) {
    for (let z = -10; z > -90; z -= 13) {
      const arch = new THREE.Group();
      const a = new THREE.Mesh(new THREE.BoxGeometry(1.2, 9, 1.2), accentMat);
      const b = a.clone();
      const c = new THREE.Mesh(new THREE.BoxGeometry(22, 1.1, 1.1), accentMat);
      a.position.set(-11, 4.5, 0);
      b.position.set(11, 4.5, 0);
      c.position.set(0, 9, 0);
      arch.position.z = z;
      arch.add(a, b, c);
      game.decor.add(arch);
    }
  }

  if (index === 1) {
    for (let i = 0; i < 14; i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(18 + seeded(i) * 28, 1.3), glassMat.clone());
      strip.position.set((seeded(i + 40) - 0.5) * 80, 3 + seeded(i + 18) * 22, -4 - seeded(i + 22) * 120);
      strip.rotation.set(seeded(i + 3) * 0.8, seeded(i + 8) * TAU, seeded(i + 12) * 0.9);
      game.decor.add(strip);
    }
  }

  if (index === 2) {
    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(18 + i * 6, 0.13, 8, 120),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? def.accent : def.accent2,
          transparent: true,
          opacity: 0.32,
          blending: THREE.AdditiveBlending
        })
      );
      ring.position.set(0, 8 + i * 1.2, -64 - i * 6);
      ring.rotation.x = Math.PI / 2 + i * 0.08;
      ring.userData.spinZ = (i % 2 ? -1 : 1) * (0.04 + i * 0.01);
      game.decor.add(ring);
    }
  }
}

function createNodes(def) {
  def.nodes.forEach((pos, index) => {
    const group = new THREE.Group();
    group.position.set(pos[0], pos[1], pos[2]);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 2), materials.node.clone());
    core.castShadow = true;
    group.add(core);
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.045, 8, 72), materials.pulse.clone());
    ring1.rotation.x = Math.PI / 2;
    ring1.material.color.set(def.accent);
    ring1.material.opacity = 0.5;
    group.add(ring1);
    const ring2 = ring1.clone();
    ring2.rotation.y = Math.PI / 2;
    ring2.material = ring1.material.clone();
    ring2.material.color.set(def.accent2);
    group.add(ring2);
    group.userData = {
      type: "node",
      index,
      done: false,
      sync: 0,
      baseY: pos[1],
      core,
      ring1,
      ring2
    };
    game.dynamic.add(group);
    game.nodes.push(group);
  });
}

function createEnemies(def) {
  def.enemies.forEach(([x, y, z, type], idx) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const bodyGeo = type === "sentinel" ? new THREE.BoxGeometry(1.8, 1.8, 1.8) : new THREE.OctahedronGeometry(1.15, 1);
    const body = new THREE.Mesh(bodyGeo, materials.enemy.clone());
    body.castShadow = true;
    group.add(body);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 12), materials.hazard.clone());
    eye.position.set(0, 0, 0.95);
    eye.material.opacity = 0.78;
    group.add(eye);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.045, 8, 64), materials.hazard.clone());
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.userData = {
      type,
      hp: type === "sentinel" ? 4 : 2,
      maxHp: type === "sentinel" ? 4 : 2,
      speed: type === "sentinel" ? 7 : 10,
      shootTimer: 1.5 + idx * 0.3,
      stun: 0,
      base: new THREE.Vector3(x, y, z),
      body,
      eye,
      ring
    };
    game.dynamic.add(group);
    game.enemies.push(group);
  });
}

function createHazards(def) {
  def.hazards.forEach(([x, y, z, r], idx) => {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 8, 112), materials.hazard.clone());
    ring.rotation.x = Math.PI / 2;
    ring.material.opacity = 0.36;
    group.add(ring);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.42, 12, 32, 1, true), makeGlitchMaterial(0xff315f, 0xffd15c, 1.5));
    column.position.y = 5;
    group.add(column);

    group.userData = { radius: r, pulse: idx * 0.8, ring, column };
    game.dynamic.add(group);
    game.hazards.push(group);
  });
}

function createPortal(def) {
  const group = new THREE.Group();
  group.position.copy(def.portal);
  const portalRing = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.14, 12, 128), materials.portal.clone());
  portalRing.rotation.y = Math.PI / 2;
  group.add(portalRing);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.6, 96), makeGlitchMaterial(def.accent, def.accent2, 2.3));
  disc.rotation.y = Math.PI / 2;
  group.add(disc);

  const beacon = new THREE.PointLight(def.accent, 7, 28, 1.7);
  group.add(beacon);
  group.userData = { ring: portalRing, disc, beacon, active: false };
  game.dynamic.add(group);
  game.portal = group;
}

function createRickr(def) {
  const group = new THREE.Group();
  group.position.set(0, 20, -125);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(9.5, 72, 48),
    new THREE.MeshStandardMaterial({
      color: 0xaa1018,
      emissive: 0xff1d28,
      emissiveIntensity: 3.2,
      roughness: 0.32,
      metalness: 0.18
    })
  );
  group.add(core);

  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(12 + i * 2.4, 0.08, 8, 128),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? def.accent2 : 0xffd15c,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
      })
    );
    ring.rotation.set(Math.PI / 2 + i * 0.35, i * 0.24, 0);
    ring.userData.spin = (i % 2 ? -1 : 1) * (0.16 + i * 0.04);
    group.add(ring);
  }

  const light = new THREE.PointLight(0xff3948, 32, 96, 1.4);
  group.add(light);
  group.userData = { core, light };
  game.dynamic.add(group);
  game.rickr = group;
}

function createAmbientParticles(def) {
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorA = new THREE.Color(def.accent);
  const colorB = new THREE.Color(def.accent2);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seeded(i * 3 + 3) - 0.5) * 180;
    positions[i * 3 + 1] = seeded(i * 5 + 11) * 72;
    positions[i * 3 + 2] = 30 - seeded(i * 7 + 23) * 210;
    const c = seeded(i) > 0.55 ? colorA : colorB;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  game.ambientParticles = new THREE.Points(geometry, mat);
  game.decor.add(game.ambientParticles);
}

function seeded(n) {
  return fract(Math.sin(n * 12.9898) * 43758.5453);
}

function fract(n) {
  return n - Math.floor(n);
}

function startGame() {
  if (game.started) return;
  game.started = true;
  game.completed = false;
  bootScreen.classList.add("hidden");
  endScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  reticle.classList.remove("hidden");
  initAudio();
  createLevel(0);
  canvas.focus();
  canvas.requestPointerLock?.();
}

function restartGame() {
  endScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  reticle.classList.remove("hidden");
  game.completed = false;
  game.started = true;
  game.time = 0;
  game.realTime = 0;
  game.slowTimer = 0;
  game.shiftTimer = 0;
  game.cameraShake = 0;
  game.player.health = 100;
  game.player.energy = 55;
  game.player.power = 0;
  createLevel(0);
  canvas.requestPointerLock?.();
}

function initAudio() {
  if (game.audio) {
    game.audio.ctx.resume();
    return;
  }
  const ctx = new AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.11;
  master.connect(ctx.destination);

  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  drone.type = "sawtooth";
  drone.frequency.value = 42;
  filter.type = "lowpass";
  filter.frequency.value = 380;
  droneGain.gain.value = 0.06;
  drone.connect(filter);
  filter.connect(droneGain);
  droneGain.connect(master);
  drone.start();

  game.audio = { ctx, master, drone, droneGain, filter };
  playTone(240, 0.08, "triangle", 0.18);
  setTimeout(() => playTone(480, 0.12, "sine", 0.15), 80);
}

function playTone(freq, duration = 0.08, type = "sine", gainValue = 0.18) {
  if (!game.audio) return;
  const { ctx, master } = game.audio;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function showDialogue(html, duration = 4.4) {
  game.currentDialogue = html;
  game.dialogueTimer = duration;
  dialogueEl.innerHTML = html;
  dialogueEl.classList.remove("hidden");
}

function update(delta) {
  if (!game.started || game.completed) return;

  game.realTime += delta;
  game.levelTime += delta;
  const slowFactor = game.slowTimer > 0 ? 0.32 : 1;
  game.timeScale = lerp(game.timeScale, slowFactor, 1 - Math.pow(0.001, delta));
  const dt = Math.min(delta * game.timeScale, 0.04);
  game.time += delta;
  game.slowTimer = Math.max(0, game.slowTimer - delta);
  game.shiftTimer = Math.max(0, game.shiftTimer - delta);
  game.cameraShake = Math.max(0, game.cameraShake - delta * 2.6);
  game.dialogueTimer = Math.max(0, game.dialogueTimer - delta);
  if (game.dialogueTimer <= 0) dialogueEl.classList.add("hidden");

  const p = game.player;
  p.dashCooldown = Math.max(0, p.dashCooldown - delta);
  p.pulseCooldown = Math.max(0, p.pulseCooldown - delta);
  p.invulnerable = Math.max(0, p.invulnerable - delta);
  p.energy = clamp(p.energy + delta * 5.2, 0, p.maxEnergy);

  handleActions();
  updatePlayer(dt, delta);
  updateCamera(delta);
  updateNodes(delta);
  updateEnemies(dt, delta);
  updateHazards(delta);
  updateProjectiles(dt);
  updateParticles(delta);
  updatePortal(delta);
  updateDecor(delta);
  updateFinalPhase(delta);
  updateHud();
  clearFrameInputs();
}

function handleActions() {
  const p = game.player;
  if (input.justPulse && p.pulseCooldown <= 0 && p.energy >= 11) {
    shootPulse();
    p.energy -= 11;
    p.pulseCooldown = 0.32;
    game.cameraShake = Math.max(game.cameraShake, 0.12);
    playTone(620, 0.06, "triangle", 0.17);
    playTone(1240, 0.05, "sine", 0.08);
  }

  if (input.justSlow && p.energy >= 26) {
    game.slowTimer = 5.4;
    p.energy -= 26;
    showDialogue("<strong>Carlos:</strong> Time just admitted it can be negotiated.", 3.1);
    playTone(130, 0.28, "sawtooth", 0.14);
  }

  if (input.justShift && p.energy >= 20) {
    game.shiftTimer = game.shiftTimer > 0 ? 0 : 8.5;
    p.energy -= 20;
    game.cameraShake = Math.max(game.cameraShake, 0.22);
    showDialogue("<strong>System:</strong> Reality phase inverted.", 2.7);
    playTone(330, 0.07, "square", 0.13);
    setTimeout(() => playTone(660, 0.11, "triangle", 0.12), 80);
  }

  if (input.justDash && p.dashCooldown <= 0 && p.energy >= 14) {
    const forward = getCameraForward();
    forward.y = 0;
    forward.normalize();
    if (forward.lengthSq() < 0.01) forward.set(0, 0, -1);
    p.velocity.addScaledVector(forward, 27);
    p.energy -= 14;
    p.dashCooldown = 1.05;
    p.invulnerable = 0.22;
    spawnBurst(p.root.position, 0x5beaff, 18, 12, 0.5);
    playTone(910, 0.07, "sawtooth", 0.12);
  }
}

function updatePlayer(dt, realDelta) {
  const p = game.player;
  const root = p.root;
  const move = new THREE.Vector3();
  const forward = getCameraForward();
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) move.add(forward);
  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) move.sub(forward);
  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) move.add(right);
  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) move.sub(right);
  if (move.lengthSq() > 0.001) move.normalize();

  const baseSpeed = game.shiftTimer > 0 ? 14.2 : 12;
  const accel = p.onGround ? 34 : 18;
  p.velocity.x = lerp(p.velocity.x, move.x * baseSpeed, 1 - Math.pow(0.0005, realDelta * accel));
  p.velocity.z = lerp(p.velocity.z, move.z * baseSpeed, 1 - Math.pow(0.0005, realDelta * accel));
  p.velocity.y -= 33 * realDelta;

  if ((input.keys.has("Space") || input.keys.has("KeyK")) && p.onGround) {
    p.velocity.y = 15.6;
    p.onGround = false;
    spawnBurst(root.position, 0xffd15c, 10, 7, 0.4);
    playTone(390, 0.06, "triangle", 0.12);
  }

  root.position.addScaledVector(p.velocity, realDelta);
  resolvePlatforms();

  const boundX = 68;
  const boundZMin = -145;
  const boundZMax = 34;
  root.position.x = clamp(root.position.x, -boundX, boundX);
  root.position.z = clamp(root.position.z, boundZMin, boundZMax);
  if (root.position.y < -20) {
    damagePlayer(18);
    const def = levelDefs[game.levelIndex];
    root.position.copy(def.start);
    p.velocity.set(0, 0, 0);
  }

  if (move.lengthSq() > 0.001) {
    const targetAngle = Math.atan2(move.x, move.z);
    root.rotation.y = lerpAngle(root.rotation.y, targetAngle, 1 - Math.pow(0.002, realDelta));
  }

  animateCarlos(realDelta, move.length());
  playerLight.position.copy(root.position).add(new THREE.Vector3(0, 2.2, 0));

  if (Math.random() < realDelta * (game.shiftTimer > 0 ? 24 : 7)) {
    spawnParticle(root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 1, (Math.random() - 0.5) * 1.5)), 0x5beaff, 2 + Math.random() * 5, 0.42);
  }
}

function resolvePlatforms() {
  const p = game.player;
  const pos = p.root.position;
  p.onGround = false;
  let bestY = -Infinity;
  const activePlatforms = [
    ...game.platforms,
    ...game.shiftPlatforms.filter((platform) => platform.active)
  ];

  for (const platform of activePlatforms) {
    const top = platform.center.y + platform.size.y * 0.5;
    const insideX = Math.abs(pos.x - platform.center.x) <= platform.size.x * 0.5 + 0.65;
    const insideZ = Math.abs(pos.z - platform.center.z) <= platform.size.z * 0.5 + 0.65;
    const nearTop = pos.y >= top - 0.8 && pos.y <= top + 2.4;
    if (insideX && insideZ && nearTop && top > bestY && game.player.velocity.y <= 1.5) {
      bestY = top;
    }
  }

  if (bestY > -Infinity) {
    pos.y = bestY;
    if (p.velocity.y < 0) p.velocity.y = 0;
    p.onGround = true;
  }
}

function animateCarlos(delta, moveAmount) {
  const p = game.player;
  const t = game.realTime;
  const speed = p.velocity.length();
  const run = clamp(speed / 12, 0, 1) * moveAmount;
  const breath = Math.sin(t * 3.0) * 0.035;
  const swing = Math.sin(t * (8 + run * 6)) * run;
  const transform = p.energy > 76 || game.shiftTimer > 0;
  const glitch = transform ? (Math.sin(t * 28) > 0.4 ? 1 : 0) : 0;

  p.body.scale.setScalar(1 + breath + glitch * 0.018);
  p.leftArm.rotation.x = swing * 0.9 - 0.15;
  p.rightArm.rotation.x = -swing * 0.9 - 0.05;
  p.leftLeg.rotation.x = -swing * 0.75;
  p.rightLeg.rotation.x = swing * 0.75;
  p.body.position.y = 0.08 + Math.abs(swing) * 0.08 + breath;
  p.ring.rotation.z += delta * (4 + p.energy * 0.05);
  p.halo.rotation.z -= delta * 1.5;
  p.halo.scale.setScalar(1 + Math.sin(t * 4) * 0.08 + (transform ? 0.25 : 0));
  p.glowCore.material.emissiveIntensity = 2.1 + Math.sin(t * 6) * 0.4 + p.energy / 55 + glitch * 1.2;
  p.ring.material.emissiveIntensity = 2.2 + p.energy / 50 + (game.shiftTimer > 0 ? 2 : 0);
}

function updateCamera(delta) {
  const p = game.player.root.position;
  const distance = 11;
  const height = 4.8;
  const orbit = new THREE.Vector3(
    Math.sin(input.yaw) * Math.cos(input.pitch),
    Math.sin(input.pitch),
    Math.cos(input.yaw) * Math.cos(input.pitch)
  );
  const desired = p.clone().addScaledVector(orbit, distance).add(new THREE.Vector3(0, height, 0));
  desired.y = Math.max(desired.y, p.y + 2.8);
  if (game.cameraShake > 0) {
    desired.x += (Math.random() - 0.5) * game.cameraShake * 1.1;
    desired.y += (Math.random() - 0.5) * game.cameraShake * 0.8;
    desired.z += (Math.random() - 0.5) * game.cameraShake * 1.1;
  }
  camera.position.lerp(desired, 1 - Math.pow(0.001, delta));
  const look = p.clone().add(new THREE.Vector3(0, 2.1, 0));
  camera.lookAt(look);
}

function updateNodes(delta) {
  const p = game.player;
  const pos = p.root.position;
  game.interactTarget = null;
  let closest = Infinity;

  for (const node of game.nodes) {
    const data = node.userData;
    const dist = node.position.distanceTo(pos);
    node.position.y = data.baseY + Math.sin(game.realTime * 2.4 + data.index) * 0.22;
    data.core.rotation.x += delta * 0.8;
    data.core.rotation.y += delta * 1.2;
    data.ring1.rotation.z += delta * 1.9;
    data.ring2.rotation.x += delta * 1.4;

    if (!data.done && dist < 5.3 && dist < closest) {
      game.interactTarget = node;
      closest = dist;
    }

    if (data.done) {
      data.core.material.emissiveIntensity = 2.8 + Math.sin(game.realTime * 5 + data.index) * 0.5;
      continue;
    }

    if (game.interactTarget === node && input.interact) {
      data.sync += delta * (game.shiftTimer > 0 ? 0.85 : 0.56);
      p.energy = clamp(p.energy + delta * 3, 0, p.maxEnergy);
      spawnParticle(node.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.8, (Math.random() - 0.5) * 2)), levelDefs[game.levelIndex].accent, 6, 0.6);
      if (data.sync >= 1) {
        completeNode(node);
      }
    } else {
      data.sync = Math.max(0, data.sync - delta * 0.22);
    }

    const scale = 1 + data.sync * 0.34;
    node.scale.setScalar(scale);
  }

  if (game.interactTarget) {
    const pct = Math.round(game.interactTarget.userData.sync * 100);
    interactPrompt.textContent = pct > 0 ? `Node syncing ${pct}%` : "Simulation node unstable";
    interactPrompt.classList.remove("hidden");
  } else if (game.portal?.userData.active && game.portal.position.distanceTo(pos) < 6.5) {
    interactPrompt.textContent = game.levelIndex === levelDefs.length - 1 && game.finalPhase ? "Rickr breach in progress" : "Portal aligned";
    interactPrompt.classList.remove("hidden");
    if (input.interact && !game.finalPhase) {
      enterPortal();
    }
  } else {
    interactPrompt.classList.add("hidden");
  }
}

function completeNode(node) {
  const data = node.userData;
  data.done = true;
  data.core.material = materials.nodeDone.clone();
  data.ring1.material.color.set(0xffd15c);
  data.ring2.material.color.set(0x63ff9c);
  game.player.energy = clamp(game.player.energy + 28, 0, game.player.maxEnergy);
  game.player.power += 1;
  spawnBurst(node.position, levelDefs[game.levelIndex].accent2, 34, 15, 0.8);
  game.cameraShake = Math.max(game.cameraShake, 0.25);
  playTone(520, 0.08, "triangle", 0.15);
  setTimeout(() => playTone(780, 0.1, "sine", 0.12), 90);

  const doneCount = game.nodes.filter((n) => n.userData.done).length;
  if (doneCount === game.nodes.length) {
    game.portal.userData.active = true;
    showDialogue(
      game.levelIndex === 2
        ? "<strong>Core AI:</strong> Rickr breach accepted. Survival routine armed."
        : "<strong>System:</strong> Portal alignment restored.",
      4
    );
  } else if (doneCount === Math.ceil(game.nodes.length / 2)) {
    showDialogue(storyLines[Math.min(game.levelIndex + 1, storyLines.length - 1)], 4.2);
  }
}

function enterPortal() {
  if (!game.portal.userData.active) return;
  if (game.levelIndex < levelDefs.length - 1) {
    const next = game.levelIndex + 1;
    showDialogue("<strong>Carlos:</strong> If physics wants answers, it can chase me.", 2.6);
    setTimeout(() => createLevel(next), 360);
    spawnBurst(game.portal.position, levelDefs[game.levelIndex].accent, 60, 20, 1);
    game.cameraShake = 0.5;
    playTone(220, 0.2, "sawtooth", 0.15);
  } else {
    beginFinalPhase();
  }
}

function beginFinalPhase() {
  if (game.finalPhase) return;
  game.finalPhase = true;
  game.survivalTimer = 0;
  game.portal.userData.active = false;
  showDialogue("<strong>Rickr:</strong> KID!", 4.5);
  game.cameraShake = 0.6;
  playTone(90, 0.5, "sawtooth", 0.18);
}

function updateFinalPhase(delta) {
  if (!game.finalPhase) return;
  game.survivalTimer += delta;
  const def = levelDefs[2];
  const spawnEvery = game.survivalTimer < 20 ? 4.4 : game.survivalTimer < 48 ? 3.3 : 2.25;
  if (Math.floor((game.survivalTimer - delta) / spawnEvery) !== Math.floor(game.survivalTimer / spawnEvery)) {
    const angle = seeded(game.survivalTimer * 17) * TAU;
    const radius = 25 + seeded(game.survivalTimer * 31) * 18;
    const pos = new THREE.Vector3(Math.cos(angle) * radius, 15 + seeded(game.survivalTimer * 19) * 8, -94 + Math.sin(angle) * 32);
    createEnemyAt(pos, seeded(game.survivalTimer * 9) > 0.45 ? "drone" : "sentinel");
    spawnBurst(pos, def.accent, 24, 10, 0.7);
  }

  if (game.rickr && Math.random() < delta * 10) {
    const pos = game.rickr.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 12));
    spawnParticle(pos, Math.random() > 0.5 ? 0xff3d58 : 0xffd15c, 18, 1);
  }

  if (game.survivalTimer >= game.survivalGoal) {
    completeGame();
  }
}

function createEnemyAt(position, type) {
  const def = levelDefs[game.levelIndex];
  const save = def.enemies;
  def.enemies = [[position.x, position.y, position.z, type]];
  createEnemies(def);
  def.enemies = save;
}

function updateEnemies(dt, realDelta) {
  const p = game.player;
  const playerPos = p.root.position;
  const def = levelDefs[game.levelIndex];

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];
    const data = enemy.userData;
    if (data.hp <= 0) {
      spawnBurst(enemy.position, def.accent2, 24, 13, 0.65);
      game.dynamic.remove(enemy);
      game.enemies.splice(i, 1);
      p.energy = clamp(p.energy + 10, 0, p.maxEnergy);
      continue;
    }

    data.stun = Math.max(0, data.stun - realDelta);
    const toPlayer = tmpVec.copy(playerPos).sub(enemy.position);
    const dist = toPlayer.length();
    if (dist > 0.01) toPlayer.normalize();

    const slow = game.slowTimer > 0 ? 0.34 : 1;
    if (data.stun <= 0) {
      if (dist < 46 || game.finalPhase) {
        enemy.position.addScaledVector(toPlayer, data.speed * dt * slow);
      } else {
        const home = tmpVec2.copy(data.base).sub(enemy.position);
        if (home.lengthSq() > 0.2) enemy.position.addScaledVector(home.normalize(), data.speed * 0.32 * dt);
      }
    }

    enemy.position.y += Math.sin(game.realTime * 2.5 + i) * realDelta * 0.5;
    enemy.lookAt(playerPos.x, enemy.position.y, playerPos.z);
    data.body.rotation.x += realDelta * (data.type === "drone" ? 1.4 : 0.7);
    data.body.rotation.y += realDelta * (data.stun > 0 ? 6 : 1.1);
    data.ring.rotation.z += realDelta * 2.4;
    data.eye.material.opacity = 0.55 + Math.sin(game.realTime * 8 + i) * 0.22;

    data.shootTimer -= dt * slow;
    if (dist < 42 && data.shootTimer <= 0 && data.stun <= 0) {
      shootEnemyBolt(enemy);
      data.shootTimer = data.type === "sentinel" ? 2.2 : 1.75;
    }

    if (dist < 2.6) {
      damagePlayer(data.type === "sentinel" ? 16 : 10);
      data.stun = 0.55;
    }
  }
}

function shootEnemyBolt(enemy) {
  const dir = game.player.root.position.clone().add(new THREE.Vector3(0, 1.4, 0)).sub(enemy.position).normalize();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), materials.hazard.clone());
  mesh.position.copy(enemy.position).addScaledVector(dir, 1.8);
  mesh.userData = {
    kind: "enemy",
    velocity: dir.multiplyScalar(24),
    life: 3.5,
    radius: 0.55,
    damage: 9
  };
  game.dynamic.add(mesh);
  game.projectiles.push(mesh);
  playTone(170, 0.05, "square", 0.08);
}

function shootPulse() {
  const dir = getCameraForward().normalize();
  const origin = game.player.root.position.clone().add(new THREE.Vector3(0, 1.55, 0)).addScaledVector(dir, 1.2);
  const mesh = new THREE.Group();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 14), materials.pulse.clone());
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 8, 42), materials.pulse.clone());
  ring.rotation.x = Math.PI / 2;
  mesh.add(core, ring);
  mesh.position.copy(origin);
  mesh.userData = {
    kind: "player",
    velocity: dir.multiplyScalar(48),
    life: 1.25,
    radius: 1.15,
    damage: game.shiftTimer > 0 ? 2 : 1
  };
  game.dynamic.add(mesh);
  game.projectiles.push(mesh);
}

function updateProjectiles(dt) {
  for (let i = game.projectiles.length - 1; i >= 0; i--) {
    const projectile = game.projectiles[i];
    const data = projectile.userData;
    data.life -= dt;
    projectile.position.addScaledVector(data.velocity, dt);
    projectile.rotation.x += dt * 6;
    projectile.rotation.y += dt * 5;

    if (data.kind === "player") {
      for (const enemy of game.enemies) {
        if (enemy.position.distanceTo(projectile.position) < data.radius + 1.2) {
          enemy.userData.hp -= data.damage;
          enemy.userData.stun = 0.65;
          spawnBurst(projectile.position, 0x5beaff, 10, 8, 0.4);
          data.life = 0;
          break;
        }
      }
    } else if (game.player.root.position.distanceTo(projectile.position) < data.radius + 0.9) {
      damagePlayer(data.damage);
      spawnBurst(projectile.position, 0xff3d58, 12, 8, 0.4);
      data.life = 0;
    }

    if (data.life <= 0) {
      game.dynamic.remove(projectile);
      game.projectiles.splice(i, 1);
    }
  }
}

function updateHazards(delta) {
  const pos = game.player.root.position;
  for (const hazard of game.hazards) {
    const data = hazard.userData;
    data.pulse += delta;
    const active = Math.sin(data.pulse * 1.6) > -0.35;
    const scale = 1 + Math.sin(data.pulse * 2.4) * 0.1;
    data.ring.scale.setScalar(scale);
    data.ring.material.opacity = active ? 0.52 : 0.18;
    data.column.rotation.y += delta * 0.8;
    data.column.material.uniforms.uTime.value = game.realTime;
    const flatDist = Math.hypot(pos.x - hazard.position.x, pos.z - hazard.position.z);
    const yDist = Math.abs(pos.y - hazard.position.y);
    if (active && flatDist < data.radius * 0.72 && yDist < 7) {
      damagePlayer(14 * delta);
      if (Math.random() < delta * 18) spawnParticle(pos.clone(), 0xff3d58, 12, 0.5);
    }
  }
}

function damagePlayer(amount) {
  const p = game.player;
  if (p.invulnerable > 0) return;
  p.health = clamp(p.health - amount, 0, 100);
  p.invulnerable = 0.24;
  game.cameraShake = Math.max(game.cameraShake, 0.22);
  playTone(110, 0.08, "sawtooth", 0.1);
  if (p.health <= 0) {
    p.health = 62;
    p.energy = 35;
    const def = levelDefs[game.levelIndex];
    p.root.position.copy(def.start);
    p.velocity.set(0, 0, 0);
    showDialogue("<strong>System:</strong> Carlos was reconstructed from a suspicious memory backup.", 4);
  }
}

function updatePortal(delta) {
  if (!game.portal) return;
  const active = game.portal.userData.active;
  game.portal.visible = active || game.nodes.every((n) => n.userData.done);
  game.portal.userData.ring.rotation.z += delta * (active ? 1.6 : 0.4);
  game.portal.userData.disc.material.uniforms.uTime.value = game.realTime;
  game.portal.userData.disc.material.opacity = active ? 0.78 : 0.25;
  game.portal.scale.setScalar(active ? 1 + Math.sin(game.realTime * 4) * 0.04 : 0.7);
  game.portal.userData.beacon.intensity = active ? 9 + Math.sin(game.realTime * 5) * 2 : 2.2;
}

function updateDecor(delta) {
  if (game.grid) {
    game.grid.position.y = 0.04 + Math.sin(game.realTime * 1.5) * 0.015;
  }
  if (game.ambientParticles) {
    game.ambientParticles.rotation.y += delta * 0.008;
    game.ambientParticles.position.y = Math.sin(game.realTime * 0.5) * 0.25;
  }

  game.decor.traverse((obj) => {
    if (obj.material?.uniforms?.uTime) {
      obj.material.uniforms.uTime.value = game.realTime;
    }
    if (obj.userData.spin) {
      obj.rotation.x += delta * obj.userData.spin.x;
      obj.rotation.y += delta * obj.userData.spin.y;
      obj.rotation.z += delta * obj.userData.spin.z;
    }
    if (obj.userData.spinZ) {
      obj.rotation.z += delta * obj.userData.spinZ;
    }
  });

  for (const platform of game.shiftPlatforms) {
    const active = game.shiftTimer > 0;
    platform.active = active;
    const targetOpacity = active ? 0.62 : 0.12;
    platform.mesh.material.opacity = lerp(platform.mesh.material.opacity ?? targetOpacity, targetOpacity, 0.08);
    platform.mesh.position.y = platform.mesh.userData.baseY + Math.sin(game.realTime * 3.1 + platform.center.z) * (active ? 0.18 : 0.42);
    platform.mesh.rotation.y += delta * (active ? 0.08 : 0.18);
    platform.center.copy(platform.mesh.position);
  }

  if (game.rickr) {
    const r = game.rickr;
    r.rotation.y += delta * 0.18;
    r.position.y = 20 + Math.sin(game.realTime * 1.2) * 1.2;
    r.userData.core.material.emissiveIntensity = 2.7 + Math.sin(game.realTime * 4) * 0.6 + (game.finalPhase ? 1.7 : 0);
    r.userData.light.intensity = 26 + Math.sin(game.realTime * 3) * 8 + (game.finalPhase ? 18 : 0);
    r.children.forEach((child) => {
      if (child.userData.spin) child.rotation.z += delta * child.userData.spin;
    });
  }

  if (game.audio) {
    const def = levelDefs[game.levelIndex];
    game.audio.drone.frequency.setTargetAtTime(42 + game.levelIndex * 18 + (game.finalPhase ? 32 : 0), game.audio.ctx.currentTime, 0.2);
    game.audio.filter.frequency.setTargetAtTime(280 + game.player.energy * 7 + game.levelIndex * 150, game.audio.ctx.currentTime, 0.25);
    hemi.intensity = 1.05 + Math.sin(game.realTime * 0.9) * 0.08;
    sun.intensity = 2.3 + Math.sin(game.realTime * 1.2) * 0.3 + (def.name.includes("Core") ? 0.5 : 0);
  }
}

function updateParticles(delta) {
  for (let i = game.particles.length - 1; i >= 0; i--) {
    const particle = game.particles[i];
    const data = particle.userData;
    data.life -= delta;
    particle.position.addScaledVector(data.velocity, delta);
    particle.scale.multiplyScalar(1 + delta * data.grow);
    const alpha = clamp(data.life / data.maxLife, 0, 1);
    particle.material.opacity = alpha * data.opacity;
    if (data.life <= 0) {
      game.dynamic.remove(particle);
      game.particles.splice(i, 1);
    }
  }
}

function spawnParticle(position, color, speed = 6, life = 0.6) {
  if (game.particles.length > 260) return;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09 + Math.random() * 0.08, 8, 6),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.position.copy(position);
  mesh.userData = {
    velocity: new THREE.Vector3((Math.random() - 0.5) * speed, (Math.random() - 0.1) * speed, (Math.random() - 0.5) * speed),
    life,
    maxLife: life,
    grow: 1.2 + Math.random() * 1.2,
    opacity: 0.78
  };
  game.dynamic.add(mesh);
  game.particles.push(mesh);
}

function spawnBurst(position, color, count, speed = 10, life = 0.7) {
  for (let i = 0; i < count; i++) {
    spawnParticle(position.clone(), color, speed, life * (0.6 + Math.random() * 0.8));
  }
}

function updateHud() {
  if (!game.player) return;
  const def = levelDefs[game.levelIndex];
  const nodesDone = game.nodes.filter((n) => n.userData.done).length;
  const totalNodes = game.nodes.length;
  const elapsed = Math.floor(game.time);
  const min = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const sec = String(elapsed % 60).padStart(2, "0");
  runTimeEl.textContent = `${min}:${sec}`;
  healthBar.style.transform = `scaleX(${game.player.health / 100})`;
  energyBar.style.transform = `scaleX(${game.player.energy / game.player.maxEnergy})`;
  zoneNameEl.textContent = def.name;
  nodeCountEl.textContent = `${nodesDone}/${totalNodes} nodes`;
  if (game.finalPhase) {
    objectiveTextEl.textContent = `Survive Rickr ${Math.ceil(Math.max(0, game.survivalGoal - game.survivalTimer))}s`;
  } else if (nodesDone === totalNodes) {
    objectiveTextEl.textContent = game.levelIndex === 2 ? "Enter the core breach" : "Enter the aligned portal";
  } else {
    objectiveTextEl.textContent = def.objective;
  }
  const transform = game.player.energy > 76 || game.shiftTimer > 0;
  powerStateEl.textContent = transform ? "Glitch transformation online" : "Defyn ring charging";
  shiftStateEl.textContent = game.slowTimer > 0
    ? "Time distortion active"
    : game.shiftTimer > 0
      ? "Reality phase inverted"
      : "Reality phase stable";
}

function completeGame() {
  game.completed = true;
  hud.classList.add("hidden");
  reticle.classList.add("hidden");
  endScreen.classList.remove("hidden");
  const elapsed = Math.floor(game.time);
  const min = Math.floor(elapsed / 60);
  const sec = String(elapsed % 60).padStart(2, "0");
  endSummaryEl.textContent = `Carlos survived ${min}:${sec}, stabilized ${levelDefs.reduce((sum, l) => sum + l.nodes.length, 0)} nodes, and made Rickr admit that physics was never supposed to be boring.`;
  playTone(260, 0.18, "triangle", 0.18);
  setTimeout(() => playTone(390, 0.18, "triangle", 0.16), 130);
  setTimeout(() => playTone(520, 0.22, "sine", 0.14), 260);
  document.exitPointerLock?.();
}

function getCameraForward() {
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  return dir;
}

function lerpAngle(a, b, t) {
  const delta = ((((b - a) % TAU) + Math.PI * 3) % TAU) - Math.PI;
  return a + delta * t;
}

function clearFrameInputs() {
  input.justPulse = false;
  input.justShift = false;
  input.justSlow = false;
  input.justDash = false;
}

function render() {
  const delta = Math.min(clock.getDelta(), 0.05);
  update(delta);
  renderer.render(scene, camera);
  frameCount += 1;
  if (game.started && frameCount % 12 === 0) {
    updateDebugSnapshot(frameCount % 96 === 0);
  }
  requestAnimationFrame(render);
}

function updateDebugSnapshot(capturePreview) {
  const gl = renderer.getContext();
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  const points = [
    [Math.floor(w * 0.5), Math.floor(h * 0.5)],
    [Math.floor(w * 0.25), Math.floor(h * 0.5)],
    [Math.floor(w * 0.75), Math.floor(h * 0.5)],
    [Math.floor(w * 0.5), Math.floor(h * 0.35)],
    [Math.floor(w * 0.5), Math.floor(h * 0.7)]
  ];
  const samples = [];
  let brightness = 0;
  let colored = 0;
  for (const [x, y] of points) {
    const px = new Uint8Array(4);
    gl.readPixels(x, h - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const sample = Array.from(px);
    samples.push(sample);
    brightness += sample[0] + sample[1] + sample[2];
    if (Math.max(sample[0], sample[1], sample[2]) - Math.min(sample[0], sample[1], sample[2]) > 8) {
      colored += 1;
    }
  }

  let preview = window.__CARLOS_DEBUG__?.preview ?? null;
  if (capturePreview) {
    try {
      preview = renderer.domElement.toDataURL("image/jpeg", 0.72);
    } catch {
      preview = null;
    }
  }

  const debugState = {
    started: game.started,
    completed: game.completed,
    level: levelDefs[game.levelIndex]?.name ?? "Boot",
    running: game.started && !game.completed,
    player: game.player
      ? {
          x: Number(game.player.root.position.x.toFixed(2)),
          y: Number(game.player.root.position.y.toFixed(2)),
          z: Number(game.player.root.position.z.toFixed(2)),
          health: Number(game.player.health.toFixed(1)),
          energy: Number(game.player.energy.toFixed(1))
        }
      : null,
    nodesDone: game.nodes.filter((node) => node.userData.done).length,
    nodesTotal: game.nodes.length,
    enemies: game.enemies.length,
    projectiles: game.projectiles.length,
    canvas: { width: w, height: h, brightness, colored, samples }
  };

  window.__CARLOS_DEBUG__ = { ...debugState, preview };
  if (debugStateEl) {
    debugStateEl.textContent = JSON.stringify(debugState);
  }
  if (debugPreviewEl && preview) {
    debugPreviewEl.src = preview;
  }
}

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  input.keys.add(event.code);
  if (event.code === "KeyE") input.interact = true;
  if (event.code === "KeyQ" && !event.repeat) input.justSlow = true;
  if (event.code === "KeyF" && !event.repeat) input.justShift = true;
  if (event.code === "ShiftLeft" || event.code === "ShiftRight") input.justDash = true;
  if (event.code === "KeyJ" && !event.repeat) input.justPulse = true;
  if (event.code === "Escape") {
    document.exitPointerLock?.();
  }
}

function onKeyUp(event) {
  input.keys.delete(event.code);
  if (event.code === "KeyE") input.interact = false;
}

function onMouseMove(event) {
  if (!input.locked && !event.buttons) return;
  input.yaw -= event.movementX * 0.0024;
  input.pitch = clamp(input.pitch - event.movementY * 0.0018, -0.75, 0.45);
}

function onPointerDown(event) {
  if (!game.started || game.completed) return;
  if (!input.locked) {
    canvas.requestPointerLock?.();
  }
  if (event.button === 0) {
    input.justPulse = true;
  }
}

function onPointerLockChange() {
  input.locked = document.pointerLockElement === canvas;
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("pointerdown", onPointerDown);
document.addEventListener("pointerlockchange", onPointerLockChange);
startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

camera.position.set(0, 9, 28);
camera.lookAt(0, 2, 0);
render();
