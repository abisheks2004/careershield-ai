// Lightweight file-backed scan persistence store
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "scans.json");

let memoryCache = [];
let isLoaded = false;

async function ensureStore() {
  if (isLoaded) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, "utf8");
    memoryCache = JSON.parse(content);
    if (!Array.isArray(memoryCache)) memoryCache = [];
  } catch {
    memoryCache = [];
  }
  isLoaded = true;
}

async function persist() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(memoryCache.slice(0, 100), null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist scans to disk:", err.message);
  }
}

export async function saveScan(scan) {
  await ensureStore();
  const entry = {
    ...scan,
    savedAt: new Date().toISOString(),
  };
  memoryCache = [entry, ...memoryCache.filter((s) => s.id !== entry.id)].slice(0, 100);
  await persist();
  return entry;
}

export async function getScan(id) {
  await ensureStore();
  return memoryCache.find((s) => s.id === id) || null;
}

export async function listScans(limit = 50) {
  await ensureStore();
  return memoryCache.slice(0, limit);
}

export async function deleteScan(id) {
  await ensureStore();
  memoryCache = memoryCache.filter((s) => s.id !== id);
  await persist();
  return true;
}

export async function clearScans() {
  await ensureStore();
  memoryCache = [];
  await persist();
  return true;
}
