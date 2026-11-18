// 左侧类目折叠、空类目开关、模型库去重与移动端断点验收。
// 先启动：msedge --headless=new --remote-debugging-port=9333 --user-data-dir=<临时目录>
import assert from "node:assert/strict";
import path from "node:path";

const CDP = process.env.CDP_PORT || "9333";
const SITE = process.env.SITE_URL || "http://127.0.0.1:8000/#products";
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

const clickText = async (selector, text) => evaluate(`(() => {
  const button = [...document.querySelectorAll(${JSON.stringify(selector)})]
    .find((item) => item.querySelector(".category-name")?.textContent.trim() === ${JSON.stringify(text)});
  if (!button) return false;
  button.click();
  return true;
})()`);

const rootState = () => evaluate(`(() => {
  const button = [...document.querySelectorAll(".category-root-button")]
    .find((item) => item.querySelector(".category-name")?.textContent.trim() === "音频设备");
  return {
    rootCount: document.querySelectorAll(".category-root-button").length,
    expanded: button?.getAttribute("aria-expanded"),
    active: button?.classList.contains("is-active"),
    children: button?.closest(".category-group")?.querySelectorAll(":scope > .category-children > .category-group").length || 0,
    emptyToggle: !document.querySelector("#category-empty-toggle").hidden,
    emptyPressed: document.querySelector("#category-empty-toggle").getAttribute("aria-pressed"),
  };
})()`);

const childState = (text) => evaluate(`(() => {
  const button = [...document.querySelectorAll(".category-child-button")]
    .find((item) => item.querySelector(".category-name")?.textContent.trim() === ${JSON.stringify(text)});
  return {
    found: Boolean(button),
    expanded: button?.getAttribute("aria-expanded"),
    active: button?.classList.contains("is-active"),
    children: button?.closest(".category-group")?.querySelectorAll(":scope > .category-children > .category-group").length || 0,
  };
})()`);

await send("Page.enable");
await send("Runtime.enable");
await send("Log.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: SITE });
await sleep(1800);

// 空类目默认隐藏，只保留有库存的四个大类。
const initial = await rootState();
assert.equal(initial.expanded, "false");
assert.equal(initial.children, 0);
assert.equal(initial.emptyToggle, true);
assert.equal(initial.emptyPressed, "false");
assert.ok(initial.rootCount < 9, "空类目应默认隐藏");
console.log("INITIAL", initial);

// 第一次点击展开。
assert.equal(await clickText(".category-root-button", "音频设备"), true);
await sleep(120);
let state = await rootState();
assert.equal(state.expanded, "true");
assert.equal(state.active, true);
assert.ok(state.children > 0, "展开后应显示子类");
console.log("EXPANDED", state);

// 第二次点击同一大类缩回。
await clickText(".category-root-button", "音频设备");
await sleep(120);
state = await rootState();
assert.equal(state.expanded, "false");
assert.equal(state.active, true);
assert.equal(state.children, 0);
console.log("COLLAPSED", state);

// 再展开，进入二级「耳机」，再次点击应缩回二级子类。
await clickText(".category-root-button", "音频设备");
await sleep(120);
assert.equal(await clickText(".category-child-button", "耳机"), true);
await sleep(120);
let child = await childState("耳机");
assert.equal(child.expanded, "true");
assert.equal(child.active, true);
assert.ok(child.children > 0);
console.log("CHILD_EXPANDED", child);

// 子类选中时，点击已展开的父级也应一次缩回。
await clickText(".category-root-button", "音频设备");
await sleep(120);
state = await rootState();
assert.equal(state.expanded, "false");
assert.equal(state.active, true);
assert.equal(state.children, 0);
console.log("ROOT_COLLAPSED_WITH_ACTIVE_CHILD", state);

// 重新展开父级，子类仍保持展开；再次点击子类缩回。
await clickText(".category-root-button", "音频设备");
await sleep(120);
child = await childState("耳机");
assert.equal(child.expanded, "true");
await clickText(".category-child-button", "耳机");
await sleep(120);
child = await childState("耳机");
assert.equal(child.expanded, "false");
assert.equal(child.active, true);
assert.equal(child.children, 0);
console.log("CHILD_COLLAPSED", child);

// 点击「全部」收起整棵树。
await clickText(".category-button", "全部");
await sleep(120);
state = await rootState();
assert.equal(state.expanded, "false");
assert.equal(state.active, false);
console.log("ALL_COLLAPSED", state);

// 空类目开关可恢复 / 隐藏完整目录。
await evaluate(`document.querySelector("#category-empty-toggle").click()`);
await sleep(120);
const allShown = await rootState();
assert.equal(allShown.emptyPressed, "true");
assert.ok(allShown.rootCount > initial.rootCount, "显示空类目后根节点应增加");
await evaluate(`document.querySelector("#category-empty-toggle").click()`);
await sleep(120);
const allHidden = await rootState();
assert.equal(allHidden.emptyPressed, "false");
assert.equal(allHidden.rootCount, initial.rootCount);
console.log("EMPTY_TOGGLE", { shown: allShown.rootCount, hidden: allHidden.rootCount });

// 模型工坊：常用形态与原型库不重复。
await evaluate(`document.querySelector("#model-open").click()`);
await sleep(450);
const models = await evaluate(`({
  base: document.querySelectorAll(".model-style-button").length,
  prototypes: document.querySelectorAll(".prototype-row[data-prototype-key]").length,
  disabled: document.querySelectorAll(".prototype-row.is-disabled").length
})`);
assert.equal(models.base, 17);
assert.equal(models.prototypes, 39);
assert.equal(models.disabled, 1);
console.log("MODELS", models);
await evaluate(`document.querySelector("#model-close").click()`);
await sleep(400);

// 移动端：类目仍能单击展开 / 缩回，页面不横向溢出。
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await send("Page.navigate", { url: SITE });
await sleep(1600);
const mobileInitial = await rootState();
assert.equal(mobileInitial.expanded, "false");
assert.equal(await clickText(".category-root-button", "音频设备"), true);
await sleep(120);
const mobileExpanded = await rootState();
assert.equal(mobileExpanded.expanded, "true");
assert.ok(mobileExpanded.children > 0);
await clickText(".category-root-button", "音频设备");
await sleep(120);
const mobileCollapsed = await rootState();
assert.equal(mobileCollapsed.expanded, "false");
const overflow = await evaluate(`({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })`);
assert.equal(overflow.scrollWidth <= overflow.width, true, "移动端不应出现页面横向滚动");
console.log("MOBILE", { initial: mobileInitial.rootCount, expanded: mobileExpanded.children, collapsed: mobileCollapsed.children, overflow });

assert.deepEqual(errors, []);
console.log("UI_CHECK_OK", path.basename(SITE));
socket.close();
