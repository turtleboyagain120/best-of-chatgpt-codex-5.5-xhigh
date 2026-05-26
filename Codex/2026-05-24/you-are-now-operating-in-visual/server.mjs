import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname);
const port = Number(process.env.PORT || process.argv[2] || 5173);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function resolveRequest(url) {
  const parsed = new URL(url, "http://localhost");
  const pathname = decodeURIComponent(parsed.pathname);
  const clean = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const requested = resolve(join(root, clean));
  if (!requested.startsWith(root)) return null;
  return requested;
}

createServer(async (request, response) => {
  const requested = resolveRequest(request.url ?? "/");
  if (!requested) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    let file = requested;
    const details = await stat(file).catch(() => null);
    if (details?.isDirectory()) {
      file = join(file, "index.html");
    }

    await readFile(file, { flag: "r" });
    response.writeHead(200, {
      "Content-Type": mime[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Vanta Lyric field online at http://localhost:${port}`);
});
