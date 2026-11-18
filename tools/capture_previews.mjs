// 本地视觉验收：连接 Edge DevTools，按真实交互等待动画后截图。
// 启动浏览器：
//   msedge --headless=new --disable-gpu --no-sandbox --remote-debugging-port=9333 \
//     --user-data-dir=%TEMP%\echo-edge-check --window-size=1440,1000 about:blank
// 然后运行：node tools/capture_previews.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const CDP_PORT = process.env.CDP_PORT || "9333";
const BASE = `http://127.0.0.1:${CDP_PORT}`;
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "previews");
const SITE = process.env.SITE_URL || "http://127.0.0.1:8000/#products";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const target = await fetch(`${BASE}/json/new?about:blank`, { method: "PUT" }).then((response) => response.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const consoleErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown") {
    consoleErrors.push(message.params.exceptionDetails?.exception?.description || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    consoleErrors.push(message.params.entry.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function screenshot(name) {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(path.join(OUT, name), Buffer.from(result.data, "base64"));
}

async function click(selector) {
  const clicked = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`找不到元素：${selector}`);
}

async function clickProduct(status) {
  const clicked = await evaluate(`(() => {
    const card = [...document.querySelectorAll(".product-card")]
      .find((item) => item.querySelector(".pc-foot")?.textContent.includes(${JSON.stringify(status)}));
    if (!card) return false;
    card.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`找不到${status}产品`);
}

async function setDevice(width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
  });
}

await mkdir(OUT, { recursive: true });
await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await setDevice(1440, 1000, false);

await send("Page.navigate", { url: SITE });
await sleep(1700);
await screenshot("products.png");

// 展开一级类目，记录展开态。
await evaluate(`(() => {
  const button = [...document.querySelectorAll(".category-root-button")]
    .find((item) => item.querySelector(".category-name")?.textContent.trim() === "音频设备");
  button?.click();
})()`);
await sleep(220);
await screenshot("category-expanded.png");
await evaluate(`(() => {
  const button = [...document.querySelectorAll(".category-root-button")]
    .find((item) => item.querySelector(".category-name")?.textContent.trim() === "音频设备");
  button?.click();
})()`);
await sleep(180);

// 管理抽屉。
await click("#admin-open-header");
await sleep(550);
await screenshot("admin-drawer.png");
const admin = await evaluate(`JSON.stringify({
  roots: document.querySelectorAll(".tree-root").length,
  children: document.querySelectorAll(".tree-child-row").length,
  categories: document.querySelector("#admin-product-category").options.length
})`);
await click("#admin-close");
await sleep(450);

// 借出弹窗。
await clickProduct("在库");
await sleep(300);
await click("#primary-action");
await sleep(450);
await screenshot("rent-dialog.png");
const rent = await evaluate(`JSON.stringify({
  open: document.querySelector("#rent-dialog").open,
  groups: document.querySelectorAll(".rent-option").length,
  selected: document.querySelector("#rent-selection-count").textContent
})`);
await click("#rent-dialog [data-close]");
await sleep(300);

// 归还弹窗。
await clickProduct("出租中");
await sleep(300);
await click("#primary-action");
await sleep(450);
await screenshot("return-dialog.png");
const returned = await evaluate(`JSON.stringify({
  open: document.querySelector("#return-dialog").open,
  options: document.querySelectorAll(".return-option").length,
  selected: document.querySelector("#return-selected-count").textContent
})`);
await click("#return-dialog [data-close]");
await sleep(300);

// 借用人 / 历史。
await click('[data-view="borrowers"]');
await sleep(950);
await screenshot("borrowers.png");
const borrowers = await evaluate(`JSON.stringify({
  cards: document.querySelectorAll(".borrower-card").length,
  idle: document.querySelectorAll(".borrower-card .borrower-idle").length,
  empty: !document.querySelector("#borrower-empty").hidden
})`);
await click("#borrower-add");
await sleep(350);
await screenshot("borrower-dialog.png");
await click("#borrower-dialog [data-close]");
await sleep(300);

await click('[data-view="history"]');
await sleep(950);
await screenshot("history.png");
const history = await evaluate(`JSON.stringify({
  rows: document.querySelectorAll("#history-body tr").length,
  total: document.querySelector("#history-total").textContent
})`);
await click("#history-add");
await sleep(350);
await screenshot("history-dialog.png");
await click("#history-dialog [data-close]");
await sleep(300);

// 模型工坊：常用形态与原型库。
await click('[data-view="products"]');
await sleep(900);
await evaluate(`document.querySelector(".product-card")?.click()`);
await sleep(300);
await click("#model-open");
await sleep(550);
await screenshot("model-styles.png");
await click("#model-library-open");
await sleep(450);
await screenshot("model-library.png");
await click("#model-library-dialog [data-close]");
await sleep(300);
await evaluate(`document.querySelector(".prototype-list")?.scrollIntoView({ block: "center" })`);
await sleep(350);
await screenshot("model-prototypes.png");

await click("#model-generate-open");
await sleep(400);
await screenshot("model-generator.png");
const generator = await evaluate(`JSON.stringify({ open: document.querySelector("#generate-dialog").open })`);
await click("#generate-dialog [data-close]");
await sleep(250);
await click("#model-close");
await sleep(450);

// 移动端断点（强制重载，避免沿用桌面端的筛选状态）。
await setDevice(390, 844, true);
await send("Page.reload", { ignoreCache: true });
await sleep(1700);
await screenshot("products-mobile.png");
await click('[data-view="borrowers"]');
await sleep(900);
await screenshot("borrowers-mobile.png");
await click('[data-view="history"]');
await sleep(900);
await screenshot("history-mobile.png");
const mobile = await evaluate(`JSON.stringify({
  viewport: [window.innerWidth, window.innerHeight],
  scrollWidth: document.documentElement.scrollWidth,
  clipped: document.documentElement.scrollWidth > window.innerWidth
})`);

console.log("ADMIN", admin);
console.log("RENT", rent);
console.log("RETURN", returned);
console.log("BORROWERS", borrowers);
console.log("HISTORY", history);
console.log("GENERATOR", generator);
console.log("MOBILE", mobile);
console.log("CONSOLE_ERRORS", JSON.stringify(consoleErrors));
console.log("OUT", OUT);
socket.close();
