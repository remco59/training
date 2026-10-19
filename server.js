// Kleine server: serveert de PWA uit ./public en bewaart voortgang in SQLite.
// Env: TOKEN (verplicht voor de API, min. 12 tekens), PORT (3000), DATA_DIR (/data)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = +process.env.PORT || 3000;
const TOKEN = process.env.TOKEN || "";
const DATA_DIR = process.env.DATA_DIR || "/data";
const PUBLIC = path.join(__dirname, "public");
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".json": "application/json", ".png": "image/png",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon"
};

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "enkeltraining.sqlite"));
db.exec(`
  CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), json TEXT NOT NULL, updated_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS log (id INTEGER PRIMARY KEY AUTOINCREMENT, session TEXT NOT NULL, week INTEGER, idx INTEGER, minutes INTEGER, finished_at INTEGER NOT NULL);
`);
const getState = db.prepare("SELECT json, updated_at FROM state WHERE id = 1");
const putState = db.prepare("INSERT INTO state (id, json, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at");
const addLog = db.prepare("INSERT INTO log (session, week, idx, minutes, finished_at) VALUES (?, ?, ?, ?, ?)");
const listLog = db.prepare("SELECT session, week, idx, minutes, finished_at FROM log ORDER BY finished_at DESC LIMIT 500");

function authorized(req) {
  if (TOKEN.length < 12) return false;
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!m) return false;
  const a = crypto.createHash("sha256").update(m[1]).digest();
  const b = crypto.createHash("sha256").update(TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on("data", c => { n += c.length; if (n > 100000) { reject(new Error("te groot")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
function validState(s) {
  return s && typeof s === "object" && Array.isArray(s.days) && s.days.length > 0 && s.days.every(d => Number.isInteger(d) && d >= 0 && d <= 6) &&
    typeof s.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.start) && [5, 10, 15, 20, 30].includes(s.rest) &&
    ["off", "beep", "voice"].includes(s.sound) && s.done && typeof s.done === "object" && !Array.isArray(s.done) && Object.keys(s.done).length < 200;
}

async function api(req, res, pathname) {
  if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
  try {
    if (pathname === "/api/state" && req.method === "GET") {
      const r = getState.get();
      return send(res, 200, r ? { state: JSON.parse(r.json), updatedAt: r.updated_at } : { state: null, updatedAt: 0 });
    }
    if (pathname === "/api/state" && req.method === "PUT") {
      const b = await readBody(req);
      if (!validState(b.state) || !Number.isFinite(b.updatedAt)) return send(res, 400, { error: "invalid" });
      const r = getState.get();
      if (r && r.updated_at > b.updatedAt) return send(res, 200, { accepted: false, state: JSON.parse(r.json), updatedAt: r.updated_at });
      putState.run(JSON.stringify(b.state), Math.floor(b.updatedAt));
      return send(res, 200, { accepted: true, updatedAt: Math.floor(b.updatedAt) });
    }
    if (pathname === "/api/log" && req.method === "POST") {
      const b = await readBody(req);
      if (typeof b.session !== "string" || b.session.length > 20 || !Number.isFinite(b.finishedAt)) return send(res, 400, { error: "invalid" });
      addLog.run(b.session, Number.isInteger(b.week) ? b.week : null, Number.isInteger(b.idx) ? b.idx : null, Number.isInteger(b.minutes) ? b.minutes : null, Math.floor(b.finishedAt));
      return send(res, 200, { ok: true });
    }
    if (pathname === "/api/log" && req.method === "GET") return send(res, 200, { log: listLog.all() });
    return send(res, 404, { error: "not found" });
  } catch (e) {
    return send(res, 400, { error: "bad request" });
  }
}

function serveStatic(req, res, pathname) {
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end(); }
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Niet gevonden"); }
    const ext = path.extname(file);
    const headers = { "Content-Type": MIME[ext] || "application/octet-stream" };
    // service worker en manifest nooit lang cachen, zodat updates doorkomen
    headers["Cache-Control"] = (ext === ".html" || file.endsWith("sw.js") || ext === ".webmanifest") ? "no-cache" : "public, max-age=86400";
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://x").pathname;
  if (pathname.startsWith("/api/")) return api(req, res, pathname);
  serveStatic(req, res, pathname);
}).listen(PORT, () => {
  console.log("Enkeltraining op poort " + PORT + (TOKEN.length < 12 ? " (API UIT: zet TOKEN van minimaal 12 tekens)" : ""));
});
