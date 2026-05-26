const crypto = require("node:crypto");

const HASH_ALGORITHM = "scrypt";
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function hashPassword(password, salt = crypto.randomBytes(SALT_BYTES).toString("hex")) {
  const derivedKey = crypto.scryptSync(String(password), salt, KEY_LENGTH);
  return `${HASH_ALGORITHM}$${salt}$${derivedKey.toString("hex")}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [algorithm, salt, hash] = String(storedHash).split("$");

    if (algorithm !== HASH_ALGORITHM || !salt || !hash) {
      return false;
    }

    const expected = Buffer.from(hash, "hex");
    if (expected.length !== KEY_LENGTH) {
      return false;
    }

    const actual = crypto.scryptSync(String(password), salt, KEY_LENGTH);

    if (actual.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function createSecretToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function safeCompare(value, expected) {
  const left = Buffer.from(String(value || ""));
  const right = Buffer.from(String(expected || ""));

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSecretToken,
  safeCompare,
};
