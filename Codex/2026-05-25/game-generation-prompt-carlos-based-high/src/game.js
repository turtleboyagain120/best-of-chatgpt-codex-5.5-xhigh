(function () {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const ui = {
    title: document.getElementById("titleScreen"),
    start: document.getElementById("startButton"),
    hud: document.getElementById("hud"),
    ending: document.getElementById("ending"),
    restart: document.getElementById("restartButton"),
    zoneName: document.getElementById("zoneName"),
    objective: document.getElementById("objective"),
    systemState: document.getElementById("systemState"),
    health: document.getElementById("healthBar"),
    energy: document.getElementById("energyBar"),
    glitch: document.getElementById("glitchBar"),
    prompt: document.getElementById("prompt"),
    toast: document.getElementById("toast")
  };

  const TAU = Math.PI * 2;
  const HALF_PI = Math.PI * 0.5;
  const keys = new Set();
  const pressed = Object.create(null);
  const view = { w: 1, h: 1, dpr: 1 };
  const pointer = { x: 0, y: 0, down: false, has: false };

  const camera = {
    x: 0,
    y: 0,
    zoom: 1,
    shake: 0,
    trauma: 0
  };

  const state = {
    mode: "title",
    time: 0,
    last: 0,
    levelIndex: 0,
    level: null,
    player: null,
    particles: [],
    rings: [],
    background: [],
    transition: null,
    toastTime: 0,
    promptText: "",
    audioReady: false
  };

  const LEVELS = [
    {
      name: "Stable Simulation Zone",
      system: "STABLE",
      objective: "Charge the clean physics nodes and open the first portal.",
      size: { w: 2300, h: 1600 },
      spawn: { x: -820, y: 470 },
      portal: { x: 870, y: -420 },
      nodes: [
        { x: -460, y: 130 },
        { x: 230, y: 360 },
        { x: 620, y: -180 }
      ],
      enemies: [
        { x: -130, y: 80, type: "sentinel" },
        { x: 450, y: 260, type: "sentinel" },
        { x: 670, y: -560, type: "warden" }
      ],
      hazards: [
        { x: 50, y: -370, r: 78, type: "static" },
        { x: 760, y: 170, r: 92, type: "static" }
      ],
      palette: {
        skyA: "#061119",
        skyB: "#0c2330",
        skyC: "#171124",
        floor: "rgba(32, 118, 132, 0.18)",
        grid: "rgba(102, 247, 255, 0.24)",
        accent: "#66f7ff",
        accent2: "#6dffb6",
        warning: "#ffd166",
        enemy: "#ff4bd8",
        core: "#66f7ff",
        shadow: "rgba(0, 12, 22, 0.56)"
      }
    },
    {
      name: "Corrupted Zone",
      system: "CORRUPTING",
      objective: "Shift the broken nodes before the zone forgets its geometry.",
      size: { w: 2450, h: 1780 },
      spawn: { x: -920, y: 560 },
      portal: { x: 940, y: -540 },
      nodes: [
        { x: -590, y: -100 },
        { x: 120, y: 410 },
        { x: 650, y: -90 }
      ],
      enemies: [
        { x: -220, y: -230, type: "corruptor" },
        { x: 280, y: 120, type: "corruptor" },
        { x: 750, y: -350, type: "wraith" },
        { x: 740, y: 300, type: "corruptor" }
      ],
      hazards: [
        { x: -140, y: 250, r: 96, type: "rift" },
        { x: 420, y: -360, r: 126, type: "rift" },
        { x: 760, y: 110, r: 86, type: "rift" }
      ],
      palette: {
        skyA: "#130711",
        skyB: "#250a2b",
        skyC: "#081216",
        floor: "rgba(178, 30, 115, 0.15)",
        grid: "rgba(255, 75, 216, 0.22)",
        accent: "#ff4bd8",
        accent2: "#66f7ff",
        warning: "#ff315d",
        enemy: "#ffd166",
        core: "#ff4bd8",
        shadow: "rgba(16, 0, 24, 0.62)"
      }
    },
    {
      name: "Core System Layer",
      system: "CRITICAL",
      objective: "Wake every core node, fracture Rickr, and exit the collapse.",
      size: { w: 2500, h: 1850 },
      spawn: { x: -920, y: 610 },
      portal: { x: 760, y: -520 },
      nodes: [
        { x: -640, y: 10 },
        { x: 0, y: 420 },
        { x: 550, y: -40 }
      ],
      enemies: [
        { x: -240, y: 80, type: "wraith" },
        { x: 210, y: 220, type: "wraith" },
        { x: 610, y: 270, type: "warden" },
        { x: 900, y: -180, type: "corruptor" }
      ],
      hazards: [
        { x: -260, y: 360, r: 112, type: "lava" },
        { x: 250, y: -230, r: 132, type: "lava" },
        { x: 640, y: 150, r: 100, type: "lava" }
      ],
      boss: { x: 780, y: -520, hp: 230 },
      palette: {
        skyA: "#080408",
        skyB: "#270b16",
        skyC: "#2f1807",
        floor: "rgba(255, 49, 93, 0.13)",
        grid: "rgba(255, 209, 102, 0.22)",
        accent: "#ffd166",
        accent2: "#ff4bd8",
        warning: "#ff315d",
        enemy: "#66f7ff",
        core: "#ff315d",
        shadow: "rgba(18, 4, 4, 0.68)"
      }
    }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  }

  function length(x, y) {
    return Math.hypot(x, y);
  }

  function angleTo(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
  }

  function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function seeded(seed) {
    let value = seed >>> 0;
    return function rand() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.floor(view.w * view.dpr);
    canvas.height = Math.floor(view.h * view.dpr);
    canvas.style.width = `${view.w}px`;
    canvas.style.height = `${view.h}px`;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  }

  function resetPlayer() {
    const spawn = LEVELS[state.levelIndex].spawn;
    state.player = {
      x: spawn.x,
      y: spawn.y,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 24,
      health: 100,
      energy: 100,
      glitch: 0,
      face: -0.2,
      run: 0,
      dash: 0,
      dashCooldown: 0,
      ringCooldown: 0,
      hurtCooldown: 0,
      jumpCooldown: 0,
      timeSlow: 0,
      timeCooldown: 0,
      transform: 0,
      invulnerable: 0
    };
  }

  function buildLevel(index) {
    const config = LEVELS[index];
    const rand = seeded(7000 + index * 981);
    const decor = [];
    const stars = [];
    const bounds = config.size;

    for (let i = 0; i < 90; i += 1) {
      stars.push({
        x: rand() * view.w,
        y: rand() * view.h,
        r: 0.6 + rand() * 2.4,
        depth: 0.08 + rand() * 0.32,
        alpha: 0.18 + rand() * 0.62
      });
    }

    const decorCount = index === 0 ? 34 : index === 1 ? 48 : 58;
    for (let i = 0; i < decorCount; i += 1) {
      const type = index === 0 ? "monolith" : index === 1 ? "shard" : rand() > 0.44 ? "ring" : "shard";
      decor.push({
        x: rand() * bounds.w - bounds.w / 2,
        y: rand() * bounds.h - bounds.h / 2,
        z: 22 + rand() * 130,
        size: 28 + rand() * 82,
        rot: rand() * TAU,
        spin: (rand() - 0.5) * (index + 1) * 0.45,
        type,
        alpha: 0.25 + rand() * 0.54,
        phase: rand() * TAU
      });
    }

    return {
      config,
      nodes: config.nodes.map((node, id) => ({
        ...node,
        id,
        active: false,
        pulse: 0,
        phase: rand() * TAU
      })),
      portal: { ...config.portal, active: false, pulse: 0 },
      enemies: config.enemies.map((enemy, id) => makeEnemy(enemy, id)),
      hazards: config.hazards.map((hazard) => ({ ...hazard, phase: rand() * TAU, pulse: 0 })),
      projectiles: [],
      decor,
      stars,
      boss: config.boss ? {
        x: config.boss.x,
        y: config.boss.y,
        z: 42,
        hp: config.boss.hp,
        maxHp: config.boss.hp,
        phase: rand() * TAU,
        shot: 1.4,
        hurt: 0,
        dead: false
      } : null
    };
  }

  function makeEnemy(enemy, id) {
    const table = {
      sentinel: { hp: 44, speed: 92, radius: 22, damage: 8, range: 420, color: "#ff4bd8" },
      corruptor: { hp: 58, speed: 112, radius: 25, damage: 11, range: 520, color: "#ffd166" },
      wraith: { hp: 42, speed: 145, radius: 20, damage: 10, range: 580, color: "#66f7ff" },
      warden: { hp: 84, speed: 72, radius: 32, damage: 13, range: 500, color: "#ff315d" }
    };
    const stats = table[enemy.type] || table.sentinel;
    return {
      id,
      type: enemy.type,
      x: enemy.x,
      y: enemy.y,
      vx: 0,
      vy: 0,
      hp: stats.hp,
      maxHp: stats.hp,
      speed: stats.speed,
      radius: stats.radius,
      damage: stats.damage,
      range: stats.range,
      color: stats.color,
      phase: id * 1.9,
      attack: 0.4 + id * 0.16,
      hurt: 0,
      dead: false
    };
  }

  function startGame() {
    unlockAudio();
    state.mode = "play";
    state.levelIndex = 0;
    resetPlayer();
    state.level = buildLevel(0);
    state.particles = [];
    state.rings = [];
    camera.x = state.player.x;
    camera.y = state.player.y;
    camera.trauma = 0.2;
    ui.title.hidden = true;
    ui.ending.hidden = true;
    ui.hud.hidden = false;
    toast("The notepad equation is awake.");
    updateHud();
  }

  function restartGame() {
    startGame();
  }

  function loadLevel(index) {
    state.levelIndex = index;
    const spawn = LEVELS[index].spawn;
    state.level = buildLevel(index);
    state.player.x = spawn.x;
    state.player.y = spawn.y;
    state.player.z = 0;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.vz = 0;
    state.player.energy = clamp(state.player.energy + 36, 0, 100);
    state.player.health = clamp(state.player.health + 24, 0, 100);
    camera.x = state.player.x;
    camera.y = state.player.y;
    camera.trauma = 0.32;
    toast(LEVELS[index].name);
    updateHud();
  }

  function finishGame() {
    state.mode = "ending";
    ui.hud.hidden = true;
    ui.ending.hidden = false;
    camera.trauma = 0.55;
    spawnBurst(state.player.x, state.player.y, 90, "#ffd166", 68, 260);
    playTone(122, 0.5, "sawtooth", 0.05);
    playTone(244, 0.75, "triangle", 0.04);
  }

  function queueTransition(nextIndex) {
    if (state.transition) return;
    state.transition = {
      nextIndex,
      t: 0,
      swapped: false,
      duration: 1.55
    };
    state.mode = "transition";
    camera.trauma = 0.44;
    playTone(80, 0.28, "sawtooth", 0.04);
    playTone(420, 0.22, "triangle", 0.035);
  }

  function updateTransition(dt) {
    const transition = state.transition;
    if (!transition) return;
    transition.t += dt;
    const midpoint = transition.duration * 0.48;

    if (!transition.swapped && transition.t >= midpoint) {
      transition.swapped = true;
      if (transition.nextIndex >= LEVELS.length) {
        finishGame();
        state.transition = null;
        return;
      }
      state.mode = "play";
      loadLevel(transition.nextIndex);
      state.mode = "transition";
    }

    if (transition.t >= transition.duration) {
      state.mode = "play";
      state.transition = null;
    }
  }

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  function handleKeyDown(event) {
    const name = keyName(event);
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }

    if (state.mode === "title" && (event.key === "Enter" || event.key === " ")) {
      startGame();
      return;
    }

    keys.add(name);
    if (!event.repeat) {
      pressed[name] = true;
    }
  }

  function handleKeyUp(event) {
    keys.delete(keyName(event));
  }

  function pointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.has = true;
  }

  function pointerDown(event) {
    pointerMove(event);
    pointer.down = true;
    unlockAudio();
    if (state.mode === "title") {
      startGame();
      return;
    }
    if (state.mode === "play") {
      pressed.attack = true;
    }
  }

  function pointerUp() {
    pointer.down = false;
  }

  function update(dt) {
    state.time += dt;

    if (state.mode === "transition") {
      updatePlayable(dt);
      updateTransition(dt);
      clearPressed();
      return;
    }

    if (state.mode === "play") {
      updatePlayable(dt);
    } else {
      updateAmbient(dt);
    }

    clearPressed();
  }

  function updateAmbient(dt) {
    updateParticles(dt);
    camera.x = lerp(camera.x, Math.sin(state.time * 0.09) * 120, 0.015);
    camera.y = lerp(camera.y, Math.cos(state.time * 0.07) * 60, 0.015);
    camera.trauma = Math.max(0, camera.trauma - dt * 0.22);
  }

  function updatePlayable(dt) {
    const player = state.player;
    const level = state.level;
    const timeFactor = player.timeSlow > 0 ? 0.32 : 1;

    updatePlayer(dt);
    updateNodes(dt);
    updateEnemies(dt * timeFactor, dt);
    updateBoss(dt * timeFactor, dt);
    updateHazards(dt * timeFactor, dt);
    updateProjectiles(dt * timeFactor, dt);
    updateParticles(dt);
    updateRings(dt);
    updatePortal(dt);
    updateCamera(dt);

    const portalReady = isPortalReady();
    level.portal.active = portalReady;

    if (portalReady && distanceTo(player, level.portal) < 82 && (pressed.e || pressed.Enter)) {
      queueTransition(state.levelIndex + 1);
    }

    if (player.health <= 0) {
      player.health = 100;
      player.energy = 70;
      player.glitch = 0;
      camera.trauma = 0.75;
      spawnBurst(player.x, player.y, 90, LEVELS[state.levelIndex].palette.warning, 76, 320);
      loadLevel(state.levelIndex);
      toast("Carlos recompiled at the zone edge.");
    }

    updateHud();
  }

  function updatePlayer(dt) {
    const player = state.player;
    const level = state.level;
    const bounds = level.config.size;
    let ix = 0;
    let iy = 0;

    if (keys.has("a") || keys.has("ArrowLeft")) ix -= 1;
    if (keys.has("d") || keys.has("ArrowRight")) ix += 1;
    if (keys.has("w") || keys.has("ArrowUp")) iy -= 1;
    if (keys.has("s") || keys.has("ArrowDown")) iy += 1;

    const moving = ix !== 0 || iy !== 0;
    if (moving) {
      const mag = length(ix, iy);
      ix /= mag;
      iy /= mag;
      player.face = Math.atan2(iy, ix);
    }

    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.ringCooldown = Math.max(0, player.ringCooldown - dt);
    player.jumpCooldown = Math.max(0, player.jumpCooldown - dt);
    player.timeCooldown = Math.max(0, player.timeCooldown - dt);
    player.hurtCooldown = Math.max(0, player.hurtCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.transform = Math.max(0, player.transform - dt);
    player.timeSlow = Math.max(0, player.timeSlow - dt);

    const transformed = player.transform > 0;
    const speed = transformed ? 304 : 238;
    const acceleration = moving ? 1 - Math.exp(-13 * dt) : 1 - Math.exp(-9 * dt);
    player.vx = lerp(player.vx, ix * speed, acceleration);
    player.vy = lerp(player.vy, iy * speed, acceleration);

    if ((pressed.Shift || pressed.shift) && player.dashCooldown <= 0 && player.energy >= 12) {
      const angle = moving ? Math.atan2(iy, ix) : player.face;
      player.vx += Math.cos(angle) * 740;
      player.vy += Math.sin(angle) * 740;
      player.dash = 0.18;
      player.invulnerable = 0.24;
      player.dashCooldown = transformed ? 0.42 : 0.62;
      player.energy -= 12;
      camera.trauma = Math.max(camera.trauma, 0.2);
      spawnTrail(player.x, player.y, "#66f7ff", 14);
      playTone(180, 0.08, "sawtooth", 0.028);
    }

    if (pressed[" "] && player.z <= 0.1 && player.jumpCooldown <= 0) {
      player.vz = 520;
      player.jumpCooldown = 0.62;
      camera.trauma = Math.max(camera.trauma, 0.12);
      spawnRing(player.x, player.y, "#6dffb6", 30, 120, 0.35);
      playTone(280, 0.11, "triangle", 0.03);
    }

    if ((pressed.q || pressed.Q) && player.timeCooldown <= 0 && player.energy >= 30) {
      player.timeSlow = transformed ? 5.4 : 3.7;
      player.timeCooldown = 8;
      player.energy -= 30;
      camera.trauma = Math.max(camera.trauma, 0.3);
      spawnRing(player.x, player.y, "#66f7ff", 80, 500, 0.8);
      toast("Local time distortion engaged.");
      playTone(96, 0.32, "sine", 0.045);
    }

    if ((pressed.j || pressed.J || pressed.attack) && player.ringCooldown <= 0) {
      fireRingPulse();
    }

    if ((pressed.e || pressed.E) && interactWithNode()) {
      return;
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= Math.pow(0.0008, dt);
    player.vy *= Math.pow(0.0008, dt);
    player.z += player.vz * dt;
    player.vz -= 1480 * dt;
    if (player.z < 0) {
      if (player.vz < -260) {
        spawnRing(player.x, player.y, "#ffd166", 20, 140, 0.25);
      }
      player.z = 0;
      player.vz = 0;
    }

    player.x = clamp(player.x, -bounds.w / 2 + 60, bounds.w / 2 - 60);
    player.y = clamp(player.y, -bounds.h / 2 + 60, bounds.h / 2 - 60);
    player.run += (moving ? 11 : 3) * dt;
    player.energy = clamp(player.energy + dt * (transformed ? 13 : 7), 0, 100);

    if (player.glitch >= 100 && player.transform <= 0) {
      player.glitch = 0;
      player.transform = 9.5;
      player.energy = 100;
      player.health = clamp(player.health + 18, 0, 100);
      camera.trauma = 0.64;
      spawnBurst(player.x, player.y, 120, "#ff4bd8", 92, 430);
      spawnRing(player.x, player.y, "#ff4bd8", 60, 660, 1.05);
      toast("Glitch transformation online.");
      playTone(64, 0.32, "sawtooth", 0.05);
      playTone(512, 0.45, "triangle", 0.04);
    }
  }

  function interactWithNode() {
    const player = state.player;
    const level = state.level;
    let best = null;
    let bestDistance = Infinity;

    for (const node of level.nodes) {
      if (node.active) continue;
      const d = distanceTo(player, node);
      if (d < 96 && d < bestDistance) {
        best = node;
        bestDistance = d;
      }
    }

    if (!best) return false;

    best.active = true;
    best.pulse = 1;
    player.glitch = clamp(player.glitch + 26, 0, 100);
    player.energy = clamp(player.energy + 22, 0, 100);
    camera.trauma = Math.max(camera.trauma, 0.32);
    spawnBurst(best.x, best.y, 42, state.level.config.palette.accent, 42, 240);
    spawnRing(best.x, best.y, state.level.config.palette.accent2, 42, 280, 0.75);
    toast("Physics node rewritten.");
    playTone(330, 0.12, "triangle", 0.03);
    playTone(660, 0.16, "sine", 0.025);
    return true;
  }

  function fireRingPulse() {
    const player = state.player;
    const level = state.level;
    const transformed = player.transform > 0;
    const cost = transformed ? 5 : 16;
    if (player.energy < cost) {
      toast("The ring needs charge.");
      return;
    }

    player.energy -= cost;
    player.ringCooldown = transformed ? 0.18 : 0.34;
    const target = pointer.has ? screenToWorld(pointer.x, pointer.y) : {
      x: player.x + Math.cos(player.face) * 180,
      y: player.y + Math.sin(player.face) * 180
    };
    const angle = angleTo(player.x, player.y, target.x, target.y);
    player.face = angle;
    const range = transformed ? 260 : 205;
    const damage = transformed ? 40 : 24;
    const cone = transformed ? -0.1 : 0.18;

    spawnRing(player.x, player.y, transformed ? "#ff4bd8" : "#66f7ff", 40, range, 0.26);
    for (let i = 0; i < 28; i += 1) {
      const spread = (Math.random() - 0.5) * 1.05;
      const speed = 260 + Math.random() * 340;
      spawnParticle({
        x: player.x + Math.cos(angle + spread) * 22,
        y: player.y + Math.sin(angle + spread) * 22,
        z: 18 + Math.random() * 22,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        vz: 40 + Math.random() * 120,
        life: 0.28 + Math.random() * 0.26,
        size: 3 + Math.random() * 6,
        color: transformed ? "#ff4bd8" : "#66f7ff",
        type: "spark"
      });
    }

    for (const enemy of level.enemies) {
      if (enemy.dead) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const d = Math.hypot(dx, dy);
      const dot = d > 0 ? (Math.cos(angle) * dx + Math.sin(angle) * dy) / d : 1;
      if (d < range && dot > cone) {
        damageEnemy(enemy, damage, angle);
      }
    }

    if (level.boss && !level.boss.dead) {
      const boss = level.boss;
      const dx = boss.x - player.x;
      const dy = boss.y - player.y;
      const d = Math.hypot(dx, dy);
      const dot = d > 0 ? (Math.cos(angle) * dx + Math.sin(angle) * dy) / d : 1;
      if (d < range + 70 && dot > -0.22) {
        boss.hp -= transformed ? 26 : 15;
        boss.hurt = 0.22;
        camera.trauma = Math.max(camera.trauma, 0.34);
        spawnBurst(boss.x, boss.y, 34, "#ff315d", 38, 260);
        if (boss.hp <= 0) {
          boss.dead = true;
          boss.hp = 0;
          player.glitch = 100;
          spawnBurst(boss.x, boss.y, 130, "#ffd166", 126, 520);
          spawnRing(boss.x, boss.y, "#ffd166", 90, 840, 1.1);
          toast("Rickr has been destabilized.");
        }
      }
    }

    camera.trauma = Math.max(camera.trauma, transformed ? 0.34 : 0.22);
    playTone(transformed ? 172 : 220, 0.08, "sawtooth", 0.036);
    playTone(transformed ? 516 : 440, 0.13, "triangle", 0.03);
  }

  function updateNodes(dt) {
    for (const node of state.level.nodes) {
      node.phase += dt * (node.active ? 2.2 : 1.1);
      node.pulse = Math.max(0, node.pulse - dt * 1.8);
    }
  }

  function updatePortal(dt) {
    const portal = state.level.portal;
    portal.pulse += dt * (portal.active ? 3.4 : 1.2);
  }

  function updateEnemies(enemyDt, realDt) {
    const player = state.player;
    const level = state.level;

    for (const enemy of level.enemies) {
      if (enemy.dead) continue;
      enemy.phase += enemyDt * 3.4;
      enemy.attack -= enemyDt;
      enemy.hurt = Math.max(0, enemy.hurt - realDt);

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const d = Math.hypot(dx, dy) || 1;
      const alert = d < enemy.range || state.levelIndex > 0;
      const preferred = enemy.type === "warden" ? 150 : 66;

      if (alert) {
        const dirX = dx / d;
        const dirY = dy / d;
        const moveSign = d > preferred ? 1 : -0.36;
        enemy.vx = lerp(enemy.vx, dirX * enemy.speed * moveSign, 1 - Math.exp(-4.8 * enemyDt));
        enemy.vy = lerp(enemy.vy, dirY * enemy.speed * moveSign, 1 - Math.exp(-4.8 * enemyDt));
      } else {
        enemy.vx = lerp(enemy.vx, Math.cos(enemy.phase) * 22, 1 - Math.exp(-2 * enemyDt));
        enemy.vy = lerp(enemy.vy, Math.sin(enemy.phase * 0.8) * 22, 1 - Math.exp(-2 * enemyDt));
      }

      enemy.x += enemy.vx * enemyDt;
      enemy.y += enemy.vy * enemyDt;

      if (d < enemy.radius + player.radius + 10 && player.invulnerable <= 0 && player.z < 70) {
        hurtPlayer(enemy.damage);
        enemy.attack = 0.75;
        const push = angleTo(enemy.x, enemy.y, player.x, player.y);
        player.vx += Math.cos(push) * 260;
        player.vy += Math.sin(push) * 260;
      }

      if (enemy.attack <= 0 && d < enemy.range + 80) {
        enemy.attack = enemy.type === "warden" ? 1.35 : 1.85;
        const aim = Math.atan2(dy, dx);
        const speed = enemy.type === "wraith" ? 270 : 215;
        level.projectiles.push({
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(aim) * speed,
          vy: Math.sin(aim) * speed,
          r: enemy.type === "warden" ? 12 : 8,
          damage: enemy.type === "warden" ? 12 : 8,
          life: 3.1,
          color: enemy.color,
          phase: enemy.phase
        });
        spawnParticle({
          x: enemy.x,
          y: enemy.y,
          z: 35,
          vx: Math.cos(aim) * 90,
          vy: Math.sin(aim) * 90,
          vz: 20,
          life: 0.28,
          size: 14,
          color: enemy.color,
          type: "orb"
        });
      }
    }

    level.enemies = level.enemies.filter((enemy) => !enemy.dead);
  }

  function damageEnemy(enemy, amount, angle) {
    enemy.hp -= amount;
    enemy.hurt = 0.18;
    enemy.vx += Math.cos(angle) * 250;
    enemy.vy += Math.sin(angle) * 250;
    spawnBurst(enemy.x, enemy.y, 16, enemy.color, 26, 190);
    if (enemy.hp <= 0) {
      enemy.dead = true;
      state.player.glitch = clamp(state.player.glitch + 17, 0, 100);
      state.player.energy = clamp(state.player.energy + 13, 0, 100);
      spawnBurst(enemy.x, enemy.y, 38, state.level.config.palette.accent2, 44, 300);
      spawnRing(enemy.x, enemy.y, enemy.color, 25, 170, 0.38);
      playTone(140 + Math.random() * 100, 0.1, "sawtooth", 0.026);
    }
  }

  function updateBoss(enemyDt, realDt) {
    const boss = state.level.boss;
    if (!boss || boss.dead) return;
    const player = state.player;
    boss.phase += realDt;
    boss.hurt = Math.max(0, boss.hurt - realDt);
    boss.z = 48 + Math.sin(boss.phase * 2.2) * 18;
    boss.shot -= enemyDt;

    if (boss.shot <= 0) {
      boss.shot = boss.hp < boss.maxHp * 0.45 ? 0.9 : 1.35;
      const count = boss.hp < boss.maxHp * 0.45 ? 14 : 10;
      const base = Math.atan2(player.y - boss.y, player.x - boss.x);
      for (let i = 0; i < count; i += 1) {
        const angle = base + (i / count - 0.5) * TAU + Math.sin(boss.phase) * 0.2;
        const speed = 170 + (i % 2) * 38;
        state.level.projectiles.push({
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 11,
          damage: 12,
          life: 4.2,
          color: "#ff315d",
          phase: boss.phase + i
        });
      }
      spawnRing(boss.x, boss.y, "#ff315d", 50, 290, 0.58);
      camera.trauma = Math.max(camera.trauma, 0.2);
      playTone(72, 0.16, "sawtooth", 0.032);
    }

    if (distanceTo(player, boss) < 88 && player.invulnerable <= 0 && player.z < 70) {
      hurtPlayer(15);
      const push = angleTo(boss.x, boss.y, player.x, player.y);
      player.vx += Math.cos(push) * 380;
      player.vy += Math.sin(push) * 380;
    }
  }

  function updateHazards(enemyDt, realDt) {
    const player = state.player;
    for (const hazard of state.level.hazards) {
      hazard.phase += enemyDt * 1.8;
      hazard.pulse = (Math.sin(hazard.phase) + 1) * 0.5;
      const d = distanceTo(player, hazard);
      const activeRadius = hazard.r * (0.72 + hazard.pulse * 0.28);
      if (d < activeRadius && player.z < 64 && player.invulnerable <= 0) {
        hurtPlayer((hazard.type === "static" ? 4 : 7) * realDt * 6);
        const push = angleTo(hazard.x, hazard.y, player.x, player.y);
        player.vx += Math.cos(push) * 18;
        player.vy += Math.sin(push) * 18;
      }
    }
  }

  function updateProjectiles(enemyDt, realDt) {
    const player = state.player;
    const projectiles = state.level.projectiles;
    for (const shot of projectiles) {
      shot.x += shot.vx * enemyDt;
      shot.y += shot.vy * enemyDt;
      shot.life -= realDt;
      shot.phase += realDt * 6;
      if (shot.life > 0 && player.invulnerable <= 0 && player.z < 70 && distanceTo(player, shot) < player.radius + shot.r) {
        shot.life = 0;
        hurtPlayer(shot.damage);
        spawnBurst(shot.x, shot.y, 18, shot.color, 24, 160);
      }
    }
    state.level.projectiles = projectiles.filter((shot) => shot.life > 0);
  }

  function updateParticles(dt) {
    const gravity = 320;
    for (const particle of state.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vx *= Math.pow(0.16, dt);
      particle.vy *= Math.pow(0.16, dt);
      particle.vz -= gravity * dt;
      if (particle.z < 0) {
        particle.z = 0;
        particle.vz *= -0.24;
      }
    }
    state.particles = state.particles.filter((particle) => particle.age < particle.life);
  }

  function updateRings(dt) {
    for (const ring of state.rings) {
      ring.age += dt;
    }
    state.rings = state.rings.filter((ring) => ring.age < ring.life);
  }

  function hurtPlayer(amount) {
    const player = state.player;
    if (player.hurtCooldown > 0 || player.invulnerable > 0 || player.transform > 0) return;
    player.health = clamp(player.health - amount, 0, 100);
    player.hurtCooldown = 0.28;
    player.invulnerable = 0.2;
    camera.trauma = Math.max(camera.trauma, 0.36);
    spawnBurst(player.x, player.y, 14, "#ff315d", 22, 190);
    playTone(92, 0.12, "sawtooth", 0.034);
  }

  function updateCamera(dt) {
    const player = state.player;
    const lookX = player.vx * 0.2;
    const lookY = player.vy * 0.2;
    const targetX = player.x + lookX;
    const targetY = player.y + lookY - 20;
    const speed = 1 - Math.exp(-5.8 * dt);
    camera.x = lerp(camera.x, targetX, speed);
    camera.y = lerp(camera.y, targetY, speed);
    const motion = clamp(length(player.vx, player.vy) / 840, 0, 1);
    const targetZoom = view.w < 720 ? 0.68 : lerp(0.86, 0.78, motion);
    camera.zoom = lerp(camera.zoom, targetZoom, 1 - Math.exp(-2.5 * dt));
    camera.trauma = Math.max(0, camera.trauma - dt * 0.7);
    camera.shake = camera.trauma * camera.trauma * 24;
  }

  function isPortalReady() {
    const level = state.level;
    const nodesReady = level.nodes.every((node) => node.active);
    const bossReady = !level.boss || level.boss.dead;
    return nodesReady && bossReady;
  }

  function updateHud() {
    if (state.mode === "title" || state.mode === "ending" || !state.player) return;
    const player = state.player;
    const level = state.level;
    ui.zoneName.textContent = level.config.name;
    ui.health.style.transform = `scaleX(${clamp(player.health / 100, 0, 1)})`;
    ui.energy.style.transform = `scaleX(${clamp(player.energy / 100, 0, 1)})`;
    ui.glitch.style.transform = `scaleX(${clamp(player.glitch / 100, 0, 1)})`;

    if (player.transform > 0) {
      ui.systemState.textContent = "GLITCH FORM";
      ui.systemState.style.color = "#ff4bd8";
    } else if (player.timeSlow > 0) {
      ui.systemState.textContent = "TIME BENT";
      ui.systemState.style.color = "#66f7ff";
    } else {
      ui.systemState.textContent = level.config.system;
      ui.systemState.style.color = level.config.system === "CRITICAL" ? "#ff315d" : level.config.system === "CORRUPTING" ? "#ffd166" : "#6dffb6";
    }

    const activeNodes = level.nodes.filter((node) => node.active).length;
    if (level.boss && !level.boss.dead && activeNodes === level.nodes.length) {
      ui.objective.textContent = "Rickr is exposed. Break the red core with ring pulses.";
    } else if (isPortalReady()) {
      ui.objective.textContent = "Portal unlocked. Cross the light and leave this layer.";
    } else {
      ui.objective.textContent = `${level.config.objective} ${activeNodes}/${level.nodes.length}`;
    }

    const prompt = findPrompt();
    ui.prompt.textContent = prompt;
    ui.prompt.style.opacity = prompt ? "1" : "0";

    state.toastTime = Math.max(0, state.toastTime - 1 / 60);
    ui.toast.classList.toggle("visible", state.toastTime > 0);
  }

  function findPrompt() {
    const player = state.player;
    const level = state.level;

    for (const node of level.nodes) {
      if (!node.active && distanceTo(player, node) < 98) {
        return "Rewrite physics node";
      }
    }

    if (isPortalReady() && distanceTo(player, level.portal) < 96) {
      return state.levelIndex === LEVELS.length - 1 ? "Exit the Core System Layer" : "Enter the next simulation layer";
    }

    if (level.boss && !level.boss.dead && distanceTo(player, level.boss) < 300) {
      return "Rickr core integrity failing";
    }

    return "";
  }

  function toast(message) {
    ui.toast.textContent = message;
    state.toastTime = 2.6;
  }

  function draw() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);

    const level = state.level || buildLevel(0);
    drawBackground(level);
    enterWorld();
    drawWorld(level);
    exitWorld();
    drawScreenEffects();
    drawTransition();
  }

  function drawBackground(level) {
    const palette = level.config.palette;
    const gradient = ctx.createLinearGradient(0, 0, view.w, view.h);
    gradient.addColorStop(0, palette.skyA);
    gradient.addColorStop(0.48, palette.skyB);
    gradient.addColorStop(1, palette.skyC);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.w, view.h);

    for (const star of level.stars) {
      const x = (star.x - camera.x * star.depth + view.w * 10) % view.w;
      const y = (star.y - camera.y * star.depth + view.h * 10) % view.h;
      ctx.globalAlpha = star.alpha * (0.55 + Math.sin(state.time * 1.7 + star.x) * 0.25);
      ctx.fillStyle = palette.accent2;
      ctx.beginPath();
      ctx.arc(x, y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    const glow = ctx.createRadialGradient(view.w * 0.72, view.h * 0.26, 20, view.w * 0.72, view.h * 0.26, Math.max(view.w, view.h) * 0.7);
    glow.addColorStop(0, colorWithAlpha(palette.core, 0.26));
    glow.addColorStop(0.45, colorWithAlpha(palette.accent, 0.08));
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function enterWorld() {
    const shake = camera.shake;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    ctx.save();
    ctx.translate(view.w / 2 + sx, view.h / 2 + sy);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
  }

  function exitWorld() {
    ctx.restore();
  }

  function drawWorld(level) {
    drawFloor(level);
    drawHazards(level);
    drawPortal(level);
    drawNodes(level);
    drawRings();

    const drawables = [];
    for (const deco of level.decor) drawables.push({ y: deco.y + deco.z * 0.1, draw: () => drawDecor(deco, level) });
    for (const enemy of level.enemies) drawables.push({ y: enemy.y + 30, draw: () => drawEnemy(enemy) });
    if (level.boss && !level.boss.dead) drawables.push({ y: level.boss.y + 72, draw: () => drawBoss(level.boss) });
    for (const shot of level.projectiles) drawables.push({ y: shot.y + 12, draw: () => drawProjectile(shot) });
    for (const particle of state.particles) drawables.push({ y: particle.y + 12, draw: () => drawParticle(particle) });
    drawables.push({ y: state.player.y + state.player.z + 40, draw: drawPlayer });
    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) item.draw();
  }

  function drawFloor(level) {
    const { w, h } = level.config.size;
    const palette = level.config.palette;
    ctx.save();
    const floorGradient = ctx.createRadialGradient(0, 0, 80, 0, 0, Math.max(w, h) * 0.62);
    floorGradient.addColorStop(0, palette.floor);
    floorGradient.addColorStop(0.74, "rgba(255, 255, 255, 0.025)");
    floorGradient.addColorStop(1, "rgba(0, 0, 0, 0.03)");
    ctx.fillStyle = floorGradient;
    roundedRect(-w / 2, -h / 2, w, h, 26);
    ctx.fill();

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = palette.accent;
    ctx.shadowBlur = 10;
    const step = state.levelIndex === 0 ? 120 : 105;
    for (let x = -w / 2; x <= w / 2; x += step) {
      ctx.beginPath();
      const jitter = state.levelIndex === 1 ? Math.sin(state.time * 4 + x * 0.04) * 8 : 0;
      ctx.moveTo(x + jitter, -h / 2);
      ctx.lineTo(x - jitter, h / 2);
      ctx.stroke();
    }
    for (let y = -h / 2; y <= h / 2; y += step) {
      ctx.beginPath();
      const jitter = state.levelIndex === 1 ? Math.cos(state.time * 4 + y * 0.05) * 8 : 0;
      ctx.moveTo(-w / 2, y + jitter);
      ctx.lineTo(w / 2, y - jitter);
      ctx.stroke();
    }

    if (state.levelIndex === 2) {
      ctx.strokeStyle = "rgba(255, 209, 102, 0.18)";
      ctx.lineWidth = 3;
      for (let r = 160; r < 1200; r += 160) {
        ctx.beginPath();
        ctx.arc(420, -220, r + Math.sin(state.time * 2 + r) * 8, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawDecor(deco, level) {
    const palette = level.config.palette;
    const bob = Math.sin(state.time * 1.4 + deco.phase) * 9;
    const z = deco.z + bob;

    ctx.save();
    drawShadow(deco.x, deco.y, deco.size * 0.52, deco.size * 0.2, 0.22 * deco.alpha);
    ctx.translate(deco.x, deco.y - z);
    ctx.rotate(deco.rot + state.time * deco.spin);
    ctx.globalAlpha = deco.alpha;
    ctx.shadowColor = deco.type === "ring" ? palette.warning : palette.accent;
    ctx.shadowBlur = 22;

    if (deco.type === "monolith") {
      ctx.fillStyle = colorWithAlpha(palette.accent, 0.25);
      ctx.strokeStyle = colorWithAlpha(palette.accent2, 0.8);
      ctx.lineWidth = 2;
      roundedRect(-deco.size * 0.18, -deco.size * 0.7, deco.size * 0.36, deco.size * 1.4, 5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-deco.size * 0.3, -deco.size * 0.25);
      ctx.lineTo(deco.size * 0.3, -deco.size * 0.1);
      ctx.lineTo(deco.size * 0.1, deco.size * 0.52);
      ctx.stroke();
    } else if (deco.type === "ring") {
      ctx.strokeStyle = colorWithAlpha(palette.warning, 0.8);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 0, deco.size * 0.5, deco.size * 0.22, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = colorWithAlpha(palette.accent, 0.42);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, deco.size * 0.68, deco.size * 0.3, HALF_PI, 0, TAU);
      ctx.stroke();
    } else {
      ctx.fillStyle = colorWithAlpha(palette.accent, 0.28);
      ctx.strokeStyle = colorWithAlpha(palette.accent2, 0.72);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -deco.size * 0.62);
      ctx.lineTo(deco.size * 0.36, 0);
      ctx.lineTo(deco.size * 0.12, deco.size * 0.58);
      ctx.lineTo(-deco.size * 0.46, deco.size * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawHazards(level) {
    for (const hazard of level.hazards) {
      const palette = level.config.palette;
      const pulse = 0.65 + hazard.pulse * 0.35;
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(hazard.phase * 0.15);
      ctx.shadowColor = hazard.type === "static" ? palette.accent2 : palette.warning;
      ctx.shadowBlur = 28;
      ctx.strokeStyle = hazard.type === "static" ? colorWithAlpha(palette.accent2, 0.5) : colorWithAlpha(palette.warning, 0.58);
      ctx.fillStyle = hazard.type === "lava" ? "rgba(255, 49, 93, 0.14)" : "rgba(255, 75, 216, 0.12)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, hazard.r * pulse, hazard.r * 0.48 * pulse, Math.sin(hazard.phase) * 0.8, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i += 1) {
        ctx.rotate(TAU / 5);
        ctx.beginPath();
        ctx.moveTo(hazard.r * 0.2, 0);
        ctx.lineTo(hazard.r * (0.7 + hazard.pulse * 0.25), Math.sin(state.time * 3 + i) * 12);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawNodes(level) {
    const palette = level.config.palette;
    for (const node of level.nodes) {
      const active = node.active;
      const pulse = Math.sin(node.phase * 2) * 0.5 + 0.5;
      const color = active ? palette.accent2 : palette.accent;
      drawShadow(node.x, node.y, 58, 18, active ? 0.28 : 0.18);

      ctx.save();
      ctx.translate(node.x, node.y - 36 - pulse * 6);
      ctx.shadowColor = color;
      ctx.shadowBlur = active ? 36 : 22;
      ctx.strokeStyle = colorWithAlpha(color, active ? 0.92 : 0.58);
      ctx.fillStyle = colorWithAlpha(color, active ? 0.18 : 0.1);
      ctx.lineWidth = active ? 4 : 2;
      ctx.beginPath();
      ctx.arc(0, 0, 28 + pulse * 6 + node.pulse * 24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(node.phase);
      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(HALF_PI);
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.lineTo(0, -24);
        ctx.stroke();
      }
      ctx.fillStyle = active ? "#ffffff" : colorWithAlpha(color, 0.82);
      ctx.beginPath();
      ctx.arc(0, 0, 9 + pulse * 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPortal(level) {
    const portal = level.portal;
    const palette = level.config.palette;
    const ready = portal.active;
    const color = ready ? palette.warning : palette.accent;
    const pulse = Math.sin(portal.pulse) * 0.5 + 0.5;

    drawShadow(portal.x, portal.y, ready ? 102 : 72, 24, ready ? 0.42 : 0.19);
    ctx.save();
    ctx.translate(portal.x, portal.y - 44);
    ctx.shadowColor = color;
    ctx.shadowBlur = ready ? 52 : 26;
    ctx.strokeStyle = colorWithAlpha(color, ready ? 0.88 : 0.35);
    ctx.lineWidth = ready ? 7 : 4;
    ctx.rotate(state.time * (ready ? 0.9 : 0.25));
    for (let i = 0; i < 3; i += 1) {
      ctx.rotate(TAU / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 72 + i * 13 + pulse * 10, 24 + i * 8, 0, 0, TAU);
      ctx.stroke();
    }
    if (ready) {
      const core = ctx.createRadialGradient(0, 0, 2, 0, 0, 80);
      core.addColorStop(0, "rgba(255, 255, 255, 0.65)");
      core.addColorStop(0.35, colorWithAlpha(color, 0.42));
      core.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const bob = Math.sin(state.time * 4 + enemy.phase) * 8;
    const y = enemy.y - 34 - bob;
    drawShadow(enemy.x, enemy.y, enemy.radius * 1.5, enemy.radius * 0.45, 0.32);

    ctx.save();
    ctx.translate(enemy.x, y);
    ctx.shadowColor = enemy.hurt > 0 ? "#ffffff" : enemy.color;
    ctx.shadowBlur = enemy.hurt > 0 ? 40 : 24;
    ctx.strokeStyle = colorWithAlpha(enemy.color, 0.8);
    ctx.fillStyle = enemy.hurt > 0 ? "rgba(255,255,255,0.92)" : colorWithAlpha(enemy.color, 0.18);
    ctx.lineWidth = 3;

    if (enemy.type === "wraith") {
      ctx.beginPath();
      ctx.moveTo(0, -enemy.radius);
      ctx.lineTo(enemy.radius * 1.2, enemy.radius * 0.2);
      ctx.lineTo(0, enemy.radius);
      ctx.lineTo(-enemy.radius * 1.2, enemy.radius * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius * 1.7, enemy.radius * 0.42, state.time + enemy.phase, 0, TAU);
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(4, enemy.radius * 0.24), 0, TAU);
    ctx.fill();
    drawHealthBar(-enemy.radius, enemy.radius + 14, enemy.radius * 2, enemy.hp / enemy.maxHp, enemy.color);
    ctx.restore();
  }

  function drawBoss(boss) {
    const pulse = Math.sin(state.time * 3 + boss.phase) * 0.5 + 0.5;
    const hurt = boss.hurt > 0;
    drawShadow(boss.x, boss.y, 136, 34, 0.5);
    ctx.save();
    ctx.translate(boss.x, boss.y - boss.z);
    ctx.shadowColor = hurt ? "#ffffff" : "#ff315d";
    ctx.shadowBlur = hurt ? 70 : 54;
    const sphere = ctx.createRadialGradient(-18, -24, 10, 0, 0, 86);
    sphere.addColorStop(0, hurt ? "#ffffff" : "#ffd166");
    sphere.addColorStop(0.32, "#ff315d");
    sphere.addColorStop(1, "#650312");
    ctx.fillStyle = sphere;
    ctx.beginPath();
    ctx.arc(0, 0, 64 + pulse * 5, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 209, 102, 0.76)";
    ctx.lineWidth = 5;
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(state.time * 0.17 + i * HALF_PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, 92 + pulse * 8, 23 + i * 6, 0, 0, TAU);
      ctx.stroke();
    }
    drawHealthBar(-76, 92, 152, boss.hp / boss.maxHp, "#ff315d");
    ctx.restore();
  }

  function drawProjectile(shot) {
    ctx.save();
    ctx.translate(shot.x, shot.y - 22);
    ctx.shadowColor = shot.color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = colorWithAlpha(shot.color, 0.78);
    ctx.beginPath();
    ctx.arc(0, 0, shot.r + Math.sin(shot.phase) * 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = colorWithAlpha("#ffffff", 0.5);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, shot.r + 7, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    const player = state.player;
    const transformed = player.transform > 0;
    const hurt = player.hurtCooldown > 0;
    const palette = state.level.config.palette;
    const bob = Math.sin(player.run) * (length(player.vx, player.vy) > 20 ? 5 : 2);
    const px = player.x;
    const py = player.y - player.z - bob;
    const glow = transformed ? "#ff4bd8" : "#66f7ff";
    const coat = transformed ? "#26123a" : "#172938";
    const skin = hurt ? "#ffffff" : "#f2c29f";
    const limbSwing = Math.sin(player.run) * 0.8;

    drawShadow(player.x, player.y, player.radius * (1.3 - player.z / 820), 13 * (1 - player.z / 900), 0.42);

    if (player.dash > 0) {
      player.dash = Math.max(0, player.dash - 1 / 60);
      ctx.save();
      ctx.globalAlpha = player.dash * 3.2;
      ctx.strokeStyle = colorWithAlpha(glow, 0.8);
      ctx.lineWidth = 10;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.moveTo(px - Math.cos(player.face) * 74, py - Math.sin(player.face) * 74);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(px, py - 18);
    ctx.rotate(Math.sin(player.face) * 0.08);
    ctx.shadowColor = glow;
    ctx.shadowBlur = transformed ? 42 : 24;

    if (transformed) {
      ctx.strokeStyle = colorWithAlpha("#ff4bd8", 0.72);
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(0, -2, 44 + i * 10 + Math.sin(state.time * 4 + i) * 4, 16 + i * 5, state.time + i, 0, TAU);
        ctx.stroke();
      }
    }

    ctx.lineCap = "round";
    ctx.strokeStyle = transformed ? "#ffd166" : palette.accent2;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-11, 25);
    ctx.lineTo(-18 - limbSwing * 8, 54);
    ctx.moveTo(11, 25);
    ctx.lineTo(18 + limbSwing * 8, 54);
    ctx.stroke();

    ctx.strokeStyle = transformed ? "#ff4bd8" : "#66f7ff";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-18, -5);
    ctx.lineTo(-34 - limbSwing * 8, 18);
    ctx.moveTo(18, -5);
    ctx.lineTo(36 + limbSwing * 8, 12);
    ctx.stroke();

    ctx.fillStyle = coat;
    ctx.strokeStyle = colorWithAlpha(glow, 0.82);
    ctx.lineWidth = 2.4;
    roundedRect(-19, -15, 38, 50, 11);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, -32, 17 + Math.sin(state.time * 2.4) * 0.7, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -35);
    ctx.lineTo(8, -35);
    ctx.stroke();

    ctx.strokeStyle = transformed ? "#ffd166" : "#ff4bd8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(38 + limbSwing * 7, 12, 10, 0, TAU);
    ctx.stroke();

    ctx.fillStyle = transformed ? "#ffd166" : "#ffffff";
    ctx.beginPath();
    ctx.arc(39 + limbSwing * 7, 12, 3.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawParticle(particle) {
    const life = 1 - particle.age / particle.life;
    const size = particle.size * (0.5 + life * 0.7);
    ctx.save();
    ctx.globalAlpha = clamp(life, 0, 1);
    ctx.translate(particle.x, particle.y - particle.z);
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = particle.type === "spark" ? 12 : 24;
    ctx.fillStyle = colorWithAlpha(particle.color, particle.type === "spark" ? 0.9 : 0.45);
    if (particle.type === "spark") {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.3, size, state.time, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawRings() {
    for (const ring of state.rings) {
      const p = ring.age / ring.life;
      const r = lerp(ring.from, ring.to, easeOut(p));
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.82;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = lerp(9, 1, p);
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 26;
      ctx.beginPath();
      ctx.ellipse(ring.x, ring.y, r, r * 0.42, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function drawHealthBar(x, y, width, amount, color) {
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    roundedRect(x, y, width, 7, 999);
    ctx.fill();
    ctx.fillStyle = color;
    roundedRect(x, y, width * clamp(amount, 0, 1), 7, 999);
    ctx.fill();
    ctx.restore();
  }

  function drawShadow(x, y, rx, ry, alpha) {
    ctx.save();
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(2, rx), Math.max(1, ry), 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawScreenEffects() {
    if (!state.player) return;
    const player = state.player;
    const level = state.level;

    if (player.timeSlow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(102, 247, 255, 0.08)";
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.strokeStyle = "rgba(102, 247, 255, 0.16)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i += 1) {
        ctx.beginPath();
        ctx.arc(view.w / 2, view.h / 2, 80 + i * 75 + Math.sin(state.time * 2) * 10, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }

    const critical = state.levelIndex === 2 || player.transform > 0 || (level.boss && level.boss.hp < level.boss.maxHp * 0.5);
    const glitchAmount = critical ? 0.18 : state.levelIndex === 1 ? 0.12 : 0.04;
    if (Math.random() < glitchAmount) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < 8; i += 1) {
        const y = Math.random() * view.h;
        const h = 2 + Math.random() * 16;
        const x = (Math.random() - 0.5) * 34;
        ctx.fillStyle = i % 2 ? "rgba(255, 75, 216, 0.12)" : "rgba(102, 247, 255, 0.11)";
        ctx.fillRect(x, y, view.w, h);
      }
      ctx.restore();
    }
  }

  function drawTransition() {
    if (!state.transition) return;
    const t = state.transition.t / state.transition.duration;
    const opacity = t < 0.5 ? t * 2 : (1 - t) * 2;
    ctx.save();
    ctx.globalAlpha = clamp(opacity, 0, 1);
    const gradient = ctx.createRadialGradient(view.w / 2, view.h / 2, 20, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.7);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.86)");
    gradient.addColorStop(0.36, "rgba(255, 75, 216, 0.56)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.94)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  function roundedRect(x, y, width, height, radius) {
    const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function spawnParticle(particle) {
    state.particles.push({
      x: particle.x,
      y: particle.y,
      z: particle.z || 0,
      vx: particle.vx || 0,
      vy: particle.vy || 0,
      vz: particle.vz || 0,
      age: 0,
      life: particle.life || 0.5,
      size: particle.size || 4,
      color: particle.color || "#ffffff",
      type: particle.type || "spark"
    });
  }

  function spawnBurst(x, y, z, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * TAU;
      const velocity = speed * (0.28 + Math.random() * 0.72);
      spawnParticle({
        x,
        y,
        z: z * (0.4 + Math.random() * 0.8),
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        vz: 80 + Math.random() * 260,
        life: 0.42 + Math.random() * 0.56,
        size: 2.5 + Math.random() * 7,
        color,
        type: Math.random() > 0.3 ? "spark" : "orb"
      });
    }
  }

  function spawnTrail(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      spawnParticle({
        x: x + (Math.random() - 0.5) * 36,
        y: y + (Math.random() - 0.5) * 36,
        z: Math.random() * 28,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        vz: 20 + Math.random() * 90,
        life: 0.2 + Math.random() * 0.25,
        size: 4 + Math.random() * 8,
        color,
        type: "orb"
      });
    }
  }

  function spawnRing(x, y, color, from, to, life) {
    state.rings.push({ x, y, color, from, to, life, age: 0 });
  }

  function distanceTo(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function screenToWorld(x, y) {
    return {
      x: (x - view.w / 2) / camera.zoom + camera.x,
      y: (y - view.h / 2) / camera.zoom + camera.y
    };
  }

  function unlockAudio() {
    if (state.audioReady) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      audio.ctx = audio.ctx || new AudioContext();
      if (audio.ctx.state === "suspended") {
        audio.ctx.resume();
      }
      state.audioReady = true;
    } catch {
      state.audioReady = false;
    }
  }

  const audio = { ctx: null };

  function playTone(frequency, duration, type, gain) {
    if (!state.audioReady || !audio.ctx) return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const amp = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.72), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp);
    amp.connect(audio.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function clearPressed() {
    for (const key of Object.keys(pressed)) {
      pressed[key] = false;
    }
  }

  function frame(now) {
    const seconds = now / 1000;
    const dt = clamp(seconds - state.last, 0, 0.033);
    state.last = seconds;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function init() {
    resize();
    state.level = buildLevel(0);
    resetPlayer();
    camera.x = state.player.x + 280;
    camera.y = state.player.y - 100;
    camera.zoom = view.w < 720 ? 0.68 : 0.84;
    ui.start.addEventListener("click", startGame);
    ui.restart.addEventListener("click", restartGame);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerdown", pointerDown);
    window.addEventListener("pointerup", pointerUp);
    requestAnimationFrame(frame);
  }

  init();
}());
