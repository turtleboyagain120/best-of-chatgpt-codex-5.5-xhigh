const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");
const { hashPassword, safeCompare, verifyPassword } = require("./lib/auth");
const { SessionStore } = require("./lib/session-store");
const { createRateLimiter } = require("./lib/rate-limit");
const {
  createUser,
  ensureSeedUser,
  findUserById,
  findUserByUsername,
  loadUsers,
  saveUsers,
  serializeUser,
} = require("./lib/user-store");
const {
  applyWorldAction,
  getWorldForUser,
  loadWorlds,
  saveWorlds,
  serializeWorld,
} = require("./lib/world-store");
const {
  DEFAULT_BODY_LIMIT,
  escapeHtml,
  getSecurityHeaders,
  parseCookies,
  parseRequestBody,
  readBody,
  redirect,
  safeStaticPath,
  sendHtml,
  sendJson,
  serializeCookie,
} = require("./lib/http-utils");
const {
  validateLoginInput,
  validateRegistrationInput,
  validateWorldAction,
} = require("./lib/validation");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const PUBLIC_DIR = path.join(ROOT, "public");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const WORLDS_FILE = path.join(DATA_DIR, "worlds.json");
const SESSION_COOKIE = "auth_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 4;
const BODY_LIMIT = DEFAULT_BODY_LIMIT;
const SECURE_COOKIE = process.env.NODE_ENV === "production";
const DUMMY_PASSWORD_HASH = hashPassword("dummy-password-for-timing");

fs.mkdirSync(DATA_DIR, { recursive: true });

let users = ensureSeedUser(loadUsers(USERS_FILE), hashPassword);
let worlds = loadWorlds(WORLDS_FILE);
saveUsers(USERS_FILE, users);

const sessions = new SessionStore({ ttlMs: SESSION_TTL_MS });
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxAttempts: 8,
  lockMs: 5 * 60 * 1000,
});
const registerLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxAttempts: 6,
  lockMs: 10 * 60 * 1000,
});

function getClientIp(req) {
  return req.socket.remoteAddress || "unknown";
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return sessions.get(cookies[SESSION_COOKIE]);
}

function getAuthContext(req) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return null;
  }

  const user = findUserById(users, session.userId);
  if (!user) {
    sessions.delete(session.id);
    return null;
  }

  return { session, user };
}

function getCsrfToken(req, body = {}) {
  return req.headers["x-csrf-token"] || body._csrf || "";
}

function hasValidCsrf(req, session, body = {}) {
  return safeCompare(getCsrfToken(req, body), session.csrfToken);
}

function getSessionCookie(session) {
  return serializeCookie(SESSION_COOKIE, session.id, {
    maxAge: SESSION_TTL_MS,
    secure: SECURE_COOKIE,
    sameSite: "Lax",
  });
}

function getClearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, "", {
    maxAge: 0,
    secure: SECURE_COOKIE,
    sameSite: "Lax",
  });
}

function createUserSession(req, user) {
  return sessions.create(user.id, {
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || "",
  });
}

function readTemplate(filename) {
  return fs.readFileSync(path.join(ROOT, filename), "utf8");
}

function renderTemplate(filename, replacements = {}) {
  let html = readTemplate(filename);
  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, String(value));
  }
  return html;
}

function getStaticContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".css") {
    return "text/css; charset=utf-8";
  }
  if (ext === ".js") {
    return "text/javascript; charset=utf-8";
  }
  if (ext === ".json") {
    return "application/json; charset=utf-8";
  }
  return "application/octet-stream";
}

function sendStatic(req, res, pathname) {
  let filePath;
  try {
    filePath = safeStaticPath(PUBLIC_DIR, pathname);
  } catch {
    sendJson(res, { ok: false, message: "Not found" }, 404);
    return;
  }

  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendJson(res, { ok: false, message: "Not found" }, 404);
    return;
  }

  res.writeHead(200, {
    ...getSecurityHeaders(),
    "Content-Type": getStaticContentType(filePath),
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(res);
}

async function readFormOrJson(req) {
  const rawBody = await readBody(req, BODY_LIMIT);
  return parseRequestBody(rawBody, req.headers["content-type"] || "");
}

function sendRequestError(res, error) {
  const statusCode = error.statusCode || 500;
  const message = error.publicMessage || "Something went wrong.";
  sendJson(res, { ok: false, message }, statusCode);
}

function sendAuthSuccess(req, res, user, redirectTo = "/dashboard") {
  const session = createUserSession(req, user);
  sendJson(
    res,
    {
      ok: true,
      redirect: redirectTo,
      user: serializeUser(user),
    },
    200,
    { "Set-Cookie": getSessionCookie(session) }
  );
}

async function handleLogin(req, res) {
  const body = await readFormOrJson(req);
  const validation = validateLoginInput(body);

  if (!validation.ok) {
    sendJson(res, { ok: false, message: validation.errors[0], errors: validation.errors }, 400);
    return;
  }

  const { username, password } = validation.value;
  const limiterKey = `${getClientIp(req)}:${username}`;
  const limit = loginLimiter.check(limiterKey);

  if (!limit.allowed) {
    sendJson(
      res,
      { ok: false, message: "Too many attempts. Try again in a few minutes." },
      429,
      { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) }
    );
    return;
  }

  const user = findUserByUsername(users, username);
  const passwordMatches = verifyPassword(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    loginLimiter.recordFailure(limiterKey);
    sendJson(res, { ok: false, message: "Invalid username or password." }, 401);
    return;
  }

  loginLimiter.recordSuccess(limiterKey);
  sendAuthSuccess(req, res, user);
}

async function handleRegister(req, res) {
  const limiterKey = getClientIp(req);
  const limit = registerLimiter.check(limiterKey);

  if (!limit.allowed) {
    sendJson(
      res,
      { ok: false, message: "Too many registration attempts. Try again later." },
      429,
      { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) }
    );
    return;
  }

  const body = await readFormOrJson(req);
  const validation = validateRegistrationInput(body);

  if (!validation.ok) {
    registerLimiter.recordFailure(limiterKey);
    sendJson(res, { ok: false, message: validation.errors[0], errors: validation.errors }, 400);
    return;
  }

  const { username, displayName, password } = validation.value;
  if (findUserByUsername(users, username)) {
    registerLimiter.recordFailure(limiterKey);
    sendJson(res, { ok: false, message: "That username is already taken." }, 409);
    return;
  }

  const user = createUser(users, {
    username,
    displayName,
    passwordHash: hashPassword(password),
  });
  saveUsers(USERS_FILE, users);
  registerLimiter.recordSuccess(limiterKey);
  sendAuthSuccess(req, res, user);
}

async function handleLogout(req, res) {
  const context = getAuthContext(req);
  let body = {};

  try {
    body = await readFormOrJson(req);
  } catch (error) {
    sendRequestError(res, error);
    return;
  }

  if (context && !hasValidCsrf(req, context.session, body)) {
    sendJson(res, { ok: false, message: "Invalid session request." }, 403);
    return;
  }

  if (context) {
    sessions.delete(context.session.id);
  }

  redirect(res, "/", { "Set-Cookie": getClearSessionCookie() });
}

function handleDashboard(req, res) {
  const context = getAuthContext(req);
  if (!context) {
    redirect(res, "/");
    return;
  }

  const user = serializeUser(context.user);
  const html = renderTemplate("dashboard.html", {
    CSRF_TOKEN: escapeHtml(context.session.csrfToken),
    DISPLAY_NAME: escapeHtml(user.displayName),
    USERNAME: escapeHtml(user.username),
    ROLE: escapeHtml(user.role),
  });

  sendHtml(res, html);
}

function handleMe(req, res) {
  const context = getAuthContext(req);
  if (!context) {
    sendJson(res, { ok: false, message: "Unauthorized" }, 401);
    return;
  }

  sendJson(res, {
    ok: true,
    user: serializeUser(context.user),
    session: {
      createdAt: new Date(context.session.createdAt).toISOString(),
      expiresAt: new Date(context.session.expiresAt).toISOString(),
    },
  });
}

function handleWorld(req, res) {
  const context = getAuthContext(req);
  if (!context) {
    sendJson(res, { ok: false, message: "Unauthorized" }, 401);
    return;
  }

  const world = getWorldForUser(worlds, context.user);
  const payload = serializeWorld(world);
  saveWorlds(WORLDS_FILE, worlds);
  sendJson(res, { ok: true, world: payload });
}

async function handleWorldAction(req, res) {
  const context = getAuthContext(req);
  if (!context) {
    sendJson(res, { ok: false, message: "Unauthorized" }, 401);
    return;
  }

  const body = await readFormOrJson(req);
  if (!hasValidCsrf(req, context.session, body)) {
    sendJson(res, { ok: false, message: "Invalid session request." }, 403);
    return;
  }

  const validation = validateWorldAction(body);
  if (!validation.ok) {
    sendJson(res, { ok: false, message: validation.errors[0] }, 400);
    return;
  }

  const world = getWorldForUser(worlds, context.user);
  applyWorldAction(world, validation.value.action);
  saveWorlds(WORLDS_FILE, worlds);
  sendJson(res, { ok: true, world: serializeWorld(world) });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const { pathname } = requestUrl;
    const method = req.method || "GET";

    if (method === "GET" && pathname.startsWith("/assets/")) {
      sendStatic(req, res, pathname);
      return;
    }

    if (method === "GET" && pathname === "/") {
      const context = getAuthContext(req);
      if (context) {
        redirect(res, "/dashboard");
        return;
      }

      sendHtml(res, renderTemplate("index.html"));
      return;
    }

    if (method === "POST" && pathname === "/login") {
      await handleLogin(req, res);
      return;
    }

    if (method === "POST" && pathname === "/register") {
      await handleRegister(req, res);
      return;
    }

    if (method === "POST" && pathname === "/logout") {
      await handleLogout(req, res);
      return;
    }

    if (method === "GET" && pathname === "/dashboard") {
      handleDashboard(req, res);
      return;
    }

    if (method === "GET" && pathname === "/api/me") {
      handleMe(req, res);
      return;
    }

    if (method === "GET" && pathname === "/api/world") {
      handleWorld(req, res);
      return;
    }

    if (method === "POST" && pathname === "/api/world/action") {
      await handleWorldAction(req, res);
      return;
    }

    sendJson(res, { ok: false, message: "Not found" }, 404);
  } catch (error) {
    sendRequestError(res, error);
  }
});

server.listen(PORT, () => {
  console.log(`Auth demo running at http://localhost:${PORT}`);
});
