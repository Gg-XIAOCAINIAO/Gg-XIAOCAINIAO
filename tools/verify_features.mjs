// 新增功能验收：器物横向滑动、借用人增删、历史补录/删除、模型库导入/删除。
// 先启动：msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<临时目录>
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CDP = process.env.CDP_PORT || "9333";
const SITE = process.env.SITE_URL || "http://127.0.0.1:8000/#products";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE = path.join(ROOT, "tests", "fixtures", "sample_box.glb");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const target = await fetch(`http://127.0.0.1:${CDP}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const errors = [];
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
    errors.push(message.params.exceptionDetails?.exception?.description || "Runtime exception");
  }
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
    errors.push(message.params.entry.text);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
    errors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(" "));
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

async function click(selector) {
  const ok = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`);
  assert.equal(ok, true, `找不到元素 ${selector}`);
}

async function fill(selector, value) {
  const ok = await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.value = ${JSON.stringify(value)};
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(ok, true, `找不到输入框 ${selector}`);
}

async function confirmDialog() {
  await click("#confirm-dialog button[value='confirm']");
  await sleep(600);
}

async function findBorrowerCard(name) {
  return evaluate(`(() => {
    const card = [...document.querySelectorAll(".borrower-card")]
      .find((item) => item.dataset.borrower === ${JSON.stringify(name)});
    if (!card) return null;
    return { id: card.dataset.borrowerId, count: card.querySelector(".borrower-count")?.textContent || "" };
  })()`);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("DOM.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: SITE });
await sleep(1800);

// 1. 底部器物列表左右滑动。
const strip = await evaluate(`(() => {
  const el = document.querySelector("#product-strip");
  return {
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    scrollable: document.querySelector(".strip-shell").classList.contains("is-scrollable"),
    nextDisabled: document.querySelector("#strip-next").disabled
  };
})()`);
assert.equal(strip.scrollable, true);
assert.equal(strip.nextDisabled, false);
await click("#strip-next");
await sleep(650);
const afterNext = await evaluate(`document.querySelector("#product-strip").scrollLeft`);
assert.ok(afterNext > 0, "点击右箭头后列表应向右滚动");
await click("#strip-prev");
await sleep(650);
const afterPrev = await evaluate(`document.querySelector("#product-strip").scrollLeft`);
assert.ok(afterPrev < afterNext);
console.log("STRIP", { ...strip, afterNext, afterPrev });

// 2. 借用人：独立名录添加与删除。
await click('[data-view="borrowers"]');
await sleep(800);
const borrowerCount = await evaluate(`document.querySelectorAll(".borrower-card").length`);
assert.ok(borrowerCount >= 4);
await click("#borrower-add");
await sleep(250);
await fill("#borrower-name", "验收临时借用人");
await fill("#borrower-note", "自动化验收");
await click("#borrower-submit");
await sleep(900);
let card = await findBorrowerCard("验收临时借用人");
assert.ok(card, "新增借用人后应出现在名录中");
assert.match(card.count, /无借用|借用 0/);
await evaluate(`(() => {
  const card = [...document.querySelectorAll(".borrower-card")]
    .find((item) => item.dataset.borrower === "验收临时借用人");
  card.querySelector("[data-borrower-delete]").click();
})()`);
await sleep(300);
await confirmDialog();
card = await findBorrowerCard("验收临时借用人");
assert.equal(card, null, "借用人应已删除");
console.log("BORROWER", { before: borrowerCount, added: true, deleted: true });

// 3. 历史补录与删除。
await click('[data-view="history"]');
await sleep(800);
const historyBefore = await evaluate(`document.querySelector("#archive-count").textContent`);
await click("#history-add");
await sleep(250);
await fill("#history-product-name", "验收临时器物");
await fill("#history-category", "验收品类");
await fill("#history-borrower", "验收临时借用人");
await fill("#history-lend", "2026-10-01");
await fill("#history-return", "2026-10-08");
await click("#history-submit");
await sleep(900);
const historyAfter = await evaluate(`document.querySelector("#archive-count").textContent`);
assert.notEqual(historyAfter, historyBefore);
await fill("#filter-search", "验收临时器物");
await sleep(750);
const hasHistoryRow = await evaluate(`[...document.querySelectorAll("#history-body tr")]
  .some((row) => row.textContent.includes("验收临时器物"))`);
assert.equal(hasHistoryRow, true);
await evaluate(`(() => {
  const row = [...document.querySelectorAll("#history-body tr")]
    .find((item) => item.textContent.includes("验收临时器物"));
  row.querySelector("[data-history-delete]").click();
})()`);
await sleep(300);
await confirmDialog();
const historyDeleted = await evaluate(`[...document.querySelectorAll("#history-body tr")]
  .some((row) => row.textContent.includes("验收临时器物"))`);
assert.equal(historyDeleted, false);
await fill("#filter-search", "");
await sleep(700);
console.log("HISTORY", { before: historyBefore, after: historyAfter, deleted: true });

// 4. 模型库：导入 GLB、预览、删除。
await click('[data-view="products"]');
await sleep(850);
await evaluate(`document.querySelector(".product-card")?.click()`);
await sleep(250);
await click("#model-open");
await sleep(500);
await click("#model-library-open");
await sleep(300);
assert.equal(await evaluate(`document.querySelector("#model-library-dialog").open`), true);

const documentNode = await send("DOM.getDocument", { depth: -1 });
const inputNode = await send("DOM.querySelector", {
  nodeId: documentNode.root.nodeId,
  selector: "#model-import-file",
});
assert.ok(inputNode.nodeId > 0);
await send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files: [SAMPLE] });
await sleep(300);
assert.equal(await evaluate(`document.querySelector("#model-import-file").files.length`), 1);
await fill("#model-import-name", "验收外部方块");
await click("#model-import-submit");
await sleep(2500);
const importState = await evaluate(`({
  dialogOpen: document.querySelector("#model-library-dialog").open,
  cards: [...document.querySelectorAll(".model-custom-card")].map((item) => item.textContent.trim()),
  selected: document.querySelector(".model-custom-card.is-selected")?.textContent.trim() || "",
  status: document.querySelector("#scene").dataset.modelStatus || "",
  kind: document.querySelector("#scene").dataset.modelKind || "",
  toast: document.querySelector("#toast").textContent
})`);
assert.equal(importState.dialogOpen, false);
assert.ok(importState.cards.some((text) => text.includes("验收外部方块")));
assert.equal(importState.status, "loaded");
assert.equal(importState.kind, "external");
console.log("MODEL_IMPORT", importState);

await click("#model-library-open");
await sleep(300);
await click('[data-library-tab="builtin"]');
await sleep(200);
const builtinRows = await evaluate(`document.querySelectorAll(".model-library-row").length`);
assert.ok(builtinRows > 40);
await evaluate(`document.querySelector("[data-model-hide]:not(:disabled)").click()`);
await sleep(300);
await confirmDialog();
await click('[data-library-tab="hidden"]');
await sleep(200);
const hiddenRows = await evaluate(`document.querySelectorAll(".model-library-row").length`);
assert.ok(hiddenRows >= 1);
await evaluate(`document.querySelector("[data-model-restore]").click()`);
await sleep(500);
const hiddenAfterRestore = await evaluate(`document.querySelectorAll(".model-library-row").length`);
assert.equal(hiddenAfterRestore, 0);
await click('[data-library-tab="custom"]');
await sleep(200);
console.log("MODEL_LIBRARY_TABS", { builtinRows, hiddenRows, hiddenAfterRestore });

await evaluate(`document.querySelector("[data-model-delete-custom]").click()`);
await sleep(300);
await confirmDialog();
const customLeft = await evaluate(`document.querySelectorAll(".model-custom-card").length`);
assert.equal(customLeft, 0);
const statusAfterDelete = await evaluate(`document.querySelector("#scene").dataset.modelStatus`);
assert.equal(statusAfterDelete, "loaded");
console.log("MODEL_DELETE", { customLeft, statusAfterDelete });

// 清理借用人目录中因补录历史而重新出现的临时借用人。
await click("#model-close");
await sleep(400);
await click('[data-view="borrowers"]');
await sleep(800);
card = await findBorrowerCard("验收临时借用人");
if (card) {
  await evaluate(`(() => {
    const card = [...document.querySelectorAll(".borrower-card")]
      .find((item) => item.dataset.borrower === "验收临时借用人");
    card.querySelector("[data-borrower-delete]").click();
  })()`);
  await sleep(300);
  await confirmDialog();
}
assert.equal(await findBorrowerCard("验收临时借用人"), null);

assert.deepEqual(errors, []);
console.log("FEATURE_CHECK_OK");
socket.close();
