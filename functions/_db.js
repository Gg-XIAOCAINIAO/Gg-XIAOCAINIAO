// D1 初始化：建表 + 一次性写入演示数据（幂等，可安全重复执行）。
import { SCHEMA_SQL, SEED_SQL } from "./_seed.js";

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
  const row = await env.DB.prepare("SELECT COUNT(*) AS c FROM categories").first();
  const count = row ? Number(row.c) : 0;
  if (count === 0) {
    await execScript(env.DB, SEED_SQL);
  }
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
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 19).replace("T", " ");
}
