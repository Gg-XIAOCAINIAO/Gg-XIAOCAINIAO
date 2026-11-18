// 从 server.py 1:1 移植的业务逻辑，跑在 Cloudflare Pages Functions + D1 上。
import { hashPassword, verifyPassword } from "./_auth.js";
// 约定：所有函数第一个参数是 D1 绑定（env.DB），返回与 Python 版本完全一致的 JSON 结构。

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

export const MODEL_KEYS = new Set([
  "lounge-chair",
  "dining-chair",
  "stool",
  "table-lamp",
  "floor-lamp",
  "speaker",
  "turntable",
  "camera",
  "projector",
  "coffee-table",
  "side-table",
  "loveseat",
  "office-chair",
  "monitor",
  "laptop",
  "cabinet",
  "bed",
  "plant",
  "appliance",
  "vessel",
  "generated",
  "ear-clip",
  "ear-hook",
  "bone-conduction",
  "keyboard",
  "mouse",
  "mousepad",
  "monitor-arm",
  "tv",
  "power-bank",
  "charger",
  "phone-cooler",
  "controller",
  "ssd",
  "phone",
  "tablet",
  "robot-vacuum",
  "vacuum",
  "fridge",
  "air-conditioner",
  "toothbrush",
  "shaver",
  "blood-pressure",
  "hearing-aid",
  "massager",
  "massage-chair",
  "treadmill",
  "standing-desk",
  "luggage",
  "clothing",
  "cup",
  "router",
  "wireless-earbuds",
  "wired-earbuds",
  "gaming-headphones",
  "anc-headphones",
]);

export const FINISH_KEYS = new Set(["default", "oak", "sage", "clay", "graphite"]);
export const MODEL_SCOPES = new Set(["current", "same_name", "category"]);

const PRODUCT_SELECT = `
    SELECT p.*,
           c.name AS category_name,
           pc.name AS category_parent,
           pcc.name AS category_parent_2,
           pccc.name AS category_parent_3,
           c.parent_id AS category_parent_id,
           (SELECT h.id
              FROM rental_history h
             WHERE h.product_id = p.id AND h.status = 'rented'
             ORDER BY h.id DESC
             LIMIT 1) AS active_rental_id
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      LEFT JOIN categories pcc ON pcc.id = pc.parent_id
      LEFT JOIN categories pccc ON pccc.id = pcc.parent_id
`;

// ---------------------------------------------------------------------------
// 基础工具
// ---------------------------------------------------------------------------

function shanghaiDate(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shanghaiDateTime(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

function isoDateToUtc(iso) {
  const parsed = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

async function all(db, sql, ...params) {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results || [];
}

async function first(db, sql, ...params) {
  const row = await db.prepare(sql).bind(...params).first();
  return row || null;
}

async function run(db, sql, ...params) {
  return db.prepare(sql).bind(...params).run();
}

function lastRowId(result) {
  const id = result && result.meta ? result.meta.last_row_id : null;
  return id === null || id === undefined ? null : Number(id);
}

function changedRows(result) {
  const changes = result && result.meta ? result.meta.changes : 0;
  return Number(changes || 0);
}

// ---------------------------------------------------------------------------
// 参数校验（对齐 server.py）
// ---------------------------------------------------------------------------

export function parseIsoDate(value, field, required = true) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ApiError(400, `缺少${field}`);
    return null;
  }
  if (typeof value !== "string") throw new ApiError(400, `${field}格式应为 YYYY-MM-DD`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ApiError(400, `${field}格式应为 YYYY-MM-DD`);
  if (isoDateToUtc(value) === null) throw new ApiError(400, `${field}格式应为 YYYY-MM-DD`);
  return value;
}

export function parseInteger(value, field, minimum = 1, maximum = 2000000000) {
  const number = typeof value === "number" ? value : Number(value);
  if (value === undefined || value === null || value === "" || !Number.isInteger(number)) {
    throw new ApiError(400, `${field} 必须为整数`);
  }
  if (number < minimum || number > maximum) {
    throw new ApiError(400, `${field} 超出允许范围`);
  }
  return number;
}

export function cleanText(value, field, maximum) {
  if (typeof value !== "string") throw new ApiError(400, `请填写${field}`);
  const text = value.trim().split(/\s+/).join(" ");
  if (!text) throw new ApiError(400, `请填写${field}`);
  if ([...text].length > maximum) {
    throw new ApiError(400, `${field}不能超过 ${maximum} 个字符`);
  }
  return text;
}

function cleanBorrower(value) {
  return cleanText(value, "借用人", 40);
}

function normalizeSpaces(value) {
  return String(value ?? "").trim().split(/\s+/).join(" ");
}

// ---------------------------------------------------------------------------
// 行映射
// ---------------------------------------------------------------------------

function categoryPathFromRow(row) {
  const category = row.category_name || row.category;
  const parts = [category];
  if (row.category_parent) parts.unshift(row.category_parent);
  if (row.category_parent_2) parts.unshift(row.category_parent_2);
  if (row.category_parent_3) parts.unshift(row.category_parent_3);
  return parts.join(" / ");
}

export function toProduct(row) {
  const id = Number(row.id);
  return {
    id,
    category_id: row.category_id === null || row.category_id === undefined ? null : Number(row.category_id),
    category: row.category_name || row.category,
    category_parent: row.category_parent || "",
    category_path: categoryPathFromRow(row),
    asset_code: `P${String(id).padStart(4, "0")}`,
    name: row.name,
    model_url: row.model_url,
    status: row.status,
    current_borrower: row.current_borrower ?? null,
    current_lend_date: row.current_lend_date ?? null,
    active_rental_id:
      row.active_rental_id === null || row.active_rental_id === undefined
        ? null
        : Number(row.active_rental_id),
  };
}

export function toRental(row) {
  return {
    id: Number(row.id),
    product_id: row.product_id === null || row.product_id === undefined ? null : Number(row.product_id),
    product_name: row.product_name,
    category: row.category,
    borrower: row.borrower,
    lend_date: row.lend_date,
    return_date: row.return_date ?? null,
    status: row.status,
    lend_operator: row.lend_operator ?? null,
    return_operator: row.return_operator ?? null,
  };
}

async function getProduct(db, productId) {
  const row = await first(db, `${PRODUCT_SELECT} WHERE p.id = ?`, productId);
  return row;
}

async function getRental(db, rentalId) {
  return first(db, "SELECT * FROM rental_history WHERE id = ?", rentalId);
}

async function getCategory(db, categoryId) {
  return first(db, "SELECT * FROM categories WHERE id = ?", categoryId);
}

async function getBorrower(db, borrowerId) {
  return first(db, "SELECT * FROM borrowers WHERE id = ?", borrowerId);
}

// ---------------------------------------------------------------------------
// 查询
// ---------------------------------------------------------------------------

export async function listProducts(db) {
  const rows = await all(
    db,
    `${PRODUCT_SELECT}
     ORDER BY COALESCE(pc.sort_order, c.sort_order, 9999),
              COALESCE(c.sort_order, 9999),
              p.id ASC`,
  );
  return rows.map(toProduct);
}

export async function listCategories(db) {
  const rows = await all(
    db,
    `SELECT c.*,
            COUNT(p.id) AS direct_count,
            COALESCE(SUM(CASE WHEN p.status = 'rented' THEN 1 ELSE 0 END), 0) AS direct_rented
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order, c.id`,
  );

  const nodes = new Map();
  const roots = [];
  for (const row of rows) {
    const node = {
      id: Number(row.id),
      parent_id: row.parent_id === null || row.parent_id === undefined ? null : Number(row.parent_id),
      name: row.name,
      sort_order: Number(row.sort_order),
      depth: 1,
      product_count: Number(row.direct_count),
      borrowed_count: Number(row.direct_rented),
      children: [],
    };
    nodes.set(node.id, node);
  }

  for (const node of nodes.values()) {
    const parent = node.parent_id === null ? null : nodes.get(node.parent_id);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  function walk(node, depth) {
    node.depth = depth;
    node.children.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    let total = node.product_count;
    let rented = node.borrowed_count;
    for (const child of node.children) {
      const [childTotal, childRented] = walk(child, depth + 1);
      total += childTotal;
      rented += childRented;
    }
    node.product_count = total;
    node.borrowed_count = rented;
    return [total, rented];
  }

  for (const root of roots) walk(root, 1);
  roots.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  return roots;
}

export async function categoryChildren(db, categoryId) {
  return all(
    db,
    "SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, id",
    categoryId,
  );
}

export async function categoryDescendants(db, categoryId) {
  const result = [];
  const queue = [categoryId];
  while (queue.length) {
    const current = queue.shift();
    const row = await getCategory(db, current);
    if (!row) continue;
    result.push(row);
    const children = await all(
      db,
      "SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, id",
      current,
    );
    for (const child of children) queue.push(Number(child.id));
  }
  return result;
}

export async function categoryDepth(db, categoryId) {
  let depth = 1;
  let current = await getCategory(db, categoryId);
  while (current && current.parent_id !== null && current.parent_id !== undefined) {
    depth += 1;
    current = await getCategory(db, Number(current.parent_id));
  }
  return depth;
}

export async function categoryLeafNames(db, categoryId) {
  const node = await getCategory(db, categoryId);
  if (!node) throw new ApiError(404, "品类不存在");
  const descendants = await categoryDescendants(db, categoryId);
  return descendants.map((row) => row.name);
}

export async function listBorrowers(db) {
  const todayIso = shanghaiDate();
  const today = isoDateToUtc(todayIso);
  const borrowerRows = await all(
    db,
    `SELECT b.id, b.name, b.note, b.created_at,
            (SELECT COUNT(*) FROM products p
              WHERE p.status = 'rented'
                AND p.current_borrower = b.name COLLATE NOCASE) AS total_count,
            (SELECT COUNT(*) FROM rental_history h
              WHERE h.borrower = b.name COLLATE NOCASE) AS history_count,
            (SELECT MAX(h.lend_date) FROM rental_history h
              WHERE h.borrower = b.name COLLATE NOCASE) AS last_lend_date
       FROM borrowers b
      ORDER BY total_count DESC, b.name COLLATE NOCASE ASC`,
  );

  const itemRows = await all(
    db,
    `SELECT p.id, p.current_borrower, p.name, p.current_lend_date,
            c.name AS category_name, pc.name AS category_parent,
            pcc.name AS category_parent_2, pccc.name AS category_parent_3,
            p.category
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN categories pc ON pc.id = c.parent_id
       LEFT JOIN categories pcc ON pcc.id = pc.parent_id
       LEFT JOIN categories pccc ON pccc.id = pcc.parent_id
      WHERE p.status = 'rented'
        AND p.current_borrower IS NOT NULL
        AND TRIM(p.current_borrower) <> ''
      ORDER BY p.current_lend_date ASC, p.id ASC`,
  );

  const itemsByBorrower = new Map();
  for (const row of itemRows) {
    let days = 0;
    const lendDate = row.current_lend_date;
    const parsed = lendDate ? isoDateToUtc(lendDate) : null;
    if (parsed !== null && today !== null) {
      days = Math.max(0, Math.round((today - parsed) / 86400000));
    }
    const key = String(row.current_borrower).toLowerCase();
    if (!itemsByBorrower.has(key)) itemsByBorrower.set(key, []);
    itemsByBorrower.get(key).push({
      product_id: Number(row.id),
      asset_code: `P${String(Number(row.id)).padStart(4, "0")}`,
      product_name: row.name,
      category: row.category_name || row.category,
      category_parent: row.category_parent || "",
      category_path: categoryPathFromRow(row),
      lend_date: lendDate,
      days_borrowed: days,
    });
  }

  return borrowerRows.map((row) => ({
    id: Number(row.id),
    borrower: row.name,
    note: row.note,
    created_at: row.created_at,
    items: itemsByBorrower.get(String(row.name).toLowerCase()) || [],
    total_count: Number(row.total_count),
    history_count: Number(row.history_count),
    last_lend_date: row.last_lend_date ?? null,
  }));
}

export async function listHistory(db, filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.borrower) {
    clauses.push("borrower = ?");
    params.push(filters.borrower);
  }
  if (filters.category) {
    clauses.push("category = ?");
    params.push(filters.category);
  }
  if (filters.category_id !== undefined && filters.category_id !== null) {
    const names = await categoryLeafNames(db, filters.category_id);
    const placeholders = names.map(() => "?").join(", ");
    clauses.push(`category IN (${placeholders})`);
    params.push(...names);
  }
  if (filters.date_from) {
    clauses.push("lend_date >= ?");
    params.push(filters.date_from);
  }
  if (filters.date_to) {
    clauses.push("lend_date <= ?");
    params.push(filters.date_to);
  }
  if (filters.q) {
    const needle = `%${escapeLike(filters.q)}%`;
    clauses.push("(product_name LIKE ? ESCAPE '!' OR borrower LIKE ? ESCAPE '!')");
    params.push(needle, needle);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await all(
    db,
    `SELECT id, product_id, product_name, category, borrower,
            lend_date, return_date, status, lend_operator, return_operator
       FROM rental_history
       ${where}
      ORDER BY lend_date DESC, id DESC`,
    ...params,
  );
  return rows.map(toRental);
}

function escapeLike(value) {
  return value.replace(/!/g, "!!").replace(/%/g, "!%").replace(/_/g, "!_");
}

async function modelBaseUrl(db, modelKey) {
  if (typeof modelKey !== "string") return null;
  if (MODEL_KEYS.has(modelKey)) return `/assets/models/${modelKey}.glb`;
  const row = await first(
    db,
    "SELECT file_name FROM custom_models WHERE model_key = ?",
    modelKey,
  );
  if (!row) return null;
  return `/assets/models/uploads/${row.file_name}`;
}

async function modelUsageCount(db, modelKey) {
  const base = await modelBaseUrl(db, modelKey);
  if (base === null) return 0;
  const row = await first(
    db,
    "SELECT COUNT(*) AS c FROM products WHERE model_url LIKE ?",
    `${base}%`,
  );
  return Number(row ? row.c : 0);
}

async function customModelPayload(db, row) {
  return {
    id: Number(row.id),
    key: row.model_key,
    name: row.name,
    url: `/assets/models/uploads/${row.file_name}`,
    original_name: row.original_name,
    size_bytes: Number(row.size_bytes),
    created_at: row.created_at,
    usage_count: await modelUsageCount(db, row.model_key),
  };
}

export async function listModels(db) {
  const hiddenRows = await all(db, "SELECT model_key FROM hidden_models");
  const hidden = new Set(hiddenRows.map((row) => row.model_key));
  const builtin = [];
  for (const key of [...MODEL_KEYS].sort()) {
    builtin.push({
      key,
      usage_count: await modelUsageCount(db, key),
      hidden: hidden.has(key),
    });
  }
  const customRows = await all(db, "SELECT * FROM custom_models ORDER BY id DESC");
  const custom = [];
  for (const row of customRows) custom.push(await customModelPayload(db, row));
  return {
    builtin,
    custom,
    hidden: [...hidden].sort(),
  };
}

// ---------------------------------------------------------------------------
// 写入
// ---------------------------------------------------------------------------

export async function createBorrower(db, payload) {
  const name = cleanBorrower(payload?.name);
  const noteRaw = payload?.note === undefined || payload?.note === null ? "" : payload.note;
  const note = noteRaw ? normalizeSpaces(noteRaw) : "";
  if ([...note].length > 120) throw new ApiError(400, "备注不能超过 120 个字符");

  const duplicate = await first(
    db,
    "SELECT id FROM borrowers WHERE name = ? COLLATE NOCASE",
    name,
  );
  if (duplicate) throw new ApiError(409, "该借用人已在名录中");

  const result = await run(
    db,
    "INSERT INTO borrowers (name, note, created_at) VALUES (?, ?, ?)",
    name,
    note,
    shanghaiDateTime(),
  );
  return {
    id: lastRowId(result),
    borrower: name,
    note,
    items: [],
    total_count: 0,
    history_count: 0,
    last_lend_date: null,
  };
}

export async function deleteBorrower(db, borrowerId) {
  const borrower = await getBorrower(db, borrowerId);
  if (!borrower) throw new ApiError(404, "借用人不存在");
  const activeRow = await first(
    db,
    `SELECT COUNT(*) AS c FROM products
      WHERE status = 'rented' AND current_borrower = ? COLLATE NOCASE`,
    borrower.name,
  );
  const active = Number(activeRow ? activeRow.c : 0);
  if (active) throw new ApiError(409, `该借用人还有 ${active} 件器物在借，请先归还`);
  const historyRow = await first(
    db,
    "SELECT COUNT(*) AS c FROM rental_history WHERE borrower = ? COLLATE NOCASE",
    borrower.name,
  );
  const historyCount = Number(historyRow ? historyRow.c : 0);
  await run(db, "DELETE FROM borrowers WHERE id = ?", borrowerId);
  return { ok: true, history_preserved: historyCount };
}

export async function createCategory(db, payload) {
  const name = cleanText(payload?.name, "品类名称", 30);
  const parentRaw = payload?.parent_id;
  let parentId = null;
  let duplicate;
  let nextOrder;

  if (parentRaw !== undefined && parentRaw !== null && parentRaw !== "") {
    parentId = parseInteger(parentRaw, "parent_id");
    const parent = await getCategory(db, parentId);
    if (!parent) throw new ApiError(404, "父级品类不存在");
    const parentDepth = await categoryDepth(db, parentId);
    if (parentDepth >= 4) throw new ApiError(400, "最多支持四级品类，不能在四级品类下继续添加");
    duplicate = await first(
      db,
      "SELECT id FROM categories WHERE parent_id = ? AND name = ? COLLATE NOCASE",
      parentId,
      name,
    );
    const orderRow = await first(
      db,
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE parent_id = ?",
      parentId,
    );
    nextOrder = Number(orderRow ? orderRow.next : 0);
  } else {
    duplicate = await first(
      db,
      "SELECT id FROM categories WHERE parent_id IS NULL AND name = ? COLLATE NOCASE",
      name,
    );
    const orderRow = await first(
      db,
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE parent_id IS NULL",
    );
    nextOrder = Number(orderRow ? orderRow.next : 0);
  }

  if (duplicate) throw new ApiError(409, "同级下已存在同名品类");

  const result = await run(
    db,
    "INSERT INTO categories (parent_id, name, sort_order) VALUES (?, ?, ?)",
    parentId,
    name,
    nextOrder,
  );
  const newId = lastRowId(result);
  return {
    id: newId,
    parent_id: parentId,
    name,
    depth: await categoryDepth(db, newId),
    product_count: 0,
    borrowed_count: 0,
    children: [],
  };
}

export async function renameCategory(db, categoryId, payload) {
  const category = await getCategory(db, categoryId);
  if (!category) throw new ApiError(404, "品类不存在");
  const name = cleanText(payload?.name, "品类名称", 30);
  const duplicate =
    category.parent_id === null || category.parent_id === undefined
      ? await first(
          db,
          "SELECT id FROM categories WHERE parent_id IS NULL AND name = ? COLLATE NOCASE AND id <> ?",
          name,
          categoryId,
        )
      : await first(
          db,
          "SELECT id FROM categories WHERE parent_id = ? AND name = ? COLLATE NOCASE AND id <> ?",
          category.parent_id,
          name,
          categoryId,
        );
  if (duplicate) throw new ApiError(409, "同级下已存在同名品类");

  await run(db, "UPDATE categories SET name = ? WHERE id = ?", name, categoryId);
  await run(db, "UPDATE products SET category = ? WHERE category_id = ?", name, categoryId);
  return {
    id: categoryId,
    parent_id: category.parent_id === undefined ? null : category.parent_id,
    name,
  };
}

export async function deleteCategory(db, categoryId, cascade = false) {
  const category = await getCategory(db, categoryId);
  if (!category) throw new ApiError(404, "品类不存在");
  const descendants = await categoryDescendants(db, categoryId);
  const ids = descendants.map((row) => Number(row.id));
  const hasChildren = descendants.length > 1;
  const placeholders = ids.map(() => "?").join(", ");
  const productsRow = await first(
    db,
    `SELECT COUNT(*) AS c FROM products WHERE category_id IN (${placeholders})`,
    ...ids,
  );
  const products = Number(productsRow ? productsRow.c : 0);
  const activeRow = await first(
    db,
    `SELECT COUNT(*) AS c FROM products
      WHERE category_id IN (${placeholders}) AND status = 'rented'`,
    ...ids,
  );
  const active = Number(activeRow ? activeRow.c : 0);

  if ((hasChildren || products) && !cascade) {
    if (hasChildren) throw new ApiError(409, "请先删除该品类下的子品类");
    throw new ApiError(409, "该品类下还有产品，暂不能删除");
  }
  if (active) throw new ApiError(409, `该品类树中还有 ${active} 件产品在借，请先归还`);

  const statements = [];
  let deletedProducts = 0;
  if (products) {
    deletedProducts = products;
    statements.push(
      db.prepare(`DELETE FROM products WHERE category_id IN (${placeholders})`).bind(...ids),
    );
  }
  for (const nodeId of ids.slice().reverse()) {
    statements.push(db.prepare("DELETE FROM categories WHERE id = ?").bind(nodeId));
  }
  if (statements.length) await db.batch(statements);
  return { ok: true, deleted_products: deletedProducts };
}

export async function deleteProduct(db, productId) {
  const product = await getProduct(db, productId);
  if (!product) throw new ApiError(404, "产品不存在");
  if (product.status === "rented") {
    throw new ApiError(409, `「${product.name}」正在借出，请先归还再删除`);
  }
  await db.batch([
    db.prepare("UPDATE rental_history SET product_id = NULL WHERE product_id = ?").bind(productId),
    db.prepare("DELETE FROM products WHERE id = ?").bind(productId),
  ]);
  return { ok: true, id: productId, name: product.name };
}

export async function createProducts(db, payload) {
  const name = cleanText(payload?.name, "产品名称", 80);
  const categoryId = parseInteger(payload?.category_id, "category_id");
  const category = await getCategory(db, categoryId);
  if (!category) throw new ApiError(404, "品类不存在");
  const children = await categoryChildren(db, categoryId);
  if (children.length) throw new ApiError(400, "请选择最末级小类");
  const quantity = parseInteger(payload?.quantity === undefined ? 1 : payload.quantity, "quantity", 1, 50);
  const modelKey = payload?.model_key;
  const modelBase = await modelBaseUrl(db, modelKey);
  if (modelBase === null) throw new ApiError(400, "请选择有效的展示模型");

  const createdIds = [];
  for (let index = 0; index < quantity; index += 1) {
    const result = await run(
      db,
      `INSERT INTO products
         (category_id, category, name, model_url, status, current_borrower, current_lend_date)
       VALUES (?, ?, ?, ?, 'in_stock', NULL, NULL)`,
      categoryId,
      category.name,
      name,
      modelBase,
    );
    createdIds.push(lastRowId(result));
  }
  const products = [];
  for (const productId of createdIds) {
    products.push(toProduct(await getProduct(db, productId)));
  }
  return products;
}

export function parseScale(value, field) {
  const raw = value === undefined || value === null || value === "" ? 1 : value;
  const number = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(number)) throw new ApiError(400, `${field} 必须为数字`);
  if (number < 0.75 || number > 1.25) throw new ApiError(400, `${field} 需要在 0.75–1.25 之间`);
  return round3(number);
}

function formatNumber(value) {
  return String(value);
}

export function buildModelUrl(baseUrl, scales, finish, seed = 1) {
  const params = new URLSearchParams();
  if (scales.some((value) => Math.abs(value - 1) > 0.0001)) {
    params.set("sx", formatNumber(scales[0]));
    params.set("sy", formatNumber(scales[1]));
    params.set("sz", formatNumber(scales[2]));
  }
  if (finish !== "default") params.set("finish", finish);
  if (baseUrl.endsWith("/generated.glb")) params.set("seed", String(seed));
  const query = params.toString();
  return baseUrl + (query ? `?${query}` : "");
}

export async function updateProductModels(db, productId, payload) {
  const product = await getProduct(db, productId);
  if (!product) throw new ApiError(404, "产品不存在");

  const modelBase = await modelBaseUrl(db, payload?.model_key);
  if (modelBase === null) throw new ApiError(400, "请选择有效的展示模型");
  const finish = payload?.finish === undefined ? "default" : payload.finish;
  if (!FINISH_KEYS.has(finish)) throw new ApiError(400, "请选择有效的材质色调");
  const scope = payload?.scope === undefined ? "current" : payload.scope;
  if (!MODEL_SCOPES.has(scope)) throw new ApiError(400, "应用范围无效");

  const scales = [
    parseScale(payload?.scale_x, "scale_x"),
    parseScale(payload?.scale_y, "scale_y"),
    parseScale(payload?.scale_z, "scale_z"),
  ];
  const seed = parseInteger(payload?.seed === undefined ? 1 : payload.seed, "seed", 1, 2147483647);
  const modelUrl = buildModelUrl(modelBase, scales, finish, seed);

  let targetIds;
  if (scope === "same_name") {
    if (product.category_id === null || product.category_id === undefined) {
      targetIds = [productId];
    } else {
      const rows = await all(
        db,
        "SELECT id FROM products WHERE name = ? AND category_id = ?",
        product.name,
        product.category_id,
      );
      targetIds = rows.map((row) => Number(row.id));
    }
  } else if (scope === "category" && product.category_id !== null && product.category_id !== undefined) {
    const rows = await all(db, "SELECT id FROM products WHERE category_id = ?", product.category_id);
    targetIds = rows.map((row) => Number(row.id));
  } else {
    targetIds = [productId];
  }

  const placeholders = targetIds.map(() => "?").join(", ");
  await run(db, `UPDATE products SET model_url = ? WHERE id IN (${placeholders})`, modelUrl, ...targetIds);

  const products = [];
  for (const targetId of targetIds) {
    products.push(toProduct(await getProduct(db, targetId)));
  }
  return { updated: targetIds.length, model_url: modelUrl, products };
}

function normalizeProductIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new ApiError(400, "请至少选择一件产品");
  if (value.length > 50) throw new ApiError(400, "单次最多借用 50 件产品");
  const ids = value.map((item) => parseInteger(item, "product_id"));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, "产品不能重复选择");
  return ids;
}

function normalizeRentalIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new ApiError(400, "请至少选择一件归还产品");
  if (value.length > 50) throw new ApiError(400, "单次最多归还 50 件产品");
  const ids = value.map((item) => parseInteger(item, "rental_id"));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, "借用记录不能重复选择");
  return ids;
}

export async function createRentalsBatch(db, payload, operator = null) {
  const borrower = cleanBorrower(payload?.borrower);
  const lendDate = parseIsoDate(payload?.lend_date, "lend_date");
  const productIds = normalizeProductIds(payload?.product_ids);

  const products = [];
  for (const productId of productIds) {
    const product = await getProduct(db, productId);
    if (!product) throw new ApiError(404, `产品 #${productId} 不存在`);
    if (product.status !== "in_stock") throw new ApiError(409, `「${product.name}」当前已借出`);
    products.push(product);
  }

  const statements = [
    db.prepare("INSERT OR IGNORE INTO borrowers (name, note, created_at) VALUES (?, '', ?)").bind(borrower, shanghaiDateTime()),
  ];
  for (const product of products) {
    statements.push(
      db
        .prepare(
          `UPDATE products
              SET status = 'rented', current_borrower = ?, current_lend_date = ?
            WHERE id = ? AND status = 'in_stock'`,
        )
        .bind(borrower, lendDate, product.id),
    );
    statements.push(
      db
        .prepare(
          `INSERT INTO rental_history
             (product_id, product_name, category, borrower, lend_date, return_date, status, lend_operator)
           VALUES (?, ?, ?, ?, ?, NULL, 'rented', ?)`,
        )
        .bind(product.id, product.name, product.category, borrower, lendDate, operator),
    );
  }

  const results = await db.batch(statements);
  const rentalIds = [];
  for (let index = 0; index < products.length; index += 1) {
    const updateResult = results[1 + index * 2];
    const insertResult = results[2 + index * 2];
    if (changedRows(updateResult) !== 1) {
      throw new ApiError(409, `「${products[index].name}」当前已借出`);
    }
    rentalIds.push(lastRowId(insertResult));
  }

  const rentals = [];
  for (const rentalId of rentalIds) rentals.push(toRental(await getRental(db, rentalId)));
  const updatedProducts = [];
  for (const productId of productIds) updatedProducts.push(toProduct(await getProduct(db, productId)));
  return { rentals, products: updatedProducts };
}

export async function createRental(db, payload, operator = null) {
  const productId = parseInteger(payload?.product_id, "product_id");
  const result = await createRentalsBatch(db, {
    borrower: payload?.borrower,
    lend_date: payload?.lend_date,
    product_ids: [productId],
  }, operator);
  return { rental: result.rentals[0], product: result.products[0] };
}

export async function returnRentalsBatch(db, payload, operator = null) {
  const returnDate = parseIsoDate(payload?.return_date, "return_date");
  const rentalIds = normalizeRentalIds(payload?.rental_ids);

  const rentals = [];
  const productIds = [];
  for (const rentalId of rentalIds) {
    const rental = await getRental(db, rentalId);
    if (!rental) throw new ApiError(404, `借用记录 #${rentalId} 不存在`);
    if (rental.status !== "rented") throw new ApiError(409, "该借用记录已归还");
    if (rental.product_id === null || rental.product_id === undefined) {
      throw new ApiError(409, "产品已不存在，无法归还");
    }
    if (returnDate < rental.lend_date) throw new ApiError(400, "归还日期不能早于出借日期");
    const product = await getProduct(db, rental.product_id);
    if (!product) throw new ApiError(409, "产品已不存在，无法归还");
    if (product.status !== "rented") throw new ApiError(409, "产品状态与借用记录不一致");
    rentals.push(rental);
    productIds.push(Number(rental.product_id));
  }

  const statements = [];
  for (const rental of rentals) {
    statements.push(
      db
        .prepare(
          `UPDATE products
              SET status = 'in_stock', current_borrower = NULL, current_lend_date = NULL
            WHERE id = ? AND status = 'rented'`,
        )
        .bind(rental.product_id),
    );
    statements.push(
      db
        .prepare(
          `UPDATE rental_history
              SET return_date = ?, status = 'returned', return_operator = ?
            WHERE id = ? AND status = 'rented'`,
        )
        .bind(returnDate, operator, rental.id),
    );
  }
  const results = await db.batch(statements);
  for (let index = 0; index < rentals.length; index += 1) {
    if (changedRows(results[index * 2]) !== 1) throw new ApiError(409, "产品状态与借用记录不一致");
    if (changedRows(results[index * 2 + 1]) !== 1) throw new ApiError(409, "该借用记录已归还");
  }

  const updatedRentals = [];
  for (const rentalId of rentalIds) updatedRentals.push(toRental(await getRental(db, rentalId)));
  const updatedProducts = [];
  for (const productId of productIds) updatedProducts.push(toProduct(await getProduct(db, productId)));
  return { rentals: updatedRentals, products: updatedProducts };
}

export async function returnRental(db, rentalId, payload, operator = null) {
  const result = await returnRentalsBatch(db, {
    return_date: payload?.return_date,
    rental_ids: [rentalId],
  }, operator);
  return { rental: result.rentals[0], product: result.products[0] };
}

export async function createHistory(db, payload) {
  const borrower = cleanBorrower(payload?.borrower);
  const lendDate = parseIsoDate(payload?.lend_date, "lend_date");
  const returnDate = parseIsoDate(payload?.return_date, "return_date");
  if (returnDate < lendDate) throw new ApiError(400, "归还日期不能早于出借日期");

  const productIdRaw = payload?.product_id;
  let productId = null;
  let productName;
  let category;
  if (productIdRaw !== undefined && productIdRaw !== null && productIdRaw !== "") {
    productId = parseInteger(productIdRaw, "product_id");
    const product = await getProduct(db, productId);
    if (!product) throw new ApiError(404, "关联产品不存在");
    productName = product.name;
    category = product.category;
  } else {
    productName = cleanText(payload?.product_name, "产品名称", 80);
    const categoryRaw = payload?.category ?? "";
    category = categoryRaw ? normalizeSpaces(categoryRaw) : "手动补录";
    if ([...category].length > 80) throw new ApiError(400, "品类不能超过 80 个字符");
  }

  const statements = [
    db.prepare("INSERT OR IGNORE INTO borrowers (name, note, created_at) VALUES (?, '', ?)").bind(borrower, shanghaiDateTime()),
    db
      .prepare(
        `INSERT INTO rental_history
           (product_id, product_name, category, borrower, lend_date, return_date, status)
         VALUES (?, ?, ?, ?, ?, ?, 'returned')`,
      )
      .bind(productId, productName, category, borrower, lendDate, returnDate),
  ];
  const results = await db.batch(statements);
  const rentalId = lastRowId(results[1]);
  return toRental(await getRental(db, rentalId));
}

export async function deleteHistory(db, rentalId) {
  const rental = await getRental(db, rentalId);
  if (!rental) throw new ApiError(404, "借用记录不存在");
  if (rental.status === "rented") throw new ApiError(409, "进行中的借用不能删除，请先归还");
  await run(db, "DELETE FROM rental_history WHERE id = ?", rentalId);
  return { ok: true };
}

export async function hideBuiltinModel(db, key) {
  if (typeof key !== "string" || !MODEL_KEYS.has(key)) throw new ApiError(404, "内置模型不存在");
  const usage = await modelUsageCount(db, key);
  if (usage) throw new ApiError(409, `还有 ${usage} 件产品在使用该模型，请先更换`);
  await run(db, "INSERT OR IGNORE INTO hidden_models (model_key) VALUES (?)", key);
  return { ok: true, key, hidden: true };
}

export async function restoreBuiltinModel(db, key) {
  if (typeof key !== "string" || !MODEL_KEYS.has(key)) throw new ApiError(404, "内置模型不存在");
  await run(db, "DELETE FROM hidden_models WHERE model_key = ?", key);
  return { ok: true, key, hidden: false };
}

export async function importCustomModel(_db, _payload) {
  throw new ApiError(501, "线上版本暂不支持导入 GLB 模型，请在本地运行 server.py 后导入。");
}

export async function deleteCustomModel(db, modelId) {
  const row = await first(db, "SELECT * FROM custom_models WHERE id = ?", modelId);
  if (!row) throw new ApiError(404, "外部模型不存在");
  const usage = await modelUsageCount(db, row.model_key);
  if (usage) throw new ApiError(409, `还有 ${usage} 件产品在使用该模型，请先更换`);
  await run(db, "DELETE FROM custom_models WHERE id = ?", modelId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 账号（仅线上版本使用）
// ---------------------------------------------------------------------------

const USERNAME_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
const USER_ROLES = new Set(["admin", "member"]);

function cleanUsername(value) {
  if (typeof value !== "string") throw new ApiError(400, "请填写用户名");
  const username = value.trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw new ApiError(400, "用户名需为 3–32 位字母、数字、下划线、点或短横线");
  }
  return username;
}

function cleanPassword(value) {
  if (typeof value !== "string") throw new ApiError(400, "请填写密码");
  if (value.length < 8) throw new ApiError(400, "密码至少 8 位");
  if (value.length > 128) throw new ApiError(400, "密码不能超过 128 位");
  return value;
}

function cleanRole(value) {
  const role = value === undefined || value === null || value === "" ? "member" : String(value);
  if (!USER_ROLES.has(role)) throw new ApiError(400, "角色无效");
  return role;
}

function serializeUser(row) {
  return {
    id: Number(row.id),
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    active: Number(row.active) === 1,
    created_at: row.created_at,
    last_login_at: row.last_login_at ?? null,
  };
}

export async function findUserByUsername(db, username) {
  if (typeof username !== "string" || !username.trim()) return null;
  return first(db, "SELECT * FROM users WHERE username = ? COLLATE NOCASE", username.trim());
}

export async function touchLastLogin(db, userId) {
  await run(db, "UPDATE users SET last_login_at = ? WHERE id = ?", shanghaiDateTime(), userId);
}

export async function listUsers(db) {
  const rows = await all(db, "SELECT * FROM users ORDER BY id ASC");
  return rows.map(serializeUser);
}

async function activeAdminCount(db, excludeId = null) {
  const row =
    excludeId === null
      ? await first(db, "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1")
      : await first(
          db,
          "SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND active = 1 AND id <> ?",
          excludeId,
        );
  return Number(row ? row.c : 0);
}

export async function createUser(db, payload, secret, iterations) {
  const username = cleanUsername(payload?.username);
  const displayName = cleanText(payload?.display_name, "姓名", 20);
  const password = cleanPassword(payload?.password);
  const role = cleanRole(payload?.role);
  const duplicate = await first(
    db,
    "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
    username,
  );
  if (duplicate) throw new ApiError(409, "该用户名已存在");
  const passwordHash = await hashPassword(password, secret, iterations);
  const result = await run(
    db,
    `INSERT INTO users (username, display_name, password_hash, role, active, pwd_ver, created_at)
     VALUES (?, ?, ?, ?, 1, 0, ?)`,
    username,
    displayName,
    passwordHash,
    role,
    shanghaiDateTime(),
  );
  const created = await first(db, "SELECT * FROM users WHERE id = ?", lastRowId(result));
  return serializeUser(created);
}

export async function updateUser(db, userId, payload, currentUser, secret, iterations) {
  const target = await first(db, "SELECT * FROM users WHERE id = ?", userId);
  if (!target) throw new ApiError(404, "账号不存在");
  const isSelf = Number(target.id) === Number(currentUser?.id);
  const updates = [];
  const params = [];

  if (payload?.display_name !== undefined) {
    updates.push("display_name = ?");
    params.push(cleanText(payload.display_name, "姓名", 20));
  }

  let nextRole = target.role;
  if (payload?.role !== undefined) {
    nextRole = cleanRole(payload.role);
    if (isSelf && nextRole !== target.role) {
      throw new ApiError(400, "不能修改自己的角色");
    }
    updates.push("role = ?");
    params.push(nextRole);
  }

  let nextActive = Number(target.active) === 1;
  if (payload?.active !== undefined) {
    nextActive = Boolean(payload.active);
    if (isSelf && !nextActive) throw new ApiError(400, "不能停用自己的账号");
    updates.push("active = ?");
    params.push(nextActive ? 1 : 0);
  }

  const removesAdmin =
    target.role === "admin" &&
    Number(target.active) === 1 &&
    (nextRole !== "admin" || !nextActive);
  if (removesAdmin && (await activeAdminCount(db, target.id)) === 0) {
    throw new ApiError(409, "系统至少需要保留一个启用的管理员");
  }

  if (payload?.password !== undefined && payload?.password !== "") {
    const password = cleanPassword(payload.password);
    const passwordHash = await hashPassword(password, secret, iterations);
    updates.push("password_hash = ?");
    params.push(passwordHash);
    updates.push("pwd_ver = pwd_ver + 1");
  }

  if (!updates.length) throw new ApiError(400, "没有需要修改的内容");
  params.push(userId);
  await run(db, `UPDATE users SET ${updates.join(", ")} WHERE id = ?`, ...params);
  const updated = await first(db, "SELECT * FROM users WHERE id = ?", userId);
  return serializeUser(updated);
}

export async function deleteUser(db, userId, currentUser) {
  const target = await first(db, "SELECT * FROM users WHERE id = ?", userId);
  if (!target) throw new ApiError(404, "账号不存在");
  if (Number(target.id) === Number(currentUser?.id)) {
    throw new ApiError(400, "不能删除自己的账号");
  }
  if (target.role === "admin" && Number(target.active) === 1) {
    if ((await activeAdminCount(db, target.id)) === 0) {
      throw new ApiError(409, "系统至少需要保留一个启用的管理员");
    }
  }
  await run(db, "DELETE FROM users WHERE id = ?", userId);
  return { ok: true };
}

export async function changeOwnPassword(db, currentUser, payload, secret, iterations) {
  const user = await first(db, "SELECT * FROM users WHERE id = ?", currentUser?.id);
  if (!user) throw new ApiError(404, "账号不存在");
  const ok = await verifyPassword(payload?.old_password ?? "", user.password_hash, secret);
  if (!ok) throw new ApiError(400, "原密码不正确");
  const password = cleanPassword(payload?.new_password);
  if (password === payload?.old_password) throw new ApiError(400, "新密码不能与原密码相同");
  const passwordHash = await hashPassword(password, secret, iterations);
  await run(
    db,
    "UPDATE users SET password_hash = ?, pwd_ver = pwd_ver + 1 WHERE id = ?",
    passwordHash,
    user.id,
  );
  return { ok: true };
}
