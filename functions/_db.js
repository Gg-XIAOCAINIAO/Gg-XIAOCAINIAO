// D1 初始化：建表 + 一次性写入演示数据 + 结构迁移 + 首个管理员账号（幂等）。
import { SCHEMA_SQL, SEED_SQL } from "./_seed.js";
import { hashPassword, passwordIterations } from "./_auth.js";

let initPromises = new WeakMap();

/** 每个 D1 绑定只初始化一次；失败时允许下次重试（本地测试可用多个数据库实例）。 */
export function ensureDb(env) {
  if (!env || !env.DB) {
    throw new Error("D1 binding DB is missing");
  }
  const existing = initPromises.get(env.DB);
  if (existing) return existing;
  const promise = initDatabase(env).catch((error) => {
    initPromises.delete(env.DB);
    throw error;
  });
  initPromises.set(env.DB, promise);
  return promise;
}

async function initDatabase(env) {
  if (!env || !env.DB) {
    throw new Error("D1 binding DB is missing");
  }
  await execScript(env.DB, SCHEMA_SQL);
  await migrateColumns(env.DB);
  const row = await env.DB.prepare("SELECT COUNT(*) AS c FROM categories").first();
  const count = row ? Number(row.c) : 0;
  if (count === 0) {
    await execScript(env.DB, SEED_SQL);
  }
  await bootstrapAdmin(env);
}

/** 老库补列：rental_history 的经手人字段（新库已在 SCHEMA_SQL 中创建）。 */
async function migrateColumns(db) {
  const columns = await tableColumns(db, "rental_history");
  if (!columns.has("lend_operator")) {
    await db.exec("ALTER TABLE rental_history ADD COLUMN lend_operator TEXT");
  }
  if (!columns.has("return_operator")) {
    await db.exec("ALTER TABLE rental_history ADD COLUMN return_operator TEXT");
  }
}

async function tableColumns(db, table) {
  try {
    const result = await db.prepare(`PRAGMA table_info(${table})`).all();
    const rows = result && result.results ? result.results : [];
    return new Set(rows.map((row) => row.name));
  } catch {
    return new Set();
  }
}

/** 首次部署时用环境变量里的初始管理员密码创建 admin 账号。 */
async function bootstrapAdmin(env) {
  const secret = env.APP_SECRET;
  if (!secret) return;
  const countRow = await env.DB.prepare("SELECT COUNT(*) AS c FROM users").first();
  if (countRow && Number(countRow.c) > 0) return;
  const password = env.ADMIN_PASSWORD;
  if (!password) return;
  const username = String(env.ADMIN_USERNAME || "admin").trim() || "admin";
  const displayName = String(env.ADMIN_DISPLAY_NAME || "管理员").trim() || "管理员";
  const passwordHash = await hashPassword(password, secret, passwordIterations(env));
  await env.DB
    .prepare(
      `INSERT OR IGNORE INTO users
         (username, display_name, password_hash, role, active, pwd_ver, created_at)
       VALUES (?, ?, ?, 'admin', 1, 0, ?)`,
    )
    .bind(username, displayName, passwordHash, shanghaiDateTime())
    .run();
}

/** 把多语句 SQL 拆成单条并分批执行（D1 的 batch 是原子的，避免超长语句列表）。 */
export async function execScript(db, sql) {
  const statements = splitStatements(sql);
  const chunkSize = 40;
  for (let index = 0; index < statements.length; index += chunkSize) {
    const chunk = statements.slice(index, index + chunkSize);
    await db.batch(chunk.map((statement) => db.prepare(statement)));
  }
}

export function splitStatements(sql) {
  return sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
    .map((statement) => (statement.endsWith(";") ? statement : `${statement};`));
}

/** 上海时区的“今天”，与本地 Python 服务的 date.today() 行为一致。 */
export function shanghaiDate(now = new Date()) {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function shanghaiDateTime(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}
