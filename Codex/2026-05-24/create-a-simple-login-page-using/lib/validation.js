const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateLoginInput(body) {
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const errors = [];

  if (!username) {
    errors.push("Enter your username.");
  }

  if (username && username.length > 64) {
    errors.push("Username is too long.");
  }

  if (!password) {
    errors.push("Enter your password.");
  }

  if (password.length > 128) {
    errors.push("Password is too long.");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: { username, password },
  };
}

function validateRegistrationInput(body) {
  const username = normalizeUsername(body.username);
  const displayName = String(body.displayName || "").trim();
  const password = String(body.password || "");
  const errors = [];

  if (!USERNAME_PATTERN.test(username)) {
    errors.push("Username must be 3-24 characters using lowercase letters, numbers, or underscores.");
  }

  if (displayName.length < 2 || displayName.length > 40 || CONTROL_CHARS.test(displayName)) {
    errors.push("Display name must be 2-40 readable characters.");
  }

  if (password.length < 8 || password.length > 128) {
    errors.push("Password must be 8-128 characters.");
  }

  if (password && (!/[a-z]/i.test(password) || !/[0-9]/.test(password))) {
    errors.push("Password must include at least one letter and one number.");
  }

  return {
    ok: errors.length === 0,
    errors,
    value: { username, displayName, password },
  };
}

function validateWorldAction(body) {
  const action = String(body.action || "").trim().toLowerCase();
  const allowedActions = new Set(["tune", "harvest", "launch", "stabilize", "eclipse"]);

  if (!allowedActions.has(action)) {
    return {
      ok: false,
      errors: ["Unknown action."],
      value: { action: "" },
    };
  }

  return {
    ok: true,
    errors: [],
    value: { action },
  };
}

module.exports = {
  normalizeUsername,
  validateLoginInput,
  validateRegistrationInput,
  validateWorldAction,
};
