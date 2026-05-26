const { createSecretToken } = require("./auth");

class SessionStore {
  constructor({ ttlMs, cleanupIntervalMs = 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.sessions = new Map();

    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupIntervalMs);
    this.cleanupTimer.unref?.();
  }

  create(userId, metadata = {}) {
    const now = Date.now();
    const session = {
      id: createSecretToken(),
      userId,
      csrfToken: createSecretToken(),
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.ttlMs,
      ipAddress: metadata.ipAddress || "",
      userAgent: metadata.userAgent || "",
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(sessionId) {
    if (!sessionId) {
      return null;
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    session.lastSeenAt = Date.now();
    return session;
  }

  delete(sessionId) {
    if (sessionId) {
      this.sessions.delete(sessionId);
    }
  }

  deleteUserSessions(userId) {
    for (const [sessionId, session] of this.sessions) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }
}

module.exports = {
  SessionStore,
};
