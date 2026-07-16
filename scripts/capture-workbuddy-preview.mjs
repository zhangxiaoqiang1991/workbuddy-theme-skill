#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
  return value;
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const pending = new Map();
    let nextId = 1;

    socket.addEventListener("open", () => {
      resolve({
        async send(method, params = {}) {
          const id = nextId++;
          const result = new Promise((resolveMessage, rejectMessage) => {
            pending.set(id, { resolve: resolveMessage, reject: rejectMessage });
          });
          socket.send(JSON.stringify({ id, method, params }));
          return result;
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener("error", () => reject(new Error("Unable to connect to WorkBuddy CDP.")));
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !pending.has(message.id)) return;
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
  });
}

async function main() {
  const port = Number(option("--port", "9336"));
  const output = option("--output");
  if (!output) throw new Error("--output is required.");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid CDP port.");

  const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => {
    if (!response.ok) throw new Error(`WorkBuddy CDP returned HTTP ${response.status}.`);
    return response.json();
  });
  const target = targets.find((item) => (
    item.type === "page"
    && item.webSocketDebuggerUrl
    && (item.title === "WorkBuddy" || item.url?.includes("WorkBuddy.app"))
  ));
  if (!target) throw new Error("No WorkBuddy page target found.");

  const client = await connect(target.webSocketDebuggerUrl);
  try {
    const evaluated = await client.send("Runtime.evaluate", {
      expression: `(() => {
        const element = document.querySelector('.teams-main-content, .main-content, .chat-container');
        if (!element) throw new Error('WorkBuddy main workspace not found');
        const rect = element.getBoundingClientRect();
        return {
          x: Math.max(0, Math.floor(rect.x)),
          y: Math.max(0, Math.floor(rect.y)),
          width: Math.max(1, Math.floor(rect.width)),
          height: Math.max(1, Math.floor(rect.height))
        };
      })()`,
      returnByValue: true,
    });
    if (evaluated.exceptionDetails) throw new Error("Unable to measure WorkBuddy main workspace.");
    const clip = evaluated.result.value;
    const captured = await client.send("Page.captureScreenshot", {
      format: "jpeg",
      quality: 88,
      fromSurface: true,
      captureBeyondViewport: false,
      clip: { ...clip, scale: 1 },
    });

    const absoluteOutput = path.resolve(output);
    fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });
    fs.writeFileSync(absoluteOutput, Buffer.from(captured.data, "base64"));
    console.log(JSON.stringify({ action: "capture-preview", output: absoluteOutput, clip }, null, 2));
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error(`[workbuddy-skin-preview] ${error.message}`);
  process.exit(1);
});
