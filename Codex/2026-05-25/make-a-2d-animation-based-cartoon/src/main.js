const Phaser = window.Phaser;
if (!Phaser) {
  throw new Error("Phaser failed to load.");
}

const QA_MODE = new URLSearchParams(window.location.search).has("qa");

function publishState(state) {
  window.__badEndState = state;
  document.body.dataset.badEndState = JSON.stringify(state);
}

publishState({ scene: "boot" });
window.__badEndSnapshot = () => document.querySelector("canvas")?.toDataURL("image/png") || null;

function setupQaBridge() {
  if (!QA_MODE) {
    return;
  }

  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText =
    "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;overflow:hidden;z-index:99999;pointer-events:auto;";

  const snapshot = document.createElement("button");
  snapshot.id = "qa-snapshot";
  snapshot.type = "button";
  snapshot.style.cssText = "width:1px;height:1px;padding:0;border:0;";
  snapshot.addEventListener("click", () => {
    document.body.dataset.badEndSnapshot = window.__badEndSnapshot() || "";
  });

  const pass = document.createElement("button");
  pass.id = "qa-pass";
  pass.type = "button";
  pass.style.cssText = "width:1px;height:1px;padding:0;border:0;";
  pass.addEventListener("click", () => {
    window.dispatchEvent(new Event("badEndQaPass"));
  });

  holder.append(snapshot, pass);
  document.body.append(holder);
}

const GAME_WIDTH = 960;
const GAME_HEIGHT = 540;
const SAVE_KEY = "bad-end-boulevard-save";
const TARGET_RUNTIME = "18-22 min";

const touchState = {
  left: false,
  right: false,
  jump: false,
  dash: false,
  action: false,
  jumpTap: false,
  dashTap: false,
  actionTap: false,
};

const CHAPTERS = [
  {
    name: "Act I",
    place: "Parade Of Smiles",
    headline: "The town hired you as security. Poor town.",
    goalLabel: "Cheer towers",
    consoles: 3,
    infamyNeed: 7,
    width: 5000,
    palette: {
      skyTop: "#93d8ef",
      skyBottom: "#f8bd6a",
      far: "#31556f",
      mid: "#5a386e",
      near: "#24213d",
      accent: "#ffd653",
    },
    intro: [
      "Your invoice says crowd control.",
      "Your actual plan says crowd dramatic collapse.",
      "The parade band is one bad button away from your theme song.",
    ],
    outro: "The cheer towers cough, wheeze, and applaud the wrong person.",
  },
  {
    name: "Act II",
    place: "Poster Plant",
    headline: "Every hero poster needs a better signature.",
    goalLabel: "Print presses",
    consoles: 4,
    infamyNeed: 10,
    width: 5600,
    palette: {
      skyTop: "#ffc970",
      skyBottom: "#f7797d",
      far: "#583f6f",
      mid: "#204c5f",
      near: "#261b2f",
      accent: "#62d7b7",
    },
    intro: [
      "The presses are printing hero smiles by the kilometer.",
      "Taste is illegal here.",
      "Fix that.",
    ],
    outro: "The city wakes to heroic posters wearing villain mustaches.",
  },
  {
    name: "Act III",
    place: "Rooftop Apology Tour",
    headline: "A skyline is just a billboard that got ambitious.",
    goalLabel: "Broadcast dishes",
    consoles: 4,
    infamyNeed: 12,
    width: 6200,
    palette: {
      skyTop: "#5373d5",
      skyBottom: "#f4a261",
      far: "#172b45",
      mid: "#31415f",
      near: "#1a1624",
      accent: "#ff6b6b",
    },
    intro: [
      "The mayor bought emergency optimism airtime.",
      "Hijack the dishes.",
      "Make the apology tour about your genius instead.",
    ],
    outro: "Every rooftop screen says SORRY, I WAS BUSY BEING ICONIC.",
  },
  {
    name: "Act IV",
    place: "Museum Of Good Deeds",
    headline: "History belongs to whoever edits the plaques last.",
    goalLabel: "Plaque vaults",
    consoles: 5,
    infamyNeed: 14,
    width: 6800,
    palette: {
      skyTop: "#7fd1c7",
      skyBottom: "#f4e3a1",
      far: "#3d5c57",
      mid: "#5d3c52",
      near: "#241f22",
      accent: "#d75cff",
    },
    intro: [
      "The museum's noble artifacts are painfully sincere.",
      "Swap the labels.",
      "Let future students suffer a more interesting textbook.",
    ],
    outro: "The Hall of Courage is now the Hall of Pretty Convenient Alibis.",
  },
  {
    name: "Act V",
    place: "Tramworks After Dark",
    headline: "Public transport, private revenge.",
    goalLabel: "Signal boxes",
    consoles: 5,
    infamyNeed: 16,
    width: 7400,
    palette: {
      skyTop: "#324a9a",
      skyBottom: "#0e1828",
      far: "#10263c",
      mid: "#2a355f",
      near: "#11131f",
      accent: "#57c7ff",
    },
    intro: [
      "The hero's finale rides the midnight tram.",
      "Reroute the signal boxes.",
      "Nothing says villainy like weaponized scheduling.",
    ],
    outro: "Every tram arrives on time, unfortunately at the wrong speech.",
  },
  {
    name: "Act VI",
    place: "Town Square Bad Ending",
    headline: "The hero brought a speech. You brought punctuation.",
    goalLabel: "Spotlight rigs",
    consoles: 6,
    infamyNeed: 18,
    width: 8200,
    boss: true,
    palette: {
      skyTop: "#201d42",
      skyBottom: "#46163e",
      far: "#211b3e",
      mid: "#3f2145",
      near: "#111018",
      accent: "#ffd653",
    },
    intro: [
      "The city expects a heroic speech.",
      "You have rehearsed the evil laugh twice.",
      "Third time is legally binding.",
    ],
    outro: "The spotlight snaps to you. The applause arrives late, but it arrives.",
  },
];

function setupTouchControls() {
  document.querySelectorAll("[data-input]").forEach((button) => {
    const input = button.getAttribute("data-input");
    const press = (event) => {
      event.preventDefault();
      touchState[input] = true;
      if (input === "jump" || input === "dash" || input === "action") {
        touchState[`${input}Tap`] = true;
      }
      button.classList.add("is-pressed");
    };
    const release = (event) => {
      event.preventDefault();
      touchState[input] = false;
      button.classList.remove("is-pressed");
    };

    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  });
}

function consumeTap(name) {
  const key = `${name}Tap`;
  const wasTapped = touchState[key];
  touchState[key] = false;
  return wasTapped;
}

function saveGame(nextLevel, totalSeconds = 0) {
  const previous = loadGame();
  const bestSeconds =
    previous.bestSeconds > 0 && totalSeconds > 0
      ? Math.min(previous.bestSeconds, totalSeconds)
      : Math.max(previous.bestSeconds, totalSeconds);

  localStorage.setItem(
    SAVE_KEY,
    JSON.stringify({
      unlocked: Math.max(previous.unlocked, nextLevel),
      bestSeconds,
      updatedAt: Date.now(),
    }),
  );
}

function loadGame() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    return {
      unlocked: Number.isFinite(parsed.unlocked) ? parsed.unlocked : 0,
      bestSeconds: Number.isFinite(parsed.bestSeconds) ? parsed.bestSeconds : 0,
    };
  } catch {
    return { unlocked: 0, bestSeconds: 0 };
  }
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const secs = (total % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function texture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) {
    return;
  }
  const tex = scene.textures.createCanvas(key, width, height);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  draw(ctx, width, height);
  tex.refresh();
}

function createGameTextures(scene) {
  for (let frame = 0; frame < 4; frame += 1) {
    texture(scene, `villain-run-${frame}`, 72, 88, (ctx, w, h) => {
      drawVillain(ctx, w, h, frame, "run");
    });
  }

  for (let frame = 0; frame < 2; frame += 1) {
    texture(scene, `villain-idle-${frame}`, 72, 88, (ctx, w, h) => {
      drawVillain(ctx, w, h, frame, "idle");
    });
  }

  texture(scene, "villain-dash", 88, 76, (ctx, w, h) => {
    drawVillain(ctx, w, h, 0, "dash");
  });

  for (let frame = 0; frame < 2; frame += 1) {
    texture(scene, `guard-${frame}`, 62, 68, (ctx, w, h) => {
      drawGuard(ctx, w, h, frame);
    });
  }

  texture(scene, "guard-stunned", 62, 68, (ctx, w, h) => {
    drawGuard(ctx, w, h, 0, true);
  });

  texture(scene, "platform", 128, 32, (ctx, w, h) => {
    ctx.fillStyle = "#17151e";
    roundRect(ctx, 0, 4, w, h - 4, 6);
    ctx.fill();
    ctx.fillStyle = "#3b2d49";
    roundRect(ctx, 0, 0, w, 21, 6);
    ctx.fill();
    ctx.fillStyle = "#7a4d6a";
    ctx.fillRect(8, 4, 34, 4);
    ctx.fillRect(58, 9, 24, 4);
    ctx.fillRect(96, 5, 20, 4);
    ctx.strokeStyle = "#16111a";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 5);
  });

  texture(scene, "ground", 160, 48, (ctx, w, h) => {
    ctx.fillStyle = "#141217";
    ctx.fillRect(0, 12, w, h - 12);
    ctx.fillStyle = "#355c53";
    roundRect(ctx, 0, 0, w, 24, 8);
    ctx.fill();
    ctx.fillStyle = "#62d7b7";
    ctx.fillRect(10, 5, 28, 4);
    ctx.fillStyle = "#ffd653";
    ctx.fillRect(60, 7, 12, 4);
    ctx.fillStyle = "#25212a";
    ctx.fillRect(0, 24, w, 8);
  });

  texture(scene, "hazard", 96, 30, (ctx, w, h) => {
    ctx.fillStyle = "rgba(255, 107, 107, 0.25)";
    roundRect(ctx, 0, 4, w, h - 6, 7);
    ctx.fill();
    ctx.fillStyle = "#ff6b6b";
    for (let x = 8; x < w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, h - 3);
      ctx.lineTo(x + 7, 2);
      ctx.lineTo(x + 14, h - 3);
      ctx.closePath();
      ctx.fill();
    }
  });

  texture(scene, "infamy", 34, 34, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    ctx.fillStyle = "#111016";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 15 : 7;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd653";
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 12 : 5;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#321d2f";
    ctx.font = "900 15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("V", 0, 1);
  });

  texture(scene, "console-on", 56, 70, (ctx, w, h) => {
    drawConsole(ctx, w, h, false);
  });

  texture(scene, "console-off", 56, 70, (ctx, w, h) => {
    drawConsole(ctx, w, h, true);
  });

  texture(scene, "exit-closed", 92, 116, (ctx, w, h) => {
    drawExit(ctx, w, h, false);
  });

  texture(scene, "exit-open", 92, 116, (ctx, w, h) => {
    drawExit(ctx, w, h, true);
  });

  texture(scene, "checkpoint-off", 48, 88, (ctx, w, h) => {
    drawCheckpoint(ctx, w, h, false);
  });

  texture(scene, "checkpoint-on", 48, 88, (ctx, w, h) => {
    drawCheckpoint(ctx, w, h, true);
  });

  texture(scene, "boss", 140, 136, (ctx, w, h) => {
    drawBoss(ctx, w, h);
  });

  texture(scene, "spark", 18, 18, (ctx, w, h) => {
    ctx.fillStyle = "#ffd653";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w * 0.62, h * 0.38);
    ctx.lineTo(w, h / 2);
    ctx.lineTo(w * 0.62, h * 0.62);
    ctx.lineTo(w / 2, h);
    ctx.lineTo(w * 0.38, h * 0.62);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(w * 0.38, h * 0.38);
    ctx.closePath();
    ctx.fill();
  });
}

function drawVillain(ctx, w, h, frame, mode) {
  const bob = mode === "idle" ? Math.sin(frame * Math.PI) * 2 : frame % 2 === 0 ? 1 : -1;
  const dash = mode === "dash";
  const lean = dash ? 9 : mode === "run" ? (frame - 1.5) * 1.5 : 0;
  ctx.save();
  ctx.translate(dash ? 8 : 0, bob);

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 8, dash ? 31 : 24, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#101018";
  ctx.beginPath();
  ctx.moveTo(22 + lean, 35);
  ctx.quadraticCurveTo(8, 58, 13, 76);
  ctx.quadraticCurveTo(35, 84, 57, 76);
  ctx.quadraticCurveTo(63, 57, 50 + lean, 35);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6c2c6f";
  ctx.beginPath();
  ctx.moveTo(28 + lean, 36);
  ctx.quadraticCurveTo(19, 55, 23, 75);
  ctx.lineTo(47, 75);
  ctx.quadraticCurveTo(54, 55, 44 + lean, 36);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath();
  ctx.moveTo(35 + lean, 43);
  ctx.lineTo(28, 74);
  ctx.lineTo(43, 74);
  ctx.closePath();
  ctx.fill();

  const legSwing = mode === "run" ? (frame % 2 === 0 ? 7 : -7) : 0;
  ctx.strokeStyle = "#111016";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(31, 72);
  ctx.lineTo(26 - legSwing * 0.5, 83);
  ctx.moveTo(43, 72);
  ctx.lineTo(48 + legSwing * 0.5, 83);
  ctx.stroke();

  ctx.fillStyle = "#f4dfc2";
  ctx.beginPath();
  ctx.ellipse(36 + lean, 26, 15, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#111016";
  roundRect(ctx, 19 + lean, 20, 34, 10, 5);
  ctx.fill();
  ctx.fillStyle = "#ffd653";
  ctx.fillRect(28 + lean, 23, 6, 3);
  ctx.fillRect(41 + lean, 23, 6, 3);

  ctx.fillStyle = "#111016";
  ctx.fillRect(23 + lean, 8, 27, 12);
  ctx.fillRect(18 + lean, 18, 37, 6);
  ctx.fillStyle = "#62d7b7";
  ctx.fillRect(25 + lean, 17, 23, 3);

  ctx.strokeStyle = "#111016";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(37 + lean, 31, 7, 0.1, Math.PI - 0.1);
  ctx.stroke();

  if (dash) {
    ctx.strokeStyle = "rgba(255, 214, 83, 0.55)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(5, 37);
    ctx.lineTo(24, 42);
    ctx.moveTo(1, 52);
    ctx.lineTo(22, 55);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGuard(ctx, w, h, frame, stunned = false) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 7, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = stunned ? "#77737d" : "#f8f5ec";
  roundRect(ctx, 15, 18, 32, 39, 8);
  ctx.fill();
  ctx.strokeStyle = "#191821";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = stunned ? "#b7b0b8" : "#4f9ee8";
  ctx.beginPath();
  ctx.arc(31, 14, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#191821";
  ctx.stroke();

  ctx.fillStyle = "#191821";
  if (stunned) {
    ctx.font = "900 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("X X", 31, 19);
  } else {
    ctx.fillRect(23, 12, 5, 5);
    ctx.fillRect(35, 12, 5, 5);
    ctx.fillStyle = "#ffd653";
    ctx.fillRect(26, 31, 11, 5);
  }

  ctx.strokeStyle = "#191821";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const step = frame === 0 ? -4 : 4;
  ctx.beginPath();
  ctx.moveTo(22, 55);
  ctx.lineTo(19 + step, 65);
  ctx.moveTo(40, 55);
  ctx.lineTo(43 - step, 65);
  ctx.stroke();

  if (stunned) {
    ctx.strokeStyle = "#ffd653";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(31, 6, 19, 0.2, Math.PI * 1.4);
    ctx.stroke();
  }
}

function drawConsole(ctx, w, h, off) {
  ctx.fillStyle = "#111016";
  roundRect(ctx, 8, 10, w - 16, h - 12, 7);
  ctx.fill();
  ctx.fillStyle = off ? "#544d59" : "#5c2d70";
  roundRect(ctx, 12, 6, w - 24, h - 20, 7);
  ctx.fill();
  ctx.fillStyle = off ? "#62d7b7" : "#ffd653";
  roundRect(ctx, 18, 15, w - 36, 18, 5);
  ctx.fill();
  ctx.fillStyle = "#17151e";
  ctx.fillRect(21, 20, w - 42, 5);
  ctx.fillStyle = off ? "#17151e" : "#ff6b6b";
  ctx.beginPath();
  ctx.arc(w / 2, 47, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#17151e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(18, 61);
  ctx.lineTo(38, 61);
  ctx.stroke();
}

function drawExit(ctx, w, h, open) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 8, 35, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#111016";
  roundRect(ctx, 10, 8, w - 20, h - 14, 8);
  ctx.fill();
  ctx.fillStyle = open ? "#62d7b7" : "#3b2d49";
  roundRect(ctx, 20, 18, w - 40, h - 30, 8);
  ctx.fill();
  ctx.fillStyle = open ? "#17151e" : "#ffd653";
  ctx.font = "900 22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(open ? "V" : "LOCK", w / 2, h / 2 + 8);
  if (open) {
    ctx.strokeStyle = "rgba(255, 214, 83, 0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 31, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCheckpoint(ctx, w, h, active) {
  ctx.strokeStyle = "#111016";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(w / 2, 12);
  ctx.lineTo(w / 2, h - 5);
  ctx.stroke();
  ctx.fillStyle = active ? "#ffd653" : "#5d6470";
  ctx.beginPath();
  ctx.moveTo(w / 2, 14);
  ctx.lineTo(w - 6, 23);
  ctx.lineTo(w / 2, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBoss(ctx, w, h) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 12, 48, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f8f5ec";
  roundRect(ctx, 36, 38, 68, 60, 10);
  ctx.fill();
  ctx.strokeStyle = "#141217";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.fillStyle = "#4f9ee8";
  ctx.beginPath();
  ctx.ellipse(w / 2, 39, 38, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffd653";
  ctx.beginPath();
  ctx.moveTo(w / 2, 14);
  ctx.lineTo(w / 2 + 11, 34);
  ctx.lineTo(w / 2 - 11, 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#141217";
  ctx.fillRect(57, 36, 8, 8);
  ctx.fillRect(75, 36, 8, 8);
  ctx.fillStyle = "#ff6b6b";
  ctx.fillRect(57, 69, 26, 6);
  ctx.strokeStyle = "#141217";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(40, 66);
  ctx.lineTo(17, 49);
  ctx.moveTo(100, 66);
  ctx.lineTo(123, 49);
  ctx.stroke();
}

function buildLevel(index) {
  const chapter = CHAPTERS[index];
  const platforms = [];
  const hazards = [];
  const pickups = [];
  const enemies = [];
  const consoles = [];
  const checkpoints = [];
  const width = chapter.width;
  const groundTop = 492;

  platforms.push({ x: -80, y: groundTop, w: 580, h: 48, type: "ground" });
  let x = 520;
  let chunk = 0;
  while (x < width - 500) {
    const segmentWidth = 540 + ((chunk + index) % 3) * 45;
    const gap = 84 + ((chunk * 17 + index * 11) % 38);
    platforms.push({ x, y: groundTop, w: segmentWidth, h: 48, type: "ground" });
    if ((chunk + index) % 2 === 0) {
      hazards.push({ x: x + segmentWidth * 0.55, y: groundTop - 15, w: 92, h: 26 });
    }
    x += segmentWidth + gap;
    chunk += 1;
  }
  platforms.push({ x: width - 620, y: groundTop, w: 740, h: 48, type: "ground" });

  const consoleSpacing = (width - 1500) / Math.max(1, chapter.consoles - 1);
  for (let i = 0; i < chapter.consoles; i += 1) {
    const cx = 780 + i * consoleSpacing;
    const cy = 378 - ((i + index) % 3) * 48;
    platforms.push({ x: cx - 150, y: cy + 42, w: 300, h: 28, type: "platform" });
    platforms.push({ x: cx + 175, y: cy + 92, w: 220, h: 28, type: "platform" });
    if (i > 0) {
      platforms.push({ x: cx - 430, y: cy + 112, w: 220, h: 28, type: "platform" });
    }
    consoles.push({ x: cx, y: cy, id: i });

    pickups.push({ x: cx - 86, y: cy - 18 });
    pickups.push({ x: cx + 86, y: cy - 18 });
  }

  for (let i = 0; i < Math.floor(width / 560); i += 1) {
    const px = 390 + i * 560 + ((i + index) % 2) * 90;
    const py = 416 - ((i * 37 + index * 49) % 3) * 58;
    platforms.push({ x: px, y: py, w: 230, h: 28, type: "platform" });
    if (i % 2 === 0) {
      pickups.push({ x: px + 54, y: py - 28 });
      pickups.push({ x: px + 116, y: py - 46 });
      pickups.push({ x: px + 178, y: py - 28 });
    }
    if (i % 3 === 1) {
      enemies.push({
        x: px + 120,
        y: py - 36,
        min: px + 28,
        max: px + 205,
        speed: 58 + index * 8,
      });
    }
  }

  const patrols = Math.floor(width / 1400) + index;
  for (let i = 0; i < patrols; i += 1) {
    const ex = 950 + i * 980 + ((i + index) % 2) * 90;
    enemies.push({
      x: Math.min(ex, width - 850),
      y: groundTop - 36,
      min: Math.max(540, ex - 140),
      max: Math.min(width - 500, ex + 220),
      speed: 72 + index * 9,
    });
  }

  for (let i = 1; i <= Math.floor(width / 1700); i += 1) {
    checkpoints.push({ x: i * 1700 + 130, y: groundTop - 52 });
  }

  return {
    ...chapter,
    index,
    consoleCount: chapter.consoles,
    start: { x: 120, y: 390 },
    exit: { x: width - 250, y: groundTop - 58 },
    platforms,
    hazards,
    pickups,
    enemies,
    consoles,
    checkpoints,
  };
}

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    createGameTextures(this);
    this.scene.start("TitleScene");
  }
}

class TitleScene extends Phaser.Scene {
  constructor() {
    super("TitleScene");
  }

  create() {
    publishState({ scene: "title" });
    this.save = loadGame();
    this.cameras.main.setBackgroundColor("#18121f");
    this.addBackdrop();

    this.villain = this.add.sprite(168, 332, "villain-idle-0").setScale(2.25);
    this.add
      .text(298, 76, "Bad End Boulevard", {
        fontFamily: "Georgia, serif",
        fontSize: "58px",
        color: "#ffd653",
        stroke: "#111016",
        strokeThickness: 8,
      })
      .setShadow(0, 5, "#000000", 4);

    this.add.text(304, 148, "A 16+ cartoon villain platform campaign", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "20px",
      color: "#f8f5ec",
    });

    this.add.text(
      304,
      190,
      [
        "Comic menace, sabotage, and dark sarcasm.",
        "No gore, no explicit sexual content, no kid-targeted tone.",
        `Designed as a ${TARGET_RUNTIME} first run.`,
      ],
      {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "19px",
        color: "#d8d0bd",
        lineSpacing: 8,
      },
    );

    this.add.text(304, 278, "You are not the chosen one. You are the problem.", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "24px",
      color: "#62d7b7",
      stroke: "#111016",
      strokeThickness: 4,
    });

    this.createButton(304, 344, 300, "I am 16+ - start", () => {
      saveGame(0);
      this.scene.start("LevelScene", { levelIndex: 0, campaignSeconds: 0 });
    });

    if (this.save.unlocked > 0 && this.save.unlocked < CHAPTERS.length) {
      this.createButton(626, 344, 260, `Continue ${CHAPTERS[this.save.unlocked].name}`, () => {
        this.scene.start("LevelScene", {
          levelIndex: this.save.unlocked,
          campaignSeconds: 0,
        });
      });
    } else if (this.save.unlocked >= CHAPTERS.length) {
      this.createButton(626, 344, 260, "Finale recap", () => {
        this.scene.start("EndingScene", { campaignSeconds: this.save.bestSeconds });
      });
    }

    this.add.text(306, 424, "Villain route locked to a 16+ audience.", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      color: "#a69faf",
    });

    this.input.keyboard.once("keydown-ENTER", () => {
      saveGame(0);
      this.scene.start("LevelScene", { levelIndex: 0, campaignSeconds: 0 });
    });
  }

  addBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x291b35, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0x62d7b7, 0.12);
    g.fillRect(0, 376, GAME_WIDTH, 164);
    g.fillStyle(0x111016, 1);
    for (let i = 0; i < 15; i += 1) {
      const x = i * 72;
      const h = 90 + ((i * 31) % 90);
      g.fillRect(x, 376 - h, 52, h);
      g.fillRect(x + 12, 376 - h - 18, 28, 18);
    }
    g.fillStyle(0xffd653, 0.9);
    g.fillCircle(800, 112, 42);
    g.fillStyle(0xff6b6b, 0.2);
    g.fillTriangle(710, 42, 936, 540, 602, 540);
  }

  createButton(x, y, width, label, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x111016, 0.92);
    bg.lineStyle(2, 0xffd653, 1);
    bg.fillRoundedRect(0, 0, width, 52, 8);
    bg.strokeRoundedRect(0, 0, width, 52, 8);
    const text = this.add
      .text(width / 2, 26, label, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "20px",
        color: "#f8f5ec",
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(width, 52);
    container.setInteractive({ useHandCursor: true });
    container.on("pointerover", () => {
      bg.clear();
      bg.fillStyle(0x3b2d49, 0.98);
      bg.lineStyle(2, 0x62d7b7, 1);
      bg.fillRoundedRect(0, 0, width, 52, 8);
      bg.strokeRoundedRect(0, 0, width, 52, 8);
    });
    container.on("pointerout", () => {
      bg.clear();
      bg.fillStyle(0x111016, 0.92);
      bg.lineStyle(2, 0xffd653, 1);
      bg.fillRoundedRect(0, 0, width, 52, 8);
      bg.strokeRoundedRect(0, 0, width, 52, 8);
    });
    container.on("pointerup", onClick);
  }

  update(time) {
    publishState({ scene: "title", unlocked: this.save?.unlocked || 0 });
    if (this.villain) {
      const frame = Math.floor(time / 440) % 2;
      this.villain.setTexture(`villain-idle-${frame}`);
      this.villain.rotation = Math.sin(time / 650) * 0.04;
    }
  }
}

class LevelScene extends Phaser.Scene {
  constructor() {
    super("LevelScene");
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0;
    this.campaignSeconds = data.campaignSeconds || 0;
    this.level = buildLevel(this.levelIndex);
  }

  create() {
    publishState({
      scene: "level",
      levelIndex: this.levelIndex,
      levelName: `${this.level.name}: ${this.level.place}`,
    });
    this.physics.world.setBounds(0, 0, this.level.width, 980);
    this.cameras.main.setBounds(0, 0, this.level.width, GAME_HEIGHT);
    this.cameras.main.setBackgroundColor(this.level.palette.skyBottom);
    this.levelSeconds = 0;
    this.finished = false;
    this.respawning = false;
    this.sabotaged = 0;
    this.infamy = 0;
    this.heat = 0;
    this.ego = 5;
    this.maxEgo = 5;
    this.facing = 1;
    this.dashCooldown = 0;
    this.dashTime = 0;
    this.invulnerable = 0;
    this.actionAura = 0;
    this.checkpoint = { ...this.level.start };
    this.exitUnlocked = false;
    this.bossHealth = this.level.boss ? 3 : 0;

    this.createBackground();
    this.createWorld();
    this.createPlayer();
    this.createHud();
    this.createKeys();
    this.createQaHooks();
    this.showChapterCard();
    this.showStory(this.level.intro, 0);
  }

  createBackground() {
    const sky = this.add.graphics().setScrollFactor(0);
    sky.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(this.level.palette.skyTop).color,
      Phaser.Display.Color.HexStringToColor(this.level.palette.skyTop).color,
      Phaser.Display.Color.HexStringToColor(this.level.palette.skyBottom).color,
      Phaser.Display.Color.HexStringToColor(this.level.palette.skyBottom).color,
      1,
    );
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const far = this.add.graphics().setScrollFactor(0.18, 0);
    far.fillStyle(Phaser.Display.Color.HexStringToColor(this.level.palette.far).color, 0.7);
    for (let i = -3; i < 28; i += 1) {
      const x = i * 170;
      const h = 80 + ((i * 37 + this.levelIndex * 19) % 90);
      far.fillRect(x, 408 - h, 122, h);
      far.fillTriangle(x + 18, 408 - h, x + 60, 408 - h - 36, x + 102, 408 - h);
    }

    const mid = this.add.graphics().setScrollFactor(0.38, 0);
    mid.fillStyle(Phaser.Display.Color.HexStringToColor(this.level.palette.mid).color, 0.88);
    for (let i = -3; i < 34; i += 1) {
      const x = i * 140;
      const h = 110 + ((i * 41 + this.levelIndex * 23) % 120);
      mid.fillRect(x, 464 - h, 94, h);
      mid.fillStyle(0xffd653, 0.28);
      if (i % 2 === 0) {
        mid.fillRect(x + 16, 464 - h + 24, 12, 18);
        mid.fillRect(x + 48, 464 - h + 58, 12, 18);
      }
      mid.fillStyle(Phaser.Display.Color.HexStringToColor(this.level.palette.mid).color, 0.88);
    }

    const moon = this.add.graphics().setScrollFactor(0.05, 0);
    moon.fillStyle(0xffd653, this.levelIndex > 3 ? 0.95 : 0.55);
    moon.fillCircle(824, 98, this.levelIndex > 3 ? 46 : 28);
  }

  createWorld() {
    this.platforms = this.physics.add.staticGroup();
    this.level.platforms.forEach((platform) => {
      const key = platform.type === "ground" ? "ground" : "platform";
      const sprite = this.platforms
        .create(platform.x + platform.w / 2, platform.y + platform.h / 2, key)
        .setDisplaySize(platform.w, platform.h)
        .setOrigin(0.5);
      sprite.refreshBody();
    });

    this.hazards = this.physics.add.staticGroup();
    this.level.hazards.forEach((hazard) => {
      const sprite = this.hazards
        .create(hazard.x, hazard.y, "hazard")
        .setDisplaySize(hazard.w, hazard.h)
        .setOrigin(0.5);
      sprite.refreshBody();
    });

    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.level.pickups.forEach((pickup, index) => {
      const sprite = this.pickups.create(pickup.x, pickup.y, "infamy");
      sprite.setData("baseY", pickup.y);
      sprite.setData("phase", index * 0.7);
      sprite.body.setCircle(13, 4, 4);
    });

    this.consoleGroup = this.physics.add.staticGroup();
    this.level.consoles.forEach((consoleData) => {
      const sprite = this.consoleGroup.create(consoleData.x, consoleData.y, "console-on");
      sprite.setData("done", false);
      sprite.setData("progress", 0);
      sprite.setData("id", consoleData.id);
      sprite.refreshBody();
    });

    this.checkpoints = this.physics.add.staticGroup();
    this.level.checkpoints.forEach((point) => {
      const sprite = this.checkpoints.create(point.x, point.y, "checkpoint-off");
      sprite.setData("active", false);
      sprite.refreshBody();
    });

    this.exit = this.physics.add.staticSprite(this.level.exit.x, this.level.exit.y, "exit-closed");
    this.exit.refreshBody();

    this.enemies = this.physics.add.group();
    this.level.enemies.forEach((enemyData, index) => {
      const sprite = this.enemies.create(enemyData.x, enemyData.y, "guard-0");
      sprite.setCollideWorldBounds(false);
      sprite.setBounce(0);
      sprite.setData("min", enemyData.min);
      sprite.setData("max", enemyData.max);
      sprite.setData("speed", enemyData.speed);
      sprite.setData("dir", index % 2 === 0 ? 1 : -1);
      sprite.setData("stunned", 0);
      sprite.body.setSize(34, 48);
      sprite.body.setOffset(14, 18);
    });

    if (this.level.boss) {
      this.boss = this.physics.add.sprite(this.level.width - 1100, 252, "boss");
      this.boss.setImmovable(true);
      this.boss.body.allowGravity = false;
      this.boss.body.setSize(92, 88);
      this.boss.body.setOffset(24, 34);
      this.boss.setData("baseY", 252);
      this.boss.setData("hurt", 0);
    }
  }

  createPlayer() {
    this.player = this.physics.add.sprite(this.level.start.x, this.level.start.y, "villain-idle-0");
    this.player.setCollideWorldBounds(false);
    this.player.setDragX(1150);
    this.player.body.setSize(34, 58);
    this.player.body.setOffset(19, 25);
    this.player.body.setMaxVelocity(760, 980);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.overlap(this.player, this.pickups, this.collectInfamy, null, this);
    this.physics.add.overlap(this.player, this.hazards, () => this.damagePlayer(1, -this.facing * 220), null, this);
    this.physics.add.overlap(this.player, this.checkpoints, this.activateCheckpoint, null, this);
    this.physics.add.overlap(this.player, this.exit, this.tryExit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handleEnemyOverlap, null, this);
    if (this.boss) {
      this.physics.add.overlap(this.player, this.boss, this.handleBossOverlap, null, this);
    }

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, -120, 70);
  }

  createHud() {
    const hud = this.add.container(0, 0).setScrollFactor(0).setDepth(40);
    const bg = this.add.graphics();
    bg.fillStyle(0x111016, 0.86);
    bg.fillRect(0, 0, GAME_WIDTH, 58);
    bg.lineStyle(2, 0xffd653, 0.55);
    bg.lineBetween(0, 58, GAME_WIDTH, 58);

    this.actText = this.add.text(18, 9, "", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px",
      color: "#ffd653",
      fontStyle: "700",
    });
    this.objectiveText = this.add.text(18, 32, "", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "14px",
      color: "#f8f5ec",
    });
    this.statText = this.add.text(760, 11, "", {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "16px",
      color: "#f8f5ec",
      align: "right",
    });
    this.statText.setOrigin(0, 0);
    this.toastText = this.add
      .text(GAME_WIDTH / 2, 82, "", {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "17px",
        color: "#f8f5ec",
        backgroundColor: "rgba(17, 16, 22, 0.78)",
        padding: { x: 14, y: 8 },
        align: "center",
        wordWrap: { width: 650 },
      })
      .setOrigin(0.5, 0)
      .setAlpha(0);
    hud.add([bg, this.actText, this.objectiveText, this.statText, this.toastText]);
    this.updateHud();
  }

  createKeys() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      jumpAlt: Phaser.Input.Keyboard.KeyCodes.SPACE,
      dash: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      action: Phaser.Input.Keyboard.KeyCodes.E,
      restart: Phaser.Input.Keyboard.KeyCodes.R,
      pause: Phaser.Input.Keyboard.KeyCodes.ESC,
    });

    this.input.keyboard.on("keydown-ESC", () => {
      this.scene.start("TitleScene");
    });
  }

  createQaHooks() {
    if (!QA_MODE) {
      return;
    }
    this.qaPassHandler = () => {
      if (this.finished) {
        return;
      }
      this.infamy = Math.max(this.infamy, this.level.infamyNeed);
      this.consoleGroup.children.iterate((consoleSprite) => {
        if (consoleSprite && !consoleSprite.getData("done")) {
          this.sabotageConsole(consoleSprite);
        }
      });
      this.bossHealth = 0;
      if (this.boss) {
        this.boss.disableBody(true, true);
      }
      this.checkExitUnlocked();
      this.finishLevel();
    };
    window.addEventListener("badEndQaPass", this.qaPassHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("badEndQaPass", this.qaPassHandler);
    });
  }

  showChapterCard() {
    const panel = this.add.container(GAME_WIDTH / 2, 176).setScrollFactor(0).setDepth(60);
    const bg = this.add.graphics();
    bg.fillStyle(0x111016, 0.82);
    bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.level.palette.accent).color, 1);
    bg.fillRoundedRect(-305, -64, 610, 128, 8);
    bg.strokeRoundedRect(-305, -64, 610, 128, 8);
    const act = this.add
      .text(0, -38, `${this.level.name}: ${this.level.place}`, {
        fontFamily: "Georgia, serif",
        fontSize: "31px",
        color: "#ffd653",
      })
      .setOrigin(0.5);
    const line = this.add
      .text(0, 16, this.level.headline, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "18px",
        color: "#f8f5ec",
        wordWrap: { width: 540 },
        align: "center",
      })
      .setOrigin(0.5);
    panel.add([bg, act, line]);
    this.tweens.add({
      targets: panel,
      y: 156,
      alpha: 0,
      delay: 3200,
      duration: 700,
      onComplete: () => panel.destroy(),
    });
  }

  showStory(lines, delay = 200) {
    lines.forEach((line, index) => {
      this.time.delayedCall(delay + index * 2650, () => {
        this.toast(line, 2300);
      });
    });
  }

  toast(message, duration = 1800) {
    if (!this.toastText) {
      return;
    }
    this.toastText.setText(message);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(0).setY(80);
    this.tweens.add({ targets: this.toastText, alpha: 1, y: 72, duration: 160 });
    this.time.delayedCall(duration, () => {
      if (this.toastText) {
        this.tweens.add({ targets: this.toastText, alpha: 0, y: 62, duration: 240 });
      }
    });
  }

  getControls() {
    const left = this.cursors.left.isDown || this.keys.left.isDown || touchState.left;
    const right = this.cursors.right.isDown || this.keys.right.isDown || touchState.right;
    const jumpDown =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jumpAlt) ||
      consumeTap("jump");
    const dashDown =
      Phaser.Input.Keyboard.JustDown(this.keys.dash) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.shift) ||
      consumeTap("dash");
    const actionDown = Phaser.Input.Keyboard.JustDown(this.keys.action) || consumeTap("action");
    const actionHeld = this.keys.action.isDown || touchState.action;
    return { left, right, jumpDown, dashDown, actionDown, actionHeld };
  }

  update(time, delta) {
    if (this.finished || !this.player) {
      return;
    }

    const dt = delta / 1000;
    this.levelSeconds += dt;
    this.campaignSeconds += dt;
    this.dashCooldown = Math.max(0, this.dashCooldown - delta);
    this.dashTime = Math.max(0, this.dashTime - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.actionAura = Math.max(0, this.actionAura - delta);

    const controls = this.getControls();
    this.updatePlayer(controls, time);
    this.updateEnemies(time, delta);
    this.updateCollectibles(time);
    this.updateConsoles(controls, delta);
    this.updateBoss(time, delta);
    this.checkFall();
    this.updateHud();
  }

  updatePlayer(controls, time) {
    const speed = this.dashTime > 0 ? 450 : 255;

    if (controls.left) {
      this.player.setVelocityX(-speed);
      this.facing = -1;
    } else if (controls.right) {
      this.player.setVelocityX(speed);
      this.facing = 1;
    } else if (this.dashTime <= 0) {
      this.player.setVelocityX(0);
    }

    const grounded = this.player.body.blocked.down || this.player.body.touching.down;
    if (controls.jumpDown && grounded) {
      this.player.setVelocityY(-610);
    }

    if (controls.dashDown && this.dashCooldown <= 0) {
      this.dashTime = 170;
      this.dashCooldown = 780;
      this.player.setVelocityX(this.facing * 620);
      this.player.setVelocityY(Math.min(this.player.body.velocity.y, -60));
      this.cameras.main.shake(80, 0.003);
    }

    if (controls.actionDown || controls.actionHeld) {
      this.actionAura = 180;
    }

    this.player.setFlipX(this.facing < 0);
    const alpha = this.invulnerable > 0 ? 0.52 + Math.sin(time / 35) * 0.25 : 1;
    this.player.setAlpha(alpha);

    const moving = Math.abs(this.player.body.velocity.x) > 30;
    let textureKey = "villain-idle-0";
    if (this.dashTime > 0) {
      textureKey = "villain-dash";
    } else if (moving) {
      textureKey = `villain-run-${Math.floor(time / 105) % 4}`;
    } else {
      textureKey = `villain-idle-${Math.floor(time / 420) % 2}`;
    }
    this.player.setTexture(textureKey);
  }

  updateCollectibles(time) {
    this.pickups.children.iterate((pickup) => {
      if (!pickup || !pickup.active) {
        return;
      }
      pickup.y = pickup.getData("baseY") + Math.sin(time / 360 + pickup.getData("phase")) * 7;
      pickup.rotation += 0.018;
    });
  }

  updateEnemies(time, delta) {
    this.enemies.children.iterate((enemy) => {
      if (!enemy || !enemy.active) {
        return;
      }
      const stunned = Math.max(0, enemy.getData("stunned") - delta);
      enemy.setData("stunned", stunned);
      if (stunned > 0) {
        enemy.setVelocityX(0);
        enemy.setTexture("guard-stunned");
        return;
      }

      const dir = enemy.getData("dir");
      const min = enemy.getData("min");
      const max = enemy.getData("max");
      enemy.setVelocityX(dir * enemy.getData("speed"));
      if (enemy.x < min) {
        enemy.setData("dir", 1);
      } else if (enemy.x > max) {
        enemy.setData("dir", -1);
      }
      enemy.setFlipX(enemy.getData("dir") < 0);
      enemy.setTexture(`guard-${Math.floor(time / 210) % 2}`);
    });
  }

  updateConsoles(controls, delta) {
    let activeConsole = null;
    let activeDistance = 9999;
    this.consoleGroup.children.iterate((consoleSprite) => {
      if (!consoleSprite || consoleSprite.getData("done")) {
        return;
      }
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        consoleSprite.x,
        consoleSprite.y,
      );
      if (distance < activeDistance) {
        activeDistance = distance;
        activeConsole = consoleSprite;
      }
      consoleSprite.clearTint();
    });

    if (!activeConsole || activeDistance > 86) {
      return;
    }

    activeConsole.setTint(0xffd653);
    const boost = controls.actionHeld || this.actionAura > 0 ? 2.1 : 1;
    const progress = activeConsole.getData("progress") + delta * boost;
    activeConsole.setData("progress", progress);
    activeConsole.rotation = Math.sin(progress / 40) * 0.04;

    if (progress >= 620) {
      this.sabotageConsole(activeConsole);
    }
  }

  sabotageConsole(consoleSprite) {
    if (consoleSprite.getData("done")) {
      return;
    }
    consoleSprite.setData("done", true);
    consoleSprite.setTexture("console-off");
    consoleSprite.clearTint();
    consoleSprite.rotation = 0;
    this.sabotaged += 1;
    this.heat = Math.min(9, this.heat + 1);
    this.emitSparks(consoleSprite.x, consoleSprite.y);
    this.cameras.main.shake(140, 0.005);
    this.toast(`${this.level.goalLabel}: ${this.sabotaged}/${this.level.consoleCount}`);

    if (this.level.boss && this.boss && this.sabotaged >= 3 && this.bossHealth > 0) {
      this.bossHealth -= 1;
      this.boss.setData("hurt", 420);
      this.toast(`Hero shield cracked: ${3 - this.bossHealth}/3`, 1500);
      this.emitSparks(this.boss.x, this.boss.y);
    }

    this.checkExitUnlocked();
  }

  checkExitUnlocked() {
    const ready =
      this.sabotaged >= this.level.consoleCount &&
      this.infamy >= this.level.infamyNeed &&
      (!this.level.boss || this.bossHealth <= 0);
    if (ready && !this.exitUnlocked) {
      this.exitUnlocked = true;
      this.exit.setTexture("exit-open");
      this.toast("The bad ending door is open.", 2500);
      this.emitSparks(this.exit.x, this.exit.y);
    }
  }

  updateBoss(time, delta) {
    if (!this.boss || !this.boss.active) {
      return;
    }
    const hurt = Math.max(0, this.boss.getData("hurt") - delta);
    this.boss.setData("hurt", hurt);
    this.boss.y = this.boss.getData("baseY") + Math.sin(time / 420) * 22;
    this.boss.x += Math.sin(time / 900) * 0.75;
    this.boss.setTint(hurt > 0 ? 0xff6b6b : 0xffffff);
    if (this.bossHealth <= 0) {
      this.boss.setAlpha(0.55 + Math.sin(time / 90) * 0.2);
    }
  }

  emitSparks(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const spark = this.add.sprite(x, y, "spark").setDepth(20);
      const angle = (Math.PI * 2 * i) / 12;
      const distance = 42 + (i % 3) * 13;
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.25,
        duration: 520,
        ease: "Cubic.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  collectInfamy(player, pickup) {
    if (!pickup.active) {
      return;
    }
    pickup.disableBody(true, true);
    this.infamy += 1;
    this.heat = Math.min(9, this.heat + 0.2);
    this.emitSparks(pickup.x, pickup.y);
    this.checkExitUnlocked();
  }

  activateCheckpoint(player, checkpoint) {
    if (checkpoint.getData("active")) {
      return;
    }
    this.checkpoints.children.iterate((point) => {
      if (point) {
        point.setTexture("checkpoint-off");
        point.setData("active", false);
      }
    });
    checkpoint.setTexture("checkpoint-on");
    checkpoint.setData("active", true);
    this.checkpoint = { x: checkpoint.x, y: checkpoint.y - 34 };
    this.toast("Your alibi has been updated.", 1300);
  }

  handleEnemyOverlap(player, enemy) {
    if (!enemy.active || enemy.getData("stunned") > 0) {
      return;
    }
    const falling = player.body.velocity.y > 120;
    const above = player.y + 24 < enemy.y;
    if (falling && above) {
      enemy.setData("stunned", 3100);
      player.setVelocityY(-360);
      this.infamy += 1;
      this.emitSparks(enemy.x, enemy.y - 12);
      this.toast("Hero staff demoralized.", 1200);
      this.checkExitUnlocked();
    } else {
      this.damagePlayer(1, player.x < enemy.x ? -260 : 260);
    }
  }

  handleBossOverlap(player, boss) {
    if (this.bossHealth <= 0 && player.body.velocity.y > 150 && player.y < boss.y) {
      this.emitSparks(boss.x, boss.y);
      this.toast("The speech is cancelled.", 1500);
      player.setVelocityY(-420);
      boss.disableBody(true, true);
      this.checkExitUnlocked();
      return;
    }
    this.damagePlayer(1, player.x < boss.x ? -320 : 320);
  }

  damagePlayer(amount, knockbackX) {
    if (this.invulnerable > 0 || this.respawning || this.finished) {
      return;
    }
    this.ego -= amount;
    this.invulnerable = 950;
    this.player.setVelocity(knockbackX, -260);
    this.cameras.main.shake(160, 0.006);
    if (this.ego <= 0) {
      this.respawn();
    }
  }

  respawn() {
    this.respawning = true;
    this.toast("The villain edits that mistake out.", 1500);
    this.time.delayedCall(520, () => {
      this.player.setPosition(this.checkpoint.x, this.checkpoint.y);
      this.player.setVelocity(0, 0);
      this.ego = this.maxEgo;
      this.invulnerable = 1300;
      this.respawning = false;
    });
  }

  checkFall() {
    if (this.player.y > 820) {
      this.ego = 0;
      this.respawn();
    }
  }

  tryExit() {
    if (!this.exitUnlocked || this.finished) {
      if (!this.exitUnlocked) {
        this.toast(
          `${this.level.goalLabel} ${this.sabotaged}/${this.level.consoleCount} | Infamy ${this.infamy}/${this.level.infamyNeed}`,
          1300,
        );
      }
      return;
    }
    this.finishLevel();
  }

  finishLevel() {
    this.finished = true;
    this.player.setVelocity(0, 0);
    this.player.setTint(0xffd653);
    this.cameras.main.fadeOut(900, 17, 16, 22);
    saveGame(this.levelIndex + 1, this.campaignSeconds);
    this.time.delayedCall(980, () => {
      this.showCompletePanel();
    });
  }

  showCompletePanel() {
    this.cameras.main.fadeIn(400, 17, 16, 22);
    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0).setDepth(90);
    const bg = this.add.graphics();
    bg.fillStyle(0x111016, 0.94);
    bg.lineStyle(2, 0xffd653, 1);
    bg.fillRoundedRect(-330, -116, 660, 232, 8);
    bg.strokeRoundedRect(-330, -116, 660, 232, 8);
    const title = this.add
      .text(0, -76, `${this.level.name} spoiled`, {
        fontFamily: "Georgia, serif",
        fontSize: "34px",
        color: "#ffd653",
      })
      .setOrigin(0.5);
    const body = this.add
      .text(
        0,
        -22,
        `${this.level.outro}\nInfamy: ${this.infamy} | Time: ${formatTime(this.levelSeconds)}`,
        {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "19px",
          color: "#f8f5ec",
          align: "center",
          wordWrap: { width: 560 },
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);
    panel.add([bg, title, body]);
    this.time.delayedCall(3300, () => {
      if (this.levelIndex + 1 >= CHAPTERS.length) {
        this.scene.start("EndingScene", { campaignSeconds: this.campaignSeconds });
      } else {
        this.scene.start("LevelScene", {
          levelIndex: this.levelIndex + 1,
          campaignSeconds: this.campaignSeconds,
        });
      }
    });
  }

  updateHud() {
    if (!this.actText) {
      return;
    }
    publishState({
      scene: "level",
      levelIndex: this.levelIndex,
      levelName: `${this.level.name}: ${this.level.place}`,
      playerX: Math.round(this.player?.x || 0),
      playerY: Math.round(this.player?.y || 0),
      sabotaged: this.sabotaged,
      requiredSabotage: this.level.consoleCount,
      infamy: this.infamy,
      requiredInfamy: this.level.infamyNeed,
      ego: this.ego,
      heat: Math.ceil(this.heat),
      exitUnlocked: this.exitUnlocked,
      campaignSeconds: Math.floor(this.campaignSeconds),
    });
    this.actText.setText(`${this.level.name}: ${this.level.place}`);
    this.objectiveText.setText(
      `${this.level.goalLabel} ${this.sabotaged}/${this.level.consoleCount}   Infamy ${this.infamy}/${this.level.infamyNeed}`,
    );
    const boss = this.level.boss ? `   Hero ${Math.max(0, this.bossHealth)}/3` : "";
    this.statText.setText(`Ego ${this.ego}/${this.maxEgo}   Heat ${Math.ceil(this.heat)}/9${boss}\n${formatTime(this.campaignSeconds)}`);
  }
}

class EndingScene extends Phaser.Scene {
  constructor() {
    super("EndingScene");
  }

  init(data) {
    this.campaignSeconds = data.campaignSeconds || 0;
  }

  create() {
    publishState({ scene: "ending", campaignSeconds: Math.floor(this.campaignSeconds) });
    this.cameras.main.setBackgroundColor("#18121f");
    this.addEndingBackdrop();
    this.villain = this.add.sprite(480, 244, "villain-idle-0").setScale(3);
    this.add
      .text(480, 58, "Bad Ending Achieved", {
        fontFamily: "Georgia, serif",
        fontSize: "54px",
        color: "#ffd653",
        stroke: "#111016",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(
        480,
        358,
        [
          "The hero keeps the cape. You keep the city schedule, the posters,",
          "the museum plaques, and the suspiciously obedient spotlight.",
          `Campaign time: ${formatTime(this.campaignSeconds)}   Target: ${TARGET_RUNTIME}`,
        ],
        {
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "19px",
          color: "#f8f5ec",
          align: "center",
          lineSpacing: 8,
        },
      )
      .setOrigin(0.5);

    this.createButton(330, 452, 220, "Run it again", () => {
      saveGame(0, 0);
      this.scene.start("LevelScene", { levelIndex: 0, campaignSeconds: 0 });
    });
    this.createButton(572, 452, 220, "Title", () => this.scene.start("TitleScene"));
  }

  addEndingBackdrop() {
    const g = this.add.graphics();
    g.fillStyle(0x18121f, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(0xffd653, 0.94);
    g.fillCircle(482, 242, 128);
    g.fillStyle(0x111016, 0.72);
    for (let i = 0; i < 18; i += 1) {
      const x = i * 62;
      const h = 94 + ((i * 47) % 140);
      g.fillRect(x, 540 - h, 48, h);
    }
    g.fillStyle(0x62d7b7, 0.18);
    g.fillRect(0, 410, GAME_WIDTH, 130);
  }

  createButton(x, y, width, label, onClick) {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    bg.fillStyle(0x111016, 0.94);
    bg.lineStyle(2, 0x62d7b7, 1);
    bg.fillRoundedRect(-width / 2, -25, width, 50, 8);
    bg.strokeRoundedRect(-width / 2, -25, width, 50, 8);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "20px",
        color: "#f8f5ec",
      })
      .setOrigin(0.5);
    container.add([bg, text]);
    container.setSize(width, 50);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -25, width, 50),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on("pointerup", onClick);
  }

  update(time) {
    this.villain.setTexture(`villain-idle-${Math.floor(time / 360) % 2}`);
    this.villain.rotation = Math.sin(time / 520) * 0.05;
  }
}

setupTouchControls();
setupQaBridge();

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "app",
  backgroundColor: "#18121f",
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    preserveDrawingBuffer: true,
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 1580 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, LevelScene, EndingScene],
});
