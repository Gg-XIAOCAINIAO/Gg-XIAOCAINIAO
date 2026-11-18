// Cloudflare Pages Functions 的 /api/* 入口：路由、鉴权接口与 JSON 编解码。
import { ensureDb } from "./_db.js";
import {
  base64UrlToBytes,
  clearSessionCookie,
  clientIp,
  passwordIterations,
  sessionCookie,
  signSession,
  verifyPassword,
  SESSION_MAX_AGE,
} from "./_auth.js";
import {
  ApiError,
  changeOwnPassword,
  createBorrower,
  createCategory,
  createHistory,
  createProducts,
  createRental,
  createRentalsBatch,
  createUser,
  deleteBorrower,
  deleteCategory,
  deleteCustomModel,
  deleteHistory,
  deleteUser,
  findUserByUsername,
  hideBuiltinModel,
  importCustomModel,
  listBorrowers,
  listCategories,
  listHistory,
  listModels,
  listProducts,
  listUsers,
  parseIsoDate,
  parseInteger,
  renameCategory,
  restoreBuiltinModel,
  returnRental,
  returnRentalsBatch,
  touchLastLogin,
  updateProductModels,
  updateUser,
} from "./_logic.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

async function readPayload(request, required = true) {
  const raw = await request.text();
  if (!raw || !raw.trim()) {
    if (required) throw new ApiError(400, "请求体为空");
    return {};
  }
  const contentType = (request.headers.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (contentType === "application/x-www-form-urlencoded") {
    const params = new URLSearchParams(raw);
    const payload = {};
    for (const [key, value] of params.entries()) payload[key] = value;
    return payload;
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "请求体必须是有效的 JSON");
  }
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ApiError(400, "请求体必须是 JSON 对象");
  }
  return payload;
}

function firstQuery(searchParams, name) {
  const values = searchParams.getAll(name);
  if (!values.length) return null;
  const value = String(values[0]).trim();
  return value || null;
}

/** 中间件注入的可信身份（base64url JSON；客户端伪造的同名头会在中间件里被删除）。 */
function currentUser(request) {
  const raw = request.headers.get("x-rental-user");
  if (!raw) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(raw)));
    if (!payload || !Number.isInteger(Number(payload.id))) return null;
    return {
      id: Number(payload.id),
      username: payload.username || "",
      display_name: payload.display_name || "",
      role: payload.role || "member",
    };
  } catch {
    return null;
  }
}

function requireUser(request) {
  const user = currentUser(request);
  if (!user || !Number.isInteger(user.id)) {
    throw new ApiError(401, "请先登录");
  }
  return user;
}

function operatorName(request) {
  const user = currentUser(request);
  return user ? user.display_name || user.username || null : null;
}

// ---------------------------------------------------------------------------
// 登录限流（isolate 内存，冷启动会重置；对内部工具足够）
// ---------------------------------------------------------------------------

const loginAttempts = new Map();

function attemptKey(request, username) {
  return `${clientIp(request)}|${String(username || "").toLowerCase()}`;
}

function lockedUntil(key) {
  const entry = loginAttempts.get(key);
  if (!entry || !entry.lockedUntil) return 0;
  if (entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return 0;
  }
  return entry.lockedUntil;
}

function recordFailure(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.count = 0;
    entry.lockedUntil = now + 60 * 1000;
  }
  loginAttempts.set(key, entry);
  if (loginAttempts.size > 1000) loginAttempts.clear();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// 登录 / 登出 / 当前用户
// ---------------------------------------------------------------------------

async function handleLogin(request, env) {
  const secret = env.APP_SECRET;
  if (!secret) {
    return json(503, { error: "系统尚未配置 APP_SECRET，请联系管理员" });
  }
  const payload = await readPayload(request);
  const username = typeof payload.username === "string" ? payload.username.trim() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!username || !password) {
    return json(400, { error: "请填写用户名和密码" });
  }
  const key = attemptKey(request, username);
  const until = lockedUntil(key);
  if (until) {
    return json(429, { error: "尝试次数过多，请 1 分钟后再试" });
  }
  const user = await findUserByUsername(env.DB, username);
  const ok =
    user &&
    Number(user.active) === 1 &&
    (await verifyPassword(password, user.password_hash, secret));
  if (!ok) {
    recordFailure(key);
    await delay(300);
    return json(401, { error: "用户名或密码不正确" });
  }
  loginAttempts.delete(key);
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const token = await signSession({ uid: Number(user.id), pv: Number(user.pwd_ver), exp }, secret);
  await touchLastLogin(env.DB, user.id);
  return json(
    200,
    {
      ok: true,
      user: {
        id: Number(user.id),
        username: user.username,
        display_name: user.display_name,
        role: user.role,
      },
    },
    { "Set-Cookie": sessionCookie(token) },
  );
}

function handleLogout() {
  return json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
}

function handleMe(request) {
  const user = requireUser(request);
  return json(200, {
    user: {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
    },
  });
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

export async function handle(request, env) {
  try {
    if (!env || !env.DB) {
      throw new ApiError(500, "数据库未绑定");
    }
    await ensureDb(env);

    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);
    const method = request.method.toUpperCase();

    if (method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: { Allow: "GET, POST, PATCH, DELETE, OPTIONS" },
      });
    }
    if (!path.startsWith("/api/")) {
      throw new ApiError(404, "接口不存在");
    }

    if (method === "GET") {
      return await handleGet(request, env, path, url.searchParams);
    }

    if (method === "POST" && path === "/api/login") {
      return await handleLogin(request, env);
    }
    if (method === "POST" && path === "/api/logout") {
      return handleLogout();
    }

    const payload = await readPayload(request, method === "POST" || method === "PATCH");
    return await handleWrite(request, env, method, path, url.searchParams, payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return json(error.status, { error: error.message });
    }
    console.error("[api]", error && error.stack ? error.stack : error);
    return json(500, { error: "服务器内部错误" });
  }
}

async function handleGet(request, env, path, searchParams) {
  const db = env.DB;
  if (path === "/api/health") {
    return json(200, { ok: true, brand: "回声科技" });
  }
  if (path === "/api/me") {
    return handleMe(request);
  }
  if (path === "/api/users") {
    return json(200, await listUsers(db));
  }
  if (path === "/api/products") {
    return json(200, await listProducts(db));
  }
  if (path === "/api/categories") {
    return json(200, await listCategories(db));
  }
  if (path === "/api/borrowers") {
    return json(200, await listBorrowers(db));
  }
  if (path === "/api/models") {
    return json(200, await listModels(db));
  }
  if (path === "/api/history") {
    const dateFrom = parseIsoDate(firstQuery(searchParams, "from"), "from", false);
    const dateTo = parseIsoDate(firstQuery(searchParams, "to"), "to", false);
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new ApiError(400, "开始日期不能晚于结束日期");
    }
    const categoryIdRaw = firstQuery(searchParams, "category_id");
    const categoryId = categoryIdRaw ? parseInteger(categoryIdRaw, "category_id") : null;
    return json(
      200,
      await listHistory(db, {
        borrower: firstQuery(searchParams, "borrower"),
        category: firstQuery(searchParams, "category"),
        category_id: categoryId,
        date_from: dateFrom,
        date_to: dateTo,
        q: firstQuery(searchParams, "q"),
      }),
    );
  }
  throw new ApiError(404, "接口不存在");
}

async function handleWrite(request, env, method, path, searchParams, payload) {
  const db = env.DB;
  const secret = env.APP_SECRET;
  const iterations = passwordIterations(env);

  if (method === "POST" && path === "/api/account/password") {
    const user = requireUser(request);
    if (!secret) throw new ApiError(503, "系统尚未配置 APP_SECRET");
    return json(200, await changeOwnPassword(db, user, payload, secret, iterations));
  }
  if (method === "POST" && path === "/api/users") {
    const user = requireUser(request);
    if (user.role !== "admin") throw new ApiError(403, "需要管理员权限");
    if (!secret) throw new ApiError(503, "系统尚未配置 APP_SECRET");
    return json(201, await createUser(db, payload, secret, iterations));
  }
  let match = path.match(/^\/api\/users\/(\d+)$/);
  if (match && method === "PATCH") {
    const user = requireUser(request);
    if (user.role !== "admin") throw new ApiError(403, "需要管理员权限");
    if (!secret) throw new ApiError(503, "系统尚未配置 APP_SECRET");
    return json(200, await updateUser(db, Number(match[1]), payload, user, secret, iterations));
  }
  if (match && method === "DELETE") {
    const user = requireUser(request);
    if (user.role !== "admin") throw new ApiError(403, "需要管理员权限");
    return json(200, await deleteUser(db, Number(match[1]), user));
  }

  if (method === "POST" && path === "/api/categories") {
    return json(201, await createCategory(db, payload));
  }
  if (method === "POST" && path === "/api/borrowers") {
    return json(201, await createBorrower(db, payload));
  }
  if (method === "POST" && path === "/api/history") {
    return json(201, await createHistory(db, payload));
  }
  if (method === "POST" && path === "/api/models/import") {
    return json(201, await importCustomModel(db, payload));
  }
  if (method === "POST" && path === "/api/models/hide") {
    return json(200, await hideBuiltinModel(db, payload.key));
  }
  if (method === "POST" && path === "/api/models/restore") {
    return json(200, await restoreBuiltinModel(db, payload.key));
  }
  if (method === "POST" && path === "/api/products") {
    return json(201, await createProducts(db, payload));
  }
  if (method === "POST" && path === "/api/rentals/batch") {
    return json(201, await createRentalsBatch(db, payload, operatorName(request)));
  }
  if (method === "POST" && path === "/api/rentals/return-batch") {
    return json(200, await returnRentalsBatch(db, payload, operatorName(request)));
  }
  if (method === "POST" && path === "/api/rentals") {
    return json(201, await createRental(db, payload, operatorName(request)));
  }

  match = path.match(/^\/api\/borrowers\/(\d+)$/);
  if (match && method === "DELETE") {
    return json(200, await deleteBorrower(db, Number(match[1])));
  }

  match = path.match(/^\/api\/history\/(\d+)$/);
  if (match && method === "DELETE") {
    return json(200, await deleteHistory(db, Number(match[1])));
  }

  match = path.match(/^\/api\/models\/custom\/(\d+)$/);
  if (match && method === "DELETE") {
    return json(200, await deleteCustomModel(db, Number(match[1])));
  }

  match = path.match(/^\/api\/categories\/(\d+)$/);
  if (match && method === "PATCH") {
    return json(200, await renameCategory(db, Number(match[1]), payload));
  }
  if (match && method === "DELETE") {
    const cascade = (firstQuery(searchParams, "cascade") || "").toLowerCase();
    return json(200, await deleteCategory(db, Number(match[1]), ["1", "true", "yes"].includes(cascade)));
  }

  match = path.match(/^\/api\/products\/(\d+)\/model$/);
  if (match && method === "PATCH") {
    return json(200, await updateProductModels(db, Number(match[1]), payload));
  }

  match = path.match(/^\/api\/rentals\/(\d+)\/return$/);
  if (match && method === "POST") {
    return json(200, await returnRental(db, Number(match[1]), payload, operatorName(request)));
  }

  throw new ApiError(404, "接口不存在");
}
