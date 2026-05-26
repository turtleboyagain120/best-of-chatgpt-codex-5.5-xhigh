import * as THREE from "three";

const canvas = document.querySelector("#field");
const shell = document.querySelector(".shell");
const boot = document.querySelector("#boot");
const cursorHalo = document.querySelector("#cursorHalo");
const modeTitle = document.querySelector("#modeTitle");
const scenarioCopy = document.querySelector("#scenarioCopy");
const scenarioCard = document.querySelector("#scenarioCard");
const commandInput = document.querySelector("#commandInput");
const timeSlider = document.querySelector("#timeSlider");
const timeOutput = document.querySelector("#timeOutput");
const forecastScore = document.querySelector("#forecastScore");
const riskScore = document.querySelector("#riskScore");
const syncScore = document.querySelector("#syncScore");
const feedText = document.querySelector("#feedText");
const signalTitle = document.querySelector("#signalTitle");
const signalBody = document.querySelector("#signalBody");
const confidenceValue = document.querySelector("#confidenceValue");
const reverseValue = document.querySelector("#reverseValue");
const emotionValue = document.querySelector("#emotionValue");
const agentList = document.querySelector("#agentList");
const overlayScreen = document.querySelector("#overlayScreen");
const overlayEyebrow = document.querySelector("#overlayEyebrow");
const overlayTitle = document.querySelector("#overlayTitle");
const overlayCopy = document.querySelector("#overlayCopy");
const overlayGrid = document.querySelector("#overlayGrid");
const briefingMeter = document.querySelector("#briefingMeter");
const briefingButton = document.querySelector("#briefingButton");
const xrayButton = document.querySelector("#xrayButton");
const silenceButton = document.querySelector("#silenceButton");
const anomalySwitch = document.querySelector("#anomalySwitch");
const ghostSwitch = document.querySelector("#ghostSwitch");
const originButton = document.querySelector("#originButton");
const overlayClose = document.querySelector("#overlayClose");

const palette = {
  cyan: "#4deeff",
  violet: "#9b6cff",
  gold: "#ffc85a",
  red: "#ff3f6d",
  green: "#54ffae",
  white: "#f5f9ff",
  blue: "#5d8cff"
};

const modes = {
  field: {
    title: "Field Command",
    copy: "A living model of the launch, team energy, market weather, and hidden assumptions.",
    feed: "The market storm is moving clockwise. Skeptic found a confidence gap under enterprise onboarding.",
    color: palette.cyan,
    camera: new THREE.Vector3(0, 11, 24),
    intensity: 1
  },
  loom: {
    title: "Future Loom",
    copy: "Time branches are open. Drag the drift and watch timelines fracture into survivable futures.",
    feed: "Fork B gains probability when validation happens before brand lock. Reversibility rises by 22 points.",
    color: palette.gold,
    camera: new THREE.Vector3(3, 15, 27),
    intensity: 1.2
  },
  theater: {
    title: "Agent Theater",
    copy: "The Chorus is staging a strategic duel between fast launch, dark launch, and validation first.",
    feed: "Mirror detected executive optimism bias. Phantom is constructing a deliberately strange third option.",
    color: palette.violet,
    camera: new THREE.Vector3(-4, 10, 22),
    intensity: 1.3
  },
  weather: {
    title: "Signal Weather",
    copy: "Signals become pressure systems. Sentiment, risk, latency, and cash flow behave like climate.",
    feed: "A red pressure wall is forming near onboarding support. Customer delight aurora remains stable.",
    color: palette.green,
    camera: new THREE.Vector3(0, 18, 30),
    intensity: 1.5
  },
  archive: {
    title: "Memory Catacombs",
    copy: "Old decisions are awake. Forgotten assumptions are being replayed under the current launch path.",
    feed: "Ghost Decision 014 resurfaced: enterprise onboarding was deferred twice by the same constraint.",
    color: palette.red,
    camera: new THREE.Vector3(0, 8, 20),
    intensity: 0.82
  }
};

const signalData = [
  {
    name: "Enterprise Buyer Belief",
    body: "The highest leverage assumption is still unverified. Causal x-ray recommends a synthetic buyer trial before launch lock.",
    confidence: 72,
    reverse: 41,
    emotion: "High",
    color: palette.red
  },
  {
    name: "Support Load Rift",
    body: "Onboarding tickets rise sharply when the launch branch moves ahead without guided activation.",
    confidence: 66,
    reverse: 52,
    emotion: "Alert",
    color: palette.gold
  },
  {
    name: "Launch Narrative Core",
    body: "Brand clarity is stable. The current story survives all three branches with minor localization cost.",
    confidence: 91,
    reverse: 76,
    emotion: "Calm",
    color: palette.cyan
  },
  {
    name: "Team Energy Reservoir",
    body: "Creative energy is high but brittle. The system recommends one explicit rest buffer before hard freeze.",
    confidence: 78,
    reverse: 48,
    emotion: "Warm",
    color: palette.green
  },
  {
    name: "Investor Echo Field",
    body: "External confidence is being shaped by demo intensity more than measured retention evidence.",
    confidence: 59,
    reverse: 35,
    emotion: "Charged",
    color: palette.violet
  },
  {
    name: "Dark Launch Door",
    body: "A smaller release path reduces risk heat while preserving cinematic momentum for public reveal.",
    confidence: 84,
    reverse: 69,
    emotion: "Ready",
    color: palette.blue
  }
];

const agents = [
  ["Oracle", "projects the highest-probability future", "87%", palette.cyan],
  ["Skeptic", "attacks fragile assumptions", "31%", palette.red],
  ["Mirror", "models your decision signature", "awake", palette.violet],
  ["Phantom", "generates impossible alternatives", "3 forks", palette.gold],
  ["Historian", "recalls old promises and scars", "14 mem", palette.green],
  ["Cartographer", "maps causal dependency terrain", "live", palette.blue]
];

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#020307");
scene.fog = new THREE.FogExp2("#030714", 0.038);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 180);
camera.position.copy(modes.field.camera);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(10, 10);
const targetCamera = modes.field.camera.clone();
const lookTarget = new THREE.Vector3(0, 0.7, 0);

const world = new THREE.Group();
const nodeGroup = new THREE.Group();
const agentGroup = new THREE.Group();
const lineGroup = new THREE.Group();
const weatherGroup = new THREE.Group();
scene.add(world, lineGroup, nodeGroup, agentGroup, weatherGroup);

const ambient = new THREE.AmbientLight(0x8fbfff, 0.45);
const keyLight = new THREE.PointLight(0x4deeff, 120, 70);
keyLight.position.set(0, 13, 8);
const redLight = new THREE.PointLight(0xff3f6d, 60, 48);
redLight.position.set(-9, 5, -6);
scene.add(ambient, keyLight, redLight);

const grid = new THREE.GridHelper(54, 54, 0x4deeff, 0x193044);
grid.material.transparent = true;
grid.material.opacity = 0.26;
grid.position.y = -2.2;
world.add(grid);

const horizon = new THREE.Mesh(
  new THREE.CylinderGeometry(15, 23, 0.18, 128, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0x4deeff,
    transparent: true,
    opacity: 0.045,
    side: THREE.DoubleSide,
    wireframe: true
  })
);
horizon.position.y = -1.9;
world.add(horizon);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(2.4, 3),
  new THREE.MeshPhysicalMaterial({
    color: 0x07101b,
    emissive: 0x14384a,
    metalness: 0.52,
    roughness: 0.18,
    transmission: 0.4,
    thickness: 0.55,
    transparent: true,
    opacity: 0.74
  })
);
core.position.set(0, 0.2, 0);
world.add(core);

const coreWire = new THREE.Mesh(
  new THREE.TorusKnotGeometry(2.8, 0.012, 180, 12, 2, 5),
  new THREE.MeshBasicMaterial({
    color: 0x4deeff,
    transparent: true,
    opacity: 0.58
  })
);
world.add(coreWire);

function createTextSprite(text, color) {
  const labelCanvas = document.createElement("canvas");
  const ctx = labelCanvas.getContext("2d");
  const pixelRatio = 2;
  labelCanvas.width = 320 * pixelRatio;
  labelCanvas.height = 72 * pixelRatio;
  ctx.scale(pixelRatio, pixelRatio);
  ctx.clearRect(0, 0, 320, 72);
  ctx.font = "700 18px Cascadia Mono, Consolas, monospace";
  ctx.fillStyle = "rgba(4, 9, 17, 0.52)";
  ctx.fillRect(0, 10, 320, 42);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.strokeRect(0.5, 10.5, 319, 41);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#f5f9ff";
  ctx.fillText(text.toUpperCase(), 14, 38);

  const texture = new THREE.CanvasTexture(labelCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0.86,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(3.2, 0.72, 1);
  return sprite;
}

const nodeMeshes = signalData.map((item, index) => {
  const angle = (index / signalData.length) * Math.PI * 2;
  const radius = 6.2 + (index % 2) * 1.2;
  const y = Math.sin(index * 1.44) * 1.7 + 0.4;
  const color = new THREE.Color(item.color);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(index === 0 ? 0.42 : 0.34, 36, 24),
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.22,
      metalness: 0.35,
      transparent: true,
      opacity: 0.86
    })
  );
  mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  mesh.userData = { signal: item, index, base: mesh.position.clone(), angle, radius };

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.65, 0.012, 8, 72),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62 })
  );
  halo.rotation.x = Math.PI / 2;
  mesh.add(halo);

  const label = createTextSprite(item.name, item.color);
  label.position.set(0, 0.82, 0);
  mesh.add(label);

  nodeGroup.add(mesh);
  return mesh;
});

const linePositions = [];
const lineColors = [];
for (let i = 0; i < nodeMeshes.length; i += 1) {
  const start = nodeMeshes[i].position;
  const end = nodeMeshes[(i + 1) % nodeMeshes.length].position;
  linePositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
  const colorA = new THREE.Color(signalData[i].color);
  const colorB = new THREE.Color(signalData[(i + 1) % signalData.length].color);
  lineColors.push(colorA.r, colorA.g, colorA.b, colorB.r, colorB.g, colorB.b);

  if (i % 2 === 0) {
    const other = nodeMeshes[(i + 3) % nodeMeshes.length].position;
    linePositions.push(start.x, start.y, start.z, other.x, other.y, other.z);
    lineColors.push(colorA.r, colorA.g, colorA.b, 0.3, 0.94, 1);
  }
}

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
lineGeometry.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
const connectionLines = new THREE.LineSegments(
  lineGeometry,
  new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending
  })
);
lineGroup.add(connectionLines);

function makeParticleSystem(count, radius, colors) {
  const positions = [];
  const colorArray = [];
  for (let i = 0; i < count; i += 1) {
    const r = radius * Math.pow(Math.random(), 0.72);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      THREE.MathUtils.randFloatSpread(radius * 0.62),
      r * Math.sin(phi) * Math.sin(theta)
    );
    const c = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
    colorArray.push(c.r, c.g, c.b);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));
  const material = new THREE.PointsMaterial({
    size: 0.035,
    transparent: true,
    opacity: 0.72,
    vertexColors: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  return new THREE.Points(geometry, material);
}

const stars = makeParticleSystem(1600, 58, [palette.cyan, palette.violet, palette.gold, palette.white]);
stars.position.y = 2;
scene.add(stars);

const signalDust = makeParticleSystem(700, 12, [palette.cyan, palette.red, palette.green]);
weatherGroup.add(signalDust);

const weatherRings = [0, 1, 2].map((ringIndex) => {
  const color = [0x4deeff, 0xff3f6d, 0x54ffae][ringIndex];
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(7 + ringIndex * 1.8, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending
    })
  );
  ring.rotation.x = Math.PI / 2 + ringIndex * 0.12;
  ring.rotation.z = ringIndex * 0.3;
  weatherGroup.add(ring);
  return ring;
});

agents.forEach((agent, index) => {
  const angle = (index / agents.length) * Math.PI * 2;
  const color = new THREE.Color(agent[3]);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95
    })
  );
  orb.position.set(Math.cos(angle) * 3.8, 2 + Math.sin(index) * 0.28, Math.sin(angle) * 3.8);
  orb.userData = { angle, radius: 3.8, index, agent };
  agentGroup.add(orb);
});

function renderAgents() {
  agentList.innerHTML = agents
    .map(
      ([name, role, state, color]) => `
        <article class="agent" style="--agent-color: ${color}">
          <span class="agent__orb" aria-hidden="true"></span>
          <span>
            <strong>${name}</strong>
            <p>${role}</p>
          </span>
          <em>${state}</em>
        </article>
      `
    )
    .join("");
}

renderAgents();

let activeMode = "field";
let activeSignalIndex = 0;
let originClicks = 0;
let branchIndex = 0;
let cinematic = false;
let xray = false;
let silence = false;
let lastPointerMove = 0;
let shakeEnergy = 0;

function selectSignal(index, source = "manual") {
  activeSignalIndex = (index + signalData.length) % signalData.length;
  const signal = signalData[activeSignalIndex];
  signalTitle.textContent = signal.name;
  signalBody.textContent = signal.body;
  confidenceValue.textContent = signal.confidence;
  reverseValue.textContent = signal.reverse;
  emotionValue.textContent = signal.emotion;
  keyLight.color.set(signal.color);
  scenarioCard.style.borderColor = signal.color;

  nodeMeshes.forEach((mesh, meshIndex) => {
    mesh.scale.setScalar(meshIndex === activeSignalIndex ? 1.32 : 1);
  });

  if (source !== "silent") {
    feedText.textContent = `${signal.name} is now under inspection. Chorus confidence: ${signal.confidence} percent.`;
  }
}

function setMode(modeName) {
  activeMode = modeName;
  const mode = modes[modeName];
  modeTitle.textContent = mode.title;
  scenarioCopy.textContent = mode.copy;
  feedText.textContent = mode.feed;
  targetCamera.copy(mode.camera);
  keyLight.color.set(mode.color);
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === modeName);
  });

  if (modeName === "archive") {
    ghostSwitch.checked = true;
    selectSignal(1);
  } else if (modeName === "weather") {
    selectSignal(3);
  } else if (modeName === "theater") {
    selectSignal(4);
  } else if (modeName === "loom") {
    selectSignal(5);
  }
}

function updateVitals() {
  const drift = Number(timeSlider.value);
  const forecast = Math.round(94 - Math.abs(drift - 58) * 0.42 + branchIndex * 1.7);
  const risk = Math.round(18 + Math.abs(drift - 38) * 0.46 + (ghostSwitch.checked ? 9 : 0));
  const sync = Math.round(96 - Math.abs(drift - 62) * 0.12 + (anomalySwitch.checked ? 2 : -4));
  forecastScore.textContent = `${THREE.MathUtils.clamp(forecast, 41, 98)}%`;
  riskScore.textContent = `${THREE.MathUtils.clamp(risk, 12, 89)}%`;
  syncScore.textContent = `${THREE.MathUtils.clamp(sync, 62, 99)}%`;
}

function updateTimeOutput() {
  const weeks = Math.round((Number(timeSlider.value) - 50) / 8);
  const sign = weeks >= 0 ? "+" : "";
  timeOutput.textContent = `${sign}${weeks} weeks`;
  updateVitals();
}

function setOverlay({ eyebrow, title, copy, items, meter = 100 }) {
  overlayEyebrow.textContent = eyebrow;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlayGrid.innerHTML = items
    .map(
      (item) => `
        <article>
          <strong>${item.title}</strong>
          <em>${item.copy}</em>
        </article>
      `
    )
    .join("");
  briefingMeter.style.width = "0%";
  overlayScreen.classList.add("is-open");
  overlayScreen.setAttribute("aria-hidden", "false");
  window.setTimeout(() => {
    briefingMeter.style.width = `${meter}%`;
  }, 80);
}

function closeOverlay() {
  overlayScreen.classList.remove("is-open");
  overlayScreen.setAttribute("aria-hidden", "true");
  cinematic = false;
}

function runBriefing() {
  cinematic = true;
  setMode("theater");
  setOverlay({
    eyebrow: "cinematic briefing",
    title: "The Future Is Arguing Back",
    copy: "Oracle, Skeptic, and Mirror compressed nine branches into one recommendation: validate the enterprise buyer belief before public launch, then dark-launch the strongest onboarding path.",
    meter: 92,
    items: [
      {
        title: "Primary Threat",
        copy: "A beautiful launch can still fail if enterprise activation is guessed instead of observed."
      },
      {
        title: "Recommended Move",
        copy: "Run a 72-hour synthetic buyer trial. Ship the cinematic reveal only after the trial clears."
      },
      {
        title: "Hidden Upside",
        copy: "Dark launch gives the team evidence, preserves drama, and lowers support heat by 18 points."
      }
    ]
  });
  feedText.textContent = "Cinematic briefing generated. Camera path locked. The Chorus reached partial agreement.";
}

function openOriginRoom() {
  setOverlay({
    eyebrow: "origin room",
    title: "You Found The First Decision",
    copy: "The first workspace decision is preserved under glass: build the impossible version, then make it feel inevitable.",
    meter: 100,
    items: [
      { title: "Ninth View", copy: "Unlocked by persistence. The UI now trusts you with buried memory." },
      { title: "Ghost Root", copy: "Every future in the Field inherits from one emotional assumption." },
      { title: "Directive", copy: "Do not optimize the soul out of the system." }
    ]
  });
}

function openCatacombs() {
  setMode("archive");
  setOverlay({
    eyebrow: "memory catacombs",
    title: "The Below Is Open",
    copy: "Old launch branches are replaying beneath the active world. Three abandoned plans still influence the current decision geometry.",
    meter: 86,
    items: [
      { title: "Ghost 014", copy: "Enterprise onboarding was postponed twice by the same operational fear." },
      { title: "Scar Branch", copy: "The fastest timeline succeeds visually and fails operationally." },
      { title: "Reverse Prophecy", copy: "To reach the best future, the past assumption must be challenged today." }
    ]
  });
}

function openFutureDuel() {
  setOverlay({
    eyebrow: "future duel",
    title: "Two Agent Teams Enter",
    copy: "Fast Launch argues for momentum. Validation First argues for truth. Phantom is quietly building a third path from both.",
    meter: 77,
    items: [
      { title: "Fast Launch", copy: "Highest spectacle, highest support pressure, strongest investor echo." },
      { title: "Validation First", copy: "Lower drama, higher truth, slower narrative ignition." },
      { title: "Phantom Path", copy: "Dark launch the onboarding layer, then reveal the impossible demo." }
    ]
  });
}

function handleCommand(raw) {
  const value = raw.trim();
  const command = value.toLowerCase();
  if (!command) return;

  if (command.includes("open the below")) {
    openCatacombs();
  } else if (command.includes("danger") || command.includes("assumption")) {
    setMode("field");
    selectSignal(0);
    feedText.textContent = "Dangerous assumption revealed: enterprise buyer belief is under-validated.";
  } else if (command.includes("duel")) {
    openFutureDuel();
  } else if (command.includes("brief")) {
    runBriefing();
  } else if (command.includes("silence")) {
    silenceButton.click();
  } else if (command.includes("xray") || command.includes("x-ray")) {
    xrayButton.click();
  } else if (command.includes("weather")) {
    setMode("weather");
  } else if (command.includes("archive") || command.includes("memory")) {
    openCatacombs();
  } else {
    const next = (branchIndex + 1) % 4;
    document.querySelector(`.time-node[data-branch="${next}"]`)?.click();
    feedText.textContent = `Phantom interpreted "${value}" and opened a provisional future branch.`;
  }

  commandInput.value = "";
}

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateLineGeometry() {
  const position = connectionLines.geometry.attributes.position;
  let offset = 0;
  for (let i = 0; i < nodeMeshes.length; i += 1) {
    const start = nodeMeshes[i].position;
    const end = nodeMeshes[(i + 1) % nodeMeshes.length].position;
    position.setXYZ(offset, start.x, start.y, start.z);
    position.setXYZ(offset + 1, end.x, end.y, end.z);
    offset += 2;
    if (i % 2 === 0) {
      const other = nodeMeshes[(i + 3) % nodeMeshes.length].position;
      position.setXYZ(offset, start.x, start.y, start.z);
      position.setXYZ(offset + 1, other.x, other.y, other.z);
      offset += 2;
    }
  }
  position.needsUpdate = true;
}

function animate() {
  const elapsed = clock.getElapsedTime();
  const mode = modes[activeMode];
  const drift = Number(timeSlider.value) / 100;
  const xrayBoost = xray ? 1.75 : 1;
  const ghostBoost = ghostSwitch.checked ? 1.3 : 1;

  camera.position.lerp(targetCamera, cinematic ? 0.024 : 0.04);
  camera.lookAt(
    lookTarget.x + Math.sin(elapsed * 0.2) * 0.28,
    lookTarget.y + Math.cos(elapsed * 0.16) * 0.18,
    lookTarget.z
  );

  world.rotation.y = elapsed * 0.045 * mode.intensity;
  nodeGroup.rotation.y = elapsed * 0.035 + drift * 0.4;
  agentGroup.rotation.y = -elapsed * 0.22;
  lineGroup.rotation.y = nodeGroup.rotation.y;
  weatherGroup.rotation.y = elapsed * 0.08 * mode.intensity;
  weatherGroup.rotation.x = Math.sin(elapsed * 0.11) * 0.08;

  core.rotation.x = elapsed * 0.13;
  core.rotation.y = elapsed * 0.19;
  coreWire.rotation.x = elapsed * 0.16;
  coreWire.rotation.z = elapsed * 0.23;
  core.material.emissiveIntensity = 0.55 + Math.sin(elapsed * 2.2) * 0.18;

  stars.rotation.y = elapsed * 0.006;
  signalDust.rotation.y = -elapsed * 0.1;
  signalDust.material.opacity = anomalySwitch.checked ? 0.8 : 0.34;
  connectionLines.material.opacity = xray ? 0.72 : 0.34;

  weatherRings.forEach((ring, index) => {
    ring.rotation.z += 0.0018 * (index + 1) * mode.intensity;
    ring.material.opacity = (0.12 + Math.sin(elapsed * (0.7 + index * 0.18)) * 0.04) * ghostBoost;
  });

  nodeMeshes.forEach((mesh, index) => {
    const base = mesh.userData.base;
    const pulse = Math.sin(elapsed * 1.8 + index * 1.3) * 0.18;
    mesh.position.y = base.y + pulse + Math.sin(drift * Math.PI * 2 + index) * 0.28;
    mesh.material.emissiveIntensity = (index === activeSignalIndex ? 2 : 1.05) * xrayBoost;
    mesh.children[0].rotation.z = elapsed * (0.7 + index * 0.08);
  });

  agentGroup.children.forEach((orb) => {
    const { angle, radius, index } = orb.userData;
    const a = angle + elapsed * (0.35 + index * 0.018);
    orb.position.set(Math.cos(a) * radius, 2 + Math.sin(elapsed + index) * 0.4, Math.sin(a) * radius);
    orb.scale.setScalar(1 + Math.sin(elapsed * 3 + index) * 0.12);
  });

  updateLineGeometry();
  keyLight.intensity = 80 + Math.sin(elapsed * 1.5) * 24 + Number(xray) * 45;
  redLight.intensity = ghostSwitch.checked ? 95 : 52;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function hydrateIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  } else {
    window.setTimeout(hydrateIcons, 100);
  }
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => setMode(button.dataset.mode));
});

document.querySelectorAll(".time-node").forEach((button) => {
  button.addEventListener("click", () => {
    branchIndex = Number(button.dataset.branch);
    document.querySelectorAll(".time-node").forEach((node) => node.classList.remove("is-active"));
    button.classList.add("is-active");
    selectSignal(branchIndex + 2);
    const descriptions = [
      "Origin frame stabilized. The first decision is still shaping the room.",
      "Fork A accelerates launch and raises support heat. Skeptic is watching closely.",
      "Fork B validates first. Confidence rises while spectacle waits in reserve.",
      "Fork C dark-launches onboarding and preserves the cinematic reveal."
    ];
    feedText.textContent = descriptions[branchIndex];
    timeSlider.value = [56, 82, 42, 64][branchIndex];
    updateTimeOutput();
  });
});

canvas.addEventListener("pointermove", (event) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  cursorHalo.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;

  const now = performance.now();
  const speed = now - lastPointerMove;
  if (speed < 18) {
    shakeEnergy += 1;
  } else {
    shakeEnergy = Math.max(0, shakeEnergy - 0.35);
  }
  lastPointerMove = now;

  if (shakeEnergy > 32) {
    shakeEnergy = 0;
    anomalySwitch.checked = true;
    feedText.textContent = "Anomaly Heat surfaced a hidden dependency. The Field noticed the gesture.";
    selectSignal(1);
  }
});

canvas.addEventListener("pointerdown", () => {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(nodeMeshes, false);
  if (hits.length) {
    selectSignal(hits[0].object.userData.index);
  }
});

timeSlider.addEventListener("input", () => {
  updateTimeOutput();
  const value = Number(timeSlider.value);
  if (value > 78) {
    feedText.textContent = "The accelerated branch is heating up. Support load is now the dominant storm front.";
  } else if (value < 32) {
    feedText.textContent = "The cautious branch cools risk but dims launch spectacle. Phantom suggests a hybrid path.";
  }
});

commandInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleCommand(commandInput.value);
  }
});

briefingButton.addEventListener("click", runBriefing);
overlayClose.addEventListener("click", closeOverlay);
overlayScreen.addEventListener("click", (event) => {
  if (event.target === overlayScreen) closeOverlay();
});

xrayButton.addEventListener("click", () => {
  xray = !xray;
  xrayButton.setAttribute("aria-pressed", String(xray));
  shell.classList.toggle("xray", xray);
  feedText.textContent = xray
    ? "Causal X-Ray is active. Invisible dependencies are now overexposed."
    : "Causal X-Ray folded away. The Field returned to normal luminance.";
});

silenceButton.addEventListener("click", () => {
  silence = !silence;
  silenceButton.setAttribute("aria-pressed", String(silence));
  shell.classList.toggle("silence", silence);
  feedText.textContent = silence
    ? "Silence Mode engaged. The world will speak through motion only."
    : "Silence Mode disengaged. Tactical overlays restored.";
});

anomalySwitch.addEventListener("change", () => {
  feedText.textContent = anomalySwitch.checked
    ? "Anomaly Heat restored. Strange patterns will glow before they explain themselves."
    : "Anomaly Heat muted. The Field will stop surfacing soft warnings.";
  updateVitals();
});

ghostSwitch.addEventListener("change", () => {
  if (ghostSwitch.checked) {
    feedText.textContent = "Ghost Decisions are awake. Old branches may now influence active forecasts.";
    setMode("archive");
  } else {
    feedText.textContent = "Ghost Decisions sealed. The archive is quiet again.";
  }
  updateVitals();
});

originButton.addEventListener("click", () => {
  originClicks += 1;
  if (originClicks >= 9) {
    originClicks = 0;
    openOriginRoom();
  } else if (originClicks >= 5) {
    feedText.textContent = `Origin Room proximity: ${9 - originClicks} sealed gestures remaining.`;
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeOverlay();
  }
  if (event.key.toLowerCase() === "x") {
    xrayButton.click();
  }
});

window.addEventListener("resize", resize);
window.addEventListener("load", () => {
  window.setTimeout(() => {
    boot.classList.add("is-hidden");
  }, 1250);
});

resize();
hydrateIcons();
selectSignal(0, "silent");
updateTimeOutput();
animate();
