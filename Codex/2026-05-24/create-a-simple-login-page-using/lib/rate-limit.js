function createRateLimiter({ windowMs, maxAttempts, lockMs }) {
  const attempts = new Map();

  function getRecord(key) {
    const now = Date.now();
    const record = attempts.get(key);

    if (!record || now > record.windowExpiresAt) {
      const fresh = {
        failures: 0,
        windowExpiresAt: now + windowMs,
        lockedUntil: 0,
      };
      attempts.set(key, fresh);
      return fresh;
    }

    return record;
  }

  function check(key) {
    const now = Date.now();
    const record = getRecord(key);

    if (record.lockedUntil > now) {
      return {
        allowed: false,
        retryAfterMs: record.lockedUntil - now,
      };
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  function recordFailure(key) {
    const now = Date.now();
    const record = getRecord(key);
    record.failures += 1;

    if (record.failures >= maxAttempts) {
      record.lockedUntil = now + lockMs;
      record.windowExpiresAt = now + windowMs;
    }
  }

  function recordSuccess(key) {
    attempts.delete(key);
  }

  function cleanup() {
    const now = Date.now();
    for (const [key, record] of attempts) {
      if (now > record.windowExpiresAt && now > record.lockedUntil) {
        attempts.delete(key);
      }
    }
  }

  const cleanupTimer = setInterval(cleanup, Math.max(windowMs, lockMs));
  cleanupTimer.unref?.();

  return {
    check,
    recordFailure,
    recordSuccess,
  };
}

module.exports = {
  createRateLimiter,
};
