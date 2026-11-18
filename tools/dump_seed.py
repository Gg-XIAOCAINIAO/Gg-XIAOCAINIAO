#!/usr/bin/env python3
"""把现有 server.py 的种子数据导出成 Cloudflare D1 可用的 SQL。

用法（在项目根目录）：
    python tools/dump_seed.py

会生成 functions/_seed.js，内容包含建表 SQL 与全部演示数据。
修改 server.py 的种子数据后重新运行本脚本即可。
"""

from __future__ import annotations

import json
import shutil
import sqlite3
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

import server  # noqa: E402


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (int, float)):
        return repr(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def insert_sql(table: str, columns: list[str], rows: list[tuple]) -> list[str]:
    statements: list[str] = []
    for row in rows:
        values = ", ".join(sql_literal(value) for value in row)
        statements.append(
            f"INSERT OR IGNORE INTO {table} ({', '.join(columns)}) VALUES ({values});"
        )
    return statements


def js_template(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace("`", "\\`").replace("${", "\\${")
    return f"`{escaped}`"


def main() -> None:
    tmp_dir = BASE_DIR / ".tmp-seed"
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir, ignore_errors=True)
    tmp_dir.mkdir(parents=True, exist_ok=True)
    db_path = tmp_dir / "seed.db"
    server.DB_PATH = db_path
    try:
        server.init_db(seed=True)

        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        try:
            categories = conn.execute(
                "SELECT id, parent_id, name, sort_order FROM categories ORDER BY id"
            ).fetchall()
            products = conn.execute(
                """
                SELECT id, category_id, category, name, model_url, status,
                       current_borrower, current_lend_date
                  FROM products ORDER BY id
                """
            ).fetchall()
            borrowers = conn.execute(
                "SELECT id, name, note, created_at FROM borrowers ORDER BY id"
            ).fetchall()
            history = conn.execute(
                """
                SELECT id, product_id, product_name, category, borrower,
                       lend_date, return_date, status
                  FROM rental_history ORDER BY id
                """
            ).fetchall()
        finally:
            conn.close()
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    schema = (BASE_DIR / "db" / "schema.sql").read_text(encoding="utf-8")
    schema_lines = []
    for line in schema.splitlines():
        stripped = line.strip()
        if stripped.startswith("PRAGMA"):
            continue
        schema_lines.append(line)
    schema_sql = "\n".join(schema_lines).strip() + "\n"

    statements: list[str] = []
    statements += insert_sql(
        "categories",
        ["id", "parent_id", "name", "sort_order"],
        [tuple(row) for row in categories],
    )
    statements += insert_sql(
        "products",
        [
            "id",
            "category_id",
            "category",
            "name",
            "model_url",
            "status",
            "current_borrower",
            "current_lend_date",
        ],
        [tuple(row) for row in products],
    )
    statements += insert_sql(
        "borrowers",
        ["id", "name", "note", "created_at"],
        [tuple(row) for row in borrowers],
    )
    statements += insert_sql(
        "rental_history",
        [
            "id",
            "product_id",
            "product_name",
            "category",
            "borrower",
            "lend_date",
            "return_date",
            "status",
        ],
        [tuple(row) for row in history],
    )
    seed_sql = "\n".join(statements) + "\n"

    out = BASE_DIR / "functions" / "_seed.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = (
        "// 由 tools/dump_seed.py 自动生成，请勿手工修改；数据源见 server.py 的种子逻辑。\n"
        f"// categories={len(categories)} products={len(products)} "
        f"borrowers={len(borrowers)} history={len(history)}\n\n"
        f"export const SCHEMA_SQL = {js_template(schema_sql)};\n\n"
        f"export const SEED_SQL = {js_template(seed_sql)};\n"
    )
    out.write_text(payload, encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(out),
                "categories": len(categories),
                "products": len(products),
                "borrowers": len(borrowers),
                "history": len(history),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
