// Headless Chrome screenshots for the parity bench.
//   node shoot.mjs <page.html> <out.png> [--w 1440] [--h 1000] [--scale 2]
//                   [--wait 2200] [--clip ".iso-plate"] [--eval "js"] [--dark]
//
// Uses a throwaway profile under /tmp and --no-sandbox (this machine's Chrome
// needs both when it is driven from a sandboxed shell).

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const target = args[0];
const out = args[1];
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const width = Number(option("w", 1440));
const height = Number(option("h", 1000));
const scale = Number(option("scale", 2));
const wait = Number(option("wait", 2200));
const clipSelector = option("clip", null);
const expression = option("eval", null);
const zoom = option("zoom", null);
const after = Number(option("after", 500));
const outPath = resolve(out);

const profile = mkdtempSync(join(tmpdir(), "iso-shot-"));
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
    "--allow-file-access-from-files",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);

let stderr = "";
const port = await new Promise((done, fail) => {
  chrome.stderr.on("data", (chunk) => {
    stderr += chunk;
    const match = stderr.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
    if (match) done(Number(match[1]));
  });
  setTimeout(() => fail(new Error("Chrome did not start")), 20000);
});

const targetInfo = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const socket = new WebSocket(targetInfo.webSocketDebuggerUrl);
await new Promise((done) => (socket.onopen = done));

let id = 0;
const pending = new Map();
const problems = [];
socket.onmessage = (message) => {
  const data = JSON.parse(message.data);
  if (data.id && pending.has(data.id)) {
    pending.get(data.id)(data);
    pending.delete(data.id);
  } else if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
    problems.push(data.params.args.map((a) => a.value ?? a.description ?? "").join(" "));
  } else if (data.method === "Runtime.exceptionThrown") {
    problems.push(data.params.exceptionDetails.exception?.description ?? data.params.exceptionDetails.text);
  }
};
const send = (method, params = {}) =>
  new Promise((done, fail) => {
    const call = ++id;
    const timer = setTimeout(() => fail(new Error(`no answer to ${method}`)), 60000);
    pending.set(call, (data) => {
      clearTimeout(timer);
      done(data);
    });
    socket.send(JSON.stringify({ id: call, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.result?.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description ?? "eval failed");
  return result.result?.result?.value;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: scale, mobile: width < 600 });
if (flag("reduce")) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
const loaded = new Promise((done) => {
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.method === "Page.loadEventFired") done();
  });
  setTimeout(done, 8000);
});
await send("Page.navigate", { url: pathToFileURL(resolve(target)).href });
await loaded;
await new Promise((done) => setTimeout(done, wait));
if (flag("dark")) await evaluate(`document.body.dataset.theme = "dark"`);
if (expression) {
  const value = await evaluate(expression);
  if (value !== undefined) console.log("eval:", typeof value === "string" ? value : JSON.stringify(value));
}
await new Promise((done) => setTimeout(done, after));

const rect = clipSelector
  ? await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(clipSelector)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height }; })()`)
  : await evaluate(`({ x: 0, y: 0, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })`);
if (!rect) throw new Error(`no element ${clipSelector}`);

const region = zoom
  ? (() => {
      const [zx, zy, zw, zh] = zoom.split(",").map(Number);
      return { x: rect.x + zx, y: rect.y + zy, width: zw, height: zh, scale: 4 };
    })()
  : { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height), scale: 1 };
const shot = await send("Page.captureScreenshot", {
  format: "png",
  captureBeyondViewport: true,
  clip: region,
});
writeFileSync(outPath, Buffer.from(shot.result.data, "base64"));
console.log(`saved ${outPath} ${Math.round(rect.width)}x${Math.round(rect.height)}`);
if (problems.length) console.log("problems:", problems.join(" | ").slice(0, 600));
else console.log("console: clean");

chrome.kill("SIGKILL");
process.exit(0);
