const { spawn } = require("child_process");

function start() {
  const child = spawn("bun", ["index.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    cwd: process.cwd(),
    env: process.env,
  });

  child.stdout.on("data", (d) => process.stdout.write(d));
  child.stderr.on("data", (d) => process.stderr.write(d));
  
  child.on("exit", (code) => {
    console.log(`[${new Date().toISOString()}] Server exited with code ${code}, restarting...`);
    setTimeout(start, 1000);
  });
}

start();

// Keep this process alive
setInterval(() => {}, 60000);
