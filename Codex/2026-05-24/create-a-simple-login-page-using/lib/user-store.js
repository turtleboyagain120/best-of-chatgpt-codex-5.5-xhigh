const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function loadUsers(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data.users) ? data.users : [];
  } catch {
    return [];
  }
}

function saveUsers(filePath, users) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify({ users }, null, 2));
  fs.renameSync(tempPath, filePath);
}

function findUserByUsername(users, username) {
  const normalized = normalizeUsername(username);
  return users.find((user) => normalizeUsername(user.username) === normalized) || null;
}

function findUserById(users, id) {
  return users.find((user) => user.id === id) || null;
}

function createUser(users, { username, displayName, passwordHash, role = "member" }) {
  const now = new Date().toISOString();
  const user = {
    id: `user_${crypto.randomUUID()}`,
    username: normalizeUsername(username),
    displayName,
    role,
    passwordHash,
    createdAt: now,
    passwordUpdatedAt: now,
  };

  users.push(user);
  return user;
}

function serializeUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role || "member",
    createdAt: user.createdAt || null,
  };
}

function ensureSeedUser(users, hashPassword) {
  if (users.length > 0) {
    return users;
  }

  const now = new Date().toISOString();
  const seedUser = {
    id: "user_admin",
    username: "admin",
    displayName: "Admin User",
    role: "admin",
    passwordHash: hashPassword(process.env.DEMO_ADMIN_PASSWORD || "Admin!2026"),
    createdAt: now,
    passwordUpdatedAt: now,
  };

  return [seedUser];
}

module.exports = {
  createUser,
  loadUsers,
  saveUsers,
  findUserByUsername,
  findUserById,
  ensureSeedUser,
  normalizeUsername,
  serializeUser,
};
