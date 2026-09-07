import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAnalysis } from "./src/lib/analyzer.js";
import { analyzeWithLLM } from "./server/llm.js";
import { saveScan, getScan, listScans, clearScans } from "./server/storage.js";

try {
  process.loadEnvFile?.();
} catch {
  // .env file is optional
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "dist");
const port = Number(process.env.PORT || 8787);
const MAX_BODY_SIZE = 500 * 1024; // 500KB

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gemini-Key",
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        reject(new Error("Payload exceeds size limit (500KB)"));
        request.destroy();
      }
    });
    request.on("end", () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    request.on("error", reject);
  });
}

async function searchWeb(type, input) {
  const query = type === "url" ? input : input.slice(0, 240);
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "CareerShieldAI/2.0" },
  });

  if (!response.ok) {
    throw new Error(`Search provider returned ${response.status}`);
  }

  const data = await response.json();
  const results = [
    ...(data.AbstractText
      ? [{ title: data.Heading || "Web result", url: data.AbstractURL, snippet: data.AbstractText }]
      : []),
    ...(data.RelatedTopics || [])
      .filter((item) => item.Text && item.FirstURL)
      .slice(0, 4)
      .map((item) => ({ title: item.Text.split(" - ")[0], url: item.FirstURL, snippet: item.Text })),
  ];

  return {
    provider: "DuckDuckGo",
    query,
    found: results.length > 0,
    results,
  };
}

async function performCompleteAnalysis(type, input, userApiKey) {
  const report = runAnalysis(type, input.trim());

  let webCheck;
  try {
    webCheck = await searchWeb(type, input.trim());
  } catch (error) {
    webCheck = { provider: "DuckDuckGo", found: false, error: error.message };
  }

  const effectiveKey = userApiKey || process.env.GEMINI_API_KEY;
  const llmResult = await analyzeWithLLM(type, input.trim(), effectiveKey);

  const fullReport = {
    ...report,
    webCheck,
    llm: llmResult.llmAnalysis || null,
    llmStatus: llmResult.status,
    source: "server-analysis",
  };

  await saveScan(fullReport);
  return fullReport;
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Gemini-Key",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
    });
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const userApiKey = request.headers["x-gemini-key"] || null;

  // Health check
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      service: "careershield-api",
      version: "2.0.0",
      features: {
        heuristics: true,
        webCheck: true,
        llm: Boolean(process.env.GEMINI_API_KEY),
        storage: true,
      },
    });
    return;
  }

  // Single analysis
  if (request.method === "POST" && url.pathname === "/api/analyze") {
    try {
      const payload = await readJson(request);
      if (!["job", "url", "message"].includes(payload.type) || typeof payload.input !== "string" || !payload.input.trim()) {
        sendJson(response, 400, { error: "Fields 'type' (job|url|message) and 'input' (string) are required" });
        return;
      }

      const fullReport = await performCompleteAnalysis(payload.type, payload.input, userApiKey || payload.geminiApiKey);
      sendJson(response, 200, fullReport);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  // Batch analysis
  if (request.method === "POST" && url.pathname === "/api/batch") {
    try {
      const payload = await readJson(request);
      if (!Array.isArray(payload.items) || payload.items.length === 0) {
        sendJson(response, 400, { error: "Array of 'items' is required (max 20 items per batch)" });
        return;
      }

      const items = payload.items.slice(0, 20);
      const results = [];

      for (const item of items) {
        if (!["job", "url", "message"].includes(item.type) || typeof item.input !== "string" || !item.input.trim()) {
          results.push({ error: "Invalid item format", item });
          continue;
        }
        try {
          const report = runAnalysis(item.type, item.input.trim());
          await saveScan(report);
          results.push(report);
        } catch (err) {
          results.push({ error: err.message, item });
        }
      }

      sendJson(response, 200, {
        count: results.length,
        items: results,
      });
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  // History endpoint
  if (request.method === "GET" && url.pathname === "/api/history") {
    try {
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), 100);
      const history = await listScans(limit);
      sendJson(response, 200, { count: history.length, items: history });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
    return;
  }

  // Clear history
  if (request.method === "DELETE" && url.pathname === "/api/history") {
    try {
      await clearScans();
      sendJson(response, 200, { ok: true });
    } catch (error) {
      sendJson(response, 500, { error: error.message });
    }
    return;
  }

  // Permalink report by ID
  if (request.method === "GET" && url.pathname.startsWith("/api/report/")) {
    const id = url.pathname.replace("/api/report/", "").trim();
    if (!id) {
      sendJson(response, 400, { error: "Report ID required" });
      return;
    }
    const report = await getScan(id);
    if (!report) {
      sendJson(response, 404, { error: "Report not found" });
      return;
    }
    sendJson(response, 200, report);
    return;
  }

  // Serve static UI assets if dist directory exists (e.g. in Docker or production)
  if (request.method === "GET" && !url.pathname.startsWith("/api/")) {
    try {
      let filePath = path.join(DIST_DIR, url.pathname === "/" ? "index.html" : url.pathname);
      let stat;
      try {
        stat = await fs.stat(filePath);
      } catch {
        // SPA Fallback: serve index.html
        filePath = path.join(DIST_DIR, "index.html");
        stat = await fs.stat(filePath);
      }

      if (stat.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        const content = await fs.readFile(filePath);
        response.writeHead(200, { "Content-Type": contentType });
        response.end(content);
        return;
      }
    } catch {
      // Fall through to 404 if dist/ does not exist or file not accessible
    }
  }

  sendJson(response, 404, { error: "Endpoint not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CareerShield API v2.0 listening on port ${port}`);
});
