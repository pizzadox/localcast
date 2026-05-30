/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const path = require("path");

const SERVER_DIR = __dirname;

function start() {
  console.log(`[${new Date().toISOString()}] Starting LocalCast signaling server...`);
  const child = spawn("bun", ["index.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: SERVER_DIR,
    env: { ...process.env, PORT: "3003" },
  });

  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));

  child.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, restarting in 1s...`);
    setTimeout(start, 1000);
  });
}

start();

// Keep this process alive
setInterval(() => {}, 60000);
