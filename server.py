#!/usr/bin/env python3
"""回声科技 · 产品借用 - 零依赖 API 与静态文件服务。

运行：
    python server.py --port 8000
"""

from __future__ import annotations

import argparse
import base64
import binascii
import json
import mimetypes
import os
import re
import sqlite3
import sys
import urllib.parse
import uuid
from contextlib import closing
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock

BASE_DIR = Path(__file__).resolve().parent
PUBLIC_DIR = BASE_DIR / "public"
UPLOAD_DIR = PUBLIC_DIR / "assets" / "models" / "uploads"
SCHEMA_PATH = BASE_DIR / "db" / "schema.sql"
DEFAULT_DB_PATH = BASE_DIR / "data" / "rentals.db"
DB_PATH = DEFAULT_DB_PATH
SEED_LOCK = Lock()
DEFAULT_NOTE_PLACEHOLDER = "给器物留个便签吧——可以备注一下用来干啥（办公或自用），最好拍张产品照片上传哦～"
MAX_MODEL_BYTES = 15 * 1024 * 1024
MAX_PAYLOAD_BYTES = 22 * 1024 * 1024
mimetypes.add_type("model/gltf-binary", ".glb")

MODEL_KEYS = {
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
}

FINISH_KEYS = {"default", "oak", "sage", "clay", "graphite"}
MODEL_SCOPES = {"current", "same_name", "category"}

CATEGORY_SPECS = [
    ("音频设备", [
        ("耳机", [
            "半入耳式耳机",
            "蓝牙耳机",
            "耳夹式耳机",
            "挂耳式耳机",
            "骨传导耳机",
            "头戴降噪耳机",
            "头戴游戏耳机",
            "有线耳机",
            "其他耳机",
        ]),
        ("音响", []),
        ("唱机", []),
    ]),
    ("电脑外设", [
        ("键盘", [
            "60 配列", "61 配列", "63 配列", "65 配列", "68 配列",
            "75 配列", "80 配列", "84 配列", "87 配列", "98 配列",
            "108 配列", "磁轴 / HE 键盘", "其他配列",
        ]),
        ("鼠标", ["电竞鼠标", "小手 / Mini 款", "旗舰电竞款"]),
        ("鼠标垫", []),
        ("显示器", ["27 寸 2K", "24/25 寸高刷", "34 寸带鱼屏", "32 寸 4K"]),
        ("显示器支架", []),
        ("游戏手柄", []),
        ("移动硬盘", []),
    ]),
    ("影像设备", [
        ("投影仪", []),
        ("电视", []),
        ("相机", []),
    ]),
    ("数码配件", [
        ("充电宝", ["大容量充电宝", "磁吸充电宝"]),
        ("充电头", []),
        ("手机散热器", []),
        ("手机", []),
        ("平板", []),
    ]),
    ("清洁电器", [
        ("扫地机器人", []),
        ("洗地机 / 吸尘器", []),
    ]),
    ("健康个护", [
        ("电动牙刷", []),
        ("刮胡刀", []),
        ("血压计", []),
        ("助听器", []),
        ("按摩仪", []),
        ("按摩椅", []),
    ]),
    ("家居生活", [
        ("人体工学椅", ["人体工学椅", "电竞椅"]),
        ("升降桌", []),
        ("冰箱", []),
        ("空调", []),
        ("行李箱", []),
        ("服饰", []),
        ("水杯", []),
        ("休闲座椅", ["休闲椅", "餐椅", "坐凳"]),
        ("桌几", ["茶几", "边几"]),
        ("灯具", ["台灯", "落地灯"]),
    ]),
    ("运动健身", [
        ("跑步机", []),
    ]),
    ("网络服务", [
        ("路由器", []),
        ("宽带", []),
    ]),
]

# ---------------------------------------------------------------------------
# 数据库
# ---------------------------------------------------------------------------


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 8000")
    return conn


def table_exists(conn: sqlite3.Connection, name: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?", (name,)
    ).fetchone() is not None


def init_db(seed: bool = True) -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SEED_LOCK:
        conn = connect()
        try:
            conn.execute("PRAGMA journal_mode = WAL")
            borrowers_existed = table_exists(conn, "borrowers")
            conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
            migrate_schema(conn)
            product_count = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
            if seed and product_count == 0:
                seed_database(conn)
            elif conn.execute("SELECT COUNT(*) FROM categories").fetchone()[0] == 0:
                backfill_legacy_categories(conn)
            if not borrowers_existed:
                sync_borrowers_from_history(conn)
            conn.commit()
        finally:
            conn.close()


def sync_borrowers_from_history(conn: sqlite3.Connection) -> None:
    """首次升级时把历史流水与在借人补进借用人目录，之后完全以目录为准。"""
    conn.execute(
        """
        INSERT OR IGNORE INTO borrowers (name)
        SELECT borrower FROM rental_history WHERE TRIM(borrower) <> ''
        UNION
        SELECT current_borrower FROM products
         WHERE status = 'rented'
           AND current_borrower IS NOT NULL
           AND TRIM(current_borrower) <> ''
        """
    )


def migrate_schema(conn: sqlite3.Connection) -> None:
    """兼容上一版只有 products / rental_history 的数据库。"""
    columns = {row["name"] for row in conn.execute("PRAGMA table_info(products)")}
    if "category_id" not in columns:
        conn.execute(
            "ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)"
        )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id, status)"
    )
    history_columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(rental_history)")
    }
    if "lend_operator" not in history_columns:
        conn.execute("ALTER TABLE rental_history ADD COLUMN lend_operator TEXT")
    if "return_operator" not in history_columns:
        conn.execute("ALTER TABLE rental_history ADD COLUMN return_operator TEXT")


def backfill_legacy_categories(conn: sqlite3.Connection) -> None:
    rows = conn.execute(
        "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) <> ''"
    ).fetchall()
    for index, row in enumerate(rows):
        cur = conn.execute(
            "INSERT INTO categories (parent_id, name, sort_order) VALUES (NULL, ?, ?)",
            (row["category"], index),
        )
        conn.execute(
            "UPDATE products SET category_id = ? WHERE category = ?",
            (int(cur.lastrowid), row["category"]),
        )


def seed_database(conn: sqlite3.Connection) -> None:
    """写入一批可展示的演示数据，日期相对今天生成。"""
    today = date.today()
    category_ids: dict[tuple[str, str], int] = {}

    for root_index, (root_name, categories) in enumerate(CATEGORY_SPECS):
        root = conn.execute(
            "INSERT INTO categories (parent_id, name, sort_order) VALUES (NULL, ?, ?)",
            (root_name, root_index),
        )
        root_id = int(root.lastrowid)
        for category_index, (category_name, subcategories) in enumerate(categories):
            category = conn.execute(
                "INSERT INTO categories (parent_id, name, sort_order) VALUES (?, ?, ?)",
                (root_id, category_name, category_index),
            )
            category_id = int(category.lastrowid)
            category_ids[(root_name, category_name, None)] = category_id
            for sub_index, sub_name in enumerate(subcategories):
                sub = conn.execute(
                    "INSERT INTO categories (parent_id, name, sort_order) VALUES (?, ?, ?)",
                    (category_id, sub_name, sub_index),
                )
                category_ids[(root_name, category_name, sub_name)] = int(sub.lastrowid)

    products = [
        ("云栖休闲椅", "家居生活", "休闲座椅", "休闲椅", "lounge-chair"),
        ("榉木餐椅", "家居生活", "休闲座椅", "餐椅", "dining-chair"),
        ("苔原矮凳", "家居生活", "休闲座椅", "坐凳", "stool"),
        ("暖白台灯", "家居生活", "灯具", "台灯", "table-lamp"),
        ("弧光落地灯", "家居生活", "灯具", "落地灯", "floor-lamp"),
        ("胡桃木音箱", "音频设备", "音响", None, "speaker"),
        ("黑胶唱机", "音频设备", "唱机", None, "turntable"),
        ("复古数码相机", "影像设备", "相机", None, "camera"),
        ("便携投影仪", "影像设备", "投影仪", None, "projector"),
        ("低矮茶几", "家居生活", "桌几", "茶几", "coffee-table"),
        ("砂岩边几", "家居生活", "桌几", "边几", "side-table"),
        ("亚麻双人椅", "家居生活", "休闲座椅", "休闲椅", "loveseat"),
        ("回声 Air 蓝牙耳机", "音频设备", "耳机", "蓝牙耳机", "wireless-earbuds"),
        ("回声 Air 蓝牙耳机", "音频设备", "耳机", "蓝牙耳机", "wireless-earbuds"),
        ("回声 Wire 有线耳机", "音频设备", "耳机", "有线耳机", "wired-earbuds"),
        ("回声 Game 游戏耳机", "音频设备", "耳机", "头戴游戏耳机", "gaming-headphones"),
        ("回声 Quiet 降噪耳机", "音频设备", "耳机", "头戴降噪耳机", "anc-headphones"),
        ("回声 Studio 降噪耳机", "音频设备", "耳机", "头戴降噪耳机", "anc-headphones"),
    ]

    # 其中两位借用人拥有重复型号，用来展示「同一人借多件同款」。
    active = {
        0: ("陈知遥", 7),
        3: ("林予安", 18),
        5: ("周叙", 3),
        6: ("林予安", 12),
        7: ("陈知遥", 21),
        8: ("苏晚", 29),
        10: ("苏晚", 9),
        11: ("陈知遥", 14),
        12: ("陈知遥", 5),
        13: ("陈知遥", 2),
        15: ("苏晚", 4),
        16: ("林予安", 8),
    }

    ids: list[int] = []
    for index, (name, root_name, category_name, sub_name, model_key) in enumerate(products):
        category_id = category_ids[(root_name, category_name, sub_name)]
        leaf_name = sub_name or category_name
        model_url = f"/assets/models/{model_key}.glb"
        if index in active:
            borrower, days_ago = active[index]
            lend_date = (today - timedelta(days=days_ago)).isoformat()
            cur = conn.execute(
                """
                INSERT INTO products
                    (category_id, category, name, model_url, status,
                     current_borrower, current_lend_date)
                VALUES (?, ?, ?, ?, 'rented', ?, ?)
                """,
                (category_id, leaf_name, name, model_url, borrower, lend_date),
            )
        else:
            cur = conn.execute(
                """
                INSERT INTO products
                    (category_id, category, name, model_url, status,
                     current_borrower, current_lend_date)
                VALUES (?, ?, ?, ?, 'in_stock', NULL, NULL)
                """,
                (category_id, leaf_name, name, model_url),
            )
        ids.append(int(cur.lastrowid))

    for index, (borrower, days_ago) in active.items():
        name, _, category_name, sub_name, _ = products[index]
        leaf_name = sub_name or category_name
        conn.execute(
            """
            INSERT INTO rental_history
                (product_id, product_name, category, borrower,
                 lend_date, return_date, status)
            VALUES (?, ?, ?, ?, ?, NULL, 'rented')
            """,
            (
                ids[index],
                name,
                leaf_name,
                borrower,
                (today - timedelta(days=days_ago)).isoformat(),
            ),
        )

    returned = [
        (0, "沈叙白", 104, 87),
        (1, "顾清和", 99, 82),
        (2, "苏晚", 95, 88),
        (3, "陈知遥", 90, 70),
        (4, "林予安", 86, 66),
        (5, "周叙", 83, 64),
        (6, "顾清和", 79, 61),
        (7, "沈叙白", 76, 59),
        (8, "苏晚", 73, 55),
        (9, "陈知遥", 69, 52),
        (10, "林予安", 66, 48),
        (11, "周叙", 63, 45),
        (0, "顾清和", 58, 40),
        (1, "沈叙白", 55, 38),
        (2, "陈知遥", 51, 33),
        (3, "林予安", 48, 31),
        (4, "周叙", 44, 28),
        (5, "苏晚", 41, 25),
        (6, "沈叙白", 37, 21),
        (7, "顾清和", 34, 19),
        (8, "林予安", 30, 15),
        (9, "周叙", 27, 12),
        (10, "陈知遥", 23, 9),
        (11, "苏晚", 19, 6),
        (1, "顾清和", 14, 4),
        (4, "沈叙白", 8, 2),
        (13, "沈叙白", 12, 3),
        (15, "顾清和", 23, 11),
        (16, "周叙", 33, 20),
        (14, "陈知遥", 41, 30),
    ]

    for index, borrower, lend_ago, return_ago in returned:
        name, _, category_name, sub_name, _ = products[index]
        leaf_name = sub_name or category_name
        conn.execute(
            """
            INSERT INTO rental_history
                (product_id, product_name, category, borrower,
                 lend_date, return_date, status)
            VALUES (?, ?, ?, ?, ?, ?, 'returned')
            """,
            (
                ids[index],
                name,
                leaf_name,
                borrower,
                (today - timedelta(days=lend_ago)).isoformat(),
                (today - timedelta(days=return_ago)).isoformat(),
            ),
        )


# ---------------------------------------------------------------------------
# 查询
# ---------------------------------------------------------------------------

PRODUCT_SELECT = """
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
"""


def category_path_from_row(row: sqlite3.Row) -> str:
    category = row["category_name"] or row["category"]
    parts = [category]
    for depth in (1, 2, 3):
        key = "category_parent" if depth == 1 else f"category_parent_{depth}"
        if key in row.keys():
            value = row[key]
            if value:
                parts.insert(0, value)
    return " / ".join(parts)


def to_product(row: sqlite3.Row) -> dict:
    category = row["category_name"] or row["category"]
    parent = row["category_parent"] or ""
    asset_code = f"P{int(row['id']):04d}"
    keys = row.keys()
    note_text = row["note_text"] if "note_text" in keys and row["note_text"] else ""
    note_image_id = row["note_image_id"] if "note_image_id" in keys else None
    note_image_url = f"/api/notes/image/{note_image_id}" if note_image_id else ""
    return {
        "id": row["id"],
        "category_id": row["category_id"],
        "category": category,
        "category_parent": parent,
        "category_path": category_path_from_row(row),
        "asset_code": asset_code,
        "name": row["name"],
        "model_url": row["model_url"],
        "status": row["status"],
        "current_borrower": row["current_borrower"],
        "current_lend_date": row["current_lend_date"],
        "active_rental_id": row["active_rental_id"] if "active_rental_id" in row.keys() else None,
        "note_mode": row["note_mode"] if "note_mode" in keys and row["note_mode"] else "",
        "note_text": note_text,
        "note_image_url": note_image_url,
        "note_updated_at": row["note_updated_at"] if "note_updated_at" in keys else None,
        "has_note": bool(note_text or note_image_id),
    }


def to_rental(row: sqlite3.Row) -> dict:
    keys = row.keys()
    return {
        "id": row["id"],
        "product_id": row["product_id"],
        "product_name": row["product_name"],
        "category": row["category"],
        "borrower": row["borrower"],
        "lend_date": row["lend_date"],
        "return_date": row["return_date"],
        "status": row["status"],
        "lend_operator": row["lend_operator"] if "lend_operator" in keys else None,
        "return_operator": row["return_operator"] if "return_operator" in keys else None,
    }


def get_product(conn: sqlite3.Connection, product_id: int) -> sqlite3.Row | None:
    return conn.execute(f"{PRODUCT_SELECT} WHERE p.id = ?", (product_id,)).fetchone()


def get_rental(conn: sqlite3.Connection, rental_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM rental_history WHERE id = ?", (rental_id,)).fetchone()


def list_products(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        f"""
        {PRODUCT_SELECT}
         ORDER BY COALESCE(pc.sort_order, c.sort_order, 9999),
                  COALESCE(c.sort_order, 9999),
                  p.id ASC
        """
    ).fetchall()
    return [to_product(row) for row in rows]


def get_category(conn: sqlite3.Connection, category_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM categories WHERE id = ?", (category_id,)).fetchone()


def category_children(conn: sqlite3.Connection, category_id: int) -> list[sqlite3.Row]:
    return conn.execute(
        "SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, id",
        (category_id,),
    ).fetchall()


def list_categories(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        """
        SELECT c.*,
               COUNT(p.id) AS direct_count,
               COALESCE(SUM(CASE WHEN p.status = 'rented' THEN 1 ELSE 0 END), 0) AS direct_rented
          FROM categories c
          LEFT JOIN products p ON p.category_id = c.id
         GROUP BY c.id
         ORDER BY c.sort_order, c.id
        """
    ).fetchall()

    nodes: dict[int, dict] = {}
    roots: list[dict] = []
    for row in rows:
        node = {
            "id": row["id"],
            "parent_id": row["parent_id"],
            "name": row["name"],
            "sort_order": row["sort_order"],
            "depth": 1,
            "product_count": row["direct_count"],
            "borrowed_count": row["direct_rented"],
            "children": [],
        }
        nodes[node["id"]] = node

    for node in nodes.values():
        parent = nodes.get(node["parent_id"])
        if parent:
            parent["children"].append(node)
        else:
            roots.append(node)

    def walk(node: dict, depth: int) -> tuple[int, int]:
        node["depth"] = depth
        node["children"].sort(key=lambda item: (item["sort_order"], item["id"]))
        total = node["product_count"]
        rented = node["borrowed_count"]
        for child in node["children"]:
            child_total, child_rented = walk(child, depth + 1)
            total += child_total
            rented += child_rented
        node["product_count"] = total
        node["borrowed_count"] = rented
        return total, rented

    for root in roots:
        walk(root, 1)
    roots.sort(key=lambda item: (item["sort_order"], item["id"]))
    return roots


def category_descendants(conn: sqlite3.Connection, category_id: int) -> list[sqlite3.Row]:
    """按层级返回品类自身与全部后代，最深优先写回时可直接倒序使用。"""
    result: list[sqlite3.Row] = []
    queue = [category_id]
    while queue:
        current = queue.pop(0)
        row = get_category(conn, current)
        if row is None:
            continue
        result.append(row)
        children = conn.execute(
            "SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order, id",
            (current,),
        ).fetchall()
        queue.extend(int(child["id"]) for child in children)
    return result


def category_depth(conn: sqlite3.Connection, category_id: int) -> int:
    depth = 1
    current = get_category(conn, category_id)
    while current and current["parent_id"] is not None:
        depth += 1
        current = get_category(conn, int(current["parent_id"]))
    return depth


def category_leaf_names(conn: sqlite3.Connection, category_id: int) -> list[str]:
    node = get_category(conn, category_id)
    if node is None:
        raise ApiError(404, "品类不存在")
    return [row["name"] for row in category_descendants(conn, category_id)]


def list_borrowers(conn: sqlite3.Connection) -> list[dict]:
    """借用人目录 + 当前在借明细；没有在借器物的人也会保留在名录中。"""
    today = date.today()
    borrower_rows = conn.execute(
        """
        SELECT b.id, b.name, b.note, b.created_at,
               (SELECT COUNT(*) FROM products p
                 WHERE p.status = 'rented'
                   AND p.current_borrower COLLATE NOCASE = b.name) AS total_count,
               (SELECT COUNT(*) FROM rental_history h
                 WHERE h.borrower COLLATE NOCASE = b.name) AS history_count,
               (SELECT MAX(h.lend_date) FROM rental_history h
                 WHERE h.borrower COLLATE NOCASE = b.name) AS last_lend_date
          FROM borrowers b
         ORDER BY total_count DESC, b.name COLLATE NOCASE ASC
        """
    ).fetchall()

    item_rows = conn.execute(
        """
        SELECT p.id, p.current_borrower, p.name, p.current_lend_date,
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
         ORDER BY p.current_lend_date ASC, p.id ASC
        """
    ).fetchall()

    items_by_borrower: dict[str, list[dict]] = {}
    for row in item_rows:
        lend_date = row["current_lend_date"]
        try:
            days = max(0, (today - date.fromisoformat(lend_date)).days)
        except (TypeError, ValueError):
            days = 0
        category = row["category_name"] or row["category"]
        parent = row["category_parent"] or ""
        items_by_borrower.setdefault(row["current_borrower"].casefold(), []).append(
            {
                "product_id": row["id"],
                "asset_code": f"P{int(row['id']):04d}",
                "product_name": row["name"],
                "category": category,
                "category_parent": parent,
                "category_path": category_path_from_row(row),
                "lend_date": lend_date,
                "days_borrowed": days,
            }
        )

    return [
        {
            "id": row["id"],
            "borrower": row["name"],
            "note": row["note"],
            "created_at": row["created_at"],
            "items": items_by_borrower.get(row["name"].casefold(), []),
            "total_count": row["total_count"],
            "history_count": row["history_count"],
            "last_lend_date": row["last_lend_date"],
        }
        for row in borrower_rows
    ]


def escape_like(value: str) -> str:
    return value.replace("!", "!!").replace("%", "!%").replace("_", "!_")


def list_history(
    conn: sqlite3.Connection,
    borrower: str | None = None,
    category: str | None = None,
    category_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    q: str | None = None,
) -> list[dict]:
    clauses: list[str] = []
    params: list[object] = []

    if borrower:
        clauses.append("borrower = ?")
        params.append(borrower)
    if category:
        clauses.append("category = ?")
        params.append(category)
    if category_id is not None:
        names = category_leaf_names(conn, category_id)
        placeholders = ", ".join("?" for _ in names)
        clauses.append(f"category IN ({placeholders})")
        params.extend(names)
    if date_from:
        clauses.append("lend_date >= ?")
        params.append(date_from)
    if date_to:
        clauses.append("lend_date <= ?")
        params.append(date_to)
    if q:
        needle = f"%{escape_like(q)}%"
        clauses.append("(product_name LIKE ? ESCAPE '!' OR borrower LIKE ? ESCAPE '!')")
        params.extend([needle, needle])

    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    rows = conn.execute(
        f"""
        SELECT id, product_id, product_name, category, borrower,
               lend_date, return_date, status, lend_operator, return_operator
          FROM rental_history
          {where}
         ORDER BY lend_date DESC, id DESC
        """,
        params,
    ).fetchall()
    return [to_rental(row) for row in rows]


def create_history(conn: sqlite3.Connection, payload: dict) -> dict:
    """补录一条已完成的借用记录，不改变当前库存状态。"""
    borrower = clean_borrower(payload.get("borrower"))
    lend_date = parse_iso_date(payload.get("lend_date"), "lend_date")
    return_date = parse_iso_date(payload.get("return_date"), "return_date")
    if return_date < lend_date:
        raise ApiError(400, "归还日期不能早于出借日期")

    product_id_raw = payload.get("product_id")
    product_id: int | None = None
    if product_id_raw not in (None, ""):
        product_id = parse_int(product_id_raw, "product_id")
        product = get_product(conn, product_id)
        if product is None:
            raise ApiError(404, "关联产品不存在")
        product_name = product["name"]
        category = product["category"]
    else:
        product_name = clean_text(payload.get("product_name"), "产品名称", 80)
        category_raw = payload.get("category", "")
        category = " ".join(str(category_raw).split()) if category_raw else "手动补录"
        if len(category) > 80:
            raise ApiError(400, "品类不能超过 80 个字符")

    try:
        conn.execute("BEGIN IMMEDIATE")
        ensure_borrower(conn, borrower)
        cur = conn.execute(
            """
            INSERT INTO rental_history
                (product_id, product_name, category, borrower,
                 lend_date, return_date, status)
            VALUES (?, ?, ?, ?, ?, ?, 'returned')
            """,
            (product_id, product_name, category, borrower, lend_date, return_date),
        )
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise
    return to_rental(get_rental(conn, int(cur.lastrowid)))


def delete_history(conn: sqlite3.Connection, rental_id: int) -> dict:
    rental = get_rental(conn, rental_id)
    if rental is None:
        raise ApiError(404, "借用记录不存在")
    if rental["status"] == "rented":
        raise ApiError(409, "进行中的借用不能删除，请先归还")
    conn.execute("DELETE FROM rental_history WHERE id = ?", (rental_id,))
    conn.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# 写入
# ---------------------------------------------------------------------------


class ApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def parse_iso_date(value: object, field: str, required: bool = True) -> str | None:
    if value is None or value == "":
        if required:
            raise ApiError(400, f"缺少{field}")
        return None
    if not isinstance(value, str):
        raise ApiError(400, f"{field}格式应为 YYYY-MM-DD")
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ApiError(400, f"{field}格式应为 YYYY-MM-DD") from exc
    if parsed.isoformat() != value:
        raise ApiError(400, f"{field}格式应为 YYYY-MM-DD")
    return value


def parse_int(value: object, field: str, minimum: int = 1, maximum: int = 2_000_000_000) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ApiError(400, f"{field} 必须为整数") from exc
    if number < minimum or number > maximum:
        raise ApiError(400, f"{field} 超出允许范围")
    return number


def clean_text(value: object, field: str, maximum: int) -> str:
    if not isinstance(value, str):
        raise ApiError(400, f"请填写{field}")
    text = " ".join(value.split())
    if not text:
        raise ApiError(400, f"请填写{field}")
    if len(text) > maximum:
        raise ApiError(400, f"{field}不能超过 {maximum} 个字符")
    return text


def clean_borrower(value: object) -> str:
    return clean_text(value, "借用人", 40)


def ensure_borrower(conn: sqlite3.Connection, name: str) -> None:
    conn.execute("INSERT OR IGNORE INTO borrowers (name) VALUES (?)", (name,))


def get_borrower(conn: sqlite3.Connection, borrower_id: int) -> sqlite3.Row | None:
    return conn.execute("SELECT * FROM borrowers WHERE id = ?", (borrower_id,)).fetchone()


def create_borrower(conn: sqlite3.Connection, payload: dict) -> dict:
    name = clean_borrower(payload.get("name"))
    note_raw = payload.get("note", "")
    note = " ".join(str(note_raw).split()) if note_raw else ""
    if len(note) > 120:
        raise ApiError(400, "备注不能超过 120 个字符")
    duplicate = conn.execute(
        "SELECT id FROM borrowers WHERE name = ? COLLATE NOCASE", (name,)
    ).fetchone()
    if duplicate:
        raise ApiError(409, "该借用人已在名录中")
    cur = conn.execute(
        "INSERT INTO borrowers (name, note) VALUES (?, ?)", (name, note)
    )
    conn.commit()
    return {
        "id": int(cur.lastrowid),
        "borrower": name,
        "note": note,
        "items": [],
        "total_count": 0,
        "history_count": 0,
        "last_lend_date": None,
    }


def get_setting(conn: sqlite3.Connection, key: str, default: str = "") -> str:
    row = conn.execute("SELECT value FROM app_settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row is not None else default


def get_note_placeholder(conn: sqlite3.Connection) -> str:
    return get_setting(conn, "note_placeholder", DEFAULT_NOTE_PLACEHOLDER)


def update_settings(conn: sqlite3.Connection, payload: dict) -> dict:
    if "note_placeholder" not in payload:
        raise ApiError(400, "没有需要保存的设置")
    value = clean_text(payload.get("note_placeholder"), "备注提示语", 160)
    conn.execute(
        """
        INSERT INTO app_settings (key, value, updated_at)
        VALUES ('note_placeholder', ?, datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        """,
        (value,),
    )
    conn.commit()
    return {"note_placeholder": value}


def update_borrower(conn: sqlite3.Connection, borrower_id: int, payload: dict) -> dict:
    borrower = get_borrower(conn, borrower_id)
    if borrower is None:
        raise ApiError(404, "借用人不存在")
    if "note" not in payload:
        raise ApiError(400, "请提供要修改的部门或备注")
    note_raw = payload.get("note")
    note = " ".join(str(note_raw).split()) if note_raw else ""
    if len(note) > 120:
        raise ApiError(400, "备注不能超过 120 个字符")
    conn.execute("UPDATE borrowers SET note = ? WHERE id = ?", (note, borrower_id))
    conn.commit()
    return {"id": borrower_id, "borrower": borrower["name"], "note": note}


def delete_borrower(conn: sqlite3.Connection, borrower_id: int) -> dict:
    borrower = get_borrower(conn, borrower_id)
    if borrower is None:
        raise ApiError(404, "借用人不存在")
    active = conn.execute(
        """
        SELECT COUNT(*) FROM products
         WHERE status = 'rented' AND current_borrower COLLATE NOCASE = ?
        """,
        (borrower["name"],),
    ).fetchone()[0]
    if active:
        raise ApiError(409, f"该借用人还有 {active} 件器物在借，请先归还")
    history_count = conn.execute(
        "SELECT COUNT(*) FROM rental_history WHERE borrower COLLATE NOCASE = ?",
        (borrower["name"],),
    ).fetchone()[0]
    conn.execute("DELETE FROM borrowers WHERE id = ?", (borrower_id,))
    conn.commit()
    return {"ok": True, "history_preserved": history_count}


def create_category(conn: sqlite3.Connection, payload: dict) -> dict:
    name = clean_text(payload.get("name"), "品类名称", 30)
    parent_raw = payload.get("parent_id")
    parent_id: int | None = None
    if parent_raw not in (None, ""):
        parent_id = parse_int(parent_raw, "parent_id")
        parent = get_category(conn, parent_id)
        if parent is None:
            raise ApiError(404, "父级品类不存在")
        parent_depth = category_depth(conn, parent_id)
        if parent_depth >= 4:
            raise ApiError(400, "最多支持四级品类，不能在四级品类下继续添加")
        duplicate = conn.execute(
            "SELECT id FROM categories WHERE parent_id = ? AND name = ? COLLATE NOCASE",
            (parent_id, name),
        ).fetchone()
        order_row = conn.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE parent_id = ?",
            (parent_id,),
        ).fetchone()
    else:
        duplicate = conn.execute(
            "SELECT id FROM categories WHERE parent_id IS NULL AND name = ? COLLATE NOCASE",
            (name,),
        ).fetchone()
        order_row = conn.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM categories WHERE parent_id IS NULL"
        ).fetchone()

    if duplicate:
        raise ApiError(409, "同级下已存在同名品类")

    cur = conn.execute(
        "INSERT INTO categories (parent_id, name, sort_order) VALUES (?, ?, ?)",
        (parent_id, name, order_row["next"]),
    )
    conn.commit()
    return {
        "id": int(cur.lastrowid),
        "parent_id": parent_id,
        "name": name,
        "depth": category_depth(conn, int(cur.lastrowid)),
        "product_count": 0,
        "borrowed_count": 0,
        "children": [],
    }


def rename_category(conn: sqlite3.Connection, category_id: int, payload: dict) -> dict:
    category = get_category(conn, category_id)
    if category is None:
        raise ApiError(404, "品类不存在")
    name = clean_text(payload.get("name"), "品类名称", 30)
    if category["parent_id"] is None:
        duplicate = conn.execute(
            "SELECT id FROM categories WHERE parent_id IS NULL AND name = ? COLLATE NOCASE AND id <> ?",
            (name, category_id),
        ).fetchone()
    else:
        duplicate = conn.execute(
            "SELECT id FROM categories WHERE parent_id = ? AND name = ? COLLATE NOCASE AND id <> ?",
            (category["parent_id"], name, category_id),
        ).fetchone()
    if duplicate:
        raise ApiError(409, "同级下已存在同名品类")

    conn.execute("UPDATE categories SET name = ? WHERE id = ?", (name, category_id))
    conn.execute("UPDATE products SET category = ? WHERE category_id = ?", (name, category_id))
    conn.commit()
    return {"id": category_id, "parent_id": category["parent_id"], "name": name}


def delete_category(conn: sqlite3.Connection, category_id: int, cascade: bool = False) -> dict:
    category = get_category(conn, category_id)
    if category is None:
        raise ApiError(404, "品类不存在")
    descendants = category_descendants(conn, category_id)
    ids = [int(row["id"]) for row in descendants]
    has_children = len(descendants) > 1
    placeholders = ", ".join("?" for _ in ids)
    products = conn.execute(
        f"SELECT COUNT(*) FROM products WHERE category_id IN ({placeholders})", ids
    ).fetchone()[0]
    active = conn.execute(
        f"""
        SELECT COUNT(*) FROM products
         WHERE category_id IN ({placeholders}) AND status = 'rented'
        """,
        ids,
    ).fetchone()[0]

    if (has_children or products) and not cascade:
        if has_children:
            raise ApiError(409, "请先删除该品类下的子品类")
        raise ApiError(409, "该品类下还有产品，暂不能删除")

    if active:
        raise ApiError(409, f"该品类树中还有 {active} 件产品在借，请先归还")

    deleted_products = 0
    try:
        conn.execute("BEGIN IMMEDIATE")
        if products:
            deleted_products = products
            conn.execute(
                f"DELETE FROM products WHERE category_id IN ({placeholders})", ids
            )
        for node_id in reversed(ids):
            conn.execute("DELETE FROM categories WHERE id = ?", (node_id,))
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise
    return {"ok": True, "deleted_products": deleted_products}


def create_products(conn: sqlite3.Connection, payload: dict) -> list[dict]:
    name = clean_text(payload.get("name"), "产品名称", 80)
    category_id = parse_int(payload.get("category_id"), "category_id")
    category = get_category(conn, category_id)
    if category is None:
        raise ApiError(404, "品类不存在")
    if category_children(conn, category_id):
        raise ApiError(400, "请选择最末级小类")
    quantity = parse_int(payload.get("quantity", 1), "quantity", 1, 50)
    model_key = payload.get("model_key")
    model_base = model_base_url(conn, model_key) if isinstance(model_key, str) else None
    if model_base is None:
        raise ApiError(400, "请选择有效的展示模型")

    model_url = model_base
    created_ids: list[int] = []
    try:
        conn.execute("BEGIN IMMEDIATE")
        for _ in range(quantity):
            cur = conn.execute(
                """
                INSERT INTO products
                    (category_id, category, name, model_url, status,
                     current_borrower, current_lend_date)
                VALUES (?, ?, ?, ?, 'in_stock', NULL, NULL)
                """,
                (category_id, category["name"], name, model_url),
            )
            created_ids.append(int(cur.lastrowid))
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise
    return [to_product(get_product(conn, product_id)) for product_id in created_ids]


def rename_product(conn: sqlite3.Connection, product_id: int, payload: dict) -> dict:
    product = get_product(conn, product_id)
    if product is None:
        raise ApiError(404, "产品不存在")
    name = clean_text(payload.get("name"), "产品名称", 80)
    if name == product["name"]:
        return {"id": product_id, "name": name, "previous_name": product["name"], "unchanged": True}
    conn.execute("UPDATE products SET name = ? WHERE id = ?", (name, product_id))
    conn.commit()
    return {"id": product_id, "name": name, "previous_name": product["name"], "unchanged": False}


def delete_product(conn: sqlite3.Connection, product_id: int) -> dict:
    product = get_product(conn, product_id)
    if product is None:
        raise ApiError(404, "产品不存在")
    if product["status"] == "rented":
        raise ApiError(409, f"「{product['name']}」正在借出，请先归还再删除")

    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise
    return {"ok": True, "id": product_id, "name": product["name"]}


def parse_scale(value: object, field: str) -> float:
    try:
        number = float(value if value not in (None, "") else 1)
    except (TypeError, ValueError) as exc:
        raise ApiError(400, f"{field} 必须为数字") from exc
    if not 0.75 <= number <= 1.25:
        raise ApiError(400, f"{field} 需要在 0.75–1.25 之间")
    return round(number, 3)


def model_base_url(conn: sqlite3.Connection, model_key: str) -> str | None:
    if model_key in MODEL_KEYS:
        return f"/assets/models/{model_key}.glb"
    row = conn.execute(
        "SELECT file_name FROM custom_models WHERE model_key = ?", (model_key,)
    ).fetchone()
    if row is None:
        return None
    return f"/assets/models/uploads/{row['file_name']}"


def model_usage_count(conn: sqlite3.Connection, model_key: str) -> int:
    base = model_base_url(conn, model_key)
    if base is None:
        return 0
    return conn.execute(
        "SELECT COUNT(*) FROM products WHERE model_url LIKE ?",
        (f"{base}%",),
    ).fetchone()[0]


def custom_model_payload(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "key": row["model_key"],
        "name": row["name"],
        "url": f"/assets/models/uploads/{row['file_name']}",
        "original_name": row["original_name"],
        "size_bytes": row["size_bytes"],
        "created_at": row["created_at"],
        "usage_count": model_usage_count(conn, row["model_key"]),
    }


def list_models(conn: sqlite3.Connection) -> dict:
    hidden = {
        row["model_key"]
        for row in conn.execute("SELECT model_key FROM hidden_models").fetchall()
    }
    builtin = [
        {
            "key": key,
            "usage_count": model_usage_count(conn, key),
            "hidden": key in hidden,
        }
        for key in sorted(MODEL_KEYS)
    ]
    custom = [
        custom_model_payload(conn, row)
        for row in conn.execute(
            "SELECT * FROM custom_models ORDER BY id DESC"
        ).fetchall()
    ]
    return {
        "builtin": builtin,
        "custom": custom,
        "hidden": sorted(hidden),
    }


def import_custom_model(conn: sqlite3.Connection, payload: dict) -> dict:
    encoded = payload.get("data")
    if not isinstance(encoded, str) or not encoded.strip():
        raise ApiError(400, "请选择要导入的 GLB 文件")
    if encoded.startswith("data:"):
        _, _, encoded = encoded.partition(",")
    try:
        raw = base64.b64decode("".join(encoded.split()), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ApiError(400, "模型文件编码无效") from exc
    if len(raw) > MAX_MODEL_BYTES:
        raise ApiError(413, "模型文件不能超过 15 MB")
    if len(raw) < 12 or raw[:4] != b"glTF":
        raise ApiError(400, "目前仅支持 GLB 格式的外部模型")
    version, declared_length = (
        int.from_bytes(raw[4:8], "little"),
        int.from_bytes(raw[8:12], "little"),
    )
    if version != 2 or declared_length != len(raw):
        raise ApiError(400, "GLB 文件头无效或文件不完整")

    original_name = " ".join(str(payload.get("filename") or "model.glb").split())
    if len(original_name) > 160:
        original_name = original_name[-160:]
    fallback_name = Path(original_name).stem or "外部模型"
    name = clean_text(payload.get("name") or fallback_name, "模型名称", 60)
    model_key = f"custom-{uuid.uuid4().hex[:12]}"
    file_name = f"{model_key}.glb"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    target = UPLOAD_DIR / file_name
    temp = target.with_suffix(".tmp")
    temp.write_bytes(raw)
    temp.replace(target)
    try:
        cur = conn.execute(
            """
            INSERT INTO custom_models
                (model_key, name, file_name, original_name, size_bytes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (model_key, name, file_name, original_name, len(raw)),
        )
        conn.commit()
    except sqlite3.Error:
        target.unlink(missing_ok=True)
        raise
    row = conn.execute(
        "SELECT * FROM custom_models WHERE id = ?", (int(cur.lastrowid),)
    ).fetchone()
    return custom_model_payload(conn, row)


def delete_custom_model(conn: sqlite3.Connection, model_id: int) -> dict:
    row = conn.execute("SELECT * FROM custom_models WHERE id = ?", (model_id,)).fetchone()
    if row is None:
        raise ApiError(404, "外部模型不存在")
    usage = model_usage_count(conn, row["model_key"])
    if usage:
        raise ApiError(409, f"还有 {usage} 件产品在使用该模型，请先更换")
    conn.execute("DELETE FROM custom_models WHERE id = ?", (model_id,))
    conn.commit()
    target = (UPLOAD_DIR / row["file_name"]).resolve()
    try:
        target.relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        return {"ok": True}
    target.unlink(missing_ok=True)
    return {"ok": True}


def hide_builtin_model(conn: sqlite3.Connection, key: object) -> dict:
    if not isinstance(key, str) or key not in MODEL_KEYS:
        raise ApiError(404, "内置模型不存在")
    usage = model_usage_count(conn, key)
    if usage:
        raise ApiError(409, f"还有 {usage} 件产品在使用该模型，请先更换")
    conn.execute("INSERT OR IGNORE INTO hidden_models (model_key) VALUES (?)", (key,))
    conn.commit()
    return {"ok": True, "key": key, "hidden": True}


def restore_builtin_model(conn: sqlite3.Connection, key: object) -> dict:
    if not isinstance(key, str) or key not in MODEL_KEYS:
        raise ApiError(404, "内置模型不存在")
    conn.execute("DELETE FROM hidden_models WHERE model_key = ?", (key,))
    conn.commit()
    return {"ok": True, "key": key, "hidden": False}


def build_model_url(
    base_url: str,
    scales: tuple[float, float, float],
    finish: str,
    seed: int = 1,
) -> str:
    params: dict[str, str] = {}
    if any(abs(value - 1) > 0.0001 for value in scales):
        params["sx"] = f"{scales[0]:g}"
        params["sy"] = f"{scales[1]:g}"
        params["sz"] = f"{scales[2]:g}"
    if finish != "default":
        params["finish"] = finish
    if base_url.endswith("/generated.glb"):
        params["seed"] = str(seed)
    query = urllib.parse.urlencode(params)
    return base_url + (f"?{query}" if query else "")


def update_product_models(conn: sqlite3.Connection, product_id: int, payload: dict) -> dict:
    product = get_product(conn, product_id)
    if product is None:
        raise ApiError(404, "产品不存在")

    model_key = payload.get("model_key")
    model_base = model_base_url(conn, model_key) if isinstance(model_key, str) else None
    if model_base is None:
        raise ApiError(400, "请选择有效的展示模型")
    finish = payload.get("finish", "default")
    if finish not in FINISH_KEYS:
        raise ApiError(400, "请选择有效的材质色调")
    scope = payload.get("scope", "current")
    if scope not in MODEL_SCOPES:
        raise ApiError(400, "应用范围无效")

    scales = (
        parse_scale(payload.get("scale_x"), "scale_x"),
        parse_scale(payload.get("scale_y"), "scale_y"),
        parse_scale(payload.get("scale_z"), "scale_z"),
    )
    seed = parse_int(payload.get("seed", 1), "seed", 1, 2_147_483_647)
    model_url = build_model_url(model_base, scales, finish, seed)

    if scope == "same_name":
        if product["category_id"] is None:
            target_ids = [product_id]
        else:
            target_ids = [
                int(row["id"])
                for row in conn.execute(
                    "SELECT id FROM products WHERE name = ? AND category_id = ?",
                    (product["name"], product["category_id"]),
                ).fetchall()
            ]
    elif scope == "category" and product["category_id"] is not None:
        target_ids = [
            int(row["id"])
            for row in conn.execute(
                "SELECT id FROM products WHERE category_id = ?",
                (product["category_id"],),
            ).fetchall()
        ]
    else:
        target_ids = [product_id]

    try:
        conn.execute("BEGIN IMMEDIATE")
        placeholders = ", ".join("?" for _ in target_ids)
        conn.execute(
            f"UPDATE products SET model_url = ? WHERE id IN ({placeholders})",
            [model_url, *target_ids],
        )
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise

    return {
        "updated": len(target_ids),
        "model_url": model_url,
        "products": [
            to_product(get_product(conn, target_id)) for target_id in target_ids
        ],
    }


def normalize_product_ids(value: object) -> list[int]:
    if not isinstance(value, list) or not value:
        raise ApiError(400, "请至少选择一件产品")
    if len(value) > 50:
        raise ApiError(400, "单次最多借用 50 件产品")
    ids = [parse_int(item, "product_id") for item in value]
    if len(set(ids)) != len(ids):
        raise ApiError(400, "产品不能重复选择")
    return ids


def normalize_rental_ids(value: object) -> list[int]:
    if not isinstance(value, list) or not value:
        raise ApiError(400, "请至少选择一件归还产品")
    if len(value) > 50:
        raise ApiError(400, "单次最多归还 50 件产品")
    ids = [parse_int(item, "rental_id") for item in value]
    if len(set(ids)) != len(ids):
        raise ApiError(400, "借用记录不能重复选择")
    return ids


def create_rentals_batch(conn: sqlite3.Connection, payload: dict) -> dict:
    borrower = clean_borrower(payload.get("borrower"))
    lend_date = parse_iso_date(payload.get("lend_date"), "lend_date")
    product_ids = normalize_product_ids(payload.get("product_ids"))

    rental_ids: list[int] = []
    try:
        conn.execute("BEGIN IMMEDIATE")
        products: list[sqlite3.Row] = []
        for product_id in product_ids:
            product = get_product(conn, product_id)
            if product is None:
                raise ApiError(404, f"产品 #{product_id} 不存在")
            if product["status"] != "in_stock":
                raise ApiError(409, f"「{product['name']}」当前已借出")
            products.append(product)

        ensure_borrower(conn, borrower)
        for product in products:
            updated = conn.execute(
                """
                UPDATE products
                   SET status = 'rented',
                       current_borrower = ?,
                       current_lend_date = ?
                 WHERE id = ? AND status = 'in_stock'
                """,
                (borrower, lend_date, product["id"]),
            )
            if updated.rowcount != 1:
                raise ApiError(409, f"「{product['name']}」当前已借出")
            inserted = conn.execute(
                """
                INSERT INTO rental_history
                    (product_id, product_name, category, borrower,
                     lend_date, return_date, status)
                VALUES (?, ?, ?, ?, ?, NULL, 'rented')
                """,
                (
                    product["id"],
                    product["name"],
                    product["category"],
                    borrower,
                    lend_date,
                ),
            )
            rental_ids.append(int(inserted.lastrowid))
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise

    return {
        "rentals": [to_rental(get_rental(conn, rental_id)) for rental_id in rental_ids],
        "products": [to_product(get_product(conn, product_id)) for product_id in product_ids],
    }


def create_rental(conn: sqlite3.Connection, payload: dict) -> dict:
    product_id = parse_int(payload.get("product_id"), "product_id")
    result = create_rentals_batch(
        conn,
        {
            "borrower": payload.get("borrower"),
            "lend_date": payload.get("lend_date"),
            "product_ids": [product_id],
        },
    )
    return {"rental": result["rentals"][0], "product": result["products"][0]}


def return_rentals_batch(conn: sqlite3.Connection, payload: dict) -> dict:
    return_date = parse_iso_date(payload.get("return_date"), "return_date")
    rental_ids = normalize_rental_ids(payload.get("rental_ids"))

    product_ids: list[int] = []
    try:
        conn.execute("BEGIN IMMEDIATE")
        rentals: list[sqlite3.Row] = []
        for rental_id in rental_ids:
            rental = get_rental(conn, rental_id)
            if rental is None:
                raise ApiError(404, f"借用记录 #{rental_id} 不存在")
            if rental["status"] != "rented":
                raise ApiError(409, "该借用记录已归还")
            if rental["product_id"] is None:
                raise ApiError(409, "产品已不存在，无法归还")
            if return_date < rental["lend_date"]:
                raise ApiError(400, "归还日期不能早于出借日期")
            product = get_product(conn, rental["product_id"])
            if product is None:
                raise ApiError(409, "产品已不存在，无法归还")
            if product["status"] != "rented":
                raise ApiError(409, "产品状态与借用记录不一致")
            rentals.append(rental)
            product_ids.append(int(rental["product_id"]))

        for rental in rentals:
            updated = conn.execute(
                """
                UPDATE products
                   SET status = 'in_stock',
                       current_borrower = NULL,
                       current_lend_date = NULL
                 WHERE id = ? AND status = 'rented'
                """,
                (rental["product_id"],),
            )
            if updated.rowcount != 1:
                raise ApiError(409, "产品状态与借用记录不一致")
            closed = conn.execute(
                """
                UPDATE rental_history
                   SET return_date = ?, status = 'returned'
                 WHERE id = ? AND status = 'rented'
                """,
                (return_date, rental["id"]),
            )
            if closed.rowcount != 1:
                raise ApiError(409, "该借用记录已归还")
        conn.commit()
    except ApiError:
        conn.rollback()
        raise
    except sqlite3.Error:
        conn.rollback()
        raise

    return {
        "rentals": [to_rental(get_rental(conn, rental_id)) for rental_id in rental_ids],
        "products": [to_product(get_product(conn, product_id)) for product_id in product_ids],
    }


def return_rental(conn: sqlite3.Connection, rental_id: int, payload: dict) -> dict:
    result = return_rentals_batch(
        conn,
        {"return_date": payload.get("return_date"), "rental_ids": [rental_id]},
    )
    return {"rental": result["rentals"][0], "product": result["products"][0]}


# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------


class Handler(BaseHTTPRequestHandler):
    server_version = "EchoRental/2.0"

    def do_GET(self) -> None:  # noqa: N802
        try:
            parsed = urllib.parse.urlsplit(self.path)
            path = urllib.parse.unquote(parsed.path)
            if path.startswith("/api/"):
                self.handle_api_get(path, urllib.parse.parse_qs(parsed.query))
            else:
                self.serve_static(path)
        except ApiError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as exc:  # pragma: no cover - defensive boundary
            print(f"[error] {exc}", file=sys.stderr)
            self.send_json(500, {"error": "服务器内部错误"})

    def do_POST(self) -> None:  # noqa: N802
        self.handle_api_write("POST")

    def do_PATCH(self) -> None:  # noqa: N802
        self.handle_api_write("PATCH")

    def do_DELETE(self) -> None:  # noqa: N802
        self.handle_api_write("DELETE")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_header("Allow", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def handle_api_get(self, path: str, query: dict[str, list[str]]) -> None:
        def first(name: str) -> str | None:
            values = query.get(name)
            if not values:
                return None
            value = values[0].strip()
            return value or None

        if path == "/api/health":
            self.send_json(200, {"ok": True, "brand": "回声科技"})
            return

        if path == "/api/me":
            # 本地 Python 版本不启用登录鉴权，前端按管理员展示管理入口。
            self.send_json(
                200,
                {
                    "user": {
                        "id": 0,
                        "username": "local",
                        "display_name": "本地开发",
                        "role": "admin",
                    }
                },
            )
            return

        if path == "/api/products":
            with closing(connect()) as conn:
                self.send_json(200, list_products(conn))
            return

        if path == "/api/categories":
            with closing(connect()) as conn:
                self.send_json(200, list_categories(conn))
            return

        if path == "/api/settings":
            with closing(connect()) as conn:
                self.send_json(200, {"note_placeholder": get_note_placeholder(conn)})
            return

        if path == "/api/borrowers":
            with closing(connect()) as conn:
                self.send_json(200, list_borrowers(conn))
            return

        if path == "/api/models":
            with closing(connect()) as conn:
                self.send_json(200, list_models(conn))
            return

        if path == "/api/history":
            date_from = parse_iso_date(first("from"), "from", required=False)
            date_to = parse_iso_date(first("to"), "to", required=False)
            if date_from and date_to and date_from > date_to:
                raise ApiError(400, "开始日期不能晚于结束日期")
            category_id_raw = first("category_id")
            category_id = (
                parse_int(category_id_raw, "category_id") if category_id_raw else None
            )
            with closing(connect()) as conn:
                self.send_json(
                    200,
                    list_history(
                        conn,
                        borrower=first("borrower"),
                        category=first("category"),
                        category_id=category_id,
                        date_from=date_from,
                        date_to=date_to,
                        q=first("q"),
                    ),
                )
            return

        raise ApiError(404, "接口不存在")

    def handle_api_write(self, method: str) -> None:
        try:
            parsed = urllib.parse.urlsplit(self.path)
            path = urllib.parse.unquote(parsed.path)
            query = urllib.parse.parse_qs(parsed.query)
            payload = self.read_payload(required=method != "DELETE")

            if method == "POST" and path == "/api/categories":
                with closing(connect()) as conn:
                    self.send_json(201, create_category(conn, payload))
                return

            if method == "POST" and path == "/api/borrowers":
                with closing(connect()) as conn:
                    self.send_json(201, create_borrower(conn, payload))
                return

            match = re.fullmatch(r"/api/borrowers/(\d+)", path)
            if match and method == "PATCH":
                with closing(connect()) as conn:
                    self.send_json(200, update_borrower(conn, int(match.group(1)), payload))
                return

            if match and method == "DELETE":
                with closing(connect()) as conn:
                    self.send_json(200, delete_borrower(conn, int(match.group(1))))
                return

            if method == "POST" and path == "/api/history":
                with closing(connect()) as conn:
                    self.send_json(201, create_history(conn, payload))
                return

            match = re.fullmatch(r"/api/history/(\d+)", path)
            if match and method == "DELETE":
                with closing(connect()) as conn:
                    self.send_json(200, delete_history(conn, int(match.group(1))))
                return

            if method == "POST" and path == "/api/models/import":
                with closing(connect()) as conn:
                    self.send_json(201, import_custom_model(conn, payload))
                return

            match = re.fullmatch(r"/api/models/custom/(\d+)", path)
            if match and method == "DELETE":
                with closing(connect()) as conn:
                    self.send_json(200, delete_custom_model(conn, int(match.group(1))))
                return

            if method == "POST" and path == "/api/models/hide":
                with closing(connect()) as conn:
                    self.send_json(200, hide_builtin_model(conn, payload.get("key")))
                return

            if method == "POST" and path == "/api/models/restore":
                with closing(connect()) as conn:
                    self.send_json(200, restore_builtin_model(conn, payload.get("key")))
                return

            if method == "PATCH" and path == "/api/settings":
                with closing(connect()) as conn:
                    self.send_json(200, update_settings(conn, payload))
                return

            match = re.fullmatch(r"/api/categories/(\d+)", path)
            if match and method == "PATCH":
                with closing(connect()) as conn:
                    self.send_json(200, rename_category(conn, int(match.group(1)), payload))
                return

            if match and method == "DELETE":
                cascade = (query.get("cascade") or [""])[0].lower() in ("1", "true", "yes")
                with closing(connect()) as conn:
                    self.send_json(
                        200,
                        delete_category(conn, int(match.group(1)), cascade=cascade),
                    )
                return

            if method == "POST" and path == "/api/products":
                with closing(connect()) as conn:
                    self.send_json(201, create_products(conn, payload))
                return

            match = re.fullmatch(r"/api/products/(\d+)", path)
            if match and method == "PATCH":
                with closing(connect()) as conn:
                    self.send_json(200, rename_product(conn, int(match.group(1)), payload))
                return

            if match and method == "DELETE":
                with closing(connect()) as conn:
                    self.send_json(200, delete_product(conn, int(match.group(1))))
                return

            match = re.fullmatch(r"/api/products/(\d+)/model", path)
            if match and method == "PATCH":
                with closing(connect()) as conn:
                    self.send_json(
                        200,
                        update_product_models(conn, int(match.group(1)), payload),
                    )
                return

            if method == "POST" and path == "/api/rentals/batch":
                with closing(connect()) as conn:
                    self.send_json(201, create_rentals_batch(conn, payload))
                return

            if method == "POST" and path == "/api/rentals/return-batch":
                with closing(connect()) as conn:
                    self.send_json(200, return_rentals_batch(conn, payload))
                return

            match = re.fullmatch(r"/api/rentals/(\d+)/return", path)
            if match and method == "POST":
                with closing(connect()) as conn:
                    self.send_json(200, return_rental(conn, int(match.group(1)), payload))
                return

            if method == "POST" and path == "/api/rentals":
                with closing(connect()) as conn:
                    self.send_json(201, create_rental(conn, payload))
                return

            raise ApiError(404, "接口不存在")
        except ApiError as exc:
            self.send_json(exc.status, {"error": exc.message})
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as exc:  # pragma: no cover - defensive boundary
            print(f"[error] {exc}", file=sys.stderr)
            self.send_json(500, {"error": "服务器内部错误"})

    def read_payload(self, required: bool = True) -> dict:
        raw_length = self.headers.get("Content-Length")
        if not raw_length:
            if required:
                raise ApiError(400, "请求体为空")
            return {}
        try:
            length = int(raw_length)
        except ValueError as exc:
            raise ApiError(400, "Content-Length 无效") from exc
        if length <= 0:
            if required:
                raise ApiError(400, "请求体为空")
            return {}
        if length > MAX_PAYLOAD_BYTES:
            raise ApiError(413, "请求体过大")

        raw = self.rfile.read(length)
        content_type = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        try:
            if content_type == "application/x-www-form-urlencoded":
                parsed = urllib.parse.parse_qs(raw.decode("utf-8"))
                return {key: values[0] for key, values in parsed.items()}
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ApiError(400, "请求体必须是有效的 JSON") from exc
        if not isinstance(payload, dict):
            raise ApiError(400, "请求体必须是 JSON 对象")
        return payload

    def serve_static(self, path: str) -> None:
        if path in ("", "/"):
            relative = Path("index.html")
        else:
            relative = Path(path.lstrip("/"))

        target = (PUBLIC_DIR / relative).resolve()
        try:
            target.relative_to(PUBLIC_DIR.resolve())
        except ValueError:
            self.send_json(403, {"error": "禁止访问"})
            return

        if not target.is_file():
            self.send_error(404, "Not Found")
            return

        content_type, _ = mimetypes.guess_type(str(target))
        if content_type is None:
            content_type = "application/octet-stream"
        if content_type.startswith("text/") or content_type in (
            "application/javascript",
            "application/json",
            "image/svg+xml",
        ):
            content_type = f"{content_type}; charset=utf-8"

        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def send_json(self, status: int, payload: object) -> None:
        data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt: str, *args) -> None:
        if self.path.startswith("/api/"):
            print(f"[{self.log_date_time_string()}] {fmt % args}")


def main() -> None:
    global DB_PATH
    parser = argparse.ArgumentParser(description="回声科技 · 产品借用服务")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH)
    parser.add_argument("--reset", action="store_true", help="删除现有数据库并重新生成演示数据")
    args = parser.parse_args()

    DB_PATH = args.db.resolve()
    if args.reset and DB_PATH.exists():
        DB_PATH.unlink()
        for suffix in ("-wal", "-shm"):
            side = Path(str(DB_PATH) + suffix)
            if side.exists():
                side.unlink()

    init_db(seed=True)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.daemon_threads = True
    print(f"回声科技 · 产品借用  http://{args.host}:{args.port}")
    print(f"数据库：{DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
