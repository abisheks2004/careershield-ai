import { spawn } from "node:child_process";

try {
  process.loadEnvFile?.();
} catch {
  // .env is optional
}

const api = spawn(process.execPath, ["server.js"], { stdio: "inherit" });
const vite = spawn("vite", [], { stdio: "inherit", shell: true });

function stop() {
  api.kill();
  vite.kill();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

api.on("exit", (code) => {
  if (code && code !== 0) {
    vite.kill();
    process.exit(code);
  }
});

vite.on("exit", (code) => {
  if (code && code !== 0) {
    api.kill();
    process.exit(code);
  }
});
