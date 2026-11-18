// Cloudflare Pages Functions 的 /api/* 入口：路由与 JSON 编解码。
import { ensureDb } from "./_db.js";
import {
  ApiError,
  createBorrower,
  createCategory,
  createHistory,
  createProducts,
  createRental,
  createRentalsBatch,
  deleteBorrower,
  deleteCategory,
  deleteCustomModel,
  deleteHistory,
  hideBuiltinModel,
  importCustomModel,
  listBorrowers,
  listCategories,
  listHistory,
  listModels,
  listProducts,
  parseIsoDate,
  parseInteger,
  renameCategory,
  restoreBuiltinModel,
  returnRental,
  returnRentalsBatch,
  updateProductModels,
} from "./_logic.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
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
      return await handleGet(env, path, url.searchParams);
    }
    const payload = await readPayload(request, method === "POST" || method === "PATCH");
    return await handleWrite(env, method, path, url.searchParams, payload);
  } catch (error) {
    if (error instanceof ApiError) {
      return json(error.status, { error: error.message });
    }
    console.error("[api]", error && error.stack ? error.stack : error);
    return json(500, { error: "服务器内部错误" });
  }
}

async function handleGet(env, path, searchParams) {
  const db = env.DB;
  if (path === "/api/health") {
    return json(200, { ok: true, brand: "回声科技" });
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

async function handleWrite(env, method, path, searchParams, payload) {
  const db = env.DB;

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
    return json(201, await createRentalsBatch(db, payload));
  }
  if (method === "POST" && path === "/api/rentals/return-batch") {
    return json(200, await returnRentalsBatch(db, payload));
  }
  if (method === "POST" && path === "/api/rentals") {
    return json(201, await createRental(db, payload));
  }

  let match = path.match(/^\/api\/borrowers\/(\d+)$/);
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
    return json(200, await returnRental(db, Number(match[1]), payload));
  }

  throw new ApiError(404, "接口不存在");
}
