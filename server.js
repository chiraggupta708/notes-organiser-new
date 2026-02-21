const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 4173;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, "data", "revision-kb.json");

function ensureStore() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ subSections: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(DB_PATH, "utf8");

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.subSections)) {
      return { subSections: [] };
    }
    return parsed;
  } catch {
    return { subSections: [] };
  }
}

function writeStore(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8"
  };
  return map[ext] || "application/octet-stream";
}

function serveStatic(reqPath, res) {
  const safePath = reqPath === "/" ? "/index.html" : reqPath;
  const filePath = path.normalize(path.join(ROOT, safePath));

  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { message: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendJson(res, 404, { message: "Not found" });
      return;
    }

    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname === "/api/subsections" && req.method === "GET") {
    const data = readStore();
    sendJson(res, 200, data.subSections);
    return;
  }

  if (pathname === "/api/subsections" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      const { sectionId, title, markdown } = body;

      if (!sectionId || !title?.trim() || !markdown?.trim()) {
        sendJson(res, 400, { message: "sectionId, title and markdown are required." });
        return;
      }

      const now = new Date().toISOString();
      const record = {
        id: createId(),
        sectionId,
        title: title.trim(),
        markdown,
        createdAt: now,
        updatedAt: now
      };

      const data = readStore();
      data.subSections.push(record);
      writeStore(data);
      sendJson(res, 201, record);
    } catch (error) {
      sendJson(res, 400, { message: error.message || "Invalid request" });
    }
    return;
  }

  if (pathname.startsWith("/api/subsections/") && req.method === "PUT") {
    try {
      const id = pathname.split("/").pop();
      const body = await parseBody(req);
      const { title, markdown } = body;

      if (!title?.trim() || !markdown?.trim()) {
        sendJson(res, 400, { message: "title and markdown are required." });
        return;
      }

      const data = readStore();
      const target = data.subSections.find((item) => item.id === id);

      if (!target) {
        sendJson(res, 404, { message: "Sub-section not found." });
        return;
      }

      target.title = title.trim();
      target.markdown = markdown;
      target.updatedAt = new Date().toISOString();
      writeStore(data);
      sendJson(res, 200, target);
    } catch (error) {
      sendJson(res, 400, { message: error.message || "Invalid request" });
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(pathname, res);
    return;
  }

  sendJson(res, 405, { message: "Method not allowed" });
});

server.listen(PORT, () => {
  ensureStore();
  console.log(`Revision KB server running at http://localhost:${PORT}`);
});
