// 用 Node 24 内置的 node:sqlite 模拟 Cloudflare D1 接口，供本地测试使用。
// 只实现本项目用到的子集：prepare / bind / all / first / run / batch / exec。
import { DatabaseSync } from "node:sqlite";

class D1Statement {
  constructor(database, sql, params = []) {
    this.database = database;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    const normalized = params.map((value) => (value === undefined ? null : value));
    return new D1Statement(this.database, this.sql, normalized);
  }

  async all() {
    const statement = this.database.prepare(this.sql);
    const results = statement.all(...this.params);
    return { success: true, results, meta: {} };
  }

  async first() {
    const statement = this.database.prepare(this.sql);
    const row = statement.get(...this.params);
    return row ?? null;
  }

  async run() {
    const statement = this.database.prepare(this.sql);
    const info = statement.run(...this.params);
    return {
      success: true,
      meta: {
        changes: Number(info.changes ?? 0),
        last_row_id:
          info.lastInsertRowid === undefined || info.lastInsertRowid === null
            ? null
            : Number(info.lastInsertRowid),
      },
    };
  }
}

export class D1Database {
  constructor(path) {
    this.db = new DatabaseSync(path);
  }

  prepare(sql) {
    return new D1Statement(this.db, sql);
  }

  async exec(sql) {
    this.db.exec(sql);
    return { success: true, meta: {} };
  }

  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) {
        results.push(await statement.run());
      }
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  close() {
    this.db.close();
  }
}

export function createD1(path) {
  return new D1Database(path);
}
