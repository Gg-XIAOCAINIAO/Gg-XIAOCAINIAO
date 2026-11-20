const SETTINGS_KEY = "echo-home-skin-v1";
const DB_NAME = "echo-home-skin";
const DB_STORE = "assets";
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

let toastTimer = null;

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

const PRESETS = {
  paper: "暖纸",
  sage: "灰绿",
  clay: "藕粉",
  mist: "雾蓝",
};

const DEFAULT_SETTINGS = {
  kind: "preset",
  preset: "paper",
  overlay: 0.38,
  blur: 0,
  name: "",
};

let settings = { ...DEFAULT_SETTINGS };
let layer = null;
let scrim = null;
let currentObjectUrl = null;
let dbPromise = null;
let dialog = null;

function normalizeSettings(value) {
  const data = value && typeof value === "object" ? value : {};
  const kind = ["preset", "image", "video"].includes(data.kind) ? data.kind : "preset";
  const overlayNumber = Number(data.overlay);
  const blurNumber = Number(data.blur);
  return {
    kind,
    preset: PRESETS[data.preset] ? data.preset : "paper",
    overlay: Number.isFinite(overlayNumber)
      ? Math.min(0.8, Math.max(0, overlayNumber))
      : DEFAULT_SETTINGS.overlay,
    blur: Number.isFinite(blurNumber) ? Math.min(24, Math.max(0, blurNumber)) : 0,
    name: typeof data.name === "string" ? data.name.slice(0, 120) : "",
  };
}

function loadSettings() {
  try {
    settings = normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)));
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
  return settings;
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 隐私模式下 localStorage 可能不可用，皮肤仍可在当前页面生效。
  }
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

async function readStoredAsset() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const request = tx.objectStore(DB_STORE).get("current");
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function storeAsset(blob, kind, name) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put({ blob, kind, name }, "current");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
  });
}

async function clearStoredAsset() {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete("current");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 清除失败不影响当前页面的皮肤切换。
  }
}

function ensureLayer() {
  if (layer) return layer;
  layer = document.createElement("div");
  layer.className = "home-skin-layer";
  layer.hidden = true;
  layer.setAttribute("aria-hidden", "true");
  scrim = document.createElement("div");
  scrim.className = "home-skin-scrim";
  layer.append(scrim);
  document.body.prepend(layer);
  return layer;
}

function clearMedia() {
  if (!layer) return;
  layer.querySelectorAll(".home-skin-media").forEach((node) => node.remove());
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

function applyVariables() {
  document.documentElement.style.setProperty("--skin-overlay", String(settings.overlay));
  document.documentElement.style.setProperty("--skin-blur", `${settings.blur}px`);
}

function applyPreset(preset) {
  ensureLayer();
  clearMedia();
  const wasCustom = settings.kind !== "preset";
  const name = PRESETS[preset] ? preset : "paper";
  settings = { ...settings, kind: "preset", preset: name, name: "" };
  saveSettings();
  applyVariables();
  if (wasCustom) clearStoredAsset();
  if (name === "paper") {
    layer.hidden = true;
    layer.removeAttribute("data-preset");
    document.body.classList.remove("has-home-skin");
  } else {
    layer.hidden = false;
    layer.dataset.preset = name;
    document.body.classList.add("has-home-skin");
  }
  syncDialog();
}

function appendMedia(media) {
  ensureLayer();
  layer.hidden = false;
  layer.removeAttribute("data-preset");
  layer.insertBefore(media, scrim);
  document.body.classList.add("has-home-skin");
}

async function revertToPaper(message) {
  clearMedia();
  settings = { ...DEFAULT_SETTINGS };
  saveSettings();
  applyVariables();
  applyPreset("paper");
  await clearStoredAsset();
  setStatus(message, true);
}

function applyBlob(blob, kind, name) {
  if (!(blob instanceof Blob)) return;
  if (kind === "video" && blob.size > MAX_VIDEO_BYTES) {
    throw new Error("视频超过 120 MB，请先在 Wallpaper Engine 中换成较短的视频壁纸");
  }
  ensureLayer();
  clearMedia();
  currentObjectUrl = URL.createObjectURL(blob);
  if (kind === "video") {
    const video = document.createElement("video");
    video.className = "home-skin-media";
    video.src = currentObjectUrl;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.addEventListener("error", () => revertToPaper("视频无法播放，请换一个 WebM / MP4 文件"));
    video.play().catch(() => {});
    appendMedia(video);
  } else {
    const image = document.createElement("img");
    image.className = "home-skin-media";
    image.src = currentObjectUrl;
    image.alt = "";
    image.addEventListener("error", () => revertToPaper("图片无法显示，请换一张图片"));
    appendMedia(image);
  }
  settings = { ...settings, kind, name: name || "", preset: "paper" };
  saveSettings();
  applyVariables();
  syncDialog();
}

async function persistAndApply(blob, kind, name) {
  try {
    await storeAsset(blob, kind, name);
  } catch {
    setStatus("浏览器存储空间不足，皮肤只在本次打开期间生效", true);
  }
  applyBlob(blob, kind, name);
}

async function compressImage(file) {
  let source;
  let objectUrl = null;
  try {
    source = await createImageBitmap(file);
  } catch {
    objectUrl = URL.createObjectURL(file);
    source = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("图片无法读取，请换一张图片"));
      image.src = objectUrl;
    });
  }
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  if (!width || !height) throw new Error("图片尺寸无效");
  const maxWidth = 1920;
  const maxHeight = 1080;
  const ratio = Math.min(1, maxWidth / width, maxHeight / height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext("2d");
  context.fillStyle = "#f5f3f0";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("图片处理失败，请换一张图片");
  return blob;
}

async function handleImageFile(file) {
  if (!file) return;
  if (!file.type.startsWith("image/") && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    setStatus("请选择 JPG、PNG 或 WebP 图片", true);
    return;
  }
  setStatus("正在压缩图片…");
  try {
    const blob = await compressImage(file);
    await persistAndApply(blob, "image", file.name);
    setStatus(`已应用图片：${file.name}`);
    showToast("主页皮肤已更新");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function isVideoName(name) {
  return /\.(mp4|webm|mov|m4v)$/i.test(name || "");
}

async function readFileFromDirectory(root, relativePath) {
  const parts = String(relativePath || "")
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean);
  let directory = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    directory = await directory.getDirectoryHandle(parts[index]);
  }
  const handle = await directory.getFileHandle(parts[parts.length - 1]);
  return handle.getFile();
}

async function pickWallpaperEngineFolder() {
  if (!window.showDirectoryPicker) {
    setStatus("当前浏览器不支持文件夹读取，请用「选择壁纸文件」手动选 project.json 里的视频或预览图", true);
    return;
  }
  let directory;
  try {
    directory = await window.showDirectoryPicker({ id: "wallpaper-engine-projects", mode: "read" });
  } catch (error) {
    if (error?.name !== "AbortError") setStatus("没有读取到文件夹", true);
    return;
  }

  setStatus("正在读取 Wallpaper Engine 项目…");
  try {
    const projectHandle = await directory.getFileHandle("project.json");
    const project = JSON.parse(await (await projectHandle.getFile()).text());
    const filePath = typeof project.file === "string" ? project.file : "";
    const previewPath = typeof project.preview === "string" ? project.preview : "";
    let asset = null;
    let kind = "";

    if (filePath && isVideoName(filePath) && project.type !== "web") {
      asset = await readFileFromDirectory(directory, filePath);
      kind = "video";
    }
    if (!asset && previewPath) {
      asset = await readFileFromDirectory(directory, previewPath);
      kind = "image";
    }
    if (!asset) {
      throw new Error("没有找到可用的视频或预览图；这个项目可能是场景/网页壁纸，请用「选择壁纸文件」手动选素材");
    }
    await persistAndApply(asset, kind, project.title || asset.name || "Wallpaper Engine");
    setStatus(`已连接：${project.title || asset.name || "Wallpaper Engine 项目"}`);
    showToast("已导入 Wallpaper Engine 壁纸");
  } catch (error) {
    setStatus(error.message || "读取 Wallpaper Engine 项目失败", true);
  }
}

async function handleWeFile(file) {
  if (!file) return;
  if (file.size > MAX_VIDEO_BYTES) {
    setStatus("文件超过 120 MB，请先换成较短的视频", true);
    return;
  }
  setStatus("正在读取壁纸文件…");
  try {
    if (file.type.startsWith("video/") || isVideoName(file.name)) {
      await persistAndApply(file, "video", file.name);
    } else if (file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
      const blob = await compressImage(file);
      await persistAndApply(blob, "image", file.name);
    } else {
      throw new Error("请选择 MP4 / WebM / JPG / PNG 壁纸文件");
    }
    setStatus(`已应用：${file.name}`);
    showToast("主页皮肤已更新");
  } catch (error) {
    setStatus(error.message, true);
  }
}

function syncDialog() {
  if (!dialog) return;
  dialog.querySelectorAll("[data-skin]").forEach((button) => {
    button.classList.toggle("is-active", settings.kind === "preset" && button.dataset.skin === settings.preset);
  });
  const overlay = dialog.querySelector("#skin-overlay");
  const blur = dialog.querySelector("#skin-blur");
  const overlayValue = dialog.querySelector("#skin-overlay-value");
  const blurValue = dialog.querySelector("#skin-blur-value");
  if (overlay) overlay.value = String(settings.overlay);
  if (blur) blur.value = String(settings.blur);
  if (overlayValue) overlayValue.textContent = `${Math.round(settings.overlay * 100)}%`;
  if (blurValue) blurValue.textContent = `${Math.round(settings.blur)}px`;
  const active = dialog.querySelector(".skin-preset.is-active");
  active?.setAttribute("aria-pressed", "true");
  dialog.querySelectorAll(".skin-preset:not(.is-active)").forEach((button) => button.setAttribute("aria-pressed", "false"));
}

function setStatus(message, isError = false) {
  if (!dialog) return;
  const node = dialog.querySelector("#skin-status");
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "var(--clay)" : "";
}

function buildDialog() {
  const element = document.createElement("dialog");
  element.className = "modal-dialog skin-dialog";
  element.id = "skin-dialog";
  element.setAttribute("aria-labelledby", "skin-title");
  element.innerHTML = `
    <form class="modal-card" id="skin-form" novalidate>
      <button class="modal-close" type="button" data-skin-close aria-label="关闭">
        <svg viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m3.5 3.5 11 11m0-11-11 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
      </button>
      <span class="section-label">HOME SKIN</span>
      <h2 id="skin-title">主页皮肤</h2>
      <p class="modal-product">选择一种底色，或用图片 / 视频做主页背景。</p>

      <div class="skin-presets" role="group" aria-label="预设皮肤">
        ${Object.entries(PRESETS).map(([key, label]) => `
          <button class="skin-preset" type="button" data-skin="${key}" aria-pressed="false">
            <span class="skin-preset-swatch" aria-hidden="true"></span>
            <span class="skin-preset-label">${label}</span>
          </button>`).join("")}
      </div>

      <section class="skin-section">
        <h3>自定义图片</h3>
        <p>图片会压缩到 1920 × 1080 以内，只保存在当前浏览器。</p>
        <div class="skin-button-row">
          <button class="btn btn-ghost" id="skin-image-pick" type="button">选择图片</button>
          <input class="skin-file-input" id="skin-image-file" type="file" accept="image/jpeg,image/png,image/webp">
        </div>
      </section>

      <section class="skin-section">
        <h3>Wallpaper Engine</h3>
        <p>网页不能直接控制 Wallpaper Engine 客户端；这里读取本机 WE 项目的 project.json，把其中的视频或预览图变成当前浏览器的主页皮肤。</p>
        <div class="skin-button-row">
          <button class="btn btn-primary" id="skin-we-folder" type="button">选择 WE 项目文件夹</button>
          <button class="btn btn-ghost" id="skin-we-file" type="button">选择壁纸文件</button>
          <button class="btn btn-ghost" id="skin-we-open" type="button">打开 Wallpaper Engine</button>
          <input class="skin-file-input" id="skin-we-input" type="file" accept="video/mp4,video/webm,image/jpeg,image/png,image/webp,.mp4,.webm,.mov,.jpg,.jpeg,.png,.webp">
        </div>
        <p class="skin-status" id="skin-status" aria-live="polite"></p>
      </section>

      <section class="skin-section">
        <h3>可读性</h3>
        <div class="skin-range-row">
          <label for="skin-overlay">遮罩</label>
          <input id="skin-overlay" type="range" min="0" max="0.8" step="0.02" value="0.38">
          <span class="skin-range-value" id="skin-overlay-value">38%</span>
        </div>
        <div class="skin-range-row">
          <label for="skin-blur">模糊</label>
          <input id="skin-blur" type="range" min="0" max="24" step="1" value="0">
          <span class="skin-range-value" id="skin-blur-value">0px</span>
        </div>
      </section>

      <div class="modal-actions">
        <button class="btn btn-ghost" id="skin-reset" type="button">恢复默认</button>
        <button class="btn btn-primary" type="button" data-skin-close>完成</button>
      </div>
      <p class="skin-note">皮肤保存在当前浏览器，不会影响其他同事；换电脑或换浏览器需要重新设置。</p>
    </form>`;
  document.body.append(element);

  element.addEventListener("click", (event) => {
    if (event.target === element) closeDialog();
    const closeButton = event.target.closest("[data-skin-close]");
    if (closeButton) closeDialog();
  });
  element.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
  });

  element.querySelectorAll("[data-skin]").forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.skin);
      setStatus(`已应用预设：${PRESETS[button.dataset.skin]}`);
    });
  });

  element.querySelector("#skin-image-pick").addEventListener("click", () => {
    element.querySelector("#skin-image-file").click();
  });
  element.querySelector("#skin-image-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    await handleImageFile(file);
  });

  element.querySelector("#skin-we-folder").addEventListener("click", pickWallpaperEngineFolder);
  element.querySelector("#skin-we-file").addEventListener("click", () => {
    element.querySelector("#skin-we-input").click();
  });
  element.querySelector("#skin-we-input").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    await handleWeFile(file);
  });
  element.querySelector("#skin-we-open").addEventListener("click", () => {
    setStatus("正在打开 Wallpaper Engine…");
    window.location.href = "steam://rungameid/431960";
  });

  const overlay = element.querySelector("#skin-overlay");
  const blur = element.querySelector("#skin-blur");
  overlay.addEventListener("input", () => {
    settings.overlay = Number(overlay.value);
    applyVariables();
    saveSettings();
    syncDialog();
  });
  blur.addEventListener("input", () => {
    settings.blur = Number(blur.value);
    applyVariables();
    saveSettings();
    syncDialog();
  });

  element.querySelector("#skin-reset").addEventListener("click", async () => {
    settings = { ...DEFAULT_SETTINGS };
    saveSettings();
    clearMedia();
    applyVariables();
    applyPreset("paper");
    await clearStoredAsset();
    setStatus("已恢复默认皮肤");
  });

  return element;
}

function openDialog() {
  if (!dialog) dialog = buildDialog();
  syncDialog();
  setStatus("");
  dialog.showModal();
  document.body.classList.add("modal-open");
}

function closeDialog() {
  dialog?.close();
}

async function restoreStoredSkin() {
  loadSettings();
  applyVariables();
  if (settings.kind === "preset") {
    applyPreset(settings.preset);
    return;
  }
  const asset = await readStoredAsset();
  if (!asset?.blob) {
    settings = { ...settings, kind: "preset", preset: "paper", name: "" };
    saveSettings();
    applyPreset("paper");
    return;
  }
  try {
    applyBlob(asset.blob, asset.kind === "video" ? "video" : "image", asset.name || settings.name);
  } catch {
    applyPreset("paper");
  }
}

export function initSkin() {
  const trigger = document.querySelector("#skin-open");
  if (!trigger) return;
  trigger.addEventListener("click", openDialog);
  restoreStoredSkin();
}
