import http from "node:http";
import { runAnalysis } from "./src/lib/analyzer.js";

const port = Number(process.env.PORT || 8787);

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  });
  response.end(JSON.stringify(body));
}

async function searchWeb(type, input) {
  const query = type === "url" ? input : input.slice(0, 240);
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "CareerShieldAI/1.0" },
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

async function handleAnalyze(request, response) {
  let body = "";
  for await (const chunk of request) body += chunk;

  const payload = JSON.parse(body);
  if (!["job", "url", "message"].includes(payload.type) || typeof payload.input !== "string" || !payload.input.trim()) {
    sendJson(response, 400, { error: "type and input are required" });
    return;
  }

  const report = runAnalysis(payload.type, payload.input.trim());
  let webCheck;
  try {
    webCheck = await searchWeb(payload.type, payload.input.trim());
  } catch (error) {
    webCheck = { provider: "DuckDuckGo", found: false, error: error.message };
  }

  sendJson(response, 200, { ...report, webCheck, source: "server-analysis" });
}

const server = http.createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && request.url === "/api/health") {
    sendJson(response, 200, { ok: true, service: "careershield-api" });
    return;
  }

  if (request.method === "POST" && request.url === "/api/analyze") {
    try {
      await handleAnalyze(request, response);
    } catch (error) {
      sendJson(response, 400, { error: error.message });
    }
    return;
  }

  sendJson(response, 404, { error: "Not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`CareerShield API listening on port ${port}`);
});
