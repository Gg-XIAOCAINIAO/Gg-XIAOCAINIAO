// 鉴权工具：密码哈希（PBKDF2 + pepper）、会话 Cookie 签名、路径权限策略。
// 说明：Cloudflare Workers 免费版 CPU 上限 10ms，PBKDF2 迭代次数默认取 5000；
// 可用环境变量 PASSWORD_ITERATIONS 调整（Workers 硬上限 100000，付费版可调高）。

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE = "rental_session";
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
export const DEFAULT_ITERATIONS = 5000;
export const MAX_ITERATIONS = 100000;

export function passwordIterations(env) {
  const raw = env && env.PASSWORD_ITERATIONS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1000) return DEFAULT_ITERATIONS;
  return Math.min(Math.floor(value), MAX_ITERATIONS);
}

// ---------------------------------------------------------------------------
// 编码 / 比较
// ---------------------------------------------------------------------------

export function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToBytes(text) {
  const normalized = String(text).replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function constantTimeEqual(left, right) {
  const a = left instanceof Uint8Array ? left : encoder.encode(String(left));
  const b = right instanceof Uint8Array ? right : encoder.encode(String(right));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256,
  );
  return new Uint8Array(bits);
}

// ---------------------------------------------------------------------------
// 密码
// ---------------------------------------------------------------------------

export async function hashPassword(password, secret, iterations) {
  const rounds = Math.min(Math.max(Number(iterations) || DEFAULT_ITERATIONS, 1000), MAX_ITERATIONS);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(String(password), salt, rounds);
  const peppered = await hmac(`pepper:${secret}`, bytesToBase64Url(derived));
  return `pbkdf2-sha256$${rounds}$${bytesToBase64Url(salt)}$${bytesToBase64Url(peppered)}`;
}

export async function verifyPassword(password, stored, secret) {
  if (typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const rounds = Number(parts[1]);
  if (!Number.isFinite(rounds) || rounds < 1 || rounds > MAX_ITERATIONS) return false;
  let salt;
  let expected;
  try {
    salt = base64UrlToBytes(parts[2]);
    expected = base64UrlToBytes(parts[3]);
  } catch {
    return false;
  }
  const derived = await pbkdf2(String(password), salt, rounds);
  const peppered = await hmac(`pepper:${secret}`, bytesToBase64Url(derived));
  return constantTimeEqual(peppered, expected);
}

// ---------------------------------------------------------------------------
// 会话
// ---------------------------------------------------------------------------

export async function signSession(payload, secret) {
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await hmac(`session:${secret}`, body));
  return `${body}.${signature}`;
}

export async function verifySession(token, secret) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  let expected;
  try {
    expected = bytesToBase64Url(await hmac(`session:${secret}`, body));
  } catch {
    return null;
  }
  if (!constantTimeEqual(signature, expected)) return null;
  let payload;
  try {
    payload = JSON.parse(decoder.decode(base64UrlToBytes(body)));
  } catch {
    return null;
  }
  if (!payload || typeof payload.uid !== "number" || typeof payload.exp !== "number") return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export function parseCookies(request) {
  const map = new Map();
  const header = request.headers.get("cookie") || "";
  for (const chunk of header.split(";")) {
    const index = chunk.indexOf("=");
    if (index < 0) continue;
    const name = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    if (name) map.set(name, decodeURIComponent(value));
  }
  return map;
}

export function getCookie(request, name) {
  return parseCookies(request).get(name) || null;
}

export function sessionCookie(value, maxAge = SESSION_MAX_AGE) {
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export function clientIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    "local"
  );
}

export async function getSessionUser(db, token, secret) {
  const payload = await verifySession(token, secret);
  if (!payload) return null;
  const user = await db
    .prepare(
      "SELECT id, username, display_name, role, active, pwd_ver FROM users WHERE id = ?",
    )
    .bind(payload.uid)
    .first();
  if (!user) return null;
  if (Number(user.active) !== 1) return null;
  if (Number(user.pwd_ver) !== Number(payload.pv)) return null;
  return user;
}

// ---------------------------------------------------------------------------
// 路由策略
// ---------------------------------------------------------------------------

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/health", "/favicon.svg"]);

export function isPublicPath(path) {
  return PUBLIC_PATHS.has(path);
}

/** 需要管理员权限的接口与页面（其余写操作成员可用）。 */
export function isAdminOnly(method, path) {
  if (path === "/admin" || path.startsWith("/admin/")) return true;
  if (path === "/api/users" || path.startsWith("/api/users/")) return true;
  const upper = String(method || "GET").toUpperCase();
  if (upper === "GET" || upper === "HEAD" || upper === "OPTIONS") return false;
  if (path.startsWith("/api/categories")) return true;
  if (path.startsWith("/api/products")) return true;
  if (path.startsWith("/api/models")) return true;
  if (path.startsWith("/api/history")) return true;
  if (path === "/api/borrowers") return false;
  if (path.startsWith("/api/borrowers/")) return true;
  return false;
}

/** 只允许站内相对路径回跳，避免开放重定向。 */
export function sanitizeNext(value) {
  if (typeof value !== "string" || !value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/login")) return "/";
  return value;
}
