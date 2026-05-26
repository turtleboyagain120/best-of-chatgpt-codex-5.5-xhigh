const path = require("node:path");

const DEFAULT_BODY_LIMIT = 16 * 1024;

function parseCookies(cookieHeader = "") {
  return cookieHeader.split(";").reduce((acc, part) => {
    const [key, ...valueParts] = part.trim().split("=");
    if (!key || valueParts.length === 0) {
      return acc;
    }

    try {
      acc[key] = decodeURIComponent(valueParts.join("="));
    } catch {
      acc[key] = valueParts.join("=");
    }

    return acc;
  }, {});
}

function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
    parts.push(`Expires=${new Date(Date.now() + options.maxAge).toUTCString()}`);
  }

  parts.push(`Path=${options.path || "/"}`);
  parts.push("HttpOnly");
  parts.push(`SameSite=${options.sameSite || "Lax"}`);

  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function readBody(req, maxBytes = DEFAULT_BODY_LIMIT) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;
    let rejected = false;

    req.on("data", (chunk) => {
      if (rejected) {
        return;
      }

      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        rejected = true;
        const error = new Error("Request body too large");
        error.statusCode = 413;
        error.publicMessage = "Request body is too large.";
        reject(error);
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => {
      if (!rejected) {
        resolve(Buffer.concat(chunks).toString("utf8"));
      }
    });

    req.on("error", (error) => {
      if (!rejected) {
        reject(error);
      }
    });
  });
}

function parseRequestBody(rawBody, contentType = "") {
  if (!rawBody) {
    return {};
  }

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(rawBody);
    } catch {
      const error = new Error("Malformed JSON");
      error.statusCode = 400;
      error.publicMessage = "Malformed JSON request.";
      throw error;
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody));
  }

  const error = new Error("Unsupported content type");
  error.statusCode = 415;
  error.publicMessage = "Unsupported request content type.";
  throw error;
}

function getSecurityHeaders(options = {}) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
  };

  if (options.csp !== false) {
    headers["Content-Security-Policy"] = [
      "default-src 'self'",
      "base-uri 'none'",
      "connect-src 'self'",
      "font-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self'",
    ].join("; ");
  }

  return headers;
}

function sendHtml(res, html, statusCode = 200, extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...getSecurityHeaders(),
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(html);
}

function sendJson(res, payload, statusCode = 200, extraHeaders = {}) {
  res.writeHead(statusCode, {
    ...getSecurityHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  res.end(JSON.stringify(payload));
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(302, {
    ...getSecurityHeaders(),
    "Cache-Control": "no-store",
    Location: location,
    ...extraHeaders,
  });
  res.end();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeStaticPath(root, requestPath) {
  const decoded = decodeURIComponent(requestPath);
  const relativePath = decoded.replace(/^\/assets\//, "");
  const resolved = path.resolve(root, relativePath);
  const rootPath = path.resolve(root);

  if (!resolved.startsWith(rootPath + path.sep)) {
    return null;
  }

  return resolved;
}

module.exports = {
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
};
