const csrfToken = document.querySelector("meta[name='csrf-token']").content;
const canvas = document.getElementById("gardenCanvas");
const ctx = canvas.getContext("2d");
const actionButtons = document.querySelectorAll("[data-action]");
const secretMark = document.getElementById("secretMark");
const eclipseButton = document.getElementById("eclipseButton");

const refs = {
  level: document.getElementById("level"),
  energy: document.getElementById("energy"),
  harmony: document.getElementById("harmony"),
  signal: document.getElementById("signal"),
  risk: document.getElementById("risk"),
  xp: document.getElementById("xp"),
  nextXp: document.getElementById("nextXp"),
  xpBar: document.getElementById("xpBar"),
  throughput: document.getElementById("throughput"),
  stability: document.getElementById("stability"),
  heat: document.getElementById("heat"),
  credits: document.getElementById("credits"),
  events: document.getElementById("events"),
  discoveries: document.getElementById("discoveries"),
};

let world = null;
let secretClicks = 0;
let secretTimer = null;
let pendingAction = false;

function setText(ref, value) {
  ref.textContent = String(value);
}

function formatTime(value) {
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderWorld(nextWorld) {
  world = nextWorld;
  document.body.classList.toggle("eclipse", world.mode === "eclipse");
  eclipseButton.classList.toggle("is-hidden", world.mode !== "eclipse");

  setText(refs.level, world.level);
  setText(refs.energy, world.energy);
  setText(refs.harmony, world.harmony);
  setText(refs.signal, world.signal);
  setText(refs.risk, world.risk);
  setText(refs.xp, world.xp);
  setText(refs.nextXp, world.nextLevelXp);
  setText(refs.throughput, world.readings.throughput);
  setText(refs.stability, world.readings.stability);
  setText(refs.heat, world.readings.heat);
  setText(refs.credits, `${world.credits} credits`);

  const xpProgress = Math.min(100, Math.round((world.xp / world.nextLevelXp) * 100));
  refs.xpBar.style.width = `${xpProgress}%`;

  refs.events.replaceChildren(
    ...world.eventLog.map((event) => {
      const item = document.createElement("li");
      item.className = event.tone || "";
      item.textContent = event.text;

      const time = document.createElement("time");
      time.dateTime = event.at;
      time.textContent = formatTime(event.at);
      item.append(time);

      return item;
    })
  );

  if (world.discoveries.length === 0) {
    const empty = document.createElement("span");
    empty.textContent = "None yet";
    refs.discoveries.replaceChildren(empty);
  } else {
    refs.discoveries.replaceChildren(
      ...world.discoveries.map((discovery) => {
        const tag = document.createElement("span");
        tag.textContent = discovery;
        return tag;
      })
    );
  }
}

async function fetchWorld() {
  const response = await fetch("/api/world", { headers: { Accept: "application/json" } });
  const result = await response.json();

  if (!response.ok) {
    window.location.href = "/";
    return;
  }

  renderWorld(result.world);
}

async function runAction(action) {
  if (pendingAction) {
    return;
  }

  pendingAction = true;
  actionButtons.forEach((button) => {
    button.disabled = true;
  });

  try {
    const response = await fetch("/api/world/action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ action }),
    });
    const result = await response.json();

    if (response.ok) {
      renderWorld(result.world);
    }
  } finally {
    pendingAction = false;
    actionButtons.forEach((button) => {
      button.disabled = false;
    });
  }
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * scale));
  canvas.height = Math.max(1, Math.floor(rect.height * scale));
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function drawGarden(timestamp) {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const mode = world?.mode || "standard";
  const signal = world?.signal || 45;
  const harmony = world?.harmony || 50;
  const risk = world?.risk || 10;
  const energy = world?.energy || 50;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = mode === "eclipse" ? "#151026" : "#172126";
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = mode === "eclipse" ? "#f9b4ff" : "#9ddfd1";
  for (let x = 0; x < width; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 38) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const nodeCount = 14 + Math.round(signal / 8);
  const nodes = [];
  for (let index = 0; index < nodeCount; index += 1) {
    const orbit = index / nodeCount;
    const angle = orbit * Math.PI * 2 + timestamp / (2200 + index * 80);
    const radiusX = width * (0.18 + (index % 5) * 0.052);
    const radiusY = height * (0.13 + (index % 4) * 0.055);
    nodes.push({
      x: width / 2 + Math.cos(angle) * radiusX + Math.sin(index * 7.3) * 18,
      y: height / 2 + Math.sin(angle * 0.92) * radiusY + Math.cos(index * 5.1) * 14,
      r: 3 + ((index + world?.level || 1) % 5),
    });
  }

  ctx.lineWidth = 1.2;
  nodes.forEach((node, index) => {
    const next = nodes[(index + 3) % nodes.length];
    const pulse = 0.35 + Math.sin(timestamp / 520 + index) * 0.2;
    ctx.globalAlpha = Math.max(0.12, pulse + harmony / 280 - risk / 260);
    ctx.strokeStyle = mode === "eclipse" ? "#ff8fb8" : "#7dd3c7";
    ctx.beginPath();
    ctx.moveTo(node.x, node.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  });

  nodes.forEach((node, index) => {
    const flare = Math.sin(timestamp / 400 + index) * 1.8;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = mode === "eclipse" ? "#ffe08a" : index % 3 === 0 ? "#e95f55" : "#9ddfd1";
    ctx.beginPath();
    ctx.arc(node.x, node.y, Math.max(2, node.r + flare + energy / 55), 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.globalAlpha = 0.15 + signal / 260;
  ctx.fillStyle = mode === "eclipse" ? "#ff76b7" : "#d99b24";
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, Math.max(28, signal * 1.2), 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  requestAnimationFrame(drawGarden);
}

actionButtons.forEach((button) => {
  button.addEventListener("click", () => runAction(button.dataset.action));
});

secretMark.addEventListener("click", () => {
  secretClicks += 1;
  clearTimeout(secretTimer);
  secretTimer = setTimeout(() => {
    secretClicks = 0;
  }, 1400);

  if (secretClicks >= 5) {
    secretClicks = 0;
    runAction("eclipse");
  }
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
fetchWorld();
setInterval(fetchWorld, 4500);
requestAnimationFrame(drawGarden);
