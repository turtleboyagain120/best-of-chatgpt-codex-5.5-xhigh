const fs = require("node:fs");
const path = require("node:path");

const MAX_EVENTS = 8;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function loadWorlds(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return data && typeof data.worlds === "object" ? data.worlds : {};
  } catch {
    return {};
  }
}

function saveWorlds(filePath, worlds) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ worlds }, null, 2));
  fs.renameSync(tempPath, filePath);
}

function createWorld(user) {
  const now = new Date().toISOString();
  return {
    userId: user.id,
    level: 1,
    xp: 0,
    energy: 72,
    harmony: 58,
    credits: 120,
    risk: 18,
    signal: 44,
    mode: "standard",
    discoveries: [],
    eventLog: [
      {
        at: now,
        text: `${user.displayName || user.username}'s Signal Garden came online.`,
        tone: "calm",
      },
    ],
    lastUpdatedAt: now,
  };
}

function getWorldForUser(worlds, user) {
  if (!worlds[user.id]) {
    worlds[user.id] = createWorld(user);
  }

  return worlds[user.id];
}

function addEvent(world, text, tone = "calm") {
  world.eventLog.unshift({
    at: new Date().toISOString(),
    text,
    tone,
  });
  world.eventLog = world.eventLog.slice(0, MAX_EVENTS);
}

function addDiscovery(world, discovery) {
  if (!world.discoveries.includes(discovery)) {
    world.discoveries.push(discovery);
  }
}

function getNextLevelXp(world) {
  return 90 + world.level * 30;
}

function awardXp(world, amount) {
  world.xp += amount;

  while (world.xp >= getNextLevelXp(world)) {
    world.xp -= getNextLevelXp(world);
    world.level += 1;
    world.credits += 40 + world.level * 5;
    addEvent(world, `The garden reached level ${world.level}.`, "bright");
  }
}

function advanceWorld(world) {
  const now = Date.now();
  const previous = Date.parse(world.lastUpdatedAt) || now;
  const elapsedMs = Math.max(0, Math.min(now - previous, 1000 * 60 * 30));
  const ticks = Math.floor(elapsedMs / 5000);

  if (ticks <= 0) {
    return world;
  }

  for (let index = 0; index < ticks; index += 1) {
    const timeWave = Math.sin((previous + index * 5000) / 24000);
    const eclipseBoost = world.mode === "eclipse" ? 1.4 : 1;

    world.energy = clamp(world.energy - 1 + Math.max(0, world.harmony - 70) / 28, 0, 100);
    world.signal = clamp(world.signal + timeWave * 3 * eclipseBoost - world.risk / 35, 0, 100);
    world.harmony = clamp(world.harmony + Math.cos((previous + index * 5000) / 32000) * 2 - world.risk / 55, 0, 100);
    world.risk = clamp(world.risk + (world.signal > 78 ? 2 : -1), 0, 100);

    if (world.harmony > 62 && world.energy > 20) {
      world.credits = clamp(world.credits + 1, 0, 9999);
    }
  }

  if (ticks >= 6 && world.signal > 75) {
    addEvent(world, "A wandering signal braided itself into the canopy.", "bright");
    awardXp(world, 4);
  }

  world.lastUpdatedAt = new Date(now).toISOString();
  return world;
}

function applyWorldAction(world, action) {
  advanceWorld(world);

  if (action === "tune") {
    world.energy = clamp(world.energy - 8, 0, 100);
    world.harmony = clamp(world.harmony + 13, 0, 100);
    world.signal = clamp(world.signal + 7, 0, 100);
    world.risk = clamp(world.risk - 4, 0, 100);
    awardXp(world, 16);
    addEvent(world, "You tuned the canopy until the signal snapped into focus.", "bright");
  }

  if (action === "harvest") {
    const yieldAmount = Math.max(12, Math.round((world.harmony + world.signal) / 4));
    world.credits = clamp(world.credits + yieldAmount, 0, 9999);
    world.energy = clamp(world.energy - 6, 0, 100);
    world.signal = clamp(world.signal - 3, 0, 100);
    awardXp(world, 10);
    addEvent(world, `Harvested ${yieldAmount} lumen credits from the active grid.`, "calm");
  }

  if (action === "launch") {
    if (world.credits < 35) {
      addEvent(world, "The launch rail clicked, then went still: not enough credits.", "warning");
      return world;
    }

    world.credits -= 35;
    world.signal = clamp(world.signal + 18, 0, 100);
    world.risk = clamp(world.risk + 10, 0, 100);
    awardXp(world, 24);
    addDiscovery(world, "Outer Relay");
    addEvent(world, "A probe crossed the outer relay and returned with a new map shard.", "bright");
  }

  if (action === "stabilize") {
    world.energy = clamp(world.energy + 16, 0, 100);
    world.risk = clamp(world.risk - 18, 0, 100);
    world.harmony = clamp(world.harmony + 4, 0, 100);
    awardXp(world, 12);
    addEvent(world, "The stabilizer cooled the garden's pulse.", "calm");
  }

  if (action === "eclipse") {
    world.mode = "eclipse";
    world.signal = clamp(world.signal + 21, 0, 100);
    world.risk = clamp(world.risk + 8, 0, 100);
    addDiscovery(world, "Eclipse Protocol");
    awardXp(world, 40);
    addEvent(world, "Eclipse Protocol unfolded behind the visible interface.", "secret");
  }

  world.lastUpdatedAt = new Date().toISOString();
  return world;
}

function getLiveReadings(world) {
  const now = Date.now();
  const wave = Math.sin(now / 1300);
  const slowerWave = Math.cos(now / 3100);

  return {
    throughput: clamp(world.signal + wave * 8 + world.level, 0, 100),
    stability: clamp(world.harmony - world.risk / 3 + slowerWave * 5, 0, 100),
    heat: clamp(26 + world.risk / 2 + (world.mode === "eclipse" ? 12 : 0) + wave * 3, 0, 100),
  };
}

function serializeWorld(world) {
  advanceWorld(world);

  return {
    level: world.level,
    xp: world.xp,
    nextLevelXp: getNextLevelXp(world),
    energy: world.energy,
    harmony: world.harmony,
    credits: world.credits,
    risk: world.risk,
    signal: world.signal,
    mode: world.mode,
    discoveries: world.discoveries,
    eventLog: world.eventLog,
    readings: getLiveReadings(world),
    lastUpdatedAt: world.lastUpdatedAt,
  };
}

module.exports = {
  applyWorldAction,
  getWorldForUser,
  loadWorlds,
  saveWorlds,
  serializeWorld,
};
